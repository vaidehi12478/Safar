from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Review, Ride, User, Driver, RideStatusEnum

async def create_review(
    ride_id: int, 
    reviewer: User, 
    rating: int, 
    comment: str | None, 
    db: AsyncSession
):
    # 1. Fetch the ride
    result = await db.execute(
        select(Ride).where(Ride.id == ride_id)
    )
    ride = result.scalars().first()
    
    if not ride:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ride not found")
    
    if ride.status != RideStatusEnum.COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only review completed rides")

    # Check if a review already exists from this reviewer for this ride
    result = await db.execute(
        select(Review).where(Review.rideId == ride_id, Review.reviewerId == reviewer.id)
    )
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Review already submitted for this ride")

    # 2. Identify reviewee
    reviewee_user_id = None
    reviewee_driver_id = None
    
    if reviewer.id == ride.riderId:
        # Rider is reviewing driver
        if not ride.driverId:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ride has no driver")
        
        result = await db.execute(select(Driver).where(Driver.id == ride.driverId))
        driver = result.scalars().first()
        reviewee_driver_id = driver.id
        reviewee_user_id = driver.userId
    else:
        # Driver is reviewing rider
        # Check if current user is the driver of this ride
        result = await db.execute(select(Driver).where(Driver.userId == reviewer.id))
        driver = result.scalars().first()
        if not driver or driver.id != ride.driverId:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to review this ride")
        
        reviewee_user_id = ride.riderId

    # 3. Create review
    review = Review(
        rideId=ride_id,
        reviewerId=reviewer.id,
        revieweeId=reviewee_user_id,
        revieweeDriverId=reviewee_driver_id,
        rating=rating,
        comment=comment
    )
    db.add(review)
    
    # 4. Update ratings
    if reviewee_driver_id:
        # Update Driver rating
        result = await db.execute(select(Driver).where(Driver.id == reviewee_driver_id))
        target_driver = result.scalars().first()
        
        old_rating = target_driver.rating if target_driver.rating is not None else 5.0
        old_count = target_driver.numRatings or 0
        new_count = old_count + 1
        
        # If it was the first rating and it was default 5.0, maybe we should just take the new rating
        # But let's assume total = count * rating
        new_rating = ((old_rating * old_count) + rating) / new_count
        
        target_driver.rating = round(new_rating, 2)
        target_driver.numRatings = new_count
        
        # Check for suspension (e.g., if rating < 3.0 and count > 5)
        if target_driver.numRatings >= 5 and target_driver.rating < 3.0:
            target_driver.isSuspended = 1
            
    else:
        # Update Rider (User) rating
        result = await db.execute(select(User).where(User.id == reviewee_user_id))
        target_user = result.scalars().first()
        
        old_rating = target_user.rating if target_user.rating is not None else 5.0
        old_count = target_user.numRatings or 0
        new_count = old_count + 1
        new_rating = ((old_rating * old_count) + rating) / new_count
        
        target_user.rating = round(new_rating, 2)
        target_user.numRatings = new_count

    await db.commit()
    await db.refresh(review)
    return review
