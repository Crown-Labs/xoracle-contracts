const networkId = {

}

const tokenIndexes = {
  // Default xOracle Pricefeed
  BTC: 0,
  ETH: 1,
  BNB: 2,
  USDT: 3,
  USDC: 5,

  // Additional for Ethernal Passive Yield Token
  EBTC: 100,
  EETH: 101,
  EBNB: 102,
  EUSDT: 103,
  EUSDC: 105,
}

const config = {
  // wallet
  proxyAdmin: '0xdDd982ea649D6aeEbF2Cc68fe4c2EB953330363f',
  pricefeedSigners: [
    '0x866739f5308D27B091445f6A0E10b29539aB6123',
    '0xa2694632465dffEb3194ad919Ac7E6366b7A67E9',
    '0x78a3421C4f2755CBaFe54d65856F9Dc223c3D42b',
    '0x3018A56c5cD12281C7E1C544Dba26492daE06601',
  ],
  messengerSigners: [
    '0x8aE234f7d0Fdcd3E8D1AF2cc4BDc8bA218B498a7',
    '0x93857FD9d5b549316558d344d55bE01108d81f33',
    '0x3Cb7932d92125b2B3542BEC14829Dcd962Cf38a0',
  ],
  relayNodes: ['0x9642955e650f8F380e9e5f978C910D684b7a0805', '0xE49EE57521a4eDF93Cb62013CF5B263660b3dD79'],
  feeReceiver: '0xdDd982ea649D6aeEbF2Cc68fe4c2EB953330363f',
  // tokens
  tokens: {
  },
  // api
  pricefeedApi: 'https://api.xoracle.io/prices/pricefeed/',
}

module.exports = { networkId, config, tokenIndexes }
