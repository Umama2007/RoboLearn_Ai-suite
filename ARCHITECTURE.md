# RoboLearn System Architecture & Technical Design

This document provides a comprehensive, in-depth architectural blueprint of the **RoboLearn AI Tutoring Suite**. It covers the end-to-end system architecture, the local-first Retrieval-Augmented Generation (RAG) pipeline, complete database schemas, session-based authentication workflows, and the local deployment model.

---

## 1. Layered System Overview

The following diagram illustrates the five distinct architectural layers of RoboLearn and the directional data flow between them.

```mermaid
flowchart TB
    %% -------------------------------------------------------------
    %% CLIENT LAYER
    %% -------------------------------------------------------------
    subgraph ClientLayer ["1. Client Layer (React 19 + Vite SPA @ localhost:3000)"]
        direction TB
        UI_Nav["Navbar & Navigation"]
        UI_AuthModal["Auth Modal (Login / Signup / Guest)"]
        UI_Dashboard["Dashboard View (Mastery, Streaks, Analytics)"]
        UI_AiTeacher["AI Teacher Chat (Dual Reference & Socratic Mode)"]
        UI_BookTeacher["Book Teacher & Document Workspace"]
        UI_QuizStudio["Quiz Studio & Reteach Interface"]
        UI_Flashcards["3D Flip Flashcard Generator"]
        UI_Diagrams["Mermaid Flowchart Visualizer"]
        UI_Curriculum["Curriculum & Study Planner"]
        UI_PptExport["PowerPoint Slide Presentation Builder"]
    end

    %% -------------------------------------------------------------
    %% API ROUTING LAYER
    %% -------------------------------------------------------------
    subgraph APILayer ["2. API & Routing Layer (Flask app.py @ localhost:5000)"]
        direction TB
        subgraph Routes_Auth ["Authentication & Session Routes"]
            EP_Signup["POST /api/auth/signup"]
            EP_Login["POST /api/auth/login"]
            EP_Logout["POST /api/auth/logout"]
            EP_Me["GET /api/auth/me"]
            EP_GoogleAuth["POST /api/auth/google"]
        end

        subgraph Routes_Docs ["Document & Book Management Routes"]
            EP_UploadBook["POST /api/user/books/upload"]
            EP_GetBooks["GET /api/user/books"]
            EP_SetActiveBook["POST /api/user/books/active"]
            EP_DeleteBook["DELETE /api/user/books/<id>"]
            EP_TrainTeacher["POST /train_teacher"]
        end

        subgraph Routes_Chat ["AI Reasoning & Streaming Routes"]
            EP_AiChat["POST /ai_chat"]
            EP_AiChatStream["POST /ai_chat_stream (SSE)"]
            EP_BookStream["POST /ask_book_teacher_stream (SSE)"]
            EP_Socratic["POST /socratic_hint"]
            EP_TeachTopic["POST /teach_topic"]
        end

        subgraph Routes_Assessment ["Assessment & Analytics Routes"]
            EP_GenQuiz["POST /generate_quiz"]
            EP_SubmitQuiz["POST /submit_quiz"]
            EP_SaveAttempt["POST /api/quiz/save-attempt"]
            EP_Stats["GET /api/dashboard/stats"]
            EP_Flashcards["POST /generate_flashcards"]
        end

        subgraph Routes_Export ["Synthesis & Generation Routes"]
            EP_Curriculum["POST /generate_curriculum"]
            EP_Flowchart["POST /generate_flowchart"]
            EP_PptSlides["POST /generate_ppt_slides"]
            EP_PptExport["POST /export_ppt"]
            EP_Download["GET /download/<filename>"]
        end
    end

    %% -------------------------------------------------------------
    %% PROCESSING & RAG LAYER
    %% -------------------------------------------------------------
    subgraph ProcessingLayer ["3. Ingestion & RAG Pipeline Layer"]
        direction TB
        FN_ExtractText["extract_text_any()\n(PyMuPDF / python-docx)"]
        FN_OCR["OCR Fallback\n(pytesseract)"]
        FN_Structure["extract_structure_any()\n(Regex TOC & Chapter Hierarchy)"]
        FN_Chunking["Semantic Paragraph Chunking\n(~1500 chars / window)"]
        FN_RAG["semantic_rag_retrieval()\n(Dense Vector Search)"]
        FN_TFIDF["compute_tf_idf_vector()\n(TF-IDF Lexical Fallback)"]
        FN_Citation["detailed_book_citation_search()\n(Page & Chapter Mapping)"]
        FN_CurriculumGen["generate_curriculum_custom()\n(Calendar & Holiday Engine)"]
    end

    %% -------------------------------------------------------------
    %% AI & INFERENCE LAYER
    %% -------------------------------------------------------------
    subgraph AILayer ["4. Local AI & Inference Layer (Offline)"]
        direction TB
        LocalEmbed["SentenceTransformer\n('all-MiniLM-L6-v2' / 384-dim PyTorch)"]
        NumPyCosine["NumPy Vector Math\n(np.dot / Cosine Similarity Ranking)"]
        OllamaCaller["call_ollama() / stream_ollama()\n(backend/config.py)"]
        OllamaServer["Ollama Daemon (localhost:11434)\nModel: qwen2.5:1.5b (1536 ctx)"]
        ResponseCache["In-Memory LRU Cache\n(ResponseCache w/ SHA-256 Keys)"]
    end

    %% -------------------------------------------------------------
    %% STORAGE LAYER
    %% -------------------------------------------------------------
    subgraph StorageLayer ["5. Relational & Vector Storage Layer (db.py)"]
        direction TB
        TBL_Users[("users\n(id, email, password_hash, streak)")]
        TBL_Books[("books\n(id, user_id, title, raw_text, toc_json)")]
        TBL_Chapters[("chapters\n(id, book_id, title, page_start, page_end)")]
        TBL_Embeddings[("chunk_embeddings\n(id, book_id, chapter_id, chunk_text, embedding BYTEA)")]
        TBL_Quizzes[("quizzes\n(id, user_id, book_id, quiz_json)")]
        TBL_Attempts[("attempts\n(id, user_id, quiz_id, question_id, is_correct)")]
        TBL_Submissions[("quiz_submissions\n(id, user_id, quiz_id, score, total)")]
        TBL_Mastery[("mastery\n(id, user_id, chapter_id, mastery_percent)")]
        TBL_StudyMats[("study_materials\n(id, user_id, type, title, content)")]
        TBL_Messages[("messages\n(id, user_id, role, content, created_at)")]
        TBL_Memory[("teacher_memory\n(user_id, book_text, past_text, toc_json)")]
    end

    %% Client -> API Routing
    ClientLayer -->|HTTP JSON / REST| APILayer
    ClientLayer -->|EventSource SSE Stream| EP_AiChatStream
    ClientLayer -->|EventSource SSE Stream| EP_BookStream

    %% API -> Processing & RAG
    EP_UploadBook --> FN_ExtractText
    FN_ExtractText -.->|Scanned Image Fallback| FN_OCR
    FN_ExtractText --> FN_Structure
    FN_ExtractText --> FN_Chunking
    FN_Chunking --> LocalEmbed
    LocalEmbed -->|384-dim Float32 -> Bytes| TBL_Embeddings
    FN_Structure --> TBL_Chapters
    EP_UploadBook --> TBL_Books

    %% Chat & RAG Flow
    EP_BookStream --> FN_Citation
    FN_Citation --> FN_RAG
    FN_RAG -->|Fetch BYTEA Blobs| TBL_Embeddings
    TBL_Embeddings -->|np.frombuffer| NumPyCosine
    FN_RAG -.->|Zero Embeddings Backup| FN_TFIDF
    FN_RAG -->|Top-k Context Chunks| OllamaCaller
    EP_AiChat --> OllamaCaller
    EP_AiChatStream --> OllamaCaller
    EP_GenQuiz --> OllamaCaller
    EP_Socratic --> OllamaCaller
    EP_Flowchart --> OllamaCaller
    EP_PptSlides --> OllamaCaller

    %% Inference Routing
    OllamaCaller <-->|Check / Set Cache| ResponseCache
    OllamaCaller <-->|HTTP POST /api/chat| OllamaServer

    %% Storage Operations
    EP_Signup --> TBL_Users
    EP_Login --> TBL_Users
    EP_SaveAttempt --> TBL_Attempts
    EP_SaveAttempt --> TBL_Mastery
    EP_SubmitQuiz --> TBL_Submissions
    EP_Stats --> TBL_Mastery
    EP_Stats --> TBL_Attempts
    EP_AiChat --> TBL_Messages
    EP_TeachTopic --> TBL_Memory
```

---

## 2. Retrieval-Augmented Generation (RAG) Sequence

The sequence below illustrates the two phases of RoboLearn's RAG system: **Document Ingestion & Vector Indexing** and **Query Retrieval & Socratic Generation**.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student (Browser)
    participant UI as React Frontend (Vite)
    participant Flask as Flask Server (app.py)
    participant Parser as Doc Parser (curriculum_final.py)
    participant Embedder as SentenceTransformer (all-MiniLM-L6-v2)
    participant DB as Relational Database
    participant Ollama as Local Ollama Server (:11434)

    %% PHASE 1: DOCUMENT INGESTION
    rect rgb(238, 242, 255)
    Note over Student, DB: Phase 1: Document Upload & Local Vector Indexing
    Student->>UI: Uploads Textbook (PDF / DOCX)
    UI->>Flask: POST /api/user/books/upload (multipart/form-data)
    Flask->>Parser: extract_text_any(file_path)
    alt Scanned Image / Missing Text
        Parser->>Parser: OCR Fallback via pytesseract
    end
    Parser->>Parser: extract_structure_any() -> Extract TOC & Chapters
    Parser-->>Flask: Returns raw_text, toc_structure
    Flask->>DB: INSERT INTO books & INSERT INTO chapters
    Flask->>Flask: generate_and_store_embeddings(book_id, book_text)
    loop For each ~1500 char paragraph chunk
        Flask->>Embedder: model.encode(chunk_text)
        Embedder-->>Flask: 384-dimensional Float32 NumPy Array
        Flask->>Flask: Convert vector to binary BLOB (vector.tobytes())
        Flask->>DB: INSERT INTO chunk_embeddings (book_id, chunk_text, embedding)
    end
    Flask-->>UI: HTTP 200 {book_id, title, total_chapters, chunks_indexed}
    UI-->>Student: Display "Book Ready for Socratic Study"
    end

    %% PHASE 2: CONTEXT-AWARE RETRIEVAL & GENERATION
    rect rgb(240, 253, 244)
    Note over Student, Ollama: Phase 2: Query Retrieval & Offline Text Generation
    Student->>UI: Submits Query: "How does branch prediction work?"
    UI->>Flask: POST /ask_book_teacher_stream {question, mode: "normal"}
    Flask->>Flask: detailed_book_citation_search(book_text, question)
    Flask->>Embedder: model.encode(question) -> query_vector
    Flask->>DB: SELECT chunk_text, embedding, char_offset FROM chunk_embeddings WHERE book_id = X
    DB-->>Flask: Binary embedding blobs & text chunks
    Flask->>Flask: np.frombuffer(blob) -> reconstruct document vectors
    Flask->>Flask: np.dot(doc_vectors, query_vector) -> Cosine Similarities
    alt Vector Embeddings Empty
        Flask->>Flask: compute_tf_idf_vector() Fallback Ranking
    end
    Flask->>Flask: Rank chunks & pick Top-3 matches (ctx ~2200 chars)
    Flask->>Flask: Resolve Chapter & Page numbers via TOC offsets
    Flask-->>UI: SSE Event: {"type": "citation", "citation": {chapter, pages, excerpt}}
    Flask->>Flask: Build Structured System & Context Prompt
    Flask->>Ollama: POST /api/chat {model: "qwen2.5:1.5b", stream: true, num_ctx: 1536}
    loop Stream Output Tokens
        Ollama-->>Flask: JSON chunk {"message": {"content": "token"}}
        Flask-->>UI: SSE Event: {"type": "text", "content": "token"}
        UI-->>Student: Real-time typing response
    end
    Flask->>DB: INSERT INTO messages (user_id, role, content)
    Flask-->>UI: SSE Event: "data: [DONE]"
    end
```

---

## 3. Database Entity-Relationship (ER) Diagram

RoboLearn utilizes a relational schema with foreign-key constraints. Vector embeddings are stored directly as binary blobs (`BYTEA` / `BLOB`) to eliminate external vector database dependencies.

```mermaid
erDiagram
    users ||--o{ books : "owns"
    users ||--o{ quizzes : "creates"
    users ||--o{ attempts : "performs"
    users ||--o{ quiz_submissions : "submits"
    users ||--o{ mastery : "tracks"
    users ||--o{ study_materials : "saves"
    users ||--o{ messages : "logs"
    users ||--o| teacher_memory : "maintains"

    books ||--o{ chapters : "contains"
    books ||--o{ chunk_embeddings : "indexed_by"
    books ||--o{ quizzes : "scopes"

    chapters ||--o{ chunk_embeddings : "maps_to"
    chapters ||--o{ mastery : "measured_in"

    quizzes ||--o{ attempts : "records"
    quizzes ||--o{ quiz_submissions : "summarized_by"

    users {
        int id PK "Auto Increment"
        string username "Unique"
        string email "Unique"
        string password_hash "Werkzeug / Scrypt"
        int streak_count "Daily Active Streak"
        date last_active_date "Activity Tracker"
        timestamp created_at "Account Creation"
    }

    books {
        int id PK "Auto Increment"
        int user_id FK "References users.id"
        string title "Document Title"
        string file_name "Original Upload Name"
        text raw_text "Parsed Document Body"
        json toc_json "Table of Contents Tree"
        timestamp uploaded_at "Upload Timestamp"
    }

    chapters {
        int id PK "Auto Increment"
        int book_id FK "References books.id (CASCADE)"
        int chapter_num "Order Index"
        string title "Chapter Title"
        int start_page "Estimated Start Page"
        int end_page "Estimated End Page"
        int char_offset_start "Character Start Pos"
        int char_offset_end "Character End Pos"
    }

    chunk_embeddings {
        int id PK "Auto Increment"
        int book_id FK "References books.id (CASCADE)"
        int chapter_id FK "References chapters.id (Nullable)"
        text chunk_text "Semantic Paragraph Text"
        int char_offset "Character Position"
        bytea embedding "384-dim Vector as Binary BLOB"
    }

    quizzes {
        int id PK "Auto Increment"
        int user_id FK "References users.id"
        int book_id FK "References books.id (Nullable)"
        json quiz_json "Structured Q&A Array"
        timestamp created_at "Timestamp"
    }

    attempts {
        int id PK "Auto Increment"
        int user_id FK "References users.id"
        int quiz_id FK "References quizzes.id"
        int chapter_id FK "References chapters.id (Nullable)"
        string question_id "Identifier within Quiz"
        text question_text "Question Content"
        text selected_option "Student Selection"
        boolean is_correct "Grading Result"
        timestamp attempted_at "Attempt Timestamp"
    }

    quiz_submissions {
        int id PK "Auto Increment"
        int user_id FK "References users.id"
        int quiz_id FK "References quizzes.id"
        int score "Total Correct"
        int total_questions "Total Questions"
        float percentage "Calculated Score %"
        text reteach_text "Generated AI Feedback"
        timestamp created_at "Submission Time"
    }

    mastery {
        int id PK "Auto Increment"
        int user_id FK "References users.id"
        int chapter_id FK "References chapters.id"
        float mastery_percent "Aggregated Chapter Mastery"
        int total_attempts "Count of Questions Answered"
        int correct_attempts "Count of Correct Answers"
        timestamp last_updated "Last Activity"
    }

    study_materials {
        int id PK "Auto Increment"
        int user_id FK "References users.id"
        string material_type "flashcards | ppt | flowchart | schedule"
        string title "Topic Title"
        json content_json "Structured Material Body"
        timestamp created_at "Creation Date"
    }

    messages {
        int id PK "Auto Increment"
        int user_id FK "References users.id"
        string role "user | assistant | system"
        text content "Message Text"
        timestamp created_at "Log Time"
    }

    teacher_memory {
        int user_id PK "References users.id"
        text book_text "Cached Working Book Text"
        text pastpaper_text "Cached Working Past Papers"
        json toc_json "Cached Working Table of Contents"
    }
```

---

## 4. Authentication & Session Lifecycle

RoboLearn uses secure, stateful session cookies (`session["user_id"]`) with cryptographic password verification. Guest sessions are supported via isolated, ephemeral identifiers.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Browser)
    participant AuthUI as Auth Modal / UI
    participant Backend as Flask Auth Engine
    participant DB as Database (users table)

    %% SIGNUP FLOW
    rect rgb(240, 249, 255)
    Note over User, DB: 1. User Registration Flow
    User->>AuthUI: Enters username, email, password
    AuthUI->>Backend: POST /api/auth/signup {username, email, password}
    Backend->>DB: SELECT id FROM users WHERE email = ? OR username = ?
    alt User Already Exists
        DB-->>Backend: Existing Record Found
        Backend-->>AuthUI: HTTP 400 {"error": "User already exists"}
    else New Account
        Backend->>Backend: generate_password_hash(password, method='scrypt')
        Backend->>DB: INSERT INTO users (username, email, password_hash, streak_count) VALUES (...) RETURNING id
        DB-->>Backend: user_id = 42
        Backend->>Backend: session["user_id"] = 42 (Set Signed Cookie)
        Backend-->>AuthUI: HTTP 201 {"success": true, "user": {id: 42, username, email}}
        AuthUI-->>User: Redirects to Dashboard
    end
    end

    %% LOGIN FLOW
    rect rgb(254, 243, 199)
    Note over User, DB: 2. User Authentication Flow
    User->>AuthUI: Enters email and password
    AuthUI->>Backend: POST /api/auth/login {email, password}
    Backend->>DB: SELECT id, password_hash, username, streak_count, last_active_date FROM users WHERE email = ?
    alt Record Not Found or Invalid Password
        Backend->>Backend: check_password_hash(stored_hash, password) -> False
        Backend-->>AuthUI: HTTP 401 {"error": "Invalid credentials"}
    else Password Verified
        Backend->>Backend: check_password_hash(stored_hash, password) -> True
        Backend->>Backend: Update active streak counter if new calendar day
        Backend->>Backend: session["user_id"] = user_id
        Backend-->>AuthUI: HTTP 200 {"success": true, "user": {...}}
        AuthUI-->>User: Authenticated
    end
    end

    %% PROTECTED ROUTE ACCESS
    rect rgb(236, 253, 245)
    Note over User, DB: 3. Protected Endpoint Authorization
    User->>Backend: GET /api/dashboard/stats (Cookie: session_id=...)
    Backend->>Backend: get_current_user_id() -> Reads session.get("user_id")
    alt Session Empty & No Guest Allowed
        Backend-->>User: HTTP 401 {"error": "Authentication required. Please log in."}
    else Valid Session
        Backend->>DB: Query user's book chapters, attempts, and mastery stats
        DB-->>Backend: Aggregated analytics records
        Backend-->>User: HTTP 200 {streak, mastery_percentage, recent_quizzes}
    end
    end

    %% LOGOUT
    rect rgb(254, 242, 242)
    Note over User, DB: 4. Logout & Session Invalidation
    User->>Backend: POST /api/auth/logout
    Backend->>Backend: session.clear()
    Backend-->>User: HTTP 200 {"success": true, "message": "Logged out successfully"}
    end
```

---

## 5. Local-First Runtime & Deployment Topology

RoboLearn is completely self-contained. All reasoning, embeddings, vector indexing, and relational queries execute entirely on the local machine with **zero cloud dependencies** for core learning features.

```mermaid
flowchart LR
    subgraph HostMachine ["Host Machine (Localhost)"]
        direction TB

        subgraph ClientSandbox ["Browser Environment"]
            WebBrowser["Modern Web Browser\n(Chrome / Firefox / Edge)"]
        end

        subgraph ViteApp ["Frontend Service (:3000)"]
            ViteServer["Vite Dev / Preview Server"]
            StaticAssets["React SPA Bundle\n(HTML, CSS, JSX)"]
            ViteServer --- StaticAssets
        end

        subgraph FlaskApp ["Backend Service (:5000)"]
            WSGI["Flask WSGI Engine (app.py)"]
            PyTorch["SentenceTransformer\n(all-MiniLM-L6-v2)"]
            VectorEngine["NumPy Vector Math\n(Cosine Similarity / Dot Product)"]
            WSGI --- PyTorch
            WSGI --- VectorEngine
        end

        subgraph StorageService ["Storage Layer"]
            RelationalDB[("SQLite / PostgreSQL\nRelational DB & BYTEA Vectors")]
        end

        subgraph OllamaEngine ["Local AI Daemon (:11434)"]
            OllamaCore["Ollama Service Engine"]
            QwenModel["qwen2.5:1.5b Weights\n(GGUF Local Weights)"]
            OllamaCore --- QwenModel
        end

        %% Internal Machine Connections
        WebBrowser <-->|HTTP / WebSocket / SSE| ViteServer
        ViteServer <-->|Proxy Forwarding: /api/*| WSGI
        WSGI <-->|Local IPC / SQL Queries| RelationalDB
        WSGI <-->|Loopback HTTP POST /api/chat| OllamaCore
    end

    subgraph Internet ["External Internet (Optional / Isolated)"]
        TavilyAPI["Tavily Web Search API\n(Only for live web facts)"]
    end

    WSGI -.->|Optional Grounding (User Enabled)| TavilyAPI

    %% Styling & Annotations
    classDef offline fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#065f46;
    classDef optional fill:#fef3c7,stroke:#d97706,stroke-width:1px,stroke-dasharray: 5 5,color:#92400e;
    class HostMachine,ViteApp,FlaskApp,StorageService,OllamaEngine offline;
    class Internet,TavilyAPI optional;
```
