const express = require('express')
const router = express.Router()

const { isAuthenticated } = require('../middleware/auth')

const {
  createBalance,
  viewBalance,
  holdBalance,
  chargeBalance,
  releaseHoldBalance
} = require('../controllers/balance')

router.post('/create', isAuthenticated, createBalance)
router.get('/view', isAuthenticated, viewBalance)
router.post('/hold', holdBalance)
router.post('/charge', chargeBalance)
router.post('/release', releaseHoldBalance)

module.exports = router
