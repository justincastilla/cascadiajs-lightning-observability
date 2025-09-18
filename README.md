# Introduction to OpenTelemetry with JavaScript

A comprehensive hands-on tutorial demonstrating three different approaches to OpenTelemetry instrumentation in Node.js applications. Each approach is implemented as a complete todo application, allowing you to compare and understand the differences between automatic, manual, and hybrid instrumentation strategies.

## 🎯 Project Overview

This repository contains three identical todo applications, each demonstrating a different OpenTelemetry instrumentation approach:

| Folder | Approach | Port | Best For |
|--------|----------|------|----------|
| [`automatic-instrumentation/`](./automatic-instrumentation/) | **Automatic** | 8081 | Quick setup, infrastructure monitoring |
| [`manual-instrumentation/`](./manual-instrumentation/) | **Manual** | 8082 | Full control, custom business logic tracing |
| [`hybrid-instrumentation/`](./hybrid-instrumentation/) | **Hybrid** | 8083 | Production apps, best of both worlds |

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **Elastic Cloud account** with APM enabled
- **Elasticsearch cluster** for data storage

### 1. Clone and Setup

```bash
git clone https://github.com/justincastilla/Introduction-to-OpenTelemetry-with-JS
cd Introduction-to-OpenTelemetry-with-JS
```

### 2. Choose Your Approach

```bash
# Automatic Instrumentation (Port 8081)
cd automatic-instrumentation
npm install
# Configure .env file (see folder README)
npm run telemetry

# Manual Instrumentation (Port 8082)
cd manual-instrumentation
npm install
# Configure .env file (see folder README)
npm start

# Hybrid Instrumentation (Port 8083)
cd hybrid-instrumentation
npm install
# Configure .env file (see folder README)
npm start
```

### 3. Compare the Approaches

Open multiple browser tabs to compare the applications:
- http://localhost:8081 (Automatic)
- http://localhost:8082 (Manual)
- http://localhost:8083 (Hybrid)

Perform the same operations in each app and observe the differences in:
- Console output
- Elastic APM traces
- Span hierarchy
- Custom attributes and events

## 📊 What You'll Learn

### 🤖 Automatic Instrumentation
- **Zero-code setup** with Elastic Distribution
- **Infrastructure-level observability** out of the box
- **HTTP, Express, and Elasticsearch** automatic tracing
- **Minimal performance overhead**
- **Quick time-to-value**

**Best for:** Getting started quickly, infrastructure monitoring, teams new to observability

### 🎯 Manual Instrumentation
- **Complete control** over span creation and attributes
- **Custom business logic** tracing
- **Detailed error handling** and exception recording
- **Custom metrics** and events
- **Performance optimization** through selective instrumentation

**Best for:** Advanced use cases, custom business logic tracking, when you need full control

### 🏗️ Hybrid Instrumentation
- **Automatic infrastructure** tracing + **manual business logic** tracing
- **Best of both worlds** approach
- **Custom metrics** combined with automatic observability
- **Production-ready** with comprehensive coverage
- **Scalable** for complex applications

**Best for:** Production applications, teams that want infrastructure observability + business insights

## 🎓 Key OpenTelemetry Concepts Demonstrated

### 1. Spans and Traces
```javascript
// Creating spans with different approaches
const span = tracer.startSpan('operation_name', {
  kind: SpanKind.SERVER,
  attributes: { 'operation.type': 'business_logic' }
});
```

### 2. Context Propagation
```javascript
// Ensuring spans are properly connected
const activeContext = context.active();
const childSpan = tracer.startSpan('child_operation', {}, activeContext);
```

### 3. Attributes and Events
```javascript
// Adding metadata to spans
span.setAttributes({
  'user.id': 'user123',
  'operation.success': true
});

span.addEvent('Processing completed', {
  'items.processed': 5,
  'duration.ms': 150
});
```

### 4. Metrics Integration
```javascript
// Custom metrics alongside tracing
const counter = meter.createCounter('operations_total');
const histogram = meter.createHistogram('operation_duration');

counter.add(1, { operation: 'create_todo' });
histogram.record(duration, { result: 'success' });
```

### 5. Error Handling
```javascript
// Proper error recording
try {
  await operation();
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
}
```

## 🔧 Environment Configuration

Each approach requires environment variables for Elastic Cloud integration:

```env
# Application Configuration
PORT=8081                    # 8081/8082/8083 for different approaches
indexName=todos
ELASTICSEARCH_ENDPOINT="https://your-cluster.es.region.gcp.elastic.cloud:443"
ELASTICSEARCH_API_KEY="your_elasticsearch_api_key"

# OpenTelemetry Configuration
OTEL_SERVICE_NAME=todo-service
OTEL_SERVICE_VERSION=0.1.0
OTEL_ENVIRONMENT=development
OTEL_EXPORTER_OTLP_ENDPOINT="https://your-cluster.ingest.region.gcp.elastic.cloud:443/v1/traces"
OTEL_EXPORTER_OTLP_HEADERS="ApiKey your_elasticsearch_api_key"
```

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve this tutorial. Each approach demonstrates different aspects of OpenTelemetry, and we welcome improvements to make the learning experience better.
