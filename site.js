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
