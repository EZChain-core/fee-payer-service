const { ethers } = require('ethers')
const { abi } = require('../../abis/fee-payer.json');
const { incrTxNum, getValue } = require('../connections/redis');
const { sendAlert } = require('../connections/telegram');

const RPC = process.env.RPC || "http://localhost:9650/ext/bc/C/rpc"
const provider = new ethers.providers.JsonRpcProvider(RPC)

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.ADDRESS, abi, wallet)

const minFeeAlert = process.env.MINIMUM_FEE_ALERT

const fetchBalanceTxTimes = process.env.FETCH_BALANCE_TX_TIMES

const txSchema = {
    nonce: value => parseInt(value) === Number(value),
    gasPrice: value => (value === null) ? true: ethers.utils.isHexString(value._hex),
    gasLimit: value => ethers.utils.isHexString(value._hex),
    to: value => ethers.utils.isAddress(value),
    value: value => ethers.utils.isHexString(value._hex),
    data: value => ethers.utils.isHexString(value),
    chainId: value => parseInt(value) === Number(value),
    v: value => parseInt(value) === Number(value),
    r: value => ethers.utils.isHexString(value),
    s: value => ethers.utils.isHexString(value),
    from:  value => ethers.utils.isAddress(value),
    hash: value => ethers.utils.isHexString(value),
}

const validate = (object, schema) => Object
    .keys(schema)
    .filter(key => !schema[key](object[key]))
    .map(key => Error(`${key} is invalid.`));


const getTx = async (txHash) => {
    const txReceipt = await provider.waitForTransaction(txHash)
    return txReceipt
}

const validateTx = async (txHash) => {
    const receipt = await provider.waitForTransaction(txHash)
    if ((receipt.status === 1) && (receipt.logs.length > 0)) {
        return true
    }
    return false
}

const handleAlert = async (address) => {
    const txNum = await getValue(address)
    if (txNum % fetchBalanceTxTimes == 0 ) {
        const balance = await provider.getBalance(address)
        if (balance < minFeeAlert) {
            await sendAlert(address, balance)
        }
    }
    await incrTxNum(address)
}

const wrapTx = async (rawSignedTx) => {
    console.log(`[${new Date().toISOString()}] - rawSignedTx: ${rawSignedTx}`)

    let isValidSchema = false
    const tx = ethers.utils.parseTransaction(`${rawSignedTx}`)
    const errors = validate(tx, txSchema)
    if (errors.length > 0) {
        for (const { message } of errors) {
            console.log(message);
        }
        return [isValidSchema, false]
    }

    console.log(`[${new Date().toISOString()}] - Tx: ${JSON.stringify(tx)}`)
    isValidSchema = true

    try {
        await contract.callStatic.sponsor(rawSignedTx)
    } catch (err) {
        console.log(err)
        return [isValidSchema, false]
    }

    const nonce = await wallet.getTransactionCount('pending')

    const res = await contract.sponsor(rawSignedTx)
    
    await res.wait(1);

    const newNonce = await wallet.getTransactionCount('pending')
    
    await handleAlert(tx["from"])
    
    return [isValidSchema, (nonce + 1) === newNonce]
}


module.exports = {
    getTx: getTx,
    wrapTx: wrapTx,
    validateTx: validateTx
}