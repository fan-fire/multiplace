// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const usdc = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; //USDC on mainnet
const fan = "0x1e65Cd156fe76d68B15C5f2Fa8B42C32Af5af048"; //Fannine coin on mumbai

const stanie = "0x9ac8bDEcB71f3B7CA674E4C896FFadC53435eF0c";
const fanie = "0xc073Cf3940C116562FBa21d690FF2121A75844FD";

const paymentTokens = {
  80001: fan,
  137: usdc,
};

const networks = {
  80001: "Polygon Mumbai",
  137: "Polygon Mainnet",
};

async function main() {
  let [owner] = await hre.ethers.getSigners();
  const provider = await hre.network.provider;
  const chainId = provider._provider._chainId;
  const network = networks[chainId];
  console.log("Network name=", network);
  console.log("Network chain id=", chainId);
  console.log(`Owner address=${owner.address}`);
  
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

  let paymentToken = paymentTokens[chainId];
  console.log(`Adding payment token...`);
  await multiplace.connect(owner).addPaymentToken(paymentToken);
  await sleep(3000);

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
