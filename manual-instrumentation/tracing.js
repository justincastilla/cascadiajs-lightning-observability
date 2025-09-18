const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { BatchSpanProcessor, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const init = () => {
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'manual-todo-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  });

  const provider = new NodeTracerProvider({
    resource: resource,
  });

  const otlpExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://hybrid-b025c6.ingest.us-west1.gcp.elastic.cloud:443/v1/traces',
    headers: {
      'Authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS || 'ApiKey UnR5Wldwa0JYbkhCX2Y1RUhIUDM6WWtzejlFU2h2b1ZucllHaElaRXU0QQ=='
    },
  });

  // Add error handling for the exporter
  otlpExporter.onShutdown = () => {
    console.log('🔄 [MANUAL] OTLP Exporter shutdown');
  };

  console.log('🚀 [MANUAL] OTLP Exporter configured:');
  console.log(`   URL: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://hybrid-b025c6.ingest.us-west1.gcp.elastic.cloud:443/v1/traces'}`);
  console.log(`   Headers: ${Object.keys(otlpExporter.getDefaultHeaders ? otlpExporter.getDefaultHeaders() : {}).join(', ')}`);

  // Use SimpleSpanProcessor for immediate export (testing)
  const simpleProcessor = new SimpleSpanProcessor(otlpExporter);
  provider.addSpanProcessor(simpleProcessor);

  // Also add batch processor for efficiency
  const batchProcessor = new BatchSpanProcessor(otlpExporter, {
    maxExportBatchSize: 5,
    exportTimeoutMillis: 3000,
    scheduledDelayMillis: 500
  });
  provider.addSpanProcessor(batchProcessor);
  provider.register();

  // Add global error handling
  process.on('unhandledRejection', (reason, promise) => {
    if (reason && reason.toString().includes('OTLP')) {
      console.log('❌ [MANUAL] OTLP Export Error:', reason);
    }
  });

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation({
        applyCustomAttributesOnSpan: (span, request) => {
          span.setAttributes({
            'http.method': request.method,
            'http.url': request.url,
          });
        },
      }),
      new ExpressInstrumentation({
        applyCustomAttributesOnSpan: (span, request) => {
          span.setAttributes({
            'express.route': request.route?.path || 'unknown',
            'express.method': request.method,
          });
        },
      }),
    ],
  });

  console.log('🚀 [MANUAL] OpenTelemetry tracing initialized');
  console.log(`   Service: manual-todo-app`);
  console.log(`   OTLP endpoint: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://hybrid-b025c6.ingest.us-west1.gcp.elastic.cloud:443/v1/traces'}`);
  console.log(`   Exporter: OTLP HTTP to Elastic Cloud`);
  console.log(`   Instrumentations: HTTP, Express`);

  // Send a test span to verify the exporter is working
  setTimeout(() => {
    const { trace } = require('@opentelemetry/api');
    const tracer = trace.getTracer('manual-todo-app', '1.0.0');
    const testSpan = tracer.startSpan('test.initialization');
    testSpan.setAttributes({
      'test.type': 'initialization',
      'test.timestamp': new Date().toISOString()
    });
    testSpan.addEvent('Manual instrumentation test span');
    console.log('🧪 [MANUAL] Test span created and ending...');
    testSpan.end();
  }, 1000);
};

module.exports = { init };