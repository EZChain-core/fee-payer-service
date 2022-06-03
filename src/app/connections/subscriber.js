const Queue = require('bee-queue');

const queue = new Queue('wrap-tx-queue', {
    prefix: 'bq',
    stallInterval: 5000,
    nearTermWindow: 1200000,
    delayedDebounce: 1000,
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
        db: process.env.REDIS_DB || 0,
        options: {},
    },
    isWorker: true,
    getEvents: true,
    sendEvents: true,
    storeJobs: true,
    ensureScripts: true,
    activateDelayedJobs: false,
    removeOnSuccess: false,
    removeOnFailure: false,
    redisScanCount: 100,
});

const MQTT = require('async-mqtt')

const { wrapTx } = require('../usecases/fee-payer')

const uri = `mqtt://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}`

console.log(`MQTT CONNECT: ${uri} topic: ${process.env.TOPIC}`)

const subscriber = MQTT.connect(uri)

const init = () => {
    subscriber.on('connect', async () => {
        await subscriber.subscribe(`${process.env.TOPIC}/#`, (err) => {
            if (err) {
                console.log(`Subscriber can't connect with error:  ${err}`)
                return
            }
            console.log(`Subscriber connected`)
        })
    })

    subscriber.on('message', async (topic, message) => {

        const job = queue.createJob({ message: message.toString() });
        job.save();
        job.on('succeeded', (result) => {
            console.log(`Received result for job ${job.id}: ${result}`);
        });

    })

    subscriber.on('close', () => {
        console.log('Connection closed by subscriber')
    })

    subscriber.on('reconnect', () => {
        console.log('Subscriber trying a reconnection')
    })
}

const close = () => {
    subscriber.end()
}


// Process jobs from as many servers or processes as you like
queue.process(async (job) => {
    console.log(`Processing job ${job.id}`);
    const [isValidSchema, nonce] = await wrapTx(job.data.message)

    const msg = `isValidSchema: ${isValidSchema} - sponsored at nonce: ${nonce}`
    console.log(`[${new Date().toISOString()}] - wrapTx: ${msg}`)

    return nonce;
});

queue.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error ${err.message}`);
});

queue.on('stalled', (jobId) => {
    console.log(`Job ${jobId} stalled and will be reprocessed`);
});

queue.on('retrying', (job, err) => {
    console.log(
        `Job ${job.id} failed with error ${err.message} but is being retried!`
    );
});

queue.on('succeeded', (job, result) => {
    console.log(`Job ${job.id} succeeded with result: ${result}`);
});

queue.on('error', (err) => {
    console.log(`A queue error happened: ${err.message}`);
});

module.exports = {
    initMQTTConn: init,
    closeMQTTConn: close
}