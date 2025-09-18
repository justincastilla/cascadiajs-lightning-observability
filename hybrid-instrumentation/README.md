# Hybrid Instrumentation Todo App

This folder demonstrates **hybrid OpenTelemetry instrumentation** - the best of both worlds! It combines automatic instrumentation for infrastructure-level observability with manual instrumentation for custom business logic and deep application insights.

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
   PORT=8083
   indexName=todos
   ELASTICSEARCH_ENDPOINT="https://your-cluster.es.region.gcp.elastic.cloud:443"
   ELASTICSEARCH_API_KEY="your_elasticsearch_api_key"

   # Hybrid OpenTelemetry Configuration for Elastic Cloud
   OTEL_SERVICE_NAME=hybrid-todo-service
   OTEL_SERVICE_VERSION=0.1.0
   OTEL_ENVIRONMENT=development
   OTEL_EXPORTER_OTLP_ENDPOINT="https://your-cluster.ingest.us-west1.gcp.elastic.cloud:443/v1/traces"
   OTEL_EXPORTER_OTLP_HEADERS="ApiKey your_elasticsearch_api_key"
   ```

3. **Run the application:**
   ```bash
   npm start
   ```

4. **Access the application:**
   - Open http://localhost:8083
   - Perform todo operations
   - View comprehensive telemetry in Elastic APM
   - Check console for detailed hybrid logging

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Application port | `8083` |
| `indexName` | Elasticsearch index name | `todos` |
| `ELASTICSEARCH_ENDPOINT` | Elasticsearch cluster URL | `https://cluster.es.region.elastic.cloud:443` |
| `ELASTICSEARCH_API_KEY` | Elasticsearch API key | `base64_encoded_key` |
| `OTEL_SERVICE_NAME` | Service identifier in APM | `hybrid-todo-service` |
| `OTEL_SERVICE_VERSION` | Service version | `0.1.0` |
| `OTEL_ENVIRONMENT` | Deployment environment | `development` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP traces endpoint | `https://cluster.ingest.region.elastic.cloud:443/v1/traces` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Authentication headers | `ApiKey your_api_key` |

## 🏗️ Hybrid Architecture

### What Makes It "Hybrid"?

The hybrid approach combines:

1. **🤖 Automatic Instrumentation** (NodeSDK + Auto-instrumentations)
   - HTTP requests and responses
   - Express.js routing
   - Elasticsearch operations
   - Network calls
   - File system operations

2. **🎯 Manual Instrumentation** (Custom spans)
   - Business logic spans
   - Custom metrics
   - Application-specific events
   - User operation tracking
   - Performance measurements

### Tracing Setup (`tracing.js`)

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const init = () => {
  // OTLP Exporter for Elastic Cloud
  const otlpExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: { 'Authorization': process.env.OTEL_EXPORTER_OTLP_HEADERS }
  });

  // NodeSDK with automatic instrumentations
  const sdk = new NodeSDK({
    resource: resource,
    spanProcessor: new BatchSpanProcessor(otlpExporter),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          applyCustomAttributesOnSpan: (span, request, response) => {
            span.setAttributes({
              'auto.http.user_agent': request.headers?.['user-agent'],
              'auto.http.content_type': response.headers?.['content-type']
            });
          }
        }
      })
    ]
  });

  sdk.start();
};
```

## 📊 Span Hierarchy in Hybrid Mode

### Complete Request Flow

```
🌐 HTTP Request (automatic)
├── 🎯 manual.http.get.get_todos (manual HTTP span)
│   ├── 📋 manual.todo.action.get_all (manual business logic)
│   │   ├── 📋 elasticsearch.get_todos (manual data layer)
│   │   │   └── 🌐 HTTP Client to ES (automatic)
│   │   └── 📊 Custom metrics recording (manual)
│   └── 🎯 Response formatting (manual)
└── 🌐 HTTP Response (automatic)
```

### Real Example: Creating a Todo

```
🌐 express.request POST /add_item (automatic Express)
├── 🌐 http.request (automatic HTTP)
├── 🎯 manual.http.post.add_item (manual layer)
│   ├── 📋 manual.todo.action.add (manual business logic)
│   │   ├── 📋 elasticsearch.manual.add_todo (manual ES wrapper)
│   │   │   └── 🌐 elasticsearch.index (automatic ES client)
│   │   ├── 📊 todos_total counter +1 (manual metrics)
│   │   └── 📊 operation_duration histogram (manual metrics)
│   └── 🎯 Response preparation (manual)
└── 🌐 http.response (automatic HTTP)
```

## 🎯 Creating Manual Spans in Hybrid Context

### 1. Building on Automatic Context

The key to hybrid instrumentation is **context propagation** - your manual spans become children of automatic spans:

```javascript
app.get('/get_todos', async (req, res) => {
  // Capture the active context from automatic HTTP instrumentation
  const activeContext = context.active();

  // Create manual span as child of automatic span
  const httpSpan = tracer.startSpan('manual.http.get.get_todos', {
    kind: SpanKind.SERVER,
    attributes: {
      'manual.http.method': 'GET',
      'manual.http.route': '/get_todos',
      'manual.custom.endpoint': 'todos_api'
    }
  }, activeContext);

  // Your business logic with manual tracing...
});
```

### 2. Layered Business Logic Spans

```javascript
// Layer 1: HTTP endpoint span (manual)
const httpSpan = tracer.startSpan('manual.http.get.get_todos', {}, activeContext);

// Layer 2: Business logic span (manual, child of HTTP)
const httpSpanContext = trace.setSpan(activeContext, httpSpan);
const todoSpan = tracer.startSpan('manual.todo.action.get_all', {
  kind: SpanKind.INTERNAL,
  attributes: {
    'manual.action.type': 'read',
    'manual.user.operation': 'list_todos'
  }
}, httpSpanContext);

// Layer 3: Data access (manual, child of business logic)
const todoSpanContext = trace.setSpan(httpSpanContext, todoSpan);
const todos = await context.with(todoSpanContext, () => getTodos());
```

### 3. Enhanced Attributes for Distinction

Prefix manual attributes to distinguish from automatic ones:

```javascript
// Automatic span attributes (added by auto-instrumentation)
{
  'http.method': 'GET',
  'http.url': '/get_todos',
  'http.status_code': 200
}

// Manual span attributes (added by your code)
{
  'manual.business.operation': 'get_all_todos',
  'manual.todos.retrieved.count': 5,
  'manual.operation.success': true,
  'manual.performance.optimized': true
}
```

## 📈 Custom Metrics Integration

Hybrid mode excels at combining automatic infrastructure metrics with custom business metrics:

```javascript
// Set up custom meters
const meter = metrics.getMeter('hybrid-todo-app', '1.0.0');

const todoCounter = meter.createCounter('todos_total', {
  description: 'Total number of todos created'
});

const todoGauge = meter.createUpDownCounter('todos_active', {
  description: 'Number of active todos'
});

const operationDuration = meter.createHistogram('operation_duration', {
  description: 'Duration of operations in milliseconds',
  unit: 'ms'
});

// Use metrics within spans
const span = tracer.startSpan('business.create_todo');
const startTime = Date.now();

try {
  const todo = await createTodo(data);

  // Record business metrics
  todoCounter.add(1, {
    category: todo.category,
    priority: todo.priority
  });

  const duration = Date.now() - startTime;
  operationDuration.record(duration, {
    operation: 'create_todo',
    result: 'success'
  });

  // Add span context
  span.setAttributes({
    'manual.todo.created.id': todo.id,
    'manual.processing.duration_ms': duration
  });

} finally {
  span.end();
}
```

## 🔍 Advanced Hybrid Patterns

### 1. Conditional Manual Tracing

Add manual spans only for important operations:

```javascript
async function processImportantOperation(data, isHighPriority = false) {
  let span;

  if (isHighPriority) {
    // Add detailed manual tracing for high-priority operations
    span = tracer.startSpan('business.high_priority_operation', {
      attributes: {
        'manual.priority': 'high',
        'manual.detailed_tracing': true
      }
    });
  }

  try {
    const result = await operation(data);

    if (span) {
      span.setAttributes({
        'manual.result.size': result.length,
        'manual.processing.optimized': true
      });
    }

    return result;
  } finally {
    span?.end();
  }
}
```

### 2. Business Context Enrichment

Enhance automatic spans with business context:

```javascript
// Middleware to add business context to all automatic spans
app.use((req, res, next) => {
  const currentSpan = trace.getActiveSpan();

  if (currentSpan) {
    currentSpan.setAttributes({
      'business.user.tier': req.user?.tier || 'free',
      'business.feature.flag': getFeatureFlag('advanced_todos'),
      'business.request.source': req.headers['x-source'] || 'web'
    });
  }

  next();
});
```

### 3. Cross-Layer Correlation

Connect manual business metrics with automatic infrastructure metrics:

```javascript
async function handleUserAction(action, userId) {
  const span = tracer.startSpan('business.user_action', {
    attributes: {
      'manual.user.id': userId,
      'manual.action.type': action,
      'manual.correlation.id': generateCorrelationId()
    }
  });

  // This will create automatic HTTP/DB spans as children
  const result = await executeAction(action);

  // Add business outcome to manual span
  span.setAttributes({
    'manual.business.outcome': result.success ? 'success' : 'failure',
    'manual.business.impact': calculateBusinessImpact(result)
  });

  span.end();
  return result;
}
```

## 🚀 Next Steps

1. **Start monitoring**: Deploy and observe automatic + manual telemetry
2. **Create dashboards**: Build business-specific views in Elastic APM
3. **Set up alerts**: Combine infrastructure and business metrics for alerting
4. **Optimize performance**: Use sampling and selective manual instrumentation
5. **Scale up**: Apply patterns to other services in your architecture

## 📚 Additional Resources

- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/) - For advanced telemetry pipelines
- [Elastic APM Best Practices](https://www.elastic.co/blog/apm-best-practices)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/reference/specification/semantic-conventions/)
- [Distributed Tracing Patterns](https://microservices.io/patterns/observability/distributed-tracing.html)