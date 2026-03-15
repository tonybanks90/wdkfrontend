import { expect } from "chai";
import { ethers } from "hardhat";
import { IntentHTLC } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("IntentHTLC", function () {
  let htlc: IntentHTLC;
  let admin: SignerWithAddress;
  let resolver: SignerWithAddress;
  let user: SignerWithAddress;

  // Test secret and hashlock (SHA-256)
  const SECRET = ethers.encodeBytes32String("test_secret_12345");
  let HASHLOCK: string;

  before(async function () {
    // Compute SHA-256 hashlock from secret
    const secretBytes = ethers.getBytes(ethers.solidityPacked(["bytes32"], [SECRET]));
    HASHLOCK = ethers.sha256(secretBytes);
  });

  beforeEach(async function () {
    [admin, resolver, user] = await ethers.getSigners();
    const IntentHTLC = await ethers.getContractFactory("IntentHTLC");
    htlc = await IntentHTLC.deploy();
    await htlc.waitForDeployment();
  });

  // ================== Deployment ==================
  describe("Deployment", function () {
    it("should set the deployer as admin", async function () {
      expect(await htlc.admin()).to.equal(admin.address);
    });

    it("should start unpaused", async function () {
      expect(await htlc.paused()).to.equal(false);
    });

    it("should start with nextEscrowId = 0", async function () {
      expect(await htlc.nextEscrowId()).to.equal(0);
    });
  });

  // ================== createEscrow (Native BNB) ==================
  describe("createEscrow — Native BNB", function () {
    const TIMELOCK = 3600; // 1 hour
    const AMOUNT = ethers.parseEther("1.0");

    it("should create an escrow with native BNB", async function () {
      const tx = await htlc.connect(resolver).createEscrow(
        HASHLOCK,
        user.address,
        TIMELOCK,
        ethers.ZeroAddress, // native
        0,
        { value: AMOUNT }
      );

      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;

      // Verify escrow details
      const details = await htlc.getEscrowDetails(0);
      expect(details.hashlock).to.equal(HASHLOCK);
      expect(details.sender).to.equal(resolver.address);
      expect(details.recipient).to.equal(user.address);
      expect(details.amount).to.equal(AMOUNT);
      expect(details.tokenAddress).to.equal(ethers.ZeroAddress);
      expect(details.claimed).to.equal(false);
      expect(details.refunded).to.equal(false);
    });

    it("should emit EscrowCreated event", async function () {
      await expect(
        htlc.connect(resolver).createEscrow(
          HASHLOCK, user.address, TIMELOCK, ethers.ZeroAddress, 0, { value: AMOUNT }
        )
      ).to.emit(htlc, "EscrowCreated");
    });

    it("should increment nextEscrowId", async function () {
      await htlc.connect(resolver).createEscrow(
        HASHLOCK, user.address, TIMELOCK, ethers.ZeroAddress, 0, { value: AMOUNT }
      );
      expect(await htlc.nextEscrowId()).to.equal(1);
    });

    it("should reject zero amount", async function () {
      await expect(
        htlc.connect(resolver).createEscrow(
          HASHLOCK, user.address, TIMELOCK, ethers.ZeroAddress, 0, { value: 0 }
        )
      ).to.be.revertedWithCustomError(htlc, "ZeroAmount");
    });

    it("should reject timelock too short", async function () {
      await expect(
        htlc.connect(resolver).createEscrow(
          HASHLOCK, user.address, 60, ethers.ZeroAddress, 0, { value: AMOUNT }
        )
      ).to.be.revertedWithCustomError(htlc, "InvalidTimelock");
    });

    it("should reject timelock too long", async function () {
      await expect(
        htlc.connect(resolver).createEscrow(
          HASHLOCK, user.address, 100000, ethers.ZeroAddress, 0, { value: AMOUNT }
        )
      ).to.be.revertedWithCustomError(htlc, "InvalidTimelock");
    });
  });

  // ================== claim ==================
  describe("claim", function () {
    const TIMELOCK = 3600;
    const AMOUNT = ethers.parseEther("1.0");

    beforeEach(async function () {
      await htlc.connect(resolver).createEscrow(
        HASHLOCK, user.address, TIMELOCK, ethers.ZeroAddress, 0, { value: AMOUNT }
      );
    });

    it("should allow claim with correct secret", async function () {
      const userBalanceBefore = await ethers.provider.getBalance(user.address);

      // Anyone can call claim, funds go to recipient
      await htlc.connect(user).claim(0, SECRET);

      const details = await htlc.getEscrowDetails(0);
      expect(details.claimed).to.equal(true);

      const userBalanceAfter = await ethers.provider.getBalance(user.address);
      // User should have ~1 BNB more (minus gas)
      expect(userBalanceAfter).to.be.greaterThan(userBalanceBefore);
    });

    it("should emit EscrowClaimed with the secret", async function () {
      // We verify only the non-timestamp args to avoid race conditions
      await expect(htlc.connect(user).claim(0, SECRET))
        .to.emit(htlc, "EscrowClaimed");
    });

    it("should reject wrong secret", async function () {
      const wrongSecret = ethers.encodeBytes32String("wrong_secret");
      await expect(
        htlc.connect(user).claim(0, wrongSecret)
      ).to.be.revertedWithCustomError(htlc, "InvalidSecret");
    });

    it("should reject double claim", async function () {
      await htlc.connect(user).claim(0, SECRET);
      await expect(
        htlc.connect(user).claim(0, SECRET)
      ).to.be.revertedWithCustomError(htlc, "AlreadyClaimed");
    });

    it("should reject claim after timelock expires", async function () {
      await time.increase(TIMELOCK + 1);
      await expect(
        htlc.connect(user).claim(0, SECRET)
      ).to.be.revertedWithCustomError(htlc, "TimelockExpired");
    });
  });

  // ================== refund ==================
  describe("refund", function () {
    const TIMELOCK = 3600;
    const AMOUNT = ethers.parseEther("1.0");

    beforeEach(async function () {
      await htlc.connect(resolver).createEscrow(
        HASHLOCK, user.address, TIMELOCK, ethers.ZeroAddress, 0, { value: AMOUNT }
      );
    });

    it("should allow refund after timelock expires", async function () {
      await time.increase(TIMELOCK + 1);

      const resolverBalanceBefore = await ethers.provider.getBalance(resolver.address);
      await htlc.connect(resolver).refund(0);

      const details = await htlc.getEscrowDetails(0);
      expect(details.refunded).to.equal(true);

      const resolverBalanceAfter = await ethers.provider.getBalance(resolver.address);
      expect(resolverBalanceAfter).to.be.greaterThan(resolverBalanceBefore);
    });

    it("should reject refund before timelock expires", async function () {
      await expect(
        htlc.connect(resolver).refund(0)
      ).to.be.revertedWithCustomError(htlc, "TimelockNotExpired");
    });

    it("should reject refund by non-sender", async function () {
      await time.increase(TIMELOCK + 1);
      await expect(
        htlc.connect(user).refund(0)
      ).to.be.revertedWithCustomError(htlc, "Unauthorized");
    });

    it("should reject refund after claim", async function () {
      await htlc.connect(user).claim(0, SECRET);
      await time.increase(TIMELOCK + 1);
      await expect(
        htlc.connect(resolver).refund(0)
      ).to.be.revertedWithCustomError(htlc, "AlreadyClaimed");
    });
  });

  // ================== View Functions ==================
  describe("View functions", function () {
    const TIMELOCK = 3600;
    const AMOUNT = ethers.parseEther("1.0");

    beforeEach(async function () {
      await htlc.connect(resolver).createEscrow(
        HASHLOCK, user.address, TIMELOCK, ethers.ZeroAddress, 0, { value: AMOUNT }
      );
    });

    it("isClaimable should return true for active escrow", async function () {
      expect(await htlc.isClaimable(0)).to.equal(true);
    });

    it("isClaimable should return false after claim", async function () {
      await htlc.connect(user).claim(0, SECRET);
      expect(await htlc.isClaimable(0)).to.equal(false);
    });

    it("isRefundable should return false before timelock", async function () {
      expect(await htlc.isRefundable(0)).to.equal(false);
    });

    it("isRefundable should return true after timelock", async function () {
      await time.increase(TIMELOCK + 1);
      expect(await htlc.isRefundable(0)).to.equal(true);
    });

    it("verifySecret should return true for correct secret", async function () {
      expect(await htlc.verifySecret(0, SECRET)).to.equal(true);
    });

    it("verifySecret should return false for wrong secret", async function () {
      expect(await htlc.verifySecret(0, ethers.encodeBytes32String("wrong"))).to.equal(false);
    });

    it("timeUntilExpiry should decrease over time", async function () {
      const t1 = await htlc.timeUntilExpiry(0);
      await time.increase(100);
      const t2 = await htlc.timeUntilExpiry(0);
      expect(t2).to.be.lessThan(t1);
    });

    it("getRegistryStats should track totals", async function () {
      const stats = await htlc.getRegistryStats();
      expect(stats.totalEscrows).to.equal(1);
      expect(stats._totalLocked).to.equal(AMOUNT);
    });
  });

  // ================== fillEscrow (Dutch Auction) ==================
  describe("fillEscrow — Dutch Auction", function () {
    const TIMELOCK = 3600;
    const AMOUNT = ethers.parseEther("1.0");

    it("should accept fill at current auction price", async function () {
      const now = await time.latest();
      const startTime = now;
      const endTime = now + 3600;
      const startAmount = ethers.parseEther("2.0");
      const endAmount = ethers.parseEther("0.5");

      // At time = startTime, price = startAmount = 2.0 ETH
      // Fill with 2.0 ETH should succeed
      await htlc.connect(resolver).fillEscrow(
        HASHLOCK,
        user.address,
        TIMELOCK,
        ethers.ZeroAddress,
        0,
        startAmount,
        endAmount,
        startTime,
        endTime,
        { value: ethers.parseEther("2.0") }
      );

      const details = await htlc.getEscrowDetails(0);
      expect(details.amount).to.equal(ethers.parseEther("2.0"));
    });

    it("should reject fill below auction price", async function () {
      const now = await time.latest();
      const startTime = now;
      const endTime = now + 3600;
      const startAmount = ethers.parseEther("2.0");
      const endAmount = ethers.parseEther("0.5");

      // Price at start = 2.0, try to fill with 0.5
      await expect(
        htlc.connect(resolver).fillEscrow(
          HASHLOCK,
          user.address,
          TIMELOCK,
          ethers.ZeroAddress,
          0,
          startAmount,
          endAmount,
          startTime,
          endTime,
          { value: ethers.parseEther("0.5") }
        )
      ).to.be.revertedWithCustomError(htlc, "InsufficientFillAmount");
    });

    it("should accept lower fill after time passes (price decayed)", async function () {
      const now = await time.latest();
      const startTime = now + 1;
      const endTime = startTime + 3600;
      const startAmount = ethers.parseEther("2.0");
      const endAmount = ethers.parseEther("0.5");

      // Jump to midpoint — price should be ~1.25 ETH
      await time.increase(1801);

      // Fill with 1.25 ETH should succeed
      await htlc.connect(resolver).fillEscrow(
        HASHLOCK,
        user.address,
        TIMELOCK,
        ethers.ZeroAddress,
        0,
        startAmount,
        endAmount,
        startTime,
        endTime,
        { value: ethers.parseEther("1.25") }
      );

      const details = await htlc.getEscrowDetails(0);
      expect(details.claimed).to.equal(false);
    });
  });

  // ================== Admin Functions ==================
  describe("Admin", function () {
    it("should allow admin to pause", async function () {
      await htlc.connect(admin).pause();
      expect(await htlc.paused()).to.equal(true);
    });

    it("should reject non-admin pause", async function () {
      await expect(
        htlc.connect(user).pause()
      ).to.be.revertedWithCustomError(htlc, "Unauthorized");
    });

    it("should block operations when paused", async function () {
      await htlc.connect(admin).pause();
      await expect(
        htlc.connect(resolver).createEscrow(
          HASHLOCK, user.address, 3600, ethers.ZeroAddress, 0, { value: ethers.parseEther("1") }
        )
      ).to.be.revertedWithCustomError(htlc, "ContractPaused");
    });
  });
});
