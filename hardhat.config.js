require("dotenv").config();

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("solidity-coverage");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.5",
  // settings: {
  //   optimizer: { enabled: true, runs: 200 },
  // },
  networks: {
    polygon: {
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
      url: process.env.POLYGON_NODE,
      chainId: 137,
      gasPrice: 45 * 10 ** 9,
    },
    mumbai: {
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
      url: process.env.MUMBAI_NODE,
      chainId: 80001,
      gasPrice: 45 * 10 ** 9,
    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: ["Multiplace", "Admin", "Listings"],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
