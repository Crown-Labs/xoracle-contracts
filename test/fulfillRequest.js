const { expect } = require('chai')
const { toWei, toETH, getJSONRequest, sleep } = require('../scripts/lib/helper.js')
const { config } = require('../config')

// check end with slash (/)
const api = config.pricefeedApi.endsWith('/') ? config.pricefeedApi : config.pricefeedApi + '/'
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

let xOracle
let weth
let simpleTrade
let reqId
let timestamp

describe('\n📌 ### Test xOracle FulfillRequest ###\n', function () {
  before('Deploy Contract', async function () {
    const [deployer, proxyAdmin, controller] = await ethers.getSigners()

    await deployXOracle()

    const SimpleTrade = await ethers.getContractFactory('SimpleTrade')
    simpleTrade = await SimpleTrade.connect(deployer).deploy(xOracle.address, weth.address)

    // deposit reqFee
    await weth.connect(deployer).deposit({ value: ethers.utils.parseEther('1.0') })
    await weth.connect(deployer).transfer(simpleTrade.address, ethers.utils.parseEther('1.0')) // Sends 1.0 WETH
  })

  it('requestPrices', async function () {
    const [deployer, proxyAdmin, controller] = await ethers.getSigners()
    const currentReqId = await xOracle.reqId()

    // Mock contract to call requestPrices
    // open position (2 BTC)
    const tokenIndex = 0 // BTC
    const amount = 2
    await simpleTrade.connect(controller).openPosition(tokenIndex, toWei(amount))

    reqId = await xOracle.reqId()
    expect(reqId - 1).eq(currentReqId)

    const request = await getRequest(reqId)
    expect(request.status).eq(0) // 0 = request,  1 = fulfilled, 2 = cancel, 3 = refund

    timestamp = request.timestamp
  })

  it('fulfillRequest', async function () {
    const [deployer, proxyAdmin, controller] = await ethers.getSigners()
    const url = `${api}${timestamp}`
    let data = []

    while (true) {
      console.log(`try request: ${url}`)
      data = await getJSONRequest(url)
      if (data.length >= 3) {
        break
      }
      await sleep(1000 * 15)
    }

    const pricefeeds = data.filter((pricefeed) => pricefeed.timestamp == timestamp)

    await xOracle.connect(controller).fulfillRequest(pricefeeds, reqId)

    const request = await getRequest(reqId)
    expect(request.status).eq(1) // 0 = request,  1 = fulfilled, 2 = cancel, 3 = refund

    // Check mock contract
    const positionId = (await simpleTrade.lastPositionId()) - 1
    const position = await simpleTrade.getPosition(positionId)
    expect(position.status).eq(2) // 0 = pending, 1 = revert (can't open), 2 = open, 3 = closed

    // Log prices
    for (let tokenIndex of Object.values(tokenIndexs)) {
      const prices = await xOracle.getLastPrice(tokenIndex)
      console.log(tokenIndex, await xOracle.getPriceFeed(tokenIndex), 'round', +prices[0], 'price', +prices[1], 'latestPrice', +prices[2], 'timestamp', +prices[3])
    }
  })
})

async function deployXOracle() {
  const [deployer, proxyAdmin, controller] = await ethers.getSigners()
  var list = []

  const WETH = await ethers.getContractFactory('WETH')

  // Deploy WETH
  weth = await WETH.deploy('Wrapped ETH', 'WETH')

  // deploy logic
  const XOracle = await ethers.getContractFactory('XOracle')
  const xOracle_logic = await XOracle.deploy()

  // deploy proxy
  const AdminUpgradeabilityProxy = await ethers.getContractFactory('AdminUpgradeabilityProxy')
  const xOracle_proxy = await AdminUpgradeabilityProxy.deploy(xOracle_logic.address, proxyAdmin.address, '0x')

  // initialize
  xOracle = await XOracle.attach(xOracle_proxy.address)
  await xOracle.initialize(weth.address)

  console.log(`xOracle: ${xOracle.address}`)

  let keys = Object.keys(tokenIndexs)
  let values = Object.values(tokenIndexs)

  // Deploy PriceFeedStore
  const PriceFeedStore = await ethers.getContractFactory('PriceFeedStore')
  for (let i = 0; i < Object.keys(tokenIndexs).length; i++) {
    let key = keys[i]
    const contract = await PriceFeedStore.connect(deployer).deploy(xOracle.address, `${key}/USD Price Feed`, values[i], 8)

    list.push({
      contract: contract,
      tokenIndex: tokenIndexs[key],
    })

    console.log(`${key}: ${contract.address}`)
  }

  for (let item of list) {
    await xOracle.connect(deployer).setPriceFeedStore(item.contract.address, item.tokenIndex)
  }

  // Set controller
  await xOracle.connect(deployer).setController(controller.address, true)

  // Set signer
  await xOracle.connect(deployer).setSigner(config.pricefeedSigners[0], true)
  await xOracle.connect(deployer).setSigner(config.pricefeedSigners[1], true)
  await xOracle.connect(deployer).setSigner(config.pricefeedSigners[2], true)
  await xOracle.connect(deployer).setSigner(config.pricefeedSigners[3], true)
  await xOracle.connect(deployer).setThreshold(3)
}

async function getRequest(reqID) {
  const request = await xOracle.getRequest(reqID)
  return {
    timestamp: request[0],
    owner: request[1],
    payload: request[2],
    status: request[3],
    expiration: request[4],
    maxGasPrice: request[5],
    callbackGasLimit: request[6],
    depositReqFee: request[7],
    fulfillFee: request[8],
  }
}
