from sqlalchemy import Column, Integer, Float, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.db.base import Base


class CarpoolGroupStatusEnum(str, enum.Enum):
    WAITING     = "WAITING"      # In matching window, accepting more riders
    MATCHED     = "MATCHED"      # Driver assigned, not yet started
    IN_PROGRESS = "IN_PROGRESS"  # At least one rider picked up
    COMPLETED   = "COMPLETED"    # All riders dropped off
    CANCELLED   = "CANCELLED"


class CarpoolGroup(Base):
    __tablename__ = "carpool_group"

    id               = Column(Integer, primary_key=True, index=True)
    driverId         = Column(Integer, ForeignKey("driver.id"), nullable=True)
    status           = Column(Enum(CarpoolGroupStatusEnum), default=CarpoolGroupStatusEnum.WAITING)
    maxSeats         = Column(Integer, default=4)
    createdAt        = Column(DateTime, server_default=func.now())
    expiresAt        = Column(DateTime, nullable=True)

    # Centroid of all pickups (used for proximity matching)
    routeAreaLat     = Column(Float, nullable=True)
    routeAreaLng     = Column(Float, nullable=True)

    # Centroid of all destinations (used for direction compatibility check)
    routeAreaDestLat = Column(Float, nullable=True)
    routeAreaDestLng = Column(Float, nullable=True)

    # Optimal waypoint order as pipe-separated "lat,lng|lat,lng|..."
    waypointOrder    = Column(String, nullable=True)

    driver = relationship("Driver", back_populates="carpool_groups")
    rides  = relationship("Ride", back_populates="carpool_group", lazy="selectin")
