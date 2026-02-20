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


def get_google_maps_api_key() -> str:
    """Read Google Maps API key from GOOGLE_MAPS_API_KEY env var, falling back to backend/config.json."""
    key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if key:
        return key

    config_path = Path(__file__).resolve().parent.parent / "config.json"
    if config_path.exists():
        with open(config_path) as f:
            data = json.load(f)
            if "google_maps_api_key" in data:
                return data["google_maps_api_key"]

    raise RuntimeError(
        "No Google Maps API key configured. "
        "Set GOOGLE_MAPS_API_KEY env var or add 'google_maps_api_key' to backend/config.json."
    )
