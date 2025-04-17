from typing import List
from GrafolanaBack.domain.transaction.config.dex_programs.dex_program_struct import DESCRIPTION, ICON, LABEL, PROGRAM_ADDRESS, WEBSITE
from GrafolanaBack.domain.transaction.config.dex_programs.swap_programs import SWAP_PROGRAMS
from GrafolanaBack.domain.caching.cache_utils import cache
from .system_programs import SYSTEM_PROGRAMS 

programs_metadata_map = SYSTEM_PROGRAMS

for swap_program_address, swap_program in SWAP_PROGRAMS.get_map().items():
    program_metadata = {
        PROGRAM_ADDRESS: swap_program_address,
        LABEL:  swap_program.label,
        ICON: swap_program.icon,
        WEBSITE: swap_program.website,
        DESCRIPTION: swap_program.description,
    }
    programs_metadata_map[swap_program_address] = program_metadata


def get_program_metadatas(program_addresses: List[str]) -> List[str]:
    """
    Retrieve metadata for a list of program addresses.
    
    Args:
        program_addresses: List of program addresses to fetch metadata for
        
    Returns:
        Dictionary mapping program addresses to their metadata
    """
    if not program_addresses:
        return []
    
    # Convert list of addresses to tuple for caching
    program_addresses_tuple = tuple(sorted(program_addresses))
    
    # Call the internal function with the tuple
    return _get_program_metadatas(program_addresses_tuple)

@cache.memoize(name="Programs._get_program_metadatas")
def _get_program_metadatas(program_tuples: tuple) -> List[str]:
    """
    Retrieve metadata for a list of program addresses.
    
    Args:
        program_addresses: List of program addresses to fetch metadata for
        
    Returns:
        Dictionary mapping program addresses to their metadata
    """

    program_addresses = list(program_tuples)

    if not program_addresses:
        return []
    
    result = []
    
    for address in program_addresses:
        if address in programs_metadata_map:
            result.append(programs_metadata_map[address])
    
    return result

