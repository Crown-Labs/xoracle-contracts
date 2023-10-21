# 📜 xOracle Contract
The xOracle contract is an on-chain Oracle provider with multi-chain support.
This contract enables anyone to request price data and fulfill those requests on-chain fastest and securely with multi-signature proofs. Once a request is fulfilled, the price data is stored in PriceFeed, making the latest price readily available on-chain for everyone.

## 🔮 xOracle Chain
The xOracle chain is a public Proof of Authority (POA) blockchain designed to store real-time price feed information. It allows anyone to join the node and verify the transparency of the information feeds.

## 💭 xOracle's Architecture
![xOracle's Architecture](https://github.com/Crown-Labs/xoracle-contracts/blob/main/docs/architecture.png)

##  ⚙️ Local Development
Require node version >= 16.20

Local Setup Steps:
1. git clone https://github.com/Crown-Labs/xoracle-contracts.git
1. Install dependencies: `yarn install` 
1. Compile Contracts: `yarn compile`
1. Run Tests: `yarn test`

## Deployed Contracts

### Linea Testnet
|Contract       | Addresss                                                                                                            |
|:-------------:|:-------------------------------------------------------------------------------------------------------------------:|
|xOracle            |[0xB1CBd1d5A394E6B4BDaA687468266Caf533D9035](https://goerli.lineascan.build/address/0xB1CBd1d5A394E6B4BDaA687468266Caf533D9035)|
|BTC/USD PriceFeed            |[0x3432dD444774c4A88D330EdB127D837072e5cc9e](https://goerli.lineascan.build/address/0x3432dD444774c4A88D330EdB127D837072e5cc9e)|
|ETH/USD PriceFeed            |[0xe767d64F9b37fe809232a7f20304d28F03EED2B1](https://goerli.lineascan.build/address/0xe767d64F9b37fe809232a7f20304d28F03EED2B1)|
|BNB/USD PriceFeed            |[0x0c8b54e305E8CBb9958671a9C02467328EF4c95C](https://goerli.lineascan.build/address/0x0c8b54e305E8CBb9958671a9C02467328EF4c95C)|
|USDT/USD PriceFeed            |[0x4B114D9D36b09FcC71C492C29e7F8796C655A08d](https://goerli.lineascan.build/address/0x4B114D9D36b09FcC71C492C29e7F8796C655A08d)|
|BUSD/USD PriceFeed            |[0x4926B8803db627a3a77687cB9160725c0845Aabb](https://goerli.lineascan.build/address/0x4926B8803db627a3a77687cB9160725c0845Aabb)|
|USDC/USD PriceFeed            |[0xA23902465EC47904b4b53dCD95f2395b45F33E4F](https://goerli.lineascan.build/address/0xA23902465EC47904b4b53dCD95f2395b45F33E4F)|
|MATIC/USD PriceFeed            |[0xE41CEc959C332968226B2a07f6252Bc57964de1d](https://goerli.lineascan.build/address/0xE41CEc959C332968226B2a07f6252Bc57964de1d)|
|OP/USD PriceFeed            |[0x81E12991821d0bFdFC7D1a79D49056bcFa0Eaf75](https://goerli.lineascan.build/address/0x81E12991821d0bFdFC7D1a79D49056bcFa0Eaf75)|
|ARB/USD PriceFeed            |[0x9b5C82a57AcF5569e10fe1f1783ab57230B18ab9](https://goerli.lineascan.build/address/0x9b5C82a57AcF5569e10fe1f1783ab57230B18ab9)|
