const db = require('../config/db')

exports.addBalance = (req, res) => {
  const { phoneNumber, amount } = req.body
  const balanceAmount = parseFloat(amount)

  if (!phoneNumber || !balanceAmount) {
    return res
      .status(400)
      .json({ error: 'phoneNumber and amount are required' })
  }

  const sql =
    'UPDATE "Card" SET card_balance = card_balance + $1 WHERE card_phone_number = $2 RETURNING *;'
  const values = [balanceAmount, phoneNumber]

  db.query(sql, values)
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Balance not found' })
      }

      res.status(200).json({ message: 'Balance added successfully' })
    })
    .catch((error) => {
      console.error('Error adding balance:', error)
      res.status(500).json({ error: 'Failed to add balance' })
    })
}

exports.checkBalance = (req, res) => {
  const { phoneNumber } = req.params

  if (!phoneNumber) {
    return res.status(400).json({ error: 'phoneNumber is required' })
  }

  const sql = 'SELECT * FROM "Card" WHERE card_phone_number = $1'
  const values = [phoneNumber]

  db.query(sql, values)
    .then((result) => {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Balance not found' })
      }

      res.status(200).json(result.rows)
    })
    .catch((error) => {
      console.error('Error viewing balance:', error)
      res.status(500).json({ error: 'Failed to view balance' })
    })
}
