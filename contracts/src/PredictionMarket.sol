// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";
import "./OutcomeToken.sol";
import "./IReceiver.sol";

/// @title PredictionMarket
/// @notice Owner-gated prediction market. Users sign EIP-712 orders committing to
///         exact shares + cost. Owner submits the tx; user only needs a one-time
///         USDC approval. Markets resolved by the Chainlink CRE Forwarder.
contract PredictionMarket is IReceiver, EIP712, Nonces {
    // ── Types ──────────────────────────────────────────
    enum MarketStatus {
        Open,
        Resolved,
        Cancelled
    }
    enum Outcome {
        Unresolved,
        Yes,
        No
    }

    struct Market {
        bytes32 questionHash;
        address creator;
        OutcomeToken yesToken;
        OutcomeToken noToken;
        uint256 resolutionTimestamp;
        uint256 totalCollateral;
        MarketStatus status;
        Outcome outcome;
    }

    // ── State ──────────────────────────────────────────
    IERC20 public immutable collateralToken;
    address public forwarder;
    address public owner;

    uint256 public marketCount;
    mapping(uint256 => Market) public markets;
    mapping(bytes32 => bool) public questionExists;

    /// @dev User signs: marketId, outcome, to, shares, cost, deadline, nonce
    ///      Both shares and cost are committed — backend cannot alter either.
    bytes32 public constant ORDER_TYPEHASH = keccak256(
        "Order(uint256 marketId,uint8 outcome,address to,uint256 shares,uint256 cost,uint256 deadline,uint256 nonce)"
    );

    // ── Events ─────────────────────────────────────────
    event MarketCreated(
        uint256 indexed marketId,
        bytes32 questionHash,
        address creator,
        address yesToken,
        address noToken,
        uint256 resolutionTimestamp
    );
    event OrderFilled(uint256 indexed marketId, address indexed buyer, Outcome outcome, uint256 shares, uint256 cost);
    event MarketResolved(uint256 indexed marketId, Outcome outcome);
    event MarketCancelled(uint256 indexed marketId);
    event WinningsRedeemed(uint256 indexed marketId, address indexed user, uint256 amount);

    // ── Modifiers ──────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    modifier onlyForwarder() {
        require(msg.sender == forwarder, "Only Chainlink Forwarder");
        _;
    }

    // ── Constructor ────────────────────────────────────
    constructor(address _collateralToken, address _forwarder, address _owner) EIP712("PredictionMarket", "1") {
        collateralToken = IERC20(_collateralToken);
        forwarder = _forwarder;
        owner = _owner;
    }

    // ════════════════════════════════════════════════════
    // MARKET CREATION
    // ════════════════════════════════════════════════════

    function createMarket(bytes32 questionHash, uint256 resolutionTimestamp) external onlyOwner returns (uint256) {
        require(resolutionTimestamp > block.timestamp, "Resolution must be in future");
        require(!questionExists[questionHash], "Market already exists");

        uint256 marketId = marketCount++;
        OutcomeToken yesToken =
            new OutcomeToken(string.concat("YES-", _uint2str(marketId)), string.concat("YES-", _uint2str(marketId)));
        OutcomeToken noToken =
            new OutcomeToken(string.concat("NO-", _uint2str(marketId)), string.concat("NO-", _uint2str(marketId)));

        markets[marketId] = Market({
            questionHash: questionHash,
            creator: msg.sender,
            yesToken: yesToken,
            noToken: noToken,
            resolutionTimestamp: resolutionTimestamp,
            totalCollateral: 0,
            status: MarketStatus.Open,
            outcome: Outcome.Unresolved
        });
        questionExists[questionHash] = true;

        emit MarketCreated(marketId, questionHash, msg.sender, address(yesToken), address(noToken), resolutionTimestamp);
        return marketId;
    }

    // ════════════════════════════════════════════════════
    // ORDER EXECUTION (owner submits, user signature required)
    // ════════════════════════════════════════════════════
    // Flow:
    //   1. Backend quotes price (e.g. YES at 72¢)
    //   2. User signs an Order: shares = cost / price, cost = USDC amount they pay
    //   3. User approves this contract for USDC (one-time)
    //   4. Backend calls fillOrder — pulls USDC, mints shares, zero gas for user

    /// @notice Fill a single signed order
    /// @param order     The signed order struct
    /// @param signature EIP-712 signature from buyer (65 bytes: r,s,v)
    function fillOrder(Order calldata order, bytes calldata signature) external onlyOwner {
        address buyer = _verifyOrder(order, signature);
        Outcome outcome = Outcome(order.outcome);
        _pullAndMint(order.marketId, outcome, order.to, order.shares, order.cost, buyer);
        emit OrderFilled(order.marketId, buyer, outcome, order.shares, order.cost);
    }

    /// @notice Batch fill multiple signed orders in one tx
    function batchFillOrders(Order[] calldata orders, bytes[] calldata signatures) external onlyOwner {
        uint256 n = orders.length;
        require(n == signatures.length, "Length mismatch");
        for (uint256 i; i < n;) {
            _fillOneOrder(orders[i], signatures[i]);
            unchecked {
                ++i;
            }
        }
    }

    // ════════════════════════════════════════════════════
    // CRE RESOLUTION (Chainlink Forwarder → onReport)
    // ════════════════════════════════════════════════════

    /// @param metadata Workflow metadata (ignored, required by interface)
    /// @param report   ABI-encoded (uint256 marketId, uint8 outcome)
    function onReport(bytes calldata metadata, bytes calldata report) external onlyForwarder {
        (uint256 marketId, uint8 outcomeRaw) = abi.decode(report, (uint256, uint8));
        Outcome outcome = Outcome(outcomeRaw);

        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Open, "Market not open");
        require(outcome == Outcome.Yes || outcome == Outcome.No, "Invalid outcome");

        market.status = MarketStatus.Resolved;
        market.outcome = outcome;
        emit MarketResolved(marketId, outcome);
    }

    /// @notice Cancel an open market — owner only
    function cancelMarket(uint256 marketId) external onlyOwner {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Open, "Market not open");
        market.status = MarketStatus.Cancelled;
        emit MarketCancelled(marketId);
    }

    // ════════════════════════════════════════════════════
    // REDEMPTION (permissionless — user redeems their own tokens)
    // ════════════════════════════════════════════════════

    /// @notice Burn winning shares → receive 1 USDC per share
    function redeemWinning(uint256 marketId, uint256 amount) external {
        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Resolved, "Market not resolved");

        OutcomeToken winningToken = market.outcome == Outcome.Yes ? market.yesToken : market.noToken;
        require(winningToken.balanceOf(msg.sender) >= amount, "Insufficient tokens");

        winningToken.burn(msg.sender, amount);
        market.totalCollateral -= amount;

        bool ok = collateralToken.transfer(msg.sender, amount);
        require(ok, "USDC transfer failed");

        emit WinningsRedeemed(marketId, msg.sender, amount);
    }

    // ════════════════════════════════════════════════════
    // ADMIN
    // ════════════════════════════════════════════════════

    function setForwarder(address _forwarder) external onlyOwner {
        require(_forwarder != address(0), "Zero address");
        forwarder = _forwarder;
    }

    function setOwner(address _owner) external onlyOwner {
        require(_owner != address(0), "Zero address");
        owner = _owner;
    }

    // ════════════════════════════════════════════════════
    // VIEW
    // ════════════════════════════════════════════════════

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getTokenAddresses(uint256 marketId) external view returns (address yes, address no) {
        return (address(markets[marketId].yesToken), address(markets[marketId].noToken));
    }

    /// @notice Returns the EIP-712 digest for a given order (useful for frontend signing)
    function orderDigest(Order calldata order) external view returns (bytes32) {
        return _hashTypedDataV4(_structHash(order));
    }

    // ── Internal ───────────────────────────────────────

    function _verifyOrder(Order calldata order, bytes calldata signature) internal returns (address buyer) {
        require(block.timestamp <= order.deadline, "Order expired");
        require(signature.length == 64 || signature.length == 65, "Invalid signature length");
        _validateOrder(order);
        buyer = ECDSA.recover(_hashTypedDataV4(_structHash(order)), signature);
        require(buyer != address(0), "Invalid signature");
        _useCheckedNonce(buyer, order.nonce);
    }

    function _validateOrder(Order calldata order) internal pure {
        require(order.outcome == uint8(Outcome.Yes) || order.outcome == uint8(Outcome.No), "Invalid outcome");
        require(order.to != address(0), "Zero recipient");
        require(order.shares > 0, "Zero shares");
        require(order.cost > 0, "Zero cost");
    }

    function _structHash(Order calldata order) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                ORDER_TYPEHASH,
                order.marketId,
                order.outcome,
                order.to,
                order.shares,
                order.cost,
                order.deadline,
                order.nonce
            )
        );
    }

    function _fillOneOrder(Order calldata order, bytes calldata signature) internal {
        address buyer = _verifyOrder(order, signature);
        Outcome outcome = Outcome(order.outcome);
        _pullAndMint(order.marketId, outcome, order.to, order.shares, order.cost, buyer);
        emit OrderFilled(order.marketId, buyer, outcome, order.shares, order.cost);
    }

    function _pullAndMint(uint256 marketId, Outcome outcome, address to, uint256 shares, uint256 cost, address payer)
        internal
    {
        require(marketId < marketCount, "Market does not exist");
        bool ok = collateralToken.transferFrom(payer, address(this), cost);
        require(ok, "USDC transfer failed");

        Market storage market = markets[marketId];
        require(market.status == MarketStatus.Open, "Market not open");

        if (outcome == Outcome.Yes) {
            market.yesToken.mint(to, shares);
            market.noToken.mint(address(this), shares); // house holds counterside
        } else {
            market.noToken.mint(to, shares);
            market.yesToken.mint(address(this), shares);
        }
        // totalCollateral tracks USDC deposited. Redemption pays 1 USDC per share.
        // Backend sets prices so liquidity is sufficient (e.g. balanced book).
        market.totalCollateral += cost;
    }

    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buf = new bytes(digits);
        while (value != 0) {
            buf[--digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buf);
    }
}

// ── Calldata struct (outside contract to avoid via-ir stack issues) ───────────

struct Order {
    uint256 marketId;
    uint8 outcome; // 1 = Yes, 2 = No
    address to; // recipient of shares
    uint256 shares; // tokens to mint  (backend: cost / price)
    uint256 cost; // USDC to pull    (user commits to this)
    uint256 deadline;
    uint256 nonce;
}
