"""Test-only configuration, loaded before test module imports.

These values contain no production credentials; tests use fake repositories and
never contact PostgreSQL. Database driver is supplied by the normal project deps.
"""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

for key, value in {
    "APP_NAME": "CreditCabinetTest",
    "DATABASE_URL": "postgresql+asyncpg://test:test@localhost:5432/test",
    "JWT_SECRET": "only-for-unit-tests-not-production",
    "JWT_ALGORITHM": "HS256",
    "ACCESS_TOKEN_TTL_MINUTES": "60",
    "MOCK_DOCS_DIR": str(ROOT / "mock_docs"),
    "DEMO_CLIENT_EMAIL": "client@example.test",
    "DEMO_CLIENT_PASSWORD": "dummy-client",
    "DEMO_EMPLOYEE_EMAIL": "employee@example.test",
    "DEMO_EMPLOYEE_PASSWORD": "dummy-employee",
}.items():
    os.environ.setdefault(key, value)
