const { ethers } = require('ethers')
const { abi } = require('../abis/fee-payer.json');
const RPC = process.env.RPC || "http://localhost:9650/ext/bc/C/rpc"
const provider = new ethers.providers.JsonRpcProvider(RPC)

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.ADDRESS, abi, wallet)

module.exports = async (message) => {
    const tx = JSON.parse(message)
    const res = await contract.payFor(
        tx["to"],
        tx["data"],
        tx["nonce"],
        tx["gasLimit"],
        tx["v"], tx["r"], tx["s"], {
            value: tx["value"]
        },
    )
    const receipt = await res.wait(1);
    console.log(`receipt ${JSON.stringify(receipt)}`)
}