from typing import List, Tuple, Optional
from sqlalchemy.orm import Session
from GrafolanaBack.domain.prices.models import SOLPrice
from GrafolanaBack.domain.infrastructure.db.session import get_session


class SOLPriceRepository:
    def __init__(self) -> None:
        self.session: Session = get_session()

    def bulk_set_prices(self, prices: List[Tuple[int, float]]) -> None:
        """
        Inserts multiple SOL price records into the database.
        
        :param prices: List of tuples containing (timestamp, price)
        """
        price_objects = [SOLPrice(timestamp=timestamp, price=price) for timestamp, price in prices]
        self.session.bulk_save_objects(price_objects)
        self.session.commit()

    def bulk_get_prices(self, start_time: int, end_time: int) -> List[SOLPrice]:
        """
        Retrieves SOL prices within a specified time range.
        
        :param start_time: Start timestamp in milliseconds
        :param end_time: End timestamp in milliseconds
        :return: List of SOLPrice objects within the specified range
        """
        return self.session.query(SOLPrice).filter(
            SOLPrice.timestamp >= start_time,
            SOLPrice.timestamp <= end_time
        ).all()
        
    def get_latest_price(self) -> Optional[SOLPrice]:
        """
        Retrieves the most recent SOL price from the database.
        
        :return: The most recent SOLPrice object or None if no prices exist
        """
        return self.session.query(SOLPrice).order_by(SOLPrice.timestamp.desc()).first()

    def get_price_at_timestamp(self, timestamp: int) -> Optional[SOLPrice]:
        """
        Retrieves the SOL price at a specific timestamp.
        If an exact match isn't found, returns the closest earlier price.
        
        :param timestamp: Timestamp in milliseconds
        :return: SOLPrice object at or before the specified timestamp, or None if no earlier price exists
        """
        return self.session.query(SOLPrice).filter(
            SOLPrice.timestamp <= timestamp
        ).order_by(SOLPrice.timestamp.desc()).first()

    def get_prices_by_timestamps(self, timestamps: List[int]) -> List[SOLPrice]:
        """
        Retrieves SOL prices for a specific set of timestamps.
        More efficient than bulk_get_prices when needing prices at discrete points in time.
        
        :param timestamps: List of timestamps in milliseconds to retrieve prices for
        :return: List of SOLPrice objects matching the requested timestamps
        """
        if not timestamps:
            return []
        
        return self.session.query(SOLPrice).filter(
            SOLPrice.timestamp.in_(timestamps)
        ).all()