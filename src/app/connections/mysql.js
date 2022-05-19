var mysql = require("mysql");

var util = require('util');

var pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USR,
    password: process.env.MYSQL_PWD,
    database: process.env.MYSQL_DB
});

pool.getConnection((err, conn) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.')
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.')
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.')
        } else {
            console.error(err)
        }
    }
})

pool.query = util.promisify(pool.query)

const TABLE_NAME = "transactions"

const initTable = async () => {
    const sql = `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        address varchar(50) NOT NULL,
        raw_sign_tx varchar(1024) DEFAULT NULL,
        status varchar(45) NOT NULL,
        error varchar(1024) DEFAULT NULL,
        created_at bigint NOT NULL,
        PRIMARY KEY (address, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`

    const data = await pool.query(sql)
    return data 
}

const createTx = async (addr, rawSignTx, txStatus, txError, createdAt) => {
    console.log(
        `[${new Date().toISOString()}] - Create tx - 
        addr: ${addr}, rawSignTx: ${rawSignTx}, txStatus: ${txStatus}`
    )

    const tx = {
        'address': addr,
        'raw_sign_tx': rawSignTx,
        'status': txStatus,
        'error': txError.substring(0, 1024),
        'created_at': createdAt
    }

    const sql = `INSERT INTO ${TABLE_NAME} SET ?`
    return await pool.query(sql, tx) 
}

const getTxs = async (addr, statuses, last_time, limit) => {
    const sql = `SELECT * FROM ${TABLE_NAME} WHERE address = ? AND created_at < ? AND status IN (?) ORDER BY created_at desc LIMIT ?`
    return await pool.query(sql, [addr, last_time, statuses, limit])
}

module.exports = {
    initTxTable: initTable,
    mysqlCreateTx: createTx,
    mysqlGetTxs: getTxs
}