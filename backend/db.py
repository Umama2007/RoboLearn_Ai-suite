import os
import psycopg2
import psycopg2.pool
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")

_pg_pool = None

def get_pg_pool():
    global _pg_pool
    if _pg_pool is None:
        if not SUPABASE_DB_URL:
            raise RuntimeError("SUPABASE_DB_URL (or DATABASE_URL) environment variable is missing.")
        try:
            _pg_pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=20,
                dsn=SUPABASE_DB_URL
            )
        except Exception as e:
            raise RuntimeError(f"Failed to initialize Supabase PostgreSQL connection pool: {str(e)}")
    return _pg_pool

class PooledConnWrapper:
    """
    Wrapper around a psycopg2 pooled connection to maintain compatibility
    with existing Flask endpoint workflows (conn.cursor(), conn.commit(), conn.close()).
    Calling close() returns the connection back to the ThreadedConnectionPool.
    """
    def __init__(self, pool, conn):
        self._pool = pool
        self._conn = conn

    def cursor(self, cursor_factory=None):
        if not self._conn:
            raise RuntimeError("Database connection has been closed.")
        return self._conn.cursor(cursor_factory=cursor_factory)

    def commit(self):
        if self._conn:
            self._conn.commit()

    def rollback(self):
        if self._conn:
            self._conn.rollback()

    def close(self):
        if self._pool and self._conn:
            self._pool.putconn(self._conn)
            self._conn = None

def get_db_conn():
    """
    Acquire a connection from the ThreadedConnectionPool wrapped in PooledConnWrapper.
    """
    pool = get_pg_pool()
    conn = pool.getconn()
    return PooledConnWrapper(pool, conn)

def init_db():
    """
    Pings the Supabase PostgreSQL database on application startup to confirm connectivity.
    """
    try:
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        cur.close()
        conn.close()
        print("[SUCCESS] Supabase PostgreSQL Database pool initialized successfully.")
    except Exception as e:
        print(f"[ERROR] Database connection failure during init_db: {e}")
        raise e
