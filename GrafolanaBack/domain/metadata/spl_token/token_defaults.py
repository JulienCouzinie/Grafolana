from dataclasses import dataclass
from typing import Dict, NamedTuple


class TokenDefaults(NamedTuple):
    name: str
    image_path: str
    description: str
    symbol: str = None
    decimals: int = None
    website: str = None

# Default metadata for known tokens
TOKEN_DEFAULTS: Dict[str, TokenDefaults] = {
    "SOL": TokenDefaults(
        name="Solana",
        symbol="SOL",
        decimals=9,
        description="Native token of the Solana blockchain",
        image_path="/logo/sol.svg",
        website="https://solana.com",
    ),
    "So11111111111111111111111111111111111111112": TokenDefaults(
        name="Wrapped SOL",
        description="Wrapped SOL (wSOL) is a token on the Solana blockchain that represents native SOL in the form of an SPL token (the native token protocol on Solana). It allows you to use SOL in contexts that require SPL tokens, such as decentralized exchanges or other DeFi applications that interact with token pools.",
        image_path="/logo/wsol.webp",
    ),
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": TokenDefaults(
        name="USDC",
        image_path="/logo/usdc.png",
        description="USDC is a stablecoin whose value is pegged to the US dollar.",
    ),
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": TokenDefaults(
        name="USDT",
        image_path="/logo/usdt.svg",
        description="USDT is a stablecoin whose value is pegged to the US dollar.",
    ),
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So": TokenDefaults(
        name="mSOL",
        image_path="/logo/msol.webp",
        description="mSOL is a liquid staking token that you receive when you stake SOL on the Marinade protocol. These mSOL tokens represent your staked SOL tokens in Marinade's stake pool.",
        website="https://docs.marinade.finance/getting-started/what-is-msol",
    ),
    "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": TokenDefaults(
        name="stSOL",
        image_path="/logo/stsol.webp",
        description="stSOL is the liquid token that represents your share of the total SOL pool deposited with Lido. As soon as you delegate to the pool, you receive the newly minted stSOL. Over time, as your SOL delegation accrues rewards, the value of your stSOL appreciates. There is no waiting time for receiving stSOL tokens.",
        website="https://lido.fi/solana",
    ),
    "StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT": TokenDefaults(
        name="STEP",
        image_path="/logo/step.webp",
        description="STEP is the native token of the Step finance platform. Token holders can utilize STEP tokens to make transactions on the STEP protocol. Also, when users stake STEP, they receive xSTEP in return. xSTEP is an SPL (Solana program library) token that users can trade, move or utilize in any other protocol. The xSTEP represents over and above the staked amount. The staking contract distributes STEP to the token holders. The platform burns the tokens to ensure that a small number of people don’t own a huge amount of token supply.  The act of transferring a token to an account that can only receive them in order to permanently remove the tokens from the supply is known as 'Burning' or 'Coin Burning' in cryptocurrency. Platform users can supply and borrow STEP tokens on the lending protocol and earn interest.",
        website="https://www.step.finance/",
    ),
}