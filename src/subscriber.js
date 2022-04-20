const MQTT = require('async-mqtt')
const feePayer = require('./fee-payer')


module.exports = () => {
    const uri = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`
    console.log(`uri: ${uri} topic: ${process.env.TOPIC}`)

    const subscriber = MQTT.connect(uri)
    subscriber.on('connect', async () => {
        await subscriber.subscribe(`${process.env.TOPIC}`, (err) => {
            if (err) {
                console.log(`Subscriber can't connect with error:  ${err}`)
                return
            }
            console.log(`Subscriber connected`)
        })
    })
    
    subscriber.on('message', async (topic, message) => {
        console.log(`Topic: ${topic} message: ${message.toString()}`)
        await feePayer(message.toString())
    })

    subscriber.on('close', () => { 
        console.log('Connection closed by subscriber') 
    }) 

    subscriber.on('reconnect', () => { 
        console.log('Subscriber trying a reconnection') 
    }) 
}