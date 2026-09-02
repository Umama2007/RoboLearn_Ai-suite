import os
import sys
import sqlite3
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
SQLITE_DB_PATH = os.path.join(APP_ROOT, "ai_teacher.db")

TABLES_IN_ORDER = [
    "users",
    "books",
    "chapters",
    "teacher_memory",
    "quizzes",
    "attempts",
    "quiz_submissions",
    "mastery",
    "messages",
    "study_materials",
    "chunk_embeddings"
]

IDENTITY_TABLES = [
    "books",
    "chapters",
    "quizzes",
    "attempts",
    "quiz_submissions",
    "mastery",
    "messages",
    "study_materials",
    "chunk_embeddings"
]

def migrate():
    if not SUPABASE_DB_URL:
        print("[ERROR] SUPABASE_DB_URL (or DATABASE_URL) environment variable is not set.")
        sys.exit(1)

    if not os.path.exists(SQLITE_DB_PATH):
        print(f"[ERROR] SQLite database file not found at '{SQLITE_DB_PATH}'.")
        sys.exit(1)

    try:
        import psycopg2
        from psycopg2.extras import execute_values
    except ImportError:
        print("[ERROR] psycopg2-binary package is missing. Run `pip install psycopg2-binary`.")
        sys.exit(1)

    print("================================================================")
    print("Starting RoboLearn Migration: SQLite -> Supabase Postgres")
    print("================================================================")
    print(f"• SQLite Database: {SQLITE_DB_PATH} (Read-Only)")
    print(f"• Target Database: {SUPABASE_DB_URL.split('@')[-1] if '@' in SUPABASE_DB_URL else 'Supabase'}")
    print("• Option A Active: Filtering out orphaned legacy test rows...")
    print()

    # 1. Connect to SQLite (Read-Only mode)
    sq_conn = sqlite3.connect(f"file:{SQLITE_DB_PATH}?mode=ro", uri=True)
    sq_cursor = sq_conn.cursor()

    # 2. Connect to Supabase Postgres
    try:
        pg_conn = psycopg2.connect(SUPABASE_DB_URL)
        pg_conn.autocommit = False
        pg_cursor = pg_conn.cursor()
    except Exception as e:
        print(f"[ERROR] Connection to Supabase Postgres failed: {e}")
        sq_conn.close()
        sys.exit(1)

    migrated_counts = {}
    sqlite_counts = {}

    # Valid ID sets to guarantee relational integrity
    valid_user_ids = set()
    valid_book_ids = set()
    valid_chapter_ids = set()
    valid_quiz_ids = set()

    try:
        for table in TABLES_IN_ORDER:
            sq_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
            if not sq_cursor.fetchone():
                print(f"[WARN] Table '{table}' does not exist in SQLite. Skipping...")
                continue

            sq_cursor.execute(f"PRAGMA table_info({table})")
            columns = [col[1] for col in sq_cursor.fetchall()]
            
            sq_cursor.execute(f"SELECT COUNT(*) FROM {table}")
            sq_count = sq_cursor.fetchone()[0]
            sqlite_counts[table] = sq_count

            if sq_count == 0:
                print(f"[INFO] Table '{table}': 0 rows in SQLite.")
                migrated_counts[table] = 0
                continue

            sq_cursor.execute(f"SELECT {', '.join(columns)} FROM {table}")
            raw_rows = sq_cursor.fetchall()

            filtered_rows = []
            for row in raw_rows:
                row_dict = dict(zip(columns, row))
                
                # Check user_id FK
                if "user_id" in row_dict and row_dict["user_id"] is not None:
                    if row_dict["user_id"] not in valid_user_ids and table != "users":
                        continue
                
                # Check book_id FK
                if "book_id" in row_dict and row_dict["book_id"] is not None:
                    if row_dict["book_id"] not in valid_book_ids:
                        continue

                # Check chapter_id FK
                if "chapter_id" in row_dict and row_dict["chapter_id"] is not None:
                    if row_dict["chapter_id"] not in valid_chapter_ids:
                        continue

                # Check quiz_id FK
                if "quiz_id" in row_dict and row_dict["quiz_id"] is not None:
                    if row_dict["quiz_id"] not in valid_quiz_ids:
                        continue

                # Type Conversions
                if table == "attempts" and "is_correct" in row_dict:
                    val = row_dict["is_correct"]
                    row_dict["is_correct"] = bool(val) if val is not None else None

                # Reconstruct tuple in original column order
                processed_tuple = tuple(row_dict[col] for col in columns)
                filtered_rows.append(processed_tuple)

                # Record valid IDs for child tables
                if table == "users":
                    valid_user_ids.add(row_dict["id"])
                elif table == "books":
                    valid_book_ids.add(row_dict["id"])
                elif table == "chapters":
                    valid_chapter_ids.add(row_dict["id"])
                elif table == "quizzes":
                    valid_quiz_ids.add(row_dict["id"])

            if not filtered_rows:
                print(f"[INFO] Table '{table}': All {sq_count} rows were orphaned test data. Skipped.")
                migrated_counts[table] = 0
                continue

            cols_joined = ", ".join(columns)
            if table in IDENTITY_TABLES:
                insert_query = f"INSERT INTO {table} ({cols_joined}) OVERRIDING SYSTEM VALUE VALUES %s ON CONFLICT DO NOTHING;"
            else:
                insert_query = f"INSERT INTO {table} ({cols_joined}) VALUES %s ON CONFLICT DO NOTHING;"

            execute_values(pg_cursor, insert_query, filtered_rows)
            migrated_counts[table] = len(filtered_rows)
            print(f"[OK] Migrated table '{table}': {len(filtered_rows)} / {sq_count} rows copied.")

            # Reset Identity Sequence
            if table in IDENTITY_TABLES:
                seq_query = f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM {table};"
                try:
                    pg_cursor.execute(seq_query)
                except Exception as seq_err:
                    print(f"   [INFO] Sequence setval notice for '{table}': {seq_err}")

        # Commit transaction
        pg_conn.commit()
        print("\n[SUCCESS] Transaction successfully committed to Supabase!")

    except Exception as err:
        pg_conn.rollback()
        print(f"\n[ERROR] Migration Failed! Transaction rolled back cleanly. Error: {err}")
        sq_conn.close()
        pg_conn.close()
        sys.exit(1)

    # Verification Phase: Compare row counts
    print("\n================================================================")
    print("DATA MIGRATION VERIFICATION SUMMARY")
    print("================================================================")
    print(f"{'TABLE NAME':<20} | {'SQLITE TOTAL':<12} | {'VALID COPIED':<12} | {'SUPABASE ROWS':<14} | {'STATUS':<10}")
    print("-" * 75)

    all_matched = True
    for table in TABLES_IN_ORDER:
        sq_cnt = sqlite_counts.get(table, 0)
        mig_cnt = migrated_counts.get(table, 0)
        try:
            pg_cursor.execute(f"SELECT COUNT(*) FROM {table}")
            pg_cnt = pg_cursor.fetchone()[0]
        except Exception:
            pg_cnt = 0
        
        status = "PASS ✅" if mig_cnt == pg_cnt else "FAIL ❌"
        if mig_cnt != pg_cnt:
            all_matched = False

        print(f"{table:<20} | {sq_cnt:<12} | {mig_cnt:<12} | {pg_cnt:<14} | {status:<10}")

    print("-" * 75)
    if all_matched:
        print("Migration verified — all row counts match")
    else:
        print("[NOTICE] Verification Note: Some table row counts differ. Check table status above.")

    sq_conn.close()
    pg_conn.close()

if __name__ == "__main__":
    migrate()
