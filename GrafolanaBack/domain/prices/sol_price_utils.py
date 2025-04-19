import time
import atexit
import requests
import os
import tempfile
import sys
import portalocker  # Cross-platform file locking
from sqlalchemy.orm import Session
from typing import Dict, List, Tuple, Optional

from GrafolanaBack.domain.prices.models import SOLPrice
from GrafolanaBack.domain.prices.repository import SOLPriceRepository
from GrafolanaBack.domain.infrastructure.db.session import get_session
from GrafolanaBack.domain.logging.logging import logger

# Create a persistent session for reuse
_session = requests.Session()


def round_timestamp_to_minute(timestamp: int) -> int:
    """
    Round timestamp to the nearest minute.
    
    Args:
        timestamp: Unix timestamp in milliseconds
        
    Returns:
        Rounded timestamp in milliseconds
    """
    # Convert to seconds and round down to the nearest minute
    timestamp_seconds = timestamp // 1000
    rounded_seconds = (timestamp_seconds // 60) * 60
    # Convert back to milliseconds
    return rounded_seconds * 1000


def fetch_sol_price_batch(start_time: int, end_time: int) -> List[Tuple[int, float]]:
    """
    Fetch a batch of SOL prices from Binance API.
    
    Args:
        start_time: Start timestamp in milliseconds
        end_time: End timestamp in milliseconds
        
    Returns:
        List of tuples containing (timestamp, price)
    """
    url = f"https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1m&startTime={start_time}&endTime={end_time}&limit=1000"
    headers = {"accept": "application/json"}
    
    try:
        response = _session.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        klines = response.json()
        prices = []
        
        for kline in klines:
            # Calculate average of high and low price
            avg_price = (float(kline[2]) + float(kline[3])) / 2  # High and Low prices
            timestamp = int(kline[0])  # Open time
            prices.append((timestamp, avg_price))
            
        return prices
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching SOL prices from Binance API: {str(e)}")
        return []


def populate_sol_prices() -> None:
    """
    Populate the database with SOL prices.
    Automatically determines the appropriate starting point:
    - If the database has existing prices, starts from the minute after the most recent price
    - If no prices exist, populates data for the past 4 years
    
    Ensures no duplicate timestamps are inserted.
    """
    sol_price_repo = SOLPriceRepository()
    
    # Get current time and round to minute
    now = int(time.time() * 1000)
    now_rounded = round_timestamp_to_minute(now)
    
    # Check for the most recent price in the database
    latest_price = sol_price_repo.get_latest_price()
    
    one_minute = 60 * 1000
    
    if latest_price is None:
        # No prices in database, start from 4 years ago
        logger.info("No SOL prices found in database. Populating from scratch (last 4 years).")
        timestamp_from_rounded = now_rounded - (4 * 365 * 24 * 60 * 60 * 1000)
    else:
        # Start from the minute after the most recent price
        latest_timestamp = latest_price.timestamp
        timestamp_from_rounded = round_timestamp_to_minute(latest_timestamp) + one_minute
        logger.debug(f"Found existing prices. Continuing from timestamp {timestamp_from_rounded} (minute after latest record).")
    
    # Skip if already up to date
    if timestamp_from_rounded >= now_rounded:
        logger.info(f"SOL prices are already up to date (latest: {timestamp_from_rounded}, now: {now_rounded}).")
        return
    
    thousand_minutes = one_minute * 1000
    
    start_time = timestamp_from_rounded
    end_time = min(start_time + thousand_minutes, now_rounded)
    
    batch_prices = []
    total_fetched = 0
    
    logger.info(f"Starting to populate SOL prices from {start_time} to {now_rounded}")
    
    while start_time < now_rounded:
        prices = fetch_sol_price_batch(start_time, end_time)
        
        if prices:
            batch_prices.extend(prices)
            total_fetched += len(prices)
            
            # Bulk save every 10,000 prices to avoid memory issues
            if len(batch_prices) >= 10000:
                logger.debug(f"Saving batch of {len(batch_prices)} SOL prices")
                sol_price_repo.bulk_set_prices(batch_prices)
                batch_prices = []
        
        # Move to the next time window
        start_time = end_time + 1
        end_time = min(start_time + thousand_minutes, now_rounded)
    
    # Save any remaining prices
    if batch_prices:
        logger.debug(f"Saving final batch of {len(batch_prices)} SOL prices")
        sol_price_repo.bulk_set_prices(batch_prices)
    
    logger.info(f"Completed populating SOL prices. Total fetched: {total_fetched}")


def update_sol_prices_task() -> None:
    """
    Task to update SOL prices by fetching the most recent data.
    
    Calls populate_sol_prices which automatically determines
    the correct starting point based on existing data.
    """
    try:
        logger.info("Running SOL price update task")
        populate_sol_prices()
    except Exception as e:
        logger.error(f"Error in SOL price update task: {str(e)}")


def start_price_updater() -> None:
    """
    Start the background task to update SOL prices periodically.
    Ensures only one instance runs even when Flask reloads in debug mode.
    
    Uses a cross-platform file lock to prevent multiple instances.
    """
    # Create a lock file path in the temporary directory
    lock_file = os.path.join(tempfile.gettempdir(), 'sol_price_updater.lock')
    lock_handle = None
    
    try:
        # Try to obtain a file lock (non-blocking) using portalocker (cross-platform)
        lock_handle = open(lock_file, 'w')
        try:
            portalocker.lock(lock_handle, portalocker.LOCK_EX | portalocker.LOCK_NB)
        except portalocker.exceptions.LockException:
            logger.debug("SOL price updater is already running in another process")
            return
        
        # We got the lock, proceed with starting the scheduler
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
        except ImportError:
            logger.error("APScheduler package is required. Install with 'pip install apscheduler'")
            sys.exit(1)
        
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            func=lambda: update_sol_prices_task(),
            trigger="interval",
            minutes=1,
            id='sol_price_updater'
        )
        
        logger.info("Starting SOL price updater scheduler")
        scheduler.start()
        
        # When the process exits, release the lock file and shut down scheduler
        def cleanup() -> None:
            logger.info("Shutting down SOL price updater scheduler")
            scheduler.shutdown()
            if lock_handle:
                try:
                    portalocker.unlock(lock_handle)
                except:
                    pass
                lock_handle.close()
                try:
                    os.remove(lock_file)
                except OSError:
                    pass
        
        atexit.register(cleanup)
        
        # Store the lock handle to prevent garbage collection
        # which would release the lock
        # pylint: disable=unused-variable
        _lock_handle = lock_handle
        
    except Exception as e:
        logger.error(f"Error starting SOL price updater: {str(e)}")
        if lock_handle:
            lock_handle.close()