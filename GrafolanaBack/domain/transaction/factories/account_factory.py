from typing import Dict, List, Optional, Set
from solders.transaction_status import UiTransactionTokenBalance

from GrafolanaBack.domain.transaction.models.account import Account, AccountType, AccountVersion
from GrafolanaBack.domain.transaction.repositories.account_repository import AccountRepository
from GrafolanaBack.domain.transaction.config.constants import FEE, SOL, WRAPPED_SOL_ADDRESS
from GrafolanaBack.domain.transaction.models.transaction_context import TransactionContext


class AccountFactory:
    """
    Factory for creating various types of accounts in the transaction graph.
    
    This class provides methods for creating accounts that appear in Solana transactions,
    including virtual accounts for burns, mints, and fees.
    """
    
    @staticmethod
    def create_fee_account(transaction_context: TransactionContext) -> AccountVersion:
        """
        Create a virtual fee account.
        
        Args:
            repo: The account repository to store the account in
            
        Returns:
            The account version representing the fee account
        """
        # Check if fee account already exists
        if transaction_context.account_repository.get_account(FEE):
            account_version = transaction_context.account_repository.get_latest_version(FEE)
            return account_version
        
        # Create new fee account
        account_version = transaction_context.account_repository.create_account(
            address=FEE,
            mint_address=SOL,
            account_type=AccountType.FEE_ACCOUNT,
            owner=FEE
        )
        
        return account_version
    
    def build_accounts_from_transaction(
            repo: AccountRepository,
            pre_token_balances: List[UiTransactionTokenBalance],
            post_token_balances: List[UiTransactionTokenBalance],
            pre_balances: List[int],
            account_addresses: List[str],
            signer_wallets: Set[str],
            transaction_signature: str) -> None:
        """
        Initialize accounts from transaction balance information.
        
        Args:
            repo: The account repository to store accounts in
            pre_token_balances: Token balances before the transaction
            post_token_balances: Token balances after the transaction
            pre_balances: SOL balances before the transaction
            account_addresses: List of account addresses in the transaction
            signer_wallets: Set of signer wallet addresses
        """
        mints: Set[str] = set()

        # Process pre_token_balances
        for pre_token_balance in pre_token_balances:
            account_index = pre_token_balance.account_index
            if account_index < len(account_addresses):
                address = account_addresses[account_index]
                mint = str(pre_token_balance.mint)
                mints.add(mint)
                owner = str(pre_token_balance.owner) if hasattr(pre_token_balance, 'owner') and pre_token_balance.owner else None
                amount = pre_token_balance.ui_token_amount.amount
                
                # Create account if it doesn't exist
                if not repo.get_account(address):
                    account_type = AccountType.TOKEN_ACCOUNT
                    lamport_balance = pre_balances[account_index] if account_index < len(pre_balances) else 0
                    
                    repo.create_account(
                        transaction_signature=transaction_signature,
                        address=address,
                        mint_address=mint,
                        account_type=account_type,
                        owner=owner,
                        balance_token=int(amount),
                        balance_lamport=lamport_balance
                    )
        
        # Process SOL accounts that don't have token balances
        for index, address in enumerate(account_addresses):
            if not repo.get_account(address):
                is_signer = address in signer_wallets
                account_type = AccountType.SOL_ACCOUNT
                lamport_balance = pre_balances[index] if index < len(pre_balances) else 0
                
                # For SOL accounts, use SOL as the mint address
                mint_address = SOL if address != WRAPPED_SOL_ADDRESS else WRAPPED_SOL_ADDRESS
                
                if mint_address == WRAPPED_SOL_ADDRESS:
                    mints.add(WRAPPED_SOL_ADDRESS)

                repo.create_account(
                    transaction_signature=transaction_signature,
                    address=address,
                    mint_address=mint_address,
                    account_type=account_type,
                    owner=address if is_signer else None,
                    balance_token=0,
                    balance_lamport=lamport_balance
                )

        for mint in mints:
            if mint_account := repo.get_account(mint):
                mint_account.type = AccountType.TOKEN_MINT_ACCOUNT
        