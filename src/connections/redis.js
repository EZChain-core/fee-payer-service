const { createClient } = require('redis')

const client = createClient({ url: process.env.REDIS_URL })

const initConnection = async () => {
    console.log(`REDIS CONNECT: ${process.env.REDIS_URL}`)
    client.on('error', (err) => console.log("Redis Client Error", err))
    await client.connect();
}

const closeConnection = async () => {
    await client.quit()
}

const incrTxNum = async (address) => {
    await client.incr(address)
}

const getValue = async (key) => {
    const values = await client.mGet(key)
    return values[0]
}

module.exports = {
    initRedisConnection: initConnection,
    closeRedisConnection: closeConnection,
    incrTxNum: incrTxNum,
    getValue: getValue
}

