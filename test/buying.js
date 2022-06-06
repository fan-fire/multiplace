const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  constants, // Common constants, like the zero address and largest integers
} = require("@openzeppelin/test-helpers");

const {
  NFT_TYPE,
  listingToObject,
  PROTOCOL_FEE_DEN,
  PROTOCOL_FEE_NUM,
} = require("./utils");
const ether = require("@openzeppelin/test-helpers/src/ether");

Array.prototype.forEachAsync = async function (fn) {
  for (let t of this) {
    await fn(t);
  }
};

describe("Buying", async () => {
  let owner;
  let buyer1;
  let buyer2;
  let seller;
  let acc1;

  let multiplace;
  let multiplaceProxy;
  let erc20Mock;

  let erc721Mock;
  let erc721With2981Mock;
  let erc721WithoutOwnerMock;

  let erc1155Mock;
  let erc1155With2981Mock;
  let erc1155WithoutOwnerMock;

  let listingsToList;

  beforeEach(async () => {
    [owner, buyer1, buyer2, seller, acc1, acc2, acc3] =
      await ethers.getSigners();

    /* =======================================/
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /              Multiplace                 /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /======================================= */

    const Multiplace = await ethers.getContractFactory("Multiplace");
    multiplace = await Multiplace.deploy();
    await multiplace.deployed();

    const MultiplaceProxy = await ethers.getContractFactory("MultiplaceProxy");
    multiplaceProxy = await MultiplaceProxy.deploy(multiplace.address);
    await multiplaceProxy.deployed();

    multiplace = Multiplace.attach(multiplaceProxy.address);

    /* =======================================/
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /                 ERC20                   /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /======================================= */
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    erc20Mock = await ERC20Mock.deploy();
    await erc20Mock.deployed();

    await erc20Mock
      .connect(owner)
      .transfer(buyer1.address, ethers.utils.parseEther("10"));
    await erc20Mock
      .connect(owner)
      .transfer(buyer2.address, ethers.utils.parseEther("10"));

    // add erc20 as payment token
    await multiplace.connect(owner).addPaymentToken(erc20Mock.address);

    let tokenId;
    let amount;

    /* =======================================/
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /                ERC1155s                 /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /======================================= */

    const ERC1155Mock = await ethers.getContractFactory("ERC1155Mock");
    erc1155Mock = await ERC1155Mock.deploy();
    await erc1155Mock.deployed();
    tokenId = 1;
    amount = 10;
    await erc1155Mock.mint(seller.address, tokenId, amount);
    tokenId = 2;
    amount = 15;
    await erc1155Mock.mint(seller.address, tokenId, amount);

    let ERC1155WithERC2981Mock = await ethers.getContractFactory(
      "ERC1155WithERC2981Mock"
    );
    erc1155With2981Mock = await ERC1155WithERC2981Mock.deploy();
    await erc1155With2981Mock.deployed();
    tokenId = 1;
    amount = 10;
    await erc1155With2981Mock.mint(seller.address, tokenId, amount);
    tokenId = 2;
    amount = 15;
    await erc1155With2981Mock.mint(seller.address, tokenId, amount);

    const ERC1155WithoutOwnerMock = await ethers.getContractFactory(
      "ERC1155WithoutOwnerMock"
    );
    erc1155WithoutOwnerMock = await ERC1155WithoutOwnerMock.deploy();
    await erc1155WithoutOwnerMock.deployed();
    tokenId = 1;
    amount = 10;
    await erc1155WithoutOwnerMock.mint(seller.address, tokenId, amount);
    tokenId = 2;
    amount = 15;
    await erc1155WithoutOwnerMock.mint(seller.address, tokenId, amount);

    /* =======================================/
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /                                         /  
    /                  ERC721s                /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /======================================= */

    const ERC721 = await ethers.getContractFactory("ERC721Mock");
    erc721Mock = await ERC721.deploy();
    await erc721Mock.deployed();
    await erc721Mock.mint(seller.address);
    await erc721Mock.mint(seller.address);
    await erc721Mock.mint(seller.address);
    await erc721Mock.mint(seller.address);

    let ERC721WithERC2981Mock = await ethers.getContractFactory(
      "ERC721WithERC2981Mock"
    );
    erc721With2981Mock = await ERC721WithERC2981Mock.deploy();
    await erc721With2981Mock.deployed();
    await erc721With2981Mock.mint(seller.address);
    await erc721With2981Mock.mint(seller.address);
    await erc721With2981Mock.mint(seller.address);
    await erc721With2981Mock.mint(seller.address);

    let ERC721WithoutOwnerMock = await ethers.getContractFactory(
      "ERC721WithoutOwnerMock"
    );
    erc721WithoutOwnerMock = await ERC721WithoutOwnerMock.deploy();
    await erc721WithoutOwnerMock.deployed();
    await erc721WithoutOwnerMock.mint(seller.address);
    await erc721WithoutOwnerMock.mint(seller.address);
    await erc721WithoutOwnerMock.mint(seller.address);
    await erc721WithoutOwnerMock.mint(seller.address);

    /* =======================================/
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /             List Tokens                 /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /                                         /
    /======================================= */

    listingsToList = [
      {
        contract: erc721Mock,
        tokenAddr: erc721Mock.address,
        tokenIds: [1, 2],
        amounts: [1, 1],
        unitPrices: [
          ethers.utils.parseEther("0.1"),
          ethers.utils.parseEther("0.2"),
        ],
        paymentToken: erc20Mock.address,
        nftType: NFT_TYPE.ERC721,
      },
      {
        contract: erc721With2981Mock,
        tokenAddr: erc721With2981Mock.address,
        tokenIds: [1, 2],
        amounts: [1, 1],
        unitPrices: [
          ethers.utils.parseEther("0.1"),
          ethers.utils.parseEther("0.2"),
        ],
        paymentToken: erc20Mock.address,
        nftType: NFT_TYPE.ERC721_2981,
      },
      {
        contract: erc721WithoutOwnerMock,
        tokenAddr: erc721WithoutOwnerMock.address,
        tokenIds: [1, 2],
        amounts: [1, 1],
        unitPrices: [
          ethers.utils.parseEther("0.1"),
          ethers.utils.parseEther("0.2"),
        ],
        paymentToken: erc20Mock.address,
        nftType: NFT_TYPE.ERC721,
      },
      {
        contract: erc1155Mock,
        tokenAddr: erc1155Mock.address,
        tokenIds: [1, 2],
        amounts: [1, 2],
        unitPrices: [
          ethers.utils.parseEther("0.1"),
          ethers.utils.parseEther("0.2"),
        ],
        paymentToken: erc20Mock.address,
        nftType: NFT_TYPE.ERC1155,
      },
      {
        contract: erc1155With2981Mock,
        tokenAddr: erc1155With2981Mock.address,
        tokenIds: [1, 2],
        amounts: [1, 2],
        unitPrices: [
          ethers.utils.parseEther("0.1"),
          ethers.utils.parseEther("0.2"),
        ],
        paymentToken: erc20Mock.address,
        nftType: NFT_TYPE.ERC1155_2981,
      },
      {
        contract: erc1155WithoutOwnerMock,
        tokenAddr: erc1155WithoutOwnerMock.address,
        tokenIds: [1, 2],
        amounts: [1, 2],
        unitPrices: [
          ethers.utils.parseEther("0.1"),
          ethers.utils.parseEther("0.2"),
        ],
        paymentToken: erc20Mock.address,
        nftType: NFT_TYPE.ERC1155,
      },
    ];

    await listingsToList.forEachAsync(async (listing) => {
      await listing["contract"]
        .connect(seller)
        .setApprovalForAll(multiplace.address, true);
    });

    await listingsToList.forEachAsync(async (listing) => {
      for (let i = 0; i < listing["tokenIds"].length; i++) {
        let tokenAddr = listing["tokenAddr"];
        let tokenId = listing["tokenIds"][i];
        let amount = listing["amounts"][i];
        let unitPrice = listing["unitPrices"][i];
        let paymentToken = listing["paymentToken"];

        await multiplace
          .connect(seller)
          .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);
      }
    });
  });

  /* ========================================================/
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /         Check that tokens were minted correctly          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /======================================================== */

  it("Seller is the owner of 10 tokenId 1s of 1155 without 2981 set up in before each", async () => {
    let tokenId = 1;
    let balanceOfSeller = await erc1155Mock.balanceOf(seller.address, tokenId);
    expect(balanceOfSeller.toString()).to.be.equal("10");
  });

  it("Seller is the owner of 15 tokenId 2s of 1155 without 2981 set up in before each", async () => {
    let tokenId = 2;
    let balanceOfSeller = await erc1155Mock.balanceOf(seller.address, tokenId);
    expect(balanceOfSeller.toString()).to.be.equal("15");
  });

  it("Seller is the owner of 10 tokenId 1s of 1155 with 2981 set up in before each", async () => {
    let tokenId = 1;
    let balanceOfSeller = await erc1155With2981Mock.balanceOf(
      seller.address,
      tokenId
    );
    expect(balanceOfSeller.toString()).to.be.equal("10");
  });

  it("Seller is the owner of 15 tokenId 2s of 1155 with 2981 set up in before each", async () => {
    let tokenId = 2;
    let balanceOfSeller = await erc1155With2981Mock.balanceOf(
      seller.address,
      tokenId
    );
    expect(balanceOfSeller.toString()).to.be.equal("15");
  });

  it("Seller is the owner of 10 tokenId 1s of 1155 without owner set up in before each", async () => {
    let tokenId = 1;
    let balanceOfSeller = await erc1155WithoutOwnerMock.balanceOf(
      seller.address,
      tokenId
    );
    expect(balanceOfSeller.toString()).to.be.equal("10");
  });

  it("Seller is the owner of 15 tokenId 2s of 1155 without owner set up in before each", async () => {
    let tokenId = 2;
    let balanceOfSeller = await erc1155WithoutOwnerMock.balanceOf(
      seller.address,
      tokenId
    );
    expect(balanceOfSeller.toString()).to.be.equal("15");
  });

  it("Seller is the owner of 4 721s without 2981 set up in before each", async () => {
    let ownerOf = await erc721Mock.ownerOf(0);
    expect(ownerOf).to.be.equal(seller.address);
    ownerOf = await erc721Mock.ownerOf(1);
    expect(ownerOf).to.be.equal(seller.address);
    ownerOf = await erc721Mock.ownerOf(2);
    expect(ownerOf).to.be.equal(seller.address);
    ownerOf = await erc721Mock.ownerOf(3);
    expect(ownerOf).to.be.equal(seller.address);
  });

  it("Seller is the owner of 4 721s with 2981 set up in before each", async () => {
    let ownerOf = await erc721With2981Mock.ownerOf(0);
    expect(ownerOf).to.be.equal(seller.address);
    ownerOf = await erc721With2981Mock.ownerOf(1);
    expect(ownerOf).to.be.equal(seller.address);
    ownerOf = await erc721With2981Mock.ownerOf(2);
    expect(ownerOf).to.be.equal(seller.address);
    ownerOf = await erc721With2981Mock.ownerOf(3);
    expect(ownerOf).to.be.equal(seller.address);
  });

  it("Seller is the owner of 4 721s without owner set up in before each", async () => {
    let ownerOf = await erc721WithoutOwnerMock.ownerOf(0);
    expect(ownerOf).to.be.equal(seller.address);
    ownerOf = await erc721WithoutOwnerMock.ownerOf(1);
    expect(ownerOf).to.be.equal(seller.address);
    ownerOf = await erc721WithoutOwnerMock.ownerOf(2);
    expect(ownerOf).to.be.equal(seller.address);
    ownerOf = await erc721WithoutOwnerMock.ownerOf(3);
    expect(ownerOf).to.be.equal(seller.address);
  });

  it("listings look as expected", async () => {
    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [];
    let listPtr = 0;

    await listingsToList.forEachAsync(async (listing) => {
      for (let i = 0; i < listing["tokenIds"].length; i++) {
        let tokenAddr = listing["tokenAddr"];
        let tokenId = listing["tokenIds"][i];
        let amount = listing["amounts"][i];
        let unitPrice = listing["unitPrices"][i];
        let paymentToken = listing["paymentToken"];
        let nftType = listing["nftType"];

        let listingToAdd = {
          listPtr: listPtr,
          tokenAddr: tokenAddr,
          tokenId: tokenId,
          seller: seller.address,
          unitPrice: unitPrice.toString(),
          amount: amount,
          paymentToken: paymentToken,
          nftType: nftType,
          reservedUntil: 0,
          reservedFor: constants.ZERO_ADDRESS,
        };

        let sellers = await multiplace.getSellers(tokenAddr, tokenId);

        expect(sellers.length).to.be.equal(1);
        expect(sellers[0]).to.be.equal(seller.address);

        expectedListings.push(listingToAdd);
        listPtr += 1;
      }
    });

    expect(listings).to.be.deep.equal(expectedListings);
  });

  it("buyer 1 and buyer 2 should both have 10 ether of erc20", async () => {
    let buyer1Balance = await erc20Mock.balanceOf(buyer1.address);
    let buyer2Balance = await erc20Mock.balanceOf(buyer2.address);

    expect(buyer1Balance.toString()).to.be.equal(
      ethers.utils.parseEther("10").toString()
    );
    expect(buyer2Balance.toString()).to.be.equal(
      ethers.utils.parseEther("10").toString()
    );
  });
  it("can buy ERC721", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let buyer1BalanceB4 = await erc20Mock.balanceOf(buyer1.address);
    let paymentToken = listing.paymentToken;
    let protocolFee = totalPrice.mul(PROTOCOL_FEE_NUM).div(PROTOCOL_FEE_DEN);

    expect(buyer1BalanceB4.toString()).to.be.equal(
      ethers.utils.parseEther("10").toString(),
      "buyer1 should have 10 ether of erc20 before purchase"
    );

    expect(paymentToken).to.be.equal(
      erc20Mock.address,
      "payment token should be erc20"
    );

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer1)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let buyer1Balance = await erc20Mock.balanceOf(buyer1.address);

    expect(buyer1Balance.toString()).to.be.equal(
      buyer1BalanceB4.sub(totalPrice).toString(),
      "buyer1 should have 10 ether minus the total price of the purchase"
    );

    let ownerOfToken = await erc721Mock.ownerOf(tokenId);
    expect(ownerOfToken).to.be.equal(
      buyer1.address,
      "token should be owned by buyer1"
    );

    let sellerMarketplaceBalance = await multiplace.getBalance(
      paymentToken,
      sellerAddr
    );
    expect(sellerMarketplaceBalance.toString()).to.be.equal(
      totalPrice.sub(protocolFee).toString(),
      "seller should have the correct balance"
    );

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let tokenStillInListings = listings.filter(
      (listing) =>
        listing.tokenAddr === tokenAddr &&
        listing.tokenId === tokenId &&
        listing.seller === sellerAddr
    );

    expect(tokenStillInListings.length).to.be.equal(
      0,
      "token should not be in listings anymore"
    );
  });
  it("can buy full amount ERC1155", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let buyer1BalanceB4 = await erc20Mock.balanceOf(buyer1.address);
    let paymentToken = listing.paymentToken;
    let protocolFee = totalPrice.mul(PROTOCOL_FEE_NUM).div(PROTOCOL_FEE_DEN);

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer1)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let buyer1Balance = await erc20Mock.balanceOf(buyer1.address);

    expect(buyer1Balance.toString()).to.be.equal(
      buyer1BalanceB4.sub(totalPrice).toString(),
      "buyer1 balance should be reduced by totalPrice"
    );

    let numberOfTokensBuyer1 = await erc1155Mock.balanceOf(
      buyer1.address,
      tokenId
    );
    expect(numberOfTokensBuyer1.toString()).to.be.equal(
      amount.toString(),
      "buyer1 should have 2 tokens"
    );

    let sellerMarketplaceBalance = await multiplace.getBalance(
      paymentToken,
      sellerAddr
    );
    expect(sellerMarketplaceBalance.toString()).to.be.equal(
      totalPrice.sub(protocolFee).toString(),
      "seller marketplace balance should be totalPrice minus protocol fee"
    );

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let isTokenStillInListings = listings.filter(
      (listing) =>
        listing.tokenAddr === tokenAddr &&
        listing.tokenId === tokenId &&
        listing.seller === sellerAddr
    );

    expect(isTokenStillInListings.length).to.be.equal(
      0,
      "token should not be in listings anymore"
    );
  });

  it("can buy partial amount ERC1155", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount.sub(1);
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let buyer1BalanceB4 = await erc20Mock.balanceOf(buyer1.address);
    let paymentToken = listing.paymentToken;
    let protocolFee = totalPrice.mul(PROTOCOL_FEE_NUM).div(PROTOCOL_FEE_DEN);

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer1)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let buyer1Balance = await erc20Mock.balanceOf(buyer1.address);

    expect(buyer1Balance.toString()).to.be.equal(
      buyer1BalanceB4.sub(totalPrice).toString(),
      "buyer1 balance should be reduced by totalPrice"
    );

    let numberOfTokensBuyer1 = await erc1155Mock.balanceOf(
      buyer1.address,
      tokenId
    );
    expect(numberOfTokensBuyer1.toString()).to.be.equal(
      amount.toString(),
      "buyer1 should have 2 tokens"
    );

    let sellerMarketplaceBalance = await multiplace.getBalance(
      paymentToken,
      sellerAddr
    );
    expect(sellerMarketplaceBalance.toString()).to.be.equal(
      totalPrice.sub(protocolFee).toString(),
      "seller marketplace balance should be totalPrice minus protocol fee"
    );

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let soldTokenInListings = listings.filter(
      (listing) =>
        listing.tokenAddr === tokenAddr &&
        listing.tokenId === tokenId &&
        listing.seller === sellerAddr
    );

    expect(soldTokenInListings.length).to.be.equal(
      1,
      "token should not be in listings anymore"
    );

    let soldListing = soldTokenInListings[0];

    expect(soldListing.amount.toString()).to.be.equal(
      amount.toString(),
      "amount should be reduced by 1"
    );
  });

  it("can buy ERC721_2981", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721With2981Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let buyer1BalanceB4 = await erc20Mock.balanceOf(buyer1.address);
    let paymentToken = listing.paymentToken;
    let protocolFee = totalPrice.mul(PROTOCOL_FEE_NUM).div(PROTOCOL_FEE_DEN);
    let royalties = await multiplace.getUnitRoyalties(
      sellerAddr,
      tokenAddr,
      tokenId
    );

    let totalRoyalties = totalPrice.mul(10).div(100); //10% set in NFT contract

    let [receiver, unitRoyaltyAmount] = royalties;

    expect(receiver).to.be.equal(
      owner.address,
      "royalty receiver should be buyer1"
    );

    expect(unitRoyaltyAmount.toString()).to.be.equal(
      totalRoyalties.toString(),
      "royalty amount should be 10% of totalPrice"
    );

    expect(buyer1BalanceB4.toString()).to.be.equal(
      ethers.utils.parseEther("10").toString(),
      "buyer1 should have 10 ether of erc20 before purchase"
    );

    expect(paymentToken).to.be.equal(
      erc20Mock.address,
      "payment token should be erc20"
    );

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer1)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let buyer1Balance = await erc20Mock.balanceOf(buyer1.address);

    expect(buyer1Balance.toString()).to.be.equal(
      buyer1BalanceB4.sub(totalPrice).toString(),
      "buyer1 should have 10 ether minus the total price of the purchase"
    );

    let ownerOfToken = await erc721With2981Mock.ownerOf(tokenId);
    expect(ownerOfToken).to.be.equal(
      buyer1.address,
      "token should be owned by buyer1"
    );

    let sellerMarketplaceBalance = await multiplace.getBalance(
      paymentToken,
      sellerAddr
    );

    expect(sellerMarketplaceBalance.toString()).to.be.equal(
      totalPrice.sub(protocolFee).sub(totalRoyalties).toString(),
      "seller should have the correct balance"
    );

    let ownerBalance = await multiplace.getBalance(paymentToken, owner.address);

    expect(ownerBalance.toString()).to.be.equal(
      totalRoyalties.add(protocolFee).toString(),
      "owner should have the correct balance"
    );

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let tokenStillInListings = listings.filter(
      (listing) =>
        listing.tokenAddr === tokenAddr &&
        listing.tokenId === tokenId &&
        listing.seller === sellerAddr
    );

    expect(tokenStillInListings.length).to.be.equal(
      0,
      "token should not be in listings anymore"
    );
  });

  it("can buy full amount ERC155_2981", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let buyer1BalanceB4 = await erc20Mock.balanceOf(buyer1.address);
    let paymentToken = listing.paymentToken;
    let protocolFee = totalPrice.mul(PROTOCOL_FEE_NUM).div(PROTOCOL_FEE_DEN);
    let unitRoyalties = await multiplace.getUnitRoyalties(
      sellerAddr,
      tokenAddr,
      tokenId
    );

    let totalRoyalties = totalPrice.mul(10).div(100); //10% set in NFT contract

    let [receiver, unitRoyaltyAmount] = unitRoyalties;

    expect(receiver).to.be.equal(
      owner.address,
      "royalty receiver should be buyer1"
    );

    expect(unitRoyaltyAmount.mul(amount).toString()).to.be.equal(
      totalPrice.mul(10).div(100).toString(),
      "royalty amount should be 10% of totalPrice"
    );

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer1)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let buyer1Balance = await erc20Mock.balanceOf(buyer1.address);

    expect(buyer1Balance.toString()).to.be.equal(
      buyer1BalanceB4.sub(totalPrice).toString(),
      "buyer1 balance should be reduced by totalPrice"
    );

    let numberOfTokensBuyer1 = await erc1155With2981Mock.balanceOf(
      buyer1.address,
      tokenId
    );
    expect(numberOfTokensBuyer1.toString()).to.be.equal(
      amount.toString(),
      "buyer1 should have 2 tokens"
    );

    let sellerMarketplaceBalance = await multiplace.getBalance(
      paymentToken,
      sellerAddr
    );
    expect(sellerMarketplaceBalance.toString()).to.be.equal(
      totalPrice.sub(protocolFee).sub(totalRoyalties).toString(),
      "seller marketplace balance should be totalPrice minus protocol fee"
    );

    let ownerBalance = await multiplace.getBalance(paymentToken, owner.address);

    expect(ownerBalance.toString()).to.be.equal(
      totalRoyalties.add(protocolFee).toString(),
      "owner balance should be unitRoyaltyAmount"
    );

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let isTokenStillInListings = listings.filter(
      (listing) =>
        listing.tokenAddr === tokenAddr &&
        listing.tokenId === tokenId &&
        listing.seller === sellerAddr
    );

    expect(isTokenStillInListings.length).to.be.equal(
      0,
      "token should not be in listings anymore"
    );
  });

  it("can buy partial amount ERC155_2981", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount.sub(1);
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let buyer1BalanceB4 = await erc20Mock.balanceOf(buyer1.address);
    let paymentToken = listing.paymentToken;
    let protocolFee = totalPrice.mul(PROTOCOL_FEE_NUM).div(PROTOCOL_FEE_DEN);
    let unitRoyalties = await multiplace.getUnitRoyalties(
      sellerAddr,
      tokenAddr,
      tokenId
    );

    let totalRoyalties = totalPrice.mul(10).div(100); //10% set in NFT contract

    let [receiver, unitRoyaltyAmount] = unitRoyalties;

    expect(receiver).to.be.equal(
      owner.address,
      "royalty receiver should be buyer1"
    );

    expect(unitRoyaltyAmount.mul(amount).toString()).to.be.equal(
      totalPrice.mul(10).div(100).toString(),
      "royalty amount should be 10% of totalPrice"
    );

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer1)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let buyer1Balance = await erc20Mock.balanceOf(buyer1.address);

    expect(buyer1Balance.toString()).to.be.equal(
      buyer1BalanceB4.sub(totalPrice).toString(),
      "buyer1 balance should be reduced by totalPrice"
    );

    let numberOfTokensBuyer1 = await erc1155With2981Mock.balanceOf(
      buyer1.address,
      tokenId
    );
    expect(numberOfTokensBuyer1.toString()).to.be.equal(
      amount.toString(),
      "buyer1 should have 2 tokens"
    );

    let sellerMarketplaceBalance = await multiplace.getBalance(
      paymentToken,
      sellerAddr
    );
    expect(sellerMarketplaceBalance.toString()).to.be.equal(
      totalPrice.sub(protocolFee).sub(totalRoyalties).toString(),
      "seller marketplace balance should be totalPrice minus protocol fee"
    );

    let ownerBalance = await multiplace.getBalance(paymentToken, owner.address);

    expect(ownerBalance.toString()).to.be.equal(
      totalRoyalties.add(protocolFee).toString(),
      "owner balance should be unitRoyaltyAmount"
    );

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let soldTokenInListings = listings.filter(
      (listing) =>
        listing.tokenAddr === tokenAddr &&
        listing.tokenId === tokenId &&
        listing.seller === sellerAddr
    );

    expect(soldTokenInListings.length).to.be.equal(
      1,
      "token should not be in listings anymore"
    );

    let soldListing = soldTokenInListings[0];

    expect(soldListing.amount.toString()).to.be.equal(
      amount.toString(),
      "amount should be reduced by 1"
    );
  });

  it("should fail if original seller does not own the token anymore and the token is bought for ERC721", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);

    let from = seller.address;
    let to = acc1.address;
    await erc721Mock.connect(seller).transferFrom(from, to, tokenId);

    let ownerOfToken = await erc721Mock.ownerOf(tokenId);
    expect(ownerOfToken).to.be.equal(
      acc1.address,
      "token should be owned by acc1"
    );

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount)
    ).to.be.revertedWith("NFT not owned by seller");
  });

  it("should fail if original seller does not own any of the tokens anymore and the token is bought for ERC155", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);

    let from = seller.address;
    let to = acc1.address;

    let oldBalanceOfSeller = await erc1155Mock.balanceOf(from, tokenId);

    await erc1155Mock
      .connect(seller)
      .safeTransferFrom(from, to, tokenId, oldBalanceOfSeller, "0x");

    let newBalanceOfSeller = await erc1155Mock.balanceOf(from, tokenId);
    expect(newBalanceOfSeller.toString()).to.be.equal(
      "0",
      "seller should have no tokens"
    );

    let balanceOfOwner = await erc1155Mock.balanceOf(to, tokenId);
    expect(balanceOfOwner).to.be.equal(
      oldBalanceOfSeller.toString(),
      "full amount should be owned by acc1"
    );

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount)
    ).to.be.revertedWith("NFT not owned by seller");
  });

  it("should fail if original seller does not own enough of the token anymore and the token is bought for ERC155", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);

    let from = seller.address;
    let to = acc1.address;

    let oldBalanceOfSeller = await erc1155Mock.balanceOf(from, tokenId);
    // keep 1 token, but we'll try and buy 2
    oldBalanceOfSeller = oldBalanceOfSeller.sub(1);

    await erc1155Mock
      .connect(seller)
      .safeTransferFrom(from, to, tokenId, oldBalanceOfSeller, "0x");

    let newBalanceOfSeller = await erc1155Mock.balanceOf(from, tokenId);
    expect(newBalanceOfSeller.toString()).to.be.equal(
      "1",
      "seller should have no tokens"
    );

    let balanceOfOwner = await erc1155Mock.balanceOf(to, tokenId);
    expect(balanceOfOwner).to.be.equal(
      oldBalanceOfSeller.toString(),
      "full amount should be owned by acc1"
    );

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount)
    ).to.be.revertedWith("NFT not owned by seller");
  });

  it("should fail if original seller removed approval after listing and token is bought for ERC721", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);

    await erc721Mock
      .connect(seller)
      .setApprovalForAll(multiplace.address, false);

    let appproved = await erc721Mock.isApprovedForAll(
      sellerAddr,
      multiplace.address
    );
    expect(appproved).to.be.equal(
      false,
      "seller should not have approval for multiplace"
    );

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount)
    ).to.be.revertedWith("Marketplace not approved for NFT");
  });
  it("should fail if original seller removed approval after listing and token is bought for ERC1155", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);

    await erc1155Mock
      .connect(seller)
      .setApprovalForAll(multiplace.address, false);

    let appproved = await erc1155Mock.isApprovedForAll(
      sellerAddr,
      multiplace.address
    );
    expect(appproved).to.be.equal(
      false,
      "seller should not have approval for multiplace"
    );

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount)
    ).to.be.revertedWith("Marketplace not approved for NFT");
  });

  it("fails if ERC721 not listed", async () => {
    const NewNFT = await ethers.getContractFactory("ERC721Mock");
    let newNFT = await NewNFT.deploy();
    await newNFT.deployed();

    await newNFT.mint(seller.address);
    tokenId = 0;

    let ownerOfToken = await newNFT.ownerOf(tokenId);
    expect(ownerOfToken).to.be.equal(
      seller.address,
      "token should be owned by seller"
    );

    sellerAddr = seller.address;
    tokenAddr = newNFT.address;
    amount = 1;

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount)
    ).to.be.revertedWith("Token not listed");
  });

  it("fails if ERC1155 not listed", async () => {
    const NewNFT = await ethers.getContractFactory("ERC1155Mock");
    let newNFT = await NewNFT.deploy();
    await newNFT.deployed();

    tokenId = 1;
    amount = 10;
    await newNFT.mint(seller.address, tokenId, amount);

    let sellerAmount = await newNFT.balanceOf(seller.address, tokenId);
    expect(sellerAmount.toString()).to.be.equal(
      amount.toString(),
      "seller should have 10 tokens"
    );

    sellerAddr = seller.address;
    tokenAddr = newNFT.address;

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount)
    ).to.be.revertedWith("Token not listed");
  });

  it.skip("fails if buyer doens't have enough ERC20 balance", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721With2981Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount;
    let totalPrice = ethers.BigNumber.from(amount).mul(listing.unitPrice);

    let buyer1BalanceB4 = await erc20Mock.balanceOf(buyer1.address);

    await erc20Mock.connect(buyer1).transfer(buyer2.address, buyer1BalanceB4);
    // await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    // let buyer1Balance = await erc20Mock.balanceOf(buyer1.address);
    // expect(buyer1Balance.toString()).to.be.equal(
    //   "0",
    //   "buyer should have no tokens"
    // );

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount, {})
    ).to.be.revertedWith("Insufficient balance");
  });
});
