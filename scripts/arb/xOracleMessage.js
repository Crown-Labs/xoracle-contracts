const { deployContract, contractAt, getContractAddress, sendTxn, getFrameSigner } = require('../lib/deploy')
const { config } = require('../../config')
const readline = require('readline')

async function main() {
  let deployer = await getFrameSigner()
  const xOracleOwner = config.xOracleOwner
  const proxyAdmin = config.proxyAdmin
  const relayNodes = config.relayNodes
  const messengerSigners = config.messengerSigners
  const feeReceiver = config.feeReceiver
  const threshold = 3

  let xOracleMessage
  let feeController

  // false = new deploy all contracts
  // true = migrate to new xOracle logic
  const isMigrate = false

  // deploy logic
  const xOracleMessage_logic = await deployContract('XOracleMessage', [], 'XOracleMessage_logic', deployer)
  // const xOracleMessage_logic = await contractAt("XOracleMessage", getContractAddress("xOracleMessage_logic"), deployer);
  // xOracleMessage = await contractAt('XOracleMessage', getContractAddress('xOracleMessage'), deployer);

  // xOracleMessage
  if (!isMigrate) {
    // deploy feeController
    feeController = await deployContract('FeeController', [], 'FeeController', deployer)

    // deploy proxy
    const xOracleMessage_proxy = await deployContract('AdminUpgradeabilityProxy', [xOracleMessage_logic.address, proxyAdmin, '0x'], 'XOracleMessage', deployer)
    // const xOracleMessage_proxy = await contractAt("XOracleMessage", getContractAddress("xOracleMessage"), deployer);

    // initialize
    xOracleMessage = await contractAt('XOracleMessage', xOracleMessage_proxy.address, deployer)
    await sendTxn(await xOracleMessage.initialize(feeController.address, feeReceiver), `xOracleMessage.initialize(${feeController.address}, ${feeReceiver})`)
  } else {
    // for upgrade proxy
    xOracleMessage = await contractAt('XOracleMessage', getContractAddress('xOracleMessage'), deployer)
    feeController = await contractAt('FeeController', getContractAddress('feeController'), deployer)

    // switch to proxyAdmin
    await switchSigner(proxyAdmin)
    // use frame signer and reload deployer
    const proxyAdminSigner = await getFrameSigner()

    // proxy upgrade new logic
    const xOracleMessage_proxy = await contractAt('AdminUpgradeabilityProxy', getContractAddress('xOracleMessage'), proxyAdminSigner)
    await sendTxn(xOracleMessage_proxy.upgradeTo(xOracle_logic.address), `xOracleMessage.upgradeTo(${xOracle_logic.address})`)

    // switch to deployer
    await switchSigner(`deployer`)
    // use frame signer and reload deployer
    deployer = await getFrameSigner()
  }

  // set signer
  for (let i = 0; i < messengerSigners.length; i++) {
    await sendTxn(xOracleMessage.setSigner(messengerSigners[i], true), `xOracleMessage.setSigner(${messengerSigners[i]})`)
  }
  await sendTxn(xOracleMessage.setThreshold(threshold), `xOracle.setThreshold(${threshold})`)

  // set controller
  for (let i = 0; i < relayNodes.length; i++) {
    await sendTxn(xOracleMessage.setController(relayNodes[i], true), `xOracleMessage.setController(${relayNodes[i]})`)
  }

  // transfer ownership
  if (!isMigrate) {
    await sendTxn(xOracleMessage.transferOwnership(xOracleOwner), `xOracleMessage.transferOwnership(${xOracleOwner})`)
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
