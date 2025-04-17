import requests
from GrafolanaBack.domain.transaction.config.constants import REFERENCE_COINS, USD_STABLE
from GrafolanaBack.domain.performance.timing_utils import timing_decorator
from GrafolanaBack.domain.caching.cache_utils import cache


@timing_decorator
@cache.memoize(name="utils.get_sol_price")
def get_sol_price(timestamp:int)-> float :
    url = f"https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1s&startTime={timestamp}&limit=1"

    headers = {"accept": "application/json"}
    response = requests.get(url, headers=headers)

    data = response.json();

    return (float(data[0][3]) + float(data[0][2]))/2

def get_token_price(mint: str, sol_price:float):
    price = None
    if mint in REFERENCE_COINS:
        if mint in USD_STABLE:
            price = 1
        else:
            price = sol_price
    return price