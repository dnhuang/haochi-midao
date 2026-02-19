import io
import re

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.analyzer import load_food_items, process_excel
from app.auth import verify_password
from app.schemas import Discrepancy, OrderItem, UploadResponse

router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload(file: UploadFile, _password: str = Depends(verify_password)):
    if not file.filename or not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Please upload an .xlsx file")

    contents = await file.read()
    excel_file = io.BytesIO(contents)

    try:
        food_items = load_food_items()
        df, raw_discrepancies = process_excel(excel_file, food_items)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {e}")

    # Identify food columns (columns after the first 7 that contain Chinese characters)
    food_columns = [col for col in df.columns[7:] if re.search(r"[\u4e00-\u9fff]", col)]

    orders = []
    for idx, row in df.iterrows():
        item_quantities = {col: int(row[col]) for col in food_columns if int(row[col]) > 0}
        orders.append(
            OrderItem(
                index=int(idx),
                delivery=str(row["delivery"]),
                customer=str(row["customer"]),
                items_ordered=str(row["items_ordered"]),
                phone_number=str(row["phone_number"]),
                address=str(row["address"]),
                city=str(row["city"]),
                zip_code=str(row["zip_code"]),
                item_quantities=item_quantities,
            )
        )

    discrepancies = [Discrepancy(food_item=d[0], parsed_total=d[1], expected_total=d[2]) for d in raw_discrepancies]

    return UploadResponse(orders=orders, discrepancies=discrepancies, food_columns=food_columns)
