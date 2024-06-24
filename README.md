# 📜 xOracle Contract
The xOracle contract is an on-chain Oracle provider with multi-chain support.
This contract enables anyone to request price data and fulfill those requests on-chain fastest and securely with multi-signature proofs. Once a request is fulfilled, the price data is stored in PriceFeed, making the latest price readily available on-chain for everyone.

## 🔮 xOracle Chain
The xOracle chain is a public Proof of Authority (POA) blockchain designed to store real-time price feed information. It allows anyone to join the node and verify the transparency of the information feeds.

## 💭 xOracle's Architecture
### Fast Pricefeed
![xOracle's Fast Pricefeed](https://github.com/Crown-Labs/xoracle-contracts/blob/main/docs/fast-pricefeed.jpg)

### Cross-chain Message
![xOracle's Cross-chain Message](https://github.com/Crown-Labs/xoracle-contracts/blob/main/docs/cross-chain-message.jpg)

##  ⚙️ Local Development
Require node version >= 16.20

Local Setup Steps:
1. git clone https://github.com/Crown-Labs/xoracle-contracts.git
1. Install dependencies: `yarn install` 
1. Compile Contracts: `yarn compile`
1. Run Tests: `yarn test`

## Deployed Contracts

### Fast Pricefeed
#### - Ethereum
|Contract       | Addresss                                                                                                            |
|:-------------:|:-------------------------------------------------------------------------------------------------------------------:|
|xOracle            |[0xb376D2fe17CAfc7Fe841E16b897Fe658f1e8De7D](https://etherscan.io/address/0xb376D2fe17CAfc7Fe841E16b897Fe658f1e8De7D)|
|BTC/USD PriceFeed            |[0x1296d3a1DE3f7BE8cB1F76C888e51c47915d8001](https://etherscan.io/address/0x1296d3a1DE3f7BE8cB1F76C888e51c47915d8001)|
|ETH/USD PriceFeed            |[0x4c685b51bc534508a3AfBf0d8F4c0Ec73E5d3c5A](https://etherscan.io/address/0x4c685b51bc534508a3AfBf0d8F4c0Ec73E5d3c5A)|
|BNB/USD PriceFeed            |[0xba13123b80d65fC170B30f29918884f212f62Fc5](https://etherscan.io/address/0xba13123b80d65fC170B30f29918884f212f62Fc5)|
|USDT/USD PriceFeed            |[0xC7cCDbD2cC787065A5b634A1E532430411A5849a](https://etherscan.io/address/0xC7cCDbD2cC787065A5b634A1E532430411A5849a)|
|USDC/USD PriceFeed            |[0x1d2CAd6755C698CF8d6558cb0f552D8631dd9D81](https://etherscan.io/address/0x1d2CAd6755C698CF8d6558cb0f552D8631dd9D81)|
|DAI/USD PriceFeed            |[0xEd9DB6294C83670366970D75d30FF3cB3717ddA6](https://etherscan.io/address/0xEd9DB6294C83670366970D75d30FF3cB3717ddA6)|
|XRP/USD PriceFeed            |[0x19E0884562e62d9CC2d99Ea6319D930B7F427988](https://etherscan.io/address/0x19E0884562e62d9CC2d99Ea6319D930B7F427988)|
|DOGE/USD PriceFeed            |[0xf533C443902dDb3a385c81aC2dC199B1c612FD0c](https://etherscan.io/address/0xf533C443902dDb3a385c81aC2dC199B1c612FD0c)|
|TRX/USD PriceFeed            |[0x6c3a1dCffbd9894D9f19237df89A0CA1FA0EC768](https://etherscan.io/address/0x6c3a1dCffbd9894D9f19237df89A0CA1FA0EC768)|
|ADA/USD PriceFeed            |[0xccCd5c5D4e3d2F85d07f041759B96f8b8A622056](https://etherscan.io/address/0xccCd5c5D4e3d2F85d07f041759B96f8b8A622056)|
|MATIC/USD PriceFeed            |[0x7C6791EB8d3Fd74Dbd40A71C891a2c3294AB8Dc7](https://etherscan.io/address/0x7C6791EB8d3Fd74Dbd40A71C891a2c3294AB8Dc7)|
|SOL/USD PriceFeed            |[0xd70C6fcAEE391Ec106Ba327E16F15e23fdC02156](https://etherscan.io/address/0xd70C6fcAEE391Ec106Ba327E16F15e23fdC02156)|
|DOT/USD PriceFeed            |[0xB2F5659Ee1868D014E38dB33ddB1143Be62B23Dd](https://etherscan.io/address/0xB2F5659Ee1868D014E38dB33ddB1143Be62B23Dd)|
|AVAX/USD PriceFeed            |[0xa730515A07B5EB5C1851327962567785aF53a4B4](https://etherscan.io/address/0xa730515A07B5EB5C1851327962567785aF53a4B4)|
|FTM/USD PriceFeed            |[0xBd76Bf4E57a8EF5a3dd2052959d3bbDFbE0316b4](https://etherscan.io/address/0xBd76Bf4E57a8EF5a3dd2052959d3bbDFbE0316b4)|
|NEAR/USD PriceFeed            |[0x9ad22B18350Ae2DC50F5E92fd1aE248E2E5BCbA5](https://etherscan.io/address/0x9ad22B18350Ae2DC50F5E92fd1aE248E2E5BCbA5)|
|ATOM/USD PriceFeed            |[0x8008ef7228C13e14CB66F7cd08076728bd7538Bd](https://etherscan.io/address/0x8008ef7228C13e14CB66F7cd08076728bd7538Bd)|
|OP/USD PriceFeed            |[0x7943EBf07bBf8b0068d708c1997FFB22b15eEB57](https://etherscan.io/address/0x7943EBf07bBf8b0068d708c1997FFB22b15eEB57)|
|ARB/USD PriceFeed            |[0x0f73CD73993E224358b8cB412A5331bfdf3422Cc](https://etherscan.io/address/0x0f73CD73993E224358b8cB412A5331bfdf3422Cc)|

#### - Arbitrum Testnet
|Contract       | Addresss                                                                                                            |
|:-------------:|:-------------------------------------------------------------------------------------------------------------------:|
|xOracle            |[0xa3B16ad55513d91c8650Ef7D218A5299d59265d7](https://sepolia.arbiscan.io/address/0xa3B16ad55513d91c8650Ef7D218A5299d59265d7)|
|BTC/USD PriceFeed            |[0x1296d3a1DE3f7BE8cB1F76C888e51c47915d8001](https://sepolia.arbiscan.io/address/0x1296d3a1DE3f7BE8cB1F76C888e51c47915d8001)|
|ETH/USD PriceFeed            |[0x4c685b51bc534508a3AfBf0d8F4c0Ec73E5d3c5A](https://sepolia.arbiscan.io/address/0x4c685b51bc534508a3AfBf0d8F4c0Ec73E5d3c5A)|
|BNB/USD PriceFeed            |[0xba13123b80d65fC170B30f29918884f212f62Fc5](https://sepolia.arbiscan.io/address/0xba13123b80d65fC170B30f29918884f212f62Fc5)|
|USDT/USD PriceFeed            |[0xC7cCDbD2cC787065A5b634A1E532430411A5849a](https://sepolia.arbiscan.io/address/0xC7cCDbD2cC787065A5b634A1E532430411A5849a)|
|BUSD/USD PriceFeed            |[0x1d2CAd6755C698CF8d6558cb0f552D8631dd9D81](https://sepolia.arbiscan.io/address/0x1d2CAd6755C698CF8d6558cb0f552D8631dd9D81)|
|USDC/USD PriceFeed            |[0xEd9DB6294C83670366970D75d30FF3cB3717ddA6](https://sepolia.arbiscan.io/address/0xEd9DB6294C83670366970D75d30FF3cB3717ddA6)|
|DAI/USD PriceFeed            |[0x19E0884562e62d9CC2d99Ea6319D930B7F427988](https://sepolia.arbiscan.io/address/0x19E0884562e62d9CC2d99Ea6319D930B7F427988)|
|XRP/USD PriceFeed            |[0xf533C443902dDb3a385c81aC2dC199B1c612FD0c](https://sepolia.arbiscan.io/address/0xf533C443902dDb3a385c81aC2dC199B1c612FD0c)|
|DOGE/USD PriceFeed            |[0x6c3a1dCffbd9894D9f19237df89A0CA1FA0EC768](https://sepolia.arbiscan.io/address/0x6c3a1dCffbd9894D9f19237df89A0CA1FA0EC768)|
|TRX/USD PriceFeed            |[0xccCd5c5D4e3d2F85d07f041759B96f8b8A622056](https://sepolia.arbiscan.io/address/0xccCd5c5D4e3d2F85d07f041759B96f8b8A622056)|
|ADA/USD PriceFeed            |[0x7C6791EB8d3Fd74Dbd40A71C891a2c3294AB8Dc7](https://sepolia.arbiscan.io/address/0x7C6791EB8d3Fd74Dbd40A71C891a2c3294AB8Dc7)|
|MATIC/USD PriceFeed            |[0xd70C6fcAEE391Ec106Ba327E16F15e23fdC02156](https://sepolia.arbiscan.io/address/0xd70C6fcAEE391Ec106Ba327E16F15e23fdC02156)|
|SOL/USD PriceFeed            |[0xB2F5659Ee1868D014E38dB33ddB1143Be62B23Dd](https://sepolia.arbiscan.io/address/0xB2F5659Ee1868D014E38dB33ddB1143Be62B23Dd)|
|DOT/USD PriceFeed            |[0xa730515A07B5EB5C1851327962567785aF53a4B4](https://sepolia.arbiscan.io/address/0xa730515A07B5EB5C1851327962567785aF53a4B4)|
|AVAX/USD PriceFeed            |[0xBd76Bf4E57a8EF5a3dd2052959d3bbDFbE0316b4](https://sepolia.arbiscan.io/address/0xBd76Bf4E57a8EF5a3dd2052959d3bbDFbE0316b4)|
|FTM/USD PriceFeed            |[0x9ad22B18350Ae2DC50F5E92fd1aE248E2E5BCbA5](https://sepolia.arbiscan.io/address/0x9ad22B18350Ae2DC50F5E92fd1aE248E2E5BCbA5)|
|NEAR/USD PriceFeed            |[0x8008ef7228C13e14CB66F7cd08076728bd7538Bd](https://sepolia.arbiscan.io/address/0x8008ef7228C13e14CB66F7cd08076728bd7538Bd)|
|ATOM/USD PriceFeed            |[0x7943EBf07bBf8b0068d708c1997FFB22b15eEB57](https://sepolia.arbiscan.io/address/0x7943EBf07bBf8b0068d708c1997FFB22b15eEB57)|
|OP/USD PriceFeed            |[0x0f73CD73993E224358b8cB412A5331bfdf3422Cc](https://sepolia.arbiscan.io/address/0x0f73CD73993E224358b8cB412A5331bfdf3422Cc)|
|ARB/USD PriceFeed            |[0x002422A5d2206a5b14c522Fa50bf0Ad37Ccf8bDC](https://sepolia.arbiscan.io/address/0x002422A5d2206a5b14c522Fa50bf0Ad37Ccf8bDC)|

### Cross-chain Message
#### - Mainnet

|Chain       |Chain ID       | Message Contract Addresss                                                                                                            |
|:-------------:|:-------------:|:-------------------------------------------------------------------------------------------------------------------:|
|Ethereum            |1           |[0x50116e06aA816741f212Cd92B8dFDc2FaaAF8202](https://etherscan.io/address/0x50116e06aA816741f212Cd92B8dFDc2FaaAF8202)|

#### - Testnet

|Chain       |Chain ID       | Message Contract Addresss                                                                                                            |
|:-------------:|:-------------:|:-------------------------------------------------------------------------------------------------------------------:|
|Holesky            |17000           |[0x1b404D1491e488001A8545b86E58ac8362D0E95C](https://holesky.etherscan.io/address/0x1b404D1491e488001A8545b86E58ac8362D0E95C)|
|Sepolia            |11155111            |[0x4c685b51bc534508a3AfBf0d8F4c0Ec73E5d3c5A](https://sepolia.etherscan.io/address/0x4c685b51bc534508a3AfBf0d8F4c0Ec73E5d3c5A)|
|BNB Testnet            |97           |[0xf533C443902dDb3a385c81aC2dC199B1c612FD0c](https://testnet.bscscan.com/address/0xf533C443902dDb3a385c81aC2dC199B1c612FD0c)|