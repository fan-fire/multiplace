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

  beforeEach(async () => {
    [owner, notOwner] = await ethers.getSigners();
  });

  it("MultiplaceProxy is set as the owner of deployed Admin", async () => {
    let multiplace = await getMultiplace();

    let adminAddr = await multiplace.admin();
    const Admin = await ethers.getContractFactory("Admin");

    let admin = await Admin.attach(adminAddr);

    expect(await admin.owner()).to.be.equal(
      multiplace.address,
      "Owner of admin should be proxy address"
    );
  });

  it("Can update the protoccl fee via multiplace", async () => {
    let multiplace = await getMultiplace();
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
  it("Can't update the protoccl fee directly going to admin contract", async () => {});

  it("Can update the protoccl wallet via multiplace", async () => {});
  it("Can't update the protoccl wallet directly going to admin contract", async () => {});

  it("Can update the payment token via multiplace", async () => {});
  it("Can't update the payment token directly going to admin contract", async () => {});

  it("Admin supports 165", async () => {});
  it("Admin supports correct IAdmin", async () => {});

  it("Deployer is the default protocol wallet after deploying", async () => {});

  it("Can't change protocol wallet to ZERO_ADDRESS");

  it("ProtocolWalletChanged event emitted", async () => {});
  it("ProtocolFeeChanged event emitted", async () => {});
  it("PaymentTokenAdded event emitted", async () => {});
});
