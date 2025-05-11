# Common Solana system programs and their descriptions
from GrafolanaBack.domain.transaction.config.dex_programs.dex_program_struct import DESCRIPTION, ICON, LABEL, PROGRAM_ADDRESS, WEBSITE


SYSTEM_PROGRAMS = {
    "11111111111111111111111111111111": {
        PROGRAM_ADDRESS: "11111111111111111111111111111111",
        LABEL: "System Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The System Program, the bedrock of Solana’s blockchain infrastructure responsible for core account management and native SOL token operations. As the primary system-level program, it handles essential functions that enable the creation, modification, and transfer of accounts and SOL—the network’s native cryptocurrency—making it a critical component for users, developers, and validators alike. Its simplicity and efficiency align with Solana’s mission to provide a scalable, high-performance blockchain.
The System Program supports a variety of instructions that form the foundation of Solana’s account model. Key functionalities include creating new accounts (allocating space on the blockchain and funding them with SOL for rent exemption), transferring SOL between accounts (the most common operation for payments and staking), and assigning account ownership to other programs (such as the SPL Token Program or custom programs). It also allows for nonce accounts (used in durable nonce transactions for offline signing), account upgrades, and closing accounts to reclaim SOL. Every account on Solana begins its lifecycle through this program, which ensures that resources are allocated securely and in accordance with the network’s rent system.
Written in Rust and deeply integrated into Solana’s runtime, the System Program operates with minimal overhead, enabling the network to process thousands of transactions per second at near-zero cost. Its deterministic design—reflected in its all-ones program ID—makes it a universal entry point for interacting with the blockchain, whether for simple SOL transfers or bootstrapping complex decentralized applications. As the first program deployed on Solana, it embodies the network’s minimalist yet powerful approach to blockchain architecture, serving as the glue that connects users and programs across the ecosystem.
This program is indispensable for any interaction on Solana, from sending SOL to a friend to initializing accounts for dApps, and its ubiquitous role highlights its importance in the network’s daily operations."""
    },
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA":{
        PROGRAM_ADDRESS: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        LABEL: "Token Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The SPL Token Program, a foundational component of the Solana Program Library (SPL) that powers the creation, management, and transfer of fungible and non-fungible tokens on the Solana blockchain. Often referred to simply as the "Token Program," it serves as the backbone for Solana’s token ecosystem, enabling developers to define custom token types (via mints), issue tokens, and facilitate their transfer between accounts, all while leveraging Solana’s high-speed, low-cost infrastructure.
The SPL Token Program supports a rich set of functionalities through its instruction set. It allows users to create token mints (unique identifiers for token types, akin to ERC-20 contracts on Ethereum), specifying properties like total supply, decimals, and optional authorities for minting or freezing. Token accounts, owned by this program, hold balances for individual users and are managed through instructions like transfer, mint, burn, and approve (for delegated spending). Additional features include multisig support for secure governance, freeze/thaw capabilities for regulatory compliance, and close account functionality to reclaim rent-exempt SOL. The program also underpins the creation of non-fungible tokens (NFTs) by allowing mints with a supply of one and zero decimals, a mechanism widely used in Solana’s thriving NFT ecosystem.
Written in Rust and optimized for Solana’s parallelized runtime, the SPL Token Program is designed for efficiency and scalability, processing thousands of token transactions per second with minimal fees. It integrates seamlessly with other SPL components, such as the Associated Token Account Program (ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL), to simplify token management for wallets, decentralized exchanges, and dApps. As the standard for token operations on Solana, it powers a vast array of applications—from stablecoins and DeFi protocols to digital collectibles—making it an essential building block of the network’s decentralized economy.
This program is the go-to for anyone working with tokens on Solana, and its widespread adoption underscores its reliability and versatility."""
    },
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL":{
        PROGRAM_ADDRESS: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
        LABEL: "Associated Token Account Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The Associated Token Account Program, a utility within the Solana Program Library (SPL) designed to streamline the management of token accounts on the Solana blockchain. In Solana, tokens—such as fungible assets like SPL tokens—are held in accounts separate from a user’s main SOL wallet, and each token type requires its own dedicated account. The Associated Token Account (ATA) Program simplifies this process by providing a deterministic way to create and manage these accounts, ensuring consistency and ease of use across wallets, decentralized applications (dApps), and token interactions.
The program defines a standard method for deriving an "associated token account" address based on a user’s wallet public key and a specific token mint (the unique identifier for a token type). This deterministic derivation eliminates the need for users to manually create token accounts, as the ATA can be automatically generated and funded when needed—typically by wallets or dApps—using a single instruction. The program’s primary function is to create these accounts, ensuring they are owned by the SPL Token Program (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA) and properly initialized to hold tokens. It also supports efficient lookups and interoperability, as any application can reliably calculate the ATA address for a given wallet and mint pair without additional on-chain data.
As part of the SPL suite, the Associated Token Account Program enhances user experience and developer productivity by reducing complexity in token management. Written in Rust and optimized for Solana’s high-throughput environment, it has become a de facto standard for token handling, widely adopted by wallets like Phantom and Solflare, as well as DeFi protocols and NFT platforms. Its simplicity and reliability make it a cornerstone of Solana’s token ecosystem, supporting the network’s vision of scalable, user-friendly blockchain infrastructure.
This program is particularly valuable for anyone interacting with SPL tokens, as it ensures seamless token account creation and compatibility across the Solana network."""
    },
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s": {
        PROGRAM_ADDRESS: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
        LABEL: "Metaplex Token Metadata Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The Metaplex Token Metadata Program is the Metaplex Token Metadata Program, which is one of the core programs in the Solana ecosystem. 
It's the central program that manages metadata for Solana-based tokens and NFTs. 
It allows creators to attach metadata to token mints, enabling rich NFT functionality on Solana. 
This program stores critical information about tokens including: 
    - Name, symbol, and description
    - Creator addresses and verification status
    - Royalty fee information
    - URI pointing to off-chain metadata (images, attributes, etc.)

It's the foundation of the Solana NFT ecosystem and is used by virtually all NFT collections on Solana
The program defines several key account types:

Metadata accounts: Store on-chain metadata for tokens
Master Edition accounts: Control limited editions and supply for NFTs
Edition accounts: Represent editions minted from master editions

It supports features like verified creators, collection validation, and programmable NFTs
This program is maintained by the Metaplex Foundation and has undergone multiple iterations and upgrades"""
    },
    "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr": {
        PROGRAM_ADDRESS: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
        LABEL: "Memo Program v2",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The Memo Program v2, an elegant and lightweight utility within the Solana ecosystem designed to enhance transaction transparency and functionality. This program allows users to attach short, UTF-8 encoded messages—known as "memos"—to their transactions on the Solana blockchain. These memos are logged on-chain, providing a verifiable record that can be inspected by anyone via transaction logs, making it a powerful tool for adding context or metadata to actions on the network.
Built with efficiency in mind, the Memo Program validates the provided memo string and verifies that any associated accounts are signers of the transaction, if specified. It supports a variety of use cases, from simple notes (e.g., "Payment for invoice #123") to more complex applications like compliance tracking or associating transactions with off-chain data. The program logs the memo alongside any verified signer addresses, ensuring clarity and auditability. With a compute budget that balances memo length and signer count—supporting up to 566 bytes of single-byte UTF-8 in an unsigned instruction—it’s both flexible and practical for developers and users alike. Written in Rust and part of the Solana Program Library (SPL), the Memo Program v2 exemplifies Solana’s commitment to providing scalable, developer-friendly tools for building decentralized applications.
This program is widely used across the Solana network, including in wallets, decentralized exchanges, and other dApps, due to its simplicity and utility in adding human-readable context to otherwise opaque blockchain transactions."""
    },
    "ComputeBudget111111111111111111111111111111": {
        PROGRAM_ADDRESS: "ComputeBudget111111111111111111111111111111",
        LABEL: "Compute Budget Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The Compute Budget Program, a vital system program within the Solana blockchain ecosystem designed to manage and optimize the computational resources used during transaction processing. Solana’s high-performance architecture relies on a compute budget—a finite amount of computational units (measured in "compute units" or CU)—to ensure that transactions execute efficiently and predictably within the network’s sub-second block times. This program allows users and developers to explicitly configure the resources their transactions require, balancing cost, speed, and complexity.
The Compute Budget Program enables two primary instructions: Request Units and Request Heap Frame. With "Request Units," users can specify the maximum number of compute units a transaction can consume (up to a block-wide cap, currently around 12 million CU as of early 2025) and set a higher prioritization fee (in microlamports per CU) to improve the transaction’s chances of being included in a block during periods of network congestion. The "Request Heap Frame" instruction, meanwhile, allows programs to request additional memory (up to 256 KiB) for complex operations, catering to advanced use cases like large data processing within a single transaction. These settings give developers fine-grained control over transaction execution, ensuring that resource-intensive operations—like those in decentralized finance (DeFi) or gaming—can be tailored to succeed without overburdening the network.
As a native system program, the Compute Budget Program plays a crucial role in Solana’s scalability, enabling the blockchain to process thousands of transactions per second while maintaining low costs and high throughput. Written in Rust and tightly integrated with Solana’s runtime, it reflects the network’s commitment to flexibility and performance, empowering users to optimize their interactions with the blockchain based on their specific needs.
This program is especially useful for developers building dApps or users submitting transactions during high-traffic periods, as it provides a way to prioritize and manage resource allocation effectively. Let me know if you’d like more details or examples of its use!"""
    },
    "Vote111111111111111111111111111111111111111": {
        PROGRAM_ADDRESS: "Vote111111111111111111111111111111111111111",
        LABEL: "Vote Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The Vote Program, a core component of the Solana blockchain’s consensus mechanism, specifically designed to facilitate validator voting within its Proof-of-Stake (PoS) system. This program is integral to Solana’s high-performance architecture, enabling validators—nodes responsible for securing the network—to cast votes on the validity of blocks and participate in the consensus process. These votes are recorded on-chain, contributing to the network’s agreement on the state of the blockchain and ensuring its security and decentralization.
The Vote Program manages the lifecycle of validator vote accounts, which are created and maintained by validators to submit their votes. It supports key operations such as initializing vote accounts, submitting votes for specific slots (representing points in the blockchain’s timeline), withdrawing accumulated stake or rewards, and updating validator identities or commission rates. Each vote is cryptographically signed by the validator’s keypair, ensuring authenticity, and is processed efficiently within Solana’s parallelized runtime. The program also interacts with the Solana Stake Program to allocate voting power proportional to a validator’s staked SOL, reinforcing the PoS model where influence scales with commitment to the network.
As a foundational system program, the Vote Program underpins Solana’s ability to achieve rapid consensus—capable of confirming blocks in under a second—while maintaining robustness against forks or malicious actors. Written in Rust and optimized for performance, it exemplifies Solana’s design philosophy of scalability and reliability, making it a critical tool for validators and a cornerstone of the network’s operational integrity.
This program is primarily relevant to validators and those interested in Solana’s consensus mechanics, but it indirectly benefits all users by ensuring the blockchain remains secure and trustworthy."""
    },
    "Stake11111111111111111111111111111111111111": {
        PROGRAM_ADDRESS: "Stake11111111111111111111111111111111111111",
        LABEL: "Stake Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The Stake Program is one of Solana's core native programs that manages the blockchain's proof-of-stake mechanism.
It's a fundamental system program with a special address that handles all staking operations on Solana.
    It manages the delegation of SOL tokens to validators, which is essential for Solana's proof-of-stake consensus.
    - The program handles critical functions including:
    - Creation and management of stake accounts
    - Delegation of stake to validators
    - Activation and deactivation of stake
    - Distribution of staking rewards
    - Stake splitting and merging operations
It enforces the stake warmup and cooldown periods, which control how quickly stake becomes active or can be withdrawn.
The program defines stake states (inactive, activating, active, deactivating) and manages transitions between them.
As a native program, it has special privileges within the Solana runtime and is integrated directly into the validator software.
It's one of the most frequently used programs on Solana, as staking is a fundamental economic activity on the network."""
    },
    "KeccakSecp256k11111111111111111111111111111": {
        PROGRAM_ADDRESS: "KeccakSecp256k11111111111111111111111111111",
        LABEL: "Secp256k1 Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: "System program for verifying Ethereum-compatible signatures"
    },
    "Ed25519SigVerify111111111111111111111111111": {
        PROGRAM_ADDRESS: "Ed25519SigVerify111111111111111111111111111",
        LABEL: "Ed25519 Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""System program for verifying for verifying ed25519 signatures. 
It takes an ed25519 signature, a public key, and a message. Multiple signatures can be verified. If any of the signatures fail to verify, an error is returned."""
    },
    "BPFLoader1111111111111111111111111111111111": {
        PROGRAM_ADDRESS: "BPFLoader1111111111111111111111111111111111",
        LABEL: "BPF Loader",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The BPF Loader program  is an older version of Solana's program loaders that was used in the earlier days of the Solana blockchain.
It was designed to deploy non-upgradeable programs (smart contracts) on Solana. 
Unlike the BPFLoaderUpgradeable, programs deployed through this loader cannot be modified after deployment. 
It compiles and loads programs written in languages like Rust into BPF (Berkeley Packet Filter) bytecode that runs on Solana validators. 
This loader is considered legacy and has been largely superseded by BPFLoaderUpgradeable for most use cases. 
Programs deployed with this loader have the advantage of using less compute resources for deployment but lack flexibility for updates. 
It was commonly used in the early days of Solana development before upgradeability became a standard requirement"""
    },
    "BPFLoader2111111111111111111111111111111111": {
        PROGRAM_ADDRESS: "BPFLoader2111111111111111111111111111111111",
        LABEL: "BPF Loader 2",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The BPF Loader 2 program is an intermediate version of Solana's program loaders, positioned between the original BPFLoader and the current BPFLoaderUpgradeable.  
It deploys non-upgradeable programs (smart contracts) on Solana with improved functionality over the original BPFLoader.
Programs deployed through this loader cannot be modified after deployment, making them immutable.
It introduced improvements over the original BPFLoader including better error handling and more efficient deployments.
Like other BPF loaders, it compiles and loads programs written in languages like Rust into BPF (Berkeley Packet Filter) bytecode that runs on Solana validators.
While more advanced than the original BPFLoader, it lacks the upgradeability features of BPFLoaderUpgradeable.
It represents an evolutionary step in Solana's program deployment infrastructure"""
    },
    "BPFLoaderUpgradeab1e11111111111111111111111": {
        PROGRAM_ADDRESS: "BPFLoaderUpgradeab1e11111111111111111111111",
        LABEL: "BPF Loader Upgradeable",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The BPF Loader Upgradeable program is a crucial system program in the Solana ecosystem that handles deployable programs on the blockchain. 
It allows for the deployment and upgrading of smart contracts (programs) on Solana.
Unlike the standard BPFLoader, this version supports upgradeable programs, meaning developers can update their smart contracts after deployment. 
Programs deployed through this loader have an 'upgrade authority' that controls who can modify the program. 
It compiles and loads programs written in languages like Rust into BPF (Berkeley Packet Filter) bytecode, which is the format executed by Solana validators. 
The upgradeable nature makes it popular for development as it allows bugs to be fixed and features to be added without deploying entirely new programs. 
It manages the program data accounts that store the compiled BPF bytecode."""
    },
    "LoaderV411111111111111111111111111111111111": {
        PROGRAM_ADDRESS: "LoaderV411111111111111111111111111111111111",
        LABEL: "BPF Loader V4",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The BPF Loader V4 program is a newer version of Solana's program loaders that was introduced to support the latest features and improvements in the Solana ecosystem.
It serves as a specialized system program responsible for loading, managing, and executing user-deployed programs written in languages like Rust, compiled to BPF bytecode. This loader enables developers to deploy custom programs to the Solana network, upgrade them as needed (if an upgrade authority is retained), and finalize them into an immutable state when desired. Unlike earlier loader versions, V4 introduces enhanced capabilities for program lifecycle management, including deploying new programs, redeploying or upgrading existing ones, transferring program authority, and closing program accounts when they are no longer needed. As Solana’s architecture separates program logic from state, the BPF Loader V4 ensures seamless interaction between executable code and the runtime, making it a foundational tool for developers building decentralized applications on Solana’s high-performance network.
This loader is poised to become a standard in Solana’s ecosystem due to its flexibility and robust feature set, supporting the network’s goal of providing a scalable and developer-friendly platform for decentralized applications."""
    },
    "NativeLoader1111111111111111111111111111111": {
        PROGRAM_ADDRESS: "NativeLoader1111111111111111111111111111111",
        LABEL: "Native Loader",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The Native Loader program is a special program that is the owner of most native Solana programs. 
It's one of Solana's core system programs with a special address (111...111). 
It's responsible for loading and executing other native programs in the Solana runtime. 
Unlike regular on-chain programs deployed as BPF (Berkeley Packet Filter) programs, native programs are compiled directly into the Solana validator software. 
These native programs have special privileges and direct access to the runtime that deployed programs don't have. 
Examples of programs loaded by NativeLoader include the System Program, Stake Program, Vote Program, and other fundamental programs that form Solana's foundation."""
    },
    "Config1111111111111111111111111111111111111": {
        PROGRAM_ADDRESS: "Config1111111111111111111111111111111111111",
        LABEL: "Config Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The Config program allows for storing and retrieving configuration data that needs to be accessible across the blockchain. 
It's used to store various types of network-wide configuration settings and parameters. 
Common usages include storing validator fee structures, rent tables, and other system-wide configuration parameters. 
Like other native programs, it's loaded by the NativeLoader and has privileged access to the Solana runtime"""
    },
    "ALTNSZ46uaAUU7XUV6awvdorLGqAsPwa9shm7h4uP2FK": {
        PROGRAM_ADDRESS: "ALTNSZ46uaAUU7XUV6awvdorLGqAsPwa9shm7h4uP2FK",
        LABEL: "Solana Name Service (SNS) Auction Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The Solana Name Service (SNS) Auction Program, a specialized component of the Solana blockchain ecosystem designed to facilitate the decentralized auctioning of .sol domain names. Built as part of the broader Solana Name Service (sometimes referred to as Bonfida’s SNS), this program enables users to bid on and acquire human-readable domain names that map to Solana wallet addresses, enhancing usability and branding within the network. By providing a mechanism for competitive bidding, it ensures fair and transparent allocation of these valuable digital assets.
The SNS Auction Program operates by managing auctions for .sol domains, allowing participants to place bids in SOL during a predefined auction period. Key functionalities include initializing auctions, processing bids, determining winners based on the highest offer, and finalizing the transfer of domain ownership to the winning bidder’s wallet. Once acquired, these domains are registered under the Solana Name Service, which uses a separate program (typically namesLPneVptA9w8WvRpGVhAiTDDVPdxPVnCmRpBrpPJsp) to map them to addresses or other data, such as IPFS links or social handles. The auction process leverages Solana’s high-speed runtime to handle bids efficiently, ensuring low latency and minimal fees even during high-demand auctions.
Developed in Rust and integrated with Solana’s ecosystem, the Solana Name Service Auction Program reflects the network’s focus on user-friendly infrastructure and decentralized innovation. It plays a key role in the growing adoption of .sol domains, which are used for everything from simplified wallet payments to NFT branding and DeFi identity management. By combining the thrill of auctions with the utility of name services, this program enhances Solana’s appeal as a versatile and accessible blockchain platform.
This program is particularly relevant for users and developers interested in acquiring or building with .sol domains, offering a gateway to a more intuitive and personalized Solana experience."""
    },
    "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX": {
        PROGRAM_ADDRESS: "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX",
        LABEL: "Solana Name Service (SNS) Registry Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""The Solana Name Service (SNS) Registry Program, a core component of the Solana blockchain ecosystem that powers the registration, management, and resolution of .sol domain names. Developed as part of the Solana Name Service (commonly linked to Bonfida), this program provides a decentralized naming system, allowing users to associate human-readable names (e.g., “alice.sol”) with Solana wallet addresses, IPFS hashes, or other data. It enhances the network’s usability by replacing cryptic public keys with memorable identifiers, streamlining payments, identity management, and dApp interactions.
The SNS Registry Program manages the lifecycle of .sol domains through a robust set of instructions. It handles domain registration (linking a name to an owner’s wallet), record updates (mapping the domain to an address or additional metadata), transfers of domain ownership, and renewals to maintain active status (domains typically require annual renewal fees in SOL to cover rent). The program stores domain data in on-chain accounts, using a hierarchical structure where top-level domains (like .sol) and subdomains are governed by specific authorities. It also supports reverse lookups, enabling queries to retrieve the domain name tied to a given address, a feature that enhances wallet and dApp interoperability.
Built in Rust and optimized for Solana’s high-throughput environment, the Solana Name Service Registry Program works in tandem with the SNS Auction Program (ALTNSZ46uaAUU7XUV6awvdorLGqAsPwa9shm7h4uP2FK) to allocate new domains via bidding while providing the infrastructure to manage them post-auction. Its adoption spans wallets (e.g., Phantom, Solflare), DeFi platforms, and NFT projects, where .sol domains serve as both practical tools and digital branding assets. By offering a decentralized alternative to traditional DNS, this program underscores Solana’s commitment to scalable, user-centric blockchain solutions.
This program is essential for anyone using or building with .sol domains, making Solana more accessible and personalized.."""
    },
    "FEE": {
        PROGRAM_ADDRESS: "FEE",
        LABEL: "Fee Collector",
        ICON: "/fee.png",
        WEBSITE: "https://solana.com/en",
        DESCRIPTION: 
"""Solana transaction fees break down into a small mandatory base fee—paid in lamports per signature and per compute‐unit budget—and an optional priority fee (a “tip”) that users attach via the ComputeBudgetProgram to request more compute units at a specified micro-lamports-per-unit price. The base fee covers the network’s fixed costs (signing, data storage, account locks) and is set so that each signature costs 5,000 lamports; half of that amount is burned forever and half goes to the validator who produces the block . If the network is busy, users can include a priority fee calculated as “compute-unit limit × compute-unit price,” which goes entirely to the validator to incentivize faster inclusion . Following governance changes (SIMD-0096), all priority fees now accrue 100 % to validators rather than being split . Total cost per transaction is therefore the sum of the base fee (5,000 lamports × signatures) and any chosen priority fee (CU_limit × CU_price)."""
    },
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb": {
        PROGRAM_ADDRESS: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
        LABEL: "Token 2022 Program",
        ICON: "https://spl.solana.com/img/favicon.ico",
        WEBSITE: "https://spl.solana.com/token-2022",
        DESCRIPTION: 
"""The Token 2022 Program, an evolution of Solana’s original token standard, redefines digital asset management with enhanced flexibility, security, and programmability. As a core upgrade to the SPL Token Program, it extends Solana’s token capabilities far beyond basic minting and transfers, introducing features purpose-built for modern DeFi, NFT, and tokenized ecosystems.

Engineered for next-generation token use cases, the Token 2022 Program enables developers to create fungible and non-fungible assets with a rich suite of advanced configurations. Key functionalities include transfer fees, confidential transfers (with zero-knowledge support), permanent and non-permanent freezing of token accounts, extended metadata, programmable hooks, and advanced minting controls—allowing tokens to behave like programmable money or dynamic access rights. It supports multiple authorities (e.g., mint, freeze, transfer) and precision configurations to suit everything from stablecoins to gamified loyalty points.

Written in Rust and tightly integrated into the Solana runtime, Token 2022 is optimized for performance and composability. It maintains compatibility with existing Solana tooling while offering opt-in upgrades over the legacy SPL Token Program. This ensures that developers can progressively adopt Token 2022 features without compromising user experience or security.

At its core, the Token 2022 Program embodies Solana’s commitment to pushing blockchain boundaries—empowering developers to build expressive financial primitives, smart token systems, and adaptive digital assets at scale. Whether powering novel DAO mechanisms, confidential assets, or multi-token ecosystems, it provides the foundational toolkit for the next era of on-chain innovation.

As an official program maintained by the Solana Foundation, Token 2022 represents the future of token infrastructure on Solana—modular, secure, and future-ready."""
    }
}