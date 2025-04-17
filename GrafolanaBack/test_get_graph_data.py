import base64
from solders.transaction import Transaction
from GrafolanaBack.domain.transaction.services.transaction_parser_service import TransactionParserService
import unittest

from no_cache_unit_test import NoCacheUnitTest
from GrafolanaBack.domain.performance.timing_utils import TimingStats

import logging
logger = logging.getLogger(__name__)

class Test_Get_Graph_Data(NoCacheUnitTest):
    def test_timings(self):

        TimingStats.enable()  # Enable timing for tests

        # Clear previous stats
        TimingStats().clear()

        transaction_service = TransactionParserService()        

        #graph_data = transaction_service.get_transaction_graph_data("3vzGCmAaLkCBMm2Yk6jNyyWeApcd7YBevTRwWKEUeRZG2KeVYw3NE3pmMBbzY7CMqEZf9MgPJG8qXbHzdqC5A8iu")
        #graph_data = transaction_service.get_transaction_graph_data("4RpgaGrGQxxumRBahJB2faJ8ipymcdw32QnJTeay3a4gfrurcskYNtqGXX9aeTgF4g1vafpQQS7WhFXDaRgcouGR")
        # graph_data = transaction_service.get_transaction_graph_data("3J2GJwmTzj4Vtz7VaQ5zNqvEcu7A9jWQ3dU3xwGyETgrzD4hTxPWwMYFvbuGKRDNzcouTzdc226E6Gp936n19VC1")
        # graph_data = transaction_service.get_transaction_graph_data("2Uebihi9hjy6Q1NrWj6cCQEzLmVnvbSQVhzfR6dawswdGFoTMbyL3myPKGxfrjSXtCefuwFBwjA65Cjk4jyGapiC")
        graph_data = transaction_service.get_transaction_graph_data("2aWcxyeNGxoCis32TMcYW3nRDGaHZrCW6wy68dkMfHNVDA1mfuMCSqCMy2FvwxamRfYrvAdnTR7wj8UzKDi2TPvn")

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

        print(graph_data)


if __name__ == '__main__':
    unittest.main()
