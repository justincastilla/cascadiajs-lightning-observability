const { init } = require('./tracing');
init();

const dotenv = require('dotenv').config();
const express = require('express');
const path = require('path');
const { Client } = require('@elastic/elasticsearch');
const bodyParser = require('body-parser');
const cors = require('cors');
const { trace, context, SpanStatusCode, SpanKind } = require('@opentelemetry/api');

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

const tracer = trace.getTracer('manual-todo-app', '1.0.0');

async function checkAndCreateIndex() {
  const span = tracer.startSpan('elasticsearch.check_and_create_index', {
    kind: SpanKind.CLIENT,
    attributes: {
      'elasticsearch.index': INDEX,
      'operation.type': 'index_management'
    }
  });

  const spanContext = span.spanContext();
  console.log(`🔍 [MANUAL] Started span: elasticsearch.check_and_create_index`);
  console.log(`   Span ID: ${spanContext.spanId}`);
  console.log(`   Trace ID: ${spanContext.traceId}`);

  try {
    const exists = await client.indices.exists({ index: INDEX });
    span.setAttributes({
      'elasticsearch.index.exists': exists
    });

    if (!exists) {
      span.addEvent('Creating new index');
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

    span.setStatus({ code: SpanStatusCode.OK });
    console.log(`✅ [MANUAL] Completed span: elasticsearch.check_and_create_index (SUCCESS)`);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.log(`❌ [MANUAL] Completed span: elasticsearch.check_and_create_index (ERROR: ${error.message})`);
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
      'operation.type': 'search'
    }
  });

  const spanContext = span.spanContext();
  console.log(`📋 [MANUAL] Started span: elasticsearch.get_todos`);
  console.log(`   Span ID: ${spanContext.spanId}`);
  console.log(`   Trace ID: ${spanContext.traceId}`);

  try {
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
      'todos.count': todos.length
    });

    span.setStatus({ code: SpanStatusCode.OK });
    console.log(`✅ [MANUAL] Completed span: elasticsearch.get_todos (SUCCESS) - Found ${todos.length} todos`);
    return todos;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.log(`❌ [MANUAL] Completed span: elasticsearch.get_todos (ERROR: ${error.message})`);
    throw error;
  } finally {
    span.end();
  }
}

async function addTodo(todo) {
  const span = tracer.startSpan('elasticsearch.add_todo', {
    kind: SpanKind.CLIENT,
    attributes: {
      'elasticsearch.index': INDEX,
      'operation.type': 'index',
      'todo.title': todo.title
    }
  });

  const spanContext = span.spanContext();
  console.log(`➕ [MANUAL] Started span: elasticsearch.add_todo`);
  console.log(`   Span ID: ${spanContext.spanId}`);
  console.log(`   Trace ID: ${spanContext.traceId}`);
  console.log(`   Todo: "${todo.title}"`);

  try {
    const response = await client.index({
      index: 'todos',
      body: todo
    });

    span.setAttributes({
      'elasticsearch.document.id': response._id,
      'elasticsearch.result': response.result
    });

    span.setStatus({ code: SpanStatusCode.OK });
    console.log(`✅ [MANUAL] Completed span: elasticsearch.add_todo (SUCCESS) - Created todo ID: ${response._id}`);
    return response;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.log(`❌ [MANUAL] Completed span: elasticsearch.add_todo (ERROR: ${error.message})`);
    throw error;
  } finally {
    span.end();
  }
}

app.get('/', async (req, res) => {
  const span = tracer.startSpan('http.get.homepage', {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': 'GET',
      'http.route': '/',
      'user_agent': req.get('User-Agent')
    }
  });

  const spanContext = span.spanContext();
  console.log(`🏠 [MANUAL] Started span: http.get.homepage`);
  console.log(`   Span ID: ${spanContext.spanId}`);
  console.log(`   Trace ID: ${spanContext.traceId}`);

  try {
    const todos = await getTodos();
    span.setAttributes({
      'todos.loaded.count': todos.length
    });

    span.addEvent('Serving homepage with todos');
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
  const span = tracer.startSpan('http.get.add_item', {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': 'GET',
      'http.route': '/add_item'
    }
  });

  try {
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
  const httpSpan = tracer.startSpan('http.get.get_todos', {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': 'GET',
      'http.route': '/get_todos'
    }
  }, activeContext);

  const httpSpanContext = httpSpan.spanContext();
  console.log(`📋 [MANUAL] Started span: http.get.get_todos`);
  console.log(`   Span ID: ${httpSpanContext.spanId}`);
  console.log(`   Trace ID: ${httpSpanContext.traceId}`);

  try {
    // Create a business logic span for the todo operation as child of HTTP span
    const httpSpanContext = trace.setSpan(activeContext, httpSpan);
    const todoSpan = tracer.startSpan('todo.action.get_all', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'action.type': 'read',
        'action.name': 'get_all_todos',
        'user.operation': 'list_todos'
      }
    }, httpSpanContext);

    const todoSpanContext = todoSpan.spanContext();
    console.log(`📋 [MANUAL] Started span: todo.action.get_all`);
    console.log(`   Span ID: ${todoSpanContext.spanId}`);
    console.log(`   Trace ID: ${todoSpanContext.traceId}`);

    todoSpan.addEvent('Starting todo retrieval operation');

    // Execute getTodos within the todoSpan context
    const todoSpanActiveContext = trace.setSpan(httpSpanContext, todoSpan);
    const todos = await context.with(todoSpanActiveContext, () => getTodos());

    todoSpan.setAttributes({
      'todos.retrieved.count': todos.length,
      'operation.success': true,
      'operation.duration_ms': Date.now() % 1000 // Simple timing
    });

    todoSpan.addEvent('Todo retrieval completed', {
      'todos.count': todos.length,
      'operation.result': 'success'
    });

    httpSpan.setAttributes({
      'response.todos.count': todos.length,
      'business.operation': 'get_all_todos'
    });

    res.json({ todos });

    todoSpan.setStatus({ code: SpanStatusCode.OK });
    httpSpan.setStatus({ code: SpanStatusCode.OK });

    console.log(`✅ [MANUAL] Completed span: todo.action.get_all (SUCCESS) - Retrieved ${todos.length} todos`);
    console.log(`✅ [MANUAL] Completed span: http.get.get_todos (SUCCESS)`);

    todoSpan.end();
  } catch (error) {
    httpSpan.recordException(error);
    httpSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.log(`❌ [MANUAL] Completed span: http.get.get_todos (ERROR: ${error.message})`);
    res.status(500).json({ error: error.message });
  } finally {
    httpSpan.end();
  }
});

app.post('/add_item', async (req, res) => {
  const activeContext = context.active();
  const httpSpan = tracer.startSpan('http.post.add_item', {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': 'POST',
      'http.route': '/add_item',
      'todo.title': req.body.title
    }
  }, activeContext);

  const httpSpanContext = httpSpan.spanContext();
  console.log(`📝 [MANUAL] Started span: http.post.add_item`);
  console.log(`   Span ID: ${httpSpanContext.spanId}`);
  console.log(`   Trace ID: ${httpSpanContext.traceId}`);
  console.log(`   Creating todo: "${req.body.title}"`);

  try {
    // Create a business logic span for the add todo operation as child of HTTP span
    const httpSpanContext = trace.setSpan(activeContext, httpSpan);
    const addTodoSpan = tracer.startSpan('todo.action.add', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'action.type': 'create',
        'action.name': 'add_todo',
        'user.operation': 'create_todo',
        'todo.title': req.body.title,
        'todo.description': req.body.description || 'no description'
      }
    }, httpSpanContext);

    const addTodoSpanContext = addTodoSpan.spanContext();
    console.log(`➕ [MANUAL] Started span: todo.action.add`);
    console.log(`   Span ID: ${addTodoSpanContext.spanId}`);
    console.log(`   Trace ID: ${addTodoSpanContext.traceId}`);

    addTodoSpan.addEvent('Starting todo creation', {
      'todo.title': req.body.title,
      'todo.description': req.body.description,
      'request.timestamp': new Date().toISOString()
    });

    const todo = { ...req.body, createdAt: new Date() };
    httpSpan.setAttributes({
      'todo.description': req.body.description,
      'business.operation': 'add_todo'
    });

    // Execute addTodo within the addTodoSpan context
    const addTodoSpanActiveContext = trace.setSpan(httpSpanContext, addTodoSpan);
    const response = await context.with(addTodoSpanActiveContext, () => addTodo(todo));

    addTodoSpan.setAttributes({
      'todo.created.id': response._id,
      'todo.created.result': response.result,
      'operation.success': true
    });

    addTodoSpan.addEvent('Todo creation completed', {
      'todo.id': response._id,
      'elasticsearch.result': response.result,
      'operation.result': 'success'
    });

    httpSpan.setAttributes({
      'response.todo.id': response._id
    });

    res.send({ 'new_todo_id': response._id });

    addTodoSpan.setStatus({ code: SpanStatusCode.OK });
    httpSpan.setStatus({ code: SpanStatusCode.OK });

    console.log(`✅ [MANUAL] Completed span: todo.action.add (SUCCESS) - Created todo ID: ${response._id}`);
    console.log(`✅ [MANUAL] Completed span: http.post.add_item (SUCCESS)`);

    addTodoSpan.end();
  } catch (error) {
    httpSpan.recordException(error);
    httpSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.log(`❌ [MANUAL] Completed span: http.post.add_item (ERROR: ${error.message})`);
    res.send({ error: error.message });
  } finally {
    httpSpan.end();
  }
});

app.delete('/delete/:id', async (req, res) => {
  const id = req.params.id;
  const activeContext = context.active();
  const httpSpan = tracer.startSpan('http.delete.delete_todo', {
    kind: SpanKind.SERVER,
    attributes: {
      'http.method': 'DELETE',
      'http.route': '/delete/:id',
      'todo.id': id
    }
  }, activeContext);

  const httpSpanContext = httpSpan.spanContext();
  console.log(`🗑️ [MANUAL] Started span: http.delete.delete_todo`);
  console.log(`   Span ID: ${httpSpanContext.spanId}`);
  console.log(`   Trace ID: ${httpSpanContext.traceId}`);
  console.log(`   Deleting todo ID: ${id}`);

  try {
    // Create a business logic span for the delete todo operation as child of HTTP span
    const httpSpanContext = trace.setSpan(activeContext, httpSpan);
    const deleteTodoSpan = tracer.startSpan('todo.action.delete', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'action.type': 'delete',
        'action.name': 'delete_todo',
        'user.operation': 'remove_todo',
        'todo.id': id
      }
    }, httpSpanContext);

    const deleteTodoSpanContext = deleteTodoSpan.spanContext();
    console.log(`🗑️ [MANUAL] Started span: todo.action.delete`);
    console.log(`   Span ID: ${deleteTodoSpanContext.spanId}`);
    console.log(`   Trace ID: ${deleteTodoSpanContext.traceId}`);

    deleteTodoSpan.addEvent('Starting todo deletion', {
      'todo.id': id,
      'request.timestamp': new Date().toISOString()
    });

    // Create Elasticsearch delete span as child of deleteTodoSpan
    const deleteTodoSpanActiveContext = trace.setSpan(httpSpanContext, deleteTodoSpan);
    const esDeleteSpan = tracer.startSpan('elasticsearch.delete_todo', {
      kind: SpanKind.CLIENT,
      attributes: {
        'elasticsearch.index': 'todos',
        'elasticsearch.operation': 'delete',
        'todo.id': id
      }
    }, deleteTodoSpanActiveContext);

    const esDeleteSpanContext = esDeleteSpan.spanContext();
    console.log(`🗑️ [MANUAL] Started span: elasticsearch.delete_todo`);
    console.log(`   Span ID: ${esDeleteSpanContext.spanId}`);
    console.log(`   Trace ID: ${esDeleteSpanContext.traceId}`);

    // Execute delete within the esDeleteSpan context
    const esDeleteSpanActiveContext = trace.setSpan(deleteTodoSpanActiveContext, esDeleteSpan);
    await context.with(esDeleteSpanActiveContext, () => client.delete({
      index: 'todos',
      id: id
    }));

    esDeleteSpan.setAttributes({
      'operation.success': true,
      'todo.deleted.id': id
    });

    esDeleteSpan.addEvent('Todo deleted from Elasticsearch');
    esDeleteSpan.setStatus({ code: SpanStatusCode.OK });
    esDeleteSpan.end();

    deleteTodoSpan.setAttributes({
      'todo.deleted.id': id,
      'operation.success': true
    });

    deleteTodoSpan.addEvent('Todo deletion completed', {
      'todo.id': id,
      'operation.result': 'success'
    });

    httpSpan.setAttributes({
      'business.operation': 'delete_todo',
      'operation.success': true
    });

    httpSpan.addEvent('Todo deleted successfully');
    res.status(200).json({'deleted': id});

    deleteTodoSpan.setStatus({ code: SpanStatusCode.OK });
    httpSpan.setStatus({ code: SpanStatusCode.OK });

    console.log(`✅ [MANUAL] Completed span: elasticsearch.delete_todo (SUCCESS)`);
    console.log(`✅ [MANUAL] Completed span: todo.action.delete (SUCCESS) - Deleted todo ID: ${id}`);
    console.log(`✅ [MANUAL] Completed span: http.delete.delete_todo (SUCCESS)`);

    deleteTodoSpan.end();
  } catch (error) {
    httpSpan.recordException(error);
    httpSpan.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.log(`❌ [MANUAL] Completed span: http.delete.delete_todo (ERROR: ${error.message})`);
    res.status(500).json(error);
  } finally {
    httpSpan.end();
  }
});

app.listen(PORT, () => {
  checkAndCreateIndex().catch(console.error);
  console.log(`Manual instrumentation app listening on http://localhost:${PORT}`);
});