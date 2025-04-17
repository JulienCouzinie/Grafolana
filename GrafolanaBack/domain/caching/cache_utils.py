import os
import sys
from diskcache import Cache

def is_cache_enabled():
    # Check command line args first
    if '--no-cache' in sys.argv:
        return False
    
    # Then check environment variable
    return os.getenv('ENABLE_CACHE', 'false').lower() == 'true'

def get_cache():
    if is_cache_enabled():
        return Cache(directory="diskcache", eviction_policy="least-frequently-used")
    else:
        # Dummy cache that does nothing
        class DummyCache:
            def memoize(self, *args, **kwargs):
                def decorator(func):
                    return func
                return decorator
            
            def clear(self):
                pass
        
        return DummyCache()

cache = get_cache()

def clear_cache():
    """Utility function to clear cache"""
    real_cache = Cache(directory="diskcache", eviction_policy="least-frequently-used")
    real_cache.clear()