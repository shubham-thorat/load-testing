const http2 = require('node:http2');
const fs = require('node:fs');
const path = require('path');
const logger = require('gk-logger')({
  "log_file": '/node-http2.log',
  "error_file": '/node-http2-error.log'
});
const RedisClient = require('./redis/redisClient')

const server = http2.createSecureServer({
  key: fs.readFileSync(path.join(__dirname, '../ssl/localhost-privkey.pem')), //private key
  cert: fs.readFileSync(path.join(__dirname, '../ssl/localhost-cert.pem')),
  maxSessionMemory: 1000,
  settings: {
    maxConcurrentStreams: 1000
  }
});

const getTime = (startTime) => {
  return (Date.now() - startTime) / 1000;
}

let times = new Map();

server.on('stream', (stream, headers) => {
  const startTime = Date.now()
  const method = headers[':method'];
  const path = headers[':path'];
  const request_count = headers['count'] ?? 0;
  logger.info(JSON.stringify({
    "Method": method,
    "Path": path,
    "streamId": stream.id,
    "startTime": startTime,
  }));


  stream.on('aborted', () => {
    const timeRequired = getTime(startTime);
    console.log("server aborted")
    logger.error(JSON.stringify({
      msg: 'Stream Aborted',
      streamId: stream.id,
      time: timeRequired,
      TimeDiffServer: timeRequired,
      requestCount: request_count
    }))
  })

  stream.on('error', (err) => {

    const timeRequired = getTime(startTime);
    times.set(`${stream.id}_${startTime}`, timeRequired);
    console.log("server error occurred", JSON.stringify(err))
    logger.error(JSON.stringify({
      msg: `Error occured ${JSON.stringify(err)}`,
      streamId: stream.id,
      TimeDiffServer: timeRequired,
      requestCount: request_count
    }))
  })


  if (method === 'GET') {
    logger.info(`GET method request received at server for streamId : ${stream.id}`)
    stream.respond({ ':status': 200 });
    const timeRequired = getTime(startTime);
    stream.end(JSON.stringify({
      "Method": method,
      "Path": path,
      "streamId": stream.id,
      "TimeDiffServer": timeRequired,
      requestCount: request_count
    }))
  } else {
    let data = ''
    stream.setEncoding('utf-8')
    stream.on('data', (chunk) => {
      data += chunk
    })

    stream.on('end', () => {
      logger.info(JSON.stringify({
        streamId: stream.id,
        DataReceivedAtServer: data,
        requestCount: request_count
      }))

      try {
        const payload = data === '' ? '{}' : JSON.parse(data);
        RedisClient.setKey(payload.key, payload.value).then(response => {
          const timeRequired = getTime(startTime);
          logger.info(JSON.stringify({
            msg: 'Redis key set success',
            redisResponse: response,
            requestCount: request_count,
            TimeDiffServer: timeRequired,
          }))
          stream.respond({ ':status': 200 })
          stream.end(JSON.stringify({
            msg: 'Redis key set success',
            streamId: stream.id,
            requestCount: request_count,
            TimeDiffServer: timeRequired,
          }))
        }).catch(error => {
          const timeRequired = getTime(startTime);
          logger.error(JSON.stringify({ "Error while parsing or setting redis key": error }))
          stream.respond({ ':status': 500 })
          stream.end(JSON.stringify({
            msg: 'Redis key set failure',
            streamId: stream.id,
            requestCount: request_count,
            TimeDiffServer: timeRequired,
          }))
        })

      } catch (error) {
        const timeRequired = getTime(startTime);
        logger.error(JSON.stringify({ "Error while parsing payload or setting redis key": error }))
        stream.respond({ ':status': 500 })
        stream.end(JSON.stringify({
          msg: error,
          streamId: stream.id,
          requestCount: request_count,
          TimeDiffServer: timeRequired,
        }))
      }
    })

  }
})

stream.on('close', () => {
  console.log('connection closing....')
  let total_time = 0;
  for (let [key, value] of map) {
    total_time += value;
  }

  logger.info(JSON.stringify({ 'TOTAL TIME REQUIRED': total_time }));
  console.log('TOTAL TIME REQUIRED', total_time)
  console.log('connection end....')
  times.clear()
})

const port = process.env.PORT || 5000
server.listen(port, () => {
  console.log(`Server running https://localhost:${port}`)
})