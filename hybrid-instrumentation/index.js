const { init } = require('./tracing');
init();

const dotenv = require('dotenv').config();
const express = require('express');
const path = require('path');
const { Client } = require('@elastic/elasticsearch');
const bodyParser = require('body-parser');
const cors = require('cors');
const { trace, context, SpanStatusCode, SpanKind, metrics } = require('@opentelemetry/api');

const PORT = parseInt(process.env.PORT || '8081');
const INDEX = process.env.indexName || 'todos';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(express.static('public'));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.set('view engine', 'html');

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "*");
  next();
});

const client = new Client({
  node: process.env.ELASTICSEARCH_ENDPOINT,
  auth: {
    apiKey: process.env.ELASTICSEARCH_API_KEY
  }
});

const tracer = trace.getTracer('hybrid-todo-app', '1.0.0');
const meter = metrics.getMeter('hybrid-todo-app', '1.0.0');

const todoCounter = meter.createCounter('todos_total', {
  description: 'Total number of todos created',
});

const todoGauge = meter.createUpDownCounter('todos_active', {
  description: 'Number of active todos',
});

const operationDuration = meter.createHistogram('operation_duration', {
  description: 'Duration of operations in milliseconds',
  unit: 'ms',
});

async function checkAndCreateIndex() {
  const span = tracer.startSpan('elasticsearch.check_and_create_index', {
    kind: SpanKind.CLIENT,
    attributes: {
      'elasticsearch.index': INDEX,
      'operation.type': 'index_management',
      'custom.component': 'elasticsearch_setup'
    }
  });

  const spanContext = span.spanContext();
  console.log(`🔍 [HYBRID] Started span: elasticsearch.check_and_create_index`);
  console.log(`   Span ID: ${spanContext.spanId}`);
  console.log(`   Trace ID: ${spanContext.traceId}`);

  const startTime = Date.now();

  try {
    span.addEvent('Checking if index exists');
    const exists = await client.indices.exists({ index: INDEX });

    span.setAttributes({
      'elasticsearch.index.exists': exists,
      'custom.index_check_result': exists ? 'found' : 'not_found'
    });

    if (!exists) {
      span.addEvent('Creating new index', {
        'index.name': INDEX,
        'index.mappings': JSON.stringify({
          title: 'text',
          completed: 'boolean',
          createdAt: 'date'
        })
      });

      await client.indices.create({
        index: INDEX,
        body: {
          mappings: {
            properties: {
              title: { type: 'text' },
              completed: { type: 'boolean' },
              createdAt: { type: 'date' }
            }
          }
        }
      });

      span.addEvent('Index created successfully');
    }

    const duration = Date.now() - startTime;
    operationDuration.record(duration, {
      operation: 'index_setup',
      result: 'success'
    });

    span.setStatus({ code: SpanStatusCode.OK });
    console.log(`✅ [HYBRID] Completed span: elasticsearch.check_and_create_index (SUCCESS)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    operationDuration.record(duration, {
      operation: 'index_setup',
      result: 'error'
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.log(`❌ [HYBRID] Completed span: elasticsearch.check_and_create_index (ERROR: ${error.message})`);
    throw error;
  } finally {
    span.end();
  }
}

async function getTodos() {
  const span = tracer.startSpan('elasticsearch.get_todos', {
    kind: SpanKind.CLIENT,
    attributes: {
      'elasticsearch.index': INDEX,
      'operation.type': 'search',
      'custom.component': 'todo_service'
    }
  });

  const spanContext = span.spanContext();
  console.log(`📋 [HYBRID] Started span: elasticsearch.get_todos`);
  console.log(`   Span ID: ${spanContext.spanId}`);
  console.log(`   Trace ID: ${spanContext.traceId}`);

  const startTime = Date.now();

  try {
    span.addEvent('Executing search query');
    const response = await client.search({
      index: 'todos',
      body: {
        query: {
          match_all: {}
        }
      }
    });

    const todos = response.hits.hits.map(hit => {
      return {
        id: hit._id,
        ...hit._source
      }
    });

    span.setAttributes({
      'elasticsearch.results.total': response.hits.total.value,
      'todos.count': todos.length,
      'elasticsearch.took': response.took,
      'custom.todos_found': todos.length > 0
    });

    span.addEvent('Search completed', {
      'todos.retrieved': todos.length,
      'search.duration_ms': response.took
    });

    todoGauge.add(todos.length, { operation: 'fetch' });

    const duration = Date.now() - startTime;
    operationDuration.record(duration, {
      operation: 'get_todos',
      result: 'success'
    });

    span.setStatus({ code: SpanStatusCode.OK });
    console.log(`✅ [HYBRID] Completed span: elasticsearch.get_todos (SUCCESS) - Found ${todos.length} todos`);
    return todos;
  } catch (error) {
    const duration = Date.now() - startTime;
    operationDuration.record(duration, {
      operation: 'get_todos',
      result: 'error'
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.log(`❌ [HYBRID] Completed span: elasticsearch.get_todos (ERROR: ${error.message})`);
    throw error;
  } finally {
    span.end();
  }
}

async function addTodo(todo) {
  const span = tracer.startSpan('elasticsearch.manual.add_todo', {
    kind: SpanKind.CLIENT,
    attributes: {
      'manual.elasticsearch.index': INDEX,
      'manual.operation.type': 'index',
      'manual.todo.title': todo.title,
      'manual.custom.component': 'todo_service'
    }
  });

  const spanContext = span.spanContext();
  console.log(`➕ [HYBRID] Started span: elasticsearch.add_todo`);
  console.log(`   Span ID: ${spanContext.spanId}`);
  console.log(`   Trace ID: ${spanContext.traceId}`);
  console.log(`   Todo: "${todo.title}"`);

  const startTime = Date.now();

  try {
    span.addEvent('Adding new todo', {
      'manual.todo.title': todo.title,
      'manual.todo.description': todo.description
    });

    const response = await client.index({
      index: 'todos',
      body: todo
    });

    span.setAttributes({
      'manual.elasticsearch.document.id': response._id,
      'manual.elasticsearch.result': response.result,
      'manual.todo.created_at': todo.createdAt,
      'manual.custom.todo_created': true
    });

    span.addEvent('Todo created successfully', {
      'manual.todo.id': response._id,
      'manual.elasticsearch.result': response.result
    });

    todoCounter.add(1, {
      operation: 'create',
      title_length: todo.title?.length || 0
    });

    const duration = Date.now() - startTime;
    operationDuration.record(duration, {
      operation: 'add_todo',
      result: 'success'
    });

    span.setStatus({ code: SpanStatusCode.OK });
    console.log(`✅ [HYBRID] Completed span: elasticsearch.add_todo (SUCCESS) - Created todo ID: ${response._id}`);
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    operationDuration.record(duration, {
      operation: 'add_todo',
      result: 'error'
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.log(`❌ [HYBRID] Completed span: elasticsearch.add_todo (ERROR: ${error.message})`);
    throw error;
  } finally {
    span.end();
  }
}

app.get('/', async (req, res) => {
  const span = tracer.startSpan('manual.http.endpoint.homepage', {
    kind: SpanKind.SERVER,
    attributes: {
      'manual.http.method': 'GET',
      'manual.http.route': '/',
      'manual.user_agent': req.get('User-Agent'),
      'manual.custom.endpoint': 'homepage'
    }
  });

  try {
    span.addEvent('manual - Loading todos for homepage');
    const todos = await getTodos();

    span.setAttributes({
      'manual.todos.loaded.count': todos.length,
      'manual.custom.homepage_loaded': true
    });

    span.addEvent('manual - Serving homepage with todos', {
      'manual.todos.count': todos.length
    });

    res.sendFile('index.html', { root: path.join(__dirname, 'static') });
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    res.status(500).json({ error: error.message });
  } finally {
    span.end();
  }
});

app.get('/add_item', (req, res) => {
  const span = tracer.startSpan('manual.http.endpoint.add_item_form', {
    kind: SpanKind.SERVER,
    attributes: {
      'manual.http.method': 'GET',
      'manual.http.route': '/add_item',
      'manual.custom.endpoint': 'add_item_form'
    }
  });

  try {
    span.addEvent('Rendering add item form');
    res.render('add_item');
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  } finally {
    span.end();
  }
});

app.get('/get_todos', async (req, res) => {
  // Get the active span from HTTP instrumentation and create child span
  const activeContext = context.active();
  const httpSpan = tracer.startSpan('manual.http.get.get_todos', {
    kind: SpanKind.SERVER,
    attributes: {
      'manual.http.method': 'GET',
      'manual.http.route': '/get_todos',
      'manual.custom.endpoint': 'todos_api'
    }
  }, activeContext);

  const httpSpanContext = httpSpan.spanContext();
  console.log(`📋 [HYBRID] Started span: http.get.get_todos`);
  console.log(`   Span ID: ${httpSpanContext.spanId}`);
  console.log(`   Trace ID: ${httpSpanContext.traceId}`);

  try {
    // Create a business logic span for the todo operation as child of HTTP span
    const httpSpanContext = trace.setSpan(activeContext, httpSpan);
    const todoSpan = tracer.startSpan('manual.todo.action.get_all', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'manual.action.type': 'read',
        'manual.action.name': 'get_all_todos',
        'manual.user.operation': 'list_todos'
      }
    }, httpSpanContext);

    const todoSpanContext = todoSpan.spanContext();
    console.log(`📋 [HYBRID] Started span: todo.action.get_all`);
    console.log(`   Span ID: ${todoSpanContext.spanId}`);
    console.log(`   Trace ID: ${todoSpanContext.traceId}`);

    todoSpan.addEvent('Starting todo retrieval operation');

    // Execute getTodos within the todoSpan context
    const todoSpanActiveContext = trace.setSpan(httpSpanContext, todoSpan);
    const todos = await context.with(todoSpanActiveContext, () => getTodos());

    todoSpan.setAttributes({
      'manual.todos.retrieved.count': todos.length,
      'manual.operation.success': true,
      'manual.operation.duration_ms': Date.now() % 1000 // Simple timing
    });

    todoSpan.addEvent('Todo retrieval completed', {
      'manual.todos.count': todos.length,
      'manual.operation.result': 'success'
    });

    httpSpan.setAttributes({
      'manual.response.todos.count': todos.length,
      'manual.business.operation': 'get_all_todos'
    });

    res.json({ todos });

    todoSpan.setStatus({ code: SpanStatusCode.OK });
    httpSpan.setStatus({ code: SpanStatusCode.OK });

    console.log(`✅ [HYBRID] Completed span: todo.action.get_all (SUCCESS) - Retrieved ${todos.length} todos`);
    console.log(`✅ [HYBRID] Completed span: http.get.get_todos (SUCCESS)`);

    todoSpan.end();
  } catch (error) {
    httpSpan.recordException(error);
    httpSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.log(`❌ [HYBRID] Completed span: http.get.get_todos (ERROR: ${error.message})`);
    res.status(500).json({ error: error.message });
  } finally {
    httpSpan.end();
  }
});

app.post('/add_item', async (req, res) => {
  const span = tracer.startSpan('http.endpoint.create_todo', {
    kind: SpanKind.SERVER,
    attributes: {
      'manual.http.method': 'POST',
      'manual.http.route': '/add_item',
      'manual.todo.title': req.body.title,
      'manual.custom.endpoint': 'create_todo'
    }
  });

  try {
    const todo = { ...req.body, createdAt: new Date() };

    span.setAttributes({
      'manual.todo.description': req.body.description,
      'manual.todo.title_length': req.body.title?.length || 0,
      'manual.todo.description_length': req.body.description?.length || 0
    });

    span.addEvent('manual - Creating new todo', {
      'manual.request.body_size': JSON.stringify(req.body).length
    });

    const response = await addTodo(todo);

    span.setAttributes({
      'manual.response.todo.id': response._id,
      'manual.custom.todo_creation_success': true
    });

    span.addEvent('Todo creation completed', {
      'todo.id': response._id
    });

    res.send({ 'new_todo_id': response._id });
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    res.send({ error: error.message });
  } finally {
    span.end();
  }
});

app.delete('/delete/:id', async (req, res) => {
  const id = req.params.id;
  const span = tracer.startSpan('manual - http.endpoint.delete_todo', {
    kind: SpanKind.SERVER,
    attributes: {
      'manual.http.method': 'DELETE',
      'manual.http.route': '/delete/:id',
      'manual.todo.id': id,
      'manual.custom.endpoint': 'delete_todo'
    }
  });

  const startTime = Date.now();

  try {
    span.addEvent('manual - Deleting todo', {
      'manual.todo.id': id
    });

    await client.delete({
      index: 'todos',
      id: id
    });

    todoGauge.add(-1, { operation: 'delete' });

    const duration = Date.now() - startTime;
    operationDuration.record(duration, {
      operation: 'delete_todo',
      result: 'success'
    });

    span.addEvent('manual - Todo deleted successfully');
    span.setAttributes({
      'manual.custom.deletion_success': true
    });

    res.status(200).json({'deleted': id});
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    const duration = Date.now() - startTime;
    operationDuration.record(duration, {
      operation: 'delete_todo',
      result: 'error'
    });

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    res.status(500).json(error);
  } finally {
    span.end();
  }
});

app.listen(PORT, () => {
  checkAndCreateIndex().catch(console.error);
  console.log(`Hybrid instrumentation app listening on http://localhost:${PORT}`);
});