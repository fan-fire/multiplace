const hre = require("hardhat");
const { NETWORKS, PAYMENT_TOKENS, STANIE, FANIE, RESERVER_ROLE, sleep } =
  require("./utils.js");

async function main() {
  let [owner] = await hre.ethers.getSigners();
  const provider = await hre.network.provider;
  const chainId = provider._provider._chainId;
  const network = NETWORKS[chainId];
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

  let paymentToken = PAYMENT_TOKENS[chainId];
  console.log(`Adding payment token...`);
  await multiplace.connect(owner).addPaymentToken(paymentToken);
  await sleep(3000);

  console.log(`Adding reserver for stanie`);
  await multiplace.grantRole(RESERVER_ROLE, STANIE);
  await sleep(3000);

  console.log(`Adding reserver for fanie`);
  await multiplace.grantRole(RESERVER_ROLE, FANIE);

  console.log(`Multiplace can be interacted with at: ${multiplace.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
