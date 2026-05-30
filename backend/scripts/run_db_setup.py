from pathlib import Path
import sys

from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db.database import engine


def parse_sql_statements(sql_script: str) -> list[str]:
    statements: list[str] = []
    statement_lines: list[str] = []
    in_dollar_quote = False

    for line in sql_script.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue

        statement_lines.append(line)
        if "$$" in line:
            if line.count("$$") % 2 == 1:
                in_dollar_quote = not in_dollar_quote

        if stripped.endswith(";") and not in_dollar_quote:
            statement = "\n".join(statement_lines).strip().rstrip(";").strip()
            if statement:
                statements.append(statement)
            statement_lines = []

    if statement_lines:
        statement = "\n".join(statement_lines).strip().rstrip(";").strip()
        if statement:
            statements.append(statement)

    return statements


def run() -> None:
    sql_dir = ROOT_DIR / "sql"
    sql_files = sorted(sql_dir.glob("*.sql"))

    if not sql_files:
        print("No SQL files found in backend/sql")
        return

    with engine.begin() as connection:
        for sql_file in sql_files:
            sql_script = sql_file.read_text(encoding="utf-8")
            statements = parse_sql_statements(sql_script)
            for statement in statements:
                connection.execute(text(statement))
            print(f"Applied: {sql_file.name}")

    print("Database setup completed.")


if __name__ == "__main__":
    run()
