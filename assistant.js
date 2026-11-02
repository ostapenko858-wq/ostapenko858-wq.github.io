// Помощник на сайте: 6 вопросов -> решение, цена, срок, расходы и окупаемость.
// Цены и сроки — из brief.md; вилки — ориентир, точная цена после аудита.
(() => {
  const root = document.getElementById('assistant');
  if (!root) return;
  const log = root.querySelector('.as-log');
  const opts = root.querySelector('.as-opts');
  const counter = root.querySelector('.as-step');
  const VK_CHAT = root.dataset.vk;
  const TG = root.dataset.tg;
  const PHONE = root.dataset.phone;
  // Сервер на Railway пересылает расчёт основательнице в Telegram (без контактов посетителя)
  const ENDPOINT = root.dataset.endpoint;
  const BOT = root.dataset.bot;
  const RUNNING = 2000; // ₽ в месяц: сервер + нейросеть, середина вилки 1 200–2 500

  const TASKS = {
    answers: {label: 'Отвечаю на одни и те же вопросы и заявки', solution: 'ИИ-администратор: отвечает клиентам круглые сутки, уточняет запрос и передаёт вам готовую заявку', price: [40000, 70000], weeks: '2–3 недели', share: .5},
    booking: {label: 'Запись, переносы и напоминания', solution: 'ИИ-администратор записи: ведёт расписание, напоминает клиентам и сам переносит визиты', price: [40000, 70000], weeks: '2–3 недели', share: .5},
    sales: {label: 'Рассказываю о товарах и принимаю заказы', solution: 'ИИ-продавец каталога: показывает ассортимент, советует и оформляет заказ без маркетплейса', price: [40000, 120000], weeks: '3–5 недель', share: .5},
    reports: {label: 'Свожу отчёты из 1С и Excel', solution: 'Программа сводки отчётов: сама собирает выгрузки в одну таблицу, считает план-факт формулами, а данные клиентов не уходят в нейросеть', price: [40000, 80000], weeks: '2–3 недели', share: .7},
    prices: {label: 'Обновляю цены поставщика в 1С и на сайте', solution: 'Автообновление цен: прайс поставщика проверяется и загружается в 1С, наценка считается сама, сайт подтягивает цены', price: [40000, 80000], weeks: '2–3 недели', share: .7},
    training: {label: 'Обучаю новых сотрудников', solution: 'ИИ-наставник по вашим регламентам: отвечает сотрудникам и проверяет новичков', price: [40000, 100000], weeks: '3–4 недели', share: .4},
    stock: {label: 'Учёт, остатки, отчёты сотрудников', solution: 'ИИ-учётчик: сотрудники пишут в чат как привыкли, а он сводит приход, расход и остатки', price: [40000, 100000], weeks: '3–4 недели', share: .5},
    diaries: {label: 'Проверяю дневники питания и тарелки клиентов', solution: 'Готовый ИИ-помощник нутрициолога: разбирает тарелки по фото по вашей методике и показывает вам сводку по клиентам', price: [50000, 50000], weeks: 'около 2 недель', share: .5, ready: true},
    reflection: {label: 'Поддерживаю клиентов между сессиями', solution: 'Готовый ИИ-помощник для рефлексии: дневник состояния и упражнения по вашему подходу', price: [50000, 50000], weeks: 'около 2 недель', share: .3, ready: true},
    content: {label: 'Пишу посты и веду соцсети', solution: 'Контент-завод: черновики постов, статей и карточек в вашем стиле, вы только правите', price: [40000, 80000], weeks: '2–3 недели', share: .5},
    other: {label: 'Другое, опишу сам', solution: 'Решение под вашу задачу, подберём на бесплатном аудите', price: [40000, 120000], weeks: 'от 2 недель', share: .3}
  };
  // Здесь помощник не только экономит время, но и возвращает заявки, которые сейчас теряются
  const MONEY_TASKS = ['answers', 'booking', 'sales'];
  const RECOVER = .5;  // возвращаем примерно половину потерянных заявок
  const MARGIN = .5;   // в окупаемость берём половину этой выручки: остальное — расходы на саму услугу или товар

  const TASKS_BY = {
    biz: ['answers', 'booking', 'reports', 'prices', 'sales', 'stock', 'training', 'content', 'other'],
    spec: ['diaries', 'reflection', 'answers', 'booking', 'content', 'other']
  };

  const STEPS = [
    {key: 'who', q: 'Для начала: кто вы?', options: () => [['biz', 'У меня бизнес'], ['spec', 'Я специалист: нутрициолог, тренер, психолог']]},
    {key: 'task', q: 'Что отнимает больше всего времени? Выберите самое неприятное.', options: a => TASKS_BY[a.who].map(k => [k, TASKS[k].label])},
    {key: 'hours', q: 'Сколько часов в неделю на это уходит? У вас и сотрудников вместе, примерно.', options: () => [[3, 'До 5 часов'], [7, '5–10 часов'], [15, '10–20 часов'], [25, 'Больше 20']]},
    {key: 'rate', q: a => a.who === 'spec' ? 'Сколько стоит час вашей работы с клиентом?' : 'Сколько получает человек, который этим занимается?',
     options: a => a.who === 'spec'
       ? [[1000, 'До 1 500 ₽'], [2000, '1 500–3 000 ₽'], [4000, '3 000–5 000 ₽'], [6000, 'Больше 5 000 ₽']]
       : [[300, 'Около 50 000 ₽ в месяц'], [450, 'Около 75 000 ₽'], [600, 'Около 100 000 ₽'], [1500, 'Это делаю я сам, и моё время дороже']]},
    {key: 'lost', when: a => MONEY_TASKS.includes(a.task),
     q: 'Сколько заявок или клиентов в месяц теряете: не успели ответить, ответили утром, клиент забыл о записи?',
     options: () => [[0, 'Почти не теряем'], [2, '1–3'], [5, '4–7'], [10, 'Больше 7']]},
    {key: 'check', when: a => MONEY_TASKS.includes(a.task) && a.lost > 0, q: 'Какой у вас средний чек?',
     options: () => [[1500, 'До 2 000 ₽'], [3500, '2 000–5 000 ₽'], [7500, '5 000–10 000 ₽'], [15000, 'Больше 10 000 ₽']]},
    {key: 'when', q: 'Когда хотелось бы запустить?', options: () => [['fast', 'В ближайшие 2 недели'], ['month', 'В течение месяца'], ['later', 'Не спешу, сначала разобраться']]},
    {key: 'budget', q: 'Последний вопрос: какой бюджет на разработку для вас комфортен?', options: () => [[40000, 'До 40 000 ₽'], [70000, '40–70 000 ₽'], [150000, '70–150 000 ₽'], [0, 'Пока не знаю']]}
  ];

  let answers, idx, skipped, startedAt;
  const rub = n => Math.round(n).toLocaleString('ru-RU') + ' ₽';
  const months = n => n < 1 ? '1 месяц' : (n => n % 10 === 1 && n % 100 !== 11 ? n + ' месяц' : (n % 10 >= 2 && n % 10 <= 4 && !(n % 100 >= 12 && n % 100 <= 14) ? n + ' месяца' : n + ' месяцев'))(Math.ceil(n));

  function say(html, who = 'bot') {
    const b = document.createElement('div');
    b.className = 'as-msg ' + who;
    b.innerHTML = html;
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }

  function typing(then) {
    const t = say('<span class="as-dots"><i></i><i></i><i></i></span>');
    setTimeout(() => { t.remove(); then(); }, 550);
  }

  function ask() {
    const s = STEPS[idx];
    // Вопросы про заявки считаем заранее, как только выбрана задача (ответ «почти не теряем» уберёт вопрос про чек)
    const ahead = Object.assign({lost: 1}, answers);
    const shown = STEPS.filter(x => !x.when || x.when(ahead));
    counter.textContent = `Вопрос ${shown.indexOf(s) + 1 - skipped} из ${shown.length - skipped}`;
    typing(() => {
      say(typeof s.q === 'function' ? s.q(answers) : s.q);
      opts.innerHTML = '';
      s.options(answers).forEach(([value, label]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.onclick = () => choose(s.key, value, label);
        opts.appendChild(btn);
      });
    });
  }

  function choose(key, value, label) {
    opts.innerHTML = '';
    say(label, 'me');
    answers[key] = value;
    if (key === 'task' && value === 'other') return askText();
    next();
  }

  function askText() {
    typing(() => {
      say('Опишите в паре фраз, что именно делаете вручную. Это попадёт в расчёт для нас.');
      opts.innerHTML = '<form class="as-form"><input type="text" placeholder="Например: сверяю заказы из трёх таблиц" required><button>Дальше</button></form>';
      const form = opts.querySelector('form');
      form.querySelector('input').focus({preventScroll: true});
      form.onsubmit = e => {
        e.preventDefault();
        const text = form.querySelector('input').value.trim();
        if (!text) return;
        answers.otherText = text;
        opts.innerHTML = '';
        say(text.replace(/[<>&]/g, ''), 'me');
        next();
      };
    });
  }

  function next() {
    idx += 1;
    while (idx < STEPS.length && STEPS[idx].when && !STEPS[idx].when(answers)) idx += 1;
    if (idx < STEPS.length) ask(); else result();
  }

  function result() {
    counter.textContent = 'Готово';
    const t = TASKS[answers.task];
    const freed = answers.hours * 4.3 * t.share;            // часов в месяц
    const saved = freed * answers.rate;                      // ₽ в месяц
    const recovered = (answers.lost || 0) * RECOVER * (answers.check || 0);  // выручка, которая вернётся
    const net = saved + recovered * MARGIN - RUNNING;
    const [p0, p1] = t.price;
    const priceText = p0 === p1 ? rub(p0) : `от ${rub(p0)}, для такой задачи обычно ${rub(p0)}–${rub(p1)}`;

    let verdict;
    if (net <= 0) {
      verdict = `<p class="as-verdict bad">Честно: по этим цифрам помощник себя не окупит. Выгода меньше, чем он стоит в месяц. Возможно, вам пока дешевле оставить всё как есть, и на аудите мы скажем то же самое.</p>`;
    } else {
      const fast = p0 / net, slow = p1 / net, middle = (fast + slow) / 2;
      const range = p0 === p1 ? months(fast) : (Math.ceil(fast) === Math.ceil(slow) ? months(fast) : `${Math.ceil(fast)}–${months(slow)}`);
      if (middle <= 6) verdict = `<p class="as-verdict good">Окупится примерно за ${range}.</p>`;
      else if (fast <= 12) verdict = `<p class="as-verdict mid">Окупится, но не быстро: примерно за ${range}. Стоит начать с самой затратной части процесса, тогда срок сократится.</p>`;
      else verdict = `<p class="as-verdict bad">Окупаться будет дольше года. Обсудим на аудите, есть ли смысл: иногда выгоднее не делать.</p>`;
    }

    const notes = [];
    if (answers.when === 'fast') notes.push(t.ready ? 'По срокам успеваем: готовое решение настраиваем под вас около 2 недель.'
      : 'За 2 недели реально запустить первую версию одного сценария, остальное — следующим шагом.');
    if (answers.budget && answers.budget < p0) notes.push('Бюджет пока ниже нижней границы. Можно начать с самого затратного кусочка процесса или вернуться к этому позже.');
    else if (answers.budget && answers.budget < p1) notes.push('Бюджета хватит на простой вариант: один сценарий без сложных интеграций. Остальное можно добавить потом.');
    else if (answers.budget) notes.push('В бюджет укладываемся.');
    notes.push(answers.who === 'spec'
      ? 'Деньги из этого расчёта появятся, если занять освободившиеся часы клиентами или не брать работу на вечер.'
      : 'Это стоимость часов сотрудника: они уходят на другую работу или позволяют не нанимать ещё одного человека.');

    typing(() => {
      say(`<div class="as-result">
        <p class="as-r-title">Что подойдёт</p><p>${t.solution}.</p>
        <dl>
          <div><dt>Освободится</dt><dd>~${Math.round(freed)} ч в месяц</dd></div>
          <div><dt>Стоимость этого времени</dt><dd>~${rub(saved)} в месяц</dd></div>
          ${recovered ? `<div><dt>Вернёт выручки</dt><dd>~${rub(recovered)} в месяц</dd></div>` : ''}
          <div><dt>Разработка</dt><dd>${priceText}</dd></div>
          <div><dt>Срок</dt><dd>${t.weeks}</dd></div>
          <div><dt>Расходы после запуска</dt><dd>1 200–2 500 ₽ в месяц</dd></div>
        </dl>
        ${verdict}
        ${notes.map(n => `<p class="as-note">${n}</p>`).join('')}
        <p class="as-small">Считали осторожно: помощник берёт на себя около ${Math.round(t.share * 100)}% этой работы${recovered ? ' и возвращает примерно половину потерянных заявок, а в окупаемость идёт только половина этой выручки' : ''}. Точные цифры — после бесплатного аудита.</p>
      </div>`);
      // Код расчёта зашит в ссылку на бота: по нему бот находит расчёт и отдаёт его основательнице. Человек кода не видит
      const code = Array.from({length: 6}, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
      report(t, freed, saved, recovered, verdict.replace(/<[^>]+>/g, ''), code);
      typing(() => {
        say(ENDPOINT
          ? 'Если расчёт вам подходит, давайте обсудим. Кнопка «Обсудить в Telegram» откроет наш чат, и расчёт уже будет у нас: пересказывать ничего не нужно.'
          : 'Если расчёт вам подходит, давайте обсудим: напишите нам в Telegram или ВК, либо позвоните.');
        opts.innerHTML = '';
        const link = (href, text, cls) => {
          const a = document.createElement('a');
          a.className = cls; a.href = href; a.textContent = text;
          if (href.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
          return a;
        };
        const again = document.createElement('button');
        again.type = 'button'; again.className = 'as-again'; again.textContent = 'Посчитать заново';
        again.onclick = start;
        const tg = ENDPOINT ? `https://t.me/${BOT}?start=calc_${code}` : TG;
        opts.append(link(tg, 'Обсудить в Telegram', 'as-send'), link(PHONE, 'Позвонить', 'as-send as-alt'),
                    link(VK_CHAT, 'Написать в ВК', 'as-send as-alt'), again);
      });
    });
  }

  function report(t, freed, saved, recovered, verdict, code) {
    if (!ENDPOINT) return;
    const data = {
      who: answers.who, task: t.label, other: answers.otherText || '', hours: answers.hours, rate: answers.rate,
      when: answers.when, budget: answers.budget, freed: Math.round(freed), saved: Math.round(saved),
      lost: answers.lost || 0, check: answers.check || 0, recovered: Math.round(recovered),
      verdict, page: location.pathname, code, seconds: Math.round((Date.now() - startedAt) / 1000)
    };
    // text/plain без чтения ответа — простой запрос, браузеру не нужен предварительный CORS-запрос
    try { fetch(ENDPOINT, {method: 'POST', mode: 'no-cors', keepalive: true, headers: {'Content-Type': 'text/plain'}, body: JSON.stringify(data)}); } catch (e) {}
  }

  function start() {
    answers = {}; idx = 0; skipped = 0; startedAt = Date.now();
    log.innerHTML = ''; opts.innerHTML = '';
    if (root.dataset.who) { answers.who = root.dataset.who; idx = skipped = 1; }
    say('Здравствуйте. Я помощник «Живой компании». За пару минут прикину, сколько времени и денег вам может вернуть ИИ, сколько это стоит и когда окупится. Если не окупится, так и скажу.');
    ask();
  }

  start();
})();
