const messages = {
  error: 'Chưa gửi được hồi âm. Bạn thử lại giúp mình nhé.',
  duplicate: 'Email này đã được dùng để xác nhận trước đó.',
  invalid: 'Bạn kiểm tra lại thông tin vừa điền giúp mình nhé.',
  wishRequired: 'Bạn nhớ viết lời nhắn trước khi gửi hồi âm nhé.'
};

const scene = document.querySelector('.letter-scene');
const envelope = document.querySelector('#open-letter');
const letter = document.querySelector('#letter');
const form = document.querySelector('#rsvp-form');
const message = document.querySelector('#form-message');
let isOpen = false;

function openLetter() {
  if (isOpen) return;
  isOpen = true;
  scene.classList.add('has-open-letter');
  envelope.classList.add('open');
  letter.setAttribute('aria-hidden', 'false');
  letter.classList.add('open');
  window.setTimeout(() => {
    letter.querySelector('.close-letter').focus({ preventScroll: true });
    letter.scrollTop = 0;
  }, 1450);
}

function closeLetter() {
  if (!isOpen) return;
  isOpen = false;
  letter.classList.remove('open');
  letter.setAttribute('aria-hidden', 'true');
  scene.classList.remove('has-open-letter');
  envelope.classList.remove('open');
  envelope.focus();
}

envelope.addEventListener('click', openLetter);
document.querySelector('#close-letter').addEventListener('click', closeLetter);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeLetter(); });

form.addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(form);
  const wish = String(data.get('message') || '').trim();
  if (!wish) {
    message.className = 'form-message error';
    message.textContent = messages.wishRequired;
    form.elements.message.focus();
    return;
  }
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  message.className = 'form-message';
  message.textContent = '';
  try {
    const response = await fetch('/api/rsvp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.get('name'), email: data.get('email'), guests: Number(data.get('guests')), attending: data.get('attending') === 'yes', message: wish })
    });
    if (!response.ok) {
      const key = response.status === 409 ? 'duplicate' : response.status === 422 ? 'invalid' : 'error';
      throw new Error(messages[key]);
    }
    try {
      sessionStorage.setItem('rsvpName', String(data.get('name') || '').trim());
      sessionStorage.setItem('rsvpAttending', data.get('attending') === 'yes' ? 'yes' : 'no');
    } catch { /* The thank-you page still works without personalization. */ }
    window.location.assign('/thanks.html');
  } catch (error) {
    message.textContent = error.message || messages.error;
    message.classList.add('error');
  } finally {
    button.disabled = false;
  }
});
