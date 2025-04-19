from GrafolanaBack.domain.caching.cache_utils import clear_cache
from GrafolanaBack.domain.logging.logging import logger

if __name__ == "__main__":
    logger.info("Clearing cache...")
    clear_cache()
    logger.info("Cache cleared!")