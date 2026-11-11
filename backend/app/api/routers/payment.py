import razorpay
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from config.settings import settings
from config.database import get_db
from app.models import Ride, User
from app.api.deps import get_current_user

router = APIRouter()

client = None
if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


class CreateOrderRequest(BaseModel):
    ride_id: int


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int  # in paise
    currency: str
    key_id: str
    ride_id: int


class VerifyPaymentRequest(BaseModel):
    ride_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_razorpay_order(
    payload: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay credentials not configured on backend."
        )

    res = await db.execute(select(Ride).where(Ride.id == payload.ride_id))
    ride = res.scalars().first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    if ride.riderId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to pay for this ride")

    if ride.paymentStatus == "PAID":
        raise HTTPException(status_code=400, detail="Ride is already paid")

    fare_amount = ride.price or 10.0
    amount_in_paise = int(round(fare_amount * 100))

    try:
        order_data = {
            "amount": amount_in_paise,
            "currency": "INR",
            "receipt": f"ride_rcpt_{ride.id}",
            "notes": {
                "ride_id": ride.id,
                "rider_id": current_user.id,
                "rider_email": current_user.email,
            },
        }
        razorpay_order = client.order.create(data=order_data)

        ride.razorpayOrderId = razorpay_order["id"]
        ride.paymentMethod = "RAZORPAY"
        await db.commit()

        return CreateOrderResponse(
            order_id=razorpay_order["id"],
            amount=amount_in_paise,
            currency="INR",
            key_id=settings.RAZORPAY_KEY_ID,
            ride_id=ride.id,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Razorpay order creation failed: {str(e)}")


@router.post("/verify")
async def verify_razorpay_payment(
    payload: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay credentials not configured on backend."
        )

    res = await db.execute(select(Ride).where(Ride.id == payload.ride_id))
    ride = res.scalars().first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")

    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Razorpay signature. Verification failed.")

    ride.paymentStatus = "PAID"
    ride.razorpayPaymentId = payload.razorpay_payment_id
    ride.razorpaySignature = payload.razorpay_signature
    ride.paidAt = datetime.now(timezone.utc)

    await db.commit()

    return {
        "status": "success",
        "message": "Payment verified and recorded successfully!",
        "ride_id": ride.id,
        "payment_id": payload.razorpay_payment_id,
    }

