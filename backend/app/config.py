import json
import os
from pathlib import Path


def get_password() -> str:
    """Read password from APP_PASSWORD env var, falling back to backend/config.json."""
    password = os.environ.get("APP_PASSWORD")
    if password:
        return password

    config_path = Path(__file__).resolve().parent.parent / "config.json"
    if config_path.exists():
        with open(config_path) as f:
            return json.load(f)["password"]

    raise RuntimeError("No password configured. Set APP_PASSWORD env var or create backend/config.json.")
