require('dotenv').config()

const { getBalance } = require('./usecases/fee-payer')
const { initConnection, closeConnection, mysqlPool } = require('./connections/index')

const express = require('express')
const app = express()
const port = 3000

initConnection()


app.use(function (req, res, next) {
    console.log(
        `[${new Date().toISOString()}] - ${req.method}: ${req.originalUrl}`
    )
    next()

})

app.get('/', (req, res) => {
    res.send('FeePayer Service')
})


app.get('/:address/balance',  async (req, res) => {
    const balance = await getBalance(req.params.address)
    res.json({ "balance": balance })
})
  
// /txs/:address?status=[ERROR,DISCARDED]&offset=0&limit=32
app.get('/txs/:address', async (req, res) => {
    const address = req.params.address
    const offset = req.query.offset
    const limit = req.query.limit
    const status = req.query.status
    await getTxStatus(address, status, offset, limit)

    console.log(`address: ${address} offSet : ${offset} limit: ${limit} status: ${status}`)
    res.json({ "balance": 1 })
    
})

app.listen(port, () => {
    console.log(`Fee payer service is listening on port ${port}`)
})
