import json
import zlib  # Or import gzip, bz2, lzma
from sqlalchemy.types import TypeDecorator, LargeBinary
from sqlalchemy.dialects.postgresql import BYTEA # More specific PG type
from GrafolanaBack.domain.logging.logging import logger

class CompressedJSON(TypeDecorator):
    """
    Custom SQLAlchemy type to store JSON compressed with zlib in a BYTEA column.
    """
    # Use LargeBinary for cross-database compatibility,
    # or BYTEA for PostgreSQL specific type. LargeBinary usually maps to BYTEA anyway.
    impl = LargeBinary
    # Setting cache_ok=True indicates that the TypeDecorator instance itself
    # is immutable and can be safely cached by SQLAlchemy's type compilation cache.
    cache_ok = True

    def __init__(self, compression_level=6, *args, **kwargs):
        """
        Initialize with an optional zlib compression level (0-9).
        Default is 6.
        """
        super().__init__(*args, **kwargs)
        self.compression_level = compression_level

    def process_bind_param(self, value, dialect):
        """
        Executed when sending data TO the database.
        Takes a Python object (dict/list), converts to JSON string,
        encodes to UTF-8 bytes, compresses, and returns the compressed bytes.
        """
        if value is not None:
            try:
                json_string = json.dumps(value)
                byte_string = json_string.encode('utf-8')
                compressed_data = zlib.compress(byte_string, self.compression_level)
                return compressed_data
            except Exception as e:
                # Handle potential errors during serialization/compression
                logger.error(f"Error compressing JSON: {e}")
                # Depending on requirements, you might raise the exception,
                # return None, or store an error marker.
                # Returning None might cause issues if the column is NOT NULL.
                raise # Re-raise the exception for clarity during development
        return None

    def process_result_value(self, value, dialect):
        """
        Executed when retrieving data FROM the database.
        Takes compressed bytes, decompresses, decodes from UTF-8 bytes
        to string, and parses the JSON string back into a Python object.
        """
        if value is not None:
            try:
                decompressed_data = zlib.decompress(value)
                json_string = decompressed_data.decode('utf-8')
                return json.loads(json_string)
            except (zlib.error, json.JSONDecodeError, UnicodeDecodeError) as e:
                 # Handle potential errors during decompression/deserialization
                logger.error(f"Error decompressing/decoding JSON from DB: {e}")
                # Decide how to handle corrupted data. Return None, raise, or return a special marker.
                return None # Or raise, depending on desired behavior
        return None

    # Optional: If using PostgreSQL specific BYTEA directly
    # def load_dialect_impl(self, dialect):
    #     if dialect.name == 'postgresql':
    #         return dialect.type_descriptor(BYTEA())
    #     else:
    #         return dialect.type_descriptor(LargeBinary())