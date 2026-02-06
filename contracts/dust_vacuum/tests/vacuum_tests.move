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
    fun test_deposit_dust() {
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
            assert!(vacuum::user_shares(&vault, USER) == 1_000_000, 1);
            
            // Verify bag storage (new architecture)
            assert!(vacuum::vault_token_balance<SUI>(&vault) == 1_000_000_000, 2);

            ts::return_shared(vault);
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_withdraw_for_swap() {
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
            let dust = coin::mint_for_testing<SUI>(500, scenario.ctx());
            
            vacuum::deposit_dust<SUI>(&mut vault, dust, 500, &clock, scenario.ctx());
            
            ts::return_shared(vault);
            ts::return_shared(clock);
        };

        // 3. Admin withdraws for swap
        ts::next_tx(&mut scenario, admin);
        {
            let mut vault = ts::take_shared<vacuum::DustVault>(&scenario);
            let admin_cap = ts::take_from_sender<vacuum::AdminCap>(&scenario);
            
            // Admin withdraws SUI from the bag to swap it
            let coin_to_swap = vacuum::withdraw_for_swap<SUI>(&admin_cap, &mut vault, scenario.ctx());
            
            assert!(coin::value(&coin_to_swap) == 500, 0);
            assert!(vacuum::vault_token_balance<SUI>(&vault) == 0, 1);

            transfer::public_transfer(coin_to_swap, admin);
            ts::return_shared(vault);
            ts::return_to_sender(&scenario, admin_cap);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_admin_fee_distribution() {
        let mut scenario = setup();
        let admin = ts::ctx(&mut scenario).sender();

        // 1. Init
        ts::next_tx(&mut scenario, admin);
        {
            vacuum::init_for_testing(scenario.ctx());
            let clock = clock::create_for_testing(scenario.ctx());
            clock::share_for_testing(clock);
        };

        // 2. Deposit SUI rewards (Simulate post-swap)
        ts::next_tx(&mut scenario, admin);
        {
            let mut vault = ts::take_shared<vacuum::DustVault>(&scenario);
            let admin_cap = ts::take_from_sender<vacuum::AdminCap>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            // Simulate 100 SUI received from swap
            let reward_coin = coin::mint_for_testing<SUI>(100_000, scenario.ctx());
            
            // Function returns the FEE coin for admin
            let fee_coin = vacuum::deposit_sui_rewards_with_fee(
                &admin_cap, 
                &mut vault, 
                reward_coin, 
                &clock, 
                scenario.ctx()
            );

            // Check Fee (2% of 100,000 = 2,000)
            assert!(coin::value(&fee_coin) == 2000, 0);
            
            // Check User Rewards (98% = 98,000)
            assert!(vacuum::vault_sui_rewards(&vault) == 98000, 1);

            transfer::public_transfer(fee_coin, admin);
            ts::return_shared(vault);
            ts::return_shared(clock);
            ts::return_to_sender(&scenario, admin_cap);
        };

        ts::end(scenario);
    }
}