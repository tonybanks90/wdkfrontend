// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { DutchAuction } from "./DutchAuction.sol";

/**
 * @title IntentHTLC
 * @notice Hashed Time-Lock Contract for trustless cross-chain atomic swaps on EVM chains.
 *         Port of intent_protocol::htlc_escrow (Move) and intent_swap (Solana/Anchor).
 *
 * @dev    Supports both native currency (BNB/ETH) and ERC-20 tokens.
 *         Uses SHA-256 hashlock for cross-chain compatibility with BCH and Solana.
 *
 *         Flow:
 *           1. createEscrow / fillEscrow  — Lock funds with hashlock + timelock
 *           2. claim(secret)              — Recipient reveals preimage to claim
 *           3. refund()                   — Sender reclaims after timelock expires
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract IntentHTLC {
    using DutchAuction for *;

    // ===================== Structs =====================

    struct Escrow {
        bytes32 hashlock;        // SHA-256 hash of the secret (32 bytes)
        uint256 timelock;        // Unix timestamp — funds claimable before this, refundable after
        address sender;          // Resolver / maker who locked funds
        address recipient;       // User who can claim with the secret
        uint256 amount;          // Locked amount
        address tokenAddress;    // address(0) = native BNB/ETH, otherwise ERC-20
        bool    claimed;
        bool    refunded;
        uint256 createdAt;
    }

    // ===================== State =====================

    mapping(uint256 => Escrow) public escrows;
    uint256 public nextEscrowId;

    uint256 public totalLocked;
    uint256 public totalClaimed;
    uint256 public totalRefunded;

    address public admin;
    bool    public paused;

    // ===================== Constants =====================

    uint256 public constant MIN_TIMELOCK  = 1800;   // 30 minutes
    uint256 public constant MAX_TIMELOCK  = 86400;  // 24 hours

    // ===================== Events =====================

    event EscrowCreated(
        uint256 indexed escrowId,
        bytes32 hashlock,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        address tokenAddress,
        uint256 timelock,
        uint256 createdAt
    );

    event EscrowClaimed(
        uint256 indexed escrowId,
        address indexed claimer,
        bytes32 secret,
        uint256 amount,
        uint256 claimedAt
    );

    event EscrowRefunded(
        uint256 indexed escrowId,
        address indexed sender,
        uint256 amount,
        uint256 refundedAt
    );

    // ===================== Errors =====================

    error NotInitialized();
    error AlreadyClaimed();
    error AlreadyRefunded();
    error InvalidSecret();
    error TimelockNotExpired();
    error TimelockExpired();
    error Unauthorized();
    error InvalidTimelock();
    error ZeroAmount();
    error ContractPaused();
    error EscrowNotFound();
    error InsufficientFillAmount();
    error TransferFailed();

    // ===================== Modifiers =====================

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    // ===================== Constructor =====================

    constructor() {
        admin = msg.sender;
    }

    // ===================== Core Functions =====================

    /**
     * @notice Create a new HTLC escrow. Locks native currency or ERC-20 tokens
     *         until the recipient reveals the secret or the timelock expires.
     *
     * @param hashlock         SHA-256 hash of the secret (32 bytes)
     * @param recipient        Address that can claim with the secret
     * @param timelockDuration Number of seconds until the escrow expires
     * @param tokenAddress     address(0) for native BNB/ETH, or ERC-20 contract
     * @param tokenAmount      Amount of ERC-20 to lock (ignored for native)
     * @return escrowId        The ID of the newly created escrow
     */
    function createEscrow(
        bytes32 hashlock,
        address recipient,
        uint256 timelockDuration,
        address tokenAddress,
        uint256 tokenAmount
    ) external payable whenNotPaused returns (uint256 escrowId) {
        // Determine amount
        uint256 amount;
        if (tokenAddress == address(0)) {
            // Native BNB/ETH
            amount = msg.value;
        } else {
            // ERC-20
            amount = tokenAmount;
        }

        if (amount == 0) revert ZeroAmount();
        if (timelockDuration < MIN_TIMELOCK || timelockDuration > MAX_TIMELOCK)
            revert InvalidTimelock();

        // Transfer ERC-20 tokens to this contract
        if (tokenAddress != address(0)) {
            bool success = IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
            if (!success) revert TransferFailed();
        }

        uint256 timelock = block.timestamp + timelockDuration;

        escrowId = nextEscrowId;
        escrows[escrowId] = Escrow({
            hashlock:     hashlock,
            timelock:     timelock,
            sender:       msg.sender,
            recipient:    recipient,
            amount:       amount,
            tokenAddress: tokenAddress,
            claimed:      false,
            refunded:     false,
            createdAt:    block.timestamp
        });

        nextEscrowId++;
        totalLocked += amount;

        emit EscrowCreated(
            escrowId,
            hashlock,
            msg.sender,
            recipient,
            amount,
            tokenAddress,
            timelock,
            block.timestamp
        );
    }

    /**
     * @notice Fill an escrow with Dutch Auction price validation.
     *         Called by resolvers when this chain is the DESTINATION.
     *         The locked amount must be >= the current Dutch Auction price.
     *
     * @param hashlock            SHA-256 hash of the secret
     * @param recipient           Address that can claim with the secret
     * @param timelockDuration    Seconds until expiry
     * @param tokenAddress        address(0) for native, or ERC-20
     * @param tokenAmount         ERC-20 amount (ignored for native)
     * @param auctionStartAmount  Starting (maximum) price
     * @param auctionEndAmount    Ending (minimum/floor) price
     * @param auctionStartTime    Unix timestamp when auction started
     * @param auctionEndTime      Unix timestamp when auction ends
     * @return escrowId           The ID of the newly created escrow
     */
    function fillEscrow(
        bytes32 hashlock,
        address recipient,
        uint256 timelockDuration,
        address tokenAddress,
        uint256 tokenAmount,
        uint256 auctionStartAmount,
        uint256 auctionEndAmount,
        uint256 auctionStartTime,
        uint256 auctionEndTime
    ) external payable whenNotPaused returns (uint256 escrowId) {
        // Determine amount
        uint256 amount;
        if (tokenAddress == address(0)) {
            amount = msg.value;
        } else {
            amount = tokenAmount;
        }

        if (amount == 0) revert ZeroAmount();
        if (timelockDuration < MIN_TIMELOCK || timelockDuration > MAX_TIMELOCK)
            revert InvalidTimelock();

        // Dutch Auction price check
        uint256 requiredAmount = DutchAuction.calculateCurrentPrice(
            auctionStartAmount,
            auctionEndAmount,
            auctionStartTime,
            auctionEndTime
        );
        if (amount < requiredAmount) revert InsufficientFillAmount();

        // Transfer ERC-20 tokens
        if (tokenAddress != address(0)) {
            bool success = IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
            if (!success) revert TransferFailed();
        }

        uint256 timelock = block.timestamp + timelockDuration;

        escrowId = nextEscrowId;
        escrows[escrowId] = Escrow({
            hashlock:     hashlock,
            timelock:     timelock,
            sender:       msg.sender,
            recipient:    recipient,
            amount:       amount,
            tokenAddress: tokenAddress,
            claimed:      false,
            refunded:     false,
            createdAt:    block.timestamp
        });

        nextEscrowId++;
        totalLocked += amount;

        emit EscrowCreated(
            escrowId,
            hashlock,
            msg.sender,
            recipient,
            amount,
            tokenAddress,
            timelock,
            block.timestamp
        );
    }

    /**
     * @notice Claim escrowed funds by revealing the SHA-256 preimage.
     *         Anyone can call this, but funds go to the designated recipient.
     *
     * @param escrowId  ID of the escrow to claim
     * @param secret    The preimage whose SHA-256 matches the hashlock (32 bytes)
     */
    function claim(uint256 escrowId, bytes32 secret) external whenNotPaused {
        Escrow storage escrow = escrows[escrowId];

        if (escrow.sender == address(0)) revert EscrowNotFound();
        if (escrow.claimed) revert AlreadyClaimed();
        if (escrow.refunded) revert AlreadyRefunded();
        if (block.timestamp > escrow.timelock) revert TimelockExpired();

        // Verify secret — SHA-256 hash must match hashlock
        bytes32 computedHash = sha256(abi.encodePacked(secret));
        if (computedHash != escrow.hashlock) revert InvalidSecret();

        escrow.claimed = true;
        totalClaimed += escrow.amount;

        // Transfer funds to recipient
        _transfer(escrow.tokenAddress, escrow.recipient, escrow.amount);

        emit EscrowClaimed(
            escrowId,
            msg.sender,
            secret,
            escrow.amount,
            block.timestamp
        );
    }

    /**
     * @notice Refund escrowed funds after the timelock expires.
     *         Only the original sender (resolver) can refund.
     *
     * @param escrowId ID of the escrow to refund
     */
    function refund(uint256 escrowId) external whenNotPaused {
        Escrow storage escrow = escrows[escrowId];

        if (escrow.sender == address(0)) revert EscrowNotFound();
        if (escrow.claimed) revert AlreadyClaimed();
        if (escrow.refunded) revert AlreadyRefunded();
        if (escrow.sender != msg.sender) revert Unauthorized();
        if (block.timestamp <= escrow.timelock) revert TimelockNotExpired();

        escrow.refunded = true;
        totalRefunded += escrow.amount;

        // Transfer funds back to sender
        _transfer(escrow.tokenAddress, escrow.sender, escrow.amount);

        emit EscrowRefunded(
            escrowId,
            escrow.sender,
            escrow.amount,
            block.timestamp
        );
    }

    // ===================== View Functions =====================

    /**
     * @notice Get full escrow details.
     */
    function getEscrowDetails(uint256 escrowId)
        external view returns (
            bytes32 hashlock,
            uint256 timelock,
            address sender,
            address recipient,
            uint256 amount,
            address tokenAddress,
            bool    claimed,
            bool    refunded,
            uint256 createdAt
        )
    {
        Escrow storage e = escrows[escrowId];
        return (
            e.hashlock,
            e.timelock,
            e.sender,
            e.recipient,
            e.amount,
            e.tokenAddress,
            e.claimed,
            e.refunded,
            e.createdAt
        );
    }

    /**
     * @notice Check if an escrow is currently claimable (not claimed, not refunded, before timelock).
     */
    function isClaimable(uint256 escrowId) external view returns (bool) {
        Escrow storage e = escrows[escrowId];
        return !e.claimed && !e.refunded && block.timestamp <= e.timelock && e.sender != address(0);
    }

    /**
     * @notice Check if an escrow is refundable (not claimed, not refunded, past timelock).
     */
    function isRefundable(uint256 escrowId) external view returns (bool) {
        Escrow storage e = escrows[escrowId];
        return !e.claimed && !e.refunded && block.timestamp > e.timelock && e.sender != address(0);
    }

    /**
     * @notice Get seconds remaining until timelock expires (0 if expired).
     */
    function timeUntilExpiry(uint256 escrowId) external view returns (uint256) {
        Escrow storage e = escrows[escrowId];
        if (block.timestamp >= e.timelock) return 0;
        return e.timelock - block.timestamp;
    }

    /**
     * @notice Get registry statistics.
     */
    function getRegistryStats() external view returns (
        uint256 totalEscrows,
        uint256 _totalLocked,
        uint256 _totalClaimed,
        uint256 _totalRefunded
    ) {
        return (nextEscrowId, totalLocked, totalClaimed, totalRefunded);
    }

    /**
     * @notice Verify a secret against an escrow's hashlock without claiming.
     */
    function verifySecret(uint256 escrowId, bytes32 secret) external view returns (bool) {
        Escrow storage e = escrows[escrowId];
        if (e.sender == address(0)) return false;
        return sha256(abi.encodePacked(secret)) == e.hashlock;
    }

    // ===================== Admin Functions =====================

    function pause() external onlyAdmin {
        paused = true;
    }

    function unpause() external onlyAdmin {
        paused = false;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }

    // ===================== Internal =====================

    function _transfer(address tokenAddress, address to, uint256 amount) internal {
        if (tokenAddress == address(0)) {
            // Native BNB/ETH
            (bool success, ) = payable(to).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // ERC-20
            bool success = IERC20(tokenAddress).transfer(to, amount);
            if (!success) revert TransferFailed();
        }
    }

    // Allow receiving native currency
    receive() external payable {}
}
