require('dotenv').config()
const assert = require('assert')
const MQTT = require('async-mqtt')
const feePayer = require('./fee-payer')

const MQTT_URI = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`
const MQTT_TOPIC = process.env.TOPIC

console.log(`MQTT ${MQTT_URI}`)
describe('mqtt connection', () => {
    let client
    
    afterEach(() => {
        if (client) {
            client.on('close', () => {
                console.log('Connection closed')
            })

            client.end(true)
            client = undefined
        }
    })
  
    it('should be able to connect to the broker', (done) => {
        client = MQTT.connect(MQTT_URI) 

        client.on('connect', () => {
            assert.equal(client.connected, true, 'Connection failed')
            client.subscribe(MQTT_TOPIC)
            client.publish(MQTT_TOPIC, "1")
        })

        client.on('message', (topic, message) =>{
            assert.equal(parseInt(message), "1", "Wrong message")
            done()
        })
    })
})


