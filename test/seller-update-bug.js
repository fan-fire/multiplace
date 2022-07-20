const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  constants, // Common constants, like the zero address and largest integers
} = require("@openzeppelin/test-helpers");

const { listingToObject, randomSigners } = require("./utils");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Below plugs a bug that arose at a spesific state of the contract.
// The bug is that the sellersPtr was not updated correctly when a listing was unlisted
// leading to an out of bounds on the sellers array.
describe("Seller update bug plug - duplicated failed state", async () => {
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

describe("Variations", async () => {
  let owner;
  let seller1;
  let seller2;
  let seller3;
  let seller4;
  let seller5;
  let seller6;
  let seller7;
  let seller8;
  let seller9;
  let seller10;
  let seller11;
  let seller12;
  let seller13;
  let seller14;
  let seller15;
  let seller16;
  let seller17;
  let seller18;
  let seller19;
  let seller20;
  let sellers;
  let sellersWallets;
  let multiplace;
  let multiplaceProxy;
  let erc20Mock;
  let token721;
  let token1155;

  beforeEach(async () => {
    [owner] = await ethers.getSigners();

    [
      seller1,
      seller2,
      seller3,
      seller4,
      seller5,
      seller6,
      seller7,
      seller8,
      seller9,
      seller10,
      seller11,
      seller12,
      seller13,
      seller14,
      seller15,
      seller16,
      seller17,
      seller18,
      seller19,
      seller20,
    ] = randomSigners(20);

    sellersWallets = [
      seller1,
      seller2,
      seller3,
      seller4,
      seller5,
      seller6,
      seller7,
      seller8,
      seller9,
      seller10,
      seller11,
      seller12,
      seller13,
      seller14,
      seller15,
      seller16,
      seller17,
      seller18,
      seller19,
      seller20,
    ];

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

    let ERC1155WithERC2981Mock = await ethers.getContractFactory(
      "ERC1155WithERC2981Mock"
    );
    let ERC721WithERC2981Mock = await ethers.getContractFactory(
      "ERC721WithERC2981Mock"
    );

    token721 = await ERC721WithERC2981Mock.deploy();
    await token721.deployed();

    token1155 = await ERC1155WithERC2981Mock.deploy();
    await token1155.deployed();
  });

  it("Can list and unlist 20 different 721 tokens from the same 721 from the same owner", async () => {
    await token721.connect(seller1).setApprovalForAll(multiplace.address, true);

    let amount = 1;
    let price = 1e9;
    let paymentToken = erc20Mock.address;
    let sellerAddress = seller1.address;
    let tokenAddr = token721.address;

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      await token721.mint(sellerAddress);
      await multiplace
        .connect(seller1)
        .list(token721.address, tokenId, amount, price, paymentToken);
    }

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(20, "should have 20 listings");

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        1,
        `should have 1 seller for token ${tokenId}`
      );
      expect(sellers[0]).to.equal(
        sellerAddress,
        `should be seller1 for token ${tokenId}`
      );
    }

    for (let i = 0; i < 20; i++) {
      await multiplace.connect(seller1).unlist(token721.address, i);
    }

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(0);

    for (let i = 0; i < 20; i++) {
      let sellers = await multiplace.getSellers(token721.address, i);
      expect(sellers.length).to.equal(
        0,
        `should have 0 sellers for token ${i}`
      );
    }
  });
  it("Can list and unlist 20 different 1155 tokens from the same 1155 from the same owner", async () => {
    let amount = 1;
    let price = 1e9;
    let paymentToken = erc20Mock.address;
    let sellerAddress = seller1.address;
    let tokenAddr = token1155.address;

    await token1155
      .connect(seller1)
      .setApprovalForAll(multiplace.address, true);

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      await token1155.mint(sellerAddress, tokenId, amount);
      await multiplace
        .connect(seller1)
        .list(tokenAddr, tokenId, amount, price, paymentToken);
    }

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(20);

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        1,
        `should have 1 seller for token ${tokenId}`
      );
      expect(sellers[0]).to.equal(
        sellerAddress,
        `should be seller1 for token ${tokenId}`
      );
    }

    for (let i = 0; i < 20; i++) {
      await multiplace.connect(seller1).unlist(tokenAddr, i);
    }

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(0);

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        0,
        `should have 0 sellers for token ${tokenId}`
      );
    }
  });
  it("Can list and unlist 20 different 721 tokens from the same 721 from 20 different owners", async () => {
    let amount = 1;
    let price = 1e9;
    let paymentToken = erc20Mock.address;
    let tokenAddr = token721.address;

    for (let i = 0; i < 20; i++) {
      let seller = sellersWallets[i];
      let sellerAddress = seller.address;
      let tokenId = i;

      await token721
        .connect(seller)
        .setApprovalForAll(multiplace.address, true);

      await token721.mint(sellerAddress);

      await multiplace
        .connect(seller)
        .list(tokenAddr, tokenId, amount, price, paymentToken);
    }

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(20, "should have 20 listings");

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let seller = sellersWallets[i];
      let sellerAddress = seller.address;

      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        1,
        `should have 1 seller for token ${tokenId}`
      );
      expect(sellers[0]).to.equal(
        sellerAddress,
        `should be seller1 for token ${tokenId}`
      );
    }

    for (let i = 0; i < 20; i++) {
      let seller = sellersWallets[i];
      let tokenId = i;
      await multiplace.connect(seller).unlist(tokenAddr, tokenId);
    }

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(0);

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        0,
        `should have 0 sellers for token ${i}`
      );
    }
  });
  it("Can list and unlist 20 tokenId=0 1155 tokens from the same 1155 from 20 different owners", async () => {
    let amount = 1;
    let price = 1e9;
    let tokenId = 0;
    let paymentToken = erc20Mock.address;
    let tokenAddr = token1155.address;

    for (let i = 0; i < 20; i++) {
      let seller = sellersWallets[i];
      let sellerAddress = seller.address;

      await token1155
        .connect(seller)
        .setApprovalForAll(multiplace.address, true);

      await token1155.mint(sellerAddress, tokenId, amount);

      await multiplace
        .connect(seller)
        .list(tokenAddr, tokenId, amount, price, paymentToken);
    }

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(20, "should have 20 listings");

    let sellers = await multiplace.getSellers(tokenAddr, tokenId);
    expect(sellers.length).to.equal(
      20,
      `should have 20 sellers for token ${tokenId}`
    );
    expect(sellers).to.deep.equal(
      sellersWallets.map((seller) => seller.address),
      `should be sellersWallets for token ${tokenId}`
    );

    for (let i = 0; i < 20; i++) {
      let seller = sellersWallets[i];
      await multiplace.connect(seller).unlist(tokenAddr, tokenId);
    }

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(0);

    sellers = await multiplace.getSellers(tokenAddr, tokenId);
    expect(sellers.length).to.equal(
      0,
      `should have 0 sellers for token ${tokenId}`
    );
  });

  it("Can list and unlist 20 1155 tokens from the same 1155 from 4 different owners - variation --", async () => {
    let amount = 1;
    let price = 1e9;
    let paymentToken = erc20Mock.address;
    let tokenAddr = token1155.address;
    let fourSellers = sellersWallets.slice(0, 4);

    for (let j = 0; j < 4; j++) {
      let seller = fourSellers[j];
      let sellerAddress = seller.address;
      for (let i = 0; i < 20; i++) {
        let tokenId = i;
        await token1155
          .connect(seller)
          .setApprovalForAll(multiplace.address, true);

        await token1155.mint(sellerAddress, tokenId, amount);

        await multiplace
          .connect(seller)
          .list(tokenAddr, tokenId, amount, price, paymentToken);
      }
    }

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(20 * 4, "should have 80 listings");

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        4,
        `should have 4 sellers for token ${tokenId}`
      );
      expect(sellers).to.deep.equal(
        fourSellers.map((seller) => seller.address),
        `should be fourSellers for token ${tokenId}`
      );
    }

    for (let j = 3; j >= 0; j--) {
      let seller = fourSellers[j];
      for (let i = 19; i >= 0; i--) {
        let tokenId = i;
        await multiplace.connect(seller).unlist(tokenAddr, tokenId);
        let sellers = await multiplace.getSellers(tokenAddr, tokenId);
        expect(sellers.length).to.equal(
          j,
          `should have ${j} sellers for token ${tokenId}`
        );
        expect(sellers).to.deep.equal(
          fourSellers.slice(0, j).map((seller) => seller.address),
          `should be fourSellers.slice(0, ${j}) for token ${tokenId}`
        );
      }
    }

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(0);

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        0,
        `should have 0 sellers for token ${tokenId}`
      );
    }
  });
  it("Can list and unlist 20 1155 tokens from the same 1155 from 4 different owners - variation -+", async () => {
    let amount = 1;
    let price = 1e9;
    let paymentToken = erc20Mock.address;
    let tokenAddr = token1155.address;
    let fourSellers = sellersWallets.slice(0, 4);

    for (let j = 0; j < 4; j++) {
      let seller = fourSellers[j];
      let sellerAddress = seller.address;
      for (let i = 0; i < 20; i++) {
        let tokenId = i;
        await token1155
          .connect(seller)
          .setApprovalForAll(multiplace.address, true);

        await token1155.mint(sellerAddress, tokenId, amount);

        await multiplace
          .connect(seller)
          .list(tokenAddr, tokenId, amount, price, paymentToken);
      }
    }

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(20 * 4, "should have 80 listings");

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        4,
        `should have 4 sellers for token ${tokenId}`
      );
      expect(sellers).to.deep.equal(
        fourSellers.map((seller) => seller.address),
        `should be fourSellers for token ${tokenId}`
      );
    }

    for (let j = 3; j >= 0; j--) {
      let seller = fourSellers[j];
      for (let i = 0; i < 20; i++) {
        let tokenId = i;
        await multiplace.connect(seller).unlist(tokenAddr, tokenId);
        let sellers = await multiplace.getSellers(tokenAddr, tokenId);
        expect(sellers.length).to.equal(
          j,
          `should have ${j} sellers for token ${tokenId}`
        );
        expect(sellers).to.deep.equal(
          fourSellers.slice(0, j).map((seller) => seller.address),
          `should be fourSellers.slice(0, ${j}) for token ${tokenId}`
        );
      }
    }

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(0);

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        0,
        `should have 0 sellers for token ${tokenId}`
      );
    }
  });
  it("Can list and unlist 20 1155 tokens from the same 1155 from 4 different owners - variation +-", async () => {
    let amount = 1;
    let price = 1e9;
    let paymentToken = erc20Mock.address;
    let tokenAddr = token1155.address;
    let fourSellers = sellersWallets.slice(0, 4);

    for (let j = 0; j < 4; j++) {
      let seller = fourSellers[j];
      let sellerAddress = seller.address;
      for (let i = 0; i < 20; i++) {
        let tokenId = i;
        await token1155
          .connect(seller)
          .setApprovalForAll(multiplace.address, true);

        await token1155.mint(sellerAddress, tokenId, amount);

        await multiplace
          .connect(seller)
          .list(tokenAddr, tokenId, amount, price, paymentToken);
      }
    }

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(20 * 4, "should have 80 listings");

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        4,
        `should have 4 sellers for token ${tokenId}`
      );
      expect(sellers).to.deep.equal(
        fourSellers.map((seller) => seller.address),
        `should be fourSellers for token ${tokenId}`
      );
    }

    for (let j = 0; j < 4; j++) {
      let seller = fourSellers[j];
      for (let i = 19; i >= 0; i--) {
        let tokenId = i;
        await multiplace.connect(seller).unlist(tokenAddr, tokenId);
        let sellers = await multiplace.getSellers(tokenAddr, tokenId);
        expect(sellers.length).to.equal(
          3 - j,
          `should have ${j} sellers for token ${tokenId}`
        );
        let expectedSellers = fourSellers
          .slice(j + 1, 4)
          .map((seller) => seller.address);
        expect(sellers).to.have.members(
          expectedSellers,
          `should be fourSellers.slice(${j + 1}, 4) for token ${tokenId}`
        );
      }
    }

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(0);

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        0,
        `should have 0 sellers for token ${tokenId}`
      );
    }
  });
  it("Can list and unlist 20 1155 tokens from the same 1155 from 4 different owners - variation ++", async () => {
    let amount = 1;
    let price = 1e9;
    let paymentToken = erc20Mock.address;
    let tokenAddr = token1155.address;
    let fourSellers = sellersWallets.slice(0, 4);

    for (let j = 0; j < 4; j++) {
      let seller = fourSellers[j];
      let sellerAddress = seller.address;
      for (let i = 0; i < 20; i++) {
        let tokenId = i;
        await token1155
          .connect(seller)
          .setApprovalForAll(multiplace.address, true);

        await token1155.mint(sellerAddress, tokenId, amount);

        await multiplace
          .connect(seller)
          .list(tokenAddr, tokenId, amount, price, paymentToken);
      }
    }

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(20 * 4, "should have 80 listings");

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        4,
        `should have 4 sellers for token ${tokenId}`
      );
      expect(sellers).to.deep.equal(
        fourSellers.map((seller) => seller.address),
        `should be fourSellers for token ${tokenId}`
      );
    }

    for (let j = 0; j < 4; j++) {
      let seller = fourSellers[j];
      for (let i = 0; i < 20; i++) {
        let tokenId = i;
        await multiplace.connect(seller).unlist(tokenAddr, tokenId);
        let sellers = await multiplace.getSellers(tokenAddr, tokenId);
        expect(sellers.length).to.equal(
          3 - j,
          `should have ${j} sellers for token ${tokenId}`
        );
        let expectedSellers = fourSellers
          .slice(j + 1, 4)
          .map((seller) => seller.address);
        expect(sellers).to.have.members(
          expectedSellers,
          `should be fourSellers.slice(${j + 1}, 4) for token ${tokenId}`
        );
      }
    }

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(0);

    for (let i = 0; i < 20; i++) {
      let tokenId = i;
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        0,
        `should have 0 sellers for token ${tokenId}`
      );
    }
  });
  it("Can list and unlist 20 token 0's from different 1155 tokens from the same owner", async () => {
    let amount = 1;
    let price = 1e9;
    let paymentToken = erc20Mock.address;
    let seller = sellersWallets[0];
    let sellerAddress = seller.address;
    let tokenAddresses = [];
    let tokenId = 0;
    let ERC1155WithERC2981Mock = await ethers.getContractFactory(
      "ERC1155WithERC2981Mock"
    );

    for (let i = 0; i < 20; i++) {
      token1155 = await ERC1155WithERC2981Mock.deploy();
      await token1155.deployed();
      tokenAddresses.push(token1155.address);
      let tokenAddr = token1155.address;

      await token1155
        .connect(seller)
        .setApprovalForAll(multiplace.address, true);

      await token1155.mint(sellerAddress, tokenId, amount);

      await multiplace
        .connect(seller)
        .list(tokenAddr, tokenId, amount, price, paymentToken);
    }

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(20, "should have 20 listings");

    for (let i = 0; i < 20; i++) {
      let tokenAddr = tokenAddresses[i];
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        1,
        `should have 1 seller for token ${tokenId}`
      );
      expect(sellers).to.deep.equal(
        [sellerAddress],
        `should be [sellerAddress] for token ${tokenId}`
      );
    }

    for (let i = 0; i < 20; i++) {
      let tokenAddr = tokenAddresses[i];
      await multiplace.connect(seller).unlist(tokenAddr, tokenId);
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        0,
        `should have 0 sellers for token ${tokenId}`
      );
    }

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(0);
  });
  it("Can list and unlist 20 token 0's from different 1155 tokens from diffferent owner", async () => {
    let amount = 1;
    let price = 1e9;
    let paymentToken = erc20Mock.address;
    let tokenAddresses = [];
    let tokenId = 0;
    let ERC1155WithERC2981Mock = await ethers.getContractFactory(
      "ERC1155WithERC2981Mock"
    );

    for (let i = 0; i < 20; i++) {
      let seller = sellersWallets[i];
      let sellerAddress = seller.address;
      token1155 = await ERC1155WithERC2981Mock.deploy();
      await token1155.deployed();
      tokenAddresses.push(token1155.address);
      let tokenAddr = token1155.address;

      await token1155
        .connect(seller)
        .setApprovalForAll(multiplace.address, true);

      await token1155.mint(sellerAddress, tokenId, amount);

      await multiplace
        .connect(seller)
        .list(tokenAddr, tokenId, amount, price, paymentToken);
    }

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(20, "should have 20 listings");

    for (let i = 0; i < 20; i++) {
      let seller = sellersWallets[i];
      let sellerAddress = seller.address;
      let tokenAddr = tokenAddresses[i];
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        1,
        `should have 1 seller for token ${tokenId}`
      );
      expect(sellers).to.deep.equal(
        [sellerAddress],
        `should be [sellerAddress] for token ${tokenId}`
      );
    }

    for (let i = 0; i < 20; i++) {
      let seller = sellersWallets[i];
      let tokenAddr = tokenAddresses[i];
      await multiplace.connect(seller).unlist(tokenAddr, tokenId);
      let sellers = await multiplace.getSellers(tokenAddr, tokenId);
      expect(sellers.length).to.equal(
        0,
        `should have 0 sellers for token ${tokenId}`
      );
    }

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings.length).to.equal(0, "should have 20 listings");
  });
});
