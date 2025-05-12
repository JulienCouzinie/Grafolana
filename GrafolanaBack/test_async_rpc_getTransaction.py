import base64
from typing import Any, Dict, Optional
from solders.transaction import Transaction
from GrafolanaBack.domain.transaction.services.transaction_parser_service import TransactionParserService
from GrafolanaBack.domain.performance.timing_utils import TimingStats
from GrafolanaBack.domain.rpc.rpc_acync_transaction_fetcher import fetcher

from solders.signature import Signature
import unittest


from no_cache_unit_test import NoCacheUnitTest


import logging
logger = logging.getLogger(__name__)

class Test_Get_Graph_Data(NoCacheUnitTest):
    

    def test_simple_callback(self):
        # --- Define a callback that sometimes transforms the result ---
        def transforming_callback(signature: Signature, result: Optional[Any], error: Optional[Exception]) -> Optional[Dict]:
            
            if error:
                print(f"Callback received ERROR for {str(signature)[:10]}: {type(error).__name__}")
                # Don't return anything for errors, the error object will be stored
                return None 
            elif result:
                slot = getattr(result, 'slot', 'N/A')
                # Example transformation: Only return a small dict if slot > certain number
                if isinstance(slot, int) and slot > 250_000_000: # Example threshold
                    print(f"Callback transforming result for {str(signature)[:10]} (Slot {slot})")
                    return {
                        "sig": str(signature),
                        "processed_slot": slot,
                        "block_time": getattr(result, 'block_time', None)
                    }
                else:
                    print(f"Callback received valid result for {str(signature)[:10]} (Slot {slot}), returning None (use original).")
                    # Return None explicitly or implicitly to use the original result.value
                    return None
            else:
                print(f"Callback received for {str(signature)[:10]}: No result and no error")
                return None # Return None if no result/error

        TimingStats.enable()  # Enable timing for tests

        # Clear previous stats
        TimingStats().clear()

        print("Starting Solana RPC Transaction Fetcher...")

        # Example transaction signatures (use recent ones)
        example_sigs_str = [
            # Replace with actual recent signatures for testing
            "4pXxP3KDEnKwHEMrrKpR3qhHmVczbTsjc51E2bHKt6vVH91xaC7bqBNLUGs4NTGXfQg9rXnVy4N8nocSurGF8Nwy",
            #"UrTTY4hC2jc4BaAgG46jAkRPim1zpxyZyFmZn5wweBmg9jw6fZBeKsXDRLrMKbE5Dn5Vdx4qumyi6BAfrDj2sx4",
            #"3J2GJwmTzj4Vtz7VaQ5zNqvEcu7A9jWQ3dU3xwGyETgrzD4hTxPWwMYFvbuGKRDNzcouTzdc226E6Gp936n19VC1"
            # Add a signature likely to succeed (find one on an explorer)
            # Add a signature likely to be not found (very old or fake)
        ]
        

        # --- Call the main function ---
        print(f"\nFetching {len(example_sigs_str)} transactions...")
        try:
            #start_run_time = time.time()
            all_results = fetcher.getMultipleTransactions(example_sigs_str, result_callback=transforming_callback)
            #end_run_time = time.time()
            
            #print(f"\n--- Finished fetching in {end_run_time - start_run_time:.2f} seconds ---")

            # --- Process final aggregated results ---
            success_count = 0
            error_count = 0
            transformed_count = 0
            print("\n--- Final Results Summary ---")
            for sig, res_or_err in all_results.items():
                if isinstance(res_or_err, Exception):
                    print(f"Signature {str(sig)} -> ERROR: {type(res_or_err).__name__} - {res_or_err}")
                    error_count += 1
                elif res_or_err is None: # Explicit check for None, which might mean not found by RPC
                    print(f"Signature {str(sig)} -> ERROR: Transaction not found or RPC returned null value.")
                    error_count += 1
                # Check if it's our transformed result (a dict in this example)
                elif isinstance(res_or_err, dict) and "processed_slot" in res_or_err:
                    print(f"Signature {str(sig)} -> TRANSFORMED: {res_or_err}")
                    transformed_count += 1
                else:
                    # It must be the original TransactionResponse object's value
                    slot = getattr(res_or_err, 'slot', 'N/A')
                    print(f"Signature {str(sig)} -> SUCCESS (Original Result, Slot: {slot})")
                    success_count += 1
                    
            print(f"\nSummary: {success_count} successful (original), {transformed_count} successful (transformed), {error_count} errors.")

        except ValueError as e:
            print(f"\nConfiguration or Input Error: {e}")
        except Exception as e:
            print(f"\nAn unexpected error occurred during execution: {e}")


        # Get timing statistics
        stats = TimingStats().get_stats()

        TimingStats.disable()  # Disable timing after tests

        # Log or print the results
        logger.info("Performance Analysis:")
        for func_name, metrics in stats.items():
            logger.info(f"\n{func_name}:")
            logger.info(f"  Average time: {metrics['avg_time']:.4f}s")
            logger.info(f"  Min time: {metrics['min_time']:.4f}s")
            logger.info(f"  Max time: {metrics['max_time']:.4f}s")
            logger.info(f"  Total calls: {metrics['total_calls']}")
            logger.info(f"  Total time: {metrics['total_time']:.4f}s")
            
    def test_old_get_graph_data(self):
        TimingStats.enable()  # Enable timing for tests

        # Clear previous stats
        TimingStats().clear()

        print("Starting Solana RPC Transaction Fetcher...")

        # Example transaction signatures (use recent ones)
        example_sigs_str = [
            "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",
        ]
        

        # --- Call the main function ---
        print(f"\nFetching {len(example_sigs_str)} transactions...")
        try:
            transaction_service = TransactionParserService()

            all_results = fetcher.getMultipleTransactions(example_sigs_str, result_callback=transaction_service.parse_and_get_graph_data)
            
            #print("all_results:", all_results)
        except ValueError as e:
            print(f"\nConfiguration or Input Error: {e}")
        except Exception as e:
            print(f"\nAn unexpected error occurred during execution: {e}")

        # Get timing statistics
        stats = TimingStats().get_stats()

        TimingStats.disable()  # Disable timing after tests

        # Log or print the results
        logger.info("Performance Analysis:")
        for func_name, metrics in stats.items():
            logger.info(f"\n{func_name}:")
            logger.info(f"  Average time: {metrics['avg_time']:.4f}s")
            logger.info(f"  Min time: {metrics['min_time']:.4f}s")
            logger.info(f"  Max time: {metrics['max_time']:.4f}s")
            logger.info(f"  Total calls: {metrics['total_calls']}")
            logger.info(f"  Total time: {metrics['total_time']:.4f}s")

    
    def test_get_graph_data(self):
        TimingStats.enable()  # Enable timing for tests

        # Clear previous stats
        TimingStats().clear()

        print("Starting Solana RPC Transaction Fetcher...")

        # Example transaction signatures (use recent ones)
        example_sigs_str = [
            "3a3vYjDBtRiuBGuAtgkKrUQchyvBVj2RrVmEACsgh3v28bRCnxWEp5nRnwbhjL1JJn1BBJoTHXsu5rTrebHS3xZg",
            # "2BBC6RmXS79ts8ASoBfo6WFMZuzk6cTYrnHvpivgNaow5uPsiugGZcHvXHkqDbWtmxkBQ9G6Fd11Wf512U3r5rqS",
            # "5KMLH9goCiGN5HYakT12rgRKBjpe6tD5GENRp8anUSYs7KPzwRN4u2jGHdxCqBeaTvyz7b73PeK55YgzUB8etkLD",
            # "5bPYd9X3yJVj2AGdpyP2iJAiZg2xBSDr1sNfGqKmsH9gVxtVSBHtuuK2ifN9WmbWpFn57sL7Bu4h4Aza1LX7PRs9",
            # "2JqazFAKgJ2KiBUVpdppBWzyaepLQwwj6QhicBRPpMjL6AHReh3PW5hMMx7H4mtWNNW1fAx5QLWAnP4zaSMPKvzu",
            # "4BqEkv6QSAunN5wTqmNb7NPDZjNKzFNQyKmGFirNHeRYQZQsrG8ZTkphXJnpb9Karoo4wDxAuynt37H3naexHfuQ",
            # "3jVje7tYkMDwuWjV98mSYpSh8ibiiGaD6QpKVPjSrHFZAjUv1DezKmrwqiU719u1QJGqFmzve3o5hmATuzexymUe",
            # "5KGuMYoXwHtsAepU2yGs7DJv869VCiYGcNHFfFdZUcrDYx4WR4ijkKcqXswXBVerQoF5c5LsP6YQs36cVfTZSRx",
            # "3H4DFmGjMsaDLgz19QQvXCcdxvpUxAZLKTPaKQnrkHVYadTcw6uKjhf6J6ZR8xVA9wxyHXbmAg4VNuqepaiVtWyn",
            # "3MoaqhmJ3UbAhaUxLpkJ9eEKovhiof3tez3SNeJHvAeU47U6L6zL2vevmRQrDbnXsieLsBaspeSRVK79ikDx5xiy",
            # "2vCpX7LYDR8kEKwCt4wLW97C7gc7JYW1pG9HUTrJBSwJDFzpg7bksd5gsmbuzXN5u8f6qJcz6aKQhZrXEaKpq9wz",
            # "4SZUqfEhtATSK5iYPwoDCUAJnZ9ghCZ9FzzwvCLMoWjru64CRLdKNv9y2GmfgNq4EPH7gxX5LG12WxhkLEVm6CWc",
            # "5KcL4nWuGVQtEjaF89meax75jp7Jm6vcT7sX3wUUnKzwLPHgwHDtmY4c8zFc37w9ZnfDFRMTqfeYdfT4dgPaVNEz",
            # "3t6SwiHeHgu1UoTChUEMnuwbWeUbPU3kANrCkFwpUZVzk4ddqxDVqxRFXwmPXe7vjBrKX8UarazqSVUEmFn4QSYF",
            # "25834aMPoQHbyo3Mg8cHVqudkZTyqBfy8d5knpiKV4CQLRwrbAMbrfTbYGQ1w8eZZKDnzQsFoH7HQCkE6GD8Qn9a",
            # "5UB6fxXwKhokTu6HHcRUEcHGWktYGEgyMFsC6jwXyeyproXHG1nUqqK9Hzca2zaXrA2eaZjcuiCotUrVVFxXgbsT",
            # "4SLxFXUkfjs6MjBGL8uaCb8eAHt8wJnPuEmXAt9WxFPVn13y966yJRA7UAumhD4FQ9SNE7y9dZPLSsmAjYuvvubp",
            # "6RxVwyaxjUBPR2MgNeeJfYSbwXQUN7vqiu4CWX6epi981K4R2oKsUKPNXzQF9GiAtbW5kT3WSye1iWMNzQmmBkc",
            # "qEGuc8LGKh3XM3CZRL7i5wrtrrqgyC19RVjWhQjqUBbVFbFCMJscFUduY1k8WytUsPGm7RJx2BmX3Qcvvb4fUh9",
            # "2jKge7VfKeW2qvzHRY3cg1gCQgwUD346WKaCATYwsEushKTxFay3rpXgBaN3ZEXEKTATsRx2xGBJjnAYgovkwfsX",
            # "3yzVemfXT8DKsQTntFv9pRFVZ468TojqwTrWzhxhPJXNoFSXDQpPNRLJkqDQvUNSsAez4ti4yto1GdDRD7qVBDM1",
            # "3M7V5JXfBMzJPsdmnJb6Sb2e7PU5UFGA1Pxr9PJJE7ReQS6UfziJhgYWu2BJ2fMCCJbFu5N5MmQ3HX33mLYCKuPc",
            # "AYmG4J1HoDsi6Q6xLY5Q5kbLo2S57uQHwac3bjwzjkoj8L9ZCrgBtK51qTzjbekp8v7XJJacJbNFrx2xn4tT3uV",
            # "5dGQosTBBDpNJFSkDBzraDRmXbqDd5gFseSbQu5EgHKCB3RXk4eVbtPvQMuwouegVfLoPG29xBHpVaMUk9F9pZib",
            # "Q6QVH8HYr4UUnShnkHYAj9H1XRWyQ8c48ugoRi1wAp6cBqFpgjdqucDDxLtJGuQFAKwtorwFdopV5YdKuMrfkLs",
            # "FmKoJ8r3EsJr6v3pVqeuKFRNnwDnQGq4KypWotfFi5h6oJiVQn8AttvTHviohKxPtZZ5NrNQfDPmWxvNdKFSmUz",
            # "TinxTMpxWu3iu8Ks2H5br2THFAB8qSm7BNNHBnQJ8P3cEnVzFhuTjv2E6dse6wtiEBiCymJRQhANzRcsCfjARAJ",
            # "2H9TfS9sxBba5knGmk8jBsTbDGZPRhDLQuESwcCXb6yGN8yRzPRL2Qcw8KtPfzCEgqRYNXiTsGP2twijLJHTKvBT",
            # "5myRXN6jfmcpFw27A9ayJ7xizUTYx1Pj8HQR4NNHcSEiddCEyMJ9Q2JmbVH9YjLzyDfrmUozksqnVgVwXqSMAKYo",
            # "5y2Uwe5EJ8YBQkDyPetqsZCReVGUr5KK6CYjfkyBkoVAhiHMahJCCQiJdKMdpAPMdFnwmJMrHqn3XAbu2scTRdpR",
            # "27bRvyudiz1vZgxhfa8a7nksaW3ddF7Zdx3PLU8vCoxNYU5tastkhhdqbdnuCPj5mf7t44oBtFEecrPLj4ShDZN4",
            # "2NKiSctp5xNmSZDhyRzVH5eTZG7VeUPM55MRwbxUvN4ULq7RvvDvbqEU9EisisF1X1Y4SJoi2uvxkqS8KTymuj8i",
            # "Dk8x4w3dBWGP8D8e73BkpbjMoSDXkYZCE2y8AttkVQf955AtwPuvzTmwKmj1nyk6tLsxmu3v6rh2r7WVXKZ4t3s",
            # "3NbuuY7GXZtCzUv6Pn3yiQAtZz6gnmGsuj5K1TGfQPDjFQiuZNxfvUNYhsfgxiPPTWySZSJ85zaEHGCSrTh1RmK5",
            # "5efqurXgcTNtvRqbaw89HaCYzsLiEh7RCQtxFZtATfZt88vk149YttbunmPaJoarzMYiQzsZHEWHFL3NvWZjGWQ3",
            # "4XryvfuzrXXi5ENNSquYgEXUA5yaRtXZxbquFRUWULtZLutGG1gmVExePuXBQLsfpgA8Xp3XoP6YgWqga6dTH5AC",
            # "3kbrKJMF4NmtmW56dFtvzPaNHAfjm2wCMZmuC6jRZxw1TUsy1VkqiVehreiWaqGuUEuL3FEg67XTirGrjDovpoYd",
            # "2Uebihi9hjy6Q1NrWj6cCQEzLmVnvbSQVhzfR6dawswdGFoTMbyL3myPKGxfrjSXtCefuwFBwjA65Cjk4jyGapiC",
            # "3Ejc6XmUx84ibFA6mmDjnTa3ZgyzmPEbHKyqW6owhcYe22NPEgMvv37aGxSz7hS2iNZmsEDPfGyo7TZvCHv2wdNR",
            # "4CV2BK7bkhV8ULXWra41j17VbwWtC9W3izMKksXJ3h3bk1CYvE2szykJXFZ4g2mdB4UWWihyZqFE56eapt8Mydnm",
            # "4HS5zgknZFkh6LNx34pdRF4dSQBrAfLkGQLsCm5Dw7SetEz8qfmYAndaGN4ph89iJvWvSvGBiS5L1Cfi48EWjk6N",
            # "67TDV9FFahiJvn1qFDTF9VVvLknJwSRoDJYrcrPDjzLQz2CUifgE23dup7CUdkkJDhMwGaJrqqXDd8sZQj8F4kdS",
            # "62HfG99ESyDig5w94kcjZwWdDFdqYye5S3yGBa4NstNz3V22YawsYjzufa7sDaCNPvAoZvdJ6i8Xsm67UaCkmBeJ",
            # "24aBs3ef1HLL6vg37UQGp48wdt5ztEYqNRv2hdz4LjFL1gC3s31Si2hTi1PGCuAx3FeY2qGb8DX6TQbUNnuzWh1C",
            # "4a5vxUSN8FAByLhyN71iYQk4JnLcJX3LsgLEQN7Q8Er5DJVGCAA5RUej5TwJHwWSnyCKAs2kEErf6NGBp2Awdy4L",
            # "4AwiQTxqm7kQEpDLWFoXbvsh9KU2ci3r91PDeXNLTLfWXKQUCdN9RQixygWwJnz5pee7EFPfH8xijbWxYMA2D9H",
            # "2z7RKGh45QaVWDZqNkbqPpQdto2eAUwD5EVL7eFY5PNeL2ywzi812yZzn99U5akMJ3MwDsHnxQcSVUy6ozwx38dk",
            # "5GPnyg6JgBiijm3yXQ75wVmNmCe5cFoud81LPXHSunZFQurQc2aa7DdvNmevAegN5uaZ535PB8gAvJcNYeZu4ozi",
        ]
        

        signature = [Signature.from_string(sig) for sig in example_sigs_str]


        # --- Call the main function ---
        print(f"\nFetching {len(example_sigs_str)} transactions...")
        try:
            transaction_service = TransactionParserService()

            all_results = fetcher.getMultipleTransactions(signature, result_callback=transaction_service.parse_and_get_graph_data)
            
            #print("all_results:", all_results)
        except ValueError as e:
            print(f"\nConfiguration or Input Error: {e}")
        except Exception as e:
            print(f"\nAn unexpected error occurred during execution: {e}")

        # Get timing statistics
        stats = TimingStats().get_stats()

        TimingStats.disable()  # Disable timing after tests

        # Log or print the results
        logger.info("Performance Analysis:")
        for func_name, metrics in stats.items():
            logger.info(f"\n{func_name}:")
            logger.info(f"  Average time: {metrics['avg_time']:.4f}s")
            logger.info(f"  Min time: {metrics['min_time']:.4f}s")
            logger.info(f"  Max time: {metrics['max_time']:.4f}s")
            logger.info(f"  Total calls: {metrics['total_calls']}")
            logger.info(f"  Total time: {metrics['total_time']:.4f}s")
        

    def test_get_wallet_graph_data(self):
        transaction_service = TransactionParserService()

        data = transaction_service.get_account_graph_data("CiW6tXBaqtStvuPfV2aYgMe6FjnzGSQcXwfiHEEG4iiX")

        print("Graph data:", data)

    def test_get_wallet_graph_data_thebenbig(self):
            transaction_service = TransactionParserService()

            data = transaction_service.get_account_graph_data("7WcpfvZsfZzFUKx4enU4Qv7WNCU3Kv8TvJkHbxvYCgfR")

            print("Graph data:", data)

    def test_buy_sell(self):
        transaction_service = TransactionParserService()
        sigs_str = [
            "3XLygWhWXvbrCwPuWhz5mKmAeW3cUQpB76TieArdWUJwc7idTtPQffLwUHXP23k5Qsy2WaDoA4Udi5qzBwPvqk55",
            "2TfBN19teJwnwvSqbN3dyy82y7iMLxVJRy2xuu6bHvwpSW1iJ2tHg9yE66wMUSf8RBtPin9oAS4kvyUL7K9vLu9R"
        ]

        signature = [Signature.from_string(sig) for sig in sigs_str]

        all_results = transaction_service.get_multiple_transactions_graph_data(signature)

        print("all_results:", all_results)

if __name__ == '__main__':
    unittest.main()
