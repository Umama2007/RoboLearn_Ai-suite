# Technical Implementation: Migration from Gemini API to Local Ollama Inference

## 1. Summary
This document records the migration of the RoboLearn AI tutoring suite from cloud-based Google Gemini API inference to a 100% local, offline-first Ollama architecture. The migration removes all external API key dependencies, cloud LLM rate limits, and external network requirements for text generation, standardizing the application on the local `qwen2.5:1.5b` model running at `http://localhost:11434/api/chat`.

---

## 2. Before vs After

| Aspect | Before (Cloud Gemini API) | After (Local Ollama Engine) |
| :--- | :--- | :--- |
| **LLM Inference** | Cloud Google Gemini API (`gemini-3.6-flash` & fallbacks) | Local Ollama Server (`qwen2.5:1.5b`) |
| **API Endpoint** | `generativelanguage.googleapis.com` via Google GenAI SDK | `http://localhost:11434/api/chat` via HTTP POST |
| **Dependencies** | `google-genai>=1.0` | `requests>=2.31` (Standard Python HTTP client) |
| **Required Env Vars** | `GEMINI_API_KEY`, `GEMINI_API_KEYS`, `GEMINI_MODEL`, `GROQ_*`, `OPENROUTER_*` | `OLLAMA_URL` (default: `http://localhost:11434`), `OLLAMA_MODEL` (default: `qwen2.5:1.5b`) |
| **Missing Key Behavior**| Backend raised `RuntimeError("GEMINI_API_KEY environment variable is missing")` and refused to generate text | Runs without any API key; checks connection to `localhost:11434` on startup |
| **Data Privacy** | Context and prompts sent over the internet to Google servers | All prompt processing, book context, and reasoning stay strictly on `localhost` |
| **Cost & Rate Limits** | Subject to API quota limits (429 Resource Exhausted) and potential billing | Completely free, unlimited queries, zero rate limits |

---

## 3. Files Changed

1. **[backend/config.py](file:///c:/Users/MC/Desktop/RoboLearn_Ai%20suite/backend/config.py)**
   - Removed `google.genai` SDK client initialization, API key parsers, fallback chains, and merge conflict markers.
   - Added `check_ollama_connection()`, `call_ollama()`, `stream_ollama()`, and `_format_messages()`.
   - Configured local model options (`num_predict`, `temperature`, `num_ctx: 1536`) and response caching.

2. **[backend/app.py](file:///c:/Users/MC/Desktop/RoboLearn_Ai%20suite/backend/app.py)**
   - Updated helper imports to import `OLLAMA_MODEL, call_ollama, stream_ollama, check_ollama_connection` from `config.py`.
   - Replaced all `call_gemini` invocations with `call_ollama` across all endpoints (`/teach_topic`, `/ai_chat`, `/generate_flashcards`, `/generate_quiz`, `/submit_quiz`, `/generate_ppt_slides`, `/generate_flowchart`, `/socratic_hint`).
   - Replaced `stream_gemini` with `stream_ollama` in `/ai_chat_stream` and `/ask_book_teacher_stream`.
   - Updated all system prompts, route info (`/`), and reference metadata to cite `Ollama (qwen2.5:1.5b)`.
   - Added `check_ollama_connection()` in `__main__` startup.

3. **[backend/requirements.txt](file:///c:/Users/MC/Desktop/RoboLearn_Ai%20suite/backend/requirements.txt)**
   - Removed `google-genai>=1.0` dependency.

4. **[backend/.env](file:///c:/Users/MC/Desktop/RoboLearn_Ai%20suite/backend/.env)** & **[backend/.env.example](file:///c:/Users/MC/Desktop/RoboLearn_Ai%20suite/backend/.env.example)**
   - Removed `GEMINI_API_KEY`, `GEMINI_API_KEYS`, `GEMINI_MODEL`, `GROQ_API_KEY(S)`, and `OPENROUTER_API_KEY(S)`.
   - Added `OLLAMA_URL=http://localhost:11434` and `OLLAMA_MODEL=qwen2.5:1.5b`.

5. **[frontend/src/components/AiTeacher.jsx](file:///c:/Users/MC/Desktop/RoboLearn_Ai%20suite/frontend/src/components/AiTeacher.jsx)**
   - Updated UI labels, initial chat states, placeholder hints, and reference badges from "Gemini AI" to "Local Ollama (qwen2.5:1.5b)".

6. **[frontend/src/components/FlashcardGenerator.jsx](file:///c:/Users/MC/Desktop/RoboLearn_Ai%20suite/frontend/src/components/FlashcardGenerator.jsx)**
   - Updated badge from "Powered by Gemini AI" to "Powered by Ollama (qwen2.5:1.5b)".

7. **[README.md](file:///c:/Users/MC/Desktop/RoboLearn_Ai%20suite/README.md)**
   - Updated architecture diagrams, model table, tech stack, and setup guides to describe the local Ollama workflow.

---

## 4. Function Signatures & Implementation

All LLM operations are centralized in `backend/config.py`:

### `call_ollama(messages_or_prompt, system_instruction=None, max_tokens=1000, temperature=0.2, response_json=False, bypass_cache=False) -> str`
- **Purpose**: Executes a synchronous chat completion against Ollama.
- **Parameters**:
  - `messages_or_prompt` (`list` | `str`): Either a list of message dictionaries `[{"role": "user"|"system"|"assistant", "content": "..."}]` or a raw prompt string.
  - `system_instruction` (`str`, optional): System prompt to prepend or merge into the conversation.
  - `max_tokens` (`int`): Maximum tokens to generate, passed as `options.num_predict`.
  - `temperature` (`float`): Sampling temperature (default: `0.2`), passed as `options.temperature`.
  - `response_json` (`bool`): When `True`, sets `"format": "json"` in the Ollama payload for guaranteed JSON outputs.
  - `bypass_cache` (`bool`): When `False`, uses in-memory thread-safe `ResponseCache` to return cached generations for identical queries.
- **Payload Sent**:
  ```json
  {
    "model": "qwen2.5:1.5b",
    "messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}],
    "stream": false,
    "options": {
      "temperature": 0.2,
      "num_predict": 1000,
      "num_ctx": 1536
    }
  }
  ```
- **Response Parsing**: Extracts `response.json()["message"]["content"]`.

### `stream_ollama(messages_or_prompt, system_instruction=None, max_tokens=1000, temperature=0.2) -> Generator[str]`
- **Purpose**: Streams tokens from the Ollama chat endpoint for real-time typing output via Server-Sent Events (SSE).
- **Parameters**: Same message, token, and temperature parameters as `call_ollama`.
- **Payload Sent**: Same as `call_ollama` with `"stream": true`.
- **Stream Handling**: Iterates line-by-line over the HTTP response (`response.iter_lines()`), parses JSON chunks `chunk = json.loads(line)`, and yields `chunk.get("message", {}).get("content", "")` until `chunk.get("done")` is `True`.

### `check_ollama_connection() -> bool`
- **Purpose**: Pings `http://localhost:11434/api/tags` on application startup to verify the Ollama daemon is reachable and whether the configured model (`qwen2.5:1.5b`) has been pulled.

---

## 5. Error Handling & Startup Verification

1. **Startup Check**:
   When `app.py` starts, `check_ollama_connection()` executes:
   - If connected and model is installed:
     ```
     [Ollama] Connected to Ollama server at http://localhost:11434.
     [Ollama] Active model 'qwen2.5:1.5b' is ready.
     ```
   - If model is missing from local tag list:
     ```
     [Ollama] WARNING: Model 'qwen2.5:1.5b' was not found in installed Ollama models: [...]. Run `ollama pull qwen2.5:1.5b`.
     ```
   - If the Ollama daemon is not running:
     ```
     [Ollama] ERROR: Ollama server not reachable at http://localhost:11434 — make sure `ollama serve` is running and qwen2.5:1.5b is pulled.
     ```

2. **Runtime Failures**:
   If an HTTP request fails because the Ollama service was terminated, `call_ollama` and `stream_ollama` catch `requests.exceptions.ConnectionError` and raise a descriptive `RuntimeError`:
   `"Ollama server not reachable at http://localhost:11434 — make sure \`ollama serve\` is running and qwen2.5:1.5b is pulled."`
   This error is safely trapped by Flask endpoints and returned to the frontend as structured JSON (`{"error": "..."}`).

---

## 6. Setup Instructions for a New Developer

To run the application locally without any API keys:

### 1. Install & Start Ollama
1. Download and install Ollama from [ollama.com](https://ollama.com).
2. Pull the model:
   ```bash
   ollama pull qwen2.5:1.5b
   ```
3. Start the Ollama engine:
   ```bash
   ollama serve
   ```

### 2. Setup & Start Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
python preload_model.py
python app.py
```
*(Backend runs on `http://127.0.0.1:5000`)*

### 3. Setup & Start Frontend
```bash
cd frontend
npm install
npm run dev
```
*(Frontend runs on `http://localhost:3000`)*

---

## 7. Known Limitations & Considerations

1. **Model Parameter Scale**: `qwen2.5:1.5b` is a lightweight 1.5-billion parameter model. While it provides low-latency generation on standard consumer CPUs without requiring dedicated GPUs, complex multi-step reasoning may differ from multi-billion parameter cloud frontier models.
2. **Context Window Constraint**: `num_ctx` is configured to `1536` to fit within lightweight RAM profiles. The RAG pipeline chunks and truncates excerpts accordingly.
3. **Local Deployment Prerequisite**: The application relies on `http://localhost:11434`. To deploy to a remote server or container, an Ollama service container or endpoint must be provided via the `OLLAMA_URL` environment variable.
