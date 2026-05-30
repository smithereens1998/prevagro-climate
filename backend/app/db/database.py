from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings


def normalize_database_url(database_url: str) -> str:
    sqlalchemy_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    scheme, remainder = sqlalchemy_url.split("://", 1)
    authority, has_path, path = remainder.partition("/")

    # Handles malformed URLs like `postgresql://user:@password@host/db`.
    authority = authority.replace(":@", ":%40", 1)

    suffix = f"/{path}" if has_path else ""
    return f"{scheme}://{authority}{suffix}"


settings = get_settings()
sqlalchemy_database_url = normalize_database_url(settings.database_url)
engine = create_engine(
    sqlalchemy_database_url,
    pool_pre_ping=True,
    connect_args={"sslmode": "require"},
)


def check_database_connection() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except SQLAlchemyError:
        return False
