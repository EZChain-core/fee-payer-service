const { ethers } = require('ethers')
const { abi } = require('../abis/fee-payer.json');
const RPC = process.env.RPC || "http://localhost:9650/ext/bc/C/rpc"
const provider = new ethers.providers.JsonRpcProvider(RPC)

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.ADDRESS, abi, wallet)

const txSchema = {
    nonce: value => parseInt(value) === Number(value),
    gasPrice: value => ethers.utils.isHexString(value._hex),
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


module.exports = async (message) => {
    let isValidSchema = false
    const tx = ethers.utils.parseTransaction(`${message}`)
    const errors = validate(tx, txSchema)
    if (errors.length > 0) {
        for (const { message } of errors) {
            console.log(message);
        }
        return [isValidSchema, false]
    }

    isValidSchema = true

    const nonce = await wallet.getTransactionCount('pending')

    const res = await contract.payFor(
        tx["to"],
        tx["data"],
        tx["nonce"],
        tx["gasLimit"]["_hex"],
        tx["v"], tx["r"], tx["s"], {
            value: tx["value"]["_hex"]
        },
    )
    await res.wait(1);
    const newNonce = await wallet.getTransactionCount('pending')
    return [isValidSchema, (nonce + 1) === newNonce]
}