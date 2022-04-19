const MQTT = require('async-mqtt')
const { ethers } = require('ethers')
const { getWallet } = require('../lib/accounts')
const { createEVMPP } = require('../lib/evmpp')
const feePayer = require('./feepayer')
const RPC = process.env.RPC || "http://localhost:9650/ext/bc/C/rpc"
const provider = new ethers.providers.JsonRpcProvider(RPC)

const EVMPP = createEVMPP(provider, {
    returns: {
        payFor: 'bytes[] memory results',
        callBatch: 'bytes[] memory results'
    },
})

module.exports = () => {
    let evmpp

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
        const wallet = await getWallet(__filename, provider)
        evmpp = EVMPP.connect(wallet);
    })
    
    subscriber.on('message', async (topic, message) => {
        console.log(`Topic: ${topic} message: ${message.toString()}`)
        await feePayer(evmpp, message.toString())
    })

    subscriber.on('close', function() { 
        console.log('Connection closed by subscriber') 
    }) 

    subscriber.on('reconnect', function() { 
        console.log('Subscriber trying a reconnection') 
    }) 
}