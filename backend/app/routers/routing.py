from fastapi import APIRouter, Depends, HTTPException

from app.auth import verify_password
from app.config import get_google_maps_api_key
from app.routing import GeocodingError, RoutingError, optimize_route
from app.schemas import RouteRequest, RouteResponse, RouteStopResponse

router = APIRouter()


@router.post("/route", response_model=RouteResponse)
def create_route(
    request: RouteRequest,
    _password: str = Depends(verify_password),
):
    if len(request.orders) == 0:
        raise HTTPException(status_code=400, detail="No orders selected for routing")

    try:
        api_key = get_google_maps_api_key()
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    orders_dicts = [
        {
            "index": o.index,
            "customer": o.customer,
            "address": o.address,
            "city": o.city,
            "zip_code": o.zip_code,
        }
        for o in request.orders
    ]

    try:
        stops = optimize_route(orders_dicts, request.start_address, api_key, request.departure_time)
    except GeocodingError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RoutingError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return RouteResponse(
        stops=[
            RouteStopResponse(
                stop_number=s.stop_number,
                customer=s.customer,
                address=s.address,
                city=s.city,
                zip_code=s.zip_code,
                order_index=s.order_index,
                duration_seconds=s.duration_seconds,
            )
            for s in stops
        ],
        total_stops=len(stops),
    )
