const loginCard = document.querySelector('#login-card');
const dashboard = document.querySelector('#dashboard');
const loadingError = document.querySelector('#loading-error');
const loginMessage = document.querySelector('#login-message');
const loginForm = document.querySelector('#login-form');

async function loadDashboard() {
  loginCard.hidden = true;
  dashboard.hidden = true;
  loadingError.hidden = true;
  try {
    const response = await fetch('/api/admin/summary', { headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (response.status === 401) {
      loginCard.hidden = false;
      return;
    }
    if (!response.ok) throw new Error(result.error || 'Không tải được dữ liệu.');
    renderDashboard(result);
    dashboard.hidden = false;
  } catch (error) {
    document.querySelector('#error-copy').textContent = error.message || 'Không tải được dữ liệu RSVP.';
    loadingError.hidden = false;
  }
}

function renderDashboard(data) {
  const total = Number(data.totalResponses) || 0;
  const attending = Number(data.attendingResponses) || 0;
  const declined = Number(data.declinedResponses) || 0;
  const guests = Number(data.expectedGuests) || 0;
  document.querySelector('#total-responses').textContent = total;
  document.querySelector('#attending-responses').textContent = attending;
  document.querySelector('#expected-guests').textContent = guests;
  document.querySelector('#chart-total').textContent = `${total} phản hồi`;
  document.querySelector('#chart-center').textContent = total;
  document.querySelector('#legend-yes').textContent = attending;
  document.querySelector('#legend-no').textContent = declined;
  document.querySelector('#attendance-chart').style.setProperty('--yes-share', `${total ? attending / total * 100 : 0}%`);
  document.querySelector('#attendance-chart').setAttribute('aria-label', `Sẽ tham dự: ${attending}; không tham dự: ${declined}`);

  const list = document.querySelector('#recent-list');
  const tableMessage = document.querySelector('#table-message');
  tableMessage.textContent = '';
  list.replaceChildren();
  if (!data.recent?.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'empty-row';
    cell.textContent = 'Chưa có hồi âm nào.';
    row.append(cell);
    list.append(row);
    return;
  }

  for (const rsvp of data.recent) {
    const row = document.createElement('tr');
    const person = document.createElement('td');
    person.className = 'person-cell';
    const name = document.createElement('strong');
    name.textContent = rsvp.name;
    const email = document.createElement('span');
    email.textContent = rsvp.email;
    person.append(name, email);

    const statusCell = document.createElement('td');
    const status = document.createElement('span');
    status.className = `status-pill ${rsvp.attending ? 'is-going' : 'not-going'}`;
    status.textContent = rsvp.attending ? 'Sẽ đến' : 'Không đến';
    statusCell.append(status);

    const guestCell = document.createElement('td');
    guestCell.textContent = rsvp.attending ? `${rsvp.guests} khách` : '—';

    const wishCell = document.createElement('td');
    wishCell.className = 'wish-cell';
    wishCell.textContent = rsvp.message || 'Không để lại lời nhắn';

    const dateCell = document.createElement('td');
    dateCell.className = 'date-cell';
    const submitted = new Date(rsvp.submittedAt);
    dateCell.textContent = Number.isNaN(submitted.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(submitted);

    const actionCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-rsvp';
    deleteButton.type = 'button';
    deleteButton.textContent = 'Xóa';
    deleteButton.setAttribute('aria-label', `Xóa phản hồi của ${rsvp.name}`);
    deleteButton.addEventListener('click', () => removeRsvp(rsvp, deleteButton));
    actionCell.append(deleteButton);

    row.append(person, statusCell, guestCell, wishCell, dateCell, actionCell);
    list.append(row);
  }
}

async function removeRsvp(rsvp, button) {
  if (!window.confirm(`Bạn có chắc muốn xóa phản hồi của ${rsvp.name} không?`)) return;
  button.disabled = true;
  const tableMessage = document.querySelector('#table-message');
  try {
    const response = await fetch(`/api/admin/rsvps/${encodeURIComponent(rsvp.id)}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Không xóa được phản hồi.');
    await loadDashboard();
  } catch (error) {
    tableMessage.textContent = error.message;
    button.disabled = false;
  }
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = loginForm.querySelector('button[type="submit"]');
  button.disabled = true;
  loginMessage.textContent = '';
  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: new FormData(loginForm).get('password') })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(response.status === 401 ? 'Mật khẩu chưa đúng, bạn thử lại nhé.' : result.error || 'Chưa đăng nhập được.');
    loginForm.reset();
    await loadDashboard();
  } catch (error) {
    loginMessage.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#refresh-button').addEventListener('click', loadDashboard);
document.querySelector('#retry-button').addEventListener('click', loadDashboard);
document.querySelector('#logout-button').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  dashboard.hidden = true;
  loginCard.hidden = false;
});

loadDashboard();
