# Manual Instrumentation Todo App

This folder demonstrates **manual OpenTelemetry instrumentation** where you have complete control over span creation, attributes, events, and telemetry data. Perfect for understanding OpenTelemetry concepts and adding custom business logic tracing.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Elastic Cloud account with APM enabled
- Elasticsearch cluster

### Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file with your Elastic Cloud credentials:
   ```env
   PORT=8082
   indexName=todos
   ELASTICSEARCH_ENDPOINT="https://your-cluster.es.region.gcp.elastic.cloud:443"
   ELASTICSEARCH_API_KEY="your_elasticsearch_api_key"

   # Manual OpenTelemetry Configuration for Elastic Cloud
   OTEL_SERVICE_NAME=manual-todo-service
   OTEL_SERVICE_VERSION=0.1.0
   OTEL_ENVIRONMENT=development
   OTEL_EXPORTER_OTLP_ENDPOINT="https://your-cluster.ingest.region.gcp.elastic.cloud:443/v1/traces"
   OTEL_EXPORTER_OTLP_HEADERS="ApiKey your_elasticsearch_api_key"
   ```

3. **Run the application:**
   ```bash
   npm start
   ```

4. **Access the application:**
   - Open http://localhost:8082
   - Add, view, and delete todos
   - Check console for detailed span logging
   - View traces in Elastic APM

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Application port | `8082` |
| `indexName` | Elasticsearch index name | `todos` |
| `ELASTICSEARCH_ENDPOINT` | Elasticsearch cluster URL | `https://cluster.es.region.elastic.cloud:443` |
| `ELASTICSEARCH_API_KEY` | Elasticsearch API key | `base64_encoded_key` |
| `OTEL_SERVICE_NAME` | Service identifier in APM | `manual-todo-service` |
| `OTEL_SERVICE_VERSION` | Service version | `0.1.0` |
| `OTEL_ENVIRONMENT` | Deployment environment | `development` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP traces endpoint | `https://cluster.ingest.region.elastic.cloud:443/v1/traces` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Authentication headers | `ApiKey your_api_key` |

## 📊 Manual Instrumentation Architecture

### Tracing Setup (`tracing.js`)

```javascript
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const init = () => {
  // 1. Create a resource with service information
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'manual-todo-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  });

  // 2. Create tracer provider
  const provider = new NodeTracerProvider({ resource });

  // 3. Configure OTLP exporter
  const otlpExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: { 'Authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS }
  });

  // 4. Add span processor
  provider.addSpanProcessor(new SimpleSpanProcessor(otlpExporter));
  provider.register();
};
```

## 🎯 Creating and Managing Spans

### 1. Basic Span Creation

```javascript
const { trace, SpanKind, SpanStatusCode } = require('@opentelemetry/api');

// Get a tracer instance
const tracer = trace.getTracer('manual-todo-app', '1.0.0');

// Create a span
const span = tracer.startSpan('operation_name', {
  kind: SpanKind.SERVER, // or CLIENT, INTERNAL, PRODUCER, CONSUMER
  attributes: {
    'operation.type': 'database_query',
    'user.id': 'user123'
  }
});

// Your business logic here
try {
  // Perform operation
  const result = await someOperation();

  // Mark success
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  // Record exception and mark as error
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
} finally {
  // Always end the span
  span.end();
}
```

### 2. Adding Attributes to Spans

Attributes provide metadata about the operation:

```javascript
// Set attributes at span creation
const span = tracer.startSpan('elasticsearch.search', {
  attributes: {
    'elasticsearch.index': 'todos',
    'elasticsearch.operation': 'search',
    'user.operation': 'get_todos'
  }
});

// Add attributes during execution
span.setAttributes({
  'elasticsearch.results.total': response.hits.total.value,
  'todos.count': todos.length,
  'query.duration_ms': queryTime
});

// Add single attribute
span.setAttribute('custom.business_metric', calculatedValue);
```

### 3. Adding Events to Spans

Events mark significant moments during span execution:

```javascript
// Add an event with timestamp (automatic)
span.addEvent('Starting database connection');

// Add event with attributes
span.addEvent('Query executed', {
  'query.sql': 'SELECT * FROM todos',
  'query.duration': '25ms',
  'query.rows_returned': 5
});

// Add event with custom timestamp
span.addEvent('Cache hit', {
  'cache.key': 'todos:user123',
  'cache.ttl': '300s'
}, Date.now());
```

### 4. Creating Child Spans

Child spans represent sub-operations:

```javascript
const parentSpan = tracer.startSpan('process_user_request');

// Create child span with proper context
const childSpan = tracer.startSpan('validate_user_input', {
  parent: parentSpan.spanContext(),
  attributes: {
    'validation.type': 'form_data'
  }
});

// Process child operation
try {
  validateInput(userData);
  childSpan.setStatus({ code: SpanStatusCode.OK });
} finally {
  childSpan.end();
}

// Continue with parent
parentSpan.setAttributes({ 'validation.passed': true });
parentSpan.end();
```

### 5. Context Propagation

Ensure spans are properly connected across async operations:

```javascript
const { context, trace } = require('@opentelemetry/api');

app.get('/api/todos', async (req, res) => {
  const activeContext = context.active();
  const span = tracer.startSpan('api.get_todos', {}, activeContext);

  try {
    // Set span in context for child operations
    const spanContext = trace.setSpan(activeContext, span);

    // Execute operation within span context
    const todos = await context.with(spanContext, () => getTodos());

    res.json({ todos });
    span.setStatus({ code: SpanStatusCode.OK });
  } finally {
    span.end();
  }
});
```

## 🔍 Advanced Span Activities

### 1. Recording Exceptions

```javascript
try {
  await riskyOperation();
} catch (error) {
  // Record the full exception with stack trace
  span.recordException(error);

  // Add custom error attributes
  span.setAttributes({
    'error.type': error.constructor.name,
    'error.handled': true,
    'error.recovery_attempted': false
  });

  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message
  });
}
```

### 2. Custom Metrics with Spans

```javascript
const { metrics } = require('@opentelemetry/api');

const meter = metrics.getMeter('todo-app', '1.0.0');
const todoCounter = meter.createCounter('todos_created_total');
const processingDuration = meter.createHistogram('operation_duration');

const span = tracer.startSpan('create_todo');
const startTime = Date.now();

try {
  const todo = await createTodo(data);

  // Record metrics
  todoCounter.add(1, {
    category: todo.category,
    user_type: 'premium'
  });

  const duration = Date.now() - startTime;
  processingDuration.record(duration, {
    operation: 'create_todo',
    result: 'success'
  });

  // Add span attributes
  span.setAttributes({
    'todo.id': todo.id,
    'processing.duration_ms': duration
  });

} finally {
  span.end();
}
```

### 3. Sampling and Performance

```javascript
// Conditional span creation based on sampling
const shouldSample = Math.random() < 0.1; // 10% sampling

if (shouldSample || isImportantOperation) {
  const span = tracer.startSpan('expensive_operation');
  // ... perform operation with detailed tracing
  span.end();
} else {
  // Perform operation without tracing overhead
  await operation();
}
```

### 4. Span Links (Advanced)

Link spans across different traces:

```javascript
const relatedSpanContext = getRelatedOperationSpanContext();

const span = tracer.startSpan('related_operation', {
  links: [{
    context: relatedSpanContext,
    attributes: {
      'link.type': 'follows_from',
      'link.description': 'Related to user signup process'
    }
  }]
});
```

## 🏗️ Span Hierarchy Examples

### Real-world Todo App Flow

```
📋 HTTP Request: GET /get_todos (automatic via HTTP instrumentation)
├── 📋 Business Logic: todo.action.get_all (manual)
│   ├── 📋 Data Layer: elasticsearch.get_todos (manual)
│   │   └── 📋 Network: HTTP client call (automatic)
│   └── 📋 Processing: format_response (manual)
└── 📋 Response: send_json (automatic)
```

## 🔗 Next Steps

- Explore **hybrid-instrumentation** for combining approaches
- Set up custom dashboards in Elastic APM
- Implement business-specific metrics
- Create alerting rules based on span data
- Add distributed tracing across microservices

## 📚 Additional Resources

- [OpenTelemetry JavaScript API](https://github.com/open-telemetry/opentelemetry-js)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/reference/specification/semantic-conventions/)
- [Elastic APM Integration](https://www.elastic.co/guide/en/apm/guide/current/open-telemetry.html)