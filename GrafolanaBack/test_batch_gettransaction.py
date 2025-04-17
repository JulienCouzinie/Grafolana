import base64
from inspect import Signature
import os
from solders.transaction import Transaction
from solana.rpc.providers.http import HTTPProvider
from solders.rpc.requests import GetTransaction
from solders.rpc.config import RpcTransactionConfig
from solders.signature import Signature
from solders.rpc.responses import GetTransactionResp
from solders.solders import UiTransactionEncoding, CommitmentLevel
import unittest

class Test_Batch_GetTransaction(unittest.TestCase):
    def test_batch_gettransaction(self):

        SOLANA_RPC_URL = os.getenv('SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com')
        

        # List of transaction signatures
        transaction_signatures = [
            "4pXxP3KDEnKwHEMrrKpR3qhHmVczbTsjc51E2bHKt6vVH91xaC7bqBNLUGs4NTGXfQg9rXnVy4N8nocSurGF8Nwy",
            "UrTTY4hC2jc4BaAgG46jAkRPim1zpxyZyFmZn5wweBmg9jw6fZBeKsXDRLrMKbE5Dn5Vdx4qumyi6BAfrDj2sx4",
            "3J2GJwmTzj4Vtz7VaQ5zNqvEcu7A9jWQ3dU3xwGyETgrzD4hTxPWwMYFvbuGKRDNzcouTzdc226E6Gp936n19VC1"
        ]

        # Initialize HTTPProvider
        provider = HTTPProvider(SOLANA_RPC_URL)

        # Create a list to hold the GetTransaction request objects
        requests = []

        # Create GetTransaction requests with different configurations
        for i, sig_str in enumerate(transaction_signatures):
            signature = Signature.from_string(sig_str)
            config = RpcTransactionConfig(encoding=UiTransactionEncoding.JsonParsed, commitment=CommitmentLevel.Confirmed, max_supported_transaction_version = 0)
            requests.append(GetTransaction(signature, config))

        # Create a tuple of response parsers
        parsers = (GetTransactionResp,) * len(requests)

        # Send the batch request
        responses = provider.make_batch_request(tuple(requests), parsers)

        # Process the responses
        for i, response in enumerate(responses):
            print(f"Transaction {transaction_signatures[i]}:")
            if response.value:
                print(f"  Block Time: {response.value.block_time}")
                print(f"  Error: {response.value.transaction.meta.err}")
                # Process other transaction details as needed
            elif response.error:
                print(f"  Error: {response.error}")
            print("-" * 30)


if __name__ == '__main__':
    unittest.main()
