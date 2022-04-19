const { ethers } = require('ethers');

async function getWallet(name, provider, amount, fromWallet) {
    if (!fromWallet) {
        fromWallet = new ethers.Wallet("0xbcdc5b7856952d6fb8090f39979872f7bce32191", provider)
    }
    amount = ethers.utils.parseEther(amount ?? '1000')
    const wallet = new ethers.Wallet(ethers.utils.id(name), provider)
    const to = await wallet.getAddress()
    const balance = await wallet.getBalance('pending')
    if (balance.gte(amount)) {
        console.log(`using ${to} for ${name}`)
        return wallet
    }

    while (true) {
        try {
            console.log(`funding ${to} for ${name}`)
            const res = await fromWallet.sendTransaction({ to, value: amount.mul(2).sub(balance).toString() })
            await res.wait(1)
            return wallet
        } catch(err) {
            // ignore error and retry
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000)));
        }
    }
}

exports.getWallet = getWallet;
