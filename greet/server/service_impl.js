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

let index = 0;
exports.storeRedisData = (call, callback) => {

  call.on('data', (req) => {
    index += 1;
    logger.info(JSON.stringify({
      msg: 'StoreRedisData request received',
      type: req.getType(),
      rid: req.getRid(),
      key: req.getKey(),
      value: req.getValue(),
      "requestCount": index
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