// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MockUSDC.sol";
import "../src/OutcomeToken.sol";
import "../src/PredictionMarket.sol";

contract PredictionMarketTest is Test {
    MockUSDC usdc;
    PredictionMarket market;

    address forwarder = makeAddr("chainlink-forwarder");

    uint256 constant BACKEND_PK = 0xBACE;
    uint256 constant USER_PK = 0x1;
    uint256 constant USER2_PK = 0x2;

    address backend;
    address user;
    address user2;

    function setUp() public {
        backend = vm.addr(BACKEND_PK);
        user = vm.addr(USER_PK);
        user2 = vm.addr(USER2_PK);

        usdc = new MockUSDC();
        market = new PredictionMarket(address(usdc), forwarder, backend);
    }

    // ── Market Creation ────────────────────────────────
    function test_createMarket() public {
        uint256 id = _createMarket(keccak256("BTC 100k?"), block.timestamp + 30 days);
        assertEq(id, 0);

        PredictionMarket.Market memory m = market.getMarket(0);
        assertEq(uint8(m.status), uint8(PredictionMarket.MarketStatus.Open));
        assertEq(uint8(m.outcome), uint8(PredictionMarket.Outcome.Unresolved));
    }

    function test_cannotCreateDuplicate() public {
        bytes32 h = keccak256("BTC 100k?");
        _createMarket(h, block.timestamp + 30 days);
        vm.expectRevert("Market already exists");
        vm.prank(backend);
        market.createMarket(h, block.timestamp + 30 days);
    }

    function test_cannotCreatePastResolution() public {
        vm.prank(backend);
        vm.expectRevert("Resolution must be in future");
        market.createMarket(keccak256("old"), block.timestamp - 1);
    }

    function test_nonOwnerCannotCreateMarket() public {
        vm.prank(user);
        vm.expectRevert("Not owner");
        market.createMarket(keccak256("BTC?"), block.timestamp + 30 days);
    }

    function test_createMultipleMarkets_uint2strWorks() public {
        _createMarket(keccak256("Market 0?"), block.timestamp + 1 days);
        uint256 id1 = _createMarket(keccak256("Market 1?"), block.timestamp + 2 days);
        assertEq(id1, 1);
        (address yes1, address no1) = market.getTokenAddresses(1);
        assertTrue(yes1 != address(0));
        assertTrue(no1 != address(0));
    }

    // ── Access control ────────────────────────────────
    function test_nonOwnerCannotFillOrder() public {
        _createMarket(keccak256("BTC?"), block.timestamp + 30 days);
        Order memory o = _order(0, uint8(PredictionMarket.Outcome.Yes), user, 1_000_000, 720_000, 0);
        bytes memory sig = _signBytes(o, USER_PK);

        vm.prank(user);
        vm.expectRevert("Not owner");
        market.fillOrder(o, sig);
    }

    // ── fillOrder ─────────────────────────────────────
    function test_fillOrder_1to1() public {
        _createMarket(keccak256("BTC?"), block.timestamp + 30 days);
        PredictionMarket.Market memory m = market.getMarket(0);

        uint256 cost = 1_000_000; // $1
        uint256 shares = 1_000_000;

        _fund(user, cost);
        Order memory o = _order(0, uint8(PredictionMarket.Outcome.Yes), user, shares, cost, 0);
        bytes memory sig = _signBytes(o, USER_PK);

        vm.prank(backend);
        market.fillOrder(o, sig);

        assertEq(OutcomeToken(address(m.yesToken)).balanceOf(user), shares);
        assertEq(usdc.balanceOf(address(market)), cost);
    }

    /// @notice YES at 72¢: $5 USDC → 6,944,444 shares
    function test_fillOrder_probabilityPricing() public {
        _createMarket(keccak256("BTC?"), block.timestamp + 30 days);
        PredictionMarket.Market memory m = market.getMarket(0);

        uint256 cost = 5_000_000; // $5
        uint256 shares = 6_944_444; // floor(5 / 0.72) × 1e6

        _fund(user, cost);
        Order memory o = _order(0, uint8(PredictionMarket.Outcome.Yes), user, shares, cost, 0);
        bytes memory sig = _signBytes(o, USER_PK);

        vm.prank(backend);
        market.fillOrder(o, sig);

        assertEq(OutcomeToken(address(m.yesToken)).balanceOf(user), 6_944_444);
        assertEq(usdc.balanceOf(address(market)), cost);
    }

    function test_fillOrder_noSide() public {
        _createMarket(keccak256("BTC?"), block.timestamp + 30 days);
        PredictionMarket.Market memory m = market.getMarket(0);

        uint256 cost = 280_000; // 28¢
        uint256 shares = 1_000_000;

        _fund(user, cost);
        Order memory o = _order(0, uint8(PredictionMarket.Outcome.No), user, shares, cost, 0);
        bytes memory sig = _signBytes(o, USER_PK);

        vm.prank(backend);
        market.fillOrder(o, sig);

        assertEq(OutcomeToken(address(m.noToken)).balanceOf(user), shares);
    }

    // ── Replay protection ────────────────────────────
    function test_cannotReplayOrder() public {
        _createMarket(keccak256("BTC?"), block.timestamp + 30 days);
        _fund(user, 2_000_000);

        Order memory o = _order(0, uint8(PredictionMarket.Outcome.Yes), user, 1_000_000, 1_000_000, 0);
        bytes memory sig = _signBytes(o, USER_PK);

        vm.prank(backend);
        market.fillOrder(o, sig);
        vm.prank(backend);
        vm.expectRevert();
        market.fillOrder(o, sig);
    }

    // ── batchFillOrders ──────────────────────────────
    function test_batchFillOrders() public {
        _createMarket(keccak256("BTC?"), block.timestamp + 30 days);
        PredictionMarket.Market memory m = market.getMarket(0);

        _fund(user, 720_000);
        _fund(user2, 280_000);

        Order[] memory orders = new Order[](2);
        orders[0] = _order(0, uint8(PredictionMarket.Outcome.Yes), user, 1_000_000, 720_000, 0);
        orders[1] = _order(0, uint8(PredictionMarket.Outcome.No), user2, 1_000_000, 280_000, 0);

        bytes[] memory sigs = new bytes[](2);
        sigs[0] = _signBytes(orders[0], USER_PK);
        sigs[1] = _signBytes(orders[1], USER2_PK);

        vm.prank(backend);
        market.batchFillOrders(orders, sigs);

        assertEq(OutcomeToken(address(m.yesToken)).balanceOf(user), 1_000_000);
        assertEq(OutcomeToken(address(m.noToken)).balanceOf(user2), 1_000_000);
        assertEq(usdc.balanceOf(address(market)), 1_000_000);
    }

    // ── CRE Resolution ────────────────────────────────
    function test_resolveViaOnReport() public {
        _createMarket(keccak256("BTC?"), block.timestamp + 30 days);
        vm.prank(forwarder);
        market.onReport("", abi.encode(uint256(0), uint8(1))); // Yes

        assertEq(uint8(market.getMarket(0).status), uint8(PredictionMarket.MarketStatus.Resolved));
        assertEq(uint8(market.getMarket(0).outcome), uint8(PredictionMarket.Outcome.Yes));
    }

    function test_nonForwarderCannotResolve() public {
        _createMarket(keccak256("BTC?"), block.timestamp + 30 days);
        vm.expectRevert("Only Chainlink Forwarder");
        market.onReport("", abi.encode(uint256(0), uint8(1)));
    }

    // ── Cancel ────────────────────────────────────────
    function test_cancelMarket() public {
        _createMarket(keccak256("BTC?"), block.timestamp + 30 days);
        vm.prank(backend);
        market.cancelMarket(0);
        assertEq(uint8(market.getMarket(0).status), uint8(PredictionMarket.MarketStatus.Cancelled));
    }

    function test_cannotFillOrderOnCancelledMarket() public {
        _createMarket(keccak256("BTC?"), block.timestamp + 30 days);
        vm.prank(backend);
        market.cancelMarket(0);
        _fund(user, 1_000_000);
        Order memory o = _order(0, uint8(PredictionMarket.Outcome.Yes), user, 1_000_000, 1_000_000, 0);
        bytes memory sig = _signBytes(o, USER_PK);
        vm.expectRevert("Market not open");
        vm.prank(backend);
        market.fillOrder(o, sig);
    }

    // ── Full flow: fill → resolve → redeem ────────────
    function test_fullFlow() public {
        _createMarket(keccak256("BTC?"), block.timestamp + 30 days);
        PredictionMarket.Market memory m = market.getMarket(0);

        uint256 cost = 1_000_000;
        uint256 shares = 1_000_000;

        _fund(user, cost);
        Order memory o = _order(0, uint8(PredictionMarket.Outcome.Yes), user, shares, cost, 0);
        bytes memory sig = _signBytes(o, USER_PK);

        vm.prank(backend);
        market.fillOrder(o, sig);

        vm.prank(forwarder);
        market.onReport("", abi.encode(uint256(0), uint8(1))); // YES wins

        vm.prank(user);
        market.redeemWinning(0, shares);

        assertEq(usdc.balanceOf(user), shares);
    }

    // ── Helpers ──────────────────────────────────────

    function _createMarket(bytes32 questionHash, uint256 resolutionTimestamp) internal returns (uint256) {
        vm.prank(backend);
        return market.createMarket(questionHash, resolutionTimestamp);
    }

    function _fund(address who, uint256 amount) internal {
        vm.startPrank(who);
        usdc.faucet(amount);
        usdc.approve(address(market), amount);
        vm.stopPrank();
    }

    function _order(uint256 marketId, uint8 outcome, address to, uint256 shares, uint256 cost, uint256 nonceOverride)
        internal
        view
        returns (Order memory)
    {
        address buyer = outcome == uint8(PredictionMarket.Outcome.Yes) ? user : user2;
        uint256 nonce = nonceOverride != 0 ? nonceOverride : market.nonces(buyer);
        return Order(marketId, outcome, to, shares, cost, block.timestamp + 1 hours, nonce);
    }

    function _signBytes(Order memory o, uint256 pk) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(market.ORDER_TYPEHASH(), o.marketId, o.outcome, o.to, o.shares, o.cost, o.deadline, o.nonce)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSep(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _domainSep() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("PredictionMarket")),
                keccak256(bytes("1")),
                block.chainid,
                address(market)
            )
        );
    }
}
