const MQTT = require('async-mqtt')
const { wrapTx } = require('../usecases/fee-payer')

const uri = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`
console.log(`MQTT CONNECT: ${uri} topic: ${process.env.TOPIC}`)
const subscriber = MQTT.connect(uri)

const init = () => {
    subscriber.on('connect', async () => {
        await subscriber.subscribe(`${process.env.TOPIC}/#`, (err) => {
            if (err) {
                console.log(`Subscriber can't connect with error:  ${err}`)
                return
            }
            console.log(`Subscriber connected`)
        })
    })
    
    subscriber.on('message', async (topic, message) => {
        const[isValidSchema, isSponsored] = await wrapTx(message.toString())
        const msg = `isValidSchema: ${isValidSchema} - isSponsored: ${isSponsored}`
        console.log(`[${new Date().toISOString()}] - wrapTx: ${msg}`)
    })

    subscriber.on('close', () => { 
        console.log('Connection closed by subscriber') 
    }) 

    subscriber.on('reconnect', () => { 
        console.log('Subscriber trying a reconnection') 
    }) 
}

const close = () => {
    subscriber.end()
}

module.exports = {
    initMQTTConn: init,
    closeMQTTConn: close
}