const express = require('express')
const router = express.Router()

const { isAuthenticated } = require('../middleware/auth')

const {
  getAllTransactions,
  chargeCreditCard,
  createBankTransaction,
  checkPayment,
  chargeQRIS,
  chargeMobileCredit
} = require('../controllers/transaction')

// Endpoint to Get All Transactions
router.get('/view', isAuthenticated, getAllTransactions)

// Ednpoint to Check Payment Status
router.get('/check-payment', isAuthenticated, checkPayment)

// Endpoint to Add FLXA Balance
router.post('/charge/credit-card', isAuthenticated, chargeCreditCard)
router.post('/charge/bank-transfer', isAuthenticated, createBankTransaction)
router.post('/charge/qris', isAuthenticated, chargeQRIS)
router.post('/charge/mobile-credit', isAuthenticated, chargeMobileCredit)

module.exports = router
