import { describe, it, expect, beforeEach } from "vitest";
import { uintCV, stringAsciiCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_TITLE = 101;
const ERR_INVALID_DESCRIPTION = 102;
const ERR_INVALID_HASH = 103;
const ERR_INVALID_CULTURAL_CONTEXT = 104;
const ERR_INVALID_LOCATION = 105;
const ERR_INVALID_ROYALTY_RATE = 106;
const ERR_INVALID_TIMESTAMP = 107;
const ERR_NFT_ALREADY_EXISTS = 108;
const ERR_NFT_NOT_FOUND = 109;
const ERR_INVALID_UPDATE_PARAM = 110;
const ERR_UPDATE_NOT_ALLOWED = 111;
const ERR_MAX_NFTS_EXCEEDED = 112;
const ERR_INVALID_CURRENCY = 113;
const ERR_INVALID_STATUS = 114;
const ERR_AUTHORITY_NOT_VERIFIED = 115;
const ERR_INVALID_MIN_ROYALTY = 116;
const ERR_INVALID_MAX_ROYALTY = 117;

interface NFT {
  title: string;
  description: string;
  hash: Uint8Array;
  creator: string;
  culturalContext: string;
  location: string;
  royaltyRate: number;
  timestamp: number;
  currency: string;
  status: boolean;
  minRoyalty: number;
  maxRoyalty: number;
}

interface NFTUpdate {
  updateTitle: string;
  updateDescription: string;
  updateTimestamp: number;
  updater: string;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class HeritageNFTMock {
  state: {
    lastTokenId: number;
    maxNfts: number;
    mintFee: number;
    authorityContract: string | null;
    nftMetadata: Map<number, NFT>;
    nftUpdates: Map<number, NFTUpdate>;
    nftOwners: Map<number, string>;
  } = {
    lastTokenId: 0,
    maxNfts: 10000,
    mintFee: 500,
    authorityContract: null,
    nftMetadata: new Map(),
    nftUpdates: new Map(),
    nftOwners: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      lastTokenId: 0,
      maxNfts: 10000,
      mintFee: 500,
      authorityContract: null,
      nftMetadata: new Map(),
      nftUpdates: new Map(),
      nftOwners: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setMintFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.mintFee = newFee;
    return { ok: true, value: true };
  }

  setMaxNfts(newMax: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    if (newMax <= 0) return { ok: false, value: false };
    this.state.maxNfts = newMax;
    return { ok: true, value: true };
  }

  mintNft(
    title: string,
    description: string,
    hash: Uint8Array,
    culturalContext: string,
    location: string,
    royaltyRate: number,
    currency: string,
    minRoyalty: number,
    maxRoyalty: number
  ): Result<number> {
    const nextId = this.state.lastTokenId + 1;
    if (nextId > this.state.maxNfts) return { ok: false, value: ERR_MAX_NFTS_EXCEEDED };
    if (!title || title.length > 100) return { ok: false, value: ERR_INVALID_TITLE };
    if (!description || description.length > 500) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (hash.length !== 32) return { ok: false, value: ERR_INVALID_HASH };
    if (culturalContext.length > 200) return { ok: false, value: ERR_INVALID_CULTURAL_CONTEXT };
    if (location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (royaltyRate > 20) return { ok: false, value: ERR_INVALID_ROYALTY_RATE };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (minRoyalty < 0) return { ok: false, value: ERR_INVALID_MIN_ROYALTY };
    if (maxRoyalty <= 0) return { ok: false, value: ERR_INVALID_MAX_ROYALTY };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    this.stxTransfers.push({ amount: this.state.mintFee, from: this.caller, to: this.state.authorityContract });
    const nft: NFT = {
      title,
      description,
      hash,
      creator: this.caller,
      culturalContext,
      location,
      royaltyRate,
      timestamp: this.blockHeight,
      currency,
      status: true,
      minRoyalty,
      maxRoyalty,
    };
    this.state.nftMetadata.set(nextId, nft);
    this.state.nftOwners.set(nextId, this.caller);
    this.state.lastTokenId = nextId;
    return { ok: true, value: nextId };
  }

  getNftMetadata(id: number): NFT | null {
    return this.state.nftMetadata.get(id) || null;
  }

  updateNft(id: number, updateTitle: string, updateDescription: string): Result<boolean> {
    const nft = this.state.nftMetadata.get(id);
    if (!nft) return { ok: false, value: false };
    if (nft.creator !== this.caller) return { ok: false, value: false };
    if (!updateTitle || updateTitle.length > 100) return { ok: false, value: false };
    if (!updateDescription || updateDescription.length > 500) return { ok: false, value: false };
    const updated: NFT = {
      ...nft,
      title: updateTitle,
      description: updateDescription,
      timestamp: this.blockHeight,
    };
    this.state.nftMetadata.set(id, updated);
    this.state.nftUpdates.set(id, {
      updateTitle,
      updateDescription,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  transferNft(id: number, recipient: string): Result<boolean> {
    const owner = this.state.nftOwners.get(id);
    if (!owner || owner !== this.caller) return { ok: false, value: false };
    this.state.nftOwners.set(id, recipient);
    return { ok: true, value: true };
  }

  burnNft(id: number): Result<boolean> {
    const owner = this.state.nftOwners.get(id);
    if (!owner || owner !== this.caller) return { ok: false, value: false };
    this.state.nftMetadata.delete(id);
    this.state.nftOwners.delete(id);
    this.state.nftUpdates.delete(id);
    return { ok: true, value: true };
  }

  getNftCount(): Result<number> {
    return { ok: true, value: this.state.lastTokenId };
  }

  getOwner(id: number): string | null {
    return this.state.nftOwners.get(id) || null;
  }
}

describe("HeritageNFT", () => {
  let contract: HeritageNFTMock;

  beforeEach(() => {
    contract = new HeritageNFTMock();
    contract.reset();
  });

  it("mints an NFT successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    const result = contract.mintNft(
      "Title",
      "Description",
      hash,
      "Context",
      "Location",
      10,
      "STX",
      5,
      15
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(1);
    const nft = contract.getNftMetadata(1);
    expect(nft?.title).toBe("Title");
    expect(nft?.description).toBe("Description");
    expect(nft?.culturalContext).toBe("Context");
    expect(nft?.location).toBe("Location");
    expect(nft?.royaltyRate).toBe(10);
    expect(nft?.currency).toBe("STX");
    expect(nft?.minRoyalty).toBe(5);
    expect(nft?.maxRoyalty).toBe(15);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects mint without authority contract", () => {
    const hash = new Uint8Array(32).fill(0);
    const result = contract.mintNft(
      "Title",
      "Description",
      hash,
      "Context",
      "Location",
      10,
      "STX",
      5,
      15
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });

  it("rejects invalid title", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    const result = contract.mintNft(
      "",
      "Description",
      hash,
      "Context",
      "Location",
      10,
      "STX",
      5,
      15
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_TITLE);
  });

  it("rejects invalid description", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    const result = contract.mintNft(
      "Title",
      "",
      hash,
      "Context",
      "Location",
      10,
      "STX",
      5,
      15
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_DESCRIPTION);
  });

  it("rejects invalid hash", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(31).fill(0);
    const result = contract.mintNft(
      "Title",
      "Description",
      hash,
      "Context",
      "Location",
      10,
      "STX",
      5,
      15
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_HASH);
  });

  it("rejects invalid royalty rate", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    const result = contract.mintNft(
      "Title",
      "Description",
      hash,
      "Context",
      "Location",
      21,
      "STX",
      5,
      15
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_ROYALTY_RATE);
  });

  it("rejects invalid currency", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    const result = contract.mintNft(
      "Title",
      "Description",
      hash,
      "Context",
      "Location",
      10,
      "INVALID",
      5,
      15
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CURRENCY);
  });

  it("updates an NFT successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    contract.mintNft(
      "OldTitle",
      "OldDescription",
      hash,
      "Context",
      "Location",
      10,
      "STX",
      5,
      15
    );
    const result = contract.updateNft(1, "NewTitle", "NewDescription");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const nft = contract.getNftMetadata(1);
    expect(nft?.title).toBe("NewTitle");
    expect(nft?.description).toBe("NewDescription");
    const update = contract.state.nftUpdates.get(1);
    expect(update?.updateTitle).toBe("NewTitle");
    expect(update?.updateDescription).toBe("NewDescription");
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent NFT", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateNft(99, "NewTitle", "NewDescription");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    contract.mintNft(
      "Title",
      "Description",
      hash,
      "Context",
      "Location",
      10,
      "STX",
      5,
      15
    );
    contract.caller = "ST3FAKE";
    const result = contract.updateNft(1, "NewTitle", "NewDescription");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("transfers NFT successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    contract.mintNft(
      "Title",
      "Description",
      hash,
      "Context",
      "Location",
      10,
      "STX",
      5,
      15
    );
    const result = contract.transferNft(1, "ST4RECIPIENT");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getOwner(1)).toBe("ST4RECIPIENT");
  });

  it("rejects transfer by non-owner", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    contract.mintNft(
      "Title",
      "Description",
      hash,
      "Context",
      "Location",
      10,
      "STX",
      5,
      15
    );
    contract.caller = "ST3FAKE";
    const result = contract.transferNft(1, "ST4RECIPIENT");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("burns NFT successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    contract.mintNft(
      "Title",
      "Description",
      hash,
      "Context",
      "Location",
      10,
      "STX",
      5,
      15
    );
    const result = contract.burnNft(1);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getNftMetadata(1)).toBeNull();
    expect(contract.getOwner(1)).toBeNull();
  });

  it("rejects burn by non-owner", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    contract.mintNft(
      "Title",
      "Description",
      hash,
      "Context",
      "Location",
      10,
      "STX",
      5,
      15
    );
    contract.caller = "ST3FAKE";
    const result = contract.burnNft(1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets mint fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setMintFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.mintFee).toBe(1000);
    const hash = new Uint8Array(32).fill(0);
    contract.mintNft(
      "Title",
      "Description",
      hash,
      "Context",
      "Location",
      10,
      "STX",
      5,
      15
    );
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects mint fee change without authority", () => {
    const result = contract.setMintFee(1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct NFT count", () => {
    contract.setAuthorityContract("ST2TEST");
    const hash = new Uint8Array(32).fill(0);
    contract.mintNft(
      "Title1",
      "Desc1",
      hash,
      "Context1",
      "Loc1",
      10,
      "STX",
      5,
      15
    );
    contract.mintNft(
      "Title2",
      "Desc2",
      hash,
      "Context2",
      "Loc2",
      15,
      "USD",
      10,
      20
    );
    const result = contract.getNftCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("rejects mint with max NFTs exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxNfts = 1;
    const hash = new Uint8Array(32).fill(0);
    contract.mintNft(
      "Title1",
      "Desc1",
      hash,
      "Context1",
      "Loc1",
      10,
      "STX",
      5,
      15
    );
    const result = contract.mintNft(
      "Title2",
      "Desc2",
      hash,
      "Context2",
      "Loc2",
      15,
      "USD",
      10,
      20
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_NFTS_EXCEEDED);
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});