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
        version: "0.8.19",
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
    arbTestnet: {
      url: `https://sepolia-rollup.arbitrum.io/rpc`,
      chainId: 421614,
      gasPrice: 1 * 10**9,
      // accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    holesky: {
      url: `https://ethereum-holesky.publicnode.com`,
      chainId: 17000,
      gasPrice: 8 * 10**9,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    sepolia: {
      url: `https://rpc.sepolia.org`,
      chainId: 11155111,
      gasPrice: 55 * 10**9,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    bscTestnet: {
      url: `https://bsc-testnet-rpc.publicnode.com`,
      chainId: 97,
      gasPrice: 10 * 10**9,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: {
      arbTestnet: `${process.env.ARB_TESTNET_APIKEY}`,
      holesky: `${process.env.ETHERSCAN_APIKEY}`,
      sepolia: `${process.env.ETHERSCAN_APIKEY}`,
      bscTestnet: `${process.env.BSC_TESTNET_APIKEY}`,
    },
    customChains: [{
      network: "arbTestnet",
      chainId: 421614,
      urls: {
        apiURL: "https://api-sepolia.arbiscan.io/api",
        browserURL: "https://sepolia.arbiscan.io"
      }
    },
    {
      network: "holesky",
      chainId: 17000,
      urls: {
        apiURL: "https://api-holesky.etherscan.io/api",
        browserURL: "https://holesky.etherscan.io"
      }
    },
    {
      network: "sepolia",
      chainId: 11155111,
      urls: {
        apiURL: "https://api-sepolia.etherscan.io/api",
        browserURL: "https://sepolia.etherscan.io"
      }
    },
    {
      network: "bscTestnet",
      chainId: 97,
      urls: {
        apiURL: "https://api-testnet.bscscan.com/api",
        browserURL: "https://testnet.bscscan.com"
      }
    },
  ], 
  }, 
  mocha: {
    timeout: 500000
  },
};
