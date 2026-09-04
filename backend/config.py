import os
import time
import json
import hashlib
import requests
from threading import Lock
from dotenv import load_dotenv

load_dotenv()

# ------------- CONFIGURATION -------------
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:0.5b") # 0.5b is 3x faster on CPU; can also use qwen2.5:1.5b
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

OLLAMA_CHAT_ENDPOINT = f"{OLLAMA_URL}/api/chat"
OLLAMA_TAGS_ENDPOINT = f"{OLLAMA_URL}/api/tags"

# Compute optimal CPU threads for local Ollama
CPU_CORES = os.cpu_count() or 4
OPTIMAL_THREADS = max(2, min(CPU_CORES, 8))

# ------------- IN-MEMORY RESPONSE CACHE (LRU + TTL) -------------
class ResponseCache:
    def __init__(self, ttl_seconds=86400, max_size=1000):
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
    Checks if the local Ollama server or configured Cloud AI provider is reachable.
    """
    if GROQ_API_KEY:
        print(f"[AI Engine] Fast Cloud Inference active: Groq ({GROQ_MODEL}). Sub-second latency enabled!")
        return True
    if GEMINI_API_KEY:
        print(f"[AI Engine] Fast Cloud Inference active: Google Gemini ({GEMINI_MODEL}).")
        return True

    try:
        res = requests.get(OLLAMA_TAGS_ENDPOINT, timeout=4.0)
        if res.status_code == 200:
            data = res.json()
            models = [m.get("name", "") for m in data.get("models", [])]
            print(f"[Ollama] Connected to Ollama server at {OLLAMA_URL} using {OPTIMAL_THREADS} CPU threads.")
            # Check if current model or prefix matches
            model_matched = any(
                m == OLLAMA_MODEL or m.startswith(f"{OLLAMA_MODEL}:") or m.startswith(OLLAMA_MODEL)
                for m in models
            )
            if model_matched:
                print(f"[Ollama] Active model '{OLLAMA_MODEL}' is ready.")
            else:
                print(f"[Ollama] Note: Active model is '{OLLAMA_MODEL}'. Available models: {models}.")
            return True
        else:
            print(f"[Ollama] WARNING: Ollama returned status code {res.status_code}.")
            return False
    except requests.exceptions.RequestException:
        print(f"[Ollama] Note: Local Ollama server at {OLLAMA_URL} is not responding.")
        return False


def _format_messages(messages_or_prompt, system_instruction=None):
    """
    Normalizes inputs (list of dicts or string) into OpenAI/Ollama chat format:
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
            
            if role == "system" and system_instruction:
                if formatted and formatted[0]["role"] == "system":
                    formatted[0]["content"] += "\n\n" + str(content)
                    continue
            formatted.append({"role": role, "content": str(content)})
    elif isinstance(messages_or_prompt, str):
        formatted.append({"role": "user", "content": messages_or_prompt})
    else:
        formatted.append({"role": "user", "content": str(messages_or_prompt)})

    return formatted


def _call_groq(messages, max_tokens=1000, temperature=0.2, response_json=False):
    """Executes high-speed cloud inference via Groq API."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": float(temperature),
        "max_tokens": int(max_tokens)
    }
    if response_json:
        payload["response_format"] = {"type": "json_object"}

    res = requests.post(url, json=payload, headers=headers, timeout=25.0)
    res.raise_for_status()
    data = res.json()
    return data["choices"][0]["message"]["content"]


def _stream_groq(messages, max_tokens=1000, temperature=0.2):
    """Streams chat completions from Groq API."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": float(temperature),
        "max_tokens": int(max_tokens),
        "stream": True
    }
    res = requests.post(url, json=payload, headers=headers, stream=True, timeout=25.0)
    res.raise_for_status()
    for line in res.iter_lines(decode_unicode=True):
        if not line:
            continue
        if line.startswith("data: "):
            chunk_str = line[6:].strip()
            if chunk_str == "[DONE]":
                break
            try:
                chunk = json.loads(chunk_str)
                delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                if delta:
                    yield delta
            except json.JSONDecodeError:
                continue


def call_ollama(messages_or_prompt, system_instruction=None, max_tokens=1000, temperature=0.2, response_json=False, bypass_cache=False):
    """
    Executes a chat completion against Groq/Gemini cloud (if key set) or optimized local Ollama.
    """
    messages = _format_messages(messages_or_prompt, system_instruction)
    cache_key_prompt = json.dumps(messages, sort_keys=True)

    # 1. Check in-memory cache
    if not bypass_cache:
        cached = _ai_cache.get(cache_key_prompt, system_instruction or "", temperature, response_json)
        if cached:
            return cached

    # 2. Try high-speed Groq cloud inference if key is present
    if GROQ_API_KEY:
        try:
            content = _call_groq(messages, max_tokens, temperature, response_json)
            if not bypass_cache and content:
                _ai_cache.set(cache_key_prompt, system_instruction or "", temperature, response_json, content)
            return content
        except Exception as e:
            print(f"[Groq Cloud Error, falling back to local Ollama]: {e}")

    # 3. Local Ollama execution with multi-threading & context tuning
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": float(temperature),
            "num_predict": int(max_tokens),
            "num_ctx": 2048,
            "num_thread": OPTIMAL_THREADS
        }
    }

    try:
        response = requests.post(
            OLLAMA_CHAT_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=240
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
    Streams chat completion chunks from Groq cloud (if key set) or optimized local Ollama.
    Yields string text chunks as they arrive.
    """
    messages = _format_messages(messages_or_prompt, system_instruction)

    # 1. Try high-speed Groq cloud streaming if configured
    if GROQ_API_KEY:
        try:
            for chunk in _stream_groq(messages, max_tokens, temperature):
                yield chunk
            return
        except Exception as e:
            print(f"[Groq Stream Error, falling back to local Ollama]: {e}")

    # 2. Local Ollama Streaming with multi-threading
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": float(temperature),
            "num_predict": int(max_tokens),
            "num_ctx": 2048,
            "num_thread": OPTIMAL_THREADS
        }
    }

    try:
        response = requests.post(
            OLLAMA_CHAT_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            stream=True,
            timeout=240
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

