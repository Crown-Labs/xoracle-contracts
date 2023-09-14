const { ethers } = require('ethers')
const fetch = require('node-fetch')

function toETH(wei) {
  return ethers.utils.formatEther(wei)
}

function toWei(eth) {
  return ethers.utils.parseUnits(eth.toString(), 'ether')
}

function getTimestamp() {
  return Math.floor(new Date().getTime() / 1000)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getchURL(url) {
  return fetch(url).then((res) => res.text())
}

async function getJSONRequest(url) {
  return JSON.parse(await getchURL(url))
}

function getProvider(rpc) {
  return new ethers.providers.JsonRpcProvider(rpc)
}

function getWeb3(rpc) {
  return new Web3(rpc)
}

function getSigner(privateKey, rpc) {
  const provider = getProvider(rpc)
  const signer = new ethers.Wallet(privateKey, provider)
  return signer
}

module.exports = {
  toETH,
  toWei,
  getTimestamp,
  sleep,
  getJSONRequest,
  getProvider,
  getWeb3,
  getSigner,
}
