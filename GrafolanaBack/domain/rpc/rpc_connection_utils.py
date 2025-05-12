import os
from dotenv import load_dotenv
from solana.rpc.api import Client

SOLANA_RPC_URL = os.getenv('SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com')

client = Client(SOLANA_RPC_URL)
