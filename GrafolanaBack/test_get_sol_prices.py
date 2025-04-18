import base64
import time
from solders.transaction import Transaction
from GrafolanaBack.domain.transaction.services.transaction_parser_service import TransactionParserService
import unittest

from no_cache_unit_test import NoCacheUnitTest
from GrafolanaBack.domain.performance.timing_utils import TimingStats

from GrafolanaBack.domain.rpc.rpc_connection_utils import client
import requests

import logging
logger = logging.getLogger(__name__)

class Test_Get_Sol_Prices(NoCacheUnitTest):
    def test_get_sol_price(self):
        #get now time in milliseconds
        now = int(time.time() * 1000) - 1*60*60*1000 # 1 hour ago
        twentydaysago = now - 20*24*60*60*1000

        url = f"https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1m&startTime={twentydaysago}&endTime={now}&limit=1000"
        
        print(url)
        headers = {"accept": "application/json"}
        response = requests.get(url, headers=headers)

        data = response.json();

        print(data)

        


if __name__ == '__main__':
    unittest.main()
