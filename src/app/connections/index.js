
const { initMQTTConn, closeMQTTConn } = require("./subscriber")
const { initRedisConn, closeRedisConn } = require("./redis")
const { initTxTable } = require('./mysql')

const init = () => {
    initMQTTConn()
    initRedisConn()
    initTxTable()
}

const close = () => {
    closeRedisConn()
    closeMQTTConn()
}

module.exports = {
    initConnection: init,
    closeConnection: close,
}