const { expect } = require('chai')

let testMedianPrice

describe('\n📌 ### Test Median Price ###\n', function () {
  beforeEach('Deploy Contract', async function () {
    const TestMedianPrice = await ethers.getContractFactory('TestMedianPrice')
    testMedianPrice = await TestMedianPrice.deploy()
  })

  it('Test size = odd', async function () {
    const test_case = [
      [5, 4, 3, 5, 1],
      [5, 5, 3, 5, 1],
      [4, 5, 3, 5, 1],
      [4, 5, 3, 5, 1, 1, 1],
      [3, 5, 1],
      [5],
      [0, 0, 0],
      randomPrices(0, 1000, 5),
      randomPrices(0, 10, 9),
      randomPrices(0, 100, 101),
    ]

    for (const prices of test_case) {
      const medianPrice = getMedianPrice(prices)
      const result = await testMedianPrice.getMedianPrice(prices)
      expect(result).to.eq(medianPrice)
    }
  })

  it('Test size = even', async function () {
    const test_case = [
      [5, 4, 3, 5, 1, 5],
      [5, 5, 3, 5, 1, 0],
      [4, 5, 3, 5, 1, 9],
      [4, 5, 3, 5, 1, 1, 1, 4],
      [3, 5, 1, 0],
      [5, 5],
      [0, 0, 0, 0],
      randomPrices(0, 1000, 6),
      randomPrices(0, 10, 10),
      randomPrices(0, 100, 102),
    ]

    for (const prices of test_case) {
      const medianPrice = getMedianPrice(prices)
      const result = await testMedianPrice.getMedianPrice(prices)
      expect(result).to.eq(Math.floor(medianPrice))
    }
  })

  it('Estimate gas', async function () {
    const test_case = [
      [9],
      [5, 5],
      [1, 2, 3],
      [0, 1, 5, 0],
      [0, 0, 0, 0, 8],
      randomPrices(0, 10, 10),
      randomPrices(0, 10, 11),
      randomPrices(0, 10, 20),
      randomPrices(0, 10, 21),
      randomPrices(0, 10, 40),
      randomPrices(0, 10, 41),
      randomPrices(0, 10, 60),
      randomPrices(0, 10, 61),
      randomPrices(0, 100, 100),
      randomPrices(0, 100, 101),
    ]

    for (const prices of test_case) {
      const estimation = await testMedianPrice.estimateGas.getMedianPrice(prices)
      console.log(`size: ${prices.length}, odd=${prices.length % 2 == 1}`, +estimation)
    }
  })
})

function randomPrices(min, max, size) {
  const prices = []

  for (let i = 0; i < size; i++) {
    const price = Math.floor(Math.random() * (max - min + 1)) + min
    prices.push(price)
  }

  return prices
}

function getMedianPrice(prices) {
  const buff = [...prices]
  const sortedPrices = buff.sort((a, b) => a - b)
  const middleIndex = Math.floor(sortedPrices.length / 2)

  if (sortedPrices.length % 2 === 0) {
    const middleValue1 = sortedPrices[middleIndex - 1]
    const middleValue2 = sortedPrices[middleIndex]

    return (middleValue1 + middleValue2) / 2
  } else {
    return sortedPrices[middleIndex]
  }
}
