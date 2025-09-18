const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { BatchSpanProcessor, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const init = () => {
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'hybrid-todo-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  });

  const otlpExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://hybrid-b025c6.ingest.us-west1.gcp.elastic.cloud:443/v1/traces',
    headers: {
      'Authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS || 'ApiKey UnR5Wldwa0JYbkhCX2Y1RUhIUDM6WWtzejlFU2h2b1ZucllHaElaRXU0QQ=='
    },
  });

  console.log('🚀 [HYBRID] OTLP Exporter configured:');
  console.log(`   URL: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://hybrid-b025c6.ingest.us-west1.gcp.elastic.cloud:443/v1/traces'}`);

  const sdk = new NodeSDK({
    resource: resource,
    spanProcessor: new BatchSpanProcessor(otlpExporter, {
      maxExportBatchSize: 10,
      exportTimeoutMillis: 5000,
      scheduledDelayMillis: 1000
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-http': {
          applyCustomAttributesOnSpan: (span, request, response) => {
            span.setAttributes({
              'auto.http.user_agent': request.headers?.['user-agent'] || 'unknown',
              'auto.http.content_type': response.headers?.['content-type'] || 'unknown',
            });
          },
        },
        '@opentelemetry/instrumentation-express': {
          applyCustomAttributesOnSpan: (span, request) => {
            span.setAttributes({
              'auto.express.request_id': request.headers?.['x-request-id'] || 'unknown',
              'auto.express.user_ip': request.ip || request.connection?.remoteAddress || 'unknown',
            });
          },
        },
      }),
    ],
  });

  sdk.start();
  console.log('🚀 [HYBRID] OpenTelemetry tracing initialized');
  console.log(`   Service: hybrid-todo-app`);
  console.log(`   OTLP endpoint: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://hybrid-b025c6.ingest.us-west1.gcp.elastic.cloud:443/v1/traces'}`);
  console.log(`   Mode: Automatic + Manual instrumentation`);
  console.log(`   Auto instrumentations: HTTP, Express, Elasticsearch`);

  // Send a test span to verify the exporter is working
  setTimeout(() => {
    const { trace } = require('@opentelemetry/api');
    const tracer = trace.getTracer('hybrid-todo-app', '1.0.0');
    const testSpan = tracer.startSpan('test.hybrid_initialization');
    testSpan.setAttributes({
      'test.type': 'hybrid_initialization',
      'test.timestamp': new Date().toISOString(),
      'instrumentation.mode': 'hybrid'
    });
    testSpan.addEvent('Hybrid instrumentation test span');
    console.log('🧪 [HYBRID] Test span created and ending...');
    testSpan.end();
  }, 1000);
};

module.exports = { init };