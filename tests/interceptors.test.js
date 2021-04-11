const path = require("path");
const grpc = require("@grpc/grpc-js");
const { register: metricsRegistry } = require("prom-client");
const { GrpcHostBuilder } = require("grpc-host-builder");
const { loadSync } = require("grpc-pbf-loader").packageDefinition;

const { clientInterceptorsFactory, serverInterceptor } = require("../src/index");
const clientInterceptor = clientInterceptorsFactory({ clientVersion: "1.1.1" });

const {
  HelloRequest: ServerHelloRequest,
  HelloResponse: ServerHelloResponse,
  ErrorRequest: ServerErrorRequest,
} = require("./generated/server/greeter_pb").v1;
const {
  Event,
  HelloRequest: ClientHelloRequest,
  ErrorRequest: ClientErrorRequest,
  GreeterClient,
} = require("./generated/client/greeter_client_pb").v1;

const grpcBind = "0.0.0.0:3000";
const packageObject = grpc.loadPackageDefinition(
  loadSync(path.join(__dirname, "./protos/greeter.proto"), {
    includeDirs: [path.join(__dirname, "./include/")],
  })
);

/** @type {import("@grpc/grpc-js").Server} */
let server = null;
/** @type {GreeterClient} */
let client = null;

grpc.setLogVerbosity(grpc.logVerbosity.ERROR + 1);

/**
 * @returns {Promise<import("@grpc/grpc-js").Server>}
 */
const createServer = () =>
  new GrpcHostBuilder()
    .useLoggersFactory(() => ({ error: jest.fn() }))
    .addInterceptor(serverInterceptor)
    .addService(packageObject.v1.Greeter.service, {
      sayHello: async (call) => {
        const request = new ServerHelloRequest(call.request);

        const event = request.event;
        event.id = event.name.charCodeAt(0);
        return new ServerHelloResponse({ event });
      },
      throwError: () => {
        throw new Error("Something went wrong");
      },
    })
    .bind(grpcBind)
    .buildAsync();

/**
 * @returns {GreeterClient}
 */
const createClient = () =>
  new GreeterClient(grpcBind, grpc.credentials.createInsecure(), { interceptors: [clientInterceptor] });

/**
 * @param {string} [name]
 * @returns {Promise<import("./generated/client/greeter_client_pb").v1.HelloResponse>}
 */
const sayHello = (name) => {
  const event = new Event();
  event.setName(name || "Lucky Every");

  const request = new ClientHelloRequest();
  request.setEvent(event);

  return client.sayHello(request);
};

/**
 * @param {import("@grpc/grpc-js").CallOptions} [callOptions]
 * @returns {Promise<void>}
 */
const throwError = async (callOptions) => {
  const request = new ClientErrorRequest();
  request.setSubject("Learning");

  await client.throwError(request, null, callOptions);
};

const prepareErrorMatchingObject = (innerErrorMessage) =>
  expect.objectContaining({
    message: "13 INTERNAL: Unhandled exception has occurred",
    details: [expect.objectContaining({ detail: innerErrorMessage })],
  });

/**
 * @param {{[label: string]: string}} labels
 */
const verifyMetricsValues = async (labels) => {
  const metrics = await metricsRegistry.getMetricsAsJSON();

  const grpcServerCallsTotal = metrics.find((x) => x.name === "grpc_server_calls_total");
  expect(grpcServerCallsTotal.values).toEqual(expect.arrayContaining([{ value: 1, labels }]));
};

afterEach(() => {
  if (client) {
    client.close();
    client = null;
  }
  if (server) {
    server.forceShutdown();
    server = null;
  }

  metricsRegistry.resetMetrics();
});

test("Must register successful call", async () => {
  // Given
  server = await createServer();
  client = createClient();

  const labels = {
    consumer_name: "grpc-clients-tracking",
    consumer_version: process.env.npm_package_version,
    client_version: "1.1.1",
    grpc_method: "SayHello",
    grpc_service: "v1.Greeter",
    grpc_type: "unary",
  };

  // When
  await sayHello();

  // Then
  verifyMetricsValues(labels);
});

test("Must register errored call", async () => {
  // Given
  server = await createServer();
  client = createClient();

  const labels = {
    consumer_name: "grpc-clients-tracking",
    consumer_version: process.env.npm_package_version,
    client_version: "1.1.1",
    grpc_method: "ThrowError",
    grpc_service: "v1.Greeter",
    grpc_type: "unary",
  };

  // When
  await expect(throwError()).rejects.toMatchObject(prepareErrorMatchingObject("Something went wrong"));

  // Then
  verifyMetricsValues(labels);
});
