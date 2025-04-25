import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from GrafolanaBack.domain.transaction.config.constants import REFERENCE_COINS, USD_STABLE
from GrafolanaBack.domain.performance.timing_utils import timing_decorator
from GrafolanaBack.domain.caching.cache_utils import cache
from GrafolanaBack.domain.logging.logging import logger

# Create a persistent session for reuse
_session = requests.Session()

# Configure connection pooling and retry logic
retry_strategy = Retry(
    total=3,  # Maximum number of retries
    backoff_factor=0.3,  # Backoff factor for retries
    status_forcelist=[500, 502, 503, 504],  # Status codes that should trigger a retry
    allowed_methods=["GET"]  # HTTP methods that should be retried
)

# Configure the adapter with connection pooling
adapter = HTTPAdapter(
    max_retries=retry_strategy,
    pool_connections=10,  # Number of connection pools to cache
    pool_maxsize=10  # Maximum number of connections to save in the pool
)

# Apply the adapter to the session
_session.mount("http://", adapter)
_session.mount("https://", adapter)


# @timing_decorator
@cache.memoize(name="utils.get_sol_price")
def get_sol_price(timestamp:int)-> float:
    """
    Get SOL price at a specific timestamp from Binance API.
    
    Args:
        timestamp: Unix timestamp in milliseconds
        
    Returns:
        Average of high and low price for the given timestamp
    """
    url = f"https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1s&startTime={timestamp}&limit=1"
    headers = {"accept": "application/json"}
    
    try:
        # Trying to time the request to the Binance API
        # get current time in milliseconds
        now = int(time.monotonic() * 1000)
        # Use persistent session instead of creating a new connection each time
        response = _session.get(url, headers=headers, timeout=5)
        timeittook = int(time.monotonic() * 1000) - now
        logger.info(f"Time taken to fetch SOL price: {timeittook} ms")

        response.raise_for_status()  # Raise exception for 4XX/5XX responses
        
        data = response.json()
        
        # Validate that we have enough data
        if not data or len(data) == 0 or len(data[0]) < 4:
            logger.warning(f"Insufficient data returned from Binance API for timestamp {timestamp}")
            return None
            
        # Calculate average of high and low price
        return (float(data[0][3]) + float(data[0][2])) / 2
        
    except requests.exceptions.Timeout:
        logger.error(f"Timeout error when fetching SOL price for timestamp {timestamp}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching SOL price from Binance API: {str(e)}")
        return None
    except (ValueError, IndexError, KeyError) as e:
        logger.error(f"Error parsing SOL price data: {str(e)}")
        return None

def get_token_price(mint: str, sol_price:float):
    price = None
    if mint in REFERENCE_COINS:
        if mint in USD_STABLE:
            price = 1
        else:
            price = sol_price
    return price