import sqlalchemy as sa
from sqlalchemy.orm import validates
from typing import Any, Union

from GrafolanaBack.domain.infrastructure.db.session import Base


class SOLPrice(Base):
    __tablename__ = 'sol_prices'

    timestamp = sa.Column(sa.BigInteger, primary_key=True, nullable=False)
    price = sa.Column(sa.Float, nullable=False)

    def __repr__(self) -> str:
        return f"<SOLPrice(timestamp={self.timestamp}, price={self.price})>"

    @validates('timestamp')
    def validate_timestamp(self, key: str, value: Any) -> int:
        if not isinstance(value, int):
            raise ValueError("Timestamp must be an integer.")
        return value

    @validates('price')
    def validate_price(self, key: str, value: Any) -> float:
        if not isinstance(value, float):
            raise ValueError("Price must be a float.")
        return value