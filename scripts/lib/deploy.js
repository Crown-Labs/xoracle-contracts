const { networkId, config } = require('../../config')
const fs = require('fs')
const path = require('path')
const network = process.env.HARDHAT_NETWORK
const filePath = path.join(__dirname, '..', '..', `.addresses-${network}.json`)
const deployedAddress = readTmpAddresses()

const contactAddress = {
  // contract
  xOracle: deployedAddress['XOracle'],
  xOracle_logic: deployedAddress['XOracle_logic'],
  weth: config.tokens[getChainId(network)]?.weth,
  btcPriceFeed: deployedAddress['BTC/USD PriceFeed'],
  ethPriceFeed: deployedAddress['ETH/USD PriceFeed'],
  bnbPriceFeed: deployedAddress['BNB/USD PriceFeed'],
  usdtPriceFeed: deployedAddress['USDT/USD PriceFeed'],
  busdPriceFeed: deployedAddress['BUSD/USD PriceFeed'],
  usdcPriceFeed: deployedAddress['USDC/USD PriceFeed'],
  daiPriceFeed: deployedAddress['DAI/USD PriceFeed'],
  xrpPriceFeed: deployedAddress['XRP/USD PriceFeed'],
  dogePriceFeed: deployedAddress['DOGE/USD PriceFeed'],
  trxPriceFeed: deployedAddress['TRX/USD PriceFeed'],
  adaPriceFeed: deployedAddress['ADA/USD PriceFeed'],
  maticPriceFeed: deployedAddress['MATIC/USD PriceFeed'],
  solPriceFeed: deployedAddress['SOL/USD PriceFeed'],
  dotPriceFeed: deployedAddress['DOT/USD PriceFeed'],
  avaxPriceFeed: deployedAddress['AVAX/USD PriceFeed'],
  ftmPriceFeed: deployedAddress['FTM/USD PriceFeed'],
  nearPriceFeed: deployedAddress['NEAR/USD PriceFeed'],
  atomPriceFeed: deployedAddress['ATOM/USD PriceFeed'],
  opPriceFeed: deployedAddress['OP/USD PriceFeed'],
  arbPriceFeed: deployedAddress['ARB/USD PriceFeed'],
  xOracleMessage: deployedAddress['XOracleMessage'],
  xOracleMessage_logic: deployedAddress['XOracleMessage_logic'],
  feeController: deployedAddress['FeeController'],
}

function getContractAddress(name) {
  const addr = contactAddress[name]
  if (!addr) {
    throw new Error('not found ' + name + ' address')
  }

  return addr
}

async function deployContract(name, args, label, provider, options) {
  if (!label) {
    label = name
  }
  let contractFactory = await ethers.getContractFactory(name)
  if (provider) {
    contractFactory = contractFactory.connect(provider)
  }

  let contract
  if (options) {
    contract = await contractFactory.deploy(...args, options)
  } else {
    contract = await contractFactory.deploy(...args)
  }
  const argStr = args.map((i) => `"${i}"`).join(' ')
  console.info(`\n[Deploy ${name}] ${label}: ${contract.address} ${argStr}`)
  await contract.deployTransaction.wait()
  console.info('... Completed!')

  writeTmpAddresses({
    [label]: contract.address,
  })

  return contract
}

async function contractAt(name, address, provider) {
  let contractFactory = await ethers.getContractFactory(name)
  if (provider) {
    contractFactory = contractFactory.connect(provider)
  }
  return await contractFactory.attach(address)
}

function getChainId(network) {
  const chainId = networkId[network]
  if (!chainId) {
    throw new Error(`Unsupported network ${network}`)
  }
  return chainId
}

async function getFrameSigner() {
  if (process.env.USE_FRAME_SIGNER == 'true') {
    try {
      const frame = new ethers.providers.JsonRpcProvider('http://127.0.0.1:1248')
      const signer = frame.getSigner()

      if (getChainId(network) !== (await signer.getChainId())) {
        throw new Error('Incorrect frame network')
      }

      console.log('🖼️ FrameSigner ChainId:', await signer.getChainId())
      console.log(`signer: ${signer.address}`)

      return signer
    } catch (e) {
      throw new Error(`getFrameSigner error: ${e.toString()}`)
    }
  } else {
    const [signer] = await hre.ethers.getSigners()
    console.log(`📝 use deployer from PRIVATE_KEY in .env`)
    console.log(`signer: ${signer.address}`)
    return signer
  }
}

function readTmpAddresses() {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath))
  }
  return {}
}

function writeTmpAddresses(json) {
  const tmpAddresses = Object.assign(readTmpAddresses(), json)
  fs.writeFileSync(filePath, JSON.stringify(tmpAddresses, null, 4))
}

async function sendTxn(txnPromise, label) {
  const txn = await txnPromise
  console.info(`Sending ${label}...`)
  await txn.wait()
  console.info(`... Sent! ${txn.hash}`)
  return txn
}

module.exports = {
  deployedAddress,
  getContractAddress,
  deployContract,
  contractAt,
  getFrameSigner,
  writeTmpAddresses,
  readTmpAddresses,
  sendTxn,
}
