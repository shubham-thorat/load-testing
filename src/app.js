const http2 = require('node:http2');
const fs = require('node:fs');
const path = require('path');
const logger = require('gk-logger')({
  "log_file": '/node-http2.log',
  "error_file": '/node-http2-error.log'
});
const RedisClient = require('./redis/redisClient')
const helper = require('./helper')

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

process.on('SIGINT', function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  // some other closing procedures go her
  process.exit(0);
});

class Count {
  static request_count = 0;
  static setInitial() {
    this.request_count = 0;
  }
  static increment() {
    this.request_count = this.request_count + 1
    return this.request_count
  }
  static getCount() {
    return this.request_count
  }
}

server.on('stream', (stream, headers) => {
  // console.log("stream started.....")
  const startTime = Date.now()

  const method = headers[':method'];
  const path = headers[':path'];
  // console.log("headers", headers)
  const serverlogfileName = headers['logfilepath'];

  // logger.info(JSON.stringify({
  //   "Method": method,
  //   "Path": path,
  //   "streamId": stream.id,
  //   "startTime": startTime,
  // }));


  stream.on('aborted', () => {
    const timeRequired = getTime(startTime);
    console.log("server aborted")
    logger.error(JSON.stringify({
      msg: 'Stream Aborted',
      streamId: stream.id,
      time: timeRequired,
      TimeDiffServer: timeRequired
    }))
  })

  stream.on('error', (err) => {

    const timeRequired = getTime(startTime);
    console.log("server error occurred", JSON.stringify(err))
    logger.error(JSON.stringify({
      msg: `Error occured ${JSON.stringify(err)}`,
      streamId: stream.id,
      TimeDiffServer: timeRequired,
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
      }))

      try {
        const payload = data === '' ? '{}' : JSON.parse(data);

        RedisClient.setKey(payload.key, payload.value).then(response => {
          const endTime = Date.now();
          stream.respond({ ':status': 200 })
          Count.increment()
          const timeRequired = endTime - startTime;

          helper.writeToFile(timeRequired, Count.getCount(), serverlogfileName, logger)

          logger.info(JSON.stringify({
            streamId: stream.id,
            TimeDiffServer: (endTime - startTime) / 1000,
            request_count: Count.getCount()
          }))

          stream.end(JSON.stringify({
            msg: 'Redis key set success',
            streamId: stream.id,
            TimeDiffServer: (endTime - startTime) / 1000,
            "request count": Count.getCount()
          }))

        }).catch(error => {
          const timeRequired = getTime(startTime);
          logger.error(JSON.stringify({ "Error while parsing or setting redis key": error }))
          stream.respond({ ':status': 500 })
          stream.end(JSON.stringify({
            msg: 'Redis key set failure',
            streamId: stream.id,
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
          TimeDiffServer: timeRequired,
        }))
      }
    })

  }
})




const port = process.env.PORT || 6000
server.listen(port, () => {
  try {
    if (!fs.existsSync('./output')) {
      fs.mkdirSync('./output');
      console.log('Output Folder created')
    }
  } catch (err) {
    console.log(`Error while creating output folder..`)
  }

  Count.setInitial()
  console.log(`Server running https://localhost:${port}`)
})
