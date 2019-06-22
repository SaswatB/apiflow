const IgnoreNotFoundExportPlugin = require('ignore-not-found-export-webpack-plugin');

module.exports = {
  plugins: [new IgnoreNotFoundExportPlugin()]
}