# RoboLearn
**AI-Powered Adaptive Learning Suite**

RoboLearn is a full-stack, AI-powered learning platform that transforms static study materials into dynamic, personalized tutoring experiences. It enables students to upload textbooks or documents and instantly generates study schedules, interactive quizzes, flashcards, and presentations—while providing a Socratic AI tutor grounded in the specific text of the uploaded materials.

## Table of Contents
- [What is RoboLearn?](#what-is-robolearn)
- [Key Features](#key-features)
- [Why RoboLearn?](#why-robolearn)
- [AI Architecture & Request Flow](#ai-architecture--request-flow)
- [RAG (Retrieval-Augmented Generation) Pipeline](#rag-retrieval-augmented-generation-pipeline)
- [Models Used](#models-used)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Database Structure](#database-structure)
- [Security & Privacy](#security--privacy)
- [Future Roadmap](#future-roadmap)
- [License](#license)

## What is RoboLearn?
Traditional studying often involves passively reading static textbooks, leading to poor retention and engagement. RoboLearn bridges this gap by acting as a personal, intelligent tutor. 

By uploading a document, students unlock an interactive suite of learning tools. RoboLearn not only answers questions using real-time context from the document (preventing AI hallucinations) but also assesses student mastery, generates targeted quizzes, and builds visual study aids like flowcharts and PowerPoint presentations.

## Key Features
- **Socratic AI Tutor**: Chat with an AI teacher that guides you to answers rather than just giving them away, grounded directly in your uploaded textbooks.
- **Advanced Document Processing**: Upload PDFs or DOCX files. The system automatically extracts text, identifies table of contents/chapter structures, and chunks content for semantic search. (Includes OCR for scanned documents via Tesseract).
- **Interactive Quiz Studio**: Generate MCQs and short-answer quizzes based on general knowledge or specific textbooks. Automatically grades answers and updates a chapter-by-chapter mastery tracking system.
- **Flashcard & Study Guide Generator**: Quickly spin up interactive flashcards to review key concepts.
- **PowerPoint & Flowchart Generation**: Convert text concepts into auto-generated Mermaid.js flowcharts or download dynamically assembled PowerPoint slide decks.
- **Adaptive Curriculum Scheduler**: Input a timeline (e.g., a 9-month school year) and automatically map textbook chapters across weeks, accounting for weekends and public holidays.
- **Real-Time Web Search**: Integrates the Tavily API to ground general knowledge queries with live web results.
- **Mastery Dashboard**: Track learning streaks, quiz scores, and chapter-by-chapter mastery percentages.

## Why RoboLearn?
- **Grounded Responses**: Unlike standard ChatGPT, RoboLearn’s AI tutor cites exact book chapters and page offsets using a custom Retrieval-Augmented Generation (RAG) pipeline.
- **Complete Learning Loop**: It doesn't just answer questions; it tests your knowledge (quizzes), visualizes it (flowcharts/PPTs), and tracks your progress (mastery dashboard).
- **Hybrid AI Architecture**: Combines blazing-fast cloud LLM inference (Google Gemini) with local, privacy-first vector embeddings (Sentence-Transformers).

## AI Architecture & Request Flow

The AI pipeline is designed for speed, accuracy, and rate-limit resilience:

1. **User Request**: The user asks a question or requests a quiz.
2. **Context Retrieval (RAG)**: If the query is scoped to a book, the backend runs a semantic search against local embeddings to retrieve the most relevant text chunks.
3. **Web Grounding (Optional)**: If scoped to general knowledge, the system queries the Tavily API for real-time web context.
4. **Prompt Assembly**: The retrieved context (book chunks or web snippets) is injected into a specialized system prompt (e.g., Socratic Tutor, Quiz Generator, or Flowchart Architect).
5. **Model Routing & Fallback**: The request is routed to the Google Gemini API. If the primary model (e.g., `gemini-3.6-flash`) hits a rate limit (429) or quota error, the system automatically falls back to a chain of secondary models (like `gemini-3.5-flash` or `gemini-flash-latest`) with exponential backoff.
6. **Streaming Response**: The LLM output is streamed back to the React frontend via Server-Sent Events (SSE) for a real-time typing effect.

## RAG (Retrieval-Augmented Generation) Pipeline
RoboLearn uses a custom-built, lightweight RAG implementation tailored for textbook analysis, operating without a dedicated vector database. Here is the detailed lifecycle of a document:

1. **Extraction**: When a user uploads a PDF or DOCX, the system parses the text using `PyMuPDF` or `python-docx`. If scanned images are detected, it falls back to `PyTesseract` for Optical Character Recognition (OCR).
2. **Chunking**: The extracted text is aggressively split by double newlines (`\n\n`) into paragraphs and grouped into semantic windows of approximately 1,500 characters to maintain context boundaries.
3. **Local Embedding (Privacy-First)**: The chunks are encoded into 384-dimensional dense vectors using a local `all-MiniLM-L6-v2` Sentence-Transformer model running on PyTorch. This ensures sensitive textbook data is never sent to an external embedding API.
4. **Binary Storage (No `pgvector`)**: Instead of relying on specialized vector databases (like Pinecone) or PostgreSQL extensions (like `pgvector`), RoboLearn converts the 384-dimensional float arrays into binary bytes (`BYTEA`). These binary blobs are stored in a standard Supabase relational table (`chunk_embeddings`) alongside the raw text and character offsets.
5. **In-Memory Retrieval**: During a query, all vectors for the active book are fetched from Supabase into the backend's memory and converted back into NumPy arrays (`np.frombuffer`). The system then ranks the chunks by calculating the Cosine Similarity (`np.dot`) between the query vector and the document vectors.
6. **Fallback Mechanism**: If vector embeddings are unavailable or fail, the system employs a custom TF-IDF (Term Frequency-Inverse Document Frequency) keyword calculator to ensure queries still return relevant textbook passages.
7. **Citation Assembly**: The top-ranked chunks are mapped back to chapter titles and estimated page numbers using character offsets, allowing the AI to cite exactly where it found the answer.

## Models Used

| Model Name | Type | Purpose | Provider/Runtime | Local/Cloud |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 3.6 Flash** (and fallbacks) | LLM | Core reasoning, chat, quiz generation, formatting | Google Gemini API | Cloud |
| **all-MiniLM-L6-v2** | Embedding | Converts text chunks and queries to vectors | Sentence-Transformers (PyTorch) | Local |

### Legacy Ollama Model Architecture (Deprecated)
*Note: Early versions of this project utilized local Ollama inference. While traces of this setup remain in the `.bat` launcher scripts, the active Python backend has fully migrated to Google Gemini API.*

In the original architecture, RoboLearn operated as a 100% offline system:
- **Model**: `qwen2.5:1.5b` (chosen for its fast inference speed on consumer hardware without dedicated GPUs).
- **Execution**: The local Ollama engine ran a server on port `11434`.
- **Integration**: The Flask backend sent REST HTTP payloads to `http://localhost:11434/api/chat` for text generation.
- **Why it was replaced**: The project migrated from Ollama to Gemini to resolve issues with streaming reliability, cut-off responses, context window limitations on complex textbooks, and to provide faster fallback models. Integrating Ollama is currently a planned roadmap feature as an optional offline fallback.

## System Architecture

```mermaid
flowchart TD
    subgraph Client [Frontend]
        ReactUI[React SPA UI (Vite)]
    end

    subgraph Server [Backend - Flask]
        API[API Endpoints]
        RAG[Semantic RAG Engine]
        Parser[Document Parsers & OCR]
        GeminiClient[Gemini API Client w/ Fallbacks]
    end

    subgraph Data [Supabase PostgreSQL]
        DB[(Relational DB + Binary Vectors)]
    end

    subgraph External [External APIs]
        GeminiCloud[Google Gemini LLM]
        TavilyCloud[Tavily Search API]
        GoogleAuth[Google OAuth]
    end

    ReactUI <-->|JSON / SSE Streams| API
    API <-->|Read/Write Queries| DB
    API -->|Parse| Parser
    API <-->|Vector Match / Dot Product| RAG
    API <--> GeminiClient
    GeminiClient <--> GeminiCloud
    API <--> TavilyCloud
    ReactUI <--> GoogleAuth
```

## Tech Stack
| Layer | Technology |
| :--- | :--- |
| **Frontend** | React, Vite, Vanilla CSS, Lucide React (Icons) |
| **Backend** | Python 3.11, Flask, NumPy |
| **Database** | Supabase PostgreSQL, `psycopg2` |
| **AI / NLP** | Google Gemini SDK, Sentence-Transformers, PyMuPDF, PyTesseract |
| **Document Export** | `python-pptx`, `python-docx`, `openpyxl` |

## Project Structure
```text
RoboLearn/
├── backend/
│   ├── app.py                 # Main Flask server, API routes, RAG logic
│   ├── config.py              # Gemini client config, caching, fallback chain
│   ├── db.py                  # Supabase connection pool management
│   ├── curriculum_final.py    # Document parsing, OCR, and curriculum scheduling
│   ├── preload_model.py       # Downloads the Sentence-Transformer model
│   └── requirements.txt       # Python dependencies
└── frontend/
    ├── index.html             # Vite entry point
    ├── package.json           # npm dependencies
    ├── src/
    │   ├── App.jsx            # Main React router/layout
    │   ├── config.js          # Environment variable mapping
    │   ├── components/        # UI components (AiTeacher, Dashboard, Quizzes, etc.)
    │   └── index.css          # Global CSS and animations
    └── vite.config.js         # Vite bundler configuration
```

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- Supabase account (for PostgreSQL database)
- Google Gemini API key
- Tavily API key

### 1. Clone the repository
```bash
git clone https://github.com/your-username/RoboLearn.git
cd RoboLearn
```

### 2. Database Setup
Create a new Supabase project. You will need the connection URL and keys for the environment variables. The backend will automatically initialize tables on the first run.

### 3. Backend Setup
```bash
cd backend
python -m venv venv
# Activate venv: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
pip install -r requirements.txt

# Pre-download the local embedding model
python preload_model.py
```
Create a `.env` file in the `backend/` directory (see Configuration below).

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```
Create a `.env` file in the `frontend/` directory.

## Configuration

**`backend/.env`**
```env
FLASK_ENV=development
SECRET_KEY=your_secure_random_string
ALLOWED_ORIGINS=http://localhost:3000

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash
TAVILY_API_KEY=your_tavily_api_key

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_key
SUPABASE_SECRET_KEY=your_key
SUPABASE_DB_URL=postgresql://postgres.your-project-id:your_password@aws-0-region.pooler.supabase.com:5432/postgres

GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

## Running the Project

1. **Start the Backend** (Runs on port 5000):
   ```bash
   cd backend
   python app.py
   ```
2. **Start the Frontend** (Runs on port 3000):
   ```bash
   cd frontend
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.

## API Documentation (Core Routes)
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/signup` | POST | Registers a new user. |
| `/api/user/books/upload` | POST | Uploads doc, parses text, chunks, and creates vector embeddings. |
| `/ask_book_teacher_stream` | POST | RAG-powered chat endpoint (streams SSE response). |
| `/generate_quiz` | POST | Prompts LLM to generate structured JSON quiz questions. |
| `/api/quiz/save-attempt` | POST | Saves student answers, updates mastery scores and streaks. |
| `/generate_curriculum` | POST | Extracts TOC and generates a time-mapped study schedule. |
| `/export_ppt` | POST | Dynamically generates a downloadable `.pptx` presentation. |

## Database Structure
RoboLearn uses a relational schema stored in Supabase PostgreSQL:
- **`users`**: Auth, profiles, and active learning streaks.
- **`books` & `chapters`**: Hierarchical storage of uploaded textbook content.
- **`chunk_embeddings`**: Stores `chunk_text`, `char_offset`, and a `BYTEA` binary `embedding` vector for RAG.
- **`quizzes` & `attempts`**: Logs auto-generated questions and the student's selected answers.
- **`mastery`**: Aggregated mastery percentage (0-100%) per user per chapter.

## Security & Privacy
- **Authentication**: Stateful session cookies with strict SameSite policies. Passwords are cryptographically hashed via Werkzeug. (Google OAuth integration is also supported).
- **Data Privacy**: Vector embeddings are computed *locally* using Sentence-Transformers, ensuring your raw textbook data isn't sent to an external embedding API. Only retrieved chunks necessary for context are sent to the Gemini API.
- **Error Handling**: Database foreign-key constraints prevent orphaned records. Guest users are prevented from crashing the database via specific graceful fallback handlers.

## Limitations
- **Rate Limits**: The Gemini free tier has strict rate limits. The backend handles this gracefully with exponential backoff and model-chain routing, but generation may pause during high traffic.
- **Content Scoping**: Currently, AI Teacher, Quizzes, Flashcards, and PPT generation are open-topic/general knowledge by default, while the Study Schedule generator is scoped tightly to uploaded books.

## Future Roadmap
- **Planned**: Dedicated vector database (e.g., `pgvector`) migration for faster similarity search on massive datasets.
- **Planned**: Comprehensive unit testing suite.
- **Planned**: Integration of local open-weight LLMs (restoring the Ollama pathway as an offline alternative).

## License
*No license has been specified for this project.*
