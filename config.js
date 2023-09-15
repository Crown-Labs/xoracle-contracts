const networkId = {
  lineaTestnet: 59140,
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
  relayNodes: ['0x9642955e650f8F380e9e5f978C910D684b7a0805', '0xE49EE57521a4eDF93Cb62013CF5B263660b3dD79'],
  // tokens
  tokens: {
    59140: {
      // lineaTestnet
      weth: '0x2C1b868d6596a18e32E61B901E4060C872647b6C',
    },
  },
  // api
  pricefeedApi: 'https://api.xoracle.io/prices/pricefeed/',
}

module.exports = { networkId, config }
