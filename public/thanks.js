const name = sessionStorage.getItem('rsvpName');
const attending = sessionStorage.getItem('rsvpAttending') !== 'no';
const copy = {
  eyebrow: 'THƯ ĐÃ ĐƯỢC GỬI ĐI',
  greeting: name ? `Cảm ơn ${name},` : 'Cảm ơn bạn,',
  headline: 'mình nhận được<br><em>hồi âm rồi!</em>',
  message: attending
    ? 'Yayyy, cảm ơn mọi người đã xác nhận 🩵 Hẹn gặp mọi người vào ngày 7/11 nheeee!'
    : 'Không sao nèee 💚 Hẹn dịp khác mình gặp nhau nhéee!',
  date: 'HẸN GẶP BẠN · THỨ BẢY, 07.11.2026',
  back: 'Quay lại lá thư',
  footer: 'Được gửi đi bằng cả tấm lòng ♡'
};

document.documentElement.lang = 'vi';
document.querySelector('#eyebrow').textContent = copy.eyebrow;
document.querySelector('#greeting').textContent = copy.greeting;
document.querySelector('#headline').innerHTML = copy.headline;
document.querySelector('#message').textContent = copy.message;
document.querySelector('#date-note').textContent = copy.date;
document.querySelector('#back-text').textContent = copy.back;
document.querySelector('#footer-note').textContent = copy.footer;
