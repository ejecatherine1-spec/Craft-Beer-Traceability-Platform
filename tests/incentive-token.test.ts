// IncentiveToken.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

// Interfaces for type safety
interface ClarityResponse<T> {
  ok: boolean;
  value: T | number; // number for error codes
}

interface MintRecord {
  amount: number;
  recipient: string;
  metadata: string;
  timestamp: number;
}

interface ContractState {
  balances: Map<string, number>;
  minters: Map<string, boolean>;
  mintRecords: Map<number, MintRecord>;
  totalSupply: number;
  paused: boolean;
  admin: string;
  mintCounter: number;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenUri: string | null;
}

// Mock contract implementation
class IncentiveTokenMock {
  private state: ContractState = {
    balances: new Map(),
    minters: new Map([["deployer", true]]),
    mintRecords: new Map(),
    totalSupply: 0,
    paused: false,
    admin: "deployer",
    mintCounter: 0,
    tokenName: "IncentiveToken",
    tokenSymbol: "ITK",
    tokenDecimals: 6,
    tokenUri: null,
  };

  private MAX_METADATA_LEN = 500;
  private ERR_UNAUTHORIZED = 100;
  private ERR_PAUSED = 101; // General paused, but tests will adapt
  private ERR_INVALID_AMOUNT = 102;
  private ERR_INVALID_RECIPIENT = 103;
  private ERR_INVALID_MINTER = 104;
  private ERR_ALREADY_REGISTERED = 105;
  private ERR_METADATA_TOO_LONG = 106;
  private ERR_INSUFFICIENT_BALANCE = 107;
  private ERR_INVALID_MEMO = 108;
  private ERR_TRANSFER_PAUSED = 109;
  private ERR_BURN_PAUSED = 110;
  private ERR_MINT_PAUSED = 111;
  private ERR_NOT_OWNER = 112;
  private ERR_INVALID_URI = 113;

  getName(): ClarityResponse<string> {
    return { ok: true, value: this.state.tokenName };
  }

  getSymbol(): ClarityResponse<string> {
    return { ok: true, value: this.state.tokenSymbol };
  }

  getDecimals(): ClarityResponse<number> {
    return { ok: true, value: this.state.tokenDecimals };
  }

  getTotalSupply(): ClarityResponse<number> {
    return { ok: true, value: this.state.totalSupply };
  }

  getBalance(account: string): ClarityResponse<number> {
    return { ok: true, value: this.state.balances.get(account) ?? 0 };
  }

  getTokenUri(): ClarityResponse<string | null> {
    return { ok: true, value: this.state.tokenUri };
  }

  getMintRecord(tokenId: number): ClarityResponse<MintRecord | null> {
    return { ok: true, value: this.state.mintRecords.get(tokenId) ?? null };
  }

  isMinterCheck(account: string): ClarityResponse<boolean> {
    return { ok: true, value: this.state.minters.get(account) ?? false };
  }

  isPaused(): ClarityResponse<boolean> {
    return { ok: true, value: this.state.paused };
  }

  setAdmin(caller: string, newAdmin: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.admin = newAdmin;
    return { ok: true, value: true };
  }

  pauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.paused = true;
    return { ok: true, value: true };
  }

  unpauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.paused = false;
    return { ok: true, value: true };
  }

  addMinter(caller: string, minter: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (this.state.minters.has(minter)) {
      return { ok: false, value: this.ERR_ALREADY_REGISTERED };
    }
    this.state.minters.set(minter, true);
    return { ok: true, value: true };
  }

  removeMinter(caller: string, minter: string): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.minters.set(minter, false);
    return { ok: true, value: true };
  }

  setTokenUri(caller: string, newUri: string | null): ClarityResponse<boolean> {
    if (caller !== this.state.admin) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (newUri && newUri.length > 256) {
      return { ok: false, value: this.ERR_INVALID_URI };
    }
    this.state.tokenUri = newUri;
    return { ok: true, value: true };
  }

  mint(caller: string, amount: number, recipient: string, metadata: string): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_MINT_PAUSED };
    }
    if (!this.state.minters.get(caller)) {
      return { ok: false, value: this.ERR_INVALID_MINTER };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    if (recipient === "deployer") { // Assuming CONTRACT-OWNER is deployer
      return { ok: false, value: this.ERR_INVALID_RECIPIENT };
    }
    if (metadata.length > this.MAX_METADATA_LEN) {
      return { ok: false, value: this.ERR_METADATA_TOO_LONG };
    }
    const currentBalance = this.state.balances.get(recipient) ?? 0;
    this.state.balances.set(recipient, currentBalance + amount);
    this.state.totalSupply += amount;
    const tokenId = this.state.mintCounter + 1;
    this.state.mintRecords.set(tokenId, {
      amount,
      recipient,
      metadata,
      timestamp: Date.now(), // Mock block-height with timestamp
    });
    this.state.mintCounter = tokenId;
    return { ok: true, value: true };
  }

  transfer(caller: string, amount: number, sender: string, recipient: string, memo: string | null): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_TRANSFER_PAUSED };
    }
    if (caller !== sender) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    if (recipient === "deployer") {
      return { ok: false, value: this.ERR_INVALID_RECIPIENT };
    }
    if (memo && memo.length > 34) {
      return { ok: false, value: this.ERR_INVALID_MEMO };
    }
    const senderBalance = this.state.balances.get(sender) ?? 0;
    if (senderBalance < amount) {
      return { ok: false, value: this.ERR_INSUFFICIENT_BALANCE };
    }
    this.state.balances.set(sender, senderBalance - amount);
    const recipientBalance = this.state.balances.get(recipient) ?? 0;
    this.state.balances.set(recipient, recipientBalance + amount);
    return { ok: true, value: true };
  }

  burn(caller: string, amount: number): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_BURN_PAUSED };
    }
    if (amount <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    const senderBalance = this.state.balances.get(caller) ?? 0;
    if (senderBalance < amount) {
      return { ok: false, value: this.ERR_INSUFFICIENT_BALANCE };
    }
    this.state.balances.set(caller, senderBalance - amount);
    this.state.totalSupply -= amount;
    return { ok: true, value: true };
  }
}

// Test setup
const accounts = {
  deployer: "deployer",
  minter: "wallet_1",
  user1: "wallet_2",
  user2: "wallet_3",
};

describe("IncentiveToken Contract", () => {
  let contract: IncentiveTokenMock;

  beforeEach(() => {
    contract = new IncentiveTokenMock();
    vi.resetAllMocks();
  });

  it("should initialize with correct token metadata", () => {
    expect(contract.getName()).toEqual({ ok: true, value: "IncentiveToken" });
    expect(contract.getSymbol()).toEqual({ ok: true, value: "ITK" });
    expect(contract.getDecimals()).toEqual({ ok: true, value: 6 });
    expect(contract.getTotalSupply()).toEqual({ ok: true, value: 0 });
    expect(contract.getTokenUri()).toEqual({ ok: true, value: null });
  });

  it("should allow admin to set new token URI", () => {
    const setUri = contract.setTokenUri(accounts.deployer, "https://example.com/token-info");
    expect(setUri).toEqual({ ok: true, value: true });
    expect(contract.getTokenUri()).toEqual({ ok: true, value: "https://example.com/token-info" });
  });

  it("should prevent non-admin from setting token URI", () => {
    const setUri = contract.setTokenUri(accounts.user1, "https://example.com");
    expect(setUri).toEqual({ ok: false, value: 100 });
  });

  it("should allow admin to add minter", () => {
    const addMinter = contract.addMinter(accounts.deployer, accounts.minter);
    expect(addMinter).toEqual({ ok: true, value: true });

    const isMinter = contract.isMinterCheck(accounts.minter);
    expect(isMinter).toEqual({ ok: true, value: true });
  });

  it("should prevent non-admin from adding minter", () => {
    const addMinter = contract.addMinter(accounts.user1, accounts.user2);
    expect(addMinter).toEqual({ ok: false, value: 100 });
  });

  it("should allow minter to mint tokens with metadata", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    
    const mintResult = contract.mint(
      accounts.minter,
      1000000, // Considering 6 decimals
      accounts.user1,
      "Reward for ethical sourcing"
    );
    expect(mintResult).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 1000000 });
    expect(contract.getTotalSupply()).toEqual({ ok: true, value: 1000000 });

    const mintRecord = contract.getMintRecord(1);
    expect(mintRecord).toEqual({
      ok: true,
      value: expect.objectContaining({
        amount: 1000000,
        recipient: accounts.user1,
        metadata: "Reward for ethical sourcing",
      }),
    });
  });

  it("should prevent non-minter from minting", () => {
    const mintResult = contract.mint(
      accounts.user1,
      1000000,
      accounts.user1,
      "Unauthorized mint"
    );
    expect(mintResult).toEqual({ ok: false, value: 104 });
  });

  it("should prevent mint with metadata too long", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    const longMetadata = "a".repeat(501);
    const mintResult = contract.mint(
      accounts.minter,
      1000000,
      accounts.user1,
      longMetadata
    );
    expect(mintResult).toEqual({ ok: false, value: 106 });
  });

  it("should allow token transfer between users with memo", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    contract.mint(accounts.minter, 1000000, accounts.user1, "Test mint");

    const transferResult = contract.transfer(
      accounts.user1,
      500000,
      accounts.user1,
      accounts.user2,
      "Transfer memo"
    );
    expect(transferResult).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 500000 });
    expect(contract.getBalance(accounts.user2)).toEqual({ ok: true, value: 500000 });
  });

  it("should prevent transfer of insufficient balance", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    contract.mint(accounts.minter, 100000, accounts.user1, "Test mint");

    const transferResult = contract.transfer(
      accounts.user1,
      200000,
      accounts.user1,
      accounts.user2,
      null
    );
    expect(transferResult).toEqual({ ok: false, value: 107 });
  });

  it("should allow burning tokens", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    contract.mint(accounts.minter, 1000000, accounts.user1, "Test mint");

    const burnResult = contract.burn(accounts.user1, 300000);
    expect(burnResult).toEqual({ ok: true, value: true });
    expect(contract.getBalance(accounts.user1)).toEqual({ ok: true, value: 700000 });
    expect(contract.getTotalSupply()).toEqual({ ok: true, value: 700000 });
  });

  it("should pause and unpause contract, blocking operations", () => {
    const pauseResult = contract.pauseContract(accounts.deployer);
    expect(pauseResult).toEqual({ ok: true, value: true });
    expect(contract.isPaused()).toEqual({ ok: true, value: true });

    // Test mint paused
    const mintDuringPause = contract.mint(
      accounts.deployer,
      1000000,
      accounts.user1,
      "Paused mint"
    );
    expect(mintDuringPause).toEqual({ ok: false, value: 111 });

    // Test transfer paused
    contract.unpauseContract(accounts.deployer); // Temporarily unpause to mint
    contract.mint(accounts.deployer, 1000000, accounts.user1, "Setup mint");
    contract.pauseContract(accounts.deployer);
    const transferDuringPause = contract.transfer(
      accounts.user1,
      500000,
      accounts.user1,
      accounts.user2,
      null
    );
    expect(transferDuringPause).toEqual({ ok: false, value: 109 });

    // Test burn paused
    const burnDuringPause = contract.burn(accounts.user1, 100000);
    expect(burnDuringPause).toEqual({ ok: false, value: 110 });

    const unpauseResult = contract.unpauseContract(accounts.deployer);
    expect(unpauseResult).toEqual({ ok: true, value: true });
    expect(contract.isPaused()).toEqual({ ok: true, value: false });

    // Operations should work after unpause
    const mintAfter = contract.mint(accounts.deployer, 1000000, accounts.user2, "After unpause");
    expect(mintAfter).toEqual({ ok: true, value: true });
  });

  it("should prevent invalid recipient in mint and transfer", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    
    const mintToInvalid = contract.mint(
      accounts.minter,
      1000000,
      "deployer",
      "Invalid"
    );
    expect(mintToInvalid).toEqual({ ok: false, value: 103 });

    contract.mint(accounts.minter, 1000000, accounts.user1, "Valid mint");
    const transferToInvalid = contract.transfer(
      accounts.user1,
      500000,
      accounts.user1,
      "deployer",
      null
    );
    expect(transferToInvalid).toEqual({ ok: false, value: 103 });
  });

  it("should prevent unauthorized transfer", () => {
    contract.addMinter(accounts.deployer, accounts.minter);
    contract.mint(accounts.minter, 1000000, accounts.user1, "Test mint");

    const unauthorizedTransfer = contract.transfer(
      accounts.user2, // Caller not sender
      500000,
      accounts.user1,
      accounts.user2,
      null
    );
    expect(unauthorizedTransfer).toEqual({ ok: false, value: 100 });
  });
});