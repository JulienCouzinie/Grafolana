import os
import unittest
from GrafolanaBack.domain.caching.cache_utils import cache, clear_cache

class NoCacheUnitTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Save original environment
        cls.original_enable_cache = os.getenv('ENABLE_CACHE')
        
        # Disable cache for tests by default
        os.environ['ENABLE_CACHE'] = 'false'
        
    def setUp(self):
        clear_cache()  # Clear cache before each test
    
    @classmethod
    def tearDownClass(cls):
        # Restore original environment
        if cls.original_enable_cache is not None:
            os.environ['ENABLE_CACHE'] = cls.original_enable_cache
        else:
            del os.environ['ENABLE_CACHE']