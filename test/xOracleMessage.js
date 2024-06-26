const { expect } = require('chai')
const crypto = require('crypto')
const { ethers } = require('hardhat')

const abiCoder = new ethers.utils.AbiCoder()
const chainIdBSC = 56
const chainIdHardHat = 31337

const amount = expandDecimals(1, 18)
const fee = expandDecimals(1, 16)

let signers = []
let feeController
let xOracleMessage
let xOracleMessage_logic
let xOracleMessage_proxy

describe('\n📌 ### Test xOracle Message ###\n', function () {
  before('Initial data', async function () {
    console.log('👻 make signers')
    makeSigner(3)
  })

  beforeEach('Deploy XOracleMessage Contract', async function () {
    const [deployer, proxyAdmin, relayNode, feeReceiver] = await ethers.getSigners()

    // deploy feeController
    const FeeController = await ethers.getContractFactory('FeeController')
    feeController = await FeeController.deploy()

    // deploy logic
    const XOracleMessage = await ethers.getContractFactory('XOracleMessage')
    xOracleMessage_logic = await XOracleMessage.deploy()

    // deploy proxy
    const AdminUpgradeabilityProxy = await ethers.getContractFactory('AdminUpgradeabilityProxy')
    xOracleMessage_proxy = await AdminUpgradeabilityProxy.deploy(xOracleMessage_logic.address, proxyAdmin.address, '0x')

    // initialize
    xOracleMessage = await XOracleMessage.attach(xOracleMessage_proxy.address)
    await xOracleMessage.initialize(feeController.address, feeReceiver.address)

    await xOracleMessage.setController(relayNode.address, true)

    // deploy wrapSendMessage
    const WrapSendMessage = await ethers.getContractFactory('WrapSendMessage')
    wrapSendMessage = await WrapSendMessage.deploy(xOracleMessage.address)

    // add signer
    for (i = 0; i < signers.length; i++) {
      await xOracleMessage.setSigner(signers[i].publicAddress, true)
    }

    // deploy TestFulfillMessage
    const TestFulfillMessage = await ethers.getContractFactory('TestFulfillMessage')
    testFulfillMessage = await TestFulfillMessage.deploy(xOracleMessage.address)
  })

  it('Test onlyOwner', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2] = await ethers.getSigners()
    const account = [relayNode, user1, user2].at(random(3))

    const revert = 'Ownable: caller is not the owner'
    await expect(xOracleMessage.connect(account).setSigner(account.address, true)).to.be.revertedWith(revert)
    await expect(xOracleMessage.connect(account).setPause(true)).to.be.revertedWith(revert)
    await expect(xOracleMessage.connect(account).setController(account.address, true)).to.be.revertedWith(revert)
    await expect(xOracleMessage.connect(account).setThreshold(1)).to.be.revertedWith(revert)
    await expect(xOracleMessage.connect(account).setWhitelist(account.address, true)).to.be.revertedWith(revert)
    await expect(xOracleMessage.connect(account).setOnlyWhitelist(true)).to.be.revertedWith(revert)
  })

  it('Test onlyController', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2] = await ethers.getSigners()
    const account = [deployer, user1, user2].at(random(3))
    const {AddressZero} = ethers.constants

    const revert = 'controller: forbidden'
    const params = [0, 0x00, '0xffffffffffffffffffffffffffffffffffffffff', 0, 0, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', []]
    await expect(xOracleMessage.connect(account).fulfillMessage(...params)).to.be.revertedWith(revert)

    // setController AddressZero
    await expect(xOracleMessage.setController(AddressZero, true)).to.be.revertedWith('invalid address')
    // setController false
    await xOracleMessage.setController(relayNode.address, false)
    await expect(xOracleMessage.connect(relayNode).fulfillMessage(...params)).to.be.revertedWith(revert)

    // setController true
    await xOracleMessage.setController(relayNode.address, true)
  })

  it('Test onlyContract', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2] = await ethers.getSigners()
    const account = [deployer, relayNode, user1, user2].at(random(4))

    const revert = 'caller: only contract'
    const params = [0x00, '0xffffffffffffffffffffffffffffffffffffffff', 0]
    await expect(xOracleMessage.connect(account).sendMessage(...params)).to.be.revertedWith(revert)
  })

  it('Test Signer', async function () {
    const {AddressZero} = ethers.constants
    // check signer
    for (i = 0; i < signers.length; i++) {
      await expect(await xOracleMessage.signers(signers[i].publicAddress)).eq(true)
    }
    await expect(await xOracleMessage.totalSigner()).to.eq(signers.length)

    // remove signer
    for (i = 0; i < signers.length; i++) {
      await xOracleMessage.setSigner(signers[i].publicAddress, false)
      await expect(await xOracleMessage.signers(signers[i].publicAddress)).eq(false)
    }
    await expect(await xOracleMessage.totalSigner()).to.eq(0)
    await expect(xOracleMessage.setSigner(AddressZero, true)).to.be.revertedWith('invalid address')

    // add signer again
    for (i = 0; i < signers.length; i++) {
      await xOracleMessage.setSigner(signers[i].publicAddress, true)
    }
    await expect(await xOracleMessage.totalSigner()).to.eq(signers.length)

    // setThreshold
    await expect(await xOracleMessage.threshold()).eq(0)
    await xOracleMessage.setThreshold(2)
    await expect(await xOracleMessage.threshold()).eq(2)
    await expect(xOracleMessage.setThreshold(4)).to.be.revertedWith('invalid threshold')
  })

  it('Test setWhitelist, setFeeController, setFeeReceiver', async function () {
    const {AddressZero} = ethers.constants

    await expect(xOracleMessage.setWhitelist(AddressZero, true)).to.be.revertedWith('invalid address')
    await expect(xOracleMessage.setFeeController(AddressZero)).to.be.revertedWith('invalid address')
    await expect(xOracleMessage.setFeeReceiver(AddressZero)).to.be.revertedWith('invalid address')

  });

  it('Test sendMessage', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2, endpoint] = await ethers.getSigners()
    const account = [deployer, user1, user2].at(random(3))
    const {AddressZero} = ethers.constants

    // send message from hardhat to bsc
    let payload = abiCoder.encode([],[])
  
    await xOracleMessage.setOnlyWhitelist(true)

    await expect(wrapSendMessage.connect(user2).sendMessage(payload, AddressZero, chainIdHardHat, { value: 0 }))
    .to.be.revertedWith('whitelist: forbidden')

    await xOracleMessage.setWhitelist(wrapSendMessage.address, true)
    
    await expect(wrapSendMessage.connect(user2).sendMessage(payload, AddressZero, chainIdHardHat, { value: 0 }))
    .to.be.revertedWith('invalid payload')

    payload = encodePayload(1, amount, chainIdHardHat, chainIdBSC, user2.address, user2.address)

    await expect(wrapSendMessage.connect(user2).sendMessage(payload, AddressZero, chainIdHardHat, { value: 0 }))
    .to.be.revertedWith('invalid endpoint')

    await expect(wrapSendMessage.connect(user2).sendMessage(payload, endpoint.address, chainIdHardHat, { value: 0 }))
    .to.be.revertedWith('invalid dstChainId')

    await feeController.setFee(chainIdBSC, expandDecimals(1, 16))

    await expect(wrapSendMessage.connect(user2).sendMessage(payload, endpoint.address, chainIdBSC, { value: 0 }))
    .to.be.revertedWith('insufficient fee')

    // check balance feeReceiver before send message
    const balanceBefore = await ethers.provider.getBalance(await xOracleMessage.feeReceiver())

    await wrapSendMessage.connect(user2).sendMessage(payload, endpoint.address, chainIdBSC, { value: fee })

    // check balance feeReceiver after send message
    const balanceAfter = await ethers.provider.getBalance(await xOracleMessage.feeReceiver())
    expect(balanceAfter.sub(balanceBefore)).eq(fee)
  });

  it('Test fulfillMessage', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2, endpoint] = await ethers.getSigners()
    const account = [deployer, user1, user2].at(random(3))
    const {AddressZero} = ethers.constants

    let payload = abiCoder.encode([],[])

    const nonce = 1
    const srcTxHash = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'

    expect(await xOracleMessage.totalSigner()).to.eq(3)
    expect(await xOracleMessage.threshold()).to.eq(0)

    // bsc to hardhat
    await xOracleMessage.setController(relayNode.address, true)

    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, AddressZero, chainIdHardHat, chainIdHardHat, srcTxHash, []))
    .to.be.revertedWith('invalid payload')

    payload = encodePayload(1, amount, chainIdBSC, chainIdHardHat, user2.address, user2.address)

    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, AddressZero, chainIdHardHat, chainIdHardHat, srcTxHash, []))
    .to.be.revertedWith('invalid endpoint')

    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdHardHat, chainIdHardHat, srcTxHash, []))
    .to.be.revertedWith('invalid chainId')

    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdHardHat, chainIdBSC, srcTxHash, []))
    .to.be.revertedWith('invalid dstChainId')

    await xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [])

    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, []))
    .to.be.revertedWith('messageHash already fulfilled')
  });

  it('Test verifySignatures', async function () {
    const [deployer, proxyAdmin, relayNode, user1, user2, endpoint, signer1, signer2, signer3] = await ethers.getSigners()
    const account = [deployer, user1, user2].at(random(3))
    const {AddressZero} = ethers.constants

    // remove all signer
    for (i = 0; i < signers.length; i++) {
      await xOracleMessage.setSigner(signers[i].publicAddress, false)
      await expect(await xOracleMessage.signers(signers[i].publicAddress)).eq(false)
    }
    
    // signer sign message
    let nonce = 1
    const srcTxHash = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    const payload = encodePayload(nonce, amount, chainIdBSC, chainIdHardHat, user2.address, user2.address)
    const messageHash = getMessageHash(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash)
    const signatureSigner1 = await signer1.signMessage(ethers.utils.arrayify(messageHash))
    const signatureSigner2 = await signer2.signMessage(ethers.utils.arrayify(messageHash))
    const signatureSigner3 = await signer3.signMessage(ethers.utils.arrayify(messageHash))
    const signatureUser1 = await user1.signMessage(ethers.utils.arrayify(messageHash))

    await xOracleMessage.setController(relayNode.address, true)

    const revertDuplicate = "signer duplicate"
    const revertThreshold = "signers under threshold"

    expect(await xOracleMessage.totalSigner()).to.eq(0)
    expect(await xOracleMessage.threshold()).to.eq(0)
    
    // set threshold before set signer
    await expect(xOracleMessage.setThreshold(1)).to.be.revertedWith("invalid threshold")

    // set signer = 1 and set threshold = 1
    await xOracleMessage.setSigner(signer1.address, true)
    await xOracleMessage.setThreshold(1)

    // fulfill with 0 signature
    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, []))
    .to.be.revertedWith(revertThreshold)
    
    // fulfill with another messageHash 
    // nonce = 2
    await expect(xOracleMessage.connect(relayNode).fulfillMessage(2, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureSigner1]))
    .to.be.revertedWith(revertThreshold)

    // payload = 0
    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, 0, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureSigner1]))
    .to.be.revertedWith(revertThreshold)

    // endpoint = user2
    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, user2.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureSigner1]))
    .to.be.revertedWith(revertThreshold)

    // srcChainId = 0
    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, 0, chainIdHardHat, srcTxHash, [signatureSigner1]))
    .to.be.revertedWith(revertThreshold)

    // srcTxHash = 0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", [signatureSigner1]))
    .to.be.revertedWith(revertThreshold)

    // fulfill with signature non-signer
    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureUser1]))
    .to.be.revertedWith(revertThreshold)
    
    // fulfill with 2 signature non-signer
    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureUser1, signatureSigner2]))
    .to.be.revertedWith(revertThreshold)

    // set signer = 2 and set threshold = 2
    await xOracleMessage.setSigner(signer2.address, true)
    await xOracleMessage.setThreshold(2)

    // fulfill with 1 signature
    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureSigner1]))
    .to.be.revertedWith(revertThreshold)

    // fulfill with 1 signature and 1 signature non-signer
    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureUser1, signatureSigner1]))
    .to.be.revertedWith(revertThreshold)

    // signer2 sign different messageHash (nonce = 2)
    const payload2 = encodePayload(2, amount, chainIdBSC, chainIdHardHat, user2.address, user2.address)
    const messageHash2 = getMessageHash(2, payload2, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash)
    const signatureSigner2Nonce2 = await signer2.signMessage(ethers.utils.arrayify(messageHash2))

    const signer2Address = await recoverSigner(messageHash2, signatureSigner2Nonce2);
    await expect(signer2Address).to.eq(signer2.address)

    // fulfill with 1 signature and 1 signature sign different messageHash (nonce = 2)
    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureSigner1, signatureSigner2Nonce2]))
    .to.be.revertedWith(revertThreshold)
    
    // set signer = 3 and set threshold = 3
    await xOracleMessage.setSigner(signer3.address, true)
    await xOracleMessage.setThreshold(3)

    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureSigner1, signatureSigner2Nonce2, signatureSigner2Nonce2, signatureSigner3]))
    .to.be.revertedWith(revertThreshold)

    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureSigner1, signatureSigner2, signatureSigner1, signatureSigner2Nonce2]))
    .to.be.revertedWith(revertDuplicate)

    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureSigner1, signatureSigner2, signatureSigner3, signatureSigner1, signatureSigner2Nonce2, signatureSigner2Nonce2]))
    .to.be.revertedWith(revertDuplicate)
    
    // fulfill with 3 signature
    await xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureSigner1, signatureSigner2, signatureSigner3])

    expect(await xOracleMessage.totalSigner()).to.eq(3)
    expect(await xOracleMessage.threshold()).to.eq(3)
    expect(await xOracleMessage.fulfillMessageHashes(messageHash)).to.eq(true)
    expect(await xOracleMessage.fulfillCount()).to.eq(1)

    await expect(xOracleMessage.connect(relayNode).fulfillMessage(nonce, payload, endpoint.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureSigner1, signatureSigner2, signatureSigner3]))
    .to.be.revertedWith('messageHash already fulfilled')

    const payloadNonce3 = abiCoder.encode(
      ['address', 'uint256'],
      [user1.address, expandDecimals(1, 18)]
    )
    nonce = 3
    const messageHash3 = getMessageHash(nonce, payloadNonce3, testFulfillMessage.address, chainIdBSC, chainIdHardHat, srcTxHash)
    const signatureSigner1Nonce3 = await signer1.signMessage(ethers.utils.arrayify(messageHash3))
    const signatureSigner2Nonce3 = await signer2.signMessage(ethers.utils.arrayify(messageHash3))
    const signatureSigner3Nonce3 = await signer3.signMessage(ethers.utils.arrayify(messageHash3))

    expect(await testFulfillMessage.getBalance(user1.address)).to.eq(0)

    await xOracleMessage.connect(relayNode).fulfillMessage(nonce, payloadNonce3, testFulfillMessage.address, chainIdBSC, chainIdHardHat, srcTxHash, [signatureSigner1Nonce3, signatureSigner2Nonce3, signatureSigner3Nonce3])
    
    expect(await testFulfillMessage.getBalance(user1.address)).to.eq(expandDecimals(1, 18))
  });
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

function random(max) {
  return Math.floor(Math.random() * max)
}

function bigNumberify(n) {
  return ethers.BigNumber.from(n)
}

function expandDecimals(n, decimals) {
  return bigNumberify(n).mul(bigNumberify(10).pow(decimals))
}

function encodePayload(uid, amount, srcChainId, dstChainId, from, receiver) {
  const encodedData = abiCoder.encode(
    ['uint256', 'uint256', 'uint64', 'uint64', 'address', 'address'],
    [uid, amount, srcChainId, dstChainId, from, receiver]
  )
  return encodedData;
}

function getMessageHash(nonce, payload, endpoint, srcChainId, dstChainId, srcTxHash) {
  const encodedData = abiCoder.encode(
    ['uint256', 'bytes', 'address', 'uint256', 'uint256', 'bytes32'],
    [nonce, payload, endpoint, srcChainId, dstChainId, srcTxHash]
  )
  return ethers.utils.keccak256(encodedData)
}

function recoverSigner(messageHash, signature) {
  if (signature.substring(0, 2) != "0x") {
    signature = "0x" + signature;
  }
  // recover
  const signPublicAddress = ethers.utils.verifyMessage(
    ethers.utils.arrayify(messageHash),
    signature
  );
  return signPublicAddress;
}