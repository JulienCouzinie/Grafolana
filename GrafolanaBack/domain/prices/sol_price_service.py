import logging
import time
from typing import Dict, List, Optional, Tuple, Union
import requests
from sqlalchemy.orm import Session

from GrafolanaBack.domain.prices.models import SOLPrice
from GrafolanaBack.domain.prices.repository import SOLPriceRepository
from GrafolanaBack.domain.prices.sol_price_utils import round_timestamp_to_minute
from GrafolanaBack.domain.infrastructure.db.session import get_session

logger = logging.getLogger(__name__)

# Create a persistent session for reuse to avoid connection overhead
_session = requests.Session()


class SOLPriceService:
    """
    Service for retrieving SOL prices from database or Binance API.
    Attempts to fetch prices from the database first, then falls back to the API
    if needed.
    """
    
    def __init__(self) -> None:
        """
        Initialize the SOL price service.
        
        Args:
            db_session: SQLAlchemy session for database access
        """
        self.db_session: Session = get_session()
        self.repository: SOLPriceRepository = SOLPriceRepository()
        # Cache for prices fetched during the current request
        self.price_cache: Dict[int, float] = {}
        
    def get_sol_price(self, timestamp: int) -> Optional[float]:
        """
        Get SOL price for the specified timestamp.
        First checks the database, then falls back to Binance API if needed.
        
        Args:
            timestamp: Unix timestamp in milliseconds
            
        Returns:
            The SOL price as a float, or None if not available
        """
        # Round timestamp to minute for consistent storage/retrieval
        rounded_timestamp: int = round_timestamp_to_minute(timestamp)
        
        # Check cache first for fastest retrieval
        if rounded_timestamp in self.price_cache:
            return self.price_cache[rounded_timestamp]
            
        # Try to get price from database
        price_record: Optional[SOLPrice] = self.repository.get_price_at_timestamp(rounded_timestamp)
        
        if price_record is not None:
            # Store in cache and return
            self.price_cache[rounded_timestamp] = price_record.price
            return price_record.price
            
        # If not in database, fetch from API
        logger.info(f"SOL price not found in database for timestamp {rounded_timestamp}, fetching from API")
        price: Optional[float] = self._fetch_price_from_api(rounded_timestamp)
        
        # If we got a price from the API, save it to the database for future use
        if price is not None:
            self._save_price_to_database(rounded_timestamp, price)
            
        # Store in cache for this request and return
        self.price_cache[rounded_timestamp] = price
        return price
        
    def get_sol_prices_batch(self, timestamps: List[int]) -> Dict[int, Optional[float]]:
        """
        Get SOL prices for multiple timestamps.
        Efficiently batches database lookups and API requests.
        
        Args:
            timestamps: List of Unix timestamps in milliseconds
            
        Returns:
            Dictionary mapping timestamps to prices (or None if not available)
        """
        # Round all timestamps for consistent storage/retrieval
        rounded_timestamps: List[int] = [round_timestamp_to_minute(ts) for ts in timestamps]
        unique_timestamps: List[int] = list(set(rounded_timestamps))
        result: Dict[int, Optional[float]] = {}
        
        # First, check which timestamps we already have in cache
        timestamps_to_fetch: List[int] = []
        for ts in unique_timestamps:
            if ts in self.price_cache:
                result[ts] = self.price_cache[ts]
            else:
                timestamps_to_fetch.append(ts)
                
        if not timestamps_to_fetch:
            return {ts: result.get(round_timestamp_to_minute(ts)) for ts in timestamps}
            
        # Get all available prices from database in a single query
        db_prices: List[SOLPrice] = self.repository.get_prices_by_timestamps(timestamps_to_fetch)

        # Map DB results by timestamp
        db_prices_map: Dict[int, float] = {price.timestamp: price.price for price in db_prices}
        
        # Determine which timestamps are still missing
        missing_timestamps: List[int] = [ts for ts in timestamps_to_fetch if ts not in db_prices_map]
        
        # Update result with what we found in the database
        for ts in timestamps_to_fetch:
            if ts in db_prices_map:
                result[ts] = db_prices_map[ts]
                self.price_cache[ts] = db_prices_map[ts]
        
        # Fetch remaining prices from API if needed
        if missing_timestamps:
            logger.info(f"Fetching {len(missing_timestamps)} missing SOL prices from API")
            api_prices: Dict[int, Optional[float]] = self._fetch_prices_from_api_batch(missing_timestamps)
            
            # Add API results to our result set
            for ts, price in api_prices.items():
                result[ts] = price
                self.price_cache[ts] = price
                
            # Save new prices to database for future use
            prices_to_save: List[Tuple[int, float]] = [(ts, price) for ts, price in api_prices.items() if price is not None]
            if prices_to_save:
                self._save_prices_to_database_batch(prices_to_save)
        
        # Map back to original timestamp requests
        return {ts: result.get(round_timestamp_to_minute(ts)) for ts in timestamps}
    
    def _fetch_price_from_api(self, timestamp: int) -> Optional[float]:
        """
        Fetch a single SOL price from Binance API.
        
        Args:
            timestamp: Unix timestamp in milliseconds (rounded to minute)
            
        Returns:
            The SOL price or None if not available
        """
        url: str = f"https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1m&startTime={timestamp}&limit=1"
        headers: Dict[str, str] = {"accept": "application/json"}
        
        try:
            response = _session.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Validate that we have sufficient data
            if not data or len(data) == 0 or len(data[0]) < 4:
                logger.warning(f"Insufficient data returned from Binance API for timestamp {timestamp}")
                return None
                
            # Calculate average of high and low price
            return (float(data[0][2]) + float(data[0][3])) / 2  # High and Low prices
            
        except requests.exceptions.Timeout:
            logger.error(f"Timeout error when fetching SOL price for timestamp {timestamp}")
            return None
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching SOL price from Binance API: {str(e)}")
            return None
        except (ValueError, IndexError, KeyError) as e:
            logger.error(f"Error parsing SOL price data: {str(e)}")
            return None
    
    def _fetch_prices_from_api_batch(self, timestamps: List[int]) -> Dict[int, Optional[float]]:
        """
        Fetch multiple SOL prices from Binance API, optimizing API calls.
        Groups adjacent timestamps to reduce number of API requests.
        
        Args:
            timestamps: List of Unix timestamps in milliseconds (rounded to minute)
            
        Returns:
            Dictionary mapping timestamps to prices (or None if not available)
        """
        result: Dict[int, Optional[float]] = {}
        sorted_timestamps: List[int] = sorted(timestamps)
        
        # Process in smaller batches to avoid too many API calls at once
        batch_size: int = 20
        for i in range(0, len(sorted_timestamps), batch_size):
            batch: List[int] = sorted_timestamps[i:i+batch_size]
            
            for ts in batch:
                # Make individual API calls for now
                # This could be optimized further to group adjacent timestamps
                price: Optional[float] = self._fetch_price_from_api(ts)
                result[ts] = price
        
        return result
    
    def _save_price_to_database(self, timestamp: int, price: float) -> None:
        """
        Save a single SOL price to the database.
        
        Args:
            timestamp: Unix timestamp in milliseconds
            price: SOL price
        """
        self.repository.bulk_set_prices([(timestamp, price)])
        
    def _save_prices_to_database_batch(self, prices: List[Tuple[int, float]]) -> None:
        """
        Save multiple SOL prices to the database in a single operation.
        
        Args:
            prices: List of tuples containing (timestamp, price)
        """
        self.repository.bulk_set_prices(prices)