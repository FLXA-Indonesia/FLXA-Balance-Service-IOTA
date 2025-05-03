const db = require('../config/db')
const { midtransCoreApi } = require('../config/midtrans')
const axios = require('axios')

exports.getAllTransactions = (req, res) => {
  const userId = req.userId

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  const sql = 'SELECT * FROM "Transaction" WHERE user_id = $1'
  const values = [userId]

  db.query(sql, values)
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(206).json(result.rows)
      }

      res.status(200).json(result.rows)
    })
    .catch((error) => {
      console.error('Error getting transactions:', error)
      res.status(500).json({ error: 'Failed to get transactions' })
    })
}

function findBalanceId(userId) {
  const sql = 'SELECT * FROM "Balance" WHERE user_id = $1'
  const values = [userId]

  return db.query(sql, values)
}

exports.chargeCreditCard = (req, res) => {
  const userId = req.userId
  const { amount, tokenId } = req.body

  if (!userId || !amount) {
    return res.status(400).json({ error: 'userId and amount is required' })
  }

  findBalanceId(userId)
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Balance not found' })
      }

      const balanceId = result.rows[0].balance_id
      const orderId = `ORDER-${userId}-${new Date().getTime()}`

      const parameter = {
        payment_type: 'credit_card',
        transaction_details: {
          gross_amount: amount,
          order_id: orderId
        },
        credit_card: {
          token_id: tokenId,
          authentication: false
        }
      }

      midtransCoreApi
        .charge(parameter)
        .then((response) => {
          if (
            response.status_code !== '201' &&
            response.status_code !== '200'
          ) {
            return res.status(400).json({
              error: 'Failed to charge',
              message: response.data.status_message
            })
          }

          const sql = `
            INSERT INTO "Transaction" (
                user_id, 
                balance_id, 
                transaction_type, 
                transaction_amount, 
                transaction_status, 
                transaction_method,
                order_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `

          const values = [
            userId,
            balanceId,
            'IN',
            amount,
            response.transaction_status,
            'CREDIT_CARD',
            orderId
          ]

          db.query(sql, values)
            .then(() => {
              const sql =
                'UPDATE "Balance" SET balance_amount = balance_amount + $1 WHERE balance_id = $2'
              const values = [amount, balanceId]

              db.query(sql, values)
                .then((result) => {
                  res.status(201).json({
                    message: 'Transaction created successfully',
                    data: result.rows[0]
                  })
                })
                .catch((error) => {
                  console.error('Error updating balance:', error)
                  res.status(500).json({ error: 'Failed to update balance' })
                })
            })
            .catch((error) => {
              console.error('Error creating transaction:', error)
              res.status(500).json({ error: 'Failed to create transaction' })
            })
        })
        .catch((error) => {
          console.error('Error charge:', error)
          res.status(500).json({ error: 'Failed to charge' })
        })
    })
    .catch((error) => {
      console.error('Error finding balance:', error)
      res.status(500).json({ error: 'Failed to find balance' })
    })
}

exports.createBankTransaction = (req, res) => {
  const userId = req.userId
  const { amount, sourceBank } = req.body

  if (!userId || !amount || !sourceBank) {
    return res
      .status(400)
      .json({ error: 'userId, amount, and bank is required' })
  }

  findBalanceId(userId)
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Balance not found' })
      }

      const balanceId = result.rows[0].balance_id
      const orderId = `ORDER-${userId}-${new Date().getTime()}`

      let parameter = {}
      if (sourceBank === 'Mandiri') {
        parameter = {
          payment_type: 'echannel',
          transaction_details: {
            gross_amount: amount,
            order_id: orderId
          },
          echannel: {
            bill_info1: `Payment made by User ID: ${userId}`,
            bill_info2: 'Payment for FLXA Balance'
          }
        }
      } else if (sourceBank === 'Permata') {
        parameter = {
          payment_type: 'permata',
          transaction_details: {
            gross_amount: amount,
            order_id: orderId
          }
        }
      } else {
        parameter = {
          payment_type: 'bank_transfer',
          transaction_details: {
            gross_amount: amount,
            order_id: orderId
          },
          bank_transfer: {
            bank: sourceBank
          }
        }
      }

      midtransCoreApi
        .charge(parameter)
        .then((response) => {
          if (
            response.status_code !== '201' &&
            response.status_code !== '200'
          ) {
            return res.status(400).json({
              error: 'Failed to charge',
              message: response.data.status_message
            })
          }

          const sql = `
            INSERT INTO "Transaction" (
                user_id, 
                balance_id, 
                transaction_type, 
                transaction_amount, 
                transaction_status, 
                transaction_method,
                order_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `

          const values = [
            userId,
            balanceId,
            'IN',
            amount,
            response.transaction_status,
            `BANK_TRANSFER - ${sourceBank.toUpperCase()}`,
            orderId
          ]

          db.query(sql, values)
            .then(() => {
              res.status(201).json({
                message:
                  'Transaction created successfully! Waiting for payment!',
                orderId,
                data: response
              })
            })
            .catch((error) => {
              console.error('Error creating transaction:', error)
              res.status(500).json({ error: 'Failed to create transaction' })
            })
        })
        .catch((error) => {
          console.error('Error charge:', error)
          res.status(500).json({ error: 'Failed to charge' })
        })
    })
    .catch((error) => {
      console.error('Error finding balance:', error)
      res.status(500).json({ error: 'Failed to find balance' })
    })
}

exports.chargeQRIS = (req, res) => {
  const userId = req.userId
  const { amount, phoneNumber } = req.body

  if (!userId || !amount) {
    return res.status(400).json({ error: 'userId and amount is required' })
  }

  findBalanceId(userId)
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Balance not found' })
      }

      const balanceId = result.rows[0].balance_id
      const orderId = `ORDER-${userId}-${new Date().getTime()}`

      const parameter = {
        payment_type: 'qris',
        transaction_details: {
          gross_amount: amount,
          order_id: orderId
        }
      }

      midtransCoreApi
        .charge(parameter)
        .then((response) => {
          if (
            response.status_code !== '201' &&
            response.status_code !== '200'
          ) {
            return res.status(400).json({
              error: 'Failed to charge',
              message: response.data.status_message
            })
          }

          const sql = `
            INSERT INTO "Transaction" (
                user_id, 
                balance_id, 
                transaction_type, 
                transaction_amount, 
                transaction_status, 
                transaction_method,
                order_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `

          const values = [
            userId,
            balanceId,
            'IN',
            amount,
            response.transaction_status,
            'QRIS',
            orderId
          ]

          db.query(sql, values)
            .then(() => {
              axios
                .post(process.env.SEND_MESSAGE_ENDPOINT + '/send-customize', {
                  number: phoneNumber,
                  message: `QRIS Link can be accessed here: ${response.actions[0].url}`
                })
                .then(() => {
                  res.status(201).json({
                    message: 'Transaction created successfully',
                    orderId,
                    data: response
                  })
                })
                .catch((error) => {
                  console.error('Error sending message:', error)
                  res.status(500).json({ error: 'Failed to send message' })
                })
            })
            .catch((error) => {
              console.error('Error creating transaction:', error)
              res.status(500).json({ error: 'Failed to create transaction' })
            })
        })
        .catch((error) => {
          console.error('Error charge:', error)
          res.status(500).json({ error: 'Failed to charge' })
        })
    })
    .catch((error) => {
      console.error('Error finding balance:', error)
      res.status(500).json({ error: 'Failed to find balance' })
    })
}

exports.checkPayment = (req, res) => {
  const { orderId } = req.query

  if (!orderId) {
    return res.status(400).json({ error: 'orderId is required' })
  }

  midtransCoreApi.transaction
    .status(orderId)
    .then((response) => {
      const sql = `
        UPDATE "Transaction" 
        SET transaction_status = $1
        WHERE order_id = $2
        RETURNING *
    `
      const values = [response.transaction_status, orderId]

      db.query(sql, values)
        .then((result) => {
          if (
            response.transaction_status === 'settlement' ||
            response.transaction_status === 'capture'
          ) {
            const sql = `
              UPDATE "Balance" 
              SET balance_amount = balance_amount + $1 
              WHERE balance_id = $2
              RETURNING *
          `
            const values = [response.gross_amount, result.rows[0].balance_id]

            db.query(sql, values)
              .then(() => {
                res.status(200).json({
                  message: 'Payment success',
                  data: response
                })
              })
              .catch((error) => {
                console.error('Error updating balance:', error)
                res.status(500).json({ error: 'Failed to update balance' })
              })
          } else {
            res.status(200).json({
              message: 'Payment pending',
              data: response
            })
          }
        })
        .catch((error) => {
          console.error('Error updating transaction:', error)
          res.status(500).json({ error: 'Failed to update transaction' })
        })
    })
    .catch((error) => {
      console.error('Error check payment:', error)
      res.status(500).json({ error: 'Failed to check payment' })
    })
}

exports.chargeMobileCredit = (req, res) => {
  const userId = req.userId
  const { phoneNumber } = req.body
  const amount = parseFloat(req.body.amount)

  if (!userId || !amount || !phoneNumber) {
    return res.status(400).json({ error: 'Parameters are required' })
  }

  findBalanceId(userId)
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Balance not found' })
      }

      const balanceId = result.rows[0].balance_id
      const deductQuery = `
        SELECT * FROM "Card" WHERE user_id = $1 AND card_phone_number = $2
      `
      const values = [userId, phoneNumber]

      db.query(deductQuery, values)
        .then((result) => {
          const availableBalance = parseFloat(result.rows[0].card_balance)

          if (availableBalance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' })
          }

          const newBalance = availableBalance - amount

          const updateQuery = `
            UPDATE "Card" SET card_balance = $1 WHERE user_id = $2 AND card_phone_number = $3
          `
          const updateValues = [newBalance, userId, phoneNumber]

          db.query(updateQuery, updateValues)
            .then(() => {
              const sql = `
            INSERT INTO "Transaction" (
                user_id, 
                balance_id, 
                transaction_type, 
                transaction_amount, 
                transaction_status, 
                transaction_method
            ) VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *
        `

              const values = [
                userId,
                balanceId,
                'IN',
                amount,
                'success',
                'MOBILE_CREDIT'
              ]

              db.query(sql, values)
                .then((txResult) => {
                  const sql =
                    'UPDATE "Balance" SET balance_amount = balance_amount + $1 WHERE balance_id = $2'
                  const values = [amount, balanceId]

                  db.query(sql, values)
                    .then((result) => {
                      const transactionId = txResult.rows[0].transaction_id
                      fetch(`${process.env.FLXA_TOKEN_SRV}/token/mint`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ transactionId })
                      }).then((response) => {
                        if (!response.status === 201) {
                          return res.status(500).json({ error: 'Failed to mint token' })
                        }
                        return res.status(201).json({
                          message: 'Transaction created successfully',
                          data: result.rows[0]
                        })
                      }).catch((error) => {
                        console.error('Error consuming balance:', error)
                        res.status(500).json({ error: 'Failed to consume balance' })
                      })
                    })
                    .catch((error) => {
                      console.error('Error updating balance:', error)
                      res
                        .status(500)
                        .json({ error: 'Failed to update balance' })
                    })
                })
                .catch((error) => {
                  console.error('Error creating transaction:', error)
                  res
                    .status(500)
                    .json({ error: 'Failed to create transaction' })
                })
            })
            .catch((error) => {
              console.error('Error updating card balance:', error)
              res.status(500).json({ error: 'Failed to update card balance' })
            })
        })
        .catch((error) => {
          console.error('Error charge:', error)
          res.status(500).json({ error: 'Failed to charge' })
        })
    })
    .catch((error) => {
      console.error('Error finding balance:', error)
      res.status(500).json({ error: 'Failed to find balance' })
    })
}
