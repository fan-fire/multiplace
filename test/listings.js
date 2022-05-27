const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  constants, // Common constants, like the zero address and largest integers
} = require("@openzeppelin/test-helpers");

const { NFT_TYPE, listingToObject } = require("./utils");

Array.prototype.forEachAsync = async function (fn) {
  for (let t of this) {
    await fn(t);
  }
};

describe("Listing", async () => {
  let owner;
  let notLister;
  let lister;
  let acc1;
  let acc2;
  let acc3;

  let multiplace;
  let erc1155Mock;
  let erc721Mock;
  let erc20Mock;
  let erc721With2981Mock;
  let erc1155With2981Mock;
  let erc721WithoutOwnerMock;
  let erc1155WithoutOwnerMock;

  beforeEach(async () => {
    [owner, notLister, lister, acc1, acc2, acc3] = await ethers.getSigners();

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
    const NFTLib = await ethers.getContractFactory("NFTLib");
    const nftLib = await NFTLib.deploy();

    const Multiplace = await ethers.getContractFactory("Multiplace", {
      libraries: { NFTLib: nftLib.address },
    });
    multiplace = await Multiplace.deploy();
    await multiplace.deployed();

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
    await erc1155Mock.mint(lister.address, tokenId, amount);
    tokenId = 2;
    amount = 15;
    await erc1155Mock.mint(lister.address, tokenId, amount);

    let ERC1155WithERC2981Mock = await ethers.getContractFactory(
      "ERC1155WithERC2981Mock"
    );
    erc1155With2981Mock = await ERC1155WithERC2981Mock.deploy();
    await erc1155With2981Mock.deployed();
    tokenId = 1;
    amount = 10;
    await erc1155With2981Mock.mint(lister.address, tokenId, amount);
    tokenId = 2;
    amount = 15;
    await erc1155With2981Mock.mint(lister.address, tokenId, amount);

    const ERC1155WithoutOwnerMock = await ethers.getContractFactory(
      "ERC1155WithoutOwnerMock"
    );
    erc1155WithoutOwnerMock = await ERC1155WithoutOwnerMock.deploy();
    await erc1155WithoutOwnerMock.deployed();
    tokenId = 1;
    amount = 10;
    await erc1155WithoutOwnerMock.mint(lister.address, tokenId, amount);
    tokenId = 2;
    amount = 15;
    await erc1155WithoutOwnerMock.mint(lister.address, tokenId, amount);

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
    await erc721Mock.mint(lister.address);
    await erc721Mock.mint(lister.address);
    await erc721Mock.mint(lister.address);
    await erc721Mock.mint(lister.address);

    let ERC721WithERC2981Mock = await ethers.getContractFactory(
      "ERC721WithERC2981Mock"
    );
    erc721With2981Mock = await ERC721WithERC2981Mock.deploy();
    await erc721With2981Mock.deployed();
    await erc721With2981Mock.mint(lister.address);
    await erc721With2981Mock.mint(lister.address);
    await erc721With2981Mock.mint(lister.address);
    await erc721With2981Mock.mint(lister.address);

    let ERC721WithoutOwnerMock = await ethers.getContractFactory(
      "ERC721WithoutOwnerMock"
    );
    erc721WithoutOwnerMock = await ERC721WithoutOwnerMock.deploy();
    await erc721WithoutOwnerMock.deployed();
    await erc721WithoutOwnerMock.mint(lister.address);
    await erc721WithoutOwnerMock.mint(lister.address);
    await erc721WithoutOwnerMock.mint(lister.address);
    await erc721WithoutOwnerMock.mint(lister.address);
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

  it("lister is the owner of 10 tokenId 1s of 1155 without 2981 set up in before each", async () => {
    let tokenId = 1;
    let balanceOfLister = await erc1155Mock.balanceOf(lister.address, tokenId);
    expect(balanceOfLister.toString()).to.be.equal("10");
  });

  it("lister is the owner of 15 tokenId 2s of 1155 without 2981 set up in before each", async () => {
    let tokenId = 2;
    let balanceOfLister = await erc1155Mock.balanceOf(lister.address, tokenId);
    expect(balanceOfLister.toString()).to.be.equal("15");
  });

  it("lister is the owner of 10 tokenId 1s of 1155 with 2981 set up in before each", async () => {
    let tokenId = 1;
    let balanceOfLister = await erc1155With2981Mock.balanceOf(
      lister.address,
      tokenId
    );
    expect(balanceOfLister.toString()).to.be.equal("10");
  });

  it("lister is the owner of 15 tokenId 2s of 1155 with 2981 set up in before each", async () => {
    let tokenId = 2;
    let balanceOfLister = await erc1155With2981Mock.balanceOf(
      lister.address,
      tokenId
    );
    expect(balanceOfLister.toString()).to.be.equal("15");
  });

  it("lister is the owner of 10 tokenId 1s of 1155 without owner set up in before each", async () => {
    let tokenId = 1;
    let balanceOfLister = await erc1155WithoutOwnerMock.balanceOf(
      lister.address,
      tokenId
    );
    expect(balanceOfLister.toString()).to.be.equal("10");
  });

  it("lister is the owner of 15 tokenId 2s of 1155 without owner set up in before each", async () => {
    let tokenId = 2;
    let balanceOfLister = await erc1155WithoutOwnerMock.balanceOf(
      lister.address,
      tokenId
    );
    expect(balanceOfLister.toString()).to.be.equal("15");
  });

  it("lister is the owner of 4 721s without 2981 set up in before each", async () => {
    let ownerOf = await erc721Mock.ownerOf(0);
    expect(ownerOf).to.be.equal(lister.address);
    ownerOf = await erc721Mock.ownerOf(1);
    expect(ownerOf).to.be.equal(lister.address);
    ownerOf = await erc721Mock.ownerOf(2);
    expect(ownerOf).to.be.equal(lister.address);
    ownerOf = await erc721Mock.ownerOf(3);
    expect(ownerOf).to.be.equal(lister.address);
  });

  it("lister is the owner of 4 721s with 2981 set up in before each", async () => {
    let ownerOf = await erc721With2981Mock.ownerOf(0);
    expect(ownerOf).to.be.equal(lister.address);
    ownerOf = await erc721With2981Mock.ownerOf(1);
    expect(ownerOf).to.be.equal(lister.address);
    ownerOf = await erc721With2981Mock.ownerOf(2);
    expect(ownerOf).to.be.equal(lister.address);
    ownerOf = await erc721With2981Mock.ownerOf(3);
    expect(ownerOf).to.be.equal(lister.address);
  });

  it("lister is the owner of 4 721s without owner set up in before each", async () => {
    let ownerOf = await erc721WithoutOwnerMock.ownerOf(0);
    expect(ownerOf).to.be.equal(lister.address);
    ownerOf = await erc721WithoutOwnerMock.ownerOf(1);
    expect(ownerOf).to.be.equal(lister.address);
    ownerOf = await erc721WithoutOwnerMock.ownerOf(2);
    expect(ownerOf).to.be.equal(lister.address);
    ownerOf = await erc721WithoutOwnerMock.ownerOf(3);
    expect(ownerOf).to.be.equal(lister.address);
  });

  /* ========================================================/
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /           Check the fails when listing                   /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /======================================================== */

  it("fails for 721 and 1155 if paymentToken is not in approved ERC20 list", async () => {
    let ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    let erc20 = await ERC20Mock.deploy();
    await erc20.deployed();

    expect(await multiplace.isPaymentToken(erc20.address)).to.be.equal(false);

    let tokenAddr = erc1155Mock.address;
    let tokenId = 1;
    let amount = 5;
    let unitPrice = 10;
    let paymentToken = erc20.address;

    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("Invalid payment token");

    tokenAddr = erc721Mock.address;

    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("Invalid payment token");
  });

  it("fails if NFT does not support 165", async () => {
    let EmptyContractMock = await ethers.getContractFactory(
      "EmptyContractMock"
    );
    let emptyContract = await EmptyContractMock.deploy();
    await emptyContract.deployed();

    let tokenAddr = emptyContract.address;
    let tokenId = 1;
    let amount = 5;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("NFT not ERC165");
  });

  it("fails if nftAddress is not ERC721 or ERC1155, but supports ERC165", async () => {
    let MockThatOnlySupports165 = await ethers.getContractFactory(
      "MockThatOnlySupports165"
    );
    let only165 = await MockThatOnlySupports165.deploy();
    await only165.deployed();

    let tokenAddr = only165.address;
    let tokenId = 1;
    let amount = 5;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("NFT type unknown");
  });

  it("fails if tokenId is not owned by seller for 1155", async () => {
    let tokenAddr = erc1155Mock.address;
    let tokenId = 1;
    let amount = 5;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await expect(
      multiplace
        .connect(notLister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("Sender not owner of amount");
  });

  it("fails if tokenId is not owned by seller for 721", async () => {
    let tokenAddr = erc721Mock.address;
    let tokenId = 1;
    let amount = 5;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await expect(
      multiplace
        .connect(notLister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("Sender not owner");
  });

  it("fails if tokenId of ERC721 is not approved for all by seller", async () => {
    let tokenAddr = erc721Mock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    let isApprovedForAll = await erc721Mock
      .connect(lister)
      .isApprovedForAll(lister.address, multiplace.address);
    expect(isApprovedForAll).to.be.equal(false);

    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("Marketplace not approved for ERC721");
  });

  it("fails if tokenId of ERC1155 is not approved for all by seller", async () => {
    let tokenAddr = erc1155Mock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    let isApprovedForAll = await erc1155Mock
      .connect(lister)
      .isApprovedForAll(lister.address, multiplace.address);
    expect(isApprovedForAll).to.be.equal(false);

    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("Marketplace not approved for ERC1155");
  });

  it("fails if price is 0 for ERC721", async () => {
    let tokenAddr = erc721Mock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 0;
    let paymentToken = erc20Mock.address;

    await erc721Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("Invalid price");
  });
  it("fails if price is 0 for ERC1155", async () => {
    let tokenAddr = erc1155Mock.address;
    let tokenId = 1;
    let amount = 5;
    let unitPrice = 0;
    let paymentToken = erc20Mock.address;

    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("Invalid price");
  });

  /* ========================================================/
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /           Check all the listing variations               /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /                                                          /
  /======================================================== */

  it("Can't list if amount is 0", async () => {
    let tokenAddr = erc721Mock.address;
    let tokenId = 1;
    let amount = 0;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc721Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("Invalid amount");
  });
  it("Can list ERC1155 with ERC2981", async () => {
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 1;
    let amount = 5;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc1155With2981Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc1155With2981Mock.address,
        tokenId: tokenId,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155_2981,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);
  });

  it("Can list ERC721 with ERC2981", async () => {
    let tokenAddr = erc721With2981Mock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc721With2981Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc721With2981Mock.address,
        tokenId: tokenId,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721_2981,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);
  });

  it("Can't list the same erc721 token twice", async () => {
    let tokenAddr = erc721With2981Mock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc721With2981Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("NFT already listed by sender");
  });

  it("Can't list 5 tokenId 1s then another 5 tokenId 1s", async () => {
    let tokenAddr = erc1155Mock.address;
    let tokenId = 1;
    let amount = 5;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc1155Mock.address,
        tokenId: tokenId,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);

    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("NFT already listed by sender");
  });

  it("Can't list a 1155 tokenId owned by lister from another account even if that account has been approved", async () => {
    let tokenId = 1;
    let amount = 5;

    let listerAmount = await erc1155Mock.balanceOf(lister.address, tokenId);

    expect(listerAmount).to.be.equal(10);

    let tokenAddr = erc1155Mock.address;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(notLister.address, true);
    await erc1155Mock
      .connect(notLister)
      .setApprovalForAll(multiplace.address, true);

    await expect(
      multiplace
        .connect(notLister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("Sender not owner of amount");
  });

  it("Can't list a 1155 tokenId owned by lister from 2 different listers, even if the other party has spending approval", async () => {
    let tokenId = 1;
    let amount = 5;

    let listerAmount = await erc1155Mock.balanceOf(lister.address, tokenId);

    expect(listerAmount).to.be.equal(10);

    let tokenAddr = erc1155Mock.address;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);
    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(notLister.address, true);
    await erc1155Mock
      .connect(notLister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc1155Mock.address,
        tokenId: tokenId,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);

    await expect(
      multiplace
        .connect(notLister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("Sender not owner of amount");
  });

  it("allListings updated correctly if 3 ERC721 tokenIds are listed from the same lister ", async () => {
    let tokenAddr = erc721Mock.address;
    let tokenId = 0;
    let amount = 5; //this doesn't matter - it will default to amount=1 in the contract for ERC721
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc721Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc721Mock.address,
        tokenId: 0,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);

    tokenId = 1;

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc721Mock.address,
        tokenId: 0,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 1,
        tokenAddr: erc721Mock.address,
        tokenId: 1,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);

    tokenId = 2;

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc721Mock.address,
        tokenId: 0,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 1,
        tokenAddr: erc721Mock.address,
        tokenId: 1,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 2,
        tokenAddr: erc721Mock.address,
        tokenId: 2,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);
  });

  it("allListings updated correctly if 3 ERC721 tokenIds are listed each from a different lister ", async () => {
    let from = lister.address;
    let to = acc1.address;
    let tokenId = 0;
    await erc721Mock
      .connect(lister)
      ["safeTransferFrom(address,address,uint256)"](from, to, tokenId);
    let onwerOf0 = await erc721Mock.ownerOf(tokenId);
    expect(onwerOf0).to.be.equal(to);

    to = acc2.address;
    tokenId = 1;
    await erc721Mock
      .connect(lister)
      ["safeTransferFrom(address,address,uint256)"](from, to, tokenId);
    let onwerOf1 = await erc721Mock.ownerOf(tokenId);
    expect(onwerOf1).to.be.equal(to);

    to = acc3.address;
    tokenId = 2;
    await erc721Mock
      .connect(lister)
      ["safeTransferFrom(address,address,uint256)"](from, to, tokenId);
    let onwerOf2 = await erc721Mock.ownerOf(tokenId);
    expect(onwerOf2).to.be.equal(to);

    let tokenIds = [0, 1, 2];
    let accounts = [acc1, acc2, acc3];

    await accounts.forEachAsync(async (account) => {
      await erc721Mock
        .connect(account)
        .setApprovalForAll(multiplace.address, true);
    });

    let tokenAddr = erc721Mock.address;
    let amount = 1;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;
    let indx = 0;
    await tokenIds.forEachAsync(async (tokenId) => {
      const acc = accounts[indx];
      await multiplace
        .connect(acc)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);
      indx += 1;
    });

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc721Mock.address,
        tokenId: 0,
        seller: acc1.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 1,
        tokenAddr: erc721Mock.address,
        tokenId: 1,
        seller: acc2.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 2,
        tokenAddr: erc721Mock.address,
        tokenId: 2,
        seller: acc3.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);
  });

  it("allListings updated correctly if 4 ERC721 items are listed, 2 from seller 1, 2 from seller 2", async () => {
    let from = lister.address;
    let accounts = [acc1, acc1, acc2, acc2];
    let tokenIds = [0, 1, 2, 3];
    let indx = 0;

    await tokenIds.forEachAsync(async (tokenId) => {
      let account = accounts[indx];
      let to = account.address;
      await erc721Mock
        .connect(lister)
        ["safeTransferFrom(address,address,uint256)"](from, to, tokenId);
      let owner = await erc721Mock.ownerOf(tokenId);
      expect(owner).to.be.equal(to);
      indx += 1;

      await erc721Mock
        .connect(account)
        .setApprovalForAll(multiplace.address, true);
    });

    let tokenAddr = erc721Mock.address;
    let amount = 1;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;
    indx = 0;
    accounts = [acc1, acc2, acc1, acc2];
    tokenIds = [0, 2, 1, 3];
    await tokenIds.forEachAsync(async (tokenId) => {
      const acc = accounts[indx];
      await multiplace
        .connect(acc)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);
      indx += 1;
    });

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);
    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc721Mock.address,
        tokenId: 0,
        seller: acc1.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 1,
        tokenAddr: erc721Mock.address,
        tokenId: 2,
        seller: acc2.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 2,
        tokenAddr: erc721Mock.address,
        tokenId: 1,
        seller: acc1.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 3,
        tokenAddr: erc721Mock.address,
        tokenId: 3,
        seller: acc2.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);
  });

  it("allListings updated correctly if 2 different ERC1155 tokens are listed by the same lister", async () => {
    let tokenAddr = erc1155Mock.address;
    let tokenId = 1;
    let amount = 2;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);
    tokenId = 2;
    amount = 3;
    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc1155Mock.address,
        tokenId: 1,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: 2,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 1,
        tokenAddr: erc1155Mock.address,
        tokenId: 2,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: 3,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);
  });

  it("allListings updated correctly if 2 ERC1155 with same tokenIds from different listers", async () => {
    let from = lister.address;
    let to = notLister.address;
    let tokenId = 1;
    let amount = 5;
    let data = "0x";

    await erc1155Mock
      .connect(lister)
      .safeTransferFrom(from, to, tokenId, amount, data);

    let listerAmount = await erc1155Mock.balanceOf(lister.address, tokenId);
    let notListerAmount = await erc1155Mock.balanceOf(
      notLister.address,
      tokenId
    );

    expect(listerAmount).to.be.equal(5);
    expect(notListerAmount).to.be.equal(5);

    let tokenAddr = erc1155Mock.address;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);
    await erc1155Mock
      .connect(notLister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    await multiplace
      .connect(notLister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc1155Mock.address,
        tokenId: tokenId,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 1,
        tokenAddr: erc1155Mock.address,
        tokenId: tokenId,
        seller: notLister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);
  });

  it("allListings update correctly if 2 ERC71s are listed and 2 ERC115S are listed", async () => {
    let tokenAddr = erc1155Mock.address;
    let tokenId = 1;
    let amount = 2;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await erc721Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);
    tokenAddr = erc721Mock.address;

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    tokenAddr = erc1155Mock.address;
    tokenId = 2;
    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);
    tokenAddr = erc721Mock.address;
    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc1155Mock.address,
        tokenId: 1,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 1,
        tokenAddr: erc721Mock.address,
        tokenId: 1,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 2,
        tokenAddr: erc1155Mock.address,
        tokenId: 2,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
      {
        listPtr: 3,
        tokenAddr: erc721Mock.address,
        tokenId: 2,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: 1,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);
  });

  /* =======================================================/
    /                                                         / 
    /                                                         / 
    /                                                         / 
    /                                                         / 
    /                   Unlisting Variiations                 /
    /                                                         / 
    /                                                         / 
    /                                                         / 
    /                                                         / 
    /                                                         / 
    /======================================================= */

  it("Can unlist an ERC721 token", async () => {
    let tokenAddr = erc721Mock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc721Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc721Mock.address,
        tokenId: 1,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);

    await multiplace.connect(lister).unlist(tokenAddr, tokenId);

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings).to.be.deep.equal([]);
  });

  it("Can unlist an ERC1155 token", async () => {
    let tokenAddr = erc1155Mock.address;
    let tokenId = 1;
    let amount = 10;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc1155Mock.address,
        tokenId: 1,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);

    await multiplace.connect(lister).unlist(tokenAddr, tokenId);

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expect(listings).to.be.deep.equal([]);
  });

  it("Can't unlist 721 if you are not the lister", async () => {
    let tokenAddr = erc721Mock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc721Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    await expect(
      multiplace.connect(notLister).unlist(tokenAddr, tokenId)
    ).to.be.revertedWith("NFT not listed for sender");

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc721Mock.address,
        tokenId: 1,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC721,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);
  });

  it("Can't unlist 1155 if you are not the lister", async () => {
    let tokenAddr = erc1155Mock.address;
    let tokenId = 1;
    let amount = 10;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    await expect(
      multiplace.connect(notLister).unlist(tokenAddr, tokenId)
    ).to.be.revertedWith("NFT not listed for sender");

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc1155Mock.address,
        tokenId: 1,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);
  });

  it("Can't unlist if the 721 token is not listed", async () => {
    let tokenAddr = erc721Mock.address;
    let tokenId = 1;
    await expect(
      multiplace.connect(notLister).unlist(tokenAddr, tokenId)
    ).to.be.revertedWith("NFT not listed for sender");
  });
  it("Can't unlist if the 1155 token is not listed", async () => {
    let tokenAddr = erc1155Mock.address;
    let tokenId = 1;
    await expect(
      multiplace.connect(notLister).unlist(tokenAddr, tokenId)
    ).to.be.revertedWith("NFT not listed for sender");
  });

  it("lister can list 5 tokenId 1s then another 5 tokenId 1s (making 10) if the first 5 are unlisted first", async () => {
    let tokenAddr = erc1155Mock.address;
    let tokenId = 1;
    let amount = 5;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc1155Mock.address,
        tokenId: 1,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);

    await expect(
      multiplace
        .connect(lister)
        .list(tokenAddr, tokenId, amount, unitPrice, paymentToken)
    ).to.be.revertedWith("NFT already listed by sender");

    await multiplace.connect(lister).unlist(tokenAddr, tokenId);

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expectedListings = [];

    expect(listings).to.be.deep.equal(expectedListings);

    amount = 10;
    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    listings = await multiplace.getAllListings();
    listings = listings.map(listingToObject);

    expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc1155Mock.address,
        tokenId: 1,
        seller: lister.address,
        unitPrice: unitPrice,
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(listings).to.be.deep.equal(expectedListings);
  });

  /* ========================================================/
  /                                                          / 
  /                                                          / 
  /                                                          /
  /                                                          / 
  /                                                          /  
  /                  Check rolayties check out               /
  /                                                          / 
  /                                                          / 
  /                                                          / 
  /                                                          / 
  /                                                          / 
  /======================================================== */

  it("Royalties are correctly set for ERC721 if listing supports ERC2981", async () => {
    let tokenAddr = erc721With2981Mock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 10;
    let royaltyPercentage = 10; //Set in mock
    let paymentToken = erc20Mock.address;

    let royaltyFrom721 = await erc721With2981Mock.royaltyInfo(
      tokenId,
      unitPrice
    );
    let royaltyAmountFrom721 = royaltyFrom721.royaltyAmount;
    let receiverFrom721 = royaltyFrom721.receiver;

    expect(royaltyAmountFrom721).to.be.equal(unitPrice / royaltyPercentage);
    expect(receiverFrom721).to.be.equal(owner.address);

    await erc721With2981Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let royaltyFromMultiplace = await multiplace.getRoyalties(
      lister.address,
      tokenAddr,
      tokenId
    );
    let royaltyAmountFromMultiplace = royaltyFromMultiplace.royaltyAmount;
    let receiverFromMultiplace = royaltyFromMultiplace.receiver;

    expect(royaltyAmountFromMultiplace).to.be.equal(royaltyAmountFrom721);
    expect(receiverFromMultiplace).to.be.equal(receiverFrom721);
  });
  it("Royalties are correctly set for ERC1155 if listing supports ERC2981", async () => {
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 10;
    let royaltyPercentage = 10; //Set in mock
    let paymentToken = erc20Mock.address;

    let royaltyFrom1155 = await erc1155With2981Mock.royaltyInfo(
      tokenId,
      unitPrice
    );
    let royaltyAmountFrom1155 = royaltyFrom1155.royaltyAmount;
    let receiverFrom1155 = royaltyFrom1155.receiver;

    expect(royaltyAmountFrom1155).to.be.equal(unitPrice / royaltyPercentage);
    expect(receiverFrom1155).to.be.equal(owner.address);

    await erc1155With2981Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let royaltyFromMultiplace = await multiplace.getRoyalties(
      lister.address,
      tokenAddr,
      tokenId
    );
    let royaltyAmountFromMultiplace = royaltyFromMultiplace.royaltyAmount;
    let receiverFromMultiplace = royaltyFromMultiplace.receiver;

    expect(royaltyAmountFromMultiplace).to.be.equal(royaltyAmountFrom1155);
    expect(receiverFromMultiplace).to.be.equal(receiverFrom1155);
  });

  it("Royalties are correctly set if listing does not support ERC2981, but ERC721 has owner", async () => {
    let tokenAddr = erc721Mock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc721Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let royaltyFromMultiplace = await multiplace.getRoyalties(
      lister.address,
      tokenAddr,
      tokenId
    );
    let royaltyAmountFromMultiplace = royaltyFromMultiplace.royaltyAmount;
    let receiverFromMultiplace = royaltyFromMultiplace.receiver;

    expect(royaltyAmountFromMultiplace).to.be.equal(0);
    expect(receiverFromMultiplace).to.be.equal(owner.address);
  });

  it("Royalties are correctly set if listing does not support ERC2981, but ERC1155 has owner", async () => {
    let tokenAddr = erc1155Mock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let royaltyFromMultiplace = await multiplace.getRoyalties(
      lister.address,
      tokenAddr,
      tokenId
    );
    let royaltyAmountFromMultiplace = royaltyFromMultiplace.royaltyAmount;
    let receiverFromMultiplace = royaltyFromMultiplace.receiver;

    expect(royaltyAmountFromMultiplace).to.be.equal(0);
    expect(receiverFromMultiplace).to.be.equal(owner.address);
  });
  it("Royalties are correctly set if listing does not support ERC2981 and ERC721 does not have an owner", async () => {
    let tokenAddr = erc721WithoutOwnerMock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc721WithoutOwnerMock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let royaltyFromMultiplace = await multiplace.getRoyalties(
      lister.address,
      tokenAddr,
      tokenId
    );
    let royaltyAmountFromMultiplace = royaltyFromMultiplace.royaltyAmount;
    let receiverFromMultiplace = royaltyFromMultiplace.receiver;

    expect(royaltyAmountFromMultiplace).to.be.equal(0);
    expect(receiverFromMultiplace).to.be.equal(constants.ZERO_ADDRESS);
  });
  it("Royalties are correctly set if listing does not support ERC2981 and ERC1155 does not have an owner", async () => {
    let tokenAddr = erc1155WithoutOwnerMock.address;
    let tokenId = 1;
    let amount = 1;
    let unitPrice = 10;
    let paymentToken = erc20Mock.address;

    await erc1155WithoutOwnerMock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let royaltyFromMultiplace = await multiplace.getRoyalties(
      lister.address,
      tokenAddr,
      tokenId
    );
    let royaltyAmountFromMultiplace = royaltyFromMultiplace.royaltyAmount;
    let receiverFromMultiplace = royaltyFromMultiplace.receiver;

    expect(royaltyAmountFromMultiplace).to.be.equal(0);
    expect(receiverFromMultiplace).to.be.equal(constants.ZERO_ADDRESS);
  });
});
