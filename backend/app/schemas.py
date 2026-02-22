from typing import Dict, List

from pydantic import BaseModel


class OrderItem(BaseModel):
    index: int
    delivery: str
    customer: str
    items_ordered: str
    phone_number: str
    address: str
    city: str
    zip_code: str
    item_quantities: Dict[str, int]


class Discrepancy(BaseModel):
    food_item: str
    parsed_total: int
    expected_total: int


class UploadResponse(BaseModel):
    orders: List[OrderItem]
    discrepancies: List[Discrepancy]
    food_columns: List[str]
    format: str
    food_column_labels: Dict[str, str]


class MenuItem(BaseModel):
    id: int
    item_zh: str
    item_short_zh: str
    item_en: str


class MenuResponse(BaseModel):
    items: List[MenuItem]


class AnalyzeRequest(BaseModel):
    orders: List[Dict[str, int]]


class SortedItem(BaseModel):
    item_name: str
    quantity: int


class AnalyzeResponse(BaseModel):
    sorted_items: List[SortedItem]
    total_items: int
    orders_analyzed: int


class LabelsRequest(BaseModel):
    sorted_items: List[SortedItem]


class RouteOrderInput(BaseModel):
    index: int
    customer: str
    address: str
    city: str
    zip_code: str


class RouteRequest(BaseModel):
    orders: List[RouteOrderInput]
    start_address: str
    departure_time: int | None = None


class RouteStopResponse(BaseModel):
    stop_number: int
    customer: str
    address: str
    city: str
    zip_code: str
    order_index: int
    duration_seconds: int


class RouteResponse(BaseModel):
    stops: List[RouteStopResponse]
    total_stops: int
