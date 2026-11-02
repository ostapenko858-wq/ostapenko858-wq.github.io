// Плашка cookie: Яндекс Метрика включается только после «Согласен» (window.ymLoad — в <head>, см. metrika_tag).
// Выбор хранится в localStorage: all — согласие, necessary — только необходимые. «Настройки cookie» в подвале
// стирают выбор и показывают плашку снова.
(() => {
  const KEY = 'cookie_consent';
  const read = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  const save = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
  const brand = document.querySelector('.brand');
  const home = brand ? brand.getAttribute('href') : '/';

  function banner() {
    if (document.querySelector('.cookie')) return;
    const box = document.createElement('div');
    box.className = 'cookie';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Согласие на cookie');
    box.innerHTML = '<p>Мы используем cookie и Яндекс Метрику, чтобы понимать, чем сайт полезен. ' +
      `Подробнее — в <a href="${home}politika/">политике обработки персональных данных</a>.</p>` +
      '<div><button type="button" class="yes">Согласен</button><button type="button" class="no">Только необходимые</button></div>';
    box.querySelector('.yes').onclick = () => { save('all'); box.remove(); if (window.ymLoad) window.ymLoad(); };
    box.querySelector('.no').onclick = () => { save('necessary'); box.remove(); };
    document.body.appendChild(box);
  }

  document.querySelectorAll('[data-cookie-settings]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    // Отзыв согласия: стираем выбор и cookie Метрики, после перезагрузки она не включится
    try { localStorage.removeItem(KEY); } catch (err) {}
    document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => n.startsWith('_ym'))
      .forEach(n => { document.cookie = `${n}=; Max-Age=0; path=/`; document.cookie = `${n}=; Max-Age=0; path=/; domain=.${location.hostname}`; });
    banner();
  }));

  if (!read()) banner();
})();

// Плитки и карточки въезжают сбоку при прокрутке: чётные слева, нечётные справа, с небольшой задержкой по очереди.
// Без JS или при «уменьшить движение» в системе всё просто видно сразу.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const sel = '.block-head,.pains figure,.scen,.doubt,.case,.ctl,.steps li,.price,.task,.contact,.faq details,.grid .post,.pillar';
  const els = [...document.querySelectorAll(sel)];
  if (!els.length) return;
  document.documentElement.classList.add('motion');
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), {rootMargin: '0px 0px -8% 0px'});
  els.forEach(el => {
    const i = [...el.parentElement.children].indexOf(el);
    el.classList.add('rv');
    if (i % 2) el.classList.add('rv-r');
    el.style.setProperty('--d', Math.min(i, 6) * 0.07 + 's');
    io.observe(el);
  });
})();
