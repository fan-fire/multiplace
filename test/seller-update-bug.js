const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  constants, // Common constants, like the zero address and largest integers
} = require("@openzeppelin/test-helpers");

const { listingToObject } = require("./utils");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Seller update bug", async () => {
  let owner;
  let seller1;
  let seller2;
  let seller3;
  let seller4;
  let nftLookup;
  let sellerLookup;
  let state;
  let sellers;
  let multiplace;
  let multiplaceProxy;
  let erc1155Mock;
  let erc20Mock;
  let token1;
  let token2;
  let token3;

  beforeEach(async () => {
    [owner, seller1, seller2, seller3, seller4] = await ethers.getSigners();

    const Multiplace = await ethers.getContractFactory("Multiplace");
    multiplace = await Multiplace.deploy();
    await multiplace.deployed();

    const MultiplaceProxy = await ethers.getContractFactory("MultiplaceProxy");
    multiplaceProxy = await MultiplaceProxy.deploy(multiplace.address);
    await multiplaceProxy.deployed();

    multiplace = Multiplace.attach(multiplaceProxy.address);

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    erc20Mock = await ERC20Mock.deploy();
    await erc20Mock.deployed();
    // add erc20 as payment token
    await multiplace.connect(owner).addPaymentToken(erc20Mock.address);

    let tokenId;
    let amount;

    let ERC1155WithERC2981Mock = await ethers.getContractFactory(
      "ERC1155WithERC2981Mock"
    );

    state = [
      {
        tokenAddr: "0x08c39D911Dd02b7F459636e19036677696010f65",
        tokenId: 1,
        amount: 1,
        seller: "0xcB02B7c21BF6431E55Cf7f7eA052f50C7d4c4690",
      },
      {
        tokenAddr: "0x08c39D911Dd02b7F459636e19036677696010f65",
        tokenId: 3,
        amount: 2,
        seller: "0xcB02B7c21BF6431E55Cf7f7eA052f50C7d4c4690",
      },
      {
        tokenAddr: "0x68E5bbfCCDd7e62B2d11c176Cf1D55a28eC4c624",
        tokenId: 0,
        amount: 1,
        seller: "0x47c69E1675269dAfAb5d28e877a1026b88323bFD",
      },
      {
        tokenAddr: "0x68E5bbfCCDd7e62B2d11c176Cf1D55a28eC4c624",
        tokenId: 0,
        amount: 8,
        seller: "0xC4E9C436C4aB9071F996487811F7FeC7CdeE16a7",
      },
      {
        tokenAddr: "0x68E5bbfCCDd7e62B2d11c176Cf1D55a28eC4c624",
        tokenId: 1,
        amount: 1,
        seller: "0xcB02B7c21BF6431E55Cf7f7eA052f50C7d4c4690",
      },
      {
        tokenAddr: "0x68E5bbfCCDd7e62B2d11c176Cf1D55a28eC4c624",
        tokenId: 1,
        amount: 2,
        seller: "0xC4E9C436C4aB9071F996487811F7FeC7CdeE16a7",
      },
      {
        tokenAddr: "0x68E5bbfCCDd7e62B2d11c176Cf1D55a28eC4c624",
        tokenId: 2,
        amount: 1,
        seller: "0x9E0734F3C6CeD7CdDD90c2ac0D04E2705EB61968",
      },
      {
        tokenAddr: "0x68E5bbfCCDd7e62B2d11c176Cf1D55a28eC4c624",
        tokenId: 2,
        amount: 16,
        seller: "0xcB02B7c21BF6431E55Cf7f7eA052f50C7d4c4690",
      },
    ];

    nftLookup = {
      "0x68E5bbfCCDd7e62B2d11c176Cf1D55a28eC4c624": undefined,
      "0x08c39D911Dd02b7F459636e19036677696010f65": undefined,
    };

    sellerLookup = {
      "0xcB02B7c21BF6431E55Cf7f7eA052f50C7d4c4690": seller1,
      "0x9E0734F3C6CeD7CdDD90c2ac0D04E2705EB61968": seller2,
      "0xC4E9C436C4aB9071F996487811F7FeC7CdeE16a7": seller3,
      "0x47c69E1675269dAfAb5d28e877a1026b88323bFD": seller4,
    };

    for (nft in nftLookup) {
      nftLookup[nft] = await ERC1155WithERC2981Mock.deploy();
      await nftLookup[nft].deployed();
    }

    for (let i = 0; i < state.length; i++) {
      let s = state[i];
      let nft = nftLookup[s.tokenAddr];
      let seller = sellerLookup[s.seller];

      let tokenAddr = nft.address;
      let tokenId = s.tokenId;
      let amount = s.amount;
      let unitPrice = 1e9;

      await nft.mint(seller.address, tokenId, amount);

      await nft.connect(seller).setApprovalForAll(multiplace.address, true);
      await multiplace
        .connect(seller)
        .list(tokenAddr, tokenId, amount, unitPrice, erc20Mock.address);
    }
  });

  it("Listings reflect state", async () => {
    let listings = await multiplace.getAllListings();

    listings = listings.map(listingToObject);

    let actualState = listings.map((l) => {
      return {
        tokenAddr: l["tokenAddr"],
        tokenId: l["tokenId"],
        amount: l["amount"],
        seller: l["seller"],
      };
    });

    let expectedState = state.map((l) => {
      tokenAddr = nftLookup[l.tokenAddr];
      seller = sellerLookup[l.seller];

      return {
        tokenAddr: tokenAddr.address,
        tokenId: l["tokenId"],
        amount: l["amount"],
        seller: seller.address,
      };
    });

    expect(actualState).to.deep.equal(expectedState);
  });

  it("Can unlist all tokens", async () => {
    let allListings = await multiplace.getAllListings();

    allListings = allListings.map(listingToObject);

    for (let i = 0; i < allListings.length; i++) {
      let listing = allListings[i];
      listings = await multiplace.getAllListings();
      listings = listings.map(listingToObject);

      // getSellers(address tokenAddr, uint256 tokenId)
      let sellers = await multiplace.getSellers(
        listing.tokenAddr,
        listing.tokenId
      );

      let seller = Object.values(sellerLookup).find(
        (s) => s.address == listing.seller
      );

      await multiplace
        .connect(seller)
        .unlist(listing.tokenAddr, listing.tokenId);
      await sleep(1000);

      listings = await multiplace.getAllListings();
      listings = listings.map(listingToObject);
    }

    listings = await multiplace.getAllListings();
    expect(listings.length).to.equal(0);
  });
});
