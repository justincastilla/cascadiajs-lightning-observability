/*app.js*/
const dotenv = require('dotenv').config();
const express = require('express');
const path = require('path');
const { Client } = require('@elastic/elasticsearch');
const PORT = parseInt(process.env.PORT || '8081');
const INDEX = process.env.indexName || 'todos';
const bodyParser = require('body-parser')
const cors = require('cors');

const app = express();
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cors())
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

async function checkAndCreateIndex() {
  const exists = await client.indices.exists({ index: INDEX });
  if (!exists) {
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
  }
}

checkAndCreateIndex().catch(console.error);

async function getTodos() {
  const response = await client.search({
    index: 'todos',
    body: {
      query: {
        match_all: {}
      }
    }
  });

  return response.hits.hits.map(hit => {
    return {
      id: hit._id,
      ...hit._source
    }
  });
}

async function addTodo(todo) {
  const response = await client.index({
    index: 'todos',
    body: todo
  });

  return response;
}


app.get('/', (req, res) => {
  let todos;
  getTodos().then((data) => {
    todos = data;
  }).then(() => {
    console.log(todos)
    res.sendFile('index.html', { root: path.join(__dirname, 'static') });
  });
  
});


app.get('/add_item', (req, res) => {
  res.render('add_item');
});

app.get('/get_todos', async (req, res) => {
  try {
    const todos = await getTodos();
    res.json({ todos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post('/add_item', async (req, res) =>  {
  const todo = { ...req.body, createdAt: new Date() };
  try {
    const response = await addTodo(todo);
    res.send({ 'new_todo_id': response._id });
  }
  catch (error) {
    res.send({ error: error.message });
  }
  
});

app.delete('/delete/:id', async (req, res) => {
    const id = req.params.id;
  try {
    await client.delete({
      index: 'todos',
      id: id
    });
    res.status(200).json({'deleted': id});
  } catch (error) {
    res.status(500).json(error);
  }
});

app.listen(PORT, () => {
  checkAndCreateIndex().catch(console.error);
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
