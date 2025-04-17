import base64
import struct
import sys
import base58
from no_cache_unit_test import NoCacheUnitTest
from datetime import datetime
from solana.rpc.api import Client
import unittest
from solders.pubkey import Pubkey
from solders import solders
from solana.rpc.types import TokenAccountOpts

from spl.token._layouts import ACCOUNT_LAYOUT
import json
from solders.transaction import Transaction


class Testscan_one_transaction(NoCacheUnitTest):

    def test_Moosell_unpack_amount_from_swap_instruction(self):
        data_str = "GRE1sAbjipDFeUZ13uFcLLwMqvY58xdqMxkQtAdHS9DJf"
        data_bytes = base58.b58decode(data_str)[8:]

        # Borsh format: u64 u64
        format_str = "<QQ"
        _, sol_amount = struct.unpack(format_str, data_bytes[:struct.calcsize(format_str)])

        print(sol_amount)

    def test_Moosell_2_unpack_amount_from_swap_instruction(self):
        data_str = "GRE1sAbjipDHCYCYJcUQ7qc2ytE97NL1RaQMmkBGNaV1y"
        data_bytes = base58.b58decode(data_str)[8:]

        # Borsh format: u64 u64
        format_str = "<QQQ"
        _, _, sol_amount = struct.unpack(format_str, data_bytes[:struct.calcsize(format_str)])

        print(sol_amount)

#     def test_ALDRIN_AMM(self):
#         """
#         Test to parse a ALDRIN_AMM trade
#         """
#         expected = "{'block_time': 1739633728, 'tx_id': '3XLygWhWXvbrCwPuWhz5mKmAeW3cUQpB76TieArdWUJwc7idTtPQffLwUHXP23k5Qsy2WaDoA4Udi5qzBwPvqk55', 'signer': 'CiW6tXBaqtStvuPfV2aYgMe6FjnzGSQcXwfiHEEG4iiX', 'base_mint': 'C3CaTn76eULsjXEKEpuJLwTVT28WXvHu3FJxRbGjpump', 'quote_mint': 'SOL', 'base_amount': 0.00203928, 'quote_amount': 32335500, 'txn_fee': 5000, 'signer_sol_change': -32335500, 'trade_type': 'buy', 'base_price_usd': 45190545192.42085, 'quote_price_usd': 2.85, 'base_mint_decimal': 6, 'quote_mint_decimal': 9}"
#         trades = transaction_parser.scan_one_transaction("65pabiNgXih5WnXBLyR3cfdx4c7SfSpF45ou8W2azry7rQVKxZx8N4wkhx8jccdkJooJDtMFhM5byKEYFfuSQg2j")
#         print(trades[0].to_dict())
#         self.assertEqual(str(trades[0].to_dict()), expected)

    

#     def test_parseTransaction(self):
#         trades = transaction_parser.scan_one_transaction("2E6CJYhu4eytdfSS2Ju4GJ2TsCn3LAnJT8LmqYLpb87fuMhhX37nV2GN2WDTBXrYYoK42Siw9htYceS3B6WhRiMc") # Pumpfun SELL with missing transfer
#         print(trades[0].to_dict())


#     def test_pumpfunBuy(self):
#         """
#         Test to parse a pumpfunBuy
#         """
#         expected = "{'block_time': 1739633728000, 'tx_id': '3XLygWhWXvbrCwPuWhz5mKmAeW3cUQpB76TieArdWUJwc7idTtPQffLwUHXP23k5Qsy2WaDoA4Udi5qzBwPvqk55', 'signer': 'CiW6tXBaqtStvuPfV2aYgMe6FjnzGSQcXwfiHEEG4iiX', 'base_mint': 'C3CaTn76eULsjXEKEpuJLwTVT28WXvHu3FJxRbGjpump', 'quote_mint': 'SOL', 'base_amount': 0.00203928, 'quote_amount': 32335500, 'txn_fee': 5000, 'signer_sol_change': -32335500, 'trade_type': 'buy', 'base_price_usd': 3076762592679.769, 'quote_price_usd': 194.04, 'base_mint_decimal': 6, 'quote_mint_decimal': 9}"
#         #trades = trade_parser.scan_one_transaction("3XLygWhWXvbrCwPuWhz5mKmAeW3cUQpB76TieArdWUJwc7idTtPQffLwUHXP23k5Qsy2WaDoA4Udi5qzBwPvqk55")
#         #trades = trade_parser.scan_one_transaction("3rmNHJPWyudJMbnxrWM7Dm31F6GvzDNee9ADKWbPqbzB511SDmWJtDRqFwr4BQSXvyxGSXZxhanokfduQcXiiiM") # Pumpfun SELL With missing transfer
#         #trades = trade_parser.scan_one_transaction("4pXxP3KDEnKwHEMrrKpR3qhHmVczbTsjc51E2bHKt6vVH91xaC7bqBNLUGs4NTGXfQg9rXnVy4N8nocSurGF8Nwy")
#         #trades = trade_parser.scan_one_transaction("UrTTY4hC2jc4BaAgG46jAkRPim1zpxyZyFmZn5wweBmg9jw6fZBeKsXDRLrMKbE5Dn5Vdx4qumyi6BAfrDj2sx4") # Withdraw intruction
#         #trades = trade_parser.scan_one_transaction("3J2GJwmTzj4Vtz7VaQ5zNqvEcu7A9jWQ3dU3xwGyETgrzD4hTxPWwMYFvbuGKRDNzcouTzdc226E6Gp936n19VC1") # Pumpfun SELL with missing transfer
#         #trades = trade_parser.scan_one_transaction("3vzGCmAaLkCBMm2Yk6jNyyWeApcd7YBevTRwWKEUeRZG2KeVYw3NE3pmMBbzY7CMqEZf9MgPJG8qXbHzdqC5A8iu", "EQyYgCnwwZxuh3SfnrFBEiFqDUUSfpqiDorf66eqdEcz") # Pumpfun SELL with missing transfer
#         #trades = trade_parser.scan_one_transaction("4RpgaGrGQxxumRBahJB2faJ8ipymcdw32QnJTeay3a4gfrurcskYNtqGXX9aeTgF4g1vafpQQS7WhFXDaRgcouGR", "EQyYgCnwwZxuh3SfnrFBEiFqDUUSfpqiDorf66eqdEcz") # The Fish
#         #trades = trade_parser.scan_one_transaction("4f92pMpvWjiobvh4uF1xkJPZ44THiDXNaSd1Mt2j2RXV5jZaUJfJMiPNPbvsmythHhG6fEZKhYapkCpWc9MEXeZF", "EQyYgCnwwZxuh3SfnrFBEiFqDUUSfpqiDorf66eqdEcz") # The Fish
        
#         # GOOD for Forensic: Has many layers of funding and obfuscations throught null transactions that buy and sell the same token.
#         # Funding analysis reveal wallets linked to token creation on PumpFun
#         # 3buz2ZUyaxdASienvPnTT5mPv5yEA9T6cwKHWG87F1wxJtB7pDY4vz8X9XFEqjhFBrfTr9XNS7Gzi6SxU7YfPzSe BUY & SELL on PUMPFUN in same transaction with 2 signers
        
#         # 0 token transfer :
#         # 4gNdy437KhqfH7jh34agib5yYgzWvqtBYtJTW6Zr2bhkS3Kcv8ZjWk11hwyegMNfrXcFGoTxnAVDQZHBQ6ebRtYP
        
#         trades = transaction_parser.scan_one_transaction("2E6CJYhu4eytdfSS2Ju4GJ2TsCn3LAnJT8LmqYLpb87fuMhhX37nV2GN2WDTBXrYYoK42Siw9htYceS3B6WhRiMc", "EQyYgCnwwZxuh3SfnrFBEiFqDUUSfpqiDorf66eqdEcz") # Pumpfun SELL with missing transfer
#         #

#         print(trades[0].to_dict())
#         self.assertEqual(str(trades[0].to_dict()), expected)

#     def test_pumpfunSell(self):
#         """
#         Test to parse a pumpfunBuy
#         """
#         expected = "{'block_time': 1739633793000, 'tx_id': '2TfBN19teJwnwvSqbN3dyy82y7iMLxVJRy2xuu6bHvwpSW1iJ2tHg9yE66wMUSf8RBtPin9oAS4kvyUL7K9vLu9R', 'signer': 'CiW6tXBaqtStvuPfV2aYgMe6FjnzGSQcXwfiHEEG4iiX', 'base_mint': 'C3CaTn76eULsjXEKEpuJLwTVT28WXvHu3FJxRbGjpump', 'quote_mint': 'SOL', 'base_amount': 207002.907043, 'quote_amount': 33790244, 'txn_fee': 5000, 'signer_sol_change': 33790244, 'trade_type': 'sell', 'base_price_usd': 31742.79502690781, 'quote_price_usd': 194.46, 'base_mint_decimal': 6, 'quote_mint_decimal': 9}"
#         trades = transaction_parser.scan_one_transaction("2TfBN19teJwnwvSqbN3dyy82y7iMLxVJRy2xuu6bHvwpSW1iJ2tHg9yE66wMUSf8RBtPin9oAS4kvyUL7K9vLu9R")
#         print(trades[0].to_dict())
#         self.assertEqual(str(trades[0].to_dict()), expected)

#     def test_accountOWer(self):
#         # Initialize Solana client (Mainnet)
#         api_mainnet = "https://serene-omniscient-pine.solana-mainnet.quiknode.pro/237ced2cfac7e190db7119d5536660c71b57de48"
#         client = Client(api_mainnet)
        
#         # Define the ATA address
#         ata_address = Pubkey.from_string("3rBnnH9TTgd3xwu48rnzGsaQkSr1hR64nY71DrDt6VrQ")

#         # Fetch account info
#         account_info = client.get_account_info(ata_address)

#         if account_info.value is None:
#             print("Account not found")
#         else:
#             # Print the program owner (Token-2022 Program)
#             print("Program owner:", str(account_info.value.owner))

#             # Parse the token account data
#             data = account_info.value.data
#             token_account = ACCOUNT_LAYOUT.parse(data)

#             # Get the wallet address (token owner)
#             wallet_owner = Pubkey(token_account.owner)
#             print("Wallet address that owns the tokens:", str(wallet_owner))


#         # ata = solders.get_associated_token_address(Pubkey.from_string("CiW6tXBaqtStvuPfV2aYgMe6FjnzGSQcXwfiHEEG4iiX"),Pubkey.from_string("C3CaTn76eULsjXEKEpuJLwTVT28WXvHu3FJxRbGjpump"))
#         # print("ata", ata )

#         # ata_wsol = solders.get_associated_token_address(Pubkey.from_string("CiW6tXBaqtStvuPfV2aYgMe6FjnzGSQcXwfiHEEG4iiX"),Pubkey.from_string("So11111111111111111111111111111111111111112"))
#         # print("ata_wsol", ata_wsol )

#         # self.assertEqual(True,True)
#         # print("decode_discriminator", decode_discriminator("3Bxs4V29TRbhESfR",8))
        
#         # print("decode_discriminator", decode_discriminator("3Bxs43etfb29GdcB",8))

#         # data = "3Bxs4V29TRbhESfR"


#         # data = base58.b58decode(data)  # 0290d0030000000000000000
#         # layout = TransferLayout.deserialize(data[4:])
#         # print(layout.amount)


#     def test_pumpfun_unpack_amount_from_event(self):
#         data_str = "2K7nL28PxCW8ejnyCeuMpbXwCiL4Ac7bmuFoPE56ZFnwXrpWrunAyXa1pmpjMw1dSAQ5saSWDhRhr9ZmTycPXTu2AqNpkLR4RwAy2FNUTwaA1kXe77kN9deh8LAJKWaGU4BJExEyaMuqGqgHgM3xyPdU9HMNk9mEkCwk9hDMymDEsjfncs1UVMmPcrST"
#         data_bytes = base58.b58decode(data_str)

#         # Borsh format: 16s 32s Q Q ? 32s q Q Q Q Q (137 bytes)
#         format_str = "<48sQ"
#         _, sol_amount = struct.unpack(format_str, data_bytes)

#         print(sol_amount)


#     def test_pumpfun_unpack_amount_from_event(self):
#         data_str = "2K7nL28PxCW8ejnyCeuMpbXwCiL4Ac7bmuFoPE56ZFnwXrpWrunAyXa1pmpjMw1dSAQ5saSWDhRhr9ZmTycPXTu2AqNpkLR4RwAy2FNUTwaA1kXe77kN9deh8LAJKWaGU4BJExEyaMuqGqgHgM3xyPdU9HMNk9mEkCwk9hDMymDEsjfncs1UVMmPcrST"
#         data_bytes = base58.b58decode(data_str)

#         # Borsh format: 16s 32s Q Q ? 32s q Q Q Q Q (137 bytes)
#         format_str = "<48sQ"
#         _, sol_amount = struct.unpack(format_str, data_bytes[:struct.calcsize(format_str)])

#         print(sol_amount)

#     def test_worst_transaction_with_graph(self):
#         graph = transaction_parser.get_transaction_graph_data("3vzGCmAaLkCBMm2Yk6jNyyWeApcd7YBevTRwWKEUeRZG2KeVYw3NE3pmMBbzY7CMqEZf9MgPJG8qXbHzdqC5A8iu", "EQyYgCnwwZxuh3SfnrFBEiFqDUUSfpqiDorf66eqdEcz") # Pumpfun SELL with missing transfer


#         print(graph)
        

# if __name__ == '__main__':
#     unittest.main()
