require('dotenv').config()

const { getTx } = require('./usecases/fee-payer')
const { initConnection, closeConnection } = require('./connections/index')

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

app.get('/:txHash/status', async (req, res) => {
    try {
        const receipt = await getTx(req.params.txHash)
        res.json({ "status": receipt.status })
    } catch (err) {
        res.status(400)
        res.json({ "message": err.reason })
    }
})
  
app.listen(port, () => {
    console.log(`Fee payer service is listening on port ${port}`)
})
