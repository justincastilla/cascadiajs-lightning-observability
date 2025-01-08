# Todo App with OpenTelemetry Automatic Instrumentation

This Todo app demonstrates how to instrument a Node.js application using OpenTelemetry for tracing and sending telemetry data to an observability backend like Elastic APM.

## Features
- Automatic instrumentation with OpenTelemetry
- CRUD operations for managing todos
- Traces sent to Elastic APM or other OTEL-compatible backends

---

## Prerequisites

### 1. Software Requirements
- **Node.js**: v14 or later
- **NPM**: v6 or later
- **Elastic APM Server**: Hosted on Elastic Cloud or self-hosted
- **Elasticsearch and Kibana**: For observing traces and spans

### 2. Environment Variables
Create a `.env` file in the root directory and include the following:
```plaintext
PORT=8081
indexName=todos
ELASTICSEARCH_ENDPOINT=https://<your-elasticsearch-url>
ELASTICSEARCH_API_KEY=<your-elasticsearch-api-key>
APM_SERVER_URL=https://<your-apm-server-url>
APM_API_KEY=<your-apm-api-key>
```

Replace `<your-elasticsearch-url>`, `<your-elasticsearch-api-key>`, `<your-apm-server-url>`, and `<your-apm-api-key>` with your Elastic Cloud or self-hosted APM details.

---

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/justincastilla/Introduction-to-OpenTelemetry-with-JS
   cd Introduction-to-OpenTelemetry-with-JS
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

---

## Usage

### Start the Application with Automatic Instrumentation
Run the app using OpenTelemetry's Node.js instrumentation loader:
```bash
npm run telemetry
```

---

## Endpoints

### CRUD Operations
| Method | Endpoint         | Description                  |
|--------|------------------|------------------------------|
| GET    | `/`              | Returns the home page.       |
| GET    | `/get_todos`     | Fetch all todos.             |
| POST   | `/add_item`      | Add a new todo item.         |
| DELETE | `/delete/:id`    | Delete a todo by ID.         |

---

## Observability

### OpenTelemetry Traces
- Traces are automatically collected for HTTP requests and interactions.
- Each trace is sent to the Elastic APM server configured in the `.env` file.

### View Traces in Kibana
1. Open **Kibana** and navigate to **Observability > APM**.
2. Look for your service (`todo-app`) in the **Services** tab.
3. Explore traces, spans, and associated metrics.

---

## Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Elastic APM Documentation](https://www.elastic.co/guide/en/apm/index.html)

---
