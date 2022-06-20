const { ethers } = require("hardhat");

const RESERVER_ROLE = ethers.utils.solidityKeccak256(
  ["string"],
  ["RESERVER_ROLE"]
);

const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; //USDC on mainnet
const FAN = "0x1e65Cd156fe76d68B15C5f2Fa8B42C32Af5af048"; //Fannine coin on mumbai

const STANIE = "0x9ac8bDEcB71f3B7CA674E4C896FFadC53435eF0c";
const FANIE = "0xc073Cf3940C116562FBa21d690FF2121A75844FD";

const PAYMENT_TOKENS = {
  80001: FAN,
  137: USDC,
};

const NETWORKS = {
  80001: "Polygon Mumbai",
  137: "Polygon Mainnet",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  NETWORKS,
  PAYMENT_TOKENS,
  STANIE,
  FANIE,
  FAN,
  USDC,
  RESERVER_ROLE,
  sleep,
};
