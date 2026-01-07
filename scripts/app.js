// Todo List Application với đầy đủ CRUD
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentFilter = 'all';
let editingId = null;

// Khởi tạo ứng dụng
document.addEventListener('DOMContentLoaded', () => {
  renderTodos();
  updateStats();
  
  // Enter key để thêm todo
  document.getElementById('todoInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addTodo();
    }
  });

  // Enter key trong edit modal
  document.getElementById('editInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveEdit();
    }
  });
});

// CREATE - Thêm công việc mới
function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();

  if (text === '') {
    input.classList.add('shake');
    setTimeout(() => input.classList.remove('shake'), 500);
    return;
  }

  const newTodo = {
    id: Date.now(),
    text: text,
    completed: false,
    createdAt: new Date().toISOString()
  };

  todos.push(newTodo);
  saveTodos();
  renderTodos();
  updateStats();
  
  input.value = '';
  input.focus();
  
  // Animation feedback
  showNotification('Đã thêm công việc mới!');
}

// READ - Hiển thị danh sách công việc
function renderTodos() {
  const todoList = document.getElementById('todoList');
  const emptyState = document.getElementById('emptyState');
  
  // Lọc todos theo filter
  const filteredTodos = getFilteredTodos();
  
  todoList.innerHTML = '';
  
  if (filteredTodos.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  
  filteredTodos.forEach(todo => {
    const li = createTodoElement(todo);
    todoList.appendChild(li);
  });
}

// Tạo element cho mỗi todo
function createTodoElement(todo) {
  const li = document.createElement('li');
  li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
  li.dataset.id = todo.id;
  
  li.innerHTML = `
    <div class="todo-content">
      <button class="checkbox ${todo.completed ? 'checked' : ''}" onclick="toggleComplete(${todo.id})">
        ${todo.completed ? '✓' : ''}
      </button>
      <span class="todo-text">${escapeHtml(todo.text)}</span>
      <input 
        type="text" 
        class="todo-edit-input" 
        value="${escapeHtml(todo.text)}"
        style="display: none;"
      />
    </div>
    <div class="todo-actions">
      <button class="btn-edit" onclick="openEditModal(${todo.id})" title="Chỉnh sửa">
        <span class="icon">✏️</span>
      </button>
      <button class="btn-delete" onclick="deleteTodo(${todo.id})" title="Xóa">
        <span class="icon">🗑️</span>
      </button>
    </div>
  `;
  
  return li;
}

// UPDATE - Cập nhật trạng thái hoàn thành
function toggleComplete(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    renderTodos();
    updateStats();
    
    const message = todo.completed ? 'Đã đánh dấu hoàn thành!' : 'Đã bỏ đánh dấu hoàn thành!';
    showNotification(message);
  }
}

// UPDATE - Mở modal chỉnh sửa
function openEditModal(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  
  editingId = id;
  document.getElementById('editInput').value = todo.text;
  document.getElementById('editModal').style.display = 'flex';
  document.getElementById('editInput').focus();
}

// UPDATE - Lưu chỉnh sửa
function saveEdit() {
  if (editingId === null) return;
  
  const input = document.getElementById('editInput');
  const text = input.value.trim();
  
  if (text === '') {
    input.classList.add('shake');
    setTimeout(() => input.classList.remove('shake'), 500);
    return;
  }
  
  const todo = todos.find(t => t.id === editingId);
  if (todo) {
    todo.text = text;
    saveTodos();
    renderTodos();
    closeEditModal();
    showNotification('Đã cập nhật công việc!');
  }
}

// UPDATE - Đóng modal chỉnh sửa
function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  editingId = null;
  document.getElementById('editInput').value = '';
}

// DELETE - Xóa công việc
function deleteTodo(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
    return;
  }
  
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  renderTodos();
  updateStats();
  showNotification('Đã xóa công việc!');
}

// DELETE - Xóa tất cả công việc
function deleteAllTodos() {
  if (todos.length === 0) {
    showNotification('Không có công việc nào để xóa!');
    return;
  }
  
  if (!confirm(`Bạn có chắc chắn muốn xóa tất cả ${todos.length} công việc? Hành động này không thể hoàn tác!`)) {
    return;
  }
  
  todos = [];
  saveTodos();
  renderTodos();
  updateStats();
  showNotification('Đã xóa tất cả công việc!');
}

// Lọc công việc
function filterTasks(filter) {
  currentFilter = filter;
  
  // Cập nhật active state của filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filter === filter) {
      btn.classList.add('active');
    }
  });
  
  renderTodos();
}

// Lấy danh sách đã lọc
function getFilteredTodos() {
  switch (currentFilter) {
    case 'active':
      return todos.filter(t => !t.completed);
    case 'completed':
      return todos.filter(t => t.completed);
    default:
      return todos;
  }
}

// Cập nhật thống kê
function updateStats() {
  const total = todos.length;
  const active = todos.filter(t => !t.completed).length;
  const completed = todos.filter(t => t.completed).length;
  
  document.getElementById('totalCount').textContent = total;
  document.getElementById('activeCount').textContent = active;
  document.getElementById('completedCount').textContent = completed;
  
  // Animation cho số liệu
  animateNumber('totalCount', total);
  animateNumber('activeCount', active);
  animateNumber('completedCount', completed);
}

// Animation cho số liệu
function animateNumber(elementId, targetValue) {
  const element = document.getElementById(elementId);
  const currentValue = parseInt(element.textContent) || 0;
  
  if (currentValue === targetValue) return;
  
  const increment = targetValue > currentValue ? 1 : -1;
  const duration = 300;
  const steps = Math.abs(targetValue - currentValue);
  const stepDuration = duration / steps;
  
  let current = currentValue;
  const timer = setInterval(() => {
    current += increment;
    element.textContent = current;
    
    if (current === targetValue) {
      clearInterval(timer);
    }
  }, stepDuration);
}

// Lưu vào localStorage
function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

// Escape HTML để tránh XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Hiển thị thông báo
function showNotification(message) {
  // Tạo notification element nếu chưa có
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';
    document.body.appendChild(notification);
  }
  
  notification.textContent = message;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 2000);
}

// Đóng modal khi click bên ngoài
window.onclick = function(event) {
  const modal = document.getElementById('editModal');
  if (event.target === modal) {
    closeEditModal();
  }
}
