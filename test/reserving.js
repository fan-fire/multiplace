const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  constants, // Common constants, like the zero address and largest integers
  time,
} = require("@openzeppelin/test-helpers");

const {
  NFT_TYPE,
  listingToObject,
  PROTOCOL_FEE_DEN,
  PROTOCOL_FEE_NUM,
  RESERVER_ROLE,
} = require("./utils");

Array.prototype.forEachAsync = async function (fn) {
  for (let t of this) {
    await fn(t);
  }
};

describe("Reserving", async () => {
  let owner;
  let buyer1;
  let buyer2;
  let seller;
  let acc1;
  let acc2;
  let acc3;

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

  it("Default reservedFor is ZERO_ADDERSS and reservedUntil is 0", async () => {
    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);
    listings.forEach((element) => {
      expect(element.reservedUntil).to.be.equal(0);
      expect(element.reservedFor).to.be.equal(constants.ZERO_ADDRESS);
    });
  });

  it("can buy 721 if not reserved", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    expect(listing.reservedUntil).to.be.equal(0);
    expect(listing.reservedFor).to.be.equal(constants.ZERO_ADDRESS);

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

  it("can buy 1155 if not reserved", async () => {
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

    expect(listing.reservedUntil).to.be.equal(0);
    expect(listing.reservedFor).to.be.equal(constants.ZERO_ADDRESS);

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

  it("can buy 721_2981 if not reserved", async () => {
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

    expect(listing.reservedUntil).to.be.equal(0);
    expect(listing.reservedFor).to.be.equal(constants.ZERO_ADDRESS);

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
  it("can buy 1155_2981 if not reserved", async () => {
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

    expect(listing.reservedUntil).to.be.equal(0);
    expect(listing.reservedFor).to.be.equal(constants.ZERO_ADDRESS);

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

  it("Can add RESERVER_ROLE through multiplace", async () => {
    let acc1HasReserverRole = await multiplace.hasRole(
      RESERVER_ROLE,
      acc1.address
    );
    expect(acc1HasReserverRole).to.be.equal(false, "acc1 should not have role");

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let acc1HasReserverRoleAfter = await multiplace.hasRole(
      RESERVER_ROLE,
      acc1.address
    );
    expect(acc1HasReserverRoleAfter).to.be.equal(true, "acc1 should have role");
  });

  it("can't buy 721 if reserved", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = acc2.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString()
    );
    expect(listing.reservedFor).to.be.equal(reservee);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount)
    ).to.be.revertedWith("Token reserved");
  });

  it("can't buy 1155 if reserved", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = acc2.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString()
    );
    expect(listing.reservedFor).to.be.equal(reservee);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount)
    ).to.be.revertedWith("Token reserved");
  });

  it("can't buy 721_2981 if reserved", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721With2981Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = acc2.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString()
    );
    expect(listing.reservedFor).to.be.equal(reservee);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount)
    ).to.be.revertedWith("Token reserved");
  });
  it("can't buy 1155_2981 if reserved", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = acc2.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString()
    );
    expect(listing.reservedFor).to.be.equal(reservee);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount)
    ).to.be.revertedWith("Token reserved");
  });

  it("can't buy partial 1155_2981 if reserved", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = acc2.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString()
    );
    expect(listing.reservedFor).to.be.equal(reservee);

    let amount = listing.amount.sub(1);
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);

    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await expect(
      multiplace.connect(buyer1).buy(sellerAddr, tokenAddr, tokenId, amount)
    ).to.be.revertedWith("Token reserved");
  });

  it("can buy 721 if reserved with reservedFor account", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = buyer1.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString(),
      "reservedUntil"
    );
    expect(listing.reservedFor).to.be.equal(reservee, "reservedFor");

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
  it("can buy 1155 if reserved with reservedFor account", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = buyer1.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString(),
      "reservedUntil"
    );
    expect(listing.reservedFor).to.be.equal(reservee, "reservedFor");

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
  it("can buy 721_2981 if reserved with reservedFor account", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721With2981Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = buyer1.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString(),
      "reservedUntil"
    );
    expect(listing.reservedFor).to.be.equal(reservee, "reservedFor");

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
  it("can buy 1155_2981 if reserved with reservedFor account", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = buyer1.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString(),
      "reservedUntil"
    );
    expect(listing.reservedFor).to.be.equal(reservee, "reservedFor");

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
  it("can buy partial 1155 if reserved with reservedFor account", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = buyer1.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString(),
      "reservedUntil"
    );
    expect(listing.reservedFor).to.be.equal(reservee, "reservedFor");

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

    let isTokenStillInListings = listings.filter(
      (listing) =>
        listing.tokenAddr === tokenAddr &&
        listing.tokenId === tokenId &&
        listing.seller === sellerAddr
    );
    expect(isTokenStillInListings.length.toString()).to.be.equal(
      listing.amount.sub(amount).toString(),
      "left amount should still be in listings"
    );
  });
  it("can buy partial 1155_2981 if reserved with reservedFor account", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = buyer1.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString(),
      "reservedUntil"
    );
    expect(listing.reservedFor).to.be.equal(reservee, "reservedFor");

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

    let isTokenStillInListings = listings.filter(
      (listing) =>
        listing.tokenAddr === tokenAddr &&
        listing.tokenId === tokenId &&
        listing.seller === sellerAddr
    );

    expect(isTokenStillInListings.length.toString()).to.be.equal(
      listing.amount.sub(amount).toString(),
      "left amount should still be in listings"
    );
  });

  it("can buy 721 if reserved with any account if reserve period has passed", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = buyer1.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString(),
      "reservedUntil"
    );
    expect(listing.reservedFor).to.be.equal(reservee, "reservedFor");

    await hre.ethers.provider.send("evm_increaseTime", [period]);
    await network.provider.send("evm_mine"); //Mine to let the increase time take effect on getBlock('latest')
    now = (await ethers.provider.getBlock("latest")).timestamp;

    expect(now.toString()).to.be.equal(
      reservedUntil.toString(),
      "should have moved on to reservedUntil now"
    );

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let buyer2BalanceB4 = await erc20Mock.balanceOf(buyer2.address);
    let paymentToken = listing.paymentToken;
    let protocolFee = totalPrice.mul(PROTOCOL_FEE_NUM).div(PROTOCOL_FEE_DEN);

    expect(buyer2BalanceB4.toString()).to.be.equal(
      ethers.utils.parseEther("10").toString(),
      "buyer2 should have 10 ether of erc20 before purchase"
    );

    expect(paymentToken).to.be.equal(
      erc20Mock.address,
      "payment token should be erc20"
    );

    await erc20Mock.connect(buyer2).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer2)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let buyer2Balance = await erc20Mock.balanceOf(buyer2.address);

    expect(buyer2Balance.toString()).to.be.equal(
      buyer2BalanceB4.sub(totalPrice).toString(),
      "buyer2 should have 10 ether minus the total price of the purchase"
    );

    let ownerOfToken = await erc721Mock.ownerOf(tokenId);
    expect(ownerOfToken).to.be.equal(
      buyer2.address,
      "token should be owned by buyer2"
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

  it("can buy 1155 if reserved with any account if reserve period has passed", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = buyer1.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString(),
      "reservedUntil"
    );
    expect(listing.reservedFor).to.be.equal(reservee, "reservedFor");

    await hre.ethers.provider.send("evm_increaseTime", [period]);
    await network.provider.send("evm_mine"); //Mine to let the increase time take effect on getBlock('latest')
    now = (await ethers.provider.getBlock("latest")).timestamp;

    expect(now.toString()).to.be.equal(
      reservedUntil.toString(),
      "should have moved on to reservedUntil now"
    );

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let buyer2BalanceB4 = await erc20Mock.balanceOf(buyer2.address);
    let paymentToken = listing.paymentToken;
    let protocolFee = totalPrice.mul(PROTOCOL_FEE_NUM).div(PROTOCOL_FEE_DEN);

    await erc20Mock.connect(buyer2).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer2)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let buyer2Balance = await erc20Mock.balanceOf(buyer2.address);

    expect(buyer2Balance.toString()).to.be.equal(
      buyer2BalanceB4.sub(totalPrice).toString(),
      "buyer2 balance should be reduced by totalPrice"
    );

    let numberOfTokensBuyer2 = await erc1155Mock.balanceOf(
      buyer2.address,
      tokenId
    );
    expect(numberOfTokensBuyer2.toString()).to.be.equal(
      amount.toString(),
      "buyer2 should have 2 tokens"
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
  it("can buy 721_2981 if reserved with any account if reserve period has passed", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721With2981Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = buyer1.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString(),
      "reservedUntil"
    );
    expect(listing.reservedFor).to.be.equal(reservee, "reservedFor");

    await hre.ethers.provider.send("evm_increaseTime", [period]);
    await network.provider.send("evm_mine"); //Mine to let the increase time take effect on getBlock('latest')
    now = (await ethers.provider.getBlock("latest")).timestamp;

    expect(now.toString()).to.be.equal(
      reservedUntil.toString(),
      "should have moved on to reservedUntil now"
    );

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let buyer2BalanceB4 = await erc20Mock.balanceOf(buyer2.address);
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
      "royalty receiver should be buyer2"
    );

    expect(unitRoyaltyAmount.toString()).to.be.equal(
      totalRoyalties.toString(),
      "royalty amount should be 10% of totalPrice"
    );

    expect(buyer2BalanceB4.toString()).to.be.equal(
      ethers.utils.parseEther("10").toString(),
      "buyer2 should have 10 ether of erc20 before purchase"
    );

    expect(paymentToken).to.be.equal(
      erc20Mock.address,
      "payment token should be erc20"
    );

    await erc20Mock.connect(buyer2).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer2)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let buyer2Balance = await erc20Mock.balanceOf(buyer2.address);

    expect(buyer2Balance.toString()).to.be.equal(
      buyer2BalanceB4.sub(totalPrice).toString(),
      "buyer2 should have 10 ether minus the total price of the purchase"
    );

    let ownerOfToken = await erc721With2981Mock.ownerOf(tokenId);
    expect(ownerOfToken).to.be.equal(
      buyer2.address,
      "token should be owned by buyer2"
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
  it("can buy 1155_2981 if reserved with any account if reserve period has passed", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = buyer1.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString(),
      "reservedUntil"
    );
    expect(listing.reservedFor).to.be.equal(reservee, "reservedFor");

    await hre.ethers.provider.send("evm_increaseTime", [period]);
    await network.provider.send("evm_mine"); //Mine to let the increase time take effect on getBlock('latest')
    now = (await ethers.provider.getBlock("latest")).timestamp;

    expect(now.toString()).to.be.equal(
      reservedUntil.toString(),
      "should have moved on to reservedUntil now"
    );

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let buyer2BalanceB4 = await erc20Mock.balanceOf(buyer2.address);
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
      "royalty receiver should be buyer2"
    );

    expect(unitRoyaltyAmount.mul(amount).toString()).to.be.equal(
      totalPrice.mul(10).div(100).toString(),
      "royalty amount should be 10% of totalPrice"
    );

    await erc20Mock.connect(buyer2).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer2)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let buyer2Balance = await erc20Mock.balanceOf(buyer2.address);

    expect(buyer2Balance.toString()).to.be.equal(
      buyer2BalanceB4.sub(totalPrice).toString(),
      "buyer2 balance should be reduced by totalPrice"
    );

    let numberOfTokensBuyer2 = await erc1155With2981Mock.balanceOf(
      buyer2.address,
      tokenId
    );
    expect(numberOfTokensBuyer2.toString()).to.be.equal(
      amount.toString(),
      "buyer2 should have 2 tokens"
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
  it("can buy partial 1155 if reserved with any account if reserve period has passed", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = buyer1.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString(),
      "reservedUntil"
    );
    expect(listing.reservedFor).to.be.equal(reservee, "reservedFor");

    await hre.ethers.provider.send("evm_increaseTime", [period]);
    await network.provider.send("evm_mine"); //Mine to let the increase time take effect on getBlock('latest')
    now = (await ethers.provider.getBlock("latest")).timestamp;

    expect(now.toString()).to.be.equal(
      reservedUntil.toString(),
      "should have moved on to reservedUntil now"
    );

    let amount = listing.amount.sub(1);
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let buyer2BalanceB4 = await erc20Mock.balanceOf(buyer2.address);
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
      "royalty receiver should be buyer2"
    );

    expect(unitRoyaltyAmount.mul(amount).toString()).to.be.equal(
      totalPrice.mul(10).div(100).toString(),
      "royalty amount should be 10% of totalPrice"
    );

    await erc20Mock.connect(buyer2).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer2)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let buyer2Balance = await erc20Mock.balanceOf(buyer2.address);

    expect(buyer2Balance.toString()).to.be.equal(
      buyer2BalanceB4.sub(totalPrice).toString(),
      "buyer2 balance should be reduced by totalPrice"
    );

    let numberOfTokensBuyer2 = await erc1155With2981Mock.balanceOf(
      buyer2.address,
      tokenId
    );
    expect(numberOfTokensBuyer2.toString()).to.be.equal(
      amount.toString(),
      "buyer2 should have 2 tokens"
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
    expect(isTokenStillInListings.length.toString()).to.be.equal(
      listing.amount.sub(amount).toString(),
      "left amount should still be in listings"
    );
  });
  it("can buy partial 1155_2981 if reserved with any account if reserve period has passed", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = buyer1.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let now = (await ethers.provider.getBlock("latest")).timestamp;
    let reservedUntil = now + period;

    expect(listing.reservedUntil.toString()).to.be.equal(
      reservedUntil.toString(),
      "reservedUntil"
    );
    expect(listing.reservedFor).to.be.equal(reservee, "reservedFor");

    await hre.ethers.provider.send("evm_increaseTime", [period]);
    await network.provider.send("evm_mine"); //Mine to let the increase time take effect on getBlock('latest')
    now = (await ethers.provider.getBlock("latest")).timestamp;

    expect(now.toString()).to.be.equal(
      reservedUntil.toString(),
      "should have moved on to reservedUntil now"
    );

    let amount = listing.amount.sub(1);
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let buyer2BalanceB4 = await erc20Mock.balanceOf(buyer2.address);
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
      "royalty receiver should be buyer2"
    );

    expect(unitRoyaltyAmount.mul(amount).toString()).to.be.equal(
      totalPrice.mul(10).div(100).toString(),
      "royalty amount should be 10% of totalPrice"
    );

    await erc20Mock.connect(buyer2).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer2)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let buyer2Balance = await erc20Mock.balanceOf(buyer2.address);

    expect(buyer2Balance.toString()).to.be.equal(
      buyer2BalanceB4.sub(totalPrice).toString(),
      "buyer2 balance should be reduced by totalPrice"
    );

    let numberOfTokensBuyer2 = await erc1155With2981Mock.balanceOf(
      buyer2.address,
      tokenId
    );
    expect(numberOfTokensBuyer2.toString()).to.be.equal(
      amount.toString(),
      "buyer2 should have 2 tokens"
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

    expect(isTokenStillInListings.length.toString()).to.be.equal(
      listing.amount.sub(amount).toString(),
      "left amount should still be in listings"
    );
  });

  it("fails if you reserve without the RESERVER_ROLE on Multiplace", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    let acc1HasRole = await multiplace.hasRole(RESERVER_ROLE, acc1.address);
    expect(acc1HasRole).to.be.equal(false, "acc1 should not have role");

    let period = 100;
    let reservee = buyer1.address;

    await expect(
      multiplace
        .connect(acc1)
        .reserve(sellerAddr, tokenAddr, tokenId, period, reservee)
    ).to.be.revertedWith(
      `AccessControl: account ${acc1.address.toLowerCase()} is missing role ${RESERVER_ROLE}`
    );
  });
  it("fails if you reserve directly on Listings", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;
    let period = 100;
    let reservee = buyer1.address;

    let Listings = await ethers.getContractFactory("Listings");
    let listings = await multiplace.listings();
    listings = Listings.attach(listings);

    await expect(
      listings
        .connect(acc1)
        .reserve(sellerAddr, tokenAddr, tokenId, period, reservee)
    ).to.be.revertedWith(`Only owner can call this function`);
  });

  it("can't set period greater than MAX_RESERVE_PERIOD", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    let Listings = await ethers.getContractFactory("Listings");
    let listings = await multiplace.listings();
    listings = Listings.attach(listings);
    let MAX_RESERVE_PERIOD = await listings.MAX_RESERVE_PERIOD();

    expect(MAX_RESERVE_PERIOD.toString()).to.be.equal(
      `${24 * 60 * 60}`,
      "MAX_RESERVE_PERIOD should be 1 day in secondns"
    );

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = MAX_RESERVE_PERIOD;
    let reservee = buyer1.address;

    await expect(
      multiplace
        .connect(acc1)
        .reserve(sellerAddr, tokenAddr, tokenId, period, reservee)
    ).to.be.revertedWith(`Invalid period`);
  });
});
