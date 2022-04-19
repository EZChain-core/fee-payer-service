const { ethers } = require('ethers')
const { getWallet } = require('../lib/accounts')
const { createEVMPP } = require('../lib/evmpp')

const RPC = process.env.RPC || "http://localhost:9650/ext/bc/C/rpc"
const provider = new ethers.providers.JsonRpcProvider(RPC)
const nocoin = new ethers.Wallet.createRandom().connect(provider)

module.exports = async (evmpp, _message) => {
    const message = JSON.parse(_message)
    const tx = {
        chainId: message["chainId"],
        to: message["to"],
        gasLimit: message["gasLimit"],
        gasPrice: message["gasPrice"],
        nonce: message["nonce"],
        value: message["value"]
    }

    const rawSignedTx = await nocoin.signTransaction(tx)
    const t = ethers.utils.parseTransaction(rawSignedTx)
    const res = await evmpp.payFor(
        t.to,
        t.data,
        t.nonce,
        t.gasLimit,
        t.v, t.r, t.s, {
            // gasPrice: t.gasPrice,
            value: t.value
        },
    )
    await res.wait(1);
}