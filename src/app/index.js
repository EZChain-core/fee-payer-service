require('dotenv').config()

const { getBalance, getTxs, getTx, initWallets } = require('./usecases/fee-payer')
const { initConnection, closeConnection } = require('./connections/index')

const express = require('express')
const app = express()
const port = 3000

initConnection()

initWallets()

app.use(function (req, res, next) {
    console.log(
        `[${new Date().toISOString()}] - ${req.method}: ${req.originalUrl}`
    )
    next()

})

app.get('/', async (req, res) => {
    res.send('FeePayer Service') 
})

app.get('/:address/balance',  async (req, res) => {
    const balance = await getBalance(req.params.address)
    res.json({ "balance": balance })
})
  
// /txs/:address?status=error,discarded,sent&last_time=0&limit=32
app.get('/txs/:address', async (req, res) => {
    const address = req.params.address
    const lastTime = req.query.last_time || 0
    const limit = req.query.limit || 30
    const status = req.query.status
    
    const txs = await getTxs(address, status, lastTime, limit)

    res.json({ "data": txs })
    
})

app.listen(port, () => {
    console.log(`Fee payer service is listening on port ${port}`)
})
