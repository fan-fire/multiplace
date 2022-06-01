const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  constants, // Common constants, like the zero address and largest integers
} = require("@openzeppelin/test-helpers");

const {
  NFT_TYPE,
  listingToObject,
  DEFAULT_ADMIN_ROLE,
  ADMIN_ROLE,
} = require("./utils");

Array.prototype.forEachAsync = async function (fn) {
  for (let t of this) {
    await fn(t);
  }
};

describe("Architecture", async () => {
  it("Can deploy listings", async () => {
    let [owner] = await ethers.getSigners();
    const Listings = await ethers.getContractFactory("Listings");
    let listings = await Listings.deploy();
    await listings.deployed();

    let listingsOwner = await listings.owner();
    expect(listingsOwner).to.equal(owner.address);
  });

  it("Can deploy admin", async () => {
    let [owner] = await ethers.getSigners();
    const Admin = await ethers.getContractFactory("Admin");
    let admin = await Admin.deploy();
    await admin.deployed();

    let adminOwner = await admin.owner();
    expect(adminOwner).to.equal(owner.address);
  });

  it("Can deploy multiplace", async () => {
    let [owner] = await ethers.getSigners();

    const Multiplace = await ethers.getContractFactory("Multiplace");
    let multiplace = await Multiplace.deploy();
    await multiplace.deployed();

    let hasAdmin = await multiplace.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
    expect(hasAdmin).to.equal(true);
  });

  it("Can deploy proxy", async () => {
    let [owner] = await ethers.getSigners();

    const Multiplace = await ethers.getContractFactory("Multiplace");
    let multiplace = await Multiplace.deploy();
    await multiplace.deployed();

    const MultiplaceProxy = await ethers.getContractFactory("MultiplaceProxy");
    multiplaceProxy = await MultiplaceProxy.deploy(multiplace.address);
    await multiplaceProxy.deployed();

    let hasAdmin = await multiplaceProxy.hasRole(
      DEFAULT_ADMIN_ROLE,
      owner.address
    );
    expect(hasAdmin).to.be.true;

    let currentMarketplaceAddress = await multiplaceProxy.currentMarketplace();
    expect(currentMarketplaceAddress).to.equal(multiplace.address);
  });

  it("Can get listings from marketplace via proxy", async () => {
    const Multiplace = await ethers.getContractFactory("Multiplace");
    let multiplace = await Multiplace.deploy();
    await multiplace.deployed();

    const MultiplaceProxy = await ethers.getContractFactory("MultiplaceProxy");
    multiplaceProxy = await MultiplaceProxy.deploy(multiplace.address);
    await multiplaceProxy.deployed();

    multiplace = await Multiplace.attach(multiplaceProxy.address);

    listings = await multiplace.getAllListings();

    expect(listings.length).to.equal(0);
    expect(listings).to.be.an("array");
    expect(listings).to.be.empty;
  });

  it("Can add paymentToken via proxy", async () => {
    let [owner] = await ethers.getSigners();

    const Multiplace = await ethers.getContractFactory("Multiplace");
    let multiplace = await Multiplace.deploy();
    await multiplace.deployed();

    const MultiplaceProxy = await ethers.getContractFactory("MultiplaceProxy");
    multiplaceProxy = await MultiplaceProxy.deploy(multiplace.address);
    await multiplaceProxy.deployed();

    multiplace = await Multiplace.attach(multiplaceProxy.address);

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    let paymentToken = await ERC20Mock.deploy();
    await paymentToken.deployed();

    await multiplace.connect(owner).addPaymentToken(paymentToken.address);

    let isPaymentToken = await multiplace.isPaymentToken(paymentToken.address);
    expect(isPaymentToken).to.be.true;
  });

  it("Can list a token via proxy", async () => {
    let [owner, lister] = await ethers.getSigners();

    const Multiplace = await ethers.getContractFactory("Multiplace");
    let multiplace = await Multiplace.deploy();
    await multiplace.deployed();

    const MultiplaceProxy = await ethers.getContractFactory("MultiplaceProxy");
    multiplaceProxy = await MultiplaceProxy.deploy(multiplace.address);
    await multiplaceProxy.deployed();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    let erc20Mock = await ERC20Mock.deploy();
    await erc20Mock.deployed();

    multiplace = await Multiplace.attach(multiplaceProxy.address);

    await multiplace.connect(owner).addPaymentToken(erc20Mock.address);

    let tokenId;
    let amount;

    const ERC1155Mock = await ethers.getContractFactory("ERC1155Mock");
    erc1155Mock = await ERC1155Mock.deploy();
    await erc1155Mock.deployed();
    tokenId = 1;
    amount = 10;
    await erc1155Mock.connect(lister).mint(lister.address, tokenId, amount);
    await erc1155Mock
      .connect(lister)
      .setApprovalForAll(multiplace.address, true);

    let tokenAddr = erc1155Mock.address;
    tokenId = 1;
    amount = 5;
    let unitPrice = 10;
    paymentToken = erc20Mock.address;

    await multiplace
      .connect(lister)
      .list(tokenAddr, tokenId, amount, unitPrice, paymentToken);

    let allListings = await multiplace.getAllListings();
    allListings = allListings.map(listingToObject);

    let expectedListings = [
      {
        listPtr: 0,
        tokenAddr: erc1155Mock.address,
        tokenId: tokenId,
        seller: lister.address,
        unitPrice: unitPrice.toString(),
        amount: amount,
        paymentToken: paymentToken,
        nftType: NFT_TYPE.ERC1155,
        reservedUntil: 0,
        reservedFor: constants.ZERO_ADDRESS,
      },
    ];

    expect(allListings).to.deep.equal(expectedListings);
  });
});
