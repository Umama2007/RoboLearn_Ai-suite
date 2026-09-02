╔══════════════════════════════════════════════════════════╗
║              RoboLearn — AI Adaptive Learning Suite       ║
╚══════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1-CLICK LAUNCHERS & INSTALLER
  (Checks and Auto-installs Python, Node.js, and Ollama)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ★ Run_Website.bat          ← ONE-CLICK LAUNCH & AUTOMATED SETUP
                               Automatically verifies/installs Python packages,
                               npm modules, local Ollama engine (via winget),
                               pulls qwen2.5:1.5b model, starts Flask & Vite,
                               and opens localhost:3000!

  ★ Setup_Environment.bat    ← EXPLICIT INSTALLER SCRIPT
                               Installs all Python requirements, npm packages,
                               Ollama engine, and downloads the qwen2.5:1.5b model.

  ★ Run_Website_Silent.vbs   ← SILENT BACKGROUND LAUNCHER
                               Runs backend & frontend silently in background.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  FEATURES & ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  - Real Semantic Vector Search: Replaced keyword indexing with SentenceTransformers
    (`all-MiniLM-L6-v2`) for precise chapter character range matching and references.
  - Multi-user authentication: Hardened security configurations with full session
    verification and secure password hashes (Bcrypt/Werkzeug). No default student bypass.
  - Interactive quizzes, AI-Reteach system, and learning mastery statistics tracking.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MANUAL SETUP (IF PREFERRED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Python Backend:
     cd backend
     pip install -r requirements.txt
     python preload_model.py  (Pre-downloads vector embedding models)
     python app.py            (Runs on Port 5000)

  2. Frontend:
     cd frontend
     npm install
     npm run dev              (Runs on Port 3000)

  3. Ollama & AI Model:
     Install Ollama (https://ollama.com)
     Run: ollama pull qwen2.5:1.5b

  4. Open Browser:
     http://localhost:3000
