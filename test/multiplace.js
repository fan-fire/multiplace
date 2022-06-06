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
  it.only("only the seller can unlist 721", async () => {
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
  xit("only the seller can unlist 1155", async () => {});
  xit("can get the correct marketplace balance for a given address", async () => {});
  xit("can pull funds for erc20 correctly", async () => {});
  xit("fails if no pullFunds available", async () => {});
  xit("pullFunds fails if erc20 token not added supported", async () => {});
  xit("pullFunds fail if amount is 0", async () => {});
  xit("can add ERC20 for payment token correctly", async () => {});
  xit("front runner can't withdraw funds", async () => {});
  xit("getListingPointer works as expected", async () => {});
  xit("isListed works as expected", async () => {});
  xit("getListingByPointer works as expected", async () => {});
  xit("can't unlistStale if token is still owned and approved by seller or buyer", async () => {});
  xit("can't unlist if token is reserved", async () => {});
  xit("can unlist if token is not reserved", async () => {});
  xit("can unlist if reserved time has passed", async () => {});
  xit("getReservedState resturns correct state", async () => {});
});
