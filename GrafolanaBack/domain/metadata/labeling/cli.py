"""
Command-line interface for label management.

Usage:
    python -m GrafolanaBack.utils.metadata.labeling.cli seed-defaults  # Seed default labels
    python -m GrafolanaBack.utils.metadata.labeling.cli init-db        # Initialize database
"""

import argparse
import sys
from ...infrastructure.db.session import init_db, get_session, close_session
from .models import Label, LabelPriority

def main():
    parser = argparse.ArgumentParser(description='Label management CLI')
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Seed defaults command
    seed_parser = subparsers.add_parser('seed-defaults', help='Seed database with default labels')
    
    # Initialize database command
    init_parser = subparsers.add_parser('init-db', help='Initialize the database tables')
    
    # Create admin label command
    admin_parser = subparsers.add_parser('create-admin', help='Create an admin label')
    admin_parser.add_argument('--address', type=str, required=True, help='Solana address to label')
    admin_parser.add_argument('--label', type=str, required=True, help='Label text')
    admin_parser.add_argument('--description', type=str, help='Optional description')
    
    # List labels command
    list_parser = subparsers.add_parser('list', help='List labels')
    list_parser.add_argument('--address', type=str, help='Filter by address')
    list_parser.add_argument('--priority', type=str, choices=['DEFAULT', 'ADMIN', 'OWNER', 'USER'], 
                           help='Filter by priority')
    list_parser.add_argument('--limit', type=int, default=10, help='Limit number of results')
    
    args = parser.parse_args()
    
    if args.command == 'init-db':
        print("Initializing database...")
        init_db()
        print("Database initialized successfully")
    
    elif args.command == 'create-admin':
        session = get_session()
        try:
            # Check if label already exists
            existing_label = session.query(Label).filter(
                Label.address == args.address,
                Label.priority == LabelPriority.ADMIN,
                Label.user_id.is_(None)
            ).first()
            
            if existing_label:
                # Update existing label
                existing_label.label = args.label
                if args.description:
                    existing_label.description = args.description
                print(f"Updated admin label for {args.address}")
            else:
                # Create new admin label
                label = Label(
                    address=args.address,
                    label=args.label,
                    description=args.description,
                    priority=LabelPriority.ADMIN,
                    user_id=None
                )
                session.add(label)
                print(f"Created admin label for {args.address}")
                
            session.commit()
            
        except Exception as e:
            session.rollback()
            print(f"Error creating admin label: {e}", file=sys.stderr)
            sys.exit(1)
            
        finally:
            close_session(session)
    
    elif args.command == 'list':
        session = get_session()
        try:
            query = session.query(Label)
            
            if args.address:
                query = query.filter(Label.address == args.address)
                
            if args.priority:
                query = query.filter(Label.priority == LabelPriority[args.priority])
            
            labels = query.limit(args.limit).all()
            
            if not labels:
                print("No labels found")
                return
                
            # Print table header
            print(f"{'ID':<5} {'Address':<45} {'Label':<30} {'Priority':<10} {'Description':<50}")
            print('-' * 140)
            
            for label in labels:
                # Truncate long fields for display
                address = label.address[:43] + '..' if len(label.address) > 45 else label.address
                label_text = label.label[:28] + '..' if len(label.label) > 30 else label.label
                description = label.description[:48] + '..' if label.description and len(label.description) > 50 else (label.description or '')
                
                print(f"{label.id:<5} {address:<45} {label_text:<30} {label.priority.name:<10} {description:<50}")
                
        except Exception as e:
            print(f"Error listing labels: {e}", file=sys.stderr)
            sys.exit(1)
            
        finally:
            close_session(session)
    
    else:
        parser.print_help()

if __name__ == '__main__':
    main()