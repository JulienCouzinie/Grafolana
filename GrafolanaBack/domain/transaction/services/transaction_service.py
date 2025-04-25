import json
import threading
import time
from typing import Dict, List, Optional, Union, Any, Callable
from concurrent.futures import ThreadPoolExecutor

from solders.signature import Signature
from solders.transaction_status import EncodedConfirmedTransactionWithStatusMeta
from sqlalchemy.exc import SQLAlchemyError

from GrafolanaBack.domain.transaction.repositories.transaction_repository import TransactionRepository
from GrafolanaBack.domain.rpc.rpc_connection_utils import client
from GrafolanaBack.domain.rpc.rpc_acync_transaction_fetcher import fetcher
from GrafolanaBack.domain.performance.timing_utils import timing_decorator
from GrafolanaBack.domain.logging.logging import logger

class TransactionService:
    """
    Service for managing Solana transaction retrieval and storage.
    
    This service provides a unified interface for retrieving transactions:
    1. First checks if transactions exist in the database
    2. If not found, fetches them from the Solana RPC network
    3. Automatically stores fetched transactions in the database for future use
    """
    
    def __init__(self, max_worker_threads: int = 5):
        """
        Initialize the transaction service.
        
        Args:
            max_worker_threads: Maximum number of worker threads for background DB operations
        """
        self.transaction_repository = TransactionRepository()
        self.executor = ThreadPoolExecutor(max_workers=max_worker_threads, 
                                          thread_name_prefix="TransactionServiceWorker")
        
    # @timing_decorator
    def get_transaction(self, signature: Union[str, Signature]) -> Optional[EncodedConfirmedTransactionWithStatusMeta]:
        """
        Get a transaction by its signature, checking the database first, then RPC if not found.
        Automatically stores RPC-fetched transactions in the database.
        
        Args:
            signature: The transaction signature as a string or Signature object
            
        Returns:
            The transaction data as EncodedConfirmedTransactionWithStatusMeta or None if not found
        """
        # Convert signature to string if it's a Signature object
        signature_str = str(signature)
        
        # First, try to get from database
        db_transaction = self.transaction_repository.get_transaction(signature_str)
        if db_transaction:
            logger.debug(f"Transaction {signature_str[:10]}... found in database")
            # Parse the stored JSON back to EncodedConfirmedTransactionWithStatusMeta
            return EncodedConfirmedTransactionWithStatusMeta.from_json(json.dumps(db_transaction))
            
        # Not in database, fetch from RPC
        logger.debug(f"Transaction {signature_str[:10]}... not found in database, fetching from RPC")
        try:
            # Convert to Signature object if it's a string
            sig_obj = signature if isinstance(signature, Signature) else Signature.from_string(signature_str)
            
            # Fetch from RPC
            response = client.get_transaction(
                sig_obj, 
                encoding="jsonParsed",
                max_supported_transaction_version=0
            )
            
            if response.value is None:
                logger.warning(f"Transaction {signature_str} not found on RPC")
                return None
                
            # Store the transaction in the database asynchronously
            tx_json_str = response.value.to_json()
            tx_json = json.loads(tx_json_str)
            self._async_store_transaction(signature_str, tx_json)
            
            return response.value
            
        except Exception as e:
            logger.error(f"Error fetching transaction {signature_str}: {str(e)}", exc_info=True)
            return None
    
    # @timing_decorator
    def get_transactions(
        self, 
        signatures: List[Union[str, Signature]],
        result_callback: Optional[Callable[[str, EncodedConfirmedTransactionWithStatusMeta, Optional[Any]], Any]] = None,
        callback_params: Optional[Any] = None
    ) -> Dict[str, Optional[EncodedConfirmedTransactionWithStatusMeta]]:
        """
        Get multiple transactions by their signatures, checking the database first, then RPC if not found.
        Automatically stores RPC-fetched transactions in the database.
        
        Args:
            signatures: List of transaction signatures (strings or Signature objects)
            result_callback: Optional callback function to process each transaction
                             Function receives (signature_str, transaction_data, callback_params)
            callback_params: Optional parameters to pass to the result_callback function
            
        Returns:
            Dictionary mapping signature strings to their transaction data or None if not found
        """
        # Convert all signatures to strings
        signature_strs = [str(sig) for sig in signatures]
        
        # Dictionary to store results
        results: Dict[str, Optional[EncodedConfirmedTransactionWithStatusMeta]] = {}
        
        # now = int(time.monotonic() * 1000)
        # First, check which transactions are already in the database
        db_transactions = self.transaction_repository.get_transactions_by_signatures(signature_strs)
        # timeittook = int(time.monotonic() * 1000) - now
        # logger.info(f"Time taken to fetch transactions: {timeittook} ms")


        # Keep track of signatures that need to be fetched from RPC
        missing_signatures = []

        
        # now = int(time.monotonic() * 1000)
        # Create async tasks for processing transactions found in db
        futures_dict = {}
        
        for sig in signature_strs:
            if sig in db_transactions:
                logger.debug(f"Transaction {sig[:10]}... found in database")
                # Submit JSON transformation task to thread pool
                future = self.executor.submit(
                    self._transform_db_transaction_to_encoded, 
                    sig, 
                    db_transactions[sig]
                )
                futures_dict[future] = sig
            else:
                logger.debug(f"Transaction {sig[:10]}... not found in database")
                missing_signatures.append(sig)
        
        # Collect results as they complete
        for future in futures_dict:
            sig = futures_dict[future]
            try:
                results[sig] = future.result()
            except Exception as e:
                logger.error(f"Error transforming transaction {sig}: {str(e)}", exc_info=True)
                results[sig] = None
        
        # timeittook = int(time.monotonic() * 1000) - now
        # logger.info(f"Time taken to convert create transaction from JSON: {timeittook} ms")
        
        if missing_signatures:
            # Convert missing signatures to Signature objects for RPC
            rpc_signatures = [Signature.from_string(sig) for sig in missing_signatures]
            
            # Fetch missing transactions from RPC in batch
            logger.debug(f"Fetching {len(missing_signatures)} transactions from RPC")
            try:
                # Use the batch RPC fetcher
                rpc_results = fetcher.getMultipleTransactions(
                    rpc_signatures,
                    result_callback=self._process_fetched_transaction
                )
                
                # Process RPC results
                for sig_str, tx_data in rpc_results.items():
                    if tx_data is not None and not isinstance(tx_data, Exception):
                        results[sig_str] = tx_data
                    else:
                        results[sig_str] = None
                        
            except Exception as e:
                logger.error(f"Error fetching multiple transactions: {str(e)}", exc_info=True)
                # For any signatures we couldn't fetch, set to None
                for sig in missing_signatures:
                    if sig not in results:
                        results[sig] = None
        
        # Process results with provided callback if one was provided
        if result_callback is not None:
            processed_results = {}
            futures = []
            
            # now = int(time.monotonic() * 1000)
            # Process each transaction with the callback asynchronously
            for sig, tx_data in results.items():
                if tx_data is not None:
                    future = self.executor.submit(
                        self._process_callback,
                        sig, tx_data, result_callback, callback_params, processed_results
                    )
                    futures.append(future)
                else:
                    processed_results[sig] = None
            
            # Wait for all futures to complete
            for future in futures:
                future.result()  # This will re-raise any exceptions that occurred

            # timeittook = int(time.monotonic() * 1000) - now
            # logger.info(f"Time taken to process all transaction: {timeittook} ms")
                
            return processed_results
            
        # Return the original results if no callback was provided
        return results
    
    def _transform_db_transaction_to_encoded(
        self, 
        signature: str, 
        tx_json: dict
    ) -> Optional[EncodedConfirmedTransactionWithStatusMeta]:
        """
        Transform a transaction from database JSON format to EncodedConfirmedTransactionWithStatusMeta.
        
        Args:
            signature: Transaction signature
            tx_json: Transaction data as JSON object
            
        Returns:
            EncodedConfirmedTransactionWithStatusMeta or None on error
        """
        try:
            # Parse the stored JSON back to EncodedConfirmedTransactionWithStatusMeta
            return EncodedConfirmedTransactionWithStatusMeta.from_json(json.dumps(tx_json))
        except Exception as e:
            logger.error(f"Error transforming transaction {signature}: {str(e)}", exc_info=True)
            return None
    
    def _process_callback(
        self, 
        signature: str, 
        tx_data: EncodedConfirmedTransactionWithStatusMeta,
        callback: Callable,
        callback_params: Optional[Any],
        results_dict: Dict[str, Any]
    ):
        """
        Process a transaction with the provided callback function and store the result.
        
        Args:
            signature: Transaction signature string
            tx_data: Transaction data
            callback: Callback function
            callback_params: Parameters for the callback
            results_dict: Dictionary to update with results
        """
        try:
            if callback_params:
                # Call the callback with the appropriate parameters
                result = callback(signature, tx_data, callback_params)
            else:
                # Call the callback without additional parameters
                result = callback(signature, tx_data)
            
            # Store the result in the dictionary with thread safety
            with threading.Lock():
                # If the callback returned None, use the original tx_data
                results_dict[signature] = result
                
        except Exception as e:
            logger.error(f"Error processing callback for transaction {signature}: {str(e)}", exc_info=True)
            # On error, use the original transaction data
            with threading.Lock():
                results_dict[signature] = tx_data
    
    def _process_fetched_transaction(self, signature: str, tx_data: Any, error: Optional[Exception]) -> Optional[EncodedConfirmedTransactionWithStatusMeta]:
        """
        Callback function for processing fetched transactions, storing them in the database.
        This is called by the fetcher for each transaction result.
        
        Args:
            signature: Transaction signature
            tx_data: Transaction data from RPC
            error: Any error that occurred during fetching
            params: Additional parameters (unused)
            
        Returns:
            EncodedConfirmedTransactionWithStatusMeta object or None if there was an error
        """
        if error is not None:
            logger.warning(f"Error fetching transaction {signature}: {str(error)}")
            return None
            
        if tx_data is None:
            logger.warning(f"Transaction {signature} not found on RPC")
            return None
        
        try:
            # Store the transaction in the database asynchronously
            tx_json_str = tx_data.to_json()
            tx_json = json.loads(tx_json_str)
            self._async_store_transaction(signature, tx_json)
            
            # Return the EncodedConfirmedTransactionWithStatusMeta object
            return tx_data
            
        except Exception as e:
            logger.error(f"Error processing fetched transaction {signature}: {str(e)}", exc_info=True)
            return None
            
    def _async_store_transaction(self, signature: str, tx_json: dict):
        """
        Store a transaction in the database asynchronously using a thread pool.
        
        Args:
            signature: Transaction signature
            tx_json: Transaction data as JSON object
        """
        self.executor.submit(self._store_transaction, signature, tx_json)
    
    def _store_transaction(self, signature: str, tx_json: dict):
        """
        Store a transaction in the database.
        
        Args:
            signature: Transaction signature
            tx_json: Transaction data as JSON object
        """
        try:
            self.transaction_repository.save_transaction(signature, tx_json)
            logger.debug(f"Stored transaction {signature[:10]} in database")
        except SQLAlchemyError as e:
            logger.error(f"Database error storing transaction {signature}: {str(e)}", exc_info=True)
        except Exception as e:
            logger.error(f"Error storing transaction {signature}: {str(e)}", exc_info=True)

    def cleanup(self):
        """
        Clean up resources used by this service.
        Should be called when the service is no longer needed.
        """
        self.executor.shutdown(wait=True)