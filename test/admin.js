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
  getInterfaceID,
} = require("./utils");
const ether = require("@openzeppelin/test-helpers/src/ether");

Array.prototype.forEachAsync = async function (fn) {
  for (let t of this) {
    await fn(t);
  }
};

const getMultiplace = async () => {
  const Multiplace = await ethers.getContractFactory("Multiplace");
  multiplace = await Multiplace.deploy();
  await multiplace.deployed();

  const MultiplaceProxy = await ethers.getContractFactory("MultiplaceProxy");
  multiplaceProxy = await MultiplaceProxy.deploy(multiplace.address);
  await multiplaceProxy.deployed();

  multiplace = Multiplace.attach(multiplaceProxy.address);

  return multiplace;
};

describe("Admin", async (accounts) => {
  let owner;
  let notOwner;
  let multiplace;

  beforeEach(async () => {
    [owner, notOwner] = await ethers.getSigners();
  });

  it("MultiplaceProxy is set as the owner of deployed Admin", async () => {
    multiplace = await getMultiplace();

    let adminAddr = await multiplace.admin();
    const Admin = await ethers.getContractFactory("Admin");

    let admin = await Admin.attach(adminAddr);

    expect(await admin.owner()).to.be.equal(
      multiplace.address,
      "Owner of admin should be proxy address"
    );
  });

  it("Can update the protoccl fee via multiplace", async () => {
    multiplace = await getMultiplace();
    let defaultFeeNumerator = ethers.BigNumber.from("2500000000000");
    let defaultFeeDenominator = ethers.BigNumber.from("100000000000000");

    let multiplaceFeeNumerator = await multiplace.protocolFeeNumerator();
    let multiplaceFeeDenominator = await multiplace.protocolFeeDenominator();

    let adminAddr = await multiplace.admin();
    const Admin = await ethers.getContractFactory("Admin");
    let admin = await Admin.attach(adminAddr);

    let adminFeeNumerator = await admin.protocolFeeNumerator();
    let adminFeeDenominator = await admin.protocolFeeDenominator();

    expect(multiplaceFeeNumerator.toString()).to.be.equal(
      defaultFeeNumerator.toString()
    );
    expect(adminFeeNumerator.toString()).to.be.equal(
      defaultFeeNumerator.toString()
    );
    expect(multiplaceFeeDenominator.toString()).to.be.equal(
      defaultFeeDenominator.toString()
    );
    expect(adminFeeDenominator.toString()).to.be.equal(
      defaultFeeDenominator.toString()
    );

    let newFeeNumerator = 10;
    let newFeeDenominator = 1000;

    await multiplace
      .connect(owner)
      .changeProtocolFee(newFeeNumerator, newFeeDenominator);

    multiplaceFeeNumerator = await multiplace.protocolFeeNumerator();
    multiplaceFeeDenominator = await multiplace.protocolFeeDenominator();

    adminFeeNumerator = await admin.protocolFeeNumerator();
    adminFeeDenominator = await admin.protocolFeeDenominator();

    expect(multiplaceFeeNumerator.toString()).to.be.equal(
      newFeeNumerator.toString()
    );
    expect(adminFeeNumerator.toString()).to.be.equal(
      newFeeNumerator.toString()
    );
    expect(multiplaceFeeDenominator.toString()).to.be.equal(
      newFeeDenominator.toString()
    );
    expect(adminFeeDenominator.toString()).to.be.equal(
      newFeeDenominator.toString()
    );
  });
  it("Can't update the protocol fee directly going to admin contract", async () => {
    multiplace = await getMultiplace();
    let adminAddr = await multiplace.admin();
    const Admin = await ethers.getContractFactory("Admin");
    let admin = await Admin.attach(adminAddr);

    let newFeeNumerator = 10;
    let newFeeDenominator = 1000;

    await expect(
      admin.connect(owner).changeProtocolFee(newFeeNumerator, newFeeDenominator)
    ).to.be.revertedWith("Not owner contract");
    await expect(
      admin
        .connect(notOwner)
        .changeProtocolFee(newFeeNumerator, newFeeDenominator)
    ).to.be.revertedWith("Not owner contract");
  });

  it("Can't update the protocol fee via mutiplace if not owner", async () => {
    multiplace = await getMultiplace();

    let newFeeNumerator = 10;
    let newFeeDenominator = 1000;

    await expect(
      multiplace
        .connect(notOwner)
        .changeProtocolFee(newFeeNumerator, newFeeDenominator)
    ).to.be.revertedWith(
      `AccessControl: account ${notOwner.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
    );
  });

  it("Can update the protocol wallet via multiplace", async () => {
    multiplace = await getMultiplace();
    let defaultProtocolWallet = owner.address;

    let adminAddr = await multiplace.admin();
    const Admin = await ethers.getContractFactory("Admin");
    let admin = await Admin.attach(adminAddr);

    let adminProtocolWallet = await admin.protocolWallet();
    let multiplaceProtocolWallet = await multiplace.protocolWallet();

    expect(adminProtocolWallet).to.be.equal(
      defaultProtocolWallet,
      "Admin protocol wallet should be the owner"
    );

    expect(multiplaceProtocolWallet).to.be.equal(
      defaultProtocolWallet,
      "Multiplace protocol wallet should be the owner"
    );

    let newProtocolWallet = notOwner.address;

    await multiplace.connect(owner).changeProtocolWallet(newProtocolWallet);

    adminProtocolWallet = await admin.protocolWallet();
    multiplaceProtocolWallet = await multiplace.protocolWallet();

    expect(adminProtocolWallet).to.be.equal(
      newProtocolWallet,
      "Admin protocol wallet should now be the notOwner"
    );

    expect(multiplaceProtocolWallet).to.be.equal(
      newProtocolWallet,
      "Multiplace protocol wallet should now be the notOwner"
    );
  });

  it("Can't update the protocol wallet via mutiplace if not owner", async () => {
    multiplace = await getMultiplace();

    let newProtocolWallet = notOwner.address;
    await expect(
      multiplace.connect(notOwner).changeProtocolWallet(newProtocolWallet)
    ).to.be.revertedWith(
      `AccessControl: account ${notOwner.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
    );
  });

  it("Can't update the protocol wallet directly going to admin contract", async () => {
    multiplace = await getMultiplace();
    let adminAddr = await multiplace.admin();
    const Admin = await ethers.getContractFactory("Admin");
    let admin = await Admin.attach(adminAddr);

    let newProtocolWallet = notOwner.address;

    await expect(
      admin.connect(owner).changeProtocolWallet(newProtocolWallet)
    ).to.be.revertedWith("Not owner contract");
    await expect(
      admin.connect(notOwner).changeProtocolWallet(newProtocolWallet)
    ).to.be.revertedWith("Not owner contract");
  });

  it("Can update the payment token via multiplace", async () => {
    multiplace = await getMultiplace();
    let dummyPaymentTokenAddress = notOwner.address;

    let multiplaceIsPaymentToken = await multiplace.isPaymentToken(
      dummyPaymentTokenAddress
    );
    expect(multiplaceIsPaymentToken).to.be.false;

    let adminAddr = await multiplace.admin();
    const Admin = await ethers.getContractFactory("Admin");
    let admin = await Admin.attach(adminAddr);

    let adminIsPaymentToken = await admin.isPaymentToken(
      dummyPaymentTokenAddress
    );
    expect(adminIsPaymentToken).to.be.false;

    await multiplace.connect(owner).addPaymentToken(dummyPaymentTokenAddress);

    multiplaceIsPaymentToken = await multiplace.isPaymentToken(
      dummyPaymentTokenAddress
    );
    expect(multiplaceIsPaymentToken).to.be.true;

    adminIsPaymentToken = await admin.isPaymentToken(dummyPaymentTokenAddress);
    expect(adminIsPaymentToken).to.be.true;
  });
  it("Can't update the protocol wallet via mutiplace if not owner", async () => {
    multiplace = await getMultiplace();
    let dummyPaymentTokenAddress = notOwner.address;

    await expect(
      multiplace.connect(notOwner).addPaymentToken(dummyPaymentTokenAddress)
    ).to.be.revertedWith(
      `AccessControl: account ${notOwner.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`
    );
  });
  it("Can't update the payment token directly going to admin contract", async () => {
    multiplace = await getMultiplace();
    let dummyPaymentTokenAddress = notOwner.address;

    let multiplaceIsPaymentToken = await multiplace.isPaymentToken(
      dummyPaymentTokenAddress
    );
    expect(multiplaceIsPaymentToken).to.be.false;

    let adminAddr = await multiplace.admin();
    const Admin = await ethers.getContractFactory("Admin");
    let admin = await Admin.attach(adminAddr);

    await expect(
      admin.connect(notOwner).addPaymentToken(dummyPaymentTokenAddress)
    ).to.be.revertedWith("Not owner contract");
    await expect(
      admin.connect(owner).addPaymentToken(dummyPaymentTokenAddress)
    ).to.be.revertedWith("Not owner contract");
  });

  it("Admin supports 165", async () => {
    multiplace = await getMultiplace();
    let adminAddr = await multiplace.admin();
    const Admin = await ethers.getContractFactory("Admin");
    let admin = await Admin.attach(adminAddr);

    let interfaceId165 = "0x01ffc9a7";

    let adminSupports165 = await admin.supportsInterface(interfaceId165);
    expect(adminSupports165).to.be.true;
  });

  it("Can't add the same payment token twice", async () => {
    let dummyPaymentTokenAddress = notOwner.address;
    multiplace = await getMultiplace();
    await multiplace.connect(owner).addPaymentToken(dummyPaymentTokenAddress);

    let isPaymentToken = await multiplace.isPaymentToken(
      dummyPaymentTokenAddress
    );
    expect(isPaymentToken).to.be.true;

    await expect(
      multiplace.connect(owner).addPaymentToken(dummyPaymentTokenAddress)
    ).to.be.revertedWith("Payment token already added");
  });

  it("Can't get balance for unkown payment token", async () => {
    let dummyPaymentTokenAddress = notOwner.address;
    multiplace = await getMultiplace();
    let isPaymentToken = await multiplace.isPaymentToken(
      dummyPaymentTokenAddress
    );

    expect(isPaymentToken).to.be.false;

    await expect(
      multiplace
        .connect(owner)
        .getBalance(dummyPaymentTokenAddress, owner.address)
    ).to.be.revertedWith("Unkown payment token");
  });

  xit("Can't change protocol wallet to ZERO_ADDRESS", async () => {});
});
