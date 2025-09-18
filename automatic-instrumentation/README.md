# Automatic Instrumentation Todo App

This folder demonstrates **automatic OpenTelemetry instrumentation** using the Elastic Distribution of OpenTelemetry Node.js. The application automatically captures telemetry data with minimal code changes.

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
   PORT=8081
   indexName=todos
   ELASTICSEARCH_ENDPOINT="https://your-cluster.es.region.gcp.elastic.cloud:443"
   ELASTICSEARCH_API_KEY="your_elasticsearch_api_key"

   # Elastic OpenTelemetry Configuration
   ELASTIC_OTEL_SERVER_URL=https://your-cluster.ingest.region.gcp.elastic.cloud:443
   ELASTIC_OTEL_SECRET_TOKEN=your_secret_token
   OTEL_SERVICE_NAME=automatic-todo-service
   OTEL_SERVICE_VERSION=0.1.0
   OTEL_ENVIRONMENT=development
   ```

3. **Run the application:**
   ```bash
   # With automatic instrumentation
   npm run telemetry

   # Without instrumentation (for comparison)
   npm start
   ```

4. **Access the application:**
   - Open http://localhost:8081
   - Add, view, and delete todos
   - Check Elastic APM for automatic traces

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Application port | `8081` |
| `indexName` | Elasticsearch index name | `todos` |
| `ELASTICSEARCH_ENDPOINT` | Elasticsearch cluster URL | `https://cluster.es.region.elastic.cloud:443` |
| `ELASTICSEARCH_API_KEY` | Elasticsearch API key | `base64_encoded_key` |
| `ELASTIC_OTEL_SERVER_URL` | Elastic APM server URL | `https://cluster.ingest.region.elastic.cloud:443` |
| `ELASTIC_OTEL_SECRET_TOKEN` | APM secret token | `your_secret_token` |
| `OTEL_SERVICE_NAME` | Service identifier in APM | `automatic-todo-service` |
| `OTEL_SERVICE_VERSION` | Service version | `0.1.0` |
| `OTEL_ENVIRONMENT` | Deployment environment | `development` |

## 📊 How Automatic Instrumentation Works

### The Magic Behind the Scenes

Automatic instrumentation uses the **Elastic Distribution of OpenTelemetry Node.js** (`@elastic/opentelemetry-node`) which:

1. **Automatically instruments** popular libraries (Express, HTTP, Elasticsearch, etc.)
2. **Requires zero code changes** to your application logic
3. **Captures spans** for HTTP requests, database operations, and external calls
4. **Exports telemetry** directly to Elastic APM

### Package.json Scripts

```json
{
  "telemetry": "node --env-file=./.env -r @elastic/opentelemetry-node ./index.js"
}
```

The `--env-file=./.env` loads the `.env` environment variables into the context for the Elastic OpenTelemetry module to access. The `-r` flag preloads the Elastic OpenTelemetry module before your application starts, enabling automatic instrumentation.

### What Gets Instrumented Automatically

- **HTTP Requests**: Incoming and outgoing HTTP calls
- **Express Routes**: Route handlers and middleware
- **Elasticsearch**: Database queries and operations
- **File System**: File operations (can be disabled)
- **DNS**: Domain name resolution
- **Process**: Process-level metrics

## 🔍 Understanding Spans in Automatic Mode

While you don't create spans manually in automatic mode, here's what's happening behind the scenes:

### Span Lifecycle

1. **Span Creation**: Automatically created when instrumented operations begin
   ```javascript
   // This HTTP request automatically creates a span
   app.get('/get_todos', async (req, res) => {
     // Span starts here automatically
     const todos = await getTodos(); // Child span for Elasticsearch
     res.json({ todos });
     // Span ends here automatically
   });
   ```

2. **Automatic Attributes**: Added without code changes
   - `http.method`: GET, POST, DELETE
   - `http.url`: Request URL
   - `http.status_code`: Response status
   - `elasticsearch.method`: ES operation type

3. **Span Hierarchy**: Parent-child relationships are automatic
   ```
   HTTP Request Span
   ├── Express Route Span
   └── Elasticsearch Query Span
   ```

### Viewing Telemetry Data

In Elastic APM, you'll see:
- **Service Map**: Visual representation of service dependencies
- **Traces**: Complete request flows with timing
- **Metrics**: Performance and error rates
- **Dependencies**: External service calls

## 🛠️ Customization Options

While automatic, you can still customize behavior through environment variables:

```env
# Disable specific instrumentations
OTEL_NODE_DISABLED_INSTRUMENTATIONS=fs,dns

# Adjust sampling rate
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1

# Add resource attributes
OTEL_RESOURCE_ATTRIBUTES=service.namespace=production,deployment.environment=prod
```

Further information may be found [here](https://opentelemetry.io/docs/zero-code/js/configuration/)

## 🔗 Next Steps

- Compare with **manual-instrumentation** for custom spans
- Explore **hybrid-instrumentation** for the best of both worlds
- Set up alerts in Elastic APM
- Create custom dashboards for business metrics

## 📚 Additional Resources

- [Elastic APM Node.js Agent](https://www.elastic.co/guide/en/apm/agent/nodejs/current/index.html)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/instrumentation/js/)
- [Elastic Observability Docs](https://www.elastic.co/guide/en/observability/8.19/index.html)