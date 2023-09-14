require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
require("@nomiclabs/hardhat-web3");

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
  solidity: {
    compilers: [
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
    },
    opbnbTestnet: {
      url: `${process.env.OPBNB_TESTNET_RPC}`,
      chainId: parseInt(`${process.env.OPBNB_TESTNET_CHAIN_ID}`),
      gasPrice: parseInt(`${process.env.OPBNB_TESTNET_GAS_PRICE}`) * 10**9,
      // accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    lineaTestnet: {
      url: `${process.env.LINEA_TESTNET_RPC}`,
      chainId: parseInt(`${process.env.LINEA_TESTNET_CHAIN_ID}`),
      gasPrice: parseInt(`${process.env.LINEA_TESTNET_GAS_PRICE}`) * 10**9,
      // accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: {
      lineaTestnet: `${process.env.LINEA_TESTNET_APIKEY}`,
    },
  }, 
  mocha: {
    timeout: 100000
  },
};
