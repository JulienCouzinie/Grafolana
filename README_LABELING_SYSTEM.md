# Grafolana Account Labeling System

The Account Labeling System is a comprehensive solution for assigning human-readable labels to Solana addresses, enhancing the readability and usability of the transaction graph visualization feature. This document provides a detailed overview of the system's architecture, implementation, and usage.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Backend Components](#backend-components)
4. [Frontend Components](#frontend-components)
5. [Setup and Installation](#setup-and-installation)
6. [Usage Guide](#usage-guide)
7. [API Reference](#api-reference)
8. [Command-Line Interface](#command-line-interface)
9. [Future Enhancements](#future-enhancements)

## System Overview

The Account Labeling System allows different types of labels to be assigned to Solana addresses:

- **Default Labels**: System-generated labels for well-known programs and accounts
- **Admin Labels**: Labels defined by application administrators
- **Owner Labels**: Labels defined by the actual program or account owners
- **User Labels**: Private labels created by individual users

Each label type has a priority level, with higher-priority labels taking precedence when multiple labels exist for the same address.

## Architecture

The system uses a PostgreSQL database with SQLAlchemy ORM for data storage and Alembic for schema migrations. It's integrated with the existing metadata provider in the frontend, maintaining a similar caching strategy for optimal performance.

### Database Schema

```
┌───────────────────────┐
│ labels                │
├───────────────────────┤
│ id: Integer (PK)      │
│ address: String       │
│ label: String         │
│ description: String   │
│ priority: Enum        │
│ user_id: String       │
│ created_at: DateTime  │
│ updated_at: DateTime  │
└───────────────────────┘
```

## Backend Components

### Key Files

- `GrafolanaBack/utils/labeling/models.py` - SQLAlchemy models for labels
- `GrafolanaBack/utils/labeling/db.py` - Database connection utilities
- `GrafolanaBack/utils/labeling/service.py` - Service layer for label operations
- `GrafolanaBack/utils/labeling/seed_default_labels.py` - Script to seed default labels
- `GrafolanaBack/utils/labeling/cli.py` - Command-line interface for label management
- `GrafolanaBack/migrations/` - Alembic migration scripts

### Flask Endpoints

- `POST /api/labels` - Retrieve labels for multiple addresses
- `POST /api/labels/user` - Create or update a user label
- `DELETE /api/labels/user` - Delete a user label

## Frontend Components

### Key Files

- `GrafolanaFront/src/types/metadata.ts` - TypeScript interfaces for labels
- `GrafolanaFront/src/components/metadata/metadata-provider.tsx` - Metadata provider with label support

### Label Provider Functions

The metadata provider has been extended with the following functions:

- `getLabel(address, userId?)` - Get a label for a single address
- `getLabels(addresses, userId?)` - Get labels for multiple addresses
- `updateLabel(address, label, description?, userId?)` - Create or update a user label

## Setup and Installation

### Prerequisites

- Docker and Docker Compose
- PostgreSQL
- Python 3.10+
- Node.js 18+

### Setting Up the Backend

1. Install dependencies:
   ```bash
   cd GrafolanaBack
   pip install -r requirements.txt
   ```

2. Start PostgreSQL using Docker:
   ```bash
   docker-compose up -d postgres
   ```

3. Run migrations:
   ```bash
   cd GrafolanaBack
   python -m alembic upgrade head
   ```

4. Seed default labels:
   ```bash
   python -m GrafolanaBack.utils.labeling.cli seed-defaults
   ```

### Setting Up the Frontend

No additional setup is required for the frontend as the labeling system is integrated into the existing metadata provider.

## Usage Guide

### Retrieving Labels in React Components

```tsx
import { useMetadata } from '@/components/metadata/metadata-provider';

function AddressDisplay({ address }) {
  const { getLabel } = useMetadata();
  const [label, setLabel] = useState("");
  
  useEffect(() => {
    async function fetchLabel() {
      const labelData = await getLabel(address);
      setLabel(labelData?.label || formatAddress(address));
    }
    
    fetchLabel();
  }, [address, getLabel]);
  
  return <div>{label}</div>;
}
```

### Creating User Labels

```tsx
import { useMetadata } from '@/components/metadata/metadata-provider';

function LabelEditor({ address, userId }) {
  const { updateLabel } = useMetadata();
  const [labelText, setLabelText] = useState("");
  const [description, setDescription] = useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateLabel(address, labelText, description, userId);
      alert("Label saved successfully");
    } catch (error) {
      console.error("Error saving label:", error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        value={labelText}
        onChange={(e) => setLabelText(e.target.value)}
        placeholder="Label"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />
      <button type="submit">Save Label</button>
    </form>
  );
}
```

## API Reference

### Get Labels

```
POST /api/labels
```

Request:
```json
{
  "addresses": ["address1", "address2", ...],
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
  },
  "address2": {
    "id": 2,
    "address": "address2",
    "label": "Label 2",
    "description": "Description 2",
    "priority": "USER",
    "user_id": "user123",
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

## Command-Line Interface

The system includes a CLI for label management:

```bash
# Initialize the database
python -m GrafolanaBack.utils.labeling.cli init-db

# Seed default labels
python -m GrafolanaBack.utils.labeling.cli seed-defaults

# Create an admin label
python -m GrafolanaBack.utils.labeling.cli create-admin --address ADDRESS --label "Label Text" --description "Optional description"

# List labels
python -m GrafolanaBack.utils.labeling.cli list --limit 20
```

## Future Enhancements

- **Label Categories**: Group labels by type (wallet, program, token)
- **Bulk Import/Export**: Tools for importing and exporting labels
- **Community Labels**: Allow community contributions for program labels
- **Label Voting**: Community voting system for most accurate labels
- **Extended Caching**: Cache more account metadata beyond just labels
- **Integration with Public Datasets**: Import labels from public Solana datasets
- **User Label Management UI**: Dedicated frontend for managing user labels