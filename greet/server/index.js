const grpc = require('@grpc/grpc-js');
const serviceImpl = require('./service_impl');
const logger = require('gk-logger')();
const { GreetServiceService } = require('../proto/greet_grpc_pb');
const fs = require('fs');
const path = require('path');


const addr = '172.31.33.177:5051';


function cleanup(server) {
  logger.info('Server cleanup method is calling');
  if (server) {
    logger.info('Server Shutting down forcefully....');
    server.forceShutdown();
  }
}

process.on('SIGINT', function () {
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  // some other closing procedures go here
  process.exit(0);
});


function main() {
  const server = new grpc.Server();

  process.on('SIGINT', () => {
    logger.error('Caught Interrupt Signal, Calling cleanup method');
    cleanup(server);
  })
  server.addService(GreetServiceService, serviceImpl);


  const tls = true;
  let creds;
  if (tls) {
    const rootCert = fs.readFileSync(path.join(__dirname, '../../ssl/ca.crt'));
    const rootChain = fs.readFileSync(path.join(__dirname, '../../ssl/server.crt'));
    const privateKey = fs.readFileSync(path.join(__dirname, '../../ssl/server.pem')); //private key

    creds = grpc.ServerCredentials.createSsl(rootCert, [{
      cert_chain: rootChain,
      private_key: privateKey
    }])
  } else {
    creds = grpc.ServerCredentials.createInsecure()
  }

  server.bindAsync(addr, creds, (err, _) => {
    if (err) {
      return cleanup(server);
    }
    server.start();
  });

  // logger.info(`Server start on running ${addr}`)
  console.log(`Server start on running ${addr}`)
}

main();