module.exports = {
  siteMetadata: {
    title: 'QCIC',
    name: 'QCIC',
    siteUrl: 'https://qcic.n.imetrical.com/',
    description: 'Quis custodiet ipsos custodes - Who will watch the watchers',
    social: [
      {
        name: 'github',
        url: 'https://github.com/daneroo'
      },
      {
        name: 'twitter',
        url: 'https://twitter.com/daneroo'
      }
    ],
    sidebarConfig: {
      forcedNavOrder: ['/nats', '/gql', '/react', '/styling'],
      ignoreIndex: true
    }
  },
  plugins: [{ resolve: 'gatsby-theme-document' }]
}
