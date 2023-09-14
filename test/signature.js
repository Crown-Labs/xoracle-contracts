const { expect } = require('chai')

let testSignature
let publicAddress
let timestamp
let prices
let priceHex
let messageHash
let signature

describe('\n📌 ### Test Sign signature ###\n', function () {
  beforeEach('Deploy Contract', async function () {
    const TestSignature = await ethers.getContractFactory('TestSignature')
    testSignature = await TestSignature.deploy()
  })

  it('Sign message', async function () {
    const [owner] = await ethers.getSigners()
    publicAddress = owner.address

    timestamp = markdown(getTimestamp())
    prices = [
      { tokenIndex: 0, price: 16587.135 },
      { tokenIndex: 1, price: 1218.95 },
      { tokenIndex: 2, price: 316.8 },
    ]
    priceHex = pricesToHexString(prices)

    console.log(`🔑 public address: ${publicAddress}`)
    console.log(`💾 timestamp: ${timestamp}`)
    console.log(`💾 priceHex: ${priceHex}`)
    console.log(`---------------------------`)

    // hash
    messageHash = ethers.utils.solidityKeccak256(['uint256', 'bytes'], [timestamp, priceHex])

    // sign
    signature = await owner.signMessage(ethers.utils.arrayify(messageHash)) // 65 bytes

    console.log(`messageHash:`, messageHash)
    console.log(`🔏 signature:`, signature)

    // view sig
    const splitSig = ethers.utils.splitSignature(signature) // r = 32 bytes, s = 32 bytes, v = 1 bytes
    console.log(splitSig)
    console.log(`---------------------------`)
  })

  it('Test getMessageHash', async function () {
    /* function getHash(
            uint256 timestamp,
            bytes memory prices
        ) public pure returns(bytes32) {  */
    const hash = await testSignature.getMessageHash(timestamp, priceHex)
    expect(hash).eq(messageHash)
  })

  it('Test validateSigner', async function () {
    /* function validateSigner(
            uint256 timestamp,
            uint256 tokenIndex,
            uint256 price,
            bytes memory signature
        )  */
    const signPublicKey = await testSignature.validateSigner(timestamp, priceHex, signature)
    console.log(signPublicKey == publicAddress ? '✅' : '❌', ` sign public address: ${signPublicKey}`)

    expect(signPublicKey).eq(publicAddress)
  })

  it('Manual test validateSigner 1', async function () {
    // hardcode
    const _signer = '0xb8C5a3A4DEcdc25c2c2AEd1E11d44EABC7E85d95'
    const _timestamp = '1670411136'
    const _pricesHex = '0x00000187a1f990a00001001c9d6dc0e0000200069ca71780'
    const _signature = '0xd44d9833a6f9ab29554be2280042b6330a760aa090919147428087c39ad08e5270b6ef6cfe0156a31f58f72820324e375181167b5d092c20ae12f5dd1a25f0ca1b'

    const signPublicKey = await testSignature.validateSigner(_timestamp, _pricesHex, _signature)
    console.log(signPublicKey == _signer ? '✅' : '❌', ` recover pricefeed 1 address: ${signPublicKey}`)

    expect(signPublicKey).eq(_signer)
  })

  it('Manual test validateSigner 2', async function () {
    // hardcode
    const _signer = '0x7A5b3937eee49B1a76678B9A4a852aE56E28B2E6'
    const _timestamp = '1670411172'
    const _pricesHex = '0x00000187a489b1600001001c9fcb8700000200069d845820'
    const _signature = '0xc97ac60e8357b065fbadb9b93272bb70fd52259c059e57db8421cd2716be0bc64521cfa5858fd234e1db8fbafc91e936704a200516070ba6be6b14694aea4a521b'

    const signPublicKey = await testSignature.validateSigner(_timestamp, _pricesHex, _signature)
    console.log(signPublicKey == _signer ? '✅' : '❌', ` recover pricefeed 2 address: ${signPublicKey}`)

    expect(signPublicKey).eq(_signer)
  })

  it('Manual test validateSigner 3', async function () {
    // hardcode
    const _signer = '0xeEa9E04c6A9fa6f4685e633991315E2509590c44'
    const _timestamp = '1670411084'
    const _pricesHex = '0x00000187b402dfe00001001ca03df7df000200069d845820'
    const _signature = '0xa2dce13699f4f538f917d6b5e948945423a97c316f6c8d710e6c7b5c512aeb0520ff6e2254c3fd7cbd73e2b0d28e70b4054637a7339baf64e0bf809a9b6fdb621c'

    const signPublicKey = await testSignature.validateSigner(_timestamp, _pricesHex, _signature)
    console.log(signPublicKey == _signer ? '✅' : '❌', ` recover pricefeed 3 address: ${signPublicKey}`)

    expect(signPublicKey).eq(_signer)
  })

  it('Manual test validateSigner null value', async function () {
    // hardcode
    const _signer = '0x0000000000000000000000000000000000000000'
    const _timestamp = '0'
    const _pricesHex = '0x'
    const _signature = '0x'

    expect(testSignature.validateSigner(_timestamp, _pricesHex, _signature)).to.be.revertedWith('ECDSA: invalid signature length')
  })
})

function getTimestamp() {
  return Math.floor(new Date().getTime() / 1000)
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

function markdown(timestamp) {
  return timestamp - (timestamp % 4)
}
