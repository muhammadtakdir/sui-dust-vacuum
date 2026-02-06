/// Tests for Sui Dust Vacuum contract
#[test_only]
module dust_vacuum::vacuum_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use sui::coin;
    use sui::sui::SUI;
    use sui::transfer;
    use dust_vacuum::vacuum;
    use std::ascii::String;

    const USER: address = @0xCAFE;
    const ADMIN: address = @0xAD;

    fun setup(): Scenario {
        ts::begin(ADMIN)
    }

    #[test]
    fun test_deposit_dust_creates_receipt() {
        let mut scenario = setup();
        let admin = ts::ctx(&mut scenario).sender();

        // 1. Init contract
        ts::next_tx(&mut scenario, admin);
        {
            vacuum::init_for_testing(scenario.ctx());
        };

        // 2. Create Clock
        ts::next_tx(&mut scenario, admin);
        {
            let clock = clock::create_for_testing(scenario.ctx());
            clock::share_for_testing(clock);
        };

        // 3. User deposits dust
        ts::next_tx(&mut scenario, USER);
        {
            let mut vault = ts::take_shared<vacuum::DustVault>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            // Mint 1 SUI (1_000_000_000 MIST)
            let dust = coin::mint_for_testing<SUI>(1_000_000_000, scenario.ctx());
            
            // Deposit with $1.00 value (1_000_000 usd_shares)
            vacuum::deposit_dust<SUI>(
                &mut vault, 
                dust, 
                1_000_000, 
                &clock, 
                scenario.ctx()
            );

            // Verify logic
            assert!(vacuum::vault_total_shares(&vault) == 1_000_000, 0);
            
            // Verify bag storage (new architecture)
            assert!(vacuum::vault_token_balance<SUI>(&vault) == 1_000_000_000, 2);

            ts::return_shared(vault);
            ts::return_shared(clock);
        };

        // 4. Verify Receipt exists for USER
        ts::next_tx(&mut scenario, USER);
        {
            let receipt = ts::take_from_sender<vacuum::DepositReceipt>(&scenario);
            assert!(vacuum::receipt_shares(&receipt) == 1_000_000, 3);
            assert!(vacuum::receipt_round(&receipt) == 1, 4);
            ts::return_to_sender(&scenario, receipt);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_claim_rewards_flow() {
        let mut scenario = setup();
        let admin = ts::ctx(&mut scenario).sender();

        // 1. Init & Setup
        ts::next_tx(&mut scenario, admin);
        {
            vacuum::init_for_testing(scenario.ctx());
            let clock = clock::create_for_testing(scenario.ctx());
            clock::share_for_testing(clock);
        };

        // 2. User deposits
        ts::next_tx(&mut scenario, USER);
        {
            let mut vault = ts::take_shared<vacuum::DustVault>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            let dust = coin::mint_for_testing<SUI>(1_000_000, scenario.ctx());
            
            // Deposit: 1 share
            vacuum::deposit_dust<SUI>(&mut vault, dust, 1, &clock, scenario.ctx());
            
            // Create membership for claiming later
            let membership = vacuum::create_membership(&vault, &clock, scenario.ctx());
            transfer::public_transfer(membership, USER);

            ts::return_shared(vault);
            ts::return_shared(clock);
        };

        // 3. Admin Finalizes Round (Deposits SUI Rewards)
        ts::next_tx(&mut scenario, admin);
        {
            let mut vault = ts::take_shared<vacuum::DustVault>(&scenario);
            let admin_cap = ts::take_from_sender<vacuum::AdminCap>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            // 100 SUI reward
            let reward_coin = coin::mint_for_testing<SUI>(100_000, scenario.ctx());
            
            // This finalizes Round 1
            let fee_coin = vacuum::deposit_sui_rewards_with_fee(
                &admin_cap, 
                &mut vault, 
                reward_coin, 
                &clock, 
                scenario.ctx()
            );

            transfer::public_transfer(fee_coin, admin);
            
            // Vault should be in Round 2 now
            assert!(vacuum::vault_round(&vault) == 2, 0);

            ts::return_shared(vault);
            ts::return_shared(clock);
            ts::return_to_sender(&scenario, admin_cap);
        };

        // 4. User Claims Rewards
        ts::next_tx(&mut scenario, USER);
        {
            let mut vault = ts::take_shared<vacuum::DustVault>(&scenario);
            let receipt = ts::take_from_sender<vacuum::DepositReceipt>(&scenario);
            let mut membership = ts::take_from_sender<vacuum::DustDAOMembership>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);

            // Verify receipt is for Round 1
            assert!(vacuum::receipt_round(&receipt) == 1, 1);

            // Claim
            let reward = vacuum::claim_rewards(
                &mut vault,
                receipt,
                &mut membership,
                &clock,
                scenario.ctx()
            );

            // Expect: 100_000 * 0.98 = 98,000 (after 2% fee)
            // Share was 100% (1/1)
            assert!(coin::value(&reward) == 98000, 2);

            transfer::public_transfer(reward, USER);
            ts::return_shared(vault);
            ts::return_shared(clock);
            ts::return_to_sender(&scenario, membership);
        };

        ts::end(scenario);
    }
}
