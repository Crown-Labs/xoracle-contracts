const { deployContract, contractAt, getContractAddress, sendTxn, getFrameSigner } = require('../lib/deploy')

async function main() {
  const deployer = await getFrameSigner()

  const tokenIndexs = {
    BTC: 0,
    ETH: 1,
    BNB: 2,
    USDT: 3,
    BUSD: 4,
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
  const xOracle = await contractAt('XOracle', getContractAddress('xOracle'), deployer)

  // deploy PriceFeedStore
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

  for (let item of list) {
    await sendTxn(xOracle.setPriceFeedStore(item.contract.address, item.tokenIndex), `xOracle.setPriceFeedStore(${item.contract.address})`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
