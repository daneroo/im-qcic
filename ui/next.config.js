// next.config.js
module.exports = {
  exportPathMap: function (defaultPathMap) {
    return {
      '/': { page: '/' },
      '/about': { page: '/about' },
      '/theme': { page: '/theme' }
    }
  }
}
