const language = new URLSearchParams(window.location.search).get('lang') || sessionStorage.getItem('rsvpLanguage') || 'vi';
const name = sessionStorage.getItem('rsvpName');
const attending = sessionStorage.getItem('rsvpAttending') !== 'no';
const copy = {
  vi: {
    eyebrow: 'THƯ ĐÃ ĐƯỢC GỬI ĐI', greeting: name ? `Cảm ơn ${name},` : 'Cảm ơn bạn,',
    headline: 'mình nhận được<br><em>hồi âm rồi!</em>',
    message: attending ? 'Mình vui lắm khi biết bạn sẽ cùng chia sẻ ngày đặc biệt này. Hẹn gặp bạn trong buổi lễ nhé — mình sẽ giữ cho bạn một chỗ thật đẹp.' : 'Cảm ơn bạn đã hồi âm và báo cho mình biết. Mình sẽ nhớ bạn trong ngày đặc biệt ấy, mong sớm có dịp gặp lại bạn nhé.',
    date: 'HẸN GẶP BẠN · THỨ BẢY, 07.11.2026', back: 'Quay lại lá thư', footer: 'Được gửi đi bằng cả tấm lòng ♡'
  },
  en: {
    eyebrow: 'YOUR LETTER HAS ARRIVED', greeting: name ? `Thank you, ${name},` : 'Thank you,',
    headline: 'I’ve received<br><em>your reply!</em>',
    message: attending ? 'I’m so happy you’ll be sharing this special day with me. See you at the celebration — I’ll save you a lovely seat.' : 'Thank you for writing back and letting me know. I’ll be thinking of you on the day, and hope we can catch up soon.',
    date: 'SEE YOU THERE · SATURDAY, NOVEMBER 7, 2026', back: 'Back to the letter', footer: 'Sent with all my love ♡'
  }
};
const selected = copy[language] || copy.vi;
document.documentElement.lang = language === 'en' ? 'en' : 'vi';
document.querySelector('#eyebrow').textContent = selected.eyebrow;
document.querySelector('#greeting').textContent = selected.greeting;
document.querySelector('#headline').innerHTML = selected.headline;
document.querySelector('#message').textContent = selected.message;
document.querySelector('#date-note').textContent = selected.date;
document.querySelector('#back-text').textContent = selected.back;
document.querySelector('#footer-note').textContent = selected.footer;
