require('dotenv').config()
const { ethers } = require('ethers');

const assert = require('assert')
const MQTT = require('async-mqtt')
const { wrapTx } = require('../app/usecases/fee-payer')
const { initRedisConn, closeRedisConn } = require('../app/connections/redis')

const MQTT_URI = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`
const MQTT_TOPIC = process.env.TOPIC

const RPC = process.env.RPC || "http://localhost:9650/ext/bc/C/rpc"
const provider = new ethers.providers.JsonRpcProvider(RPC)
const nocoin = new ethers.Wallet.createRandom().connect(provider)
const dummy = new ethers.Wallet.createRandom()

describe("Integration test with chain", () => {
    let chainId
    let client

    before( async () => {
        client = await MQTT.connect(MQTT_URI) 
        client.on('connect', async () => {
            assert.equal(client.connected, true, 'Connection failed')
        })

        chainId = await provider.getNetwork()
        chainId = chainId.chainId
        console.log(`ChainID ${JSON.stringify(chainId)}`)

        await initRedisConn()
    })
    
    after( async () => {
        if (client) {
            client.on('close', () => {
                console.log('Connection closed')
            })

            client.end(true)
            client = undefined
        }

        await closeRedisConn()
    })

    it("tx fee payed", () => {
        return new Promise(async (resolve, reject) => {

            await client.subscribe(`${MQTT_TOPIC}/#`)

            await assert.rejects(
                nocoin.sendTransaction({ to: dummy.address, gasLimit: 21000, }),
                { reason: 'insufficient funds for intrinsic transaction cost' },
            )

            client.on("message", async (topic, message) => {

                try {
                    const [isValidSchema, isFeePayer] = await wrapTx(message.toString())
                    assert.equal(isValidSchema, true, 'Wrong format schema tx')
                    assert.equal(isFeePayer, true, 'Payfor function failed')
                    
                    const newNonce = await nocoin.getTransactionCount('pending')
                    console.log(`Nonce ${nonce} newNonce ${newNonce}`)
                    assert.equal(newNonce, nonce + 1, 'Nocoin tx failed')

                    resolve()
                } catch (err) {
                    console.log(err)
                    reject()
                }
                
            })
            
            const nonce = await nocoin.getTransactionCount('pending')
            
            const tx = {
                chainId,
                to: dummy.address,
                gasLimit: 21000,
                gasPrice: 0,
                nonce,
                type: 0
            }

            await nocoin.sendTransaction(tx)
        })

    })
})

/*
Test send tele
Test api status
Test validateTX
*/