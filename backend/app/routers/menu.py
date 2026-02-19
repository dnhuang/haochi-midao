from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends

from app.auth import verify_password
from app.schemas import MenuItem, MenuResponse

router = APIRouter()

MENU_CSV = Path(__file__).resolve().parent.parent.parent / "data" / "menu.csv"


@router.get("/menu", response_model=MenuResponse)
def get_menu(_password: str = Depends(verify_password)):
    df = pd.read_csv(MENU_CSV)
    items = [
        MenuItem(
            id=int(row["id"]),
            item_zh=row["item_zh"],
            item_short_zh=row["item_short_zh"],
            item_en=row["item_en"],
        )
        for _, row in df.iterrows()
    ]
    return MenuResponse(items=items)
