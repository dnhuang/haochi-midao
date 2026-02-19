from pathlib import Path

import pandas as pd
from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.auth import verify_password
from app.labels import generate_labels_pdf
from app.schemas import LabelsRequest

router = APIRouter()

MENU_CSV = Path(__file__).resolve().parent.parent.parent / "data" / "menu.csv"


@router.post("/labels")
def create_labels(request: LabelsRequest, _password: str = Depends(verify_password)):
    menu_df = pd.read_csv(MENU_CSV)
    sorted_items = [(item.item_name, item.quantity) for item in request.sorted_items]
    pdf_bytes = generate_labels_pdf(sorted_items, menu_df)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=labels.pdf"},
    )
