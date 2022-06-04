const { ethers, BigNumber } = require('ethers')

const { NonceManager } = require("@ethersproject/experimental")

const { ERC20ABI } = require('../../abis/erc20.json')

const { incrTxNum, getValue } = require('../connections/redis')

const { sendAlert } = require('../connections/telegram')

const { createEVMPP } = require('../../lib/evmpp')

const RPC = process.env.RPC || "http://localhost:9650/ext/bc/C/rpc"

const provider = new ethers.providers.JsonRpcProvider(RPC)

const { DISCARDED_STATUS, SENT_STATUS, ERROR_STATUS } = require('../utils/constants')

const { mysqlCreateTx, mysqlGetTxs } = require('../connections/mysql')

const minFeeAlert = process.env.MINIMUM_FEE_ALERT
const fetchBalanceTxTimes = process.env.FETCH_BALANCE_TX_TIMES
const callLogsAccessList = [{
    address: "0x5555555555555555555555555555555555555555",
    storageKeys: ["0x5555555555555555555555555555555555555555555555555555555555555555"],
}]

const SGOLD_CONTRACT = process.env.SGOLD_CONTRACT

const sgold = new ethers.Contract(SGOLD_CONTRACT, ERC20ABI, provider)

const evmpp = createEVMPP(provider, {
    returns: {
        sponsor: ''
    },
})

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

const privateKeys = process.env.PRIVATE_KEYS.split(",")

var wallets = {}
var txCount = {}
var walletNonces = {}

const initWallets = async () => {
    for (let i  = 0; i < privateKeys.length; i++) {
        const w = new ethers.Wallet(privateKeys[i], provider)
        wallets[w.address] = w
        txCount[w.address] = 0

        const nonce = await w.getTransactionCount('pending')
        walletNonces[w.address] = nonce

        console.log(`${i}: ${w.address} - ${nonce}`)
    }

    console.log(`Wallets size: ${privateKeys.length}`)
    console.log(`txCount size: ${privateKeys.length}`)
}

const txSchema = {
    nonce: value => parseInt(value) === Number(value),
    gasPrice: value => (value === null) ? true : ethers.utils.isHexString(value._hex),
    gasLimit: value => ethers.utils.isHexString(value._hex),
    to: value => ethers.utils.isAddress(value),
    value: value => ethers.utils.isHexString(value._hex),
    data: value => ethers.utils.isHexString(value),
    chainId: value => parseInt(value) === Number(value),
    v: value => parseInt(value) === Number(value),
    r: value => ethers.utils.isHexString(value),
    s: value => ethers.utils.isHexString(value),
    from: value => ethers.utils.isAddress(value),
    hash: value => ethers.utils.isHexString(value),
}

const validate = (object, schema) => Object
    .keys(schema)
    .filter(key => !schema[key](object[key]))
    .map(key => Error(`${key} is invalid.`))


const getBalance = async (address) => {
    const balance = await provider.getBalance(address)
    return ethers.utils.formatEther(balance)
}

const getWallet = async () => {
    let arr = Object.values(txCount)
    let min = Math.min(...arr)
    const address = Object.keys(txCount).find(key => txCount[key] === min)
    txCount[address] += 1

    console.log(`Get Wallet ${address} with tx count: ${min}`)
    return wallets[address]
}

const getTxs = async (address, status, lastTime, limit) => {

    let result = []

    const _statuses = status.split(",")

    if (lastTime == 0) {
        lastTime = Date.now()
    }
    
    const txs = await mysqlGetTxs(address, _statuses, lastTime, parseInt(limit))
    for (let i = 0; i < txs.length; i++) {
        const tx = ethers.utils.parseTransaction(txs[i]["raw_sign_tx"])
        tx["gasPrice"] = tx["gasPrice"].toString()
        tx["gasLimit"] = tx["gasLimit"].toString()
        tx["value"] = tx["value"].toString()
        result.push({
            "tx": tx,
            "status": txs[i]["status"],
            "error": txs[i]["error"],
            "created_at": txs[i]["created_at"],
        })
    }

    return result
}

const handleAlert = async (address) => {
    const txNum = await getValue(address)
    if (txNum % fetchBalanceTxTimes == 0 ) {
        const balance = await getBalance(address)
        if (balance <= minFeeAlert) {
            await sendAlert(address, balance)
        }
    }
    await incrTxNum(address)
}

function anyGtOne(logs) {
    for (const log of logs) {
        if (log.address.toLowerCase() != SGOLD_CONTRACT.toLowerCase()) {
            continue
        }

        const logDesc = sgold.interface.parseLog({ topics: log.topics, data: log.data })
        if (logDesc.name == 'Transfer' && logDesc.args[2].gt(0)) {
            return true
        }
    }
    return false
}

const _wrapTx = async (rawSignedTx) => {
 
    // console.log(`[${new Date().toISOString()}] - rawSignedTx: ${rawSignedTx}`)

    let isValidSchema = false
    const tx = ethers.utils.parseTransaction(`${rawSignedTx}`)
    const errors = validate(tx, txSchema)
    if (errors.length > 0) {
        let _errors = ""
        for (const { message } of errors) {
            _errors = message + "\n"
        }
        return [null, isValidSchema, -1, ERROR_STATUS, _errors]
    }

    // console.log(`[${new Date().toISOString()}] - Tx: ${JSON.stringify(tx)}`)
    isValidSchema = true

    const wallet = await getWallet()
    // const nonce = await wallet.getTransactionCount('pending')

    const nonce = walletNonces[wallet.address]

    console.log(`[${new Date().toISOString()}] - STRESS TEST : ${wallet.address} - ${nonce}`)

    try {
        await evmpp.callStatic.sponsor(rawSignedTx, { accessList: callLogsAccessList })
    } catch (err) {
        if (err.reason) {
            try {
                const result = JSON.parse(err.reason)
                if (result.err || !result.logs || !anyGtOne(result.logs)) {
                    return [tx["from"], isValidSchema, false, DISCARDED_STATUS, err.reason]
                }
            } catch (error) {
                console.log(error)
                return [tx["from"], isValidSchema, -1, DISCARDED_STATUS, err.reason]
            }
            
        } else {
            console.error(err)
            return [tx["from"], isValidSchema, -1, ERROR_STATUS, err]
        }
    }
    
    try {
        const res = await evmpp.connect(wallet).sponsor(rawSignedTx, { nonce })
        await res.wait(1)
    } catch (err) {
        console.log(`HIHI Error: ${err} `)
        return [tx["from"], isValidSchema, -1, ERROR_STATUS, err]
    }

    walletNonces[wallet.address] += 1

    // const newNonce = await wallet.getTransactionCount('pending')

    // await handleAlert(tx["from"])

    // console.log(`[${new Date().toISOString()}] - Tx: ${JSON.stringify(tx)}`)
    
    // await sleep(50)

    return [tx["from"], isValidSchema, nonce, SENT_STATUS, null]
}


const wrapTx = async (rawSignedTx) => {
    const [senderAddr, isValidSchema, nonce, status, error] = await _wrapTx(rawSignedTx)

    if (!!senderAddr) {
        await mysqlCreateTx(senderAddr, rawSignedTx, status, JSON.stringify(error), Date.now())
    } else {
        console.log(`[${new Date().toISOString()}] - Address from is Null:`)
    }

    return [isValidSchema, nonce]
}

module.exports = {
    wrapTx: wrapTx,
    getBalance: getBalance,
    getTxs: getTxs,
    initWallets: initWallets
}