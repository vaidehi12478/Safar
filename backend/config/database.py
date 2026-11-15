from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
import ssl
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

load_dotenv()

# Raw database URL from environment
raw_db_url = os.getenv("DATABASE_URL")

connect_args = {}

if raw_db_url:
    # Handle cloud Postgres connection strings (Neon, Supabase, Render, AWS RDS)
    # asyncpg expects scheme postgresql+asyncpg:// and takes SSL via connect_args rather than query string
    parsed = urlparse(raw_db_url)
    qs = parse_qs(parsed.query)

    needs_ssl = "sslmode" in qs or "neon.tech" in (parsed.hostname or "") or "render.com" in (parsed.hostname or "")
    
    # Strip query params not directly recognized by asyncpg dialect
    qs.pop("sslmode", None)
    qs.pop("channel_binding", None)
    clean_query = urlencode(qs, doseq=True)

    DATABASE_URL = urlunparse((
        "postgresql+asyncpg",
        parsed.netloc,
        parsed.path,
        parsed.params,
        clean_query,
        parsed.fragment
    ))

    if needs_ssl:
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_ctx
else:
    print("⚠️ WARNING: DATABASE_URL environment variable is not set. Database connections will fail.", flush=True)
    DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    connect_args=connect_args,
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
    future=True,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session