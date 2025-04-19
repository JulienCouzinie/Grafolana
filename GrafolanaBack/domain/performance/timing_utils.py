import time
import functools
from typing import Dict, List, Optional
from collections import defaultdict


class TimingStats:
    _instance = None
    enabled = False  # Class variable to control timing
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(TimingStats, cls).__new__(cls)
            cls._instance.stats = defaultdict(list)
        return cls._instance
    
    @classmethod
    def enable(cls):
        cls.enabled = True
        
    @classmethod
    def disable(cls):
        cls.enabled = False
    
    def add_timing(self, function_name: str, execution_time: float):
        if self.enabled:
            self.stats[function_name].append(execution_time)
    
    def get_stats(self) -> Dict[str, dict]:
        if not self.enabled:
            return {}
            
        results = {}
        for func_name, times in self.stats.items():
            if times:
                results[func_name] = {
                    'avg_time': sum(times) / len(times),
                    'min_time': min(times),
                    'max_time': max(times),
                    'total_calls': len(times),
                    'total_time': sum(times)
                }
        return results
    
    def clear(self):
        self.stats.clear()

def timing_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        if not TimingStats.enabled:
            return func(*args, **kwargs)
            
        start_time = time.perf_counter()
        result = func(*args, **kwargs)
        end_time = time.perf_counter()
        
        execution_time = end_time - start_time
        TimingStats().add_timing(func.__name__, execution_time)
        
        return result
    return wrapper