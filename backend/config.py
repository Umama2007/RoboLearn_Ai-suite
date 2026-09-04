import os
import time
import json
import hashlib
import requests
from threading import Lock
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:1.5b")
OLLAMA_CHAT_ENDPOINT = f"{OLLAMA_URL}/api/chat"
OLLAMA_TAGS_ENDPOINT = f"{OLLAMA_URL}/api/tags"

# ------------- IN-MEMORY RESPONSE CACHE (LRU + TTL) -------------
class ResponseCache:
    def __init__(self, ttl_seconds=86400, max_size=500):
        self.ttl = ttl_seconds
        self.max_size = max_size
        self.cache = {}
        self.lock = Lock()

    def _make_key(self, prompt_repr, sys_inst, temp, response_json):
        raw = f"{prompt_repr}|{sys_inst}|{temp}|{response_json}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, prompt_repr, sys_inst, temp, response_json):
        key = self._make_key(prompt_repr, sys_inst, temp, response_json)
        with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                if time.time() - entry["timestamp"] < self.ttl:
                    return entry["response"]
                else:
                    del self.cache[key]
        return None

    def set(self, prompt_repr, sys_inst, temp, response_json, response):
        if not response or len(str(response).strip()) < 5:
            return
        key = self._make_key(prompt_repr, sys_inst, temp, response_json)
        with self.lock:
            if len(self.cache) >= self.max_size:
                oldest_key = min(self.cache, key=lambda k: self.cache[k]["timestamp"])
                del self.cache[oldest_key]
            self.cache[key] = {
                "response": response,
                "timestamp": time.time()
            }

_ai_cache = ResponseCache()


def check_ollama_connection():
    """
    Checks if the local Ollama server is reachable and logs a clear status message.
    """
    try:
        res = requests.get(OLLAMA_TAGS_ENDPOINT, timeout=3.0)
        if res.status_code == 200:
            data = res.json()
            models = [m.get("name", "") for m in data.get("models", [])]
            print(f"[Ollama] Connected to Ollama server at {OLLAMA_URL}.")
            # Check if current model or prefix matches
            model_matched = any(
                m == OLLAMA_MODEL or m.startswith(f"{OLLAMA_MODEL}:") or m.startswith(OLLAMA_MODEL)
                for m in models
            )
            if model_matched:
                print(f"[Ollama] Active model '{OLLAMA_MODEL}' is ready.")
            else:
                print(f"[Ollama] WARNING: Model '{OLLAMA_MODEL}' was not found in installed Ollama models: {models}. Run `ollama pull {OLLAMA_MODEL}`.")
            return True
        else:
            print(f"[Ollama] WARNING: Ollama returned status code {res.status_code}.")
            return False
    except requests.exceptions.RequestException:
        print(f"[Ollama] ERROR: Ollama server not reachable at {OLLAMA_URL} — make sure `ollama serve` is running and {OLLAMA_MODEL} is pulled.")
        return False


def _format_messages(messages_or_prompt, system_instruction=None):
    """
    Normalizes inputs (list of dicts or string) into Ollama chat format:
    [{"role": "system"|"user"|"assistant", "content": "..."}]
    """
    formatted = []
    
    if system_instruction:
        formatted.append({"role": "system", "content": str(system_instruction)})

    if isinstance(messages_or_prompt, list):
        for msg in messages_or_prompt:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            # Normalize legacy role names
            if role in ["human"]:
                role = "user"
            elif role in ["ai"]:
                role = "assistant"
            
            # If system_instruction was provided separately and there's a system message, combine or append
            if role == "system" and system_instruction:
                # Merge into existing first system message or append
                if formatted and formatted[0]["role"] == "system":
                    formatted[0]["content"] += "\n\n" + str(content)
                    continue
            formatted.append({"role": role, "content": str(content)})
    elif isinstance(messages_or_prompt, str):
        formatted.append({"role": "user", "content": messages_or_prompt})
    else:
        formatted.append({"role": "user", "content": str(messages_or_prompt)})

    return formatted


def call_ollama(messages_or_prompt, system_instruction=None, max_tokens=1000, temperature=0.2, response_json=False, bypass_cache=False):
    """
    Executes a chat completion against the local Ollama instance at http://localhost:11434/api/chat.
    """
    messages = _format_messages(messages_or_prompt, system_instruction)
    cache_key_prompt = json.dumps(messages, sort_keys=True)

    # 1. Check in-memory cache
    if not bypass_cache:
        cached = _ai_cache.get(cache_key_prompt, system_instruction or "", temperature, response_json)
        if cached:
            return cached

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": float(temperature),
            "num_predict": int(max_tokens),
            "num_ctx": 1536
        }
    }
    if response_json:
        payload["format"] = "json"

    try:
        response = requests.post(
            OLLAMA_CHAT_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=120
        )
        response.raise_for_status()
        data = response.json()
        content = data.get("message", {}).get("content", "")

        if not bypass_cache and content:
            _ai_cache.set(cache_key_prompt, system_instruction or "", temperature, response_json, content)

        return content
    except requests.exceptions.ConnectionError:
        error_msg = f"Ollama server not reachable at {OLLAMA_URL} — make sure `ollama serve` is running and {OLLAMA_MODEL} is pulled."
        print(f"[Ollama Error] {error_msg}")
        raise RuntimeError(error_msg)
    except requests.exceptions.RequestException as e:
        error_msg = f"Failed to communicate with local Ollama model '{OLLAMA_MODEL}': {str(e)}"
        print(f"[Ollama Error] {error_msg}")
        raise RuntimeError(error_msg)


def stream_ollama(messages_or_prompt, system_instruction=None, max_tokens=1000, temperature=0.2):
    """
    Streams chat completion chunks from the local Ollama instance at http://localhost:11434/api/chat.
    Yields string text chunks as they arrive.
    """
    messages = _format_messages(messages_or_prompt, system_instruction)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": float(temperature),
            "num_predict": int(max_tokens),
            "num_ctx": 1536
        }
    }

    try:
        response = requests.post(
            OLLAMA_CHAT_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            stream=True,
            timeout=120
        )
        response.raise_for_status()

        for line in response.iter_lines(decode_unicode=True):
            if not line:
                continue
            try:
                chunk = json.loads(line)
                content = chunk.get("message", {}).get("content", "")
                if content:
                    yield content
                if chunk.get("done", False):
                    break
            except json.JSONDecodeError:
                continue
    except requests.exceptions.ConnectionError:
        error_msg = f"Ollama server not reachable at {OLLAMA_URL} — make sure `ollama serve` is running and {OLLAMA_MODEL} is pulled."
        print(f"[Ollama Stream Error] {error_msg}")
        raise RuntimeError(error_msg)
    except requests.exceptions.RequestException as e:
        error_msg = f"Streaming interrupted from local Ollama model '{OLLAMA_MODEL}': {str(e)}"
        print(f"[Ollama Stream Error] {error_msg}")
        raise RuntimeError(error_msg)
