// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title DutchAuction
 * @notice Linear price decay calculator for intent-based cross-chain swaps.
 *         Port of intent_protocol::dutch_auction (Move) and dutch_auction.rs (Solana/Anchor).
 * @dev    Price starts at `startAmount` and decays linearly to `endAmount`
 *         over the window [startTime, endTime].
 *
 *         price(t) = startAmount - (startAmount - endAmount) * (t - startTime) / (endTime - startTime)
 */
library DutchAuction {

    error AuctionInvalidParameters();

    /**
     * @notice Calculate the current price of a Dutch Auction.
     * @param startAmount Starting (maximum) price
     * @param endAmount   Ending (minimum / floor) price
     * @param startTime   Unix timestamp when auction begins
     * @param endTime     Unix timestamp when auction ends
     * @return Current price based on block.timestamp
     */
    function calculateCurrentPrice(
        uint256 startAmount,
        uint256 endAmount,
        uint256 startTime,
        uint256 endTime
    ) internal view returns (uint256) {
        return calculatePriceAt(startAmount, endAmount, startTime, endTime, block.timestamp);
    }

    /**
     * @notice Calculate price at a specific timestamp (for testing / simulation).
     * @param startAmount Starting (maximum) price
     * @param endAmount   Ending (minimum / floor) price
     * @param startTime   Unix timestamp when auction begins
     * @param endTime     Unix timestamp when auction ends
     * @param atTime      Timestamp to evaluate
     * @return Price at the given timestamp
     */
    function calculatePriceAt(
        uint256 startAmount,
        uint256 endAmount,
        uint256 startTime,
        uint256 endTime,
        uint256 atTime
    ) internal pure returns (uint256) {
        if (startAmount < endAmount) revert AuctionInvalidParameters();
        if (endTime <= startTime) revert AuctionInvalidParameters();

        // Before start → max price
        if (atTime < startTime) return startAmount;

        // After end → floor price
        if (atTime >= endTime) return endAmount;

        // Linear decay
        uint256 duration = endTime - startTime;
        uint256 elapsed  = atTime - startTime;
        uint256 priceDrop = startAmount - endAmount;
        uint256 dropAmount = (priceDrop * elapsed) / duration;

        return startAmount - dropAmount;
    }

    /**
     * @notice Check whether the auction is currently active.
     */
    function isActive(uint256 startTime, uint256 endTime) internal view returns (bool) {
        return block.timestamp >= startTime && block.timestamp < endTime;
    }

    /**
     * @notice Check whether the auction has ended.
     */
    function hasEnded(uint256 endTime) internal view returns (bool) {
        return block.timestamp >= endTime;
    }

    /**
     * @notice Get remaining seconds in the auction (0 if ended).
     */
    function timeRemaining(uint256 endTime) internal view returns (uint256) {
        if (block.timestamp >= endTime) return 0;
        return endTime - block.timestamp;
    }
}
