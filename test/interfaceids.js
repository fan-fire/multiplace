const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  constants, // Common constants, like the zero address and largest integers
} = require("@openzeppelin/test-helpers");

const ether = require("@openzeppelin/test-helpers/src/ether");

const getInterfaceID = (contractInterface) => {
  let interfaceID = ethers.constants.Zero;
  const functions = Object.keys(contractInterface.functions);
  for (let i = 0; i < functions.length; i++) {
    // console.log(`\t${interfaceID.toHexString()}`)
    let f = functions[i];
    if (f == "supportsInterface(bytes4)") {
      continue;
    }
    // console.log(f);
    let hash = contractInterface.getSighash(f);
    // console.log(`\thash: ${hash}`);
    interfaceID = interfaceID.xor(hash);
  }

  return interfaceID.toHexString();
};

describe("InterfaceId", async () => {
  it("Multiplace has correct interface IDs", async () => {
    const Multiplace = await ethers.getContractFactory("Multiplace");
    multiplace = await Multiplace.deploy();
    await multiplace.deployed();

    const MultiplaceProxy = await ethers.getContractFactory("MultiplaceProxy");
    multiplaceProxy = await MultiplaceProxy.deploy(multiplace.address);
    await multiplaceProxy.deployed();

    multiplace = Multiplace.attach(multiplaceProxy.address);

    // const IMultiplace = await ethers.getContractFactory("IMultiplace");
    ("artifacts/contracts/IMultiplace.sol/IMultiplace.json");
    const IMultiplace = new ethers.utils.Interface(
      require("../artifacts/contracts/IMultiplace.sol/IMultiplace.json").abi
    );

    let INTERFACE_ID_165 = "0x01ffc9a7";
    let supports165 = await multiplace.supportsInterface(INTERFACE_ID_165);
    expect(supports165).to.be.true;

    // let IMultiplaceID = "0x52ed7671";
    let IMultiplaceID = getInterfaceID(IMultiplace);
    let supportsIMultiplace = await multiplace.supportsInterface(IMultiplaceID);
    expect(supportsIMultiplace).to.be.true;

    let falseInterfaceID = "0xffffffff";
    let falseSupports = await multiplace.supportsInterface(falseInterfaceID);
    expect(falseSupports).to.be.false;
  });
});
