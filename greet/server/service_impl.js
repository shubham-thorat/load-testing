const logger = require('gk-logger')();
const pb = require('../proto/greet_pb')
const RedisClient = require('./redis/redisClient');

exports.greet = (call, callback) => {
  logger.info('Greet was invoked');
  const res = new pb.GreetResponse()
    .setResult(`Hello ${call.request.getFirstName()}`)
  callback(null, res);
}

exports.greetManyTimes = (call, _) => {
  logger.info('greetManyTimes was invoked');
  const res = new pb.GreetResponse();

  for (let i = 0; i < 10; i++) {
    res.setResult(`Hello ${call.request.getFirstName()} - number ${i}`);
    call.write(res);
  }
  call.end();
}

exports.longGreet = (call, callback) => {
  logger.info('longGreet was invoked');
  let greet = '';

  call.on('data', (chunk) => {
    logger.info(`Data received ${chunk}`)
    greet += chunk;
  });

  call.on('end', () => {
    logger.info(`Data received at end ${greet}`)
    const res = new pb.GreetResponse().setResult(greet);
    callback(null, res);
  })

}


exports.manyLongGreet = (call, calback) => {

  call.on('data', (req) => {
    logger.info(`Request received ${req}`);
    const res = new pb.GreetResponse().setResult(`Hello ${req.getFirstName()}`)

    logger.info(`Sending response ${res}`);
    call.write(res);
  })

  call.on('end', () => call.end());
}

let total_time = 0;
let min_value = 0, max_value = 0;
exports.storeRedisData = (call, callback) => {
  const startTime = Date.now();
  if (min_value === 0) {
    min_value = startTime;
  }

  call.on('data', (req) => {
    logger.info(JSON.stringify({
      msg: 'StoreRedisData request received',
      type: req.getType(),
      rid: req.getRid(),
      key: req.getKey(),
      value: req.getValue(),
    }))


    RedisClient.setKey(req.getKey(), req.getValue()).then(response => {
      let res;
      if (response) {
        res = new pb.RedisResponse()
          .setStatus(200)
          .setMessage('Redis Success');
      } else {
        res = new pb.RedisResponse()
          .setStatus(500)
          .setMessage('Redis Success Failed');
      }
      const endTime = Date.now();
      total_time += (endTime - startTime);
      max_value = Math.max(max_value, endTime);
      logger.info(JSON.stringify({
        startTime: startTime,
        endTime: endTime,
        "Time Diff": (endTime - startTime) / 1000,
        "Total Time": total_time / 1000,
        "max time - min time": (max_value - min_value) / 1000
      }))

      call.write(res);
    }).catch(error => {
      const res = new pb.RedisResponse()
        .setStatus(500)
        .setMessage(`Redis Success Failed Error - ${error}`);
      call.write(res)
    })
  })

  call.on('end', () => call.end());
}