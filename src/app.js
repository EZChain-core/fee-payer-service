require('dotenv').config()
const { getTx } = require('./fee-payer')
const subscribe = require('./subscriber')
const express = require('express')
const app = express()
const port = 3000

subscribe()

app.get('/', (req, res) => {
    res.send('FeePayer Service')
})

app.get('/:txHash/status', async (req, res) => {
    const receipt = await getTx(req.params.txHash)
    res.json({ "status": receipt.status })
}) 
  
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
