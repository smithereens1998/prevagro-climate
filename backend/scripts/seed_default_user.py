import base64
import hashlib
import os
import sys
from pathlib import Path

from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db.database import engine


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        120_000,
    )
    return f"pbkdf2_sha256$120000${base64.b64encode(salt).decode()}${base64.b64encode(password_hash).decode()}"


def run() -> None:
    email = "prevagro@gmail.com"
    senha = "@admin1"
    senha_hash = hash_password(senha)

    sql = text(
        """
        INSERT INTO public.usuarios (email, senha_hash, updated_at)
        VALUES (:email, :senha_hash, NOW())
        ON CONFLICT (email)
        DO UPDATE SET
            senha_hash = EXCLUDED.senha_hash,
            updated_at = NOW()
        """
    )

    with engine.begin() as connection:
        connection.execute(sql, {"email": email, "senha_hash": senha_hash})

    print(f"User upserted: {email}")


if __name__ == "__main__":
    run()
