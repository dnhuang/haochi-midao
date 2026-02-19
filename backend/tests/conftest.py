import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ["APP_PASSWORD"] = "testpassword"

from app.main import app  # noqa: E402

FIXTURE_DIR = Path(__file__).parent / "fixtures"
SAMPLE_XLSX = FIXTURE_DIR / "sample_export.xlsx"


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    return {"X-Password": "testpassword"}


@pytest.fixture
def sample_xlsx_path():
    return SAMPLE_XLSX


@pytest.fixture
def sample_xlsx_bytes():
    return SAMPLE_XLSX.read_bytes()
