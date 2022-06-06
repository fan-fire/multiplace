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
  DEFAULT_ADMIN_ROLE,
  RESERVER_ROLE,
} = require("./utils");

Array.prototype.forEachAsync = async function (fn) {
  for (let t of this) {
    await fn(t);
  }
};

describe("Multiplace", async () => {
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
  it("can't list 0x00 address for payment token", async () => {
    await expect(
      multiplace.connect(owner).addPaymentToken(constants.ZERO_ADDRESS)
    ).to.be.revertedWith("0x00 not allowed");
  });
  it("only the seller can unlist 721", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);
    listing = listingToObject(listing);

    expect(listing.tokenAddr).to.be.equal(tokenAddr);
    expect(listing.tokenId).to.be.equal(tokenId);
    expect(listing.seller).to.be.equal(sellerAddr);

    await expect(
      multiplace.connect(acc1).unlist(tokenAddr, tokenId)
    ).to.be.revertedWith("Token not listed for msg.sender");

    await multiplace.connect(seller).unlist(tokenAddr, tokenId);

    await expect(
      multiplace.getListing(sellerAddr, tokenAddr, tokenId)
    ).to.be.revertedWith("Token not listed");
  });
  it("only the seller can unlist 1155", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);
    listing = listingToObject(listing);

    expect(listing.tokenAddr).to.be.equal(tokenAddr);
    expect(listing.tokenId).to.be.equal(tokenId);
    expect(listing.seller).to.be.equal(sellerAddr);

    await expect(
      multiplace.connect(acc1).unlist(tokenAddr, tokenId)
    ).to.be.revertedWith("Token not listed for msg.sender");

    await multiplace.connect(seller).unlist(tokenAddr, tokenId);

    await expect(
      multiplace.getListing(sellerAddr, tokenAddr, tokenId)
    ).to.be.revertedWith("Token not listed");
  });
  it("can get the correct marketplace balance for a given address", async () => {
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
  });
  it("can pull funds for erc20 correctly", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721With2981Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount;
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);
    let paymentToken = listing.paymentToken;

    let ownerBalanceBefore = await erc20Mock.balanceOf(owner.address);
    await erc20Mock.connect(buyer1).approve(multiplace.address, totalPrice);

    await multiplace
      .connect(buyer1)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let ownerBalance = await multiplace.getBalance(paymentToken, owner.address);
    await multiplace.connect(owner).pullFunds(paymentToken, ownerBalance);
    let ownerBalanceERC20 = await erc20Mock.balanceOf(owner.address);
    expect(ownerBalanceERC20.toString()).to.be.equal(
      ownerBalance.add(ownerBalanceBefore).toString(),
      "owner should have the correct balance"
    );

    let sellerMarketplaceBalance = await multiplace.getBalance(
      paymentToken,
      sellerAddr
    );
    await multiplace
      .connect(seller)
      .pullFunds(paymentToken, sellerMarketplaceBalance);
    let sellerBalanceERC20 = await erc20Mock.balanceOf(seller.address);
    expect(sellerBalanceERC20.toString()).to.be.equal(
      sellerMarketplaceBalance.toString(),
      "seller should have the correct balance"
    );
  });
  it("fails if no pullFunds available", async () => {
    let paymentToken = erc20Mock.address;
    let randomAccountBalance = await multiplace.getBalance(
      paymentToken,
      acc1.address
    );

    expect(randomAccountBalance.toString()).to.be.equal(
      "0",
      "random account should have no balance"
    );

    await expect(
      multiplace.connect(acc1).pullFunds(paymentToken, 1)
    ).to.be.revertedWith("Insufficient funds");
  });
  it("pullFunds fails if erc20 token not added supported", async () => {
    let paymentToken = acc1.address;
    await expect(
      multiplace.connect(acc1).pullFunds(paymentToken, 1)
    ).to.be.revertedWith("Payment token not supported");
  });
  it("pullFunds fail if amount is 0", async () => {
    let paymentToken = erc20Mock.address;
    let amount = 0;
    await expect(
      multiplace.connect(acc1).pullFunds(paymentToken, amount)
    ).to.be.revertedWith("Invalid amount");
  });

  it("getListingPointer works as expected", async () => {
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

    await expectedListings.forEachAsync(async (listing) => {
      let tokenAddr = listing["tokenAddr"];
      let tokenId = listing["tokenId"];
      let seller = listing["seller"];
      let lstPtr = await multiplace.getListingPointer(
        seller,
        tokenAddr,
        tokenId
      );
      expect(lstPtr.toString()).to.be.equal(listing["listPtr"].toString());
    });
  });

  it("getListingPointer fails if token not listed", async () => {
    let tokenAddr = acc1.address;
    let tokenId = 0;
    let sellerAddr = seller.address;
    await expect(
      multiplace.getListingPointer(sellerAddr, tokenAddr, tokenId)
    ).to.be.revertedWith("Token not listed");
  });

  it("isListed works as expected", async () => {
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

    await expectedListings.forEachAsync(async (listing) => {
      let tokenAddr = listing["tokenAddr"];
      let tokenId = listing["tokenId"];
      let sellerAddr = listing["seller"];
      let isListed = await multiplace.isListed(sellerAddr, tokenAddr, tokenId);
      expect(isListed).to.be.equal(true);
      await multiplace.connect(seller).unlist(tokenAddr, tokenId);
      isListed = await multiplace.isListed(sellerAddr, tokenAddr, tokenId);
      expect(isListed).to.be.equal(false);
    });
  });
  it("getListingByPointer works as expected", async () => {
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

    await expectedListings.forEachAsync(async (listing) => {
      let listPtr = listing["listPtr"];
      let listingFromContract = await multiplace.getListingByPointer(listPtr);

      expect(listingFromContract.tokenAddr).to.be.equal(listing["tokenAddr"]);
      expect(listingFromContract.tokenId).to.be.equal(listing["tokenId"]);
      expect(listingFromContract.seller).to.be.equal(listing["seller"]);
      expect(listingFromContract.unitPrice).to.be.equal(listing["unitPrice"]);
      expect(listingFromContract.amount).to.be.equal(listing["amount"]);
      expect(listingFromContract.paymentToken).to.be.equal(
        listing["paymentToken"]
      );
      expect(listingFromContract.nftType).to.be.equal(listing["nftType"]);
      expect(listingFromContract.reservedUntil).to.be.equal(
        listing["reservedUntil"]
      );
      expect(listingFromContract.reservedFor).to.be.equal(
        listing["reservedFor"]
      );
    });
  });

  it("getListingByPointer fails if pointer does not exist", async () => {
    await expect(multiplace.getListingByPointer(100)).to.be.revertedWith(
      "Invalid listing pointer"
    );
  });

  it("can't unlistStale if token is still owned and approved by seller or buyer", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721Mock.address;
    let tokenId = 2;

    let isStillApproved = await erc721Mock.isApprovedForAll(
      seller.address,
      multiplace.address
    );
    expect(isStillApproved).to.be.equal(true);

    let stillOwner = await erc721Mock.ownerOf(tokenId);
    expect(stillOwner).to.be.equal(seller.address);

    multiplace.unlistStale(sellerAddr, tokenAddr, tokenId);

    let stillListed = await multiplace.isListed(sellerAddr, tokenAddr, tokenId);
    expect(stillListed).to.be.equal(true);
  });

  it("can unlistStale if token if not approved anymore", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721Mock.address;
    let tokenId = 2;
    await erc721Mock
      .connect(seller)
      .setApprovalForAll(multiplace.address, false);
    let isStillApproved = await erc721Mock.isApprovedForAll(
      seller.address,
      multiplace.address
    );
    expect(isStillApproved).to.be.equal(false);

    await multiplace.unlistStale(sellerAddr, tokenAddr, tokenId);

    let stillListed = await multiplace.isListed(sellerAddr, tokenAddr, tokenId);
    expect(stillListed).to.be.equal(false);
  });
  it("can unlistStale if token is not owned by seller anymore", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721Mock.address;
    let tokenId = 2;

    await erc721Mock
      .connect(seller)
      ["safeTransferFrom(address,address,uint256)"](
        seller.address,
        acc1.address,
        tokenId
      );
    let stillOwner = await erc721Mock.ownerOf(tokenId);
    expect(stillOwner).to.be.equal(acc1.address);

    await multiplace.unlistStale(sellerAddr, tokenAddr, tokenId);

    let stillListed = await multiplace.isListed(sellerAddr, tokenAddr, tokenId);
    expect(stillListed).to.be.equal(false);
  });
  it("can't unlist if token is reserved", async () => {
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

    await expect(
      multiplace.connect(seller).unlist(tokenAddr, tokenId)
    ).to.be.revertedWith("Token reserved");
  });

  it("can unlist if reserved time has passed", async () => {
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

    await hre.ethers.provider.send("evm_increaseTime", [period]);
    await network.provider.send("evm_mine"); //Mine to let the increase time take effect on getBlock('latest')

    await multiplace.connect(seller).unlist(tokenAddr, tokenId);
  });
  it("getReservedState resturns correct state", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc721Mock.address;
    let tokenId = 2;

    let reservedState = await multiplace.getReservedState(
      sellerAddr,
      tokenAddr,
      tokenId
    );

    var { reservedFor, reservedUntil } = reservedState;
    expect(reservedFor).to.be.equal(constants.ZERO_ADDRESS);
    expect(reservedUntil.toString()).to.be.equal("0");

    await multiplace.grantRole(RESERVER_ROLE, acc1.address);

    let period = 100;
    let reservee = acc2.address;

    await multiplace
      .connect(acc1)
      .reserve(sellerAddr, tokenAddr, tokenId, period, reservee);
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    let expectedReservedUntil = now + period;

    reservedState = await multiplace.getReservedState(
      sellerAddr,
      tokenAddr,
      tokenId
    );

    var { reservedFor, reservedUntil } = reservedState;
    expect(reservedFor).to.be.equal(reservee);
    expect(reservedUntil.toString()).to.be.equal(
      expectedReservedUntil.toString()
    );
  });
  it("Listing is unlisted if 1 amount of 1155 is bought, then another 1 depleting listing amount", async () => {
    let sellerAddr = seller.address;
    let tokenAddr = erc1155With2981Mock.address;
    let tokenId = 2;

    let listing = await multiplace.getListing(sellerAddr, tokenAddr, tokenId);

    let amount = listing.amount.sub(1);
    let unitPrice = listing.unitPrice;
    let totalPrice = ethers.BigNumber.from(amount).mul(unitPrice);

    await erc20Mock
      .connect(buyer1)
      .approve(multiplace.address, totalPrice.mul(2));

    await multiplace
      .connect(buyer1)
      .buy(sellerAddr, tokenAddr, tokenId, amount);

    let isListed = await multiplace.isListed(sellerAddr, tokenAddr, tokenId);
    expect(isListed).to.be.equal(true);

    let listingAfter = await multiplace.getListing(
      sellerAddr,
      tokenAddr,
      tokenId
    );
    expect(listingAfter.amount.toString()).to.be.equal("1");

    await multiplace
      .connect(buyer1)
      .buy(sellerAddr, tokenAddr, tokenId, amount);
    isListed = await multiplace.isListed(sellerAddr, tokenAddr, tokenId);
    expect(isListed).to.be.equal(false);
  });
  xit("front runner can't withdraw funds", async () => {});
});
