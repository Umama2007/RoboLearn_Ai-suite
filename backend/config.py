import os
import time
import json
import hashlib
from threading import Lock
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

# ------------- IN-MEMORY RESPONSE CACHE (LRU + TTL) -------------
class ResponseCache:
    def __init__(self, ttl_seconds=86400, max_size=500):
        self.ttl = ttl_seconds
        self.max_size = max_size
        self.cache = {}
        self.lock = Lock()

    def _make_key(self, prompt, sys_inst, temp, response_json):
        raw = f"{prompt}|{sys_inst}|{temp}|{response_json}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    def get(self, prompt, sys_inst, temp, response_json):
        key = self._make_key(prompt, sys_inst, temp, response_json)
        with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                if time.time() - entry["timestamp"] < self.ttl:
                    return entry["response"]
                else:
                    del self.cache[key]
        return None

    def set(self, prompt, sys_inst, temp, response_json, response):
        if not response or len(str(response).strip()) < 5:
            return
        key = self._make_key(prompt, sys_inst, temp, response_json)
        with self.lock:
            if len(self.cache) >= self.max_size:
                oldest_key = min(self.cache, key=lambda k: self.cache[k]["timestamp"])
                del self.cache[oldest_key]
            self.cache[key] = {
                "response": response,
                "timestamp": time.time()
            }

_ai_cache = ResponseCache()
_genai_clients = {}

def get_api_keys():
    keys_str = os.getenv("GEMINI_API_KEYS") or os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
    if not keys_str:
        return []
    return [k.strip() for k in keys_str.split(",") if k.strip()]

def get_gemini_client(api_key=None):
    global _genai_clients
    keys = get_api_keys()
    target_key = api_key or (keys[0] if keys else "")
    if not target_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is missing.")
    if target_key not in _genai_clients:
        try:
            from google import genai
            _genai_clients[target_key] = genai.Client(api_key=target_key)
        except Exception as e:
            raise RuntimeError(f"Failed to initialize Gemini API client: {str(e)}")
    return _genai_clients[target_key]

def get_fallback_models():
    primary = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    defaults = [primary, "gemini-2.5-flash-lite", "gemini-1.5-flash", "gemini-1.5-flash-8b"]
    seen = set()
    dedup = []
    for m in defaults:
        if m and m not in seen:
            seen.add(m)
            dedup.append(m)
    return dedup

def _format_prompt(messages_or_prompt, system_instruction):
    sys_inst = system_instruction or ""
    contents = []
    if isinstance(messages_or_prompt, list):
        for msg in messages_or_prompt:
            role = msg.get("role")
            content = msg.get("content", "")
            if role == "system":
                if sys_inst:
                    sys_inst += "\n\n" + content
                else:
                    sys_inst = content
            elif role in ["user", "human"]:
                contents.append(content)
            elif role in ["assistant", "ai"]:
                contents.append(f"Assistant: {content}")
            else:
                contents.append(content)
        prompt_input = "\n\n".join(contents) if contents else ""
    else:
        prompt_input = str(messages_or_prompt)
    return prompt_input, sys_inst

def call_gemini(messages_or_prompt, system_instruction=None, max_tokens=1000, temperature=0.2, response_json=False, bypass_cache=False):
    """
    Unified caller for Google Gemini API with response caching and failover model chain.
    """
    prompt_input, sys_inst = _format_prompt(messages_or_prompt, system_instruction)

    # 1. Check response cache first
    if not bypass_cache:
        cached = _ai_cache.get(prompt_input, sys_inst, temperature, response_json)
        if cached:
            return cached

    from google.genai import types
    api_keys = get_api_keys()
    if not api_keys:
        raise RuntimeError("GEMINI_API_KEY environment variable is missing.")

    fallback_models = get_fallback_models()
    last_error = None

    for key in api_keys:
        try:
            client = get_gemini_client(api_key=key)
        except Exception as ke:
            last_error = ke
            continue

        for model_name in fallback_models:
            config_args = {
                "temperature": temperature,
                "max_output_tokens": max_tokens
            }
            if sys_inst:
                config_args["system_instruction"] = sys_inst
            if response_json:
                config_args["response_mime_type"] = "application/json"

            config = types.GenerateContentConfig(**config_args)

            for attempt in range(2):
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt_input,
                        config=config
                    )
                    res_text = response.text or ""
                    if res_text:
                        if not bypass_cache:
                            _ai_cache.set(prompt_input, sys_inst, temperature, response_json, res_text)
                        return res_text
                except Exception as e:
                    last_error = e
                    err_str = str(e)
                    if "429" in err_str or "QUOTA" in err_str.upper() or "RESOURCE_EXHAUSTED" in err_str.upper():
                        time.sleep(1.0 * (attempt + 1))
                        continue
                    break

    raise RuntimeError(f"All AI model quotas are temporarily busy. Please wait a moment and try again. ({str(last_error)})")

def stream_gemini(messages_or_prompt, system_instruction=None, max_tokens=1000, temperature=0.2):
    """
    Resilient streaming generator for Google Gemini API with fallback model chain.
    """
    prompt_input, sys_inst = _format_prompt(messages_or_prompt, system_instruction)
    from google.genai import types

    api_keys = get_api_keys()
    if not api_keys:
        raise RuntimeError("GEMINI_API_KEY environment variable is missing.")

    fallback_models = get_fallback_models()
    last_error = None

    for key in api_keys:
        try:
            client = get_gemini_client(api_key=key)
        except Exception as ke:
            last_error = ke
            continue

        for model_name in fallback_models:
            config_args = {
                "temperature": temperature,
                "max_output_tokens": max_tokens
            }
            if sys_inst:
                config_args["system_instruction"] = sys_inst

            config = types.GenerateContentConfig(**config_args)

            for attempt in range(2):
                try:
                    response_stream = client.models.generate_content_stream(
                        model=model_name,
                        contents=prompt_input,
                        config=config
                    )
                    yielded = False
                    for chunk in response_stream:
                        if chunk.text:
                            yielded = True
                            yield chunk.text
                    if yielded:
                        return
                except Exception as e:
                    last_error = e
                    err_str = str(e)
                    if "429" in err_str or "QUOTA" in err_str.upper() or "RESOURCE_EXHAUSTED" in err_str.upper():
                        time.sleep(1.5 * (attempt + 1))
                        continue
                    break

    raise RuntimeError(f"All AI streaming services are temporarily busy. Please try again. ({str(last_error)})")
