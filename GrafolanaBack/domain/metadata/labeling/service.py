from typing import List, Optional, Dict, Any
from sqlalchemy import or_, and_
from .models import Label, LabelPriority
from ...infrastructure.db.session import get_session, close_session

from GrafolanaBack.domain.caching.cache_utils import cache

def get_labels_for_addresses(addresses: List[str], user_id: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """
    Retrieve labels for a list of addresses.
    
    Args:
        addresses: List of addresses to fetch labels for
        user_id: Optional user ID to include user-specific labels
        
    Returns:
        Dictionary mapping addresses to their highest priority label
    """
    if not addresses:
        return {}
    
    # Convert list of addresses to tuple for caching
    addresses_tuple = tuple(sorted(addresses))
    
    # Call the internal function with the tuple
    return _get_labels_for_addresses(addresses_tuple, user_id)

@cache.memoize(name="LabelService.get_labels_for_addresses")
def _get_labels_for_addresses(addresses_tuple: tuple, user_id: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """
    Retrieve labels for a list of addresses.
    
    Args:
        addresses: List of addresses to fetch labels for
        user_id: Optional user ID to include user-specific labels
        
    Returns:
        Dictionary mapping addresses to their highest priority label
    """
    addresses = list(addresses_tuple)

    if not addresses:
        return {}
    
    session = get_session()
    try:
        # Construct query conditions
        # If user_id is provided, get both user-specific and shared labels
        # Otherwise, only get shared labels (those without a user_id)
        if user_id:
            conditions = or_(
                and_(Label.address.in_(addresses), Label.user_id == user_id),
                and_(Label.address.in_(addresses), Label.user_id.is_(None))
            )
        else:
            conditions = and_(Label.address.in_(addresses), Label.user_id.is_(None))
        
        # Query all matching labels
        labels = session.query(Label).filter(conditions).all()
        
        # Create a dictionary to store highest priority label for each address
        result = {}
        
        # Process labels, keeping only the highest priority label for each address
        for label in labels:
            address = label.address
            
            # If this address isn't in our result yet, add it
            if address not in result:
                result[address] = label.to_dict()
            else:
                # Compare priorities and keep the highest one
                existing_priority = LabelPriority[result[address]['priority']].value
                current_priority = label.priority.value
                
                if current_priority > existing_priority:
                    result[address] = label.to_dict()
                    
        return result
        
    finally:
        close_session(session)

def create_or_update_user_label(address: str, label_text: str, user_id: str, description: Optional[str] = None) -> Dict[str, Any]:
    """
    Create or update a user-specific label.
    
    Args:
        address: The address to label
        label_text: The label text
        user_id: The user ID (required for user labels)
        description: Optional description for the label
        
    Returns:
        The created or updated label as a dictionary
    """
    if not user_id:
        raise ValueError("User ID is required for user labels")
    
    session = get_session()
    try:
        # Check if label already exists for this user and address
        existing_label = session.query(Label).filter(
            Label.address == address,
            Label.user_id == user_id
        ).first()
        
        if existing_label:
            # Update existing label
            existing_label.label = label_text
            if description is not None:
                existing_label.description = description
            label = existing_label
        else:
            # Create new label
            label = Label(
                address=address,
                label=label_text,
                description=description,
                priority=LabelPriority.USER,
                user_id=user_id
            )
            session.add(label)
            
        session.commit()
        return label.to_dict()
        
    finally:
        close_session(session)

def create_admin_label(address: str, label_text: str, description: Optional[str] = None) -> Dict[str, Any]:
    """
    Create or update an admin label.
    
    Args:
        address: The address to label
        label_text: The label text
        description: Optional description for the label
        
    Returns:
        The created or updated label as a dictionary
    """
    session = get_session()
    try:
        # Check if admin label already exists for this address
        existing_label = session.query(Label).filter(
            Label.address == address,
            Label.priority == LabelPriority.ADMIN,
            Label.user_id.is_(None)
        ).first()
        
        if existing_label:
            # Update existing label
            existing_label.label = label_text
            if description is not None:
                existing_label.description = description
            label = existing_label
        else:
            # Create new label
            label = Label(
                address=address,
                label=label_text,
                description=description,
                priority=LabelPriority.ADMIN,
                user_id=None  # Admin labels are shared (no user_id)
            )
            session.add(label)
            
        session.commit()
        return label.to_dict()
        
    finally:
        close_session(session)

def create_default_label(address: str, label_text: str, description: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a default (parser-generated) label if one doesn't already exist.
    Will not overwrite existing labels of any priority.
    
    Args:
        address: The address to label
        label_text: The label text
        description: Optional description for the label
        
    Returns:
        The created label as a dictionary, or None if one already exists
    """
    session = get_session()
    try:
        # Check if any label already exists for this address
        existing_label = session.query(Label).filter(
            Label.address == address,
            Label.user_id.is_(None)  # Only check shared labels
        ).first()
        
        if existing_label:
            # Don't overwrite any existing labels
            return existing_label.to_dict()
        
        # Create new default label
        label = Label(
            address=address,
            label=label_text,
            description=description,
            priority=LabelPriority.DEFAULT,
            user_id=None
        )
        session.add(label)
        session.commit()
        return label.to_dict()
        
    finally:
        close_session(session)

def delete_user_label(address: str, user_id: str) -> bool:
    """
    Delete a user-specific label.
    
    Args:
        address: The address of the label to delete
        user_id: The user ID
        
    Returns:
        True if label was deleted, False if not found
    """
    session = get_session()
    try:
        deleted = session.query(Label).filter(
            Label.address == address,
            Label.user_id == user_id
        ).delete()
        
        session.commit()
        return deleted > 0
        
    finally:
        close_session(session)