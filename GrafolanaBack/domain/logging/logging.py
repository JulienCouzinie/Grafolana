import logging
import os
from pathlib import Path
from typing import Dict, Optional
import importlib.util
import sys

class LoggerSingleton:
    _instances: Dict[str, logging.Logger] = {}
    
    @staticmethod
    def _get_logs_directory() -> Path:
        """Get the logs directory path within the backend folder structure."""
        # Find the package root by locating the top-level module
        try:
            # Try to find the main package directory
            spec = importlib.util.find_spec('GrafolanaBack')
            if spec and spec.origin:
                # If the module is found, use its parent directory as backend root
                backend_root = Path(spec.origin).parent
            else:
                # Fall back to the current approach if module not found
                current_file_dir = Path(__file__).resolve().parent
                backend_root = current_file_dir.parent.parent
        except (ImportError, AttributeError):
            # Fall back to the current approach if there's any issue
            current_file_dir = Path(__file__).resolve().parent
            backend_root = current_file_dir.parent.parent
            
        # Create logs directory in the backend root if it doesn't exist
        log_path = backend_root / "logs"
        log_path.mkdir(exist_ok=True)
        
        return log_path

    @classmethod
    def get_mint_logger(cls) -> logging.Logger:
        """Get or create the mint logger singleton instance."""
        if 'mint_issues' not in cls._instances:
            cls._instances['mint_issues'] = cls._setup_mint_logger()
        return cls._instances['mint_issues']
    
    @classmethod
    def get_default_logger(cls) -> logging.Logger:
        """Get or create the default logger singleton instance."""
        if 'default' not in cls._instances:
            cls._instances['default'] = cls._setup_default_logger()
        return cls._instances['default']
    
    @staticmethod
    def _setup_mint_logger() -> logging.Logger:
        logger = logging.getLogger('mint_issues')
        
        # Only add handler if not already added to avoid duplicate handlers
        if not logger.handlers:
            logger.setLevel(logging.INFO)
            
            # Get logs directory
            log_path = LoggerSingleton._get_logs_directory()
            
            # Create file handler
            fh = logging.FileHandler(log_path / "missing_mint_data.log")
            fh.setLevel(logging.INFO)
            
            # Create formatter
            formatter = logging.Formatter('%(asctime)s - %(message)s')
            fh.setFormatter(formatter)
            
            # Add handler to logger
            logger.addHandler(fh)
        
        return logger
    
    @staticmethod
    def _setup_default_logger() -> logging.Logger:
        logger = logging.getLogger('default')
        
        # Only add handler if not already added to avoid duplicate handlers
        if not logger.handlers:
            logger.setLevel(logging.INFO)
            
            # Get logs directory
            log_path = LoggerSingleton._get_logs_directory()
            
            # Create file handler
            fh = logging.FileHandler(log_path / "default.log")
            fh.setLevel(logging.INFO)
            
            # Create formatter
            formatter = logging.Formatter('%(asctime)s - %(message)s')
            fh.setFormatter(formatter)
            
            # Add handler to logger
            logger.addHandler(fh)

            # Also log to console.
            console = logging.StreamHandler()
            logger.addHandler(console)
        
        return logger

# Convenience variables for direct imports
mint_logger = LoggerSingleton.get_mint_logger()
logger = LoggerSingleton.get_default_logger()