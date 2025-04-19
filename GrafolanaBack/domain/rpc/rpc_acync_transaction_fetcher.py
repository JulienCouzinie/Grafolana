import asyncio
import os
import time
from typing import List, Dict, Callable, Any, Optional, TypedDict, Set
from threading import Lock, Thread

from solders.signature import Signature
from solana.rpc.async_api import AsyncClient
from solana.exceptions import SolanaRpcException

from dotenv import load_dotenv

from GrafolanaBack.domain.performance.timing_utils import timing_decorator
from GrafolanaBack.domain.logging.logging import logger


# Define a type for endpoint configuration for better clarity
class EndpointConfig(TypedDict):
    url: str
    rps: int

class RateLimiter:
    """
    Rate limiter that enforces consistent spacing between requests to maintain the specified requests per second.
    Uses a lock to ensure thread safety and accurate timing in async context.
    """
    def __init__(self, requests_per_second: int):
        self.interval = 1.0 / requests_per_second * 0.9  # Time between requests in seconds
        self.last_request = 0.0
        self._lock = asyncio.Lock()
    
    async def acquire(self):
        """
        Wait until enough time has passed since the last request to maintain the rate limit.
        Thread-safe and handles async context properly.
        """
        wait_time = 0.0
        
        # Calculate wait time and update last_request under the lock
        async with self._lock:
            now = time.monotonic()
            # Calculate how long we need to wait since the last request
            time_since_last = now - self.last_request
            wait_time = max(0, self.interval - time_since_last)
            
            # Update last request time BEFORE releasing the lock
            # This ensures proper spacing between requests
            self.last_request = now + wait_time
        
        # Sleep outside the lock to allow other requests to be processed in parallel
        if wait_time > 0:
            logger.debug("wait_time", wait_time)
            await asyncio.sleep(wait_time)

class SolanaTransactionFetcher:
    """
    Persistent class for efficiently fetching Solana transactions.
    Maintains workers that are ready to process requests.
    """
    
    def __init__(self):
        # Initialize state
        self.endpoints_config = self._load_rpc_endpoints_from_env()
        self.request_queue = asyncio.Queue()
        self.results_dict = {}
        self.workers_started = False
        self.stop_event = asyncio.Event()
        self.worker_tasks = []
        self.loop = None
        self._lock = Lock()
        
        # Dispatcher tracking data - to prevent infinite loops
        self.tx_failed_workers = {}    # Maps signature string to set of worker_ids that failed to fetch it
        self.dispatcher_lock = Lock()  # Lock for thread-safe access to dispatcher data
        
        # Start the worker management thread
        self._start_worker_thread()
    
    def _start_worker_thread(self):
        """Start a background thread for the event loop"""
        def run_event_loop():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_until_complete(self._start_workers())
            self.loop.run_forever()
            
        thread = Thread(target=run_event_loop, daemon=True, name="SolanaFetcherWorkers")
        thread.start()
    
    async def _start_workers(self):
        """Initialize and start the workers"""
        if self.workers_started:
            return
            
        if not self.endpoints_config:
            logger.warning("No RPC endpoints configured. Workers will not start.")
            return
            
        logger.debug(f"Starting {len(self.endpoints_config)} transaction fetcher workers...")
        
        # Create worker queues that will be shared between dispatcher and workers
        self.worker_queues = {i: asyncio.Queue() for i in range(len(self.endpoints_config))}
        
        self.stop_event.clear()
        for i, endpoint_conf in enumerate(self.endpoints_config):
            task = asyncio.create_task(
                self._rpc_worker(
                    worker_id=i,
                    endpoint_config=endpoint_conf,
                    results_dict=self.results_dict,
                    stop_event=self.stop_event,
                ),
                name=f"RPC-Worker-{i}-{endpoint_conf['url']}"
            )
            self.worker_tasks.append(task)
        
        # Start the dispatcher task
        dispatcher_task = asyncio.create_task(
            self._tx_dispatcher(),
            name="RPC-Dispatcher"
        )
        self.worker_tasks.append(dispatcher_task)
        
        self.workers_started = True
        logger.info(f"Transaction fetcher started with {len(self.worker_tasks)-1} workers and 1 dispatcher")
    
    def _load_rpc_endpoints_from_env(self) -> List[EndpointConfig]:
        """Loads and parses RPC endpoints and their RPS limits from .env file."""
        load_dotenv()
        endpoints_str = os.getenv("SOLANA_RPC_ENDPOINTS")
        if not endpoints_str:
            logger.error("SOLANA_RPC_ENDPOINTS not found in .env file or environment variables.")
            return []

        endpoints_config: List[EndpointConfig] = []
        parts = endpoints_str.strip().split(',')
        for part in parts:
            part = part.strip()
            if not part:
                continue
            try:
                url, rps_str = part.rsplit(':', 1)
                rps = int(rps_str)
                if rps <= 0:
                    raise ValueError("RPS must be positive")
                endpoints_config.append({"url": url.strip(), "rps": rps})
            except ValueError:
                logger.warning(f"Skipping invalid endpoint format: '{part}'. Expected format: URL:RPS")
        
        if not endpoints_config:
            logger.error("No valid RPC endpoints were loaded.")
             
        return endpoints_config
    
    async def _tx_dispatcher(self):
        """
        Dispatcher that assigns transactions to workers.
        Ensures that a transaction is not assigned to workers that previously failed to fetch it.
        """
        logger.info("Transaction dispatcher started")
        
        # Track last worker assigned to distribute work in a round-robin fashion
        last_worker_id = -1
        total_workers = len(self.worker_queues)
        
        while not self.stop_event.is_set():
            try:
                # Get all available items from the request queue
                batch_items = []
                while True:
                    try:
                        # Non-blocking check
                        request_item = self.request_queue.get_nowait()
                        batch_items.append(request_item)
                    except asyncio.QueueEmpty:
                        # No more items in queue
                        break
                
                if not batch_items:
                    # No items to process, wait briefly before checking again
                    await asyncio.sleep(0.01)
                    continue
                
                # Process all items in this batch
                with self.dispatcher_lock:
                    dispatch_results = {}
                    for item in batch_items:
                        signature, result_callback, completion_event, retry_count, callback_params = item
                            
                        sig_str = str(signature)
                        
                        # Initialize tracking for this transaction if it's new
                        if sig_str not in self.tx_failed_workers:
                            self.tx_failed_workers[sig_str] = set()
                        
                        # Get set of workers that already failed for this tx
                        failed_workers = self.tx_failed_workers[sig_str]
                        
                        # If all workers have failed, mark as failed and complete
                        if len(failed_workers) >= total_workers:
                            logger.warning(f"[Dispatcher]: All workers have failed for {sig_str[:10]} - giving up")
                            
                            with self._lock:
                                self.results_dict[sig_str] = None  # No data available
                            
                            # Complete the request
                            if completion_event:
                                completion_event.set()
                                
                            # Clean up tracking
                            del self.tx_failed_workers[sig_str]
                            
                            # Mark as done in the request queue
                            self.request_queue.task_done()
                            continue
                        
                        # Find a worker that hasn't failed on this transaction using round-robin
                        assigned = False
                        
                        # Start from the next worker in the round-robin sequence
                        worker_id_start = (last_worker_id + 1) % total_workers
                        
                        # Check workers in order starting from the next one
                        for worker_offset in range(total_workers):
                            worker_id = (worker_id_start + worker_offset) % total_workers
                            
                            if worker_id not in failed_workers:
                                # Found a worker that hasn't failed on this tx
                                assigned = True
                                last_worker_id = worker_id  # Update last used worker
                                
                                # Send to this worker's queue
                                await self.worker_queues[worker_id].put((
                                    signature, 
                                    result_callback,
                                    completion_event, 
                                    retry_count,
                                    sig_str,  # Pass signature string for tracking
                                    callback_params  
                                ))

                                dispatch_results.setdefault(worker_id,[]).append(sig_str)
                                
                                # Mark as done in the request queue
                                self.request_queue.task_done()
                                break

                    logger.debug(f"[Dispatcher]: Assigned transactions to workers: {dispatch_results}")
            except Exception as e:
                logger.error(f"[Dispatcher]: Error in dispatcher: {e}")
                await asyncio.sleep(0.1)  # Prevent fast spinning on errors
                
        logger.info("[Dispatcher]: Exiting task.")
    
    async def _rpc_worker(
        self,
        worker_id: int,
        endpoint_config: EndpointConfig,
        results_dict: Dict[Signature, Any],
        stop_event: asyncio.Event,
    ):
        """
        Worker task that fetches transactions from a specific endpoint, respecting its rate limit.
        Uses a single AsyncClient instance and token bucket rate limiting.
        """
        url = endpoint_config['url']
        requests_per_second = endpoint_config['rps'] if endpoint_config['rps'] > 0 else 10
        
        # Create rate limiter for consistent request spacing
        rate_limiter = RateLimiter(requests_per_second)
        
        # Maximum parallel requests
        max_parallel_requests = requests_per_second * 2
        
        logger.debug(f"[Worker {worker_id} ({url[:40]})]: Starting. Rate limit: {requests_per_second} req/sec, max parallel: {max_parallel_requests}")
        
        # Use the worker's dedicated queue
        worker_queue = self.worker_queues[worker_id]
        
        # Set to keep track of active tasks
        active_tasks = set()
        
        # Function to handle failures and retry logic
        async def handle_failure(error, signature, sig_str, result_callback, completion_event, retry_count, callback_params=None):
            with self.dispatcher_lock:
                # Mark this worker as having failed for this transaction
                self.tx_failed_workers[sig_str].add(worker_id)
                
                # Store the error
                with self._lock:
                    results_dict[sig_str] = error
            
            # Put back in the main request queue for another worker to try
            await self.request_queue.put((signature, result_callback, completion_event, retry_count + 1, callback_params))
        
        # Create a single AsyncClient instance for all requests
        async with AsyncClient(url) as client:            
            async def process_request(signature, result_callback, completion_event, retry_count, sig_str, callback_params=None):
                """Process a single transaction fetch request"""
                try:
                    logger.debug(f"[Worker {worker_id} ({url[:40]})]: Fetching transaction {sig_str[:10]}... (retry: {retry_count})")
                    rpc_result = await client.get_transaction(
                        signature,
                        encoding="jsonParsed",
                        max_supported_transaction_version=0
                    )
                    
                    # Check if the RPC returned None for value (transaction not available)
                    if rpc_result.value is None:
                        logger.debug(f"[Worker {worker_id} ({url[:40]})]: RPC returned None value for {sig_str[:10]}")
                        
                        # Mark this worker as having failed for this transaction
                        with self.dispatcher_lock:
                            self.tx_failed_workers[sig_str].add(worker_id)
                        
                        # Put back in the main request queue for another worker to try
                        await self.request_queue.put((signature, result_callback, completion_event, retry_count + 1, callback_params))
                        return
                    
                    # Process the result
                    final_result = rpc_result.value
                    
                    # Call the callback if provided
                    if result_callback:
                        try:
                            # Run the callback in a thread pool to prevent blocking
                            loop = asyncio.get_running_loop()
                            if callback_params:
                                callback_result = await loop.run_in_executor(
                                    None,
                                    lambda: result_callback(str(signature), rpc_result.value, None, callback_params)
                                )
                            else:
                                callback_result = await loop.run_in_executor(
                                    None,
                                    lambda: result_callback(str(signature), rpc_result.value, None)
                                )
                            if callback_result is not None:
                                logger.debug(f"[Worker {worker_id} ({url[:40]})]: Using callback return value for {sig_str[:10]}.")
                                final_result = callback_result
                        except Exception as cb_e:
                            logger.error(f"[Worker {worker_id} ({url[:40]})]: Error in user callback for {sig_str[:10]}: {cb_e}")
                    
                    with self.dispatcher_lock:
                        # Clean up tracking since this transaction was successfully processed
                        if sig_str in self.tx_failed_workers:
                            del self.tx_failed_workers[sig_str]
                            
                        # Store the result
                        with self._lock:
                            results_dict[sig_str] = final_result
                    
                    # Signal completion
                    if completion_event:
                        completion_event.set()
                            
                except SolanaRpcException as e:
                    logger.error(f"[Worker {worker_id} ({url[:40]})]: SolanaRpcException for {sig_str[:10]}: {e}")
                    await handle_failure(e, signature, sig_str, result_callback, completion_event, retry_count, callback_params)
                except asyncio.TimeoutError:
                    logger.error(f"[Worker {worker_id} ({url[:40]})]: Timeout fetching {sig_str[:10]}")
                    await handle_failure(TimeoutError(f"Request timed out for {signature}"), 
                                         signature, sig_str, result_callback, completion_event, retry_count, callback_params)
                except Exception as e:
                    logger.error(f"[Worker {worker_id} ({url[:40]})]: Unexpected error for {sig_str[:10]}: {e}")
                    await handle_failure(e, signature, sig_str, result_callback, completion_event, retry_count, callback_params)

            # Main worker loop
            # Create a background task for cleaning up completed tasks
            cleanup_task = asyncio.create_task(self._cleanup_loop(worker_id, url, active_tasks, stop_event))
            
            try:
                while not stop_event.is_set():
                    # Process available items up to capacity
                    while len(active_tasks) < max_parallel_requests:
                        try:
                            # Check if we have an item
                            request_item = worker_queue.get_nowait()
                            
                            # Apply rate limiting
                            await rate_limiter.acquire()

                            signature, result_callback, completion_event, retry_count, sig_str, callback_params = request_item
                            
                            # Create task and add completion callback
                            task = asyncio.create_task(
                                process_request(signature, result_callback, completion_event, retry_count, sig_str, callback_params)
                            )
                            
                            # Add done callback to handle exceptions
                            task.add_done_callback(
                                lambda t, sid=sig_str: self._handle_task_completion(t, worker_id, url, sid)
                            )
                            
                            active_tasks.add(task)
                            worker_queue.task_done()

                        except asyncio.QueueEmpty:
                            # No more items in queue, wait briefly before checking again
                            await asyncio.sleep(0.01)
                            break
                    
                    # Small pause to prevent CPU spinning
                    await asyncio.sleep(0.001)
            finally:
                # Cancel and wait for cleanup task
                cleanup_task.cancel()
                try:
                    await cleanup_task
                except asyncio.CancelledError:
                    pass
                    
                # Wait for remaining tasks when stopping
                if active_tasks:
                    await asyncio.gather(*active_tasks, return_exceptions=True)

    async def _cleanup_loop(self, worker_id, url, active_tasks, stop_event):
        """Background task to clean up completed tasks without blocking the main loop"""
        while not stop_event.is_set():
            # Remove completed tasks from the set
            completed = {task for task in active_tasks if task.done()}
            active_tasks.difference_update(completed)
            
            # Short sleep to prevent CPU spinning
            await asyncio.sleep(0.001)
    
    def _handle_task_completion(self, task, worker_id, url, sig_str):
        """Handle any uncaught exceptions in completed tasks"""
        if not task.cancelled():
            try:
                # Get result to ensure exceptions are raised
                task.result()
            except Exception as e:
                logger.error(f"[Worker {worker_id} ({url[:40]})]: Unhandled task exception for {sig_str[:10]}: {e}")

    @timing_decorator
    def getMultipleTransactions(
        self,
        transaction_signatures: List[Signature],
        result_callback: Optional[Callable[[Signature, Optional[Any], Optional[Exception], Optional[Any]], Any]] = None,
        callback_params: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Fetches multiple Solana transactions concurrently across configured RPC endpoints.

        Args:
            transaction_signatures: A list of transaction signature
            result_callback: An optional function to be called for each result.
                            It receives: Signature, Result (or None), Exception (or None), and callback_params.
                            If the callback returns a value other than None for a successful
                            RPC call, that value is stored instead of the original result.
                            If an RPC error occurs, the error is always stored.
            callback_params: Optional parameters to pass to the result_callback function.
                            Can be any type that needs to be passed to the callback.

        Returns:
            A dictionary mapping each Signature object to its fetched/processed result
            or an Exception object if an error occurred.
        """
        # Check if we have endpoints
        if not self.endpoints_config:
            raise ValueError("No RPC endpoints configured in .env file or environment. Cannot proceed.")
        
        # Convert Signature objects to string 
        transaction_signatures_strings = [str(sig) for sig in transaction_signatures]
        
        # Create a new results dictionary for this request
        local_results: Dict[Signature, Any] = {}
        completion_events = {sig: asyncio.Event() for sig in transaction_signatures}
        
        # Submit requests to the queue
        for sig in transaction_signatures:
            asyncio.run_coroutine_threadsafe(
                self.request_queue.put((sig, result_callback, completion_events[sig], 0, callback_params)),
                self.loop
            )
        
        # Wait for all completions
        future = asyncio.run_coroutine_threadsafe(
            self._wait_for_completion(transaction_signatures_strings, transaction_signatures, completion_events, local_results),
            self.loop
        )
        
        # Get the results
        return future.result()
    
    async def _wait_for_completion(
        self, 
        transaction_signatures: List[str],
        signatures: List[Signature],
        completion_events: Dict[Signature, asyncio.Event],
        local_results: Dict[Signature, Any]
    ) -> Dict[Signature, Any]:
        """Wait for all requests to complete and collect results"""
        # Wait for all events to be set
        await asyncio.gather(*[completion_events[sig].wait() for sig in signatures])
        
        # Copy results from the shared results dict to our local results
        for sig in signatures:
            sig_str = str(sig)
            if sig_str in self.results_dict:
                local_results[sig_str] = self.results_dict[sig_str]
                # Remove from the shared dict to prevent memory leaks
                del self.results_dict[sig_str]
            else:
                local_results[sig_str] = ValueError(f"No result was stored for signature {sig_str}")
        
        return local_results

# Create a singleton instance for easy import
fetcher: SolanaTransactionFetcher
fetcher = SolanaTransactionFetcher()