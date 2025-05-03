const db = require('../config/db')

exports.createBalance = (req, res) => {
  const userId = req.userId

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  const sql =
    'INSERT INTO "Balance" (user_id, balance_amount) VALUES ($1, $2) RETURNING *'
  const values = [userId, 0]

  db.query(sql, values)
    .then((result) => {
      res.status(201).json({
        message: 'Balance created successfully',
        data: result.rows[0]
      })
    })
    .catch((error) => {
      console.error('Error creating balance:', error)
      res.status(500).json({ error: 'Failed to create balance' })
    })
}

exports.viewBalance = (req, res) => {
  const userId = req.userId

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  const sql = 'SELECT * FROM "Balance" WHERE user_id = $1'
  const values = [userId]

  db.query(sql, values)
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Balance not found' })
      }

      res.status(200).json(result.rows[0])
    })
    .catch((error) => {
      console.error('Error viewing balance:', error)
      res.status(500).json({ error: 'Failed to view balance' })
    })
}

const findUserIdbyPhoneNumber = (phoneNumber) => {
  const sql = 'SELECT * FROM "Card" WHERE card_phone_number = $1'
  const values = [phoneNumber]

  return db
    .query(sql, values)
    .then((result) => {
      if (result.rows.length === 0) {
        return null
      }

      return result.rows[0].user_id
    })
    .catch((error) => {
      console.error('Error finding user by phone number:', error)
      return null
    })
}

exports.holdBalance = async (req, res) => {
  const userId = await findUserIdbyPhoneNumber(req.body.phoneNumber)
  const holdAmount = req.body.holdAmount
  const amount = parseFloat(holdAmount)

  if (!userId || !amount) {
    return res.status(400).json({ error: 'parameters are required' })
  }

  const sql = 'SELECT * FROM "Balance" WHERE user_id = $1'
  const values = [userId]

  db.query(sql, values)
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Balance not found' })
      }

      const balance = result.rows[0]

      if (parseFloat(balance.balance_amount) < amount) {
        return res.status(400).json({ error: 'Insufficient balance to hold' })
      }

      const updateSql = `
        UPDATE "Balance"
        SET 
          balance_on_hold = balance_on_hold + $1,
          balance_amount = balance_amount - $1
        WHERE user_id = $2
        RETURNING *;
      `
      const updateValues = [amount, userId]

      db.query(updateSql, updateValues)
        .then((result) => {
          res.status(200).json({
            message: 'Balance held successfully',
            data: result.rows[0]
          })
        })
        .catch((error) => {
          console.error('Error holding balance:', error)
          res.status(500).json({ error: 'Failed to hold balance' })
        })
    })
    .catch((error) => {
      console.error('Error holding balance:', error)
      res.status(500).json({ error: 'Failed to hold balance' })
    })
}

const findProviderNameByPhoneNumber = (phoneNumber) => {
  const sql = 'SELECT * FROM "Card" WHERE card_phone_number = $1'
  const values = [phoneNumber]

  const providerMapping = {
    '58fbf693-3363-4066-9ac3-489288d950c9': 'Telkomsel',
    '0dbfa48b-4d97-4ce3-acbc-84910b911e1e': 'XL Axiata',
    'c9b0f2b1-f9e4-4105-9e61-614024fbcdb3': 'Indosat'
  }

  return db
    .query(sql, values)
    .then((result) => {
      if (result.rows.length === 0) {
        return null
      }

      const providerId = result.rows[0].operator_id

      const providerName = providerMapping[providerId] || 'FLXA'

      return providerName
    })
    .catch((error) => {
      console.error('Error finding provider by phone number:', error)
      return null
    })
}

exports.chargeBalance = async (req, res) => {
  const userId = await findUserIdbyPhoneNumber(req.body.phoneNumber)
  const providerName = await findProviderNameByPhoneNumber(req.body.phoneNumber)
  const chargedBalance = req.body.chargedBalance
  const amount = parseFloat(chargedBalance)

  if (!userId || !amount) {
    return res.status(400).json({ error: 'userId and amount are required' })
  }

  const sql = 'SELECT * FROM "Balance" WHERE user_id = $1'
  const values = [userId]

  db.query(sql, values)
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Balance not found' })
      }

      const balance = result.rows[0]
      const balanceId = result.rows[0].balance_id

      if (balance.balance_on_hold < amount) {
        return res
          .status(400)
          .json({ error: 'Charged balance not allowed exceeding held balance' })
      }

      const updateSql =
        'UPDATE "Balance" SET balance_on_hold = balance_on_hold - $1 WHERE user_id = $2 RETURNING *'
      const updateValues = [amount, userId]

      db.query(updateSql, updateValues)
        .then((result) => {
          const createTransactionSQL = `
            INSERT INTO "Transaction" (user_id, balance_id, transaction_amount, transaction_type, transaction_status, transaction_method) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
          `
          const createTransactionValues = [
            userId,
            balanceId,
            amount,
            'OUT',
            providerName,
            'MOBILE_CREDIT'
          ]

          db.query(createTransactionSQL, createTransactionValues)
            .then((result) => {
              const transactionId = result.rows[0].transaction_id
              fetch(`${process.env.FLXA_TOKEN_SRV}/token/mint`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({transactionId})
              }).then((response)=>{
                if(!response.status === 201){
                  return res.status(500).json({error: 'Failed to mint token'})
                }
                return res.status(200).json({
                  message: 'Balance charged successfully',
                  data: result.rows[0]
                })
              }).catch((error) => {
                console.error('Error consuming balance:', error)
                res.status(500).json({ error: 'Failed to consume balance' })
              })
            })
            .catch((error) => {
              console.error('Error consuming balance:', error)
              res.status(500).json({ error: 'Failed to consume balance' })
            })
        })
        .catch((error) => {
          console.error('Error consuming balance:', error)
          res.status(500).json({ error: 'Failed to consume balance' })
        })
    })
    .catch((error) => {
      console.error('Error consuming balance:', error)
      res.status(500).json({ error: 'Failed to consume balance' })
    })
}

exports.releaseHoldBalance = async (req, res) => {
  const userId = await findUserIdbyPhoneNumber(req.body.phoneNumber)
  const holdAmount = req.body.holdAmount
  const amount = parseFloat(holdAmount)

  if (!userId || !amount) {
    return res.status(400).json({ error: 'userId and amount are required' })
  }

  const sql = 'SELECT * FROM "Balance" WHERE user_id = $1'
  const values = [userId]

  db.query(sql, values)
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Balance not found' })
      }

      const balance = result.rows[0]

      if (balance.balance_on_hold < amount) {
        return res.status(400).json({
          error: 'Released balance not allowed exceeding held balance'
        })
      }

      const updateSql =
        'UPDATE "Balance" SET balance_on_hold = balance_on_hold - $1, balance_amount = balance_amount + $1 WHERE user_id = $2 RETURNING *'
      const updateValues = [amount, userId]

      db.query(updateSql, updateValues)
        .then((result) => {
          res.status(200).json({
            message: 'Balance released successfully',
            data: result.rows[0]
          })
        })
        .catch((error) => {
          console.error('Error releasing balance:', error)
          res.status(500).json({ error: 'Failed to release balance' })
        })
    })
    .catch((error) => {
      console.error('Error releasing balance:', error)
      res.status(500).json({ error: 'Failed to release balance' })
    })
}
