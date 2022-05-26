const {
  createProvider
} = require('@rarible/trezor-provider');
module.exports = {
  networks: {
    polygon_trezor: {
      provider: () => {
        return createProvider({
          url: process.env.POLYGON_NODE,
          path: "m/44'/60'/0'/0/0",
          chainId: 137,
        });
      },
      network_id: 137, // Ropsten's id
      gasPrice: 90 * 10 ** 9,
      // gas: 4066000,        // Ropsten has a lower block limit than mainnet
      confirmations: 2, // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },

  },
  compilers: {
    solc: {
      version: '0.8.5',
      settings: {
        optimizer: {
          enabled: true,
          runs: 1,
        },
      },
    },
  },

};