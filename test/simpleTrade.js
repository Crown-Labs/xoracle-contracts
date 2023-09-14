const { expect } = require('chai')
const helpers = require('@nomicfoundation/hardhat-network-helpers')
const crypto = require('crypto')
const { toWei, toETH } = require('../scripts/lib/helper.js')

const tokenIndexs = {
  BTC: 0,
  ETH: 1,
  BNB: 2,
  USDT: 3,
  BUSD: 4,
  USDC: 5,
  DOGE: 6,
}
const symbol = {
  [tokenIndexs.BTC]: 'BTC',
  [tokenIndexs.ETH]: 'ETH',
  [tokenIndexs.BNB]: 'BNB',
}
let pricelist = []
let signers = []
let xOracle
let weth
let simpleTrade
let pricePrecision
const fulfillFee = 3000 // 30%
const minFeeBalance = 0.02 * 10 ** 9

describe('\n📌 ### Test Sample App: Simple Trade ###\n', function () {
  before('Initial data', async function () {
    console.log('👻 make signers')
    makeSigner(3)

    console.log('👻 make price list')
    makePricelist()
  })

  before('Deploy XOracle Contract', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2] = await ethers.getSigners()

    const WETH = await ethers.getContractFactory('WETH')
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

    const PriceFeedStore = await ethers.getContractFactory('PriceFeedStore')
    const btcPriceFeed = await PriceFeedStore.deploy(xOracle.address, 'BTC/USD Price Feed', tokenIndexs.BTC, 8)
    const ethPriceFeed = await PriceFeedStore.deploy(xOracle.address, 'ETH/USD Price Feed', tokenIndexs.ETH, 8)
    const bnbPriceFeed = await PriceFeedStore.deploy(xOracle.address, 'BNB/USD Price Feed', tokenIndexs.BNB, 8)

    await xOracle.setPriceFeedStore(btcPriceFeed.address, tokenIndexs.BTC)
    await xOracle.setPriceFeedStore(ethPriceFeed.address, tokenIndexs.ETH)
    await xOracle.setPriceFeedStore(bnbPriceFeed.address, tokenIndexs.BNB)

    await xOracle.setController(relayNode.address, true)

    for (i = 0; i < signers.length; i++) {
      await xOracle.setSigner(signers[i].publicAddress, true)
    }

    // set reqFee
    await xOracle.setFulfillFee(fulfillFee)
    await xOracle.setMinFeeBalance(minFeeBalance)

    const decimals = await xOracle.getDecimals(tokenIndexs.BTC)
    pricePrecision = 10 ** parseInt(decimals)
  })

  before('Deploy SimpleTrade Contract', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2] = await ethers.getSigners()

    const SimpleTrade = await ethers.getContractFactory('SimpleTrade')
    simpleTrade = await SimpleTrade.deploy(xOracle.address, weth.address)

    // deposit reqFee
    await weth.deposit({ value: ethers.utils.parseEther('1.0') })
    await weth.transfer(simpleTrade.address, ethers.utils.parseEther('1.0')) // Sends 1.0 WETH
  })

  it('Position: 0 | BTC | Open Position', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2] = await ethers.getSigners()

    const beforeFundBalance = await weth.balanceOf(simpleTrade.address)
    const beforeRelayNodeBalance = await weth.balanceOf(relayNode.address)

    // 1 open position (2 BTC)
    const positionId = 0
    const tokenIndex = 0 // BTC
    const amount = 2
    await simpleTrade.connect(user1).openPosition(tokenIndex, toWei(amount))

    // 2 simulate relayNode fulfill request
    const prices = pricelist[3] // pricelist set 3
    await relayNodeFulfill(relayNode, prices) // no slippage

    // 3 check result
    const position = await simpleTrade.getPosition(positionId)
    const lastPrice = await xOracle.getLastPrice(tokenIndex)

    // 4 check fund balance
    const fundBalance = await weth.balanceOf(simpleTrade.address)
    const relayNodeBalance = await weth.balanceOf(relayNode.address)

    expect(position.owner).eq(user1.address)
    expect(position.tokenIndex).eq(tokenIndex)
    expect(position.entryPrice).eq(lastPrice[1])
    expect(position.amount).eq(toWei(amount))
    expect(position.status).eq(2) // 2 = open
    expect(beforeFundBalance.sub(fundBalance)).to.eq(relayNodeBalance.sub(beforeRelayNodeBalance))

    console.log(`🟢 open position ${toETH(position.amount)} ${symbol[tokenIndex]} @${position.entryPrice / pricePrecision}`)
  })

  it('Position: 1 | ETH | Open Position', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2] = await ethers.getSigners()

    const beforeFundBalance = await weth.balanceOf(simpleTrade.address)
    const beforeRelayNodeBalance = await weth.balanceOf(relayNode.address)

    // 1 open position (5.55 ETH)
    const positionId = 1
    const tokenIndex = 1 // ETH
    const amount = 5.55
    await simpleTrade.connect(user2).openPosition(tokenIndex, toWei(amount))

    // 2 simulate relayNode fulfill request
    const prices = pricelist[4] // pricelist set 4
    await relayNodeFulfill(relayNode, prices, 0.1) // slippage 0.1%

    // 3 check result
    const position = await simpleTrade.getPosition(positionId)
    const lastPrice = await xOracle.getLastPrice(tokenIndex)

    // 4 check fund balance
    const fundBalance = await weth.balanceOf(simpleTrade.address)
    const relayNodeBalance = await weth.balanceOf(relayNode.address)

    expect(position.owner).eq(user2.address)
    expect(position.tokenIndex).eq(tokenIndex)
    expect(position.entryPrice).eq(lastPrice[1])
    expect(position.amount).eq(toWei(amount))
    expect(position.status).eq(2) // 2 = open
    expect(beforeFundBalance.sub(fundBalance)).to.eq(relayNodeBalance.sub(beforeRelayNodeBalance))

    console.log(`🟢 open position ${toETH(position.amount)} ${symbol[tokenIndex]} @${position.entryPrice / pricePrecision}`)
  })

  it('Position: 0 | BTC | Close Position (Profit)', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2] = await ethers.getSigners()

    const beforeFundBalance = await weth.balanceOf(simpleTrade.address)
    const beforeRelayNodeBalance = await weth.balanceOf(relayNode.address)

    // 1 close position (position size 100%)
    const positionId = 0
    const tokenIndex = 0 // BTC
    await simpleTrade.connect(user1).closePosition(positionId)

    // 2 simulate relayNode fulfill request
    const prices = pricelist[4] // pricelist set 4
    await relayNodeFulfill(relayNode, prices, 1.0) // no slippage 1%

    // 3 check result
    const position = await simpleTrade.getPosition(positionId)
    const lastPrice = await xOracle.getLastPrice(tokenIndex)

    // 4 check fund balance
    const fundBalance = await weth.balanceOf(simpleTrade.address)
    const relayNodeBalance = await weth.balanceOf(relayNode.address)

    expect(position.owner).eq(user1.address)
    expect(position.tokenIndex).eq(tokenIndex)
    expect(position.realizeAsProfit).eq(true)
    expect(position.realizePL).eq(Math.abs(lastPrice[1] - position.entryPrice) * toETH(position.amount))
    expect(position.status).eq(3) // 3 = close
    expect(beforeFundBalance.sub(fundBalance)).to.eq(relayNodeBalance.sub(beforeRelayNodeBalance))

    console.log(`🔴 close position ${toETH(position.amount)} ${symbol[tokenIndex]} @${lastPrice[1] / pricePrecision}`)
    console.log(`💸 realize P/L ${position.realizeAsProfit ? '+' : '-'}${position.realizePL / pricePrecision}`)
  })

  it('Position: 1 | ETH | Close Position (Loss)', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2] = await ethers.getSigners()

    const beforeFundBalance = await weth.balanceOf(simpleTrade.address)
    const beforeRelayNodeBalance = await weth.balanceOf(relayNode.address)

    // 1 close position (position size 100%)
    const positionId = 1
    const tokenIndex = 1 // ETH
    await simpleTrade.connect(user2).closePosition(positionId)

    // 2 simulate relayNode fulfill request
    const prices = pricelist[5] // pricelist set 5
    await relayNodeFulfill(relayNode, prices, 0.85) // slippage 0.85%

    // 3 check result
    const position = await simpleTrade.getPosition(positionId)
    const lastPrice = await xOracle.getLastPrice(tokenIndex)

    // 4 check fund balance
    const fundBalance = await weth.balanceOf(simpleTrade.address)
    const relayNodeBalance = await weth.balanceOf(relayNode.address)

    expect(position.owner).eq(user2.address)
    expect(position.tokenIndex).eq(tokenIndex)
    expect(position.realizeAsProfit).eq(false)
    expect(position.realizePL).eq(Math.abs(lastPrice[1] - position.entryPrice) * toETH(position.amount))
    expect(position.status).eq(3) // 3 = close
    expect(beforeFundBalance.sub(fundBalance)).to.eq(relayNodeBalance.sub(beforeRelayNodeBalance))

    console.log(`🔴 close position ${toETH(position.amount)} ${symbol[tokenIndex]} @${lastPrice[1] / pricePrecision}`)
    console.log(`💸 realize P/L ${position.realizeAsProfit ? '+' : '-'}${position.realizePL / pricePrecision}`)
  })

  it('Position: 2 | BNB | Open Position', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2] = await ethers.getSigners()

    const beforeFundBalance = await weth.balanceOf(simpleTrade.address)
    const beforeRelayNodeBalance = await weth.balanceOf(relayNode.address)

    // 1 open position (30 BNB)
    const positionId = 2
    const tokenIndex = 2 // BNB
    const amount = 30
    await simpleTrade.connect(user2).openPosition(tokenIndex, toWei(amount))

    // 2 simulate relayNode fulfill request
    var prices = pricelist[0]
    await relayNodeFulfill(relayNode, prices, 1.5) // slippage 1.5%

    // 3 check result
    const position = await simpleTrade.getPosition(positionId)
    const lastPrice = await xOracle.getLastPrice(tokenIndex)

    // 4 check fund balance
    const fundBalance = await weth.balanceOf(simpleTrade.address)
    const relayNodeBalance = await weth.balanceOf(relayNode.address)

    expect(position.owner).eq(user2.address)
    expect(position.tokenIndex).eq(tokenIndex)
    expect(position.entryPrice).eq(lastPrice[1])
    expect(position.amount).eq(toWei(amount))
    expect(position.status).eq(2) // 2 = open
    expect(beforeFundBalance.sub(fundBalance)).to.eq(relayNodeBalance.sub(beforeRelayNodeBalance))

    console.log(`🟢 open position ${toETH(position.amount)} ${symbol[tokenIndex]} @${position.entryPrice / pricePrecision}`)
  })

  it('Position: 2 | BNB | Close Position (maybe Profit or Loss)', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2] = await ethers.getSigners()

    const beforeFundBalance = await weth.balanceOf(simpleTrade.address)
    const beforeRelayNodeBalance = await weth.balanceOf(relayNode.address)

    // 1 close position (position size 100%)
    const positionId = 2
    const tokenIndex = 2 // BNB
    await simpleTrade.connect(user2).closePosition(positionId)

    // 2 simulate relayNode fulfill request
    const prices = pricelist[0] // pricelist set 0 (as same open position)
    await relayNodeFulfill(relayNode, prices, 1.5) // slippage 1.5%

    // 3 check result
    const position = await simpleTrade.getPosition(positionId)
    const lastPrice = await xOracle.getLastPrice(tokenIndex)
    const isProfit = lastPrice[1] - position.entryPrice > 0

    // 4 check fund balance
    const fundBalance = await weth.balanceOf(simpleTrade.address)
    const relayNodeBalance = await weth.balanceOf(relayNode.address)

    expect(position.owner).eq(user2.address)
    expect(position.tokenIndex).eq(tokenIndex)
    expect(position.realizeAsProfit).eq(isProfit)
    expect(position.realizePL).eq(Math.abs(lastPrice[1] - position.entryPrice) * toETH(position.amount))
    expect(position.status).eq(3) // 3 = close
    expect(beforeFundBalance.sub(fundBalance)).to.eq(relayNodeBalance.sub(beforeRelayNodeBalance))

    console.log(`🔴 close position ${toETH(position.amount)} ${symbol[tokenIndex]} @${lastPrice[1] / pricePrecision}`)
    console.log(`💸 realize P/L ${position.realizeAsProfit ? '+' : '-'}${position.realizePL / pricePrecision}`)
  })

  it('Cannot Open Position: refundRequest', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2, user3] = await ethers.getSigners()

    const beforeFundBalance = await weth.balanceOf(simpleTrade.address)
    const beforeRelayNodeBalance = await weth.balanceOf(relayNode.address)

    // 1 open position (30 BNB)
    const tokenIndex = 2 // BNB
    const amount = 30
    await simpleTrade.connect(user3).openPosition(tokenIndex, toWei(amount))

    // 2 simulate relayNode refundRequest
    const reqID = await xOracle.reqId() // last reqId (assume only one used)
    await xOracle.connect(relayNode).refundRequest(reqID)

    // 3 check fund balance
    const fundBalance = await weth.balanceOf(simpleTrade.address)
    const relayNodeBalance = await weth.balanceOf(relayNode.address)

    expect(beforeFundBalance.sub(fundBalance)).to.eq(relayNodeBalance.sub(beforeRelayNodeBalance))
  })

  it('Test getPositionsByOwner', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2] = await ethers.getSigners()

    const user1Positions = await simpleTrade.getPositions(user1.address)
    const user2Positions = await simpleTrade.getPositions(user2.address)

    user1Positions.forEach((position) => {
      expect(position.owner).eq(user1.address)
    })

    user2Positions.forEach((position) => {
      expect(position.owner).eq(user2.address)
    })

    expect(user1Positions.length).to.be.equal(1)
    expect(user2Positions.length).to.be.equal(2)
  })
})

function makeSigner(total) {
  for (i = 0; i < total; i++) {
    const privateKey = crypto.randomBytes(32).toString('hex')
    const wallet = new ethers.Wallet(privateKey)
    console.log(`signer ${i + 1} Address: ${wallet.address}`)
    signers[i] = {
      privateKey: privateKey,
      publicAddress: wallet.address,
    }
  }
}

function makePricelist() {
  pricelist[0] = [
    { tokenIndex: 0, price: 16587.135 },
    { tokenIndex: 1, price: 1218.95 },
    { tokenIndex: 2, price: 316.8 },
  ]
  pricelist[1] = [
    { tokenIndex: 0, price: 16611.25 },
    { tokenIndex: 1, price: 1222.1 },
    { tokenIndex: 2, price: 315.9 },
  ]
  pricelist[2] = [
    { tokenIndex: 0, price: 16600.02 },
    { tokenIndex: 1, price: 1223.22 },
    { tokenIndex: 2, price: 317.15 },
  ]
  pricelist[3] = [
    { tokenIndex: 0, price: 16248.38 },
    { tokenIndex: 1, price: 1148.925 },
    { tokenIndex: 2, price: 302.211 },
  ]
  pricelist[4] = [
    { tokenIndex: 0, price: 17020.226 },
    { tokenIndex: 1, price: 1254.117 },
    { tokenIndex: 2, price: 325.11 },
  ]
  pricelist[5] = [
    { tokenIndex: 0, price: 15912.325 },
    { tokenIndex: 1, price: 1129.33 },
    { tokenIndex: 2, price: 297.3 },
  ]
}

async function getRequest(reqID) {
  const request = await xOracle.getRequest(reqID)
  return {
    timestamp: request[0],
    owner: request[1],
    payload: request[2],
    status: request[3],
    expiration: request[4],
    paymentAvailable: request[5],
  }
}

// simulate relayNode fulfill from request
async function relayNodeFulfill(relayNode, prices, slippage = 0, checkLastPrice = true) {
  var accumPrices = {}

  // simulate: next block time 10 sec
  await helpers.time.increase(10)

  // simulate: received emit request
  const reqID = await xOracle.reqId() // last reqId (assume only one used)
  const request = await getRequest(reqID)
  const timestamp = request.timestamp.toString()

  const data = await Promise.all(
    await signers.map(async (signer) => {
      // make price spliage
      const priceSlippage = randomPriceSlippage(prices, slippage)

      // for expect test
      if (checkLastPrice) {
        priceSlippage.forEach((p) => {
          accumPrices[p.tokenIndex] = (accumPrices[p.tokenIndex] || 0) + p.price
        })
      }

      return makePricefeed(signer, timestamp, priceSlippage)
    })
  )

  const call = await xOracle.connect(relayNode).fulfillRequest(data, reqID)

  if (checkLastPrice) {
    // find mean price for expect test
    await Object.keys(accumPrices).forEach(async (tokenIndex) => {
      const meanPrice = accumPrices[tokenIndex] / signers.length
      const lastPrice = await xOracle.getLastPrice(tokenIndex)

      expect(Math.abs(lastPrice[1] - adjustPrice(meanPrice))).lessThan(2)
      expect(lastPrice[2]).eq(timestamp)
    })
  }

  return call
}

function randomPriceSlippage(prices, maxPercent) {
  // maxPercent: 0 - 100
  return prices.map((p) => {
    const random = Math.floor(Math.random() * maxPercent)
    const percent = random / 100
    return {
      tokenIndex: p.tokenIndex,
      price: p.price * (1 + percent),
    }
  })
}

async function makePricefeed(signer, timestamp, price) {
  const priceHex = pricesToHexString(price)

  // hash
  messageHash = ethers.utils.solidityKeccak256(['uint256', 'bytes'], [timestamp, priceHex])

  // sign
  const wallet = new ethers.Wallet(signer.privateKey)
  const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash)) // 65 bytes

  return {
    timestamp: timestamp,
    signer: signer.publicAddress,
    signature: signature,
    prices: priceHex,
  }
}

function pricesToHexString(prices) {
  var result = ''
  for (i = 0; i < prices.length; i++) {
    result += prices[i].tokenIndex.toString(16).padStart(4, '0')
    result += adjustPrice(prices[i].price).toString(16).padStart(12, '0')
  }
  return '0x' + result
}

function adjustPrice(price) {
  return Math.floor(price * 10 ** 8)
}
