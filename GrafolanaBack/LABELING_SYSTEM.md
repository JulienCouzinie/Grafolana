# Account Labeling System

The Account Labeling System provides meaningful names and descriptions for any type of account address in the Solana ecosystem, enhancing the readability and usability of the graph visualization features.

## Overview

The labeling system assigns human-readable labels to Solana addresses, such as wallets, programs, token accounts, and other on-chain entities. It supports different priority levels to ensure the most relevant labels are displayed.

## Label Priority Levels

Labels are assigned a priority level, with higher-priority labels taking precedence when multiple labels exist for the same address:

1. **DEFAULT (0)** - Parser-defined labels generated automatically by the system
2. **ADMIN (1)** - Labels defined by application administrators
3. **OWNER (2)** - Labels defined by the actual program or account owners
4. **USER (3)** - Private labels defined by individual users

## Database Schema

The system uses PostgreSQL with SQLAlchemy ORM and Alembic for migrations. The main table is structured as follows:

### Labels Table

| Column      | Type      | Description                               |
|-------------|-----------|-------------------------------------------|
| id          | Integer   | Primary key                               |
| address     | String    | Solana address being labeled              |
| label       | String    | Human-readable label                      |
| description | String    | Optional description for the address      |
| priority    | Enum      | Priority level (DEFAULT, ADMIN, OWNER, USER) |
| user_id     | String    | User identifier for private labels        |
| created_at  | DateTime  | When the label was created                |
| updated_at  | DateTime  | When the label was last updated           |

## API Endpoints

### Get Labels (`POST /api/labels`)

Retrieves labels for a list of addresses.

**Request:**
```json
{
  "addresses": ["address1", "address2", ...],
  "user_id": "optional_user_id"
}
```

**Response:**
```json
{
  "address1": {
    "id": 1,
    "address": "address1",
    "label": "Label 1",
    "description": "Description 1",
    "priority": "USER",
    "user_id": "user123",
    "created_at": "2025-03-29T12:34:56.789Z",
    "updated_at": "2025-03-29T12:34:56.789Z"
  },
  "address2": {
    "id": 2,
    "address": "address2",
    "label": "Label 2",
    "description": "Description 2",
    "priority": "ADMIN",
    "user_id": null,
    "created_at": "2025-03-29T12:34:56.789Z",
    "updated_at": "2025-03-29T12:34:56.789Z"
  }
}
```

### Create/Update User Label (`POST /api/labels/user`)

Creates or updates a user-specific label.

**Request:**
```json
{
  "address": "wallet_or_account_address",
  "label": "User Label",
  "user_id": "user_identifier",
  "description": "Optional description"
}
```

**Response:**
```json
{
  "id": 3,
  "address": "wallet_or_account_address",
  "label": "User Label",
  "description": "Optional description",
  "priority": "USER",
  "user_id": "user_identifier",
  "created_at": "2025-03-29T12:34:56.789Z",
  "updated_at": "2025-03-29T12:34:56.789Z"
}
```

### Delete User Label (`DELETE /api/labels/user`)

Deletes a user-specific label.

**Request:**
```json
{
  "address": "wallet_or_account_address",
  "user_id": "user_identifier"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Label deleted"
}
```

**Response (Not Found):**
```json
{
  "status": "not_found",
  "message": "Label not found"
}
```

## Frontend Integration

The MetadataProvider component in the frontend has been extended to support label fetching and caching with the following functions:

- `getLabel(address)` - Get a label for a single address
- `getLabels(addresses)` - Get labels for multiple addresses
- `updateLabel(address, label, description?)` - Create or update a user label

These functions maintain a cache of previously fetched labels and only query the backend for missing labels, optimizing performance.

## Usage Examples

### Fetching a Label

```typescript
import { useMetadata } from '@/components/metadata/metadata-provider';

function MyComponent() {
  const { getLabel } = useMetadata();
  const [programLabel, setProgramLabel] = useState("");
  
  useEffect(() => {
    const fetchLabel = async () => {
      const label = await getLabel("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
      setProgramLabel(label?.label || "Unknown Program");
    };
    
    fetchLabel();
  }, [getLabel]);
  
  return <div>Program: {programLabel}</div>;
}
```

### Creating a User Label

```typescript
import { useMetadata } from '@/components/metadata/metadata-provider';

function LabelEditForm({ address, userId }) {
  const { updateLabel } = useMetadata();
  const [labelText, setLabelText] = useState("");
  const [description, setDescription] = useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateLabel(address, labelText, description, userId);
    // Handle success
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input value={labelText} onChange={e => setLabelText(e.target.value)} placeholder="Label" />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" />
      <button type="submit">Save Label</button>
    </form>
  );
}
```

## Future Expansion

While the current implementation focuses on account labeling, the system is designed to be expandable for caching other types of metadata:

- Program metadata (versions, capabilities)
- Token mint data (supply, decimals)
- NFT collections and properties
- dApp-specific account state information

This expansion will improve performance by reducing RPC calls and enhancing the user experience with richer data.