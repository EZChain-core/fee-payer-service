const TelegramBot = require('node-telegram-bot-api')

const token = process.env.BOT_TOKEN

const chatId = process.env.CHAT_ID

const bot = new TelegramBot(token)

sendAlert = async (address, balance) => {
    const msg = `Address: ${address}\nBalance: ${balance}`
    bot.sendMessage(chatId, msg)
}

module.exports = {
    sendAlert: sendAlert
}