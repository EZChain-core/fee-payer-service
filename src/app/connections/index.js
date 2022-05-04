
const { initMQTTConn, closeMQTTConn } = require("./subscriber")
const { initRedisConn, closeRedisConn } = require("./redis")

const init = () => {
    initMQTTConn()
    initRedisConn()
}

const close = () => {
    closeRedisConn()
    closeMQTTConn()
}

module.exports = {
    initConnection: init,
    closeConnection: close
}