import base64
from solders.transaction import Transaction
from GrafolanaBack.domain.transaction.services.transaction_parser_service import TransactionParserService
import unittest

from no_cache_unit_test import NoCacheUnitTest
from GrafolanaBack.domain.performance.timing_utils import TimingStats

from GrafolanaBack.domain.rpc.rpc_connection_utils import client
import requests

import logging
logger = logging.getLogger(__name__)

class Test_Get_Graph_Data(NoCacheUnitTest):
    def test_get_block_rpcapi(self):
        block = client.get_block(
            slot=326988552,
            max_supported_transaction_version=0, 
            encoding="jsonParsed")
        
        pass

    def test_get_block_request(self):
        slot=326988552
        request = f"""{{
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBlock",
            "params": [
            {slot},
            {{
                "encoding": "jsonParsed",
                "maxSupportedTransactionVersion": 0,
                "transactionDetails": "signatures",
                "rewards": false
            }}
            ]
        }}"""

        # Send the request to the Solana RPC API
        url = "https://api.mainnet-beta.solana.com"
        headers = {"Content-Type": "application/json"}

        response = requests.post(url, headers=headers, data=request)
        # Check if the request was successful (status code 200)
        if response.status_code == 200:
            print("Request was successful!")
        else:
            print(f"Request failed with status code: {response.status_code}")

        response_json = response.json()
        print(response_json)

        


if __name__ == '__main__':
    unittest.main()
