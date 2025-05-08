import os
from typing import Any, List
import requests
from dotenv import load_dotenv
SOLANA_RPC_URL = os.getenv("SOLANA_RPC_URL")

def get_block_signatures(slot: int) -> Any:
    """
    Fetch the block signatures from the RPC api for a given slot.
    
    Args:
        slot: The slot number to fetch the block for
    
    """
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
    url = SOLANA_RPC_URL
    headers = {"Content-Type": "application/json"}
    
    response = requests.post(url, headers=headers, data=request)
    # Check if the request was successful (status code 200)
    if response.status_code == 200:
        response_json = response.json()
        return response_json
    else:
        return None
        

def get_block_transactions(slot: int) -> Any:
    """
    Fetch the block from the RPC api for a given slot.

    Args:
        slot: The slot number to fetch the block for

    """
    request = f"""{{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getBlock",
        "params": [
        {slot},
        {{
            "encoding": "jsonParsed",
            "maxSupportedTransactionVersion": 0,
            "transactionDetails": "full",
            "rewards": false
        }}
        ]
    }}"""

    # Send the request to the Solana RPC API
    url = SOLANA_RPC_URL
    headers = {"Content-Type": "application/json"}

    response = requests.post(url, headers=headers, data=request)
    # Check if the request was successful (status code 200)
    if response.status_code == 200:
        response_json = response.json()
        return response_json
    else:
        return None