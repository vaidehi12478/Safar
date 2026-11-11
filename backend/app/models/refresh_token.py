from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True)
    tokenHash = Column(String, unique=True, index=True, nullable=False)
    familyId = Column(String, index=True, nullable=False)
    isRevoked = Column(Boolean, default=False, nullable=False)
    deviceInfo = Column(String, nullable=True)
    ipAddress = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    expiresAt = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")

