# preload_model.py
import sys
print("Pre-downloading sentence-transformers model...")
try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
    print("Model all-MiniLM-L6-v2 downloaded successfully!")
except Exception as e:
    print(f"Error pre-downloading model: {e}", file=sys.stderr)
    sys.exit(1)
