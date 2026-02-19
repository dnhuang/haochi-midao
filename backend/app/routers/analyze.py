from collections import Counter

from fastapi import APIRouter, Depends

from app.auth import verify_password
from app.schemas import AnalyzeRequest, AnalyzeResponse, SortedItem

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest, _password: str = Depends(verify_password)):
    totals: Counter[str] = Counter()
    for order in request.orders:
        for item_name, quantity in order.items():
            totals[item_name] += quantity

    sorted_items = [SortedItem(item_name=name, quantity=qty) for name, qty in totals.most_common()]
    total_items = sum(totals.values())

    return AnalyzeResponse(
        sorted_items=sorted_items,
        total_items=total_items,
        orders_analyzed=len(request.orders),
    )
