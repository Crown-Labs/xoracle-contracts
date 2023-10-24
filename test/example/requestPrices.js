const { expect } = require('chai')
const helpers = require('@nomicfoundation/hardhat-network-helpers')
const crypto = require('crypto')

const tokenIndexs = {
  BTC: 0,
  ETH: 1,
  BNB: 2,
  USDT: 3,
  BUSD: 4,
  USDC: 5,
  DOGE: 6,
}

let pricelist = []
let signers = []
let xOracle
let weth
let requestPrices
const fulfillFee = 3000 // 30%
const minFeeBalance = 0.02 * 10 ** 9

describe('\n📌 ### Test Example: Request Prices ###\n', function () {
  before('Initial data', async function () {
    console.log('👻 make signers')
    makeSigner(3)

    console.log('👻 make price list')
    makePricelist()
  })

  before('Deploy XOracle Contract', async function () {
    const [deployer, proxyAdmin, relayNode] = await ethers.getSigners()

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
    const usdtPriceFeed = await PriceFeedStore.deploy(xOracle.address, 'USDT/USD Price Feed', tokenIndexs.USDT, 8)
    const busdPriceFeed = await PriceFeedStore.deploy(xOracle.address, 'BUSD/USD Price Feed', tokenIndexs.BUSD, 8)
    const usdcPriceFeed = await PriceFeedStore.deploy(xOracle.address, 'USDC/USD Price Feed', tokenIndexs.USDC, 8)
    const dogePriceFeed = await PriceFeedStore.deploy(xOracle.address, 'DOGE/USD Price Feed', tokenIndexs.DOGE, 8)

    await xOracle.setPriceFeedStore(btcPriceFeed.address, tokenIndexs.BTC)
    await xOracle.setPriceFeedStore(ethPriceFeed.address, tokenIndexs.ETH)
    await xOracle.setPriceFeedStore(bnbPriceFeed.address, tokenIndexs.BNB)
    await xOracle.setPriceFeedStore(usdtPriceFeed.address, tokenIndexs.USDT)
    await xOracle.setPriceFeedStore(busdPriceFeed.address, tokenIndexs.BUSD)
    await xOracle.setPriceFeedStore(usdcPriceFeed.address, tokenIndexs.USDC)
    await xOracle.setPriceFeedStore(dogePriceFeed.address, tokenIndexs.DOGE)

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

  before('Deploy RequestPrices Contract', async function () {
    const [deployer, proxyAdmin, relayNode] = await ethers.getSigners()

    const RequestPrices = await ethers.getContractFactory('RequestPrices')
    requestPrices = await RequestPrices.deploy(xOracle.address, weth.address)

    // deposit reqFee
    await weth.deposit({ value: ethers.utils.parseEther('1.0') })
    await weth.transfer(requestPrices.address, ethers.utils.parseEther('1.0')) // Sends 1.0 WETH
  })

  it('requestPrices and getPrices', async function () {
    const [deployer, proxyAdmin, relayNode] = await ethers.getSigners()

    // 1 send requestPrices
    await requestPrices.requestPrices()

    // 2 simulate relayNode fulfill request
    const prices = pricelist[random(2)] // pricelist 0, 1, 2
    await relayNodeFulfill(relayNode, prices) // no slippage

    // 3 check result
    for (const [symbol, tokenIndex] of Object.entries(tokenIndexs)) {
      const price = await requestPrices.getPrice(tokenIndex)
      const lastPrice = await xOracle.getLastPrice(tokenIndex)

      expect(price).eq(adjustPrice(prices[tokenIndex].price))
      expect(price).eq(lastPrice[1])
    }
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
    { tokenIndex: 3, price: 1.0001 },
    { tokenIndex: 4, price: 1.0001 },
    { tokenIndex: 5, price: 1.0001 },
    { tokenIndex: 6, price: 0.0664 },
  ]
  pricelist[1] = [
    { tokenIndex: 0, price: 16611.25 },
    { tokenIndex: 1, price: 1222.1 },
    { tokenIndex: 2, price: 315.9 },
    { tokenIndex: 3, price: 1.0005 },
    { tokenIndex: 4, price: 0.999 },
    { tokenIndex: 5, price: 1.0 },
    { tokenIndex: 6, price: 0.0634 },
  ]
  pricelist[2] = [
    { tokenIndex: 0, price: 16600.02 },
    { tokenIndex: 1, price: 1223.22 },
    { tokenIndex: 2, price: 317.15 },
    { tokenIndex: 3, price: 0.99 },
    { tokenIndex: 4, price: 0.989 },
    { tokenIndex: 5, price: 0.998 },
    { tokenIndex: 6, price: 0.07 },
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

function random(max) {
  return Math.floor(Math.random() * max)
}
