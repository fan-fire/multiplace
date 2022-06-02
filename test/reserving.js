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

describe("Reserving", async () => {
  let owner;
  let notLister;
  let lister;
  let acc1;
  let acc2;
  let acc3;

  let multiplace;
  let multiplaceProxy;
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

  it("can buy 721 if not reserved", async () => {
    let tokenAddr = erc721Mock.address;
    let tokenId = 0;
  });

  xit("Default reserve is 0", async () => {});

  xit("can buy 1155 if not reserved", async () => {});
  xit("can buy 721_2981 if not reserved", async () => {});
  xit("can buy 1155_2981 if not reserved", async () => {});

  xit("can't buy 721 if reserved", async () => {});
  xit("can't buy 1155 if reserved", async () => {});
  xit("can't buy 721_2981 if reserved", async () => {});
  xit("can't buy 1155_2981 if reserved", async () => {});
  xit("can't buy partial 1155_2981 if reserved", async () => {});

  xit("can buy 721 if reserved with reservedFor account", async () => {});
  xit("can buy 1155 if reserved with reservedFor account", async () => {});
  xit("can buy 721_2981 if reserved with reservedFor account", async () => {});
  xit("can buy 1155_2981 if reserved with reservedFor account", async () => {});
  xit("can buy partial 1155 if reserved with reservedFor account", async () => {});
  xit("can buy partial 1155_2981 if reserved with reservedFor account", async () => {});

  xit("can buy 721 if reserved with any account if reserve period has passed", async () => {});
  xit("can buy 1155 if reserved with any account if reserve period has passed", async () => {});
  xit("can buy 721_2981 if reserved with any account if reserve period has passed", async () => {});
  xit("can buy 1155_2981 if reserved with any account if reserve period has passed", async () => {});
  xit("can buy partial 1155 if reserved with any account if reserve period has passed", async () => {});
  xit("can buy partial 1155_2981 if reserved with any account if reserve period has passed", async () => {});

  xit("fails if you reserve without the rerver role through Multiplace", async () => {});
  xit("fails if you reserve directly on Listings", async () => {});

  xit("can't set period greater than MAX_RESERVE_PERIOD", async () => {});
});
