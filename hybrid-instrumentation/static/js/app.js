
const ul = document.querySelector('ul');
const deleteButtons = document.getElementsByName('delete');
const todosListDiv = document.querySelector('div[name="todos-list"]');
const addButton = document.querySelector('button[name="add"]');
const addForm = document.querySelector('div[name="add-div"]');
const addSubmitButton = document.querySelector('button[name="add-submit"]');

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;

fetch(`${API_BASE_URL}/get_todos`)
  .then(response => response.json())
  .then(data => {
    console.log(data)
    todos = data.todos
    todos.forEach(todo => {
      const li = document.createElement('li');
      li.setAttribute('class', 'bg-white p-4 rounded shadow flex justify-between items-center');
      li.innerHTML = `
      <div>
        <span class="font-semibold">${todo.title}</span> - ${todo.description}
      </div>
        <button
          type="submit"
          id="${todo.id}"
          name="delete"
          class="text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200 rounded px-3 py-1">Delete
        </button>`;

      ul.appendChild(li);
    });
  })
  .catch(error => {
    // Handle errors
    console.error(error);
  }).finally(() => {

    deleteButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default form submission
        let id = event.target.id
        console.log(id)
        fetch(`${API_BASE_URL}/delete/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        })
          .then(response => response.json())
          .then(data => {
            console.log(data)
            event.target.closest('li').remove();
          })
          .catch(error => {
            // Handle errors
            console.error(error);
          });
      });
    });
  
    addButton.addEventListener('click', (event) => {
      event.preventDefault();
      console.log('Add New Item Clicked')
      
      addForm.style.display = 'block';
      todosListDiv.style.display = 'none';

      addSubmitButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default form submission
        console.log(event)

      let title = document.querySelector('input[name="new_title"]').value;
      let description = document.querySelector('textarea[name="new_description"]').value;
      const todo = { title, description };
      console.log(todo)
        fetch(`${API_BASE_URL}/add_item`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(todo),
        })
          .then(response => response.json())
          .then(data => {
            console.log(data)

            addForm.style.display = 'none';
            todosListDiv.style.display = 'block';

            const li = document.createElement('li');
            li.setAttribute('class', 'bg-white p-4 rounded shadow flex justify-between items-center');
            li.innerHTML = `
              <div>
                <span class="font-semibold">${title}</span> - ${description}
              </div>
                <button
                  type="submit"
                  id="${data.id}"
                  name="delete"
                  class="text-red-500 hover:text-red-700 bg-red-100 hover:bg-red-200 rounded px-3 py-1">Delete
                </button>`;
            ul.appendChild(li);
            document.querySelector('input[name="new_title"]').value = '';
            document.querySelector('textarea[name="new_description"]').value = '';
          })
          .catch(error => {
            console.error(error);
          });
      });
    });
  });
