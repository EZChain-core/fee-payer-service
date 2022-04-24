require('dotenv').config()
const { ethers } = require('ethers');

const assert = require('assert')
const MQTT = require('async-mqtt')
const feePayer = require('../src/fee-payer')

const MQTT_URI = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`
const MQTT_TOPIC = process.env.TOPIC

const RPC = process.env.RPC || "http://localhost:9650/ext/bc/C/rpc"
const provider = new ethers.providers.JsonRpcProvider(RPC)
const nocoin = new ethers.Wallet.createRandom().connect(provider)
const dummy = new ethers.Wallet.createRandom()


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


describe('Fee payer', () => {
    let chainId
    let client

    before( async () => {
        client = await MQTT.connect(MQTT_URI) 
        client.on('connect', async () => {
            assert.equal(client.connected, true, 'Connection failed')
            await client.subscribe(`${MQTT_TOPIC}/#`)
        })

        chainId = await provider.getNetwork().chainId
       
    })
    
    after( async () => {
        if (client) {
            client.on('close', () => {
                console.log('Connection closed')
            })

            client.end(true)
            client = undefined
        }
    })
    
    it("tx fee payed", async () => {

        await assert.rejects(
            nocoin.sendTransaction({ to: dummy.address, gasLimit: 21000, }),
            { reason: 'insufficient funds for intrinsic transaction cost' },
        )

        const nonce = await nocoin.getTransactionCount('pending')

        const tx = {
            chainId,
            to: dummy.address,
            gasLimit: 21000,
            gasPrice: 0,
            nonce,
        }

        const rawSignedTx = await nocoin.signTransaction(tx)

        client.publish(`${MQTT_TOPIC}/${nocoin.address}`, rawSignedTx)
        
        client.on("message", async (topic, message) => {
            const [isValidSchema, isFeePayer] = await feePayer(message.toString())
            assert.equal(isValidSchema, true, 'Wrong format schema tx')
            assert.equal(isFeePayer, true, 'Payfor function failed')

            const newNonce = await nocoin.getTransactionCount('pending')
            assert.equal(newNonce, nonce + 1, 'Nocoin tx failed')
        })
    })
})