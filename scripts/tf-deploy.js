const Multiplace = artifacts.require("Multiplace");
const MultiplaceProxy = artifacts.require("MultiplaceProxy");
const { STANIE, FANIE, USDC, RESERVER_ROLE, sleep } = require("./utils.js");

const main = async () => {
  console.log("Deploying Multiplace...");
  let multiplace = await Multiplace.new();
  console.log(`Multiplace address: ${multiplace.address}`);
  await sleep(3000);
  let multiplaceProxy = await MultiplaceProxy.new(multiplace.address);
  console.log(`MultiplaceProxy address: ${multiplaceProxy.address}`);
  await sleep(3000);

  // let multiplaceAddr = '0x233079CA21d13a1B04b29A6cF3a5B6E4564ff6DA';
  let multiplaceAddr = multiplaceProxy.address;

  multiplace = await Multiplace.at(multiplaceAddr);
  console.log(`Multiplace address: ${multiplace.address}`);

  let paymentToken = USDC;
  console.log(`Adding USDC...`);
  await multiplace.addPaymentToken(paymentToken);
  await sleep(3000);

  console.log(`Adding RESERVER_ROLE for STANIE`);
  await multiplace.grantRole(RESERVER_ROLE, STANIE);
  await sleep(3000);

  console.log(`Adding RESERVER_ROLE for FANIE`);
  await multiplace.grantRole(RESERVER_ROLE, FANIE);

  console.log(`Multiplace can be interacted with at: ${multiplace.address}`);
};

module.exports = async (callback) => {
  try{
    await main();
  }catch(error){
    console.error(error);
    process.exitCode = 1;
  }


  callback();
};
