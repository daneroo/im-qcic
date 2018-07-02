const axios = require('axios')
const interval = require('human-interval')
// const { TestSuiteFactoryType } = require('palantir')

const createIntervalCreator = (intervalTime) => {
  return () => {
    return intervalTime
  }
}

const createTestSuite = () => {
  return {
    tests: [ {
      configuration: {},
      description: 'https://api-qcic.now.sh/ responds with 200',
      interval: createIntervalCreator(interval('5 seconds')),
      query: async () => {
        const stamp = new Date().toISOString()
        const result = await axios('https://api-qcic.now.sh/health', {
          timeout: interval('10 seconds')
        })

        const { status, statusText, data } = result
        const randomFailure = Math.random() > 0.5
        console.log('query:', {stamp, randomFailure, status, statusText, data})
        if (randomFailure) {
          throw new Error(JSON.stringify(result.data))
        }
        // return result
        // return { status, statusText, data }
        return JSON.stringify({ status, statusText, data })
      },
      // not working...
      // assert: (result) => {
      //   const stamp = new Date().toISOString()
      //   // result also has: headers,config,request
      //   const { status, statusText, data } = result
      //   const randomAssert = Math.random() > 0.5
      //   console.log('assert:', {stamp, randomAssert, status, statusText, data})
      //   // if (!randomAssert) {
      //   //   throw new Error(JSON.stringify({stamp, randomAssert, status, statusText, data}))
      //   // }
      //   return randomAssert
      // },
      tags: [
        'imetrical',
        'qcic'
      ]
    } ]
  }
}

module.exports = createTestSuite
