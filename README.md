# grpc-clients-tracking

[![npm version](https://badge.fury.io/js/grpc-clients-tracking.svg)](https://www.npmjs.com/package/grpc-clients-tracking)
[![npm downloads](https://img.shields.io/npm/dt/grpc-clients-tracking.svg)](https://www.npmjs.com/package/grpc-clients-tracking)
[![dependencies](https://img.shields.io/david/litichevskiydv/grpc-clients-tracking.svg)](https://www.npmjs.com/package/grpc-clients-tracking)
[![dev dependencies](https://img.shields.io/david/dev/litichevskiydv/grpc-clients-tracking.svg)](https://www.npmjs.com/package/grpc-clients-tracking)
[![Build Status](https://travis-ci.org/litichevskiydv/grpc-clients-tracking.svg?branch=master)](https://travis-ci.org/litichevskiydv/grpc-clients-tracking)
[![Coverage Status](https://coveralls.io/repos/github/litichevskiydv/grpc-clients-tracking/badge.svg?branch=master)](https://coveralls.io/github/litichevskiydv/grpc-clients-tracking?branch=master)

Interceptors for the client and server to collect statistics about consumer calls through Prometheus

# Install

`npm i grpc-clients-tracking`

# Usage

```javascript
const { clientInterceptorsFactory, serverInterceptor } = require("grpc-clients-tracking");

/*...*/

const server = new GrpcHostBuilder()
  /*...*/
  .addInterceptor(serverInterceptor)
  /*...*/
  .bind(grpcBind)
  .build();

/*...*/
const client = new ServerClient(grpcBind, grpc.credentials.createInsecure(), {
  interceptors: [clientInterceptorsFactory()]
});
```

## Metrics example

```
# HELP grpc_server_calls_total Total number of calls, made by various consumers.
# TYPE grpc_server_calls_total counter
grpc_server_calls_total{consumer_name="consumer-app",consumer_version="1.0.1",client_version="2.3.5",grpc_method="SayHello",grpc_service="v1.Greeter",grpc_type="unary"} 1
```
