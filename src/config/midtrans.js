const midtransClient = require('midtrans-client')
const dotenv = require('dotenv')
dotenv.config()

exports.midtransCoreApi = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
})
