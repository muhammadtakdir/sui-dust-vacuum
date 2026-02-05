/// Tests for Sui Dust Vacuum contract
#[test_only]
module dust_vacuum::vacuum_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use sui::coin;
    use sui::sui::SUI;
    use dust_vacuum::vacuum;

    const USER: address = @0xCAFE;

    fun setup(): Scenario {
        ts::begin(USER)
    }

    #[test]
    fun test_burn_dust() {
        let mut scenario = setup();
        
        // Create clock
        ts::next_tx(&mut scenario, USER);
        {
            let clock = clock::create_for_testing(scenario.ctx());
            clock::share_for_testing(clock);
        };

        // Burn some SUI dust
        ts::next_tx(&mut scenario, USER);
        {
            let clock = ts::take_shared<Clock>(&scenario);
            
            // Create a small amount of SUI (dust)
            let dust = coin::mint_for_testing<SUI>(100_000, scenario.ctx()); // 0.0001 SUI
            
            // Burn the dust
            vacuum::burn_dust(dust, &clock, scenario.ctx());
            
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_log_swap() {
        let mut scenario = setup();
        
        // Create clock
        ts::next_tx(&mut scenario, USER);
        {
            let clock = clock::create_for_testing(scenario.ctx());
            clock::share_for_testing(clock);
        };

        // Log a swap
        ts::next_tx(&mut scenario, USER);
        {
            let clock = ts::take_shared<Clock>(&scenario);
            
            // Log swap of 1_000_000 units (some token amount)
            vacuum::log_swap<SUI>(1_000_000, &clock, scenario.ctx());
            
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_log_batch_complete() {
        let mut scenario = setup();
        
        // Create clock
        ts::next_tx(&mut scenario, USER);
        {
            let clock = clock::create_for_testing(scenario.ctx());
            clock::share_for_testing(clock);
        };

        // Log batch completion
        ts::next_tx(&mut scenario, USER);
        {
            let clock = ts::take_shared<Clock>(&scenario);
            
            // Log batch: 5 tokens vacuumed, 1 SUI received
            vacuum::log_batch_complete(5, 1_000_000_000, &clock, scenario.ctx());
            
            ts::return_shared(clock);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_verify_dust_value() {
        let mut scenario = setup();
        
        ts::next_tx(&mut scenario, USER);
        {
            let dust = coin::mint_for_testing<SUI>(500_000, scenario.ctx());
            let value = vacuum::verify_dust_value(&dust);
            assert!(value == 500_000, 0);
            
            // Clean up
            transfer::public_transfer(dust, USER);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_action_constants() {
        assert!(vacuum::action_burn() == 0, 0);
        assert!(vacuum::action_swap() == 1, 1);
    }

    #[test]
    fun test_dead_address() {
        assert!(vacuum::dead_address() == @0x0, 0);
    }
}
