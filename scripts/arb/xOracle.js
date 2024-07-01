const { deployContract, contractAt, getContractAddress, sendTxn, getFrameSigner } = require('../lib/deploy')
const { config } = require('../../config')
const readline = require('readline')

async function main() {
  let deployer = await getFrameSigner()
  const xOracleOwner = config.xOracleOwner
  const proxyAdmin = config.proxyAdmin
  const relayNodes = config.relayNodes
  const pricefeedSigners = config.pricefeedSigners
  const wethAddress = getContractAddress('weth')
  const threshold = 3
  const fulfillFee = 3000 // 30%
  const minGasPrice = 0.01 * 10 ** 9
  const minGasLimit = 1000000 // 1M

  const tokenIndexs = {
    BTC: 0,
    ETH: 1,
    BNB: 2,
    USDT: 3,
    // BUSD: 4,
    USDC: 5,
    DAI: 6,
    XRP: 10,
    DOGE: 11,
    TRX: 12,
    ADA: 20,
    MATIC: 21,
    SOL: 22,
    DOT: 23,
    AVAX: 24,
    FTM: 25,
    NEAR: 26,
    ATOM: 27,
    OP: 28,
    ARB: 29,
  }
  let list = []
  let xOracle

  // false = new deploy all contracts
  // true = migrate to new xOracle logic
  let isMigrate = false

  // deploy logic
  const xOracle_logic = await deployContract('XOracle', [], 'XOracle_logic', deployer)
  // const xOracle_logic = await contractAt("XOracle", getContractAddress("xOracle_logic"), deployer);
  // xOracle = await contractAt('XOracle', getContractAddress('xOracle'), deployer);

  // xOracle
  if (!isMigrate) {
    // deploy proxy
    const xOracle_proxy = await deployContract('AdminUpgradeabilityProxy', [xOracle_logic.address, proxyAdmin, '0x'], 'XOracle', deployer)
    // const xOracle_proxy = await contractAt("XOracle", getContractAddress("xOracle"), deployer);

    // initialize
    xOracle = await contractAt('XOracle', xOracle_proxy.address, deployer)
    await xOracle.initialize(wethAddress)
  } else {
    // for upgrade proxy
    xOracle = await contractAt('XOracle', getContractAddress('xOracle'), deployer)

    // switch to proxyAdmin
    await switchSigner(proxyAdmin)
    // use frame signer and reload deployer
    const proxyAdminSigner = await getFrameSigner()

    // proxy upgrade new logic
    const xOracle_proxy = await contractAt('AdminUpgradeabilityProxy', getContractAddress('xOracle'), proxyAdminSigner)
    await sendTxn(xOracle_proxy.upgradeTo(xOracle_logic.address), `xOracle.upgradeTo(${xOracle_logic.address})`)

    // switch to deployer
    await switchSigner(`deployer`)
    // use frame signer and reload deployer
    deployer = await getFrameSigner()
  }

  // PriceFeedStore
  if (!isMigrate) {
    // deploy
    let keys = Object.keys(tokenIndexs)
    let values = Object.values(tokenIndexs)
    for (let i = 0; i < Object.keys(tokenIndexs).length; i++) {
      let key = keys[i]
      const contract = await deployContract('PriceFeedStore', [xOracle.address, `${key}/USD Price Feed`, values[i], 8], `${key}/USD PriceFeed`, deployer)

      list.push({
        contract: contract,
        tokenIndex: tokenIndexs[key],
      })
    }
  } else {
    // get contracts
    let keys = Object.keys(tokenIndexs)
    for (let i = 0; i < Object.keys(tokenIndexs).length; i++) {
      let key = keys[i]
      let name = `${key.toLowerCase()}PriceFeed`
      const contract = await contractAt('PriceFeedStore', getContractAddress(name), deployer)

      list.push({
        contract: contract,
        tokenIndex: tokenIndexs[key],
      })
    }
  }

  for (let item of list) {
    await sendTxn(item.contract.setXOracle(xOracle.address), `PriceFeedStore.setXOracle(${xOracle.address})`)
  }

  for (let item of list) {
    await sendTxn(xOracle.setPriceFeedStore(item.contract.address, item.tokenIndex), `xOracle.setPriceFeedStore(${item.contract.address})`)
  }

  // set signer
  for (let i = 0; i < pricefeedSigners.length; i++) {
    await sendTxn(xOracle.setSigner(pricefeedSigners[i], true), `xOracle.setSigner(${pricefeedSigners[i]})`)
  }
  await sendTxn(xOracle.setThreshold(threshold), `xOracle.setThreshold(${threshold})`)

  // set controller
  for (let i = 0; i < relayNodes.length; i++) {
    await sendTxn(xOracle.setController(relayNodes[i], true), `xOracle.setController(${relayNodes[i]})`)
  }

  // set reqFee
  await sendTxn(xOracle.setFulfillFee(fulfillFee), `xOracle.setFulfillFee(${fulfillFee})`)
  await sendTxn(xOracle.setMinGasPrice(minGasPrice), `xOracle.setMinGasPrice(${minGasPrice})`)
  await sendTxn(xOracle.setMinGasLimit(minGasLimit), `xOracle.setMinGasLimit(${minGasLimit})`) 

  // transfer ownership
  if (!isMigrate) {
    await sendTxn(xOracle.transferOwnership(xOracleOwner), `xOracle.transferOwnership(${xOracleOwner})`)
  }
}

async function switchSigner(address) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) =>
    rl.question(`wait for swtich signer to ${address}\npress enter to continue...`, (ans) => {
      rl.close()
      resolve(ans)
    })
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
