import logging
from pathlib import Path
from typing import Dict, Optional

class LoggerSingleton:
    _instances: Dict[str, logging.Logger] = {}
    
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
            logger.setLevel(logging.WARNING)
            
            # Create logs directory if it doesn't exist
            log_path = Path("logs")
            log_path.mkdir(exist_ok=True)
            
            # Create file handler
            fh = logging.FileHandler(log_path / "missing_mint_data.log")
            fh.setLevel(logging.WARNING)
            
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
            
            # Create logs directory if it doesn't exist
            log_path = Path("logs")
            log_path.mkdir(exist_ok=True)
            
            # Create file handler
            fh = logging.FileHandler(log_path / "default.log")
            fh.setLevel(logging.INFO)
            
            # Create formatter
            formatter = logging.Formatter('%(asctime)s - %(message)s')
            fh.setFormatter(formatter)
            
            # Add handler to logger
            logger.addHandler(fh)
        
        return logger

# Convenience variables for direct imports
mint_logger = LoggerSingleton.get_mint_logger()
logger = LoggerSingleton.get_default_logger()