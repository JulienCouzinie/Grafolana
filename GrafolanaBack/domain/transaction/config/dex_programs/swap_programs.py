from typing import Optional, List, Dict, Tuple
from dataclasses import dataclass

from GrafolanaBack.domain.transaction.config.constants import BURN, MINTTO
from GrafolanaBack.domain.transaction.config.dex_programs.dex_program_struct import *
from GrafolanaBack.domain.transaction.config.dex_programs.sol_infer import InnerInstructionSolTransferInference, NativeSolTransferInference, SwapInstructionSolTransferInference


# # DEAD
# CREMA_FINANCE_2 = "6MLxLqiXaaSUpkgMnWDTuejNZEz3kE7k2woyHGVFw319"    # DEAD
# CYKURA = "cysPXAjehMpVKUapzbMCCnpFxUFFryEWEaLgnb9NrR8" # DEAD
# DRADEX = "dp2waEWSBy5yKmq65ergoU3G6qRLmqa6K7We4rZSKph"  # DEAD
# GOOSE_FX_V2 = "GFXsSL5sSaDfNFQUYsHekbWBW1TsFdjDYzACh62tEHxn" # DEAD
# GOOSEFX = "7WduLbRfYhTJktjLw5FDEyrqoEv61aTTCuGAetgLjzN5"    # DEAD
# LIFINITY = "EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S" # DEAD
# RAYDIUM_LIQUIDITY_POOL_V3 = "27haf8L6oxUeXrHrgEgsexjSY5hbVUWEmvv9Nyxg8vQv" # DEAD
# 1SOL 1SoLTvbiicqXZ3MJmnTL2WYXKLYpuxwHpa4yYrVQaMZ # DEAD
# ('jupiter_v6', 'DEX', 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
#     ('spl_token', 'Tooling', 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
#     ('system_program', 'System', '11111111111111111111111111111111'),
#     ('Compute Budget', 'System', 'ComputeBudget111111111111111111111111111111'),
#     ('Unknown', 'Unknown', 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV'),
#     ('State Compression Program', 'Tooling', 'cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK'),
#     ('bubblegum', 'NFT', 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY'),
#     ('raydium_amm', 'DEX', '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'),
#     ('spl_atoken', 'Tooling', 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
#     ('phoenix_v1', 'DEX', 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY'),
#     ('pumpdotfun', 'Memecoins', '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'),
#     ('Zeta Serum', 'Perpetuals', 'zDEXqXEG7gAyxb1Kg9mK5fPnUdENCGKzWrM21RMdWRq'),
#     ('Jupiter DCA', 'DEX', 'DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M'),
#     ('zeta', 'Perpetuals', 'ZETAxsqBRek56DhiGXrn75yj2NHU3aYUnxvHXpkf3aD'),
#     ('Memo Program v2', 'Tooling', 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
#     ('Sequence Enforcer', 'Tooling', 'GDDMwNyyx8uB6zrqwBFHjLLG3TBYk2F8Az4yrQC5RzMp'),
#     ('Unknown', 'Unknown', 'darehJcMJFk833wzHe76pFyGPyTNzeN4yQNKTRw8wJM'),
#     ('Unknown', 'Unknown', '3yeHviKJMhtJKNVUtQuvUQS4TW5iLYGZ4xN3zCPPDtfn'),
#     ('openbook_v2', 'DEX', 'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb'),
#     ('whirlpool', 'DEX', 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'),
#     ('Meteora dlmm', 'DEX', 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'),
#     ('meteora', 'DEX', 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'),
#     ('drift_v2', 'Perpetuals', 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH'),
#     ('spl_token_2022', 'Tooling', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'),
#     ('raydium_cp', 'DEX', 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C'),
#     ('monaco_protocol', 'Gambling', 'monacoUXKtUi6vKsQwaLyxmXKSievfNWEcYXTgkbCih'),
#     ('raydium_clmm', 'DEX', 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'),
#     ('Unknown', 'Unknown', 'XXXaoN1GUF9895Tf9ojksGiGJa37F5op23QTYPvUH5H'),
#     ('jito_tip_distribution', 'Tooling', '4R3gSG8BpU4t19KYj8CfnbtRpnT8gtk4dvTHxVRwc2r7'),
#     ('Solfi', 'Lending', 'SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe'),
#     ('Sage V2', 'DEX', 'SAGE2HAwep459SNq61LHvjxPk4pLPEJLoMETef7f7EE'),
#     ('OKX', 'DEX', '6m2CDdhRgxpH4WjvdzxAYbGxwdGUz5MziiL5jek2kBma'),
#     ('Unknown', 'Unknown', 'HQ2UUt18uJqKaQFJhgV9zaTdQxUZjNrsKFgoEDquBkcx'),
#     ('marginfi', 'Staking', 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA'),
#     ('Star Atlas CARGO', 'Gaming', 'Cargo2VNTPPTi9c1vq1Jw5d3BWUNr18MjRtSupAghKEk'),
#     ('meteora_pools', 'DEX', 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB'),
#     ('Point Network', 'Tooling', 'Point2iBvz7j5TMVef8nEgpmz4pDr7tU7v3RjAfkQbM'),
#     ('Unknown', 'Unknown', '9XFCiGhW1Pkx7rGgNcMH3S9bqDjKwgjqqM2cb2YdzpJ3'),
#     ('Unknown', 'Unknown', '4pP8eDKACuV7T2rbFPE8CHxGKDYAzSdRsdMsGvz2k4oc'),
#     ('lifinity_amm_v2', 'DEX', '2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c'),
#     ('Account Compression Program', 'Tooling', 'compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq'),
#     ('Light System Program', 'Tooling', 'SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7'),
#     ('flash_trade', 'DEX', 'FLASH6Lo6h3iasJKWDs2F8TkW2UKf3s15C8PMGuVfgBn'),
#     ('light', 'Tooling', 'cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m'),
#     ('Unknown', 'Unknown', '8BR3zs8zSXetpnDjCtHWnkpSkNSydWb3PTTDuVKku2uu'),
#     ('Unknown', 'Unknown', 'BSfD6SHZigAfDWSjzD5Q41jw8LmKwtmjskPH9XW1mrRW'),
#     ('Unknown', 'Unknown', 'AFW9KCZtmtMWuhuLkF5mLY9wsk7SZrpZmuKijzcQ51Ni'),
#     ('Unknown', 'Unknown', 'paLua3ERYqP6Yx3UMF2U4ex8Jdek3Wjg57jtPCaHs9G'),
#     ('Unknown', 'Unknown', 'HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny'),
#     ('Chainlink Program', 'Tooling', 'cjg3oHmg9uuPsP8D6g29NWvhySJkdYdAo9D25PRbKXJ'),
#     ('meteora_vault', 'DEX', '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi'),
#     ('Raydium AMM Route', 'DEX', 'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS'),
#     ('Unknown', 'Perpetuals', 'G6EoTTTgpkNBtVXo96EQp2m6uwwVh2Kt6YidjkmQqoha'),
#     ('jupiter', 'DEX', 'PERPHjGBqRHArX4DySjwM6UJHiR3sWAatqfdBS2qQJu'),
#     ('Unknown', 'Unknown', 'ETXGsewWXmdDmaLxBv9n3iVn5CaP5UhSWouU5GUaPhQb'),
#     ('mango_v4', 'Perpetuals', '4MangoMjqJ2firMokCjjGgoK8d4MXcrgL7XJaL3w6fVg'),
#     ('Wormhole Program', 'Bridge', 'HDwcJBJXjL9FpJ7UBsYBtaDjsBUhuLCUYoz3zr8SWWaQ'),
#     ('Unknown', 'Unknown', 'DoVEsk76QybCEHQGzkvYPWLQu9gzNoZZZt3TPiL597e'),
#     ('Parcl Pyth', 'Perpetuals', 'PaRCLKPpkfHQfXTruT8yhEUx5oRNH8z8erBnzEerc8a'),
#     ('Unknown', 'Unknown', 'CxvksNjwhdHDLr3qbCXNKVdeYACW8cs93vFqLqtgyFE5'),
#     ('Trojan', 'Trading Bot', 'tro46jTMkb56A3wPepo5HT7JcvX9wFWvR8VaJzgdjEf'),
#     ('Unknown', 'MEV', 'vpeNALD89BZ4KxNUFjdLmFXBCwtyqBDQ85ouNoax38b'),
#     ('Unknown', 'Unknown', 'vo1tWgqZMjG61Z2T9qUaMYKqZ75CYzMuaZ2LZP1n7HV'),
#     ('Pyth', 'Tooling', 'pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT'),
#     ('jupiter', 'DEX', 'j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X'),
#     ('Stable Swap', 'DEX', 'swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ'),
#     ('Unknown', 'Unknown', '6753FE9MXMv68A5T3Tqp465MHi1wsFSw6beEUM7nPVJf'),
#     ('pyth rec', 'Tooling', 'rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ'),
#     ('Unknown', 'Unknown', '2TQ4a9igqmz91BtHjnAk5hk7JjVuRwyQBsQfrGGpcXYK'),
#     ('tensor_cnft', 'NFT', 'TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp'),
#     ('Phoenix Seat Manager', 'Tooling', 'PSMxQbAoDWDbvd9ezQJgARyq6R9L5kJAasaLDVcZwf1'),
#     ('switchboard_v2', 'Tooling', 'SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f'),
#     ('magic_eden', 'NFT', 'mmm3XBJg5gk8XJxEKBvdgptZz6SgK4tXvn36sodowMc'),
#     ('Lighthouse', 'Security', 'L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95'),
#     ('mpl_token_metadata', 'NFT', 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
#     ('Unknown', 'Unknown', '6NqvgVtc3S6C7LfYkjCxP3VeDf2sy9S69NkhRkJV17Vp'),
#     ('Tensor Bid', 'NFT', 'TB1Dqt8JeKQh7RLDzfYDJsq8KS4fS2yt87avRjyRxMv'),
#     ('Sol Incinerator', 'Memecoins', 'F6fmDVCQfvnEq2KR8hhfZSEczfM9JK9fWbCsYJNbTGn7'),
#     ('Unknown', 'Unknown', 'TT1eRKxi2Rj3oEvsFMe9W5hrcPmpXqKkNj7wC83AhXk'),
#     ('Neon EVM', 'Tooling', 'NeonVMyRX5GbCrsAHnUwx1nYYoJAtskU1bWUo6JGNyG'),
#     ('Unknown', 'Unknown', 'EspF2G85CDschNBBrzCARnrmykGAbwDjjzQE1DQXXGLx'),
#     ('magic_eden', 'NFT', 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K'),
#     ('Secp256k1 Program', 'System', 'KeccakSecp256k11111111111111111111111111111'),
#     ('Unknown', 'Unknown', 'BumpNkZQdRMJpyCqajBaBpJhUtZ6p8cMcF5xjGapcHDf'),
#     ('jito_tip_payment', 'Tooling', 'T1pyyaTNZsKv2WcRAB8oVnk93mLJw2XzjtVYqCsaHqt'),
#     ('Unknown', 'Unknown', '5mpjDRgoRYRmSnAXZTfB2bBkbpwvRjobXUjb4WYjF225'),
#     ('Unknown', 'Unknown', '7K3UpbZViPnQDLn2DAM853B9J5GBxd1L1rLHy4KqSmWG'),
#     ('Unknown', 'Unknown', 'xxyy4PmbPj4SWpAwBeMTyDBusjms5r4YtAZTaDjdLjy'),
#     ('Maestro', 'Trading Bot', 'MaestroAAe9ge5HTc64VbBQZ6fP77pwvrhM8i1XWSAx'),
#     ('Unknown', 'Unknown', 'NoVA1TmDUqksaj2hB1nayFkPysjJbFiU76dT4qPw2wm'),
#     ('Unknown', 'Unknown', '8Gc5RgHx5X9gHgZu3yEMY14cUpTiXrnVM81X2tsEwAGG'),
#     ('fluxbeam', 'DEX', 'FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1X'),
#     ('stake_program', 'System', 'Stake11111111111111111111111111111111111111'),
#     ('moonshot', 'Memecoins', 'MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG'),
#     ('Unknown', 'Trading Bot', 'JSW99DKmxNyREQM14SQLDykeBvEUG63TeohrvmofEiw'),
#     ('Star Atlas CRAFT', 'Gaming', 'CRAFT2RPXPJWCEix4WpJST3E7NLf79GTqZUL75wngXo5'),
#     ('bpf_loader_upgradeable', 'System', 'BPFLoaderUpgradeab1e11111111111111111111111'),
#     ('Unknown', 'DEX', '45wPVSFEiEyqRiMWjkqdrZLddb5fqiuP3haKU9DAFWMP'),
#     ('Unknown', 'DEX', '3s1rAymURnacreXreMy718GfqW6kygQsLNka1xDyW8pC'),
#     ('Star Atlas APR1M', 'Gaming', 'APR1MEny25pKupwn72oVqMH4qpDouArsX8zX4VwwfoXD')

# MARGINIFY MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA
# Does some lending, I won't care


# # NOT USED
# BULLX_FEE = "4pP8eDKACuV7T2rbFPE8CHxGKDYAzSdRsdMsGvz2k4oc" 
# BULLX_PREPARE_ORDER = "AFW9KCZtmtMWuhuLkF5mLY9wsk7SZrpZmuKijzcQ51Ni"
# JUPITER_DCA_PROGRAM_ID = "DCAK36VfExkPdAkYUQg6ewgxyinvcEyPLyHjRbmveKFw"

# # FEE WALLETS
# AXIOMA_WALLET = "7LCZckF6XXGQ1hDY6HFXBKWAtiUgL9QY5vj1C4Bn1Qjj"
# SNIPEROO = "35FqEd7RUgnuXyuoyqjLVMR3cRaiUsbSvHA6Pyu88eM9"


# Probable BOTS to detect
#  6NqvgVtc3S6C7LfYkjCxP3VeDf2sy9S69NkhRkJV17Vp
#  AL8shhM5f2o4QHkjBuntZgAw9Rrwan5PDHt8eX1Le974 wraps known swaps so should be detected as Unknown -> Good for Unknown tests 


# DEX TO ADD
# CxvksNjwhdHDLr3qbCXNKVdeYACW8cs93vFqLqtgyFE5  61vWmpdSM4NpMa6K6p3t2t1iwDq4yBKiRiMp8zd4GwZ9Yu6vvpNgpawW6zrRpk9EwwJZnyuEDfu4iEGm1U74iwFt
#
# Sencha, "under developpement" with one user, to check sometimes.. : SCHAtsf8mbjyjiv4LkhLKutTf6JnZAbdJKFkXQNMFHZ
# Raydium AMM Routing routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS


# Check MEVbit1CZN1oHXJkcKDNkFmFSMczHVZYnJQpYgGZSnF, might be prone to ATA Hijacking



swap_programs_data = {
    "ALDRIN_AMM": {
        PROGRAM_ADDRESS: "AMM55ShdkoGRB5jVYPjWziwk8m5MpwyDgsMWHaMSQWH6",
        LABEL: "Aldrin AMM",
        ROUTER: False,
        ICON: "https://s2.coinmarketcap.com/static/img/coins/200x200/10935.png",
        WEBSITE: "https://x.com/aldrin_labs",
        INSTRUCTION_PARSE_PARAM: [
            # Transaction: kHbMNvYHmNQna83u1agbNMXpFgp3wsHwdNUpkAuAhmp8o9i4KxjMNfDtqy27Z2f6e8DSA6M9P4K7nDZU2ftoSMc
            {
                INSTRUCTION_NAME: "swap",
                INSTRUCTION_NAME: "swap",
                TERMINATOR : "0",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 8, 
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 7,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,  
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4 
            },
            # Transaction: ANdtPQ5zGfkWkN4jDNms6kVo4VKgU4zYi4pfjHwLRYUPxDjyTCvqvDgRLhqBJ7HzTutVZCrghe9Dya2LRgaKx3Q
            {
                INSTRUCTION_NAME: "swap",
                TERMINATOR : "1",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 7, 
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 8,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,  
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3 
            }
        ]
    },
    "ALDRIN_AMM_V2": {
        # Transaction: 4f92pMpvWjiobvh4uF1xkJPZ44THiDXNaSd1Mt2j2RXV5jZaUJfJMiPNPbvsmythHhG6fEZKhYapkCpWc9MEXeZF
        PROGRAM_ADDRESS: "CURVGoZn8zycx6FXwwevgBTB2gVvdbGTEpvMJDbgs2t4",
        LABEL: "Aldrin AMM V2",
        ICON: "https://s2.coinmarketcap.com/static/img/coins/200x200/10935.png",
        WEBSITE: "https://x.com/aldrin_labs",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                INSTRUCTION_NAME: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 8,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 7,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            }
        ]
    },
    "AXIOM": { # Only BUY on pumpfun here
        # Transaction: 2GCxryLmQ8f6fRuxUZucFcDVMgEECnFcHMHzF76kvsTGZj64Mp2ZnRbRwgJNobcJNU5Q46H7mJ9aXVnhieBXDXTi
        PROGRAM_ADDRESS: "Axioma2rR4DWuvobyz9eQxsg6acNY9shj3u7gnjK3DSV",
        LABEL: "Axiom",
        ICON: "https://axiom.trade/images/axiom-logo-mark.svg",
        WEBSITE: "https://axiom.trade",
        ROUTER: True,
        INSTRUCTION_PARSE_PARAM: [
            {
                INSTRUCTION_NAME: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 7,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            }
        ]
    },
    
    "BANANA_GUN_BOT": { # WRAP ONLY PUMPFUN 
        # Transaction: 5ZFPQHYNNGuV4fzP5GR9YWdhwnKG2MZ6KRZFJwyGmuesHEtyoioNNVva1HDsMewmKE3EhBoT3w4Vn1hJDxKsLMEo
        PROGRAM_ADDRESS: "BANANAjs7FJiPQqJTGFzkZJndT9o7UmKiYYGaJz6frGu",
        LABEL: "Banana Gun Bot",
        ROUTER: True,
        ICON: "https://bananagun.io/favicon-32x32.png",
        WEBSITE: "https://bananagun.io/",
        INSTRUCTION_PARSE_PARAM: [
            {
                DISCRIMINATOR: "0dc0a746106b3b6a",
                LABEL: "Swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 11,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 10
            }
        ]
    },
    "BLOOM_BOT": { # Router 
        PROGRAM_ADDRESS: "b1oomGGqPKGD6errbyfbVMBuzSC8WtAAYo8MwNafWW1",
        LABEL: "Bloom Bot",
        ICON: "https://solana.bloombot.app/~gitbook/image?url=https%3A%2F%2F694717969-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Forganizations%252Fw9q0dGZ4uiKUVNeKq5DJ%252Fsites%252Fsite_BCB7g%252Ficon%252FWFxWz3r2LSXTddU0VbDL%252Flogo%2520rounded.png%3Falt%3Dmedia%26token%3Dc68911a2-ca51-407f-8175-6c3118bbaaa9&width=32&dpr=1&quality=100&sign=9a3d1358&sv=2",
        WEBSITE: "https://solana.bloombot.app/",
        ROUTER: True,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 5eEwWPSLhXpVDK2a39uKfsyUQR6nZdeymHobgTDeGRsnH3mQ3cQXGWBjBAMXnpQFJ7dL1XTgp4SczFQAkb5X1Q7G
            {
                DISCRIMINATOR: "0000",  # PUMPFUN BUY
                LABEL: "PUMPFUN BUY",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 12,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 7
            },
            # Transaction : JqjR6MwEKZ89Bym3ZnuTvF4UkD43nX263Jeb6SAxLYEVqzESz3XwNkP7pMpS6sUFT23ox5ARbqhQ7xDXCxMsZUy
            {
                DISCRIMINATOR: "0001",  # PUMPFUN SELL
                LABEL: "PUMPFUN SELL",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 12
            },
            # Transaction : 58PVPWf6HkSekvWNFpWD29xWBopYFkEwz5Znh7kKh59mw48W8sHYR62CzV75ezVWqjNHRFn6tKQ2MhdDfMSoMwHv
            {
                DISCRIMINATOR: "0100",  # Raydium Liquidity Pool V4: raydium:swap BUY
                LABEL: "Raydium Liquidity Pool V4 BUY",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 10,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 11
            },
            # Transaction : 3XUjQUobZeQJ5eAR19Mq7mWG768eZvRNV6zcPG5yXRrScyDQPBmEHQpZhaYkWx57qCr1KbzqJCUqeW9kj6fpHZTm
            {
                DISCRIMINATOR: "0101",  # Raydium Liquidity Pool V4: raydium:swap SELL
                LABEL: "Raydium Liquidity Pool V4 SELL",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 10,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 11
            },
            # Transaction : 3JKhVroB32LxVi2C6gsCrC68zrD9MKLxqx27ESXyrUWt2c7mJT7QCR1GEWbgtHhCP7Jzme7ycfCvvSxthpE47cmh
            {
                DISCRIMINATOR: "0200",  # Moonshot BUY
                LABEL: "Moonshot BUY",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 9,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 7
            },
            # Transaction : NPsE83KBUorEuj6dojuFaspjEg3Hehmk9oP7GLkm7uQRkrWbVKaLhm53V1ZqbYdZT4L5gZ4hLUUDauWn3NQPaiT
            {
                DISCRIMINATOR: "0201",  # Moonshot SELL
                LABEL: "Moonshot SELL",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 9
            },
            # Transaction : 2Y2ridKhPj2bovqTcEnFdqKfgRTiM626HCGMER6trdnbodX9jeg766X53pPa7V7VhABxYtwSyYjaD7FdiJeH2xZ2
            {
                DISCRIMINATOR: "0400",  # Meteora BUY
                LABEL: "Meteora BUY",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 10,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 9
            },
            # Transaction : 4UNYV3yP5Pn93WtBQrpP8kkYmKnynyeybEXiu4iJrAUqSPWhmw2FhGa7YaobDyhnhMo1QzbGw4zF33f7j7yWHWzz
            {
                DISCRIMINATOR: "0401",  # Meteora SELL
                LABEL: "Meteora SELL",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 10,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 9
            },
            # Transaction : 3xLSnUfTZuqo87BK37nBTydk8XR7ziBQ9otRtLkToRiBDHFsjugeLJagbwiCD2PTw8ocbWYm4TqmkFqDh3QgPRuc
            {
                DISCRIMINATOR: "0500",  # Whirlpools Program: swapV2 BUY
                LABEL: "Whirlpools Program: swapV2 BUY",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 13,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 12
            },
            # Transaction : 3xLSnUfTZuqo87BK37nBTydk8XR7ziBQ9otRtLkToRiBDHFsjugeLJagbwiCD2PTw8ocbWYm4TqmkFqDh3QgPRuc
            {
                DISCRIMINATOR: "0501",  # Whirlpools Program: swapV2 SELL
                LABEL: "Whirlpools Program: swapV2 SELL",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 13,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 12
            },
            # Transaction : 2QCFv4NVThsnWdxNdVo32M44Dg26SUSEoz38jSr6873XBBccte8U9uMb3JAeVJxAUJCEDWJ2dxnVFujaePJ3Rxfq
            {
                DISCRIMINATOR: "0600",  # Raydium CPMM BUY
                LABEL: "Raydium CPMM BUY",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 12,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 11
            },
            # Transaction : 2JAGfn3C6Z9GBKsHaeGGKoKoZMKZZdZPoUEirASQTyQJBqpUbgn1b2ihPjGfq8yQCfinLPoF5kBTnnjMfjudL14f
            {
                DISCRIMINATOR: "0601",  # Raydium CPMM SELL
                LABEL: "Raydium CPMM SELL",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 12,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 11
            }
        ]
    },
    "BONK": {
        PROGRAM_ADDRESS: "BSwp6bEBihVLdqJRKGgzjcGLHkcTuzmSo1TQkHepzH8p",
        LABEL: "Bonk",
        ICON: "https://www.bonkswap.io/images/bonk.svg",
        WEBSITE: "https://www.bonkswap.io/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 3GMvEeP5j4D7XY71wwkBz5VNHmquGKiWSEJZwayt5KS8JAGn1dXNg3ctpWAoTnZA2q1xwt1t1CM2CqQa3HTw97Kw
            {
                INSTRUCTION_NAME: "swap",
                TERMINATOR: "1",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 7,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            # Transaction : 3GMvEeP5j4D7XY71wwkBz5VNHmquGKiWSEJZwayt5KS8JAGn1dXNg3ctpWAoTnZA2q1xwt1t1CM2CqQa3HTw97Kw
            {
                INSTRUCTION_NAME: "swap",
                TERMINATOR: "0",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    "CREMA_FINANCE": {
        PROGRAM_ADDRESS: "CLMM9tUoggJu2wagPkkqs9eFG4BWhVBZWkP1qv3Sp7tR",
        LABEL: "Crema Finance",
        ICON: "https://www.crema.finance/favicon.ico",
        WEBSITE: "https://www.crema.finance/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 45SMsQZ5x4ZWFZqpV255jv5E264PxExqMBq6bW2TivGUr1p9gbpqVeqTYXYPvJ7LxaiqvzaBDxVNz82NiP8SxytH
            {
                LABEL: "swapWithPartner",
                DISCRIMINATOR: "85d7bfd666f33719",
                BYTE_VALUE: (17,"0"),
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 7
            },
            # Transaction : 2i3EsfxZY2nFSWAWJ4NdwAdPQWfbs4iu4L65rxtRmVhbGxESSBCxzpGC5eqd5US59Y25Zp5aoZCUrcDwg8Nb6kCu
            {
                LABEL: "swapWithPartner",
                DISCRIMINATOR: "85d7bfd666f33719",
                BYTE_VALUE: (17,"1"),
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            }
        ]
    },
    "CROPPER_FINANCE": {
        # Transaction : 2imVjNqhtfP5jFeB3WURT8VPqdEtym67QoyMs715GPJR2TVVTfSFeBf6buViNaAkS88vodCiu5YyPbZGycfPZ6t
        PROGRAM_ADDRESS: "CTMAxxk34HjKWxQ3QLZK1HpaLXmBveao3ESePXbiyfzh",
        LABEL: "Cropper Finance",
        ICON: "https://app.cropper.finance/images/logo/logo.svg",
        WEBSITE: "https://app.cropper.finance",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                LABEL: "Swap",
                DISCRIMINATOR: "01",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 7,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            }
        ]
    },
    "CROPPER_WHIRLPOOL": {
        
        PROGRAM_ADDRESS: "H8W3ctz92svYg6mkn1UtGfu2aQr2fnUFHM1RhScEtQDt",
        LABEL: "Cropper Whirlpool",
        ICON: "https://app.cropper.finance/images/logo/logo.svg",
        WEBSITE: "https://app.cropper.finance",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 4CV2BK7bkhV8ULXWra41j17VbwWtC9W3izMKksXJ3h3bk1CYvE2szykJXFZ4g2mdB4UWWihyZqFE56eapt8Mydnm
            {
                INSTRUCTION_NAME: "swap",
                TERMINATOR: "0",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 3,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            },
            # Transaction : 2VLbyvNuMUBzu8MKgD5NpstDQ1eM4VpNADGdab8XoDs7ejtbgMwiSVeYX9G1HTBbD4kvLSjhxVCPLe1kUmVepTjo
            {
                INSTRUCTION_NAME: "swap",
                TERMINATOR: "1",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            }
        ]
    },
    "DEXLAB_SWAP": {
        # Transaction : 2TpSfj4spn7Mc24WVM4Qs8ptUVNAL89QHGZuh7i9Yht9p5TGiMZ1ZPrGeUFrU1AVSrLTSPxL75BmB8GYPw9x531k
        PROGRAM_ADDRESS: "DSwpgjMvXhtGn6BsbqmacdBZyfLj6jSWf3HJpdJtmg6N",
        LABEL: "Dexlab Swap",
        ICON: "https://www.dexlab.space/favicon-32x32.png",
        WEBSITE: "https://www.dexlab.space/swap",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                LABEL: "swap",
                DISCRIMINATOR: "01",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            }
        ]
    },
    "FADO": { # Router
        PROGRAM_ADDRESS: "FAdo9NCw1ssek6Z6yeWzWjhLVsr8uiCwcWNUnKgzTnHe",
        LABEL: "Fado",
        ROUTER: True,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : sX2TdktFAKzusWaYLEBkPTwyjwQAsHciArPsiqbCAU9KcLSR6f3gEaToCUv6rLBq6WhXAJYZZbp1LAkK2ovxoS2
            {
                INSTRUCTION_NAME: "buy",  # Pump.fun: buy
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            },
            # Transaction : 5Vzx7sobBMBtTTg9eap5yfPVEUmrDiBGqhZ58XeKnXERm2LtbpjfPgGTBS2VGcPWFdLxyVMsVoZnKBfEwNJpVG8d
            {
                DISCRIMINATOR: "333285a4017f83ad",  # Pump.fun: sell
                LABEL: "Pump.fun: sell",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            }
        ]
    },
    "FLUX_BEAM": {
        # Transaction : 5rpBZNNxSwfjZTDiZ1T2jnxKnpCM8DHE3XYQFHNjSn2FS41zpA6yte1xxRD35zYgfRXGWFE4EmKZ8AH4qS1DseTa
        PROGRAM_ADDRESS: "FLUXubRmkEi2q6K3Y9kBPg9248ggaZVsoSFhtJHSrm1X",
        LABEL: "Flux Beam",
        ICON: "https://api.fluxbeam.xyz/public/logo_transparent.png",
        WEBSITE: "https://fluxbeam.xyz/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                LABEL: "Swap",
                DISCRIMINATOR: "01",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    "GUAC_SWAP": {
        # Transaction : 67pMHLyiSnjLVpUVHC6W1FfXFGiaFoMX47eqUzrM2SQGapS73YZ9z9brionDeR8uUhJN2ZxyoRwqPRUSJMS7KxgZ
        PROGRAM_ADDRESS: "Gswppe6ERWKpUTXvRPfXdzHhiCyJvLadVvXGfdpBqcE1",
        LABEL: "Guac Swap",
        ICON: "https://c6fa2c22534d71a0f4399a2f8faee0d1.cdn.bubble.io/cdn-cgi/image/w=128,h=,f=auto,dpr=1,fit=contain/f1714071782415x613785640997461800/Guacamole_New_Logo.png",
        WEBSITE: "https://guac.gg/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                INSTRUCTION_NAME: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    "INVARIANT": {
        PROGRAM_ADDRESS: "HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt",
        LABEL: "Invariant",
        ICON: "https://invariant.app/assets/Logo-G6FuooDX.svg",
        WEBSITE: "https://invariant.app",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 61wX4CkKCTMEtHzZMwf85wmwKt9gDFhPaUVtGr2dPzbd8MFgNsvX8tqbnNBiSG7rtoVxUX4mjv7h26zjJy5CawW8
            {
                INSTRUCTION_NAME: "swap",
                BYTE_VALUE: (17,"0"),
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 3,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            },
            # Transaction : 2Uebihi9hjy6Q1NrWj6cCQEzLmVnvbSQVhzfR6dawswdGFoTMbyL3myPKGxfrjSXtCefuwFBwjA65Cjk4jyGapiC
            {
                INSTRUCTION_NAME: "swap",
                BYTE_VALUE: (17,"1"),
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    # Transaction 3o6Gemv9aQnwzJG5pPQSpXCy17ECS1D389ZvMAaLA5bErqFe9kvbU72hGMSspsrSXx4RwKdfJfy9mKqkimy17NWM
    "JUPITER_AGGREGATOR_V6": { # Router
        PROGRAM_ADDRESS: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
        LABEL: "Jupiter Aggregator V6",
        ROUTER: True,
        ICON: "https://jup.ag/svg/jupiter-logo.svg",
        WEBSITE: "https://station.jup.ag/",
        INSTRUCTION_PARSE_PARAM: [
            {
                INSTRUCTION_NAME: "exact_out_route",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
            },
            {
                INSTRUCTION_NAME: "route",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
            },
            {
                INSTRUCTION_NAME: "route_with_token_ledger",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
            },
            {
                INSTRUCTION_NAME: "shared_accounts_exact_out_route",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
            },
            {
                INSTRUCTION_NAME: "shared_accounts_route",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
            },
            {
                INSTRUCTION_NAME: "shared_accounts_route_with_token_ledger",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
            }
        ]
    },
    # Transaction : bGkkQdaVJzE8MyyWENkcmirgfwkTpsGUmucjLH8E6Ds82soFpYfZhMV145siqyJLLaj8Cb9jkjwA9pd4YB462R2
    "KING": { # Router
        PROGRAM_ADDRESS: "King7ki4SKMBPb3iupnQwTyjsq294jaXsgLmJo8cb7T",
        LABEL: "King",
        ROUTER: True,
        INSTRUCTION_PARSE_PARAM: [
            {
                DISCRIMINATOR: "33a0168b9230e6a8",
                LABEL: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 3,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            }
        ]
    },
    "LIFINITY_V2": {
        # Transaction: 4f92pMpvWjiobvh4uF1xkJPZ44THiDXNaSd1Mt2j2RXV5jZaUJfJMiPNPbvsmythHhG6fEZKhYapkCpWc9MEXeZF
        PROGRAM_ADDRESS: "2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c",
        LABEL: "Lifinity V2",
        ICON: "https://lifinity.io/lifinity-logo.svg",
        WEBSITE: "https://lifinity.io/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                INSTRUCTION_NAME: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    # Transaction : 2ueZjc586JeCREbDCV5CjYhpeQZgx93XgANFUnyPxUDQfBERrmuq9wQpP6g3E58rC2C1WLF28dzcDDKmQndnjhDD
    "MAESTRO_BOT": { # Router
        PROGRAM_ADDRESS: "MaestroAAe9ge5HTc64VbBQZ6fP77pwvrhM8i1XWSAx",
        LABEL: "Maestro Bot",
        ICON: "https://www.maestrobots.com/favicon.ico",
        WEBSITE: "https://www.maestrobots.com/",
        ROUTER: True,
        INSTRUCTION_PARSE_PARAM: [
            {
                DISCRIMINATOR: "4ed621581505db10",
                INSTRUCTION_NAME: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 8,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 13
            }
        ]
    },
    "OASIS": {
        PROGRAM_ADDRESS: "9tKE7Mbmj4mxDjWatikzGAtkoWosiiZX9y6J4Hfm2R8H",
        LABEL: "Oasis",
        ICON: "https://oasis.gobi.so/_next/static/media/oasis-logo-dark.c04f087a.svg",
        WEBSITE: "https://oasis.gobi.so/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 4hZVk1ZuMTGc5oDP3CFhAhGpz3ywuPYjviyqTEhm2XnmyCTt92sJqFkc498nd8NGCrr2Q2RUhMtUNpGQWiEDgMVb
            {
                INSTRUCTION_NAME: "swap",
                TERMINATOR: "0",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            },
            # Transaction : Ji3rArTnu26FtE6myT7Hd7VQVPLbtRng1yzuDrsbMRtwt4auqcCTmNqgrG2mvCrterHTsYACU57NPg5sbvSFjyF
            {
                INSTRUCTION_NAME: "swap",
                TERMINATOR: "1",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 7,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
        ]
    },
    "MERCURIAL_STABLE_SWAP": {
        PROGRAM_ADDRESS: "MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky",
        LABEL: "Mercurial Stable Swap",
        ICON: "https://avatars.githubusercontent.com/u/82135373?s=200&v=4",
        WEBSITE: "https://docs.mercurial.finance/mercurial",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction: 2vYLZjxQ6i836ZH4ECF5umDi6eWFs1s8JUQk2ym3mxf2Fer9g4zG2miq3nu8PqYNwbMEHEPAAoGHtMeJt9BASDPW
            {
                DISCRIMINATOR: "04",
                LABEL: "swap with 2 pools",
                ACCOUNTS_LENGTH: 8,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 7,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,   # 2 pools
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            },
            # Transaction: yi3bfHtkHt43zoe3x7p3XtemajgWHVeTJiH6KPLb8dFmKxdV3odLPd3dbBXU7dcFMnH5sjPwTYXjLhSESgVGiY3
            {
                DISCRIMINATOR: "04",
                LABEL: "swap with 3 pools",
                ACCOUNTS_LENGTH: 9,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 7,   # 3 pools
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 8,
                POOLS : [4,5,6]
            },
            # Transaction: 5uzqQGB69EwzK4kU87mWXz5vukhyfA4yGiAmZCgkmWjefroM2xWK8SkCnj6YrsMs943PSjGivUn2B6zQQudiqqQ6
            {
                DISCRIMINATOR: "04",
                LABEL: "swap with 4 pools",
                ACCOUNTS_LENGTH: 10,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 8,   # 4 pools WTF
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 9,
                POOLS : [4,5,6,7]
            }
        ]
    },
    "METEORA_DLMM": {
        PROGRAM_ADDRESS: "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
        LABEL: "Metora DLMM",
        ROUTER: False,
        ICON: "https://www.meteora.ag/icons/logo.svg",
        WEBSITE: "https://www.meteora.ag/",
        INSTRUCTION_PARSE_PARAM: [
            # Transaction: 3yvoXDaddNXXXqVMEepqnFNQ8JWkKnKXUHwwc4JTHcdp6AdULx5462QiVzXS5L8xmhbvEaWf8VsyCSHscvptbios
            {
                INSTRUCTION_NAME: "swap", 
                ACCOUNTS_LENGTH: 18,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 2,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            },
            # Transaction: 4hZVk1ZuMTGc5oDP3CFhAhGpz3ywuPYjviyqTEhm2XnmyCTt92sJqFkc498nd8NGCrr2Q2RUhMtUNpGQWiEDgMVb
            {
                INSTRUCTION_NAME: "swap", 
                ACCOUNTS_LENGTH: 16,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 2
            },
            # Transaction: 5NUCV51jJDF4DUjAYB1eeEmieWn7rhwx59Adjed5HxVLcrxtk6UxHJgWLSbt85nNJqEyfvrvTSCaFE3Q3AbpYXRK
            {
                DISCRIMINATOR: "fa49652126cf4bb8", # swapExactOut
                LABEL: "swapExactOut",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 2,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            },
            # Transaction: QdPbXmrfeV9A5bgcBAkANnHUYTJRb5VhZ9scFJskFqYh1pbHkBt9QMkH47GwnuRb8SN6HFin4eyF9AzfoGNu32u
            {
                DISCRIMINATOR: "38ade6d0ade49ccd", # swapWithPriceImpact
                LABEL: "swapWithPriceImpact",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 2,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            },
        ]
    },
    "METEORA_POOL": {
        # Transaction: 4rmPQ8bs4XYKWxxVv7vjzvSj9aM7Wma5mSmQa72RAsT3tkTTCoB2ehVbyAY8zSW58oWD68SZ2FWJ2CGsQFSfvdWY
        PROGRAM_ADDRESS: "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB",
        LABEL: "Metora Pool",
        ROUTER: False,
        ICON: "https://www.meteora.ag/icons/logo.svg",
        WEBSITE: "https://www.meteora.ag/",
        INSTRUCTION_PARSE_PARAM: [
            {
                INSTRUCTION_NAME: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    "MINTECH": {
        PROGRAM_ADDRESS: "minTcHYRLVPubRK8nt6sqe2ZpWrGDLQoNLipDJCGocY",
        LABEL: "Mintech",
        ICON: "https://www.mintechbots.com/assets/favicon.ico",
        WEBSITE: "https://www.mintechbots.com/",
        ROUTER: True,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 3rk5gZUL4aizV39fn4E8k83YswAVJYYXnqJK2SUpUWn8nsZdPKnRKK9nNKNNezVrvnxhRebXPqKYLqCAE1yR6iVb
            {
                DISCRIMINATOR: "13a79fffdd2df1c2",  # BUY
                LABEL: "buy",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            },
            # Transaction : 32rNPdMeGBixntoFHSyariGAatriBeXoH4c93U8aY5sHzKEkXYyA729n1BhSHkDCYQYmcHqsgnMNKGcrqTtmJMws
            {
                DISCRIMINATOR: "630ad08e9b2d33b2",  # SELL
                LABEL: "sell",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 11,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 12,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 9,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 10
            }
        ]
    },
    "MOMES": {
        PROGRAM_ADDRESS: "MoMessZmfwm61SB433t6aDteuQ8ypCLEJQGf61A3MDx",
        LABEL: "Momes",
        ROUTER: False,
        ICON: "https://www.mome.space/favicon.svg",
        WEBSITE: "https://www.mome.space/",
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 4kGVRC7eMC66ZJDupBqAXoZHSF4mX5bBRTw8QuYJrwm84PpuhasgGnTYVZ7RofymideTjZEtg2sk7orPmyhXYZNN
            {
                INSTRUCTION_NAME: "buy",  # BUY
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 0,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 1,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 2
            },
            # # Transaction : 2zv3mZb6FXbHTumiN3ejXgtjw7oALoPLPZvMGGDditMtQt5Zh48JpMqCa7YUdXPc9qjS314XruaPUCU9WMTgQFrt
            # {
            #     INSTRUCTION_NAME: "sell",  # SELL
            #     USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
            #     USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 0,
            #     POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 2,
            #     POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            # }
            # Need to reverse engineer the transaction to infer the SOL transfer
        ]
    },
    "MOONSHOT": {
        PROGRAM_ADDRESS: "MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG",
        LABEL: "Moonshot",
        ICON: "https://moonshot.money/favicon-32x32.png",
        WEBSITE: "https://moonshot.money",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 4svRy8ZKEpv1CFw3no1K1zQxsxhippR9MNX5FQYArdqSoJDmqzUsCRMUvv2TjwRUnbrcyhBjpAnTE72QHdEc5LeB
            {
                INSTRUCTION_NAME: "buy",
                ACCOUNTS_LENGTH: 11,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 0,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 1,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 2
            },
            # Transaction : 2JfhrXo67y8apGTs63LVuTbU2uaGjVWE5FhrVpC2cjr9FGxFwSMcfF6qkD4W15ejSpScCRYFZ1vKpppAEZsicokA
            {
                INSTRUCTION_NAME: "sell",
                ACCOUNTS_LENGTH: 11,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 0,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 2,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3,
                NATIVE_SOL_TRANSFER_INFERENCE: SwapInstructionSolTransferInference(
                    format_str="<QQ")
            },
            # Transaction : # 4NZFA8r2ie9HjFBuSnLugHop6nxXdxvo2o7hFXhfMTkCf8dzQRQUzbf4BnihSJ7sY5o9EVGSRv8pkVPdCD8iR9tc
            {
                INSTRUCTION_NAME: "buy",  
                ACCOUNTS_LENGTH: 14,  
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 0,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 1,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 2
            },
            # Transaction : 2zvjxa2EGvHfhrTZKR9hQD7PZKGNAg2iNCPqqrv1PmpnvVoW2ZqdXqTEHgitcEZgGGL9wuiib3Pvhntoo1RfUKDs
            # {
            #     INSTRUCTION_NAME: "sell",     
            #     ACCOUNTS_LENGTH: 12,
            #     USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
            #     USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 11,
            #     POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 2,
            #     POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3,
            #     NATIVE_SOL_TRANSFER_INFERENCE: SwapInstructionSolTransferInference(
            #         format_str="<QQ")
            # } SOL Inference not working yet
        ]
    },
    "NOVA_BOTS": {
        PROGRAM_ADDRESS: "NoVA1TmDUqksaj2hB1nayFkPysjJbFiU76dT4qPw2wm",
        LABEL: "Nova Bots",
        ROUTER: True,
        ICON: "https://ipfs.io/ipfs/QmPQZArPM7UeAbAsDYtbnsSw3GbyWxhWMSLcHnewSFefis",
        WEBSITE: "https://tradeonnova.io/",
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 52neUVLt1nPGA2XmegRbpo3xkGE6Hiq9w8tsmUtqQmoDbspQLKccvqSqaMgNpr1NUUQuL5BtVLFJNz1c5YDkvzfr
            {
                DISCRIMINATOR: "0100",  # PumpFun BUY
                LABEL: "PumpFun BUY",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 8,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 7,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            },
            # Transaction : YXMhnHa5uwDysiuuazoF52iZnEnNToyaL6jMRJNFg7PkAdjMeRDPttRPahZ5sZooUJevGXiHYd2Gy4Cbbsj82o3
            {
                DISCRIMINATOR: "0200",  # PumpFun SELL
                LABEL: "PumpFun SELL",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 8,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            },
            # Transaction : 21SSniVWC18soVpDMonYtzXZQdTLYRLhQHtLaLmQzu9yRHuRdSGKAnqgaoddmwX2BwscY7f1Yq2R3s6bjtQZZ4o9
            {
                DISCRIMINATOR: "0300",  # Raydium Liquidity Pool V4: raydium:swap BUY
                LABEL: "Raydium Liquidity Pool V4: raydium:swap BUY",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 19,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 20,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 9,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 10
            },
            # Transaction : uqwgbi2Mq3Dt8wp9ZdJNCSsVeSFvurJ7ruHsLYZqos8cwJEfnbqrb8xWixQ539rL776PjwPZTHUsJAaSDe1TDS1
            {
                DISCRIMINATOR: "0400",  # Raydium Liquidity Pool V4: raydium:swap SELL
                LABEL: "Raydium Liquidity Pool V4: raydium:swap SELL",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 19,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 20,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 9,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 10
            },
            # Transaction : 4D3aPfnCpYqwuhbVyEG1nKEMWKX5cnHDhFZGJJRGZ2bCFxfDPfaGsnGvyfuUkRyyFKDF1NVxvgUhKLFEsJEKtLDo
            {
                DISCRIMINATOR: "0500",  # Meteora Pools Program: swap BUY
                LABEL: "Meteora Pools Program: swap BUY",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 8,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 8,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 9
            },
            # Transaction : k8u8iWKNSSUtLU6ChL4Jq7VEqDpicWGGsRXFMXqDLLHTi4pCoUrpJJLe3UjGZxapJffiXWbiZrJDd2EBxVtcxZW
            {
                DISCRIMINATOR: "0600",  # Meteora Pools Program: swap SELL
                LABEL: "Meteora Pools Program: swap SELL",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 9,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 8
            },
            # Transaction : 3KeAWgx5fA1Z6VS7kWwvnvW4QH4F4YX9F8H6iqknjyGmVRLX2hxGd6FGutEUyEY1w4z8XhtiHU5vFnrDoAhgg9AK
            {
                DISCRIMINATOR: "0900",  # Meteora BUY
                LABEL: "Meteora BUY",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 8,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            },
            # Transaction : 59vKnMbp1JdgY7YiWNhBVoXsGFp5HuBzjiEj91UoC9SW4Xe2SFPfLuKg6vR51Ve473p9WTpFa3VhMfd7rnsn2UAs
            {
                DISCRIMINATOR: "0A00",  # Meteora SELL
                LABEL: "Meteora SELL",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 8,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            },
            # Transaction : 3549irhYApnNTkizZyFbm3yiK2kjeE1Lv6MgjC8NmJQAfT3nSHfY4EG6MM8EKTRwNftJWt2E8ecDRMX2FzJqNyuz
            {
                DISCRIMINATOR: "0E00",  # Moonshot BUY
                LABEL: "Moonshot BUY",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            },
            # Transaction : 3549irhYApnNTkizZyFbm3yiK2kjeE1Lv6MgjC8NmJQAfT3nSHfY4EG6MM8EKTRwNftJWt2E8ecDRMX2FzJqNyuz
            {
                DISCRIMINATOR: "0D00",  # Moonshot SELL
                LABEL: "Moonshot SELL",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 2,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 1,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            }
        ]
    },
    "OBRIC_V2": {
        PROGRAM_ADDRESS: "obriQD1zbpyLz95G5n7nJe6a4DPjpFwa5XYPoNm113y",
        LABEL: "Obric V2",
        ROUTER: False,
        ICON: "https://obric.xyz/favicon.ico",
        WEBSITE: "https://obric.xyz/swap",
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 4BqEkv6QSAunN5wTqmNb7NPDZjNKzFNQyKmGFirNHeRYQZQsrG8ZTkphXJnpb9Karoo4wDxAuynt37H3naexHfuQ
            {
                INSTRUCTION_NAME: "swap", 
                BYTE_VALUE: (17,"0"),
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            # Transaction : 3yvoXDaddNXXXqVMEepqnFNQ8JWkKnKXUHwwc4JTHcdp6AdULx5462QiVzXS5L8xmhbvEaWf8VsyCSHscvptbios
            {
                INSTRUCTION_NAME: "swap", 
                BYTE_VALUE: (17,"1"),
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            },
             # Transaction : 4RpgaGrGQxxumRBahJB2faJ8ipymcdw32QnJTeay3a4gfrurcskYNtqGXX9aeTgF4g1vafpQQS7WhFXDaRgcouGR
            {
                DISCRIMINATOR: "414b3f4ceb5b5b88", 
                BYTE_VALUE: (17,"0"),
                LABEL: "swap v2",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            },
             # Transaction : 4RpgaGrGQxxumRBahJB2faJ8ipymcdw32QnJTeay3a4gfrurcskYNtqGXX9aeTgF4g1vafpQQS7WhFXDaRgcouGR
            {
                DISCRIMINATOR: "414b3f4ceb5b5b88", 
                BYTE_VALUE: (17,"1"),
                LABEL: "swap v2",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 3,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            }
        ]
    },
    "ONEDEX": {
        # Transaction : 3Bikc81b8smNRKe1Bn88gLvsFiBzAJnRFxquutFsf922fTYu2dhisK8TKVHxiTkBhEDgcGLHhnJpXXa3a1NQ4do1
        PROGRAM_ADDRESS: "DEXYosS6oEGvk8uCDayvwEZz4qEyDJRf9nFgYCaqPMTm",
        LABEL: "1 Dex",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                LABEL: "swapExactAmountIn", 
                DISCRIMINATOR: "0897f54caccb9027",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 7,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            }
        ]
    },
    # Transaction : 5RwsGaFx4keb2RvJwQkUHo5ueJ3QeCUKGSyCL2XcgNS5BYSj7VPvmyQdRfo3Gk9QgMWfASCFFDiBB8wsiFL2gyKG
    "OKX_DEX_AGGREGATION_ROUTER_V2": {
        PROGRAM_ADDRESS: "6m2CDdhRgxpH4WjvdzxAYbGxwdGUz5MziiL5jek2kBma",
        LABEL: "OKX Dex Aggregation Router V2",
        ICON: "https://static.okx.com/cdn/web3/dex/onswap/okx.png?x-oss-process=image/format,webp/ignore-error,1",
        WEBSITE: "https://web3.okx.com/",
        ROUTER: True,
        INSTRUCTION_PARSE_PARAM: [
            {
                INSTRUCTION_NAME: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            {
                INSTRUCTION_NAME: "swap2",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            {
                INSTRUCTION_NAME: "proxy_swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            {
                INSTRUCTION_NAME: "commission_sol_from_swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            {
                INSTRUCTION_NAME: "commission_sol_proxy_swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            {
                INSTRUCTION_NAME: "commission_sol_swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            {
                INSTRUCTION_NAME: "commission_sol_swap2",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            {
                INSTRUCTION_NAME: "commission_spl_from_swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            {
                INSTRUCTION_NAME: "commission_spl_proxy_swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            {
                INSTRUCTION_NAME: "commission_spl_swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            {
                INSTRUCTION_NAME: "commission_spl_swap2",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            {
                INSTRUCTION_NAME: "from_swap_log",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            }
        ]
    },
    "OPENBOOK_V2": {
        PROGRAM_ADDRESS: "opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb",
        LABEL: "Openbook V2",
        ROUTER: False,
        ICON: "https://www.openbook.ag/favicon.ico",
        WEBSITE: "https://www.openbook.ag/",
        IDL: "https://github.com/openbook-dex/openbook-v2/blob/master/idl/openbook_v2.json",
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 4XryvfuzrXXi5ENNSquYgEXUA5yaRtXZxbquFRUWULtZLutGG1gmVExePuXBQLsfpgA8Xp3XoP6YgWqga6dTH5AC
            {
                DISCRIMINATOR: "032c47031ac7cb55", #placeTakeOrder
                BYTE_VALUE: (17,"0"),
                LABEL: "placeTakeOrder",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 10,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 9,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 7
            },
            # Transaction : 4hZVk1ZuMTGc5oDP3CFhAhGpz3ywuPYjviyqTEhm2XnmyCTt92sJqFkc498nd8NGCrr2Q2RUhMtUNpGQWiEDgMVb
            {
                DISCRIMINATOR: "032c47031ac7cb55", #placeTakeOrder
                BYTE_VALUE: (17,"1"),
                LABEL: "placeTakeOrder",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 9,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 10,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            }
        ]
    },
    #Transaction : 4PwpjdrC3BFPSxL2fyTTTUAxbDJnttJiftyiWmqjYJKruyZTpKB4gSUWqieTq6CZPzEkPYhHFGSFC8vx4p3oYk8f
    "ORCA": {
        PROGRAM_ADDRESS: "DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1",
        LABEL: "Orca",
        ROUTER: False,
        ICON: "https://www.orca.so/favicon.ico",
        WEBSITE: "https://www.orca.so/",
        INSTRUCTION_PARSE_PARAM: [
            {
                INSTRUCTION_NAME: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    # Transaction : 5xZn1FuM4R7L1EL5soTJbKJxZL4WGcRhLzagrb8x9gfWcuaFWHvt3Y9aLwbkqc6ywfVMkhtaBBws7KTWi9y6NMct
    "ORCA_V2": {
        PROGRAM_ADDRESS: "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP",
        LABEL: "Orca V2",
        ROUTER: False,
        ICON: "https://www.orca.so/favicon.ico",
        WEBSITE: "https://www.orca.so/",
        INSTRUCTION_PARSE_PARAM: [
            {
                LABEL: "swap",
                DISCRIMINATOR: "01",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    # Transaction : 3z5MTXPciqCaDr2YwyNFn1GXPRZwYmDk6ULpetS5YVb6zu3ENy95KJvk1HLbtqWvBX62P2ycMPqLuiDcwvhhJAQj
    "PENGUIN": {
        PROGRAM_ADDRESS: "PSwapMdSai8tjrEXcxFeQth87xC4rRsa4VA5mhGhXkP",
        LABEL: "Penguin",
        ROUTER: False,
        ICON: "https://png.fi/favicon.ico",
        WEBSITE: "https://png.fi/",
        INSTRUCTION_PARSE_PARAM: [
            {
                LABEL: "Swap",
                DISCRIMINATOR: "01",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    "PHOENIX": { 
        PROGRAM_ADDRESS: "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY",
        LABEL: "Phoenix",
        ROUTER: False,
        ICON: "https://www.phoenix.trade/favicon/apple-touch-icon.png",
        WEBSITE: "https://www.phoenix.trade/",
        INSTRUCTION_PARSE_PARAM: [
            {
                # Transaction : 4TNWoN6gQb5Kph4gNVAppiwRHGa8aXGRa691nCLRFnuiSF2dsgmW3zFB1fYgfochsCYggGMSQPFbhxtTiPHEryWQ
                LABEL: "Swap",
                DISCRIMINATOR: "00",
                BYTE_VALUE: (5, "0"),
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 7
            },
            {
                # Transaction : 4CV2BK7bkhV8ULXWra41j17VbwWtC9W3izMKksXJ3h3bk1CYvE2szykJXFZ4g2mdB4UWWihyZqFE56eapt8Mydnm
                LABEL: "Swap",
                DISCRIMINATOR: "00",
                BYTE_VALUE: (5, "1"),
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 7
            }
        ]
    },
    "PHOTON": {
        PROGRAM_ADDRESS: "BSfD6SHZigAfDWSjzD5Q41jw8LmKwtmjskPH9XW1mrRW",
        LABEL: "Photon",
        ROUTER: True,
        ICON: "https://2290414083-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FhCJJ0Jl53Vcd3QwSZ0Ba%2Ficon%2F27Rbtr3bSxAHC1A0gINQ%2FFrame%2017294.svg?alt=media&token=049a3493-f7f6-4a4f-a9a1-97d48bcc4cea",
        WEBSITE: "https://photon-sol.tinyastro.io/",
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 5Abvwe5QaQvK5v6kMWoYcgpodifAL91vZUvEdL8qtLQ9QrBoSvptr5ysjANi82deD6c18kW3tdd3LX9Dv2THThQZ
            {
                DISCRIMINATOR: "52e177e74e1d2d46",  # Pump.fun: buy
                LABEL: "Pump.fun: buy",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            # Transaction : 2ex1P1bFpa3XSjwKPt4u9kKHfV3jXY2y5v7UngyU2AsZY2CntVvTcCGUNKfSuSv9zvv5dH6zyvWnWBmp8AEPaY6U
            {
                DISCRIMINATOR: "5d583c225b1256c5",  # Pump.fun: sell
                LABEL: "Pump.fun: sell",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 7,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    "PUMPFUN": {
        PROGRAM_ADDRESS: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
        LABEL: "Pump.fun",
        ROUTER: False,
        ICON: "https://pump.fun/_next/image?url=%2Flogo.png&w=128&q=75",
        WEBSITE: "https://pump.fun/",
        INSTRUCTION_PARSE_PARAM: [
            # Transaction: 5ZFPQHYNNGuV4fzP5GR9YWdhwnKG2MZ6KRZFJwyGmuesHEtyoioNNVva1HDsMewmKE3EhBoT3w4Vn1hJDxKsLMEo
            {
                INSTRUCTION_NAME: "buy",
                ACCOUNTS_LENGTH: 12,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            },
            # Transaction: 3XLygWhWXvbrCwPuWhz5mKmAeW3cUQpB76TieArdWUJwc7idTtPQffLwUHXP23k5Qsy2WaDoA4Udi5qzBwPvqk55
            {
                INSTRUCTION_NAME: "buy",
                ACCOUNTS_LENGTH: 15,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            },
            # Transaction: 3Jhb5tdssxgiDiKddJ6Y4P799R5i1hYmCiUJpV4hDxfrYn4xFiv2B2oRctncGHZYhmopMn6QKY1ZTACMRWKU336Q
            {
                INSTRUCTION_NAME: "sell",
                ACCOUNTS_LENGTH: 12,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX:4,
                NATIVE_SOL_TRANSFER_INFERENCE: InnerInstructionSolTransferInference(
                    program_address="6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
                    discriminator="e445a52e51cb9a1d",
                    format_str="<48sQ")
            },
            # Transaction: 2TfBN19teJwnwvSqbN3dyy82y7iMLxVJRy2xuu6bHvwpSW1iJ2tHg9yE66wMUSf8RBtPin9oAS4kvyUL7K9vLu9R
            {
                INSTRUCTION_NAME: "sell",
                ACCOUNTS_LENGTH: 13,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX:4,
                NATIVE_SOL_TRANSFER_INFERENCE: InnerInstructionSolTransferInference(
                    program_address="6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
                    discriminator="e445a52e51cb9a1d",
                    format_str="<48sQ")
            }
        ]
    },
    "PUMPSWAP": {
        PROGRAM_ADDRESS: "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
        LABEL: "PumSwap",
        ROUTER: False,
        ICON: "https://pump.fun/_next/image?url=%2Flogo.png&w=128&q=75",
        WEBSITE: "https://swap.pump.fun/",
        INSTRUCTION_PARSE_PARAM: [
            # Transaction: 3mjjRUL7iydGqfq6jXtrGYyAUwBbKwujRYYQe9nuM5Q4bkb9XdpRrP5gZPHosCNkbnycTfuMAvZwhQMP1buC2dhD
            {
                INSTRUCTION_NAME: "buy",
                ACCOUNTS_LENGTH: 17,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 8
            },
            # Transaction: 5u8MgCn3rd9EJLGQDLej3tTEvZD1fgjR4ca3iS4ykC6Xdr2mMKa1VbsxHk4CPiCVRFFbvH9EwA2HdYLRM6mxGeZ7
            {
                INSTRUCTION_NAME: "sell",
                ACCOUNTS_LENGTH: 17,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 8,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 7
            }
        ]
    },
    "RAYDIUM_CONCENTRATED_LIQUIDITY": {
        PROGRAM_ADDRESS: "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
        LABEL: "Raydium Concentrated Liquidity",
        ROUTER: False,
        ICON: "https://img-v1.raydium.io/icon/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R.png",
        WEBSITE: "https://raydium.io/",
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 3GBVPC6FSW1KnxmLUXqjEsNjdzW4UsFhdpb6nBtKGrA3oAMM7svYS8iZaqPKh7QhjRWc1ieJ5qXXVJXCxuCZiRJ8
            {
                INSTRUCTION_NAME: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX:5
            },
            # Transaction : 4ibV8TMfubWaxBdaAE8dG4gQ8FUg2dHTciPfo5zJyFE6fqdTNzpANQYnBBhLzdtktc7FEvxErAKB76ZJshzzgpKN
            {
                DISCRIMINATOR: "2b04ed0b1ac91e62", #swapV2 inner
                LABEL: "swapV2 inner",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX:5
            }
        ]
    },
    "RAYDIUM_CPMM": {
        PROGRAM_ADDRESS: "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
        LABEL: "Raydium CPMM",
        ROUTER: False,
        ICON: "https://img-v1.raydium.io/icon/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R.png",
        WEBSITE: "https://raydium.io/",
        INSTRUCTION_PARSE_PARAM: [
            {
                # Transaction : 5Dto27bN8RRzzF17qhnjvgQGp3r1YciAMPBcthp7dDy7PqCyXcjX8HWjrkuP3e7N7RpU76CVfoV6cTsxc5UL9SpK
                DISCRIMINATOR: "37d96256a34ab4ad", #swapBaseOutput
                LABEL: "swapBaseOutput",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            },
            {
                # Transaction : brv8GPRA3DSjK2Eou5MkZStWQHjLLMFPMweGCiGkewQaUeXbJuw7JJq4anJPBoT1ykr9y4dMiwX5Y3TNiX2FStr
                DISCRIMINATOR: "8fbe5adac41e33de", #swapBaseInput
                LABEL: "swapBaseInput",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            }
        ]
    },
    # Transaction : 2U9R3hNPQDj5bia4bK8BwbCPtVkU2x861yHYJC8KPcXsi6CmdL5FV132RkcbSHMf9z1oAhadrzqaQKBQ7SBs9DT
    "RAYDIUM_LIQUIDITY_POOL_AMM": {
        PROGRAM_ADDRESS: "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h",
        LABEL: "Raydium Liquidity Pool AMM",
        ROUTER: False,
        ICON: "https://img-v1.raydium.io/icon/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R.png",
        WEBSITE: "https://raydium.io/",
        INSTRUCTION_PARSE_PARAM: [
            {
                DISCRIMINATOR: "09",
                LABEL: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 15,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 16,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    "RAYDIUM_LAUNCHPAD": {
        PROGRAM_ADDRESS: "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj",
        LABEL: "Raydium Liquidity Pool AMM",
        ROUTER: False,
        ICON: "https://img-v1.raydium.io/icon/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R.png",
        WEBSITE: "https://raydium.io/launchpad",
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 5QDski8Xvby8YadW8KZb3gzLn5PMvL7JNhFqwarWtdmwsS9oifWTgBbj5xj1sgLnGLYJkggead7ZYK14EN1RMqXQ
            {
                DISCRIMINATOR: "9527de9bd37c981a", # sell
                LABEL: "sell",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 8,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 7
            },
            # Transaction : 5gtrcra8EaSQVyVqbGPufWgd1m3tqLLqcefqnXFLkeKrkAr2ux3fsCnL5ondsnFDQL6Qe3G9Het3aAFgxCHTeKNF
            {
                DISCRIMINATOR: "faea0d7bd59c13ec",
                LABEL: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 7,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 8
            }
        ]
    },
    "RAYDIUM_LIQUIDITY_POOL_V4": {
        # Transaction: 4KLBpJReGMAs1EdCLi2SGpG3RpuKLTKgwhteQt5rDNc5A8VqRvtkzMc5Vkf9kvixtgrGJbPgNVWFSoZWHTcfsFLq
        PROGRAM_ADDRESS: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
        LABEL: "Raydium Liquidity Pool V4",
        ROUTER: False,
        ICON: "https://img-v1.raydium.io/icon/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R.png",
        WEBSITE: "https://raydium.io/",
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 53WBBLLmzPdSumrfo4WfgEVVS8RHrYV1oHBn2X7uzyBXG3EAc9ikjeXJMjjk7LK1Ziq7NVq1VyXJ7vrSDPUvLW6o
            {
                DISCRIMINATOR: "09", 
                LABEL: "swap",
                ACCOUNTS_LENGTH: 17,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 14,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 15,
                POOLS: [4, 5] # Pools source & destination order depending if WSOL -> COIN or COIN -> WSOL
            },
            # Transaction : 2VuyRoidvgfmHuLu3hM2NdFvtpsejVXQBp5zwTRx3FJAHDMTrVdfW1hpP9CEMocWRSPsDaAa5J7xSKv36Nh51Ak5
            {
                DISCRIMINATOR: "09", 
                LABEL: "swap",
                ACCOUNTS_LENGTH: 18,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 15,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 16,
                POOLS: [5, 6] # Pools source & destination order depending if WSOL -> COIN or COIN -> WSOL
            }
        ]
    },
    # "ROTOM": {
    #     PROGRAM_ID: "RoTom5BFr7M1K5cNwwLEjCVemqvJZpjGwQnFvi7GgHA",
    #     NAME: "Rotom",
    #     INSTRUCTION_PARSE_PARAM: [
    #         {
    #             ACCOUNTS_LENGTH: 40,
    #             USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
    #             USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
    #         }
    #     ]
    # },
    # Transaction : 3at6GuFutK9VcF8mXCc1W6gZE9k4MzegxUUCbmdbh2Ji1HaY7sVJ18oKGvHLCd8aBBtRZLxgN8yKaepUJyJRepqd
    "SABER_STABLE": {
        PROGRAM_ADDRESS: "SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ",
        LABEL: "Saber Stable",
        ROUTER: False,
        ICON: "https://app.saber.so/favicon.png",
        WEBSITE: "https://app.saber.so/",
        INSTRUCTION_PARSE_PARAM: [
            {
                DISCRIMINATOR: "01",
                LABEL: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            }
        ]
    },    
    "SABER_DECIMAL_WRAPPER": {
        PROGRAM_ADDRESS: "DecZY86MU5Gj7kppfUCEmd4LbXXuyZH1yHaP2NTqdiZB",
        LABEL: "Saber Decimal Wrapper",
        ICON: "https://app.saber.so/favicon.png",
        WEBSITE: "https://app.saber.so/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : ARXZDhDHeEW3GVEiRm9DViyWWub79NAoSL7mxQok2fazPbY2tSTWMGBRafoGZ9ss3ckFYgYqHNL5d7cqtuhHiEC
            {
                INSTRUCTION_NAME: "deposit",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: MINTTO,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 2
            },
            # Transaction : ARXZDhDHeEW3GVEiRm9DViyWWub79NAoSL7mxQok2fazPbY2tSTWMGBRafoGZ9ss3ckFYgYqHNL5d7cqtuhHiEC
            {
                INSTRUCTION_NAME: "withdraw",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 2,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: BURN
            }
        ]
    },
    # Transaction : 2ZDWVQrShZCcz7FPgG28iXtuKvnMjWeeQysZqRqj2uoAp9urSZUZSekLrvuEMpH1bJkHUTSpx53dM4ekhkxD9Hji
    "SANCTUM": {
        PROGRAM_ADDRESS: "5ocnV1qiCgaQR8Jb8xWnVbApfaygJ8tNoZfgPwsgx9kx",
        LABEL: "Sanctum Program",
        ICON: "https://app.sanctum.so/favicon.ico",
        WEBSITE: "https://app.sanctum.so/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                DISCRIMINATOR: "01",
                LABEL: "SwapExactIn",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 10,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 11
            }
        ]
    },
    "SANCTUM_ROUTER": {
        PROGRAM_ADDRESS: "stkitrT1Uoy18Dk1fTrgPw8W6MVzoCfYoAFT4MLsmhq",
        LABEL: "Sanctum Router Program",
        ICON: "https://app.sanctum.so/favicon.ico",
        WEBSITE: "https://app.sanctum.so/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : KN8ggc6BVdmPEkyCPutCNWGE3UaYsuG7QowqTfzpGzqDJQjuMBqPXpvhJ2niCu6XeSTMp68pKuHShVPcUxW42cN
            {
                DISCRIMINATOR: "08",
                LABEL: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: BURN
            },
            # Transaction : 3vzGCmAaLkCBMm2Yk6jNyyWeApcd7YBevTRwWKEUeRZG2KeVYw3NE3pmMBbzY7CMqEZf9MgPJG8qXbHzdqC5A8iu
            {
                DISCRIMINATOR: "06", # PrefundWithdrawStake
                LABEL: "PrefundWithdrawStake",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1, 
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2, # Transfer from stake account with split
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 20, # Stake Account
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: BURN
            },
            # Transaction : 3vzGCmAaLkCBMm2Yk6jNyyWeApcd7YBevTRwWKEUeRZG2KeVYw3NE3pmMBbzY7CMqEZf9MgPJG8qXbHzdqC5A8iu
            {
                DISCRIMINATOR: "05", # DepositStake # The USER -> POOL happens with a skake account withdrawer authority change. That's why it's the same account index 1
                LABEL: "DepositStake",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1, # stake account
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3, 
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 1 # "receives" from user source through ownership change of source 
            },
            # Transaction : 2mWiVq6g7PoN4CJLtAxncqWPY13yCtJXoaYUVufCn1fBMMUGD9Aw4NkPeL9V9cZBpUiuynqpEKg1NFdud7ndMfxz
            {
                DISCRIMINATOR: "00", # StakeWrappedSol 
                LABEL: "StakeWrappedSol",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1, 
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5, 
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3 # "receives" from user source through ownership change of source 
            } 
        ]
    },
    # Transaction : 4JC95wTQguuroaq7uEJMZR1rtyE8JwN1qgswUh5Qrpp8mrtCdugkS7t9fmNgTKfyGezLQcS2awVZVz23tECqjMvD
    "SAROS": {
        PROGRAM_ADDRESS: "SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr",
        LABEL: "Saros AMM",
        ICON: "https://dex.saros.xyz/image/Logo/logoSaros.svg",
        WEBSITE: "https://dex.saros.xyz/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                DISCRIMINATOR: "01",
                LABEL: "swap",
                ACCOUNTS_LENGTH : 10,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            }
        ]
    },
    "SOLFI": {
        
        PROGRAM_ADDRESS: "SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe",
        LABEL: "Solfi",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction: 4f92pMpvWjiobvh4uF1xkJPZ44THiDXNaSd1Mt2j2RXV5jZaUJfJMiPNPbvsmythHhG6fEZKhYapkCpWc9MEXeZF
            {
                DISCRIMINATOR: "07",
                TERMINATOR: "0",
                LABEL: "swap",
                ACCOUNTS_LENGTH: 8,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 2
            },
            # Transaction: 4SLxFXUkfjs6MjBGL8uaCb8eAHt8wJnPuEmXAt9WxFPVn13y966yJRA7UAumhD4FQ9SNE7y9dZPLSsmAjYuvvubp
            {
                DISCRIMINATOR: "07",
                TERMINATOR: "1",
                LABEL: "swap",
                ACCOUNTS_LENGTH: 8,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 2,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            }
        ]
    },
    "STABBLE_WEIGHTED": {
        PROGRAM_ADDRESS: "swapFpHZwjELNnjvThjajtiVmkz3yPQEHjLtka2fwHW",
        LABEL: "Stabble Weighted",
        ICON: "https://stabble.org/favicon.ico",
        WEBSITE: "https://stabble.org/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : 3CRTR4HebXktHCAg7nVmQEJhAxM251p58u51SFe9MBUhChyjAepD3XzAg2C5it9WCGjdNHKsTXExW8vm7XqJxDvg
            {
                INSTRUCTION_NAME: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            },
            # Transaction : 36ZXvgzpZ16RXxcgNxH5ho8YDHFzBnqswwXbBR8wyTq3rfLqDt6vfrRoXDinwDxTpFX4xbB3ZCNDdRRTeZLt6Qwv
            {
                INSTRUCTION_NAME: "swap_v2",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    "STABBLE_STABLE_SWAP": {
        PROGRAM_ADDRESS: "swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ",
        LABEL: "stabble Stable Swap",
        ICON: "https://stabble.org/favicon.ico",
        WEBSITE: "https://stabble.org/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transaction : ARXZDhDHeEW3GVEiRm9DViyWWub79NAoSL7mxQok2fazPbY2tSTWMGBRafoGZ9ss3ckFYgYqHNL5d7cqtuhHiEC
            {
                INSTRUCTION_NAME: "swap",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 1,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 2,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 3
            },
            # Transaction : MMG8cAUQE4M2unxZgRm5RZBBcfhLsh5xY1hosXtjHfVZtHvNk9KjkbGc6z1cfaSYbVoyoN65q7rgFxnJqGw1mf4
            {
                INSTRUCTION_NAME: "swap_v2",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 4,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 5
            }
        ]
    },
    # Transaction : RSDxpLy2eYK3jqg5VZoLWvbgathDiywBsn6Q8GKtL5WYzZLyMYwSEvHNS7iXwHkPdBPobZimbi8YpjhtnmwVfCo
    "STEP_FINANCE": {
        PROGRAM_ADDRESS: "SSwpMgqNDsyV7mAgN9ady4bDVu5ySjmmXejXvy2vLt1",
        LABEL: "Step Finance",
        ICON: "https://www.step.finance/favicon-32x32.png",
        WEBSITE: "https://www.step.finance/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                LABEL: "Swap",
                DISCRIMINATOR: "01",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            }
        ]
    },
    # Transaction : 3j6yttZRAJ4VxMZiHt7urFktDG4rqTvD3SArpcN1iZoLi7XTYr55CrAQAkHz1Mr1kfpkp6mnUXEsFGJnRyr2pH8k
    "STEPN_DOOAR_SWAP": {
        PROGRAM_ADDRESS: "Dooar9JkhdZ7J3LHN3A7YCuoGRUggXhQaG4kijfLGU2j",
        LABEL: "StepN DOOAR Swap",
        ICON: "view-source:https://whitepaper.stepn.com/~gitbook/image?url=https%3A%2F%2F3856514121-files.gitbook.io%2F%7E%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FpoycldKRcpb37xKdxOZU%252Ficon%252FIEPxMI0zTkBZAxgzug9T%252Flogo%25E9%25BB%2591-%25E7%25BB%25BF.png%3Falt%3Dmedia%26token%3D19e3d622-0f35-4aee-8bcd-8d7155ccbc50&width=48&height=48&sign=30c73aac&sv=2",
        WEBSITE: "https://www.stepn.com/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                LABEL: "Swap",
                DISCRIMINATOR: "01",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            }
        ]
    },
    "SWAP_PROGRAM": {
        # Transaction: 5RVtoP3DVzZQMc21wL8FXGYKUi5D94wuzR6MwCHRABfmVbMv64TftiaDcSLdds23odh9DMjBLqncyRAW6UU13VCd
        PROGRAM_ADDRESS: "SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8",
        LABEL: "Swap Program",
        ICON: "https://solana.com/favicon.png",
        WEBSITE: "https://github.com/solana-labs/solana-program-library/tree/master/token-swap",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                DISCRIMINATOR: "01",
                LABEL: "swap",
                ACCOUNTS_LENGTH: 10,
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6,
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            }
        ]
    },
    "WHIRLPOOLS": {
        PROGRAM_ADDRESS: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
        LABEL: "Whirlpools",
        ICON: "https://www.orca.so/favicon.ico",
        WEBSITE: "https://dev.orca.so/",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            # Transfert : W3LUa6i1ge3GqRQ38LsVq1dfQqvNkarsgcTiK8bzEAmdhZnz99ckwqnAy6JkJtBiBj5sgbMsMTpuHCEXDvuGLMa
            {
                INSTRUCTION_NAME: "swap",
                TERMINATOR: "0",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5, 
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 3, 
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,  
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 6
            },
            # Transaction : 29gywdkFsxqN5NZT96ZJnkDpTVHFqt4GYiyaJ6MgpFR5NZupgZXFRiSCyv6dLtHUBcrJkoJfmFC1nTce9b7LfDzH
            {
                INSTRUCTION_NAME: "swap",
                TERMINATOR: "1",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 3, 
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 5, 
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 6,  
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 4
            },
            # Transaction : 29gywdkFsxqN5NZT96ZJnkDpTVHFqt4GYiyaJ6MgpFR5NZupgZXFRiSCyv6dLtHUBcrJkoJfmFC1nTce9b7LfDzH
            {
                DISCRIMINATOR: "2b04ed0b1ac91e62", # swapV2
                BYTE_VALUE: (83, "0"),
                LABEL: "swapV2",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 9, 
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 7, 
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 8,  
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 10
            },
            # Transaction : 29gywdkFsxqN5NZT96ZJnkDpTVHFqt4GYiyaJ6MgpFR5NZupgZXFRiSCyv6dLtHUBcrJkoJfmFC1nTce9b7LfDzH
            {
                DISCRIMINATOR: "2b04ed0b1ac91e62", # swapV2
                BYTE_VALUE: (83, "1"),
                LABEL: "swapV2",
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 7, 
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 9, 
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 10,  
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 8
            }
        ]
    },
    # Transaction : 2wFmyQ7uW3dyqcsHh8VAjogMrzfhu2HegER3bfM64rsM75FAm75KvpmiT2CA9npim62fLEaP1DBFhV9qJCNBAkGo
    "ZEROFI": {
        PROGRAM_ADDRESS: "ZERor4xhbUycZ6gb9ntrhqscUcZmAbQDjEAtCf4hbZY",
        LABEL: "ZeroFi",
        ROUTER: False,
        INSTRUCTION_PARSE_PARAM: [
            {
                DISCRIMINATOR: "06",
                LABEL: "swap",
                ACCOUNTS_LENGTH: 10, 
                USER_SOURCE_TOKEN_ACCOUNT_INDEX: 5,
                USER_DESTINATION_TOKEN_ACCOUNT_INDEX: 6, 
                POOL_SOURCE_TOKEN_ACCOUNT_INDEX: 4,  
                POOL_DESTINATION_TOKEN_ACCOUNT_INDEX: 2
            }
        ]
    }
}


# Debug before instantiation
# print("Debugging dex_programs_data:")
# for program_id, data in swap_programs_data.items():
#     for param in data[INSTRUCTION_PARSE_PARAM]:
#         if USER_SOURCE_TOKEN_ACCOUNT_INDEX not in param or USER_DESTINATION_TOKEN_ACCOUNT_INDEX not in param:
#             print(f"Bad entry for {program_id}: {json.dumps(param, indent=4)}")


# Define supporting dataclasses
@dataclass
class InstructionParseParam:
    user_source_token_account_index: int
    user_destination_token_account_index: int
    accounts_length: Optional[int] = None
    instruction_name: Optional[str] = None
    label: Optional[str] = None
    terminator: Optional[str] = None
    discriminator: Optional[List[int]] = None
    byte_value: Optional[Tuple[int, str]] = None
    pool_source_token_account_index: Optional[int] = None
    pool_destination_token_account_index: Optional[int] = None
    pools : Optional[List[int]] = None
    native_sol_transfer_inference: Optional[NativeSolTransferInference] = None

    def getInstructionName(self)-> str:
        if (self.label):
            return self.label
        return "Unknown"

@dataclass
class SwapProgram:
    program_address: str
    label: str
    router: bool
    instruction_parse_param: List[InstructionParseParam]
    icon: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
 

# Define the SwapPrograms class with typed attributes
class SwapPrograms:
    # Explicitly annotated attributes for each SWAP program
    ALDRIN_AMM_V2: Optional[SwapProgram]
    AXIOM: Optional[SwapProgram]
    BANANA_GUN_ROUTER_PUMPFUN: Optional[SwapProgram]
    BLOOM_ROUTER: Optional[SwapProgram]
    BONK: Optional[SwapProgram]
    CREMA_FINANCE: Optional[SwapProgram]
    CROPPER_FINANCE: Optional[SwapProgram]
    CROPPER_WHIRLPOOL: Optional[SwapProgram]
    DEXLAB_SWAP: Optional[SwapProgram]
    FADO: Optional[SwapProgram]
    FLUX_BEAM: Optional[SwapProgram]
    GUAC_SWAP: Optional[SwapProgram]
    INVARIANT: Optional[SwapProgram]
    JUPITER_AGGREGATOR_V6: Optional[SwapProgram]
    KING: Optional[SwapProgram]
    LIFINITY_V2: Optional[SwapProgram]
    MAESTRO_BOT: Optional[SwapProgram]
    MARCOPOLO: Optional[SwapProgram]
    MERCURIAL_STABLE_SWAP: Optional[SwapProgram]
    METEORA_DLMM: Optional[SwapProgram]
    METEORA_POOL: Optional[SwapProgram]
    MINTECH: Optional[SwapProgram]
    MOMES: Optional[SwapProgram]
    MOONSHOT: Optional[SwapProgram]
    NOVA_BOTS: Optional[SwapProgram]
    OBRIC_V2: Optional[SwapProgram]
    ONEDEX: Optional[SwapProgram]
    OKX_DEX_AGGREGATION_ROUTER_V2: Optional[SwapProgram]
    OPENBOOK_V2: Optional[SwapProgram]
    ORCA: Optional[SwapProgram]
    ORCA_V2: Optional[SwapProgram]
    PENGUIN: Optional[SwapProgram]
    PHOENIX: Optional[SwapProgram]
    PHOTON: Optional[SwapProgram]
    PUMPFUN: Optional[SwapProgram]
    PUMPSWAP: Optional[SwapProgram]
    RAYDIUM_CONCENTRATED_LIQUIDITY: Optional[SwapProgram]
    RAYDIUM_CPMM: Optional[SwapProgram]
    RAYDIUM_LAUNCHPAD: Optional[SwapProgram]
    RAYDIUM_LIQUIDITY_POOL_AMM: Optional[SwapProgram]
    RAYDIUM_LIQUIDITY_POOL_V4: Optional[SwapProgram]
    SABER_STABLE: Optional[SwapProgram]
    SABER_DECIMAL_WRAPPER: Optional[SwapProgram]
    SANCTUM: Optional[SwapProgram]
    SANCTUM_ROUTER: Optional[SwapProgram]
    SAROS: Optional[SwapProgram]
    SOLFI: Optional[SwapProgram]
    STABBLE_WEIGHTED: Optional[SwapProgram]
    STABBLE_STABLE_SWAP: Optional[SwapProgram]
    STEP_FINANCE: Optional[SwapProgram]
    STEPN_DOOAR_SWAP: Optional[SwapProgram]
    SWAP_PROGRAM: Optional[SwapProgram]
    WHIRLPOOLS: Optional[SwapProgram]
    ZEROFI: Optional[SwapProgram]


    def __init__(self, programs_dict: Dict[str, dict]):
        self.__program_map__: Dict[str, SwapProgram] = {}
        for swap_name, program_data in programs_dict.items():
            program_obj = self._create_program_object(program_data)
            # Set the attribute dynamically, but with type hints already defined
            setattr(self, swap_name, program_obj)
            self.__program_map__[program_data[PROGRAM_ADDRESS]] = program_obj
    def _create_program_object(self, program_data: dict) -> SwapProgram:
        instruction_parse_params = [
            InstructionParseParam(
                label = param.get(LABEL),
                instruction_name = param.get(INSTRUCTION_NAME),
                terminator = param.get(TERMINATOR),
                discriminator = param.get(DISCRIMINATOR),
                byte_value = param.get(BYTE_VALUE),
                user_source_token_account_index = param[USER_SOURCE_TOKEN_ACCOUNT_INDEX],
                user_destination_token_account_index = param[USER_DESTINATION_TOKEN_ACCOUNT_INDEX],
                accounts_length = param.get(ACCOUNTS_LENGTH),
                pool_source_token_account_index = param.get(POOL_SOURCE_TOKEN_ACCOUNT_INDEX),
                pool_destination_token_account_index = param.get(POOL_DESTINATION_TOKEN_ACCOUNT_INDEX),
                pools = param.get(POOLS),
                native_sol_transfer_inference = param.get(NATIVE_SOL_TRANSFER_INFERENCE)
            )
            for param in program_data[INSTRUCTION_PARSE_PARAM]
        ]
        return SwapProgram(
            program_address=program_data[PROGRAM_ADDRESS],
            router=program_data[ROUTER],
            instruction_parse_param=instruction_parse_params,
            label=program_data[LABEL],
            icon=program_data.get(ICON),
            website=program_data.get(WEBSITE),
            description=program_data.get(DESCRIPTION)
        )

    def is_recognized(self, program_address: str) -> bool:
        return program_address in self.__program_map__
    
    def get_program(self, program_address: str) -> SwapProgram :
        return self.__program_map__.get(program_address)
    
    def get_map(self) -> Dict[str, SwapProgram]:
        return self.__program_map__

# Instantiate the class
SWAP_PROGRAMS = SwapPrograms(swap_programs_data)