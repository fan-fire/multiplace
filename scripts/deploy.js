// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  let [owner, notLister, lister, acc1, acc2, acc3] =
    await hre.ethers.getSigners();
  const network = await ethers.getDefaultProvider().getNetwork();
  console.log("Network name=", network.name);
  console.log("Network chain id=", network.chainId);
  console.log(owner.address);
  const Multiplace = await ethers.getContractFactory("Multiplace");
  console.log(`Deploying Multiplace...`);
  let multiplace = await Multiplace.deploy();
  await multiplace.deployed();
  console.log(`Deployed Multiplace at ${multiplace.address}`);
  await sleep(3000);

  const MultiplaceProxy = await ethers.getContractFactory("MultiplaceProxy");
  console.log(`Deploying MultiplaceProxy...`);
  let multiplaceProxy = await MultiplaceProxy.deploy(multiplace.address);
  await multiplaceProxy.deployed();
  console.log(`Deployed MultiplaceProxy at ${multiplaceProxy.address}`);
  await sleep(3000);

  multiplace = Multiplace.attach(multiplaceProxy.address);

  let usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  let fan = "0x1e65Cd156fe76d68B15C5f2Fa8B42C32Af5af048";
  console.log(`Adding payment token...`);
  await multiplace.connect(owner).addPaymentToken(fan);
  await sleep(3000);

  let stanie = "0x9ac8bDEcB71f3B7CA674E4C896FFadC53435eF0c";
  let fanie = "0xc073Cf3940C116562FBa21d690FF2121A75844FD";
  const RESERVER_ROLE = ethers.utils.solidityKeccak256(
    ["string"],
    ["RESERVER_ROLE"]
  );

  console.log(`Adding reserver for stanie`);
  await multiplace.grantRole(RESERVER_ROLE, stanie);
  await sleep(3000);

  console.log(`Adding reserver for fanie`);
  await multiplace.grantRole(RESERVER_ROLE, fanie);

  console.log(`Multiplace can be interacted with at: ${multiplace.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
