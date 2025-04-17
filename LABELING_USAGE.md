# Account Labeling System Usage Guide

The labeling system allows you to assign human-readable labels to any Solana address (wallet, program, token account, etc.), enhancing the readability of the transaction graph visualization.

## Basic Usage

### Fetching Labels

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

### Fetching Multiple Labels At Once

```tsx
import { useMetadata } from '@/components/metadata/metadata-provider';

function AddressesTable({ addresses }) {
  const { getLabels } = useMetadata();
  const [labels, setLabels] = useState({});
  
  useEffect(() => {
    async function fetchLabels() {
      const labelsData = await getLabels(addresses);
      setLabels(labelsData);
    }
    
    fetchLabels();
  }, [addresses, getLabels]);
  
  return (
    <table>
      <tbody>
        {addresses.map((address) => (
          <tr key={address}>
            <td>{address}</td>
            <td>{labels[address]?.label || "Unknown"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Creating or Updating User Labels

```tsx
import { useMetadata } from '@/components/metadata/metadata-provider';

function LabelEditor({ address, userId }) {
  const { getLabel, updateLabel } = useMetadata();
  const [labelText, setLabelText] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Load existing label if there is one
  useEffect(() => {
    async function fetchExistingLabel() {
      const existingLabel = await getLabel(address, userId);
      if (existingLabel) {
        setLabelText(existingLabel.label);
        setDescription(existingLabel.description || "");
      }
    }
    
    fetchExistingLabel();
  }, [address, userId, getLabel]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await updateLabel(address, labelText, description, userId);
      alert("Label saved successfully");
    } catch (error) {
      console.error("Error saving label:", error);
      alert("Error saving label");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>
          Label:
          <input
            type="text"
            value={labelText}
            onChange={(e) => setLabelText(e.target.value)}
            required
          />
        </label>
      </div>
      
      <div>
        <label>
          Description (optional):
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Saving..." : "Save Label"}
      </button>
    </form>
  );
}
```

## Using Labels in the Transaction Graph

```tsx
import { useMetadata } from '@/components/metadata/metadata-provider';

function TransactionGraphNode({ node }) {
  const { getLabel } = useMetadata();
  const [nodeLabel, setNodeLabel] = useState("");
  
  useEffect(() => {
    async function fetchNodeLabel() {
      // For auth users, pass the userId to get personalized labels
      const userId = getUserId(); // Your function to get current user
      const labelData = await getLabel(node.id, userId);
      
      // Use label if available, otherwise use default display format
      setNodeLabel(labelData?.label || formatAddressForDisplay(node.id));
    }
    
    fetchNodeLabel();
  }, [node.id, getLabel]);
  
  return (
    <div className="graph-node">
      <div className="node-label">{nodeLabel}</div>
      <div className="node-address">{formatAddressShort(node.id)}</div>
    </div>
  );
}
```

## Label Priority System

The labeling system supports multiple label types with different priorities:

1. DEFAULT - Parser-defined labels (lowest priority)
2. ADMIN - Admin-defined labels
3. OWNER - Account owner defined labels
4. USER - User private labels (highest priority)

The system automatically returns the highest priority label for each address, with user-specific labels taking precedence over all others.

## Adding Admin Labels

Admin labels can be added directly to the database or through a dedicated admin interface:

```tsx
// Sample admin interface (requires server-side authentication & authorization)
function AdminLabelManager() {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/labels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAdminToken()}` // Your auth function
        },
        body: JSON.stringify({
          address,
          label,
          description
        })
      });
      
      if (!response.ok) throw new Error('Failed to create admin label');
      
      alert('Admin label created successfully');
      // Reset form
      setAddress("");
      setLabel("");
      setDescription("");
    } catch (error) {
      console.error('Error creating admin label:', error);
      alert('Error creating admin label');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Admin Label</h2>
      
      <div>
        <label>
          Address:
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </label>
      </div>
      
      <div>
        <label>
          Label:
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </label>
      </div>
      
      <div>
        <label>
          Description:
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
      
      <button type="submit">Create Admin Label</button>
    </form>
  );
}
```

## Future Expansion

The labeling system is designed to be expanded in the future to include more features:

- Bulk label uploads for admins
- Label categories and tags
- Community-contributed labels
- Export/import of user labels