const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Overload", () => {
  it("Can overload buy", async () => {
    const [owner] = await ethers.getSigners();
    const Overload = await ethers.getContractFactory("Overload");
    const overload = await Overload.deploy();
    await overload.deployed();

    let a = await overload.a();
    let b = await overload.b();
    expect(a).to.equal(0);
    expect(b).to.equal(0);
    
    await overload["buy(uint256)"](2);
    a = await overload.a();
    b = await overload.b();
    expect(a).to.equal(2);
    expect(b).to.equal(0);
    
    await overload["buy(uint256,uint256)"](3,4);
    a = await overload.a();
    b = await overload.b();

    expect(a).to.equal(3);
    expect(b).to.equal(4);
  });
});