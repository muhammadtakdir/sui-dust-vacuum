/// Sui Dust Vacuum - DustDAO
/// 
/// Community-driven dust cleaner dengan shared vault + governance.
/// 
/// Features:
/// 1. Users deposit berbagai dust tokens, tracked by USD value (shares)
/// 2. Admin batch swap semua tokens ke SUI (pays gas, gets reimbursed)
/// 3. Auto fee deduction: 2% for admin gas reimbursement + incentive
/// 4. Users choose: Claim SUI atau Auto-Stake
/// 5. All depositors get voting power for future DAO governance
/// 
/// ⚠️ SECURITY NOTES:
/// - USD value is passed from frontend (client-side) - TRUSTED INPUT
/// - For production: Implement on-chain price oracle (Pyth, Switchboard)
/// - Frontend should validate: MAX_DUST_VALUE_USD = $100 per deposit
/// - Receipt is burned on claim to prevent double-claiming
/// - AdminCap controls privileged operations (close/open vault, new round)
/// - Share calculation uses u128 to prevent overflow
/// 
/// Move 2024 Edition
module dust_vacuum::vacuum {
    // ═══════════════════════════════════════════════════════════════════════════
    // IMPORTS
    // ═══════════════════════════════════════════════════════════════════════════
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::event;
    use sui::clock::Clock;
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::bag::{Self, Bag};
    use sui::vec_set::{Self, VecSet};
    use std::type_name;
    use std::ascii::String;

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════
    const EVaultClosed: u64 = 0;
    const EVaultEmpty: u64 = 1;
    const ENoShares: u64 = 2;
    const EWrongRound: u64 = 3;
    const EZeroValue: u64 = 4;
    const EAlreadyVoted: u64 = 5;
    const EProposalNotActive: u64 = 6;
    const ENoVotingPower: u64 = 7;
    const EValueTooHigh: u64 = 8; // SECURITY: Prevent USD manipulation

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// Reward option: Claim SUI directly
    const REWARD_CLAIM: u8 = 0;
    /// Reward option: Auto-stake to earn yield
    const REWARD_STAKE: u8 = 1;
    
    /// Admin fee percentage (2% = 200 basis points)
    /// This covers gas reimbursement + incentive for running batch swaps
    const ADMIN_FEE_BPS: u64 = 200;
    /// Basis points denominator (100% = 10000)
    const BPS_DENOMINATOR: u64 = 10000;
    
    /// SECURITY: Maximum USD value per deposit (scaled by 1e6)
    /// $100 max = 100_000_000 (100 * 1e6)
    /// This prevents manipulation attacks where users claim inflated USD values
    const MAX_USD_VALUE: u64 = 100_000_000;

    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// Admin capability for managing the vault
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Main DustDAO Vault - ONE vault for ALL token types
    public struct DustVault has key {
        id: UID,
        /// Admin address (for fee distribution)
        admin: address,
        /// Track user shares (USD value scaled by 1e6): address -> shares
        user_shares: Table<address, u64>,
        /// Dynamic bag to store various token balances: String (Type) -> Balance<T>
        tokens: Bag,
        /// Track which token types are currently in the bag
        token_types: VecSet<String>,
        /// Total shares in current round
        total_shares: u64,
        /// Target USD value to trigger distribution (informational/trigger)
        target_usd_value: u64,
        /// Current accumulated USD value in this round
        current_usd_value: u64,
        /// SUI rewards pool from batch swaps (after fee deduction)
        sui_rewards: Balance<SUI>,
        /// Staked SUI pool (for auto-stake users)
        staked_sui: Balance<SUI>,
        /// Round number (increments after each distribution)
        round: u64,
        /// Is vault open for deposits?
        is_open: bool,
        /// Total depositors this round
        depositors_count: u64,
        /// Total lifetime shares (for voting power calculation)
        total_lifetime_shares: u64,
        /// Total fees collected (for transparency)
        total_fees_collected: u64,
    }

    /// User's membership in DustDAO
    /// Tracks lifetime contribution and voting power
    public struct DustDAOMembership has key, store {
        id: UID,
        /// Member address
        member: address,
        /// Total lifetime shares contributed (voting power)
        lifetime_shares: u64,
        /// Total SUI earned from claims
        total_sui_earned: u64,
        /// Current staked amount
        staked_amount: u64,
        /// Preferred reward option: 0 = Claim, 1 = Auto-Stake
        reward_preference: u8,
        /// Join timestamp
        joined_at_ms: u64,
    }

    /// Receipt for current round deposits
    public struct DepositReceipt has key, store {
        id: UID,
        /// Depositor
        depositor: address,
        /// Shares (USD value) for this round
        shares: u64,
        /// Round number
        round: u64,
        /// Reward preference: 0 = Claim SUI, 1 = Auto-Stake
        reward_preference: u8,
    }

    /// Governance proposal for DAO voting
    public struct Proposal has key {
        id: UID,
        /// Proposal ID number
        proposal_id: u64,
        /// Title/description
        title: vector<u8>,
        /// Creator address
        creator: address,
        /// Votes for
        votes_for: u64,
        /// Votes against
        votes_against: u64,
        /// Voters who already voted
        voters: Table<address, bool>,
        /// Start time
        start_time_ms: u64,
        /// End time
        end_time_ms: u64,
        /// Is active
        is_active: bool,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// Emitted when user deposits dust
    public struct DustDepositedEvent has copy, drop {
        user: address,
        token_type: String,
        amount: u64,
        usd_value: u64,
        shares: u64,
        round: u64,
        timestamp_ms: u64,
    }

    /// Emitted when batch swap occurs
    public struct BatchSwapEvent has copy, drop {
        token_type: String,
        amount_swapped: u64,
        sui_received: u64,
        round: u64,
        timestamp_ms: u64,
    }

    /// Emitted when user claims SUI rewards
    public struct RewardsClaimedEvent has copy, drop {
        user: address,
        shares: u64,
        sui_amount: u64,
        round: u64,
        timestamp_ms: u64,
    }

    /// Emitted when user stakes rewards
    public struct RewardsStakedEvent has copy, drop {
        user: address,
        shares: u64,
        sui_amount: u64,
        round: u64,
        timestamp_ms: u64,
    }

    /// Emitted when membership is created
    public struct MembershipCreatedEvent has copy, drop {
        user: address,
        initial_shares: u64,
        timestamp_ms: u64,
    }

    /// Emitted when user votes on proposal
    public struct VoteCastEvent has copy, drop {
        voter: address,
        proposal_id: u64,
        vote_for: bool,
        voting_power: u64,
        timestamp_ms: u64,
    }

    /// Individual swap event (non-pool mode)
    public struct IndividualSwapEvent has copy, drop {
        user: address,
        token_type: String,
        amount: u64,
        sui_received: u64,
        timestamp_ms: u64,
    }

    /// Emitted when batch swap completes with fee distribution
    public struct BatchSwapCompleteEvent has copy, drop {
        round: u64,
        total_sui_received: u64,
        admin_fee: u64,
        user_rewards: u64,
        depositors_count: u64,
        timestamp_ms: u64,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════════════════

    fun init(ctx: &mut TxContext) {
        let admin_address = ctx.sender();
        
        // Create admin cap
        transfer::transfer(
            AdminCap { id: object::new(ctx) },
            admin_address
        );

        // Create main vault (shared)
        let vault = DustVault {
            id: object::new(ctx),
            admin: admin_address,
            user_shares: table::new(ctx),
            tokens: bag::new(ctx),
            token_types: vec_set::empty(),
            total_shares: 0,
            target_usd_value: 0,
            current_usd_value: 0,
            sui_rewards: balance::zero<SUI>(),
            staked_sui: balance::zero<SUI>(),
            round: 1,
            is_open: true,
            depositors_count: 0,
            total_lifetime_shares: 0,
            total_fees_collected: 0,
        };
        transfer::share_object(vault);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// Set the target USD value for the current round (e.g., $100 USDC equivalent)
    public fun set_target_usd_value(
        _admin: &AdminCap,
        vault: &mut DustVault,
        value: u64,
    ) {
        vault.target_usd_value = value;
    }

    /// Close vault for deposits (before batch swap)
    public fun close_vault(_admin: &AdminCap, vault: &mut DustVault) {
        vault.is_open = false;
    }

    /// Open vault for deposits
    public fun open_vault(_admin: &AdminCap, vault: &mut DustVault) {
        vault.is_open = true;
    }

    /// Withdraw tokens for batch swap (used in PTB)
    /// Admin specifies which token type to withdraw from the bag
    public fun withdraw_for_swap<T>(
        _admin: &AdminCap,
        vault: &mut DustVault,
        ctx: &mut TxContext,
    ): Coin<T> {
        let token_type = type_name::into_string(type_name::with_original_ids<T>());
        assert!(vault.tokens.contains(token_type), EVaultEmpty);

        let balance_ref = vault.tokens.borrow_mut<String, Balance<T>>(token_type);
        let amount = balance_ref.value();
        assert!(amount > 0, EVaultEmpty);
        
        coin::take(balance_ref, amount, ctx)
    }

    /// Deposit SUI rewards after batch swap WITH automatic fee deduction
    public fun deposit_sui_rewards_with_fee(
        _admin: &AdminCap,
        vault: &mut DustVault,
        sui_coin: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        let total_sui = sui_coin.value();
        
        // Calculate admin fee (2%)
        let admin_fee = (total_sui * ADMIN_FEE_BPS) / BPS_DENOMINATOR;
        let user_rewards = total_sui - admin_fee;
        
        // Convert to balance
        let mut sui_balance = sui_coin.into_balance();
        
        // Split fee for admin
        let fee_balance = balance::split(&mut sui_balance, admin_fee);
        
        // Add remaining to user rewards pool
        vault.sui_rewards.join(sui_balance);
        
        // Track fees collected
        vault.total_fees_collected = vault.total_fees_collected + admin_fee;
        
        // Emit event
        event::emit(BatchSwapCompleteEvent {
            round: vault.round,
            total_sui_received: total_sui,
            admin_fee,
            user_rewards,
            depositors_count: vault.depositors_count,
            timestamp_ms: clock.timestamp_ms(),
        });
        
        // Return admin fee as coin (will be sent to admin wallet)
        coin::from_balance(fee_balance, ctx)
    }

    /// Log batch swap event for individual token
    public fun log_batch_swap<T>(
        _admin: &AdminCap,
        vault: &DustVault,
        amount_swapped: u64,
        sui_received: u64,
        clock: &Clock,
    ) {
        let token_type = type_name::into_string(type_name::with_original_ids<T>());
        event::emit(BatchSwapEvent {
            token_type,
            amount_swapped,
            sui_received,
            round: vault.round,
            timestamp_ms: clock.timestamp_ms(),
        });
    }

    /// Start new round
    public fun new_round(_admin: &AdminCap, vault: &mut DustVault) {
        vault.round = vault.round + 1;
        vault.total_shares = 0;
        vault.depositors_count = 0;
        vault.current_usd_value = 0; // Reset progress
        vault.is_open = true;
        // Note: We do NOT clear tokens or token_types here. 
        // Any leftover tokens in the bag remain for the next round.
    }

    /// Create a governance proposal
    public fun create_proposal(
        _admin: &AdminCap,
        title: vector<u8>,
        duration_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let now = clock.timestamp_ms();
        let proposal = Proposal {
            id: object::new(ctx),
            proposal_id: now, // Using timestamp as ID
            title,
            creator: ctx.sender(),
            votes_for: 0,
            votes_against: 0,
            voters: table::new(ctx),
            start_time_ms: now,
            end_time_ms: now + duration_ms,
            is_active: true,
        };
        transfer::share_object(proposal);
    }

    /// Close a proposal
    public fun close_proposal(_admin: &AdminCap, proposal: &mut Proposal) {
        proposal.is_active = false;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USER FUNCTIONS - DEPOSIT
    // ═══════════════════════════════════════════════════════════════════════════

    /// Deposit dust token to vault
    /// usd_value scaled by 1e6 (e.g., $1.23 = 1_230_000)
    /// reward_preference: 0 = Claim SUI, 1 = Auto-Stake
    public fun deposit_dust<T>(
        vault: &mut DustVault,
        dust_coin: Coin<T>,
        usd_value: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(vault.is_open, EVaultClosed);
        assert!(usd_value > 0, EZeroValue);
        // SECURITY: Prevent USD value manipulation - max $100 per deposit
        assert!(usd_value <= MAX_USD_VALUE, EValueTooHigh);

        let amount = dust_coin.value();
        let user = ctx.sender();
        let token_type = type_name::into_string(type_name::with_original_ids<T>());

        // Store token in Bag
        if (!vault.tokens.contains(token_type)) {
            vault.tokens.add(token_type, balance::zero<T>());
            vault.token_types.insert(token_type);
        };
        
        let balance_ref = vault.tokens.borrow_mut<String, Balance<T>>(token_type);
        balance_ref.join(dust_coin.into_balance());

        // Track shares (shares = usd_value)
        let shares = usd_value;
        if (vault.user_shares.contains(user)) {
            let existing = vault.user_shares.borrow_mut(user);
            *existing = *existing + shares;
        } else {
            vault.user_shares.add(user, shares);
            vault.depositors_count = vault.depositors_count + 1;
        };

        vault.total_shares = vault.total_shares + shares;
        vault.current_usd_value = vault.current_usd_value + shares; // Accumulate value
        vault.total_lifetime_shares = vault.total_lifetime_shares + shares;

        event::emit(DustDepositedEvent {
            user,
            token_type,
            amount,
            usd_value,
            shares,
            round: vault.round,
            timestamp_ms: clock.timestamp_ms(),
        });
    }

    /// Create deposit receipt (call after all deposits done)
    public fun create_receipt(
        vault: &mut DustVault,
        reward_preference: u8,
        ctx: &mut TxContext,
    ): DepositReceipt {
        let user = ctx.sender();
        assert!(vault.user_shares.contains(user), ENoShares);

        let shares = *vault.user_shares.borrow(user);

        DepositReceipt {
            id: object::new(ctx),
            depositor: user,
            shares,
            round: vault.round,
            reward_preference,
        }
    }

    /// Create or update DustDAO membership
    public fun create_membership(
        vault: &DustVault,
        clock: &Clock,
        ctx: &mut TxContext,
    ): DustDAOMembership {
        let user = ctx.sender();
        let shares = if (vault.user_shares.contains(user)) {
            *vault.user_shares.borrow(user)
        } else {
            0
        };

        event::emit(MembershipCreatedEvent {
            user,
            initial_shares: shares,
            timestamp_ms: clock.timestamp_ms(),
        });

        DustDAOMembership {
            id: object::new(ctx),
            member: user,
            lifetime_shares: shares,
            total_sui_earned: 0,
            staked_amount: 0,
            reward_preference: REWARD_CLAIM,
            joined_at_ms: clock.timestamp_ms(),
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USER FUNCTIONS - CLAIM / STAKE
    // ═══════════════════════════════════════════════════════════════════════════

    /// Claim SUI rewards (Option A)
    public fun claim_rewards(
        vault: &mut DustVault,
        receipt: DepositReceipt,
        membership: &mut DustDAOMembership,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        let DepositReceipt { id, depositor, shares, round, reward_preference: _ } = receipt;
        object::delete(id);

        assert!(round == vault.round, EWrongRound);
        assert!(vault.sui_rewards.value() > 0, EVaultEmpty);
        assert!(shares > 0, ENoShares);

        // Calculate share: (user_shares / total_shares) * total_sui
        let total_sui = vault.sui_rewards.value();
        let user_sui = ((shares as u128) * (total_sui as u128) / (vault.total_shares as u128)) as u64;

        // Update membership
        membership.lifetime_shares = membership.lifetime_shares + shares;
        membership.total_sui_earned = membership.total_sui_earned + user_sui;

        // Remove from user_shares
        if (vault.user_shares.contains(depositor)) {
            let _ = vault.user_shares.remove(depositor);
        };

        event::emit(RewardsClaimedEvent {
            user: depositor,
            shares,
            sui_amount: user_sui,
            round,
            timestamp_ms: clock.timestamp_ms(),
        });

        coin::take(&mut vault.sui_rewards, user_sui, ctx)
    }

    /// Auto-stake rewards (Option B)
    /// SUI goes to staked_sui pool, user's staked_amount increases
    public fun stake_rewards(
        vault: &mut DustVault,
        receipt: DepositReceipt,
        membership: &mut DustDAOMembership,
        clock: &Clock,
    ) {
        let DepositReceipt { id, depositor, shares, round, reward_preference: _ } = receipt;
        object::delete(id);

        assert!(round == vault.round, EWrongRound);
        assert!(vault.sui_rewards.value() > 0, EVaultEmpty);
        assert!(shares > 0, ENoShares);

        // Calculate share
        let total_sui = vault.sui_rewards.value();
        let user_sui = ((shares as u128) * (total_sui as u128) / (vault.total_shares as u128)) as u64;

        // Move from rewards to staked pool
        let staked_balance = balance::split(&mut vault.sui_rewards, user_sui);
        vault.staked_sui.join(staked_balance);

        // Update membership
        membership.lifetime_shares = membership.lifetime_shares + shares;
        membership.staked_amount = membership.staked_amount + user_sui;
        membership.reward_preference = REWARD_STAKE;

        // Remove from user_shares
        if (vault.user_shares.contains(depositor)) {
            let _ = vault.user_shares.remove(depositor);
        };

        event::emit(RewardsStakedEvent {
            user: depositor,
            shares,
            sui_amount: user_sui,
            round,
            timestamp_ms: clock.timestamp_ms(),
        });
    }

    /// Withdraw staked SUI
    public fun withdraw_staked(
        vault: &mut DustVault,
        membership: &mut DustDAOMembership,
        amount: u64,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        assert!(membership.staked_amount >= amount, EVaultEmpty);

        membership.staked_amount = membership.staked_amount - amount;
        coin::take(&mut vault.staked_sui, amount, ctx)
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // GOVERNANCE / VOTING
    // ═══════════════════════════════════════════════════════════════════════════

    /// Vote on a proposal
    /// Voting power = lifetime_shares
    public fun vote(
        proposal: &mut Proposal,
        membership: &DustDAOMembership,
        vote_for: bool,
        clock: &Clock,
    ) {
        let voter = membership.member;
        let voting_power = membership.lifetime_shares;

        assert!(voting_power > 0, ENoVotingPower);
        assert!(proposal.is_active, EProposalNotActive);
        assert!(clock.timestamp_ms() <= proposal.end_time_ms, EProposalNotActive);
        assert!(!proposal.voters.contains(voter), EAlreadyVoted);

        // Record vote
        proposal.voters.add(voter, vote_for);

        if (vote_for) {
            proposal.votes_for = proposal.votes_for + voting_power;
        } else {
            proposal.votes_against = proposal.votes_against + voting_power;
        };

        event::emit(VoteCastEvent {
            voter,
            proposal_id: proposal.proposal_id,
            vote_for,
            voting_power,
            timestamp_ms: clock.timestamp_ms(),
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INDIVIDUAL MODE (Direct swap logging)
    // ═══════════════════════════════════════════════════════════════════════════

    public fun log_individual_swap<T>(
        amount: u64,
        sui_received: u64,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let token_type = type_name::into_string(type_name::with_original_ids<T>());
        event::emit(IndividualSwapEvent {
            user: ctx.sender(),
            token_type,
            amount,
            sui_received,
            timestamp_ms: clock.timestamp_ms(),
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    public fun vault_admin(vault: &DustVault): address { vault.admin }
    public fun vault_total_shares(vault: &DustVault): u64 { vault.total_shares }
    public fun vault_target_value(vault: &DustVault): u64 { vault.target_usd_value }
    public fun vault_current_value(vault: &DustVault): u64 { vault.current_usd_value }
    public fun vault_sui_rewards(vault: &DustVault): u64 { vault.sui_rewards.value() }
    public fun vault_staked_sui(vault: &DustVault): u64 { vault.staked_sui.value() }
    public fun vault_round(vault: &DustVault): u64 { vault.round }
    public fun vault_is_open(vault: &DustVault): bool { vault.is_open }
    public fun vault_depositors_count(vault: &DustVault): u64 { vault.depositors_count }
    public fun vault_lifetime_shares(vault: &DustVault): u64 { vault.total_lifetime_shares }
    public fun vault_total_fees(vault: &DustVault): u64 { vault.total_fees_collected }
    public fun admin_fee_bps(): u64 { ADMIN_FEE_BPS }

    public fun user_shares(vault: &DustVault, user: address): u64 {
        if (vault.user_shares.contains(user)) { *vault.user_shares.borrow(user) } else { 0 }
    }

    public fun vault_token_balance<T>(vault: &DustVault): u64 {
        let token_type = type_name::into_string(type_name::with_original_ids<T>());
        if (vault.tokens.contains(token_type)) {
            let balance: &Balance<T> = vault.tokens.borrow(token_type);
            balance.value()
        } else {
            0
        }
    }

    public fun vault_token_types(vault: &DustVault): vector<String> {
        *vault.token_types.keys()
    }

    public fun membership_lifetime_shares(m: &DustDAOMembership): u64 { m.lifetime_shares }
    public fun membership_total_earned(m: &DustDAOMembership): u64 { m.total_sui_earned }
    public fun membership_staked(m: &DustDAOMembership): u64 { m.staked_amount }
    public fun membership_preference(m: &DustDAOMembership): u8 { m.reward_preference }

    public fun receipt_shares(r: &DepositReceipt): u64 { r.shares }
    public fun receipt_round(r: &DepositReceipt): u64 { r.round }

    public fun proposal_votes_for(p: &Proposal): u64 { p.votes_for }
    public fun proposal_votes_against(p: &Proposal): u64 { p.votes_against }
        public fun proposal_is_active(p: &Proposal): bool { p.is_active }
    
        #[test_only]
        public fun init_for_testing(ctx: &mut TxContext) {
            init(ctx);
        }
    }
    