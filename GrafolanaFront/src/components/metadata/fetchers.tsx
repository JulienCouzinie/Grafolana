import { Label, MintDTO, Program } from "@/types/metadata";

export const fetchMissingMintInfos = async (mintAddresses: string[]): Promise<MintDTO[]> => {
    if (mintAddresses.length === 0) return [];

    try {
        const response = await fetch('http://localhost:5000/api/metadata/get_mints_info', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addresses: mintAddresses }),
        });

        if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: MintDTO[] = await response.json();

        // Process image URLs before returning the data
        return data.map(mint => ({
        ...mint,
        image: processImageUrl(mint.image)
        }));
    } catch (error) {
        console.error('Error fetching mint infos:', error);
        return [];
    }
};

const processImageUrl = (imageUrl: string | undefined): string | undefined => {
    if (!imageUrl) return undefined;
    const isLocalImage = imageUrl.startsWith('/');
    return isLocalImage ? imageUrl : `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
};

export const fetchMissingProgramInfos = async (programAddresses: string[]): Promise<Program[]> => {
    if (programAddresses.length === 0) return [];

    try {
        const response = await fetch('http://localhost:5000/api/metadata/programs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ addresses: programAddresses }),
        });

        if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: Program[] = await response.json();
        // Process icons URLs before returning the data
        return data.map(program => ({
        ...program,
        icon: processImageUrl(program.icon)
        }));
    } catch (error) {
        console.error('Error fetching program infos:', error);
        return [];
    }
};

// Function to fetch missing labels from the backend
export const fetchMissingLabels = async (addresses: string[], userId?: string): Promise<Record<string, Label>> => {
    if (addresses.length === 0) return {};

    try {
        const response = await fetch('http://localhost:5000/api/metadata/labels', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            addresses,
            user_id: userId
        }),
        });

        if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching labels:', error);
        return {};
    }
};