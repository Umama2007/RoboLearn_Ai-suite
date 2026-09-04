# RoboLearn AI Tutoring Suite

RoboLearn is an AI-powered tutoring and educational workflow platform. It combines a local Ollama Large Language Model (`qwen2.5:1.5b`) with an intelligent, privacy-first Retrieval-Augmented Generation (RAG) pipeline to turn textbooks, notes, and study material into structured learning tools.

## Key Features

- **Grounded AI Teacher Chat**: Chat with an AI tutor that answers questions using local Ollama parametric knowledge and dual reference citations with optional Tavily web search grounding.
- **Context-Aware Book Chat**: Ask questions directly against uploaded textbooks with exact chapter and page-number citations.
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
- **Privacy-First Local AI Architecture**: Runs on local Ollama LLM inference (`qwen2.5:1.5b`) combined with local vector embeddings (`Sentence-Transformers`), keeping study material private on your machine.

## AI Architecture & Request Flow

The AI pipeline is designed for speed, privacy, and offline resilience:

1. **User Request**: The user asks a question or requests a quiz.
2. **Context Retrieval (RAG)**: If the query is scoped to a book, the backend runs a semantic search against local embeddings to retrieve the most relevant text chunks.
3. **Web Grounding (Optional)**: If scoped to general knowledge, the system queries the Tavily API for real-time web context.
4. **Prompt Assembly**: The retrieved context (book chunks or web snippets) is injected into a specialized system prompt (e.g., Socratic Tutor, Quiz Generator, or Flowchart Architect).
5. **Local LLM Inference**: The request is routed to the local Ollama server at `http://localhost:11434/api/chat` using `qwen2.5:1.5b`.
6. **Streaming Response**: The LLM output is streamed back to the React frontend via Server-Sent Events (SSE) for a real-time typing effect.

## RAG (Retrieval-Augmented Generation) Pipeline
RoboLearn uses a custom-built, lightweight RAG implementation tailored for textbook analysis, operating without a dedicated vector database:

1. **Extraction**: When a user uploads a PDF or DOCX, the system parses the text using `PyMuPDF` or `python-docx`. If scanned images are detected, it falls back to `PyTesseract` for Optical Character Recognition (OCR).
2. **Chunking**: The extracted text is split into paragraphs and grouped into semantic windows of approximately 1,500 characters to maintain context boundaries.
3. **Local Embedding (Privacy-First)**: The chunks are encoded into 384-dimensional dense vectors using a local `all-MiniLM-L6-v2` Sentence-Transformer model running on PyTorch.
4. **Binary Storage (No `pgvector`)**: Instead of relying on external vector databases, RoboLearn stores 384-dimensional binary blobs (`BYTEA`) in a Supabase relational table (`chunk_embeddings`) alongside the raw text and character offsets.
5. **In-Memory Retrieval**: During a query, vectors for the active book are fetched into memory, and the system ranks chunks by Cosine Similarity (`np.dot`).
6. **Fallback Mechanism**: If vector embeddings are unavailable, the system employs a custom TF-IDF keyword calculator.
7. **Citation Assembly**: The top-ranked chunks are mapped back to chapter titles and page numbers.

## Models Used

| Model Name | Type | Purpose | Provider/Runtime | Local/Cloud |
| :--- | :--- | :--- | :--- | :--- |
| **qwen2.5:1.5b** | LLM | Core reasoning, chat, quiz generation, formatting | Ollama (`http://localhost:11434`) | Local |
| **all-MiniLM-L6-v2** | Embedding | Converts text chunks and queries to vectors | Sentence-Transformers (PyTorch) | Local |

## System Architecture

```mermaid
flowchart TD
    subgraph Client [Frontend]
        ReactUI["React SPA UI (Vite)"]
    end

    subgraph Server [Backend - Flask]
        API["API Endpoints"]
        RAG["Semantic RAG Engine"]
        Parser["Document Parsers & OCR"]
        OllamaCaller["Ollama Client (localhost:11434)"]
    end

    subgraph LocalAI [Local Ollama Engine]
        OllamaServer["qwen2.5:1.5b"]
    end

    subgraph Data [Supabase PostgreSQL]
        DB[("Relational DB + Binary Vectors")]
    end

    subgraph External [Optional Cloud Services]
        TavilyCloud["Tavily Search API"]
        GoogleAuth["Google OAuth"]
    end

    ReactUI <-->|JSON / SSE Streams| API
    API <-->|Read/Write Queries| DB
    API -->|Parse| Parser
    API <-->|Vector Match / Dot Product| RAG
    API <--> OllamaCaller
    OllamaCaller <--> OllamaServer
    API <--> TavilyCloud
    ReactUI <--> GoogleAuth
```

## Tech Stack
| Layer | Technology |
| :--- | :--- |
| **Frontend** | React, Vite, Vanilla CSS, Lucide React (Icons) |
| **Backend** | Python 3.11, Flask, NumPy |
| **Database** | Supabase PostgreSQL, `psycopg2` |
| **AI / NLP** | Ollama (`qwen2.5:1.5b`), Sentence-Transformers (`all-MiniLM-L6-v2`), PyMuPDF, PyTesseract |
| **Document Export** | `python-pptx`, `python-docx`, `openpyxl` |

## Technical Documentation
- **[TECHNICAL_IMPLEMENTATION.md](file:///c:/Users/MC/Desktop/RoboLearn_Ai%20suite/TECHNICAL_IMPLEMENTATION.md)**: Full architecture migration report detailing the removal of Gemini API keys, local Ollama integration, error handling, function signatures, and setup.
- **[TECHNICAL_OVERVIEW.md](file:///c:/Users/MC/Desktop/RoboLearn_Ai%20suite/TECHNICAL_OVERVIEW.md)**: Deep-dive architecture overview, RAG vector pipeline, database schemas, and request flow.

## Project Structure
```text
RoboLearn/
├── backend/
│   ├── app.py                 # Main Flask server, API routes, RAG logic
│   ├── config.py              # Ollama caller, response caching, connection check
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
- [Ollama](https://ollama.com) installed and running locally
- Supabase account (for PostgreSQL database)
- Tavily API key (optional, for live web search)

### 1. Install and Start Ollama
```bash
# Install Ollama (https://ollama.com), then pull the model and start the service:
ollama pull qwen2.5:1.5b
ollama serve
```

### 2. Clone the repository
```bash
git clone https://github.com/your-username/RoboLearn.git
cd RoboLearn
```

### 3. Database Setup
Create a new Supabase project. You will need the connection URL and keys for the environment variables. The backend will automatically initialize tables on the first run.

### 4. Backend Setup
```bash
cd backend
python -m venv venv
# Activate venv: `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (Mac/Linux)
pip install -r requirements.txt

# Pre-download the local embedding model
python preload_model.py
```
Create a `.env` file in the `backend/` directory (see Configuration below).

### 5. Frontend Setup
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

OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b
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

### One-Click Launch (Windows)
Double-click `Run_Website.bat` to automatically verify dependencies, launch Ollama, start backend and frontend servers, and open the app at `http://localhost:3000`.

### Manual Launch
1. **Start Ollama** (if not already running):
   ```bash
   ollama serve
   ```
2. **Start the Backend** (Runs on port 5000):
   ```bash
   cd backend
   python app.py
   ```
3. **Start the Frontend** (Runs on port 3000):
   ```bash
   cd frontend
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser.

## API Documentation (Core Routes)
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/signup` | POST | Registers a new user. |
| `/api/user/books/upload` | POST | Uploads doc, parses text, chunks, and creates vector embeddings. |
| `/ask_book_teacher_stream` | POST | RAG-powered chat endpoint (streams SSE response). |
| `/generate_quiz` | POST | Prompts local Ollama to generate structured JSON quiz questions. |
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
- **Data Privacy**: Vector embeddings and LLM reasoning are computed locally via Ollama and Sentence-Transformers, ensuring your textbook and study data remains completely private.
- **Error Handling**: Database foreign-key constraints prevent orphaned records. Guest users are prevented from crashing the database via specific graceful fallback handlers.

## Future Roadmap
- **Planned (v2)**: Custom In-House Voice Model. We are actively training a proprietary voice AI model from scratch. Dataset collection, chunking, and transcription are fully completed. Final model training is pending GPU availability and is expected to conclude within a month, slated for release in version 2. [View dataset & training progress evidence](https://drive.google.com/drive/folders/11RvKH2kJBrK2TQEl9T5h820knVsuwbPK?usp=sharing) *(folder includes raw audio samples, transcription pipeline scripts, and a chunking log)*.
- **Planned**: Dedicated vector database (e.g., `pgvector`) migration for faster similarity search on massive datasets.
- **Planned**: Comprehensive unit testing suite.

## License
*No license has been specified for this project.*
