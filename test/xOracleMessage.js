const { expect } = require('chai')
const helpers = require('@nomicfoundation/hardhat-network-helpers')
const crypto = require('crypto')
const { ethers } = require('hardhat')
const { toETH } = require('../scripts/lib/helper.js')

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

    // add signer
    for (i = 0; i < signers.length; i++) {
      await xOracleMessage.setSigner(signers[i].publicAddress, true)
    }
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

    const revert = 'controller: forbidden'
    const params = [0, 0x00, '0xffffffffffffffffffffffffffffffffffffffff', 0, 0, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', []]
    await expect(xOracleMessage.connect(account).fulfillMessage(...params)).to.be.revertedWith(revert)

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

    // add signer again
    for (i = 0; i < signers.length; i++) {
      await xOracleMessage.setSigner(signers[i].publicAddress, true)
    }

    // setThreshold
    await expect(await xOracleMessage.threshold()).eq(0)
    await xOracleMessage.setThreshold(2)
    await expect(await xOracleMessage.threshold()).eq(2)
    await expect(xOracleMessage.setThreshold(4)).to.be.reverted
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

function random(max) {
  return Math.floor(Math.random() * max)
}
