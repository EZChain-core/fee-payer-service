require('dotenv').config()

const { getTx } = require('./usecases/fee-payer')
const subscribe = require('./connections/subscriber')
const { initRedisConnection } = require('./connections/redis')

const express = require('express')
const app = express()
const port = 3000

subscribe()

initRedisConnection()

app.get('/', (req, res) => {
    res.send('FeePayer Service')
})

app.get('/:txHash/status', async (req, res) => {
    const receipt = await getTx(req.params.txHash)
    res.json({ "status": receipt.status })
})
  
app.listen(port, () => {
    console.log(`Fee payer service is listening on port ${port}`)
})
