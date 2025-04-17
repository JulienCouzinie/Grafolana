import logging
from pathlib import Path

def setup_mint_logger():
    logger = logging.getLogger('mint_issues')
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

mint_logger = setup_mint_logger()