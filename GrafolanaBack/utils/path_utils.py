import os
from pathlib import Path
import importlib.util
from typing import Optional

def find_backend_root() -> Path:
    """
    Attempts to find the root directory of the GrafolanaBack module.
    
    Returns:
        Path: Path object pointing to the root directory of the GrafolanaBack module
    
    Raises:
        RuntimeError: If the backend root directory cannot be found
    """
    # Method 1: Try using module spec to find the package location
    try:
        spec = importlib.util.find_spec("GrafolanaBack")
        if spec and spec.origin:
            # spec.origin points to a file within the package, get its parent directory
            package_path = Path(spec.origin).parent
            # Go up one more level to get to the root that contains the GrafolanaBack folder
            return package_path.parent
    except (ImportError, AttributeError):
        pass
    
    # Method 2: Try finding it based on the current file's location
    current_path = Path(os.path.abspath(__file__))
    
    # Look for a directory that contains "GrafolanaBack" in the path hierarchy
    for parent in current_path.parents:
        if parent.name == "GrafolanaBack":
            return parent.parent
    
    # If we couldn't find the root directory, raise an exception
    raise RuntimeError("Could not locate the GrafolanaBack root directory. Please ensure "
                     "the project structure is correct and the function is called from "
                     "within the project directory.")