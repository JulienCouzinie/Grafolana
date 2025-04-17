# Account Labeling System Setup Guide

This guide provides step-by-step instructions for setting up the account labeling system for Grafolana.

> **Note**: This document focuses specifically on setup instructions. For a complete overview of the labeling system, see `/README_LABELING_SYSTEM.md`. For API details and implementation details, see `/GrafolanaBack/LABELING_SYSTEM.md`. For frontend usage examples, see `/LABELING_USAGE.md`.

## Prerequisites

- Docker and Docker Compose installed
- Python 3.10+ with pip
- Node.js 18+ with npm or pnpm

## Complete Backend Setup

Follow these steps in order for a complete setup:

### 1. Install Dependencies

```bash
# Navigate to the backend directory
cd GrafolanaBack

# Create and activate a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install -r requirements.txt
```

### 2. Start PostgreSQL Database

```bash
# Return to project root
cd ..  

# Start PostgreSQL container
docker-compose up -d
```

Wait a few seconds for PostgreSQL to initialize.

### 3. Set Up Database Schema

```bash
# Navigate back to backend directory
cd GrafolanaBack

# Initialize database schema with Alembic
python -m alembic upgrade head

# Verify tables were created
docker exec -it grafolana-postgres psql -U grafolana -d grafolana -c "\dt"
# You should see labels and alembic_version tables
```

### 4. Seed Default Labels

```bash
# Seed the database with default program and token labels
python -m GrafolanaBack.utils.labeling.cli seed-defaults

# Verify labels were created (shows first 10 by default)
python -m GrafolanaBack.utils.labeling.cli list

# To see more labels, use the --limit parameter
python -m GrafolanaBack.utils.labeling.cli list --limit 50

# To see all labels
python -m GrafolanaBack.utils.labeling.cli list --limit 9999
```

### 5. Start the Flask Backend Server

```bash
# Start the backend server
python app.py
```

The server will start on http://localhost:5000 by default.

## Frontend Setup

The frontend requires no additional setup for the labeling system as it's integrated into the existing metadata provider.

## Usage

### Accessing Labels

Use the metadata provider's label functions:

```typescript
import { useMetadata } from '@/components/metadata/metadata-provider';

function MyComponent() {
  const { getLabel, getLabels, updateLabel } = useMetadata();
  
  // Get a single label
  const label = await getLabel("TK2PVXygjehbgRQCSJ7JM6SQssMzv6jhWXPS8zZzRQz");
  
  // Get multiple labels
  const labels = await getLabels(["TK2PVXygjehbgRQCSJ7JM6SQssMzv6jhWXPS8zZzRQz", "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"]);
  
  // Create or update a user label
  await updateLabel(
    "TK2PVXygjehbgRQCSJ7JM6SQssMzv6jhWXPS8zZzRQz", 
    "My Exchange Wallet", 
    "Personal exchange wallet for trading", 
    "user123"
  );
}
```

## API Endpoints

The following REST endpoints are available:

### Get Labels

```
POST /api/labels
```

Request:
```json
{
  "addresses": ["address1", "address2"],
  "user_id": "optional_user_id"
}
```

Response:
```json
{
  "address1": {
    "id": 1,
    "address": "address1",
    "label": "Label 1",
    "description": "Description 1",
    "priority": "ADMIN",
    "user_id": null,
    "created_at": "2025-03-29T12:34:56.789Z",
    "updated_at": "2025-03-29T12:34:56.789Z"
  }
}
```

### Create/Update User Label

```
POST /api/labels/user
```

Request:
```json
{
  "address": "wallet_address",
  "label": "User Label",
  "description": "Optional description",
  "user_id": "user123"
}
```

Response:
```json
{
  "id": 2,
  "address": "wallet_address",
  "label": "User Label",
  "description": "Optional description",
  "priority": "USER",
  "user_id": "user123",
  "created_at": "2025-03-29T12:34:56.789Z",
  "updated_at": "2025-03-29T12:34:56.789Z"
}
```

### Delete User Label

```
DELETE /api/labels/user
```

Request:
```json
{
  "address": "wallet_address",
  "user_id": "user123"
}
```

Response:
```json
{
  "status": "success",
  "message": "Label deleted"
}
```

## CLI Reference

The labeling system includes a command-line interface with the following commands:

```bash
# List labels (defaults to 10 entries)
python -m GrafolanaBack.utils.labeling.cli list [--limit N] [--address ADDRESS] [--priority PRIORITY]

# Seed default labels
python -m GrafolanaBack.utils.labeling.cli seed-defaults

# Create an admin label
python -m GrafolanaBack.utils.labeling.cli create-admin --address ADDRESS --label "Label Text" [--description "Description"]

# Initialize database (alternative to using alembic)
python -m GrafolanaBack.utils.labeling.cli init-db
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Check that the PostgreSQL container is running:
   ```
   docker ps
   ```

2. Verify the database connection parameters in `GrafolanaBack/utils/labeling/db.py`

3. Ensure the database has been properly initialized:
   ```
   docker exec -it grafolana-postgres psql -U grafolana -d grafolana -c "\dt"
   ```
   
   This should show a `labels` table among other tables.

### Database Reset Procedure

If you need to completely reset the database and migrations (useful for solving migration conflicts):

1. Drop all tables in the database:
   ```bash
   docker exec -it grafolana-postgres psql -U grafolana -d grafolana -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
   ```

2. Reset Alembic's state:
   ```bash
   cd GrafolanaBack
   python -m alembic stamp head
   ```

3. Generate a new migration based on current models :
   ```bash
   python -m alembic revision --autogenerate -m "fresh_start"
   ```

4. Apply the new migration:
   ```bash
   python -m alembic upgrade head
   ```

### Missing Labels

If labels aren't being displayed:

1. Check the browser console for API errors
2. Verify that the correct address format is being used (base58 encoded)
3. Ensure the user ID is consistent when storing and retrieving user-specific labels