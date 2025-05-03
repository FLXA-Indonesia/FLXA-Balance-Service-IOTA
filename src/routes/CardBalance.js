const express = require('express')
const router = express.Router()

const { addBalance, checkBalance } = require('../controllers/card-balance')

router.post('/add', addBalance)
router.get('/check/:phoneNumber', checkBalance)

module.exports = router
