/* landing.html 的互動（開場動畫、提示 demo、文法地圖 demo、候補表單）。
   獨立成檔案，CSP 才能只允許網站自己的腳本，不必開放內嵌腳本。 */
  /* ---------- 開場動畫 ----------
     第一、二幕：文字先出現，符號再一個個冒出來。
     第三幕：烏龜從左邊走進來，每經過一個字的位置就留下一個足跡，那個字跟著出現。 */
  (function () {
    const intro = document.getElementById('intro');
    const page = document.querySelectorAll('nav, main, footer');
    let seen = false;
    try { seen = sessionStorage.getItem('mmw-intro-seen') === '1'; } catch {}
    // 已經看過、或是從錨點連結進來（例如 #join），就不播
    if (seen || location.hash) { intro.remove(); return; }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
    // 跟 CSS 的 --spring 同一條：停之前輕晃一下
    const SPRING = getComputedStyle(document.documentElement).getPropertyValue('--spring').trim().startsWith('linear(')
      ? getComputedStyle(document.documentElement).getPropertyValue('--spring').trim()
      : EASE_OUT;
    const BRAKE = 300;   // 烏龜最後 0.3 秒慢慢停下
    const T = {
      line1: 300, shapes1: 1100, out1: 3000,
      line2: 3500, shapes2: 4300, out2: 6200,
      walk: 6700, walkDur: 3900, hold: 1400,
    };
    const stage = document.getElementById('intro-stage');
    const trail = document.getElementById('trail-line');
    const turtle = document.getElementById('intro-turtle');
    const scenes = stage.querySelectorAll('.intro-scene');
    const TEXT = [...'沒關係！慢慢寫在這裡陪你。'];
    const SOFT_FROM = 4; // 「慢慢寫在這裡陪你。」用淺一點的顏色

    page.forEach((el) => { el.inert = true; });
    let done = false;
    let endTimer;

    function enter(el, delay, from = 'translateY(14px)') {
      return el.animate(
        [{ opacity: 0, transform: from, filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
        { duration: 700, delay, easing: EASE_OUT, fill: 'both' }
      );
    }
    function leave(el, delay) {
      return el.animate(
        [{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-10px)', filter: 'blur(6px)' }],
        { duration: 400, delay, easing: EASE_OUT, fill: 'forwards' }
      );
    }

    function build() {
      // 字的大小依舞台寬度決定，一行放得下 13 個字
      const fontSize = Math.min(56, Math.floor(stage.clientWidth / (TEXT.length + 1)));
      trail.style.fontSize = fontSize + 'px';
      TEXT.forEach((ch, i) => {
        const span = document.createElement('span');
        span.textContent = ch;
        span.setAttribute('aria-hidden', 'true');
        if (i >= SOFT_FROM) span.className = 'soft';
        trail.appendChild(span);
      });

      const stageBox = stage.getBoundingClientRect();
      const chars = [...trail.children].map((el) => {
        const r = el.getBoundingClientRect();
        return { el, x: r.left + r.width / 2 - stageBox.left, bottom: r.bottom - stageBox.top };
      });
      const size = Math.max(72, Math.min(120, fontSize * 2.1)); // 烏龜大小
      const svg = turtle.querySelector('svg');
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      // 烏龜走在文字下面一排，不擋到字；足跡留在牠的腳底（腳底在圖的 87% 高度）
      const turtleTop = chars[0].bottom + fontSize * 0.3;
      turtle.style.top = turtleTop + 'px';
      const groundY = turtleTop + size * 0.87;

      const front = size * 0.62;                                // 前腳在圖中的位置
      const startX = -stageBox.left - size;                     // 從畫面左邊外面走進來
      // 走到最後一個字再多一點點，但整隻烏龜要留在畫面內（手機上舞台比較窄）
      const maxX = document.documentElement.clientWidth - stageBox.left - size - 8;
      const endX = Math.min(chars[chars.length - 1].x - front + fontSize * 0.9, maxX);
      // 等速段的速度：總距離＝等速段距離＋減速段距離（減速段平均速度是一半）
      const speed = (endX - startX) / (T.walkDur - BRAKE / 2);
      const brakeX = startX + speed * (T.walkDur - BRAKE);
      return { chars, groundY, size, front, startX, endX, speed, brakeX };
    }

    // 烏龜走到 x 的時間（毫秒，從開始走算起）
    function timeAt(g, x) {
      const d = Math.min(Math.max(x - g.startX, 0), g.endX - g.startX);
      const linearDist = g.brakeX - g.startX;
      if (d <= linearDist) return d / g.speed;
      // 減速段：位置 = brakeX + (speed·BRAKE/2)·(1-(1-u)²)
      const r = Math.min(1, (d - linearDist) / (g.speed * BRAKE / 2));
      return T.walkDur - BRAKE + (1 - Math.sqrt(1 - r)) * BRAKE;
    }

    function play() {
      const g = build();
      if (reduced) {
        // 減少動態效果：不移動，直接顯示最後一句和烏龜
        scenes.forEach((s) => s.remove());
        g.chars.forEach((c) => { c.el.style.opacity = 1; });
        turtle.style.opacity = 1;
        turtle.style.transform = `translateX(${g.endX}px)`;
        endTimer = setTimeout(end, 2600);
        return;
      }

      // 第一、二幕
      [[scenes[0], T.line1, T.shapes1, T.out1], [scenes[1], T.line2, T.shapes2, T.out2]].forEach(([scene, lineAt, shapesAt, outAt]) => {
        const line = scene.querySelector('.intro-line');
        enter(line, lineAt);
        leave(line, outAt);
        scene.querySelectorAll('.shape').forEach((el, i) => {
          // 以底部中央為軸，像從地上冒出來；停之前輕晃一下
          el.style.transformOrigin = '50% 100%';
          el.animate(
            [{ opacity: 0, transform: 'translateY(16px) rotate(-12deg) scale(.9)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
            { duration: 500, delay: shapesAt + i * 140, easing: SPRING, fill: 'both' }
          );
          leave(el, outAt + i * 40);
        });
      });

      // 第三幕：等速走路（持續的移動用 linear），最後 0.3 秒減速停下。
      // 減速段用 1-(1-u)² 的曲線，起始速度剛好等於等速段的速度，接起來不會頓一下。
      turtle.animate(
        [
          { opacity: 0, transform: `translateX(${g.startX}px)` },
          { opacity: 1, offset: 0.06 },
          { opacity: 1, transform: `translateX(${g.brakeX}px)`, offset: (T.walkDur - BRAKE) / T.walkDur, easing: 'cubic-bezier(0.333, 0.667, 0.667, 1)' },
          { opacity: 1, transform: `translateX(${g.endX}px)` },
        ],
        { duration: T.walkDur, delay: T.walk, easing: 'linear', fill: 'both' }
      );
      // 停下時身體往前傾一點，再用彈簧晃回來；轉軸在腳底
      const body = turtle.querySelector('svg');
      body.style.transformOrigin = '50% 87%';
      body.animate(
        [{ transform: 'rotate(0)', easing: EASE_OUT }, { transform: 'rotate(4deg)', offset: 0.25, easing: SPRING }, { transform: 'rotate(0)' }],
        { duration: 650, delay: T.walk + T.walkDur - 120 }
      );
      // 身體不上下晃，只有腳交錯：後腳＋前腳一組、中間的腳一組，輪流抬起往前、落地往後推。
      // 貼地往後推的距離＝這段時間身體前進的距離，腳看起來才是踩在地上，不會滑。
      const STEP = 560;                                         // 一隻腳走完一步的時間
      const speed = g.speed;                                    // 每毫秒前進幾 px（等速段）
      const toUnits = 200 / g.size;                             // px → 圖內座標
      const stride = Math.min(18, Math.max(6, speed * (STEP / 2) * toUnits));
      const legs = [...turtle.querySelectorAll('svg ellipse')].filter((e) => ['50', '88', '124'].includes(e.getAttribute('cx')));
      legs.forEach((leg) => {
        leg.style.transformBox = 'fill-box';
        leg.style.transformOrigin = 'center';
        leg.animate(
          [
            { transform: `translate(${-stride / 2}px, 0)`, easing: 'ease-out' },   // 在後面，準備抬腳
            { transform: 'translate(0, -9px)', offset: 0.25, easing: 'ease-in' },   // 抬起、往前跨
            { transform: `translate(${stride / 2}px, 0)`, offset: 0.5, easing: 'linear' }, // 落地在前面
            { transform: `translate(${-stride / 2}px, 0)` },                        // 踩著地往後推
          ],
          {
            duration: STEP,
            delay: T.walk,
            iterations: T.walkDur / STEP,                       // 跟身體同時停
            iterationStart: leg.getAttribute('cx') === '88' ? 0.5 : 0,          // 中間的腳慢半拍，跟另外兩隻交錯
            fill: 'forwards',
          }
        );
        // 身體停下後，每隻腳從停住的位置收回正下方踩穩（起點取上一段動畫停住的位置）
        leg.animate([{ transform: 'translate(0, 0)' }], { duration: 200, delay: T.walk + T.walkDur, easing: EASE_OUT, fill: 'forwards' });
      });
      g.chars.forEach((c) => {
        // 前腳走到這個字下方的時間
        const at = T.walk + timeAt(g, c.x - g.front);
        const foot = document.createElement('span');
        foot.className = 'footprint';
        foot.style.left = c.x + 'px';
        foot.style.top = (g.groundY - 8) + 'px';
        stage.appendChild(foot);
        foot.style.transformOrigin = '50% 100%';
        c.el.style.transformOrigin = '50% 100%';
        foot.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: 250, delay: at, easing: EASE_OUT, fill: 'both' });
        c.el.animate(
          [{ opacity: 0, transform: 'translateY(10px) scale(.96)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }],
          { duration: 500, delay: at + 60, easing: EASE_OUT, fill: 'both' }
        );
      });

      endTimer = setTimeout(end, T.walk + T.walkDur + T.hold);
    }

    function end() {
      if (done) return;
      done = true;
      clearTimeout(endTimer);
      try { sessionStorage.setItem('mmw-intro-seen', '1'); } catch {}
      page.forEach((el) => { el.inert = false; });
      intro.classList.add('is-out');
      // 主頁跟著淡入、往上 8px，不會在開場消失後突然出現
      if (!reduced) page.forEach((el) => el.animate(
        [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
        { duration: 400, easing: EASE_OUT }
      ));
      document.removeEventListener('keydown', onKey);
      setTimeout(() => intro.remove(), reduced ? 0 : 500);
    }
    function onKey(e) { if (e.key === 'Escape') end(); }
    document.getElementById('intro-skip').addEventListener('click', end);
    document.addEventListener('keydown', onKey);
    // 等字型載入後再量字的位置，避免足跡和字對不上
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(play);
  })();

  /* ---------- 提示階梯 demo：按下按鈕才開始一步一步出現 ---------- */
  (function () {
    const hints = [
      { html: '① 「친구가」的<b>助詞</b>要換一個。' },
      { html: '② 提示：「만나다」見的對象要用<b>受詞助詞</b>。從這兩個選：<span lang="ko">친구를 / 친구에게</span>' },
      { html: '③ 參考答案：<span lang="ko">어제 <span class="fixed">친구를</span> 만났어요.</span> 受詞助詞是中文母語者很常搞混的地方，已加入到複習字卡中。', good: true }
    ];
    let level = -1;
    const box = document.getElementById('demo-feedback');
    const steps = document.querySelectorAll('#steps li');
    const next = document.getElementById('demo-next');
    const reset = document.getElementById('demo-reset');
    const sentence = document.getElementById('demo-sentence');

    const live = document.getElementById('demo-live');
    // 三個提示一開始就放好、先藏起來；只有新出現的那一個播動畫
    const bubbles = hints.map((h) => {
      const div = document.createElement('div');
      div.className = 'bubble waiting' + (h.good ? ' good' : '');
      div.innerHTML = h.html;
      box.appendChild(div);
      return div;
    });

    function render() {
      bubbles.forEach((b, i) => {
        const shown = i <= level;
        b.classList.toggle('waiting', !shown);
        b.classList.toggle('show', shown && i === level);
      });
      live.textContent = level >= 0 ? bubbles[level].textContent : '';
      steps.forEach((li, i) => li.classList.toggle('on', i <= level));
      next.hidden = level >= hints.length - 1;
      next.textContent = level < 0 ? '給我一點提示' : '再給我一點提示';
      reset.hidden = level < 0;
      sentence.innerHTML = level < 0
        ? '어제 친구가 만났어요.'
        : level >= 2
          ? '어제 <span class="fixed">친구를</span> 만났어요.'
          : '어제 <span class="flag">친구가</span> 만났어요.';
    }
    next.addEventListener('click', () => { if (level < hints.length - 1) { level++; render(); } });
    reset.addEventListener('click', () => { level = -1; render(); next.focus(); });
    render();
  })();

  /* ---------- 文法地圖 demo ---------- */
  (function () {
    const items = [
      ['-(으)ㄹ 줄 알다', 'use'], ['-기 때문에', 'use'], ['-(으)ㄴ 적이 있다', 'use'],
      ['-는 동안', 'know'], ['-아/어 보이다', 'know'], ['-게 되다', 'use'],
      ['-(으)ㄹ 테니까', 'seen'], ['-더니', 'seen'], ['-다가', 'know'],
      ['-(으)ㄹ 뿐만 아니라', 'seen'], ['-는 바람에', 'seen'], ['-아/어도', 'use'],
      ['-자마자', 'know'], ['-(으)ㄴ/는 편이다', 'seen'], ['-도록', 'seen']
    ];
    const order = ['seen', 'know', 'use'];
    const names = { seen: '尚未學習', know: '大概知道', use: '自己寫出來且用對' };
    const wrap = document.getElementById('chips');
    const summary = document.getElementById('map-summary');

    function updateSummary() {
      const count = { seen: 0, know: 0, use: 0 };
      wrap.querySelectorAll('.chip').forEach(c => count[c.dataset.state]++);
      summary.textContent = `這 ${items.length} 項文法裡，你自己寫出來且用對 ${count.use} 項、大概知道 ${count.know} 項、尚未學習 ${count.seen} 項。`;
    }
    items.forEach(([text, state]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = text;
      b.dataset.state = state;
      b.setAttribute('aria-label', `${text}：${names[state]}`);
      b.addEventListener('click', () => {
        const s = order[(order.indexOf(b.dataset.state) + 1) % order.length];
        b.dataset.state = s;
        b.setAttribute('aria-label', `${text}：${names[s]}`);
        updateSummary();
      });
      wrap.appendChild(b);
    });
    updateSummary();
  })();

  /* ---------- 等待名單 ---------- */
  // TODO: 連上收集工具（例如 Google Form、Formspree 或之後的 Supabase）後，把網址填在這裡。
  const WAITLIST_ENDPOINT = '';

  const form = document.getElementById('waitlist');
  const otherBox = document.getElementById('other-purpose');
  form.addEventListener('change', (e) => {
    if (e.target.name !== 'purpose') return;
    const isOther = e.target.value === 'other';
    otherBox.hidden = !isOther;
    if (isOther) document.getElementById('wl-other').focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('form-msg');
    const email = form.email.value.trim();
    msg.className = 'form-msg';
    form.email.removeAttribute('aria-invalid');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = '電子信箱格式好像不太對，再確認一下？';
      msg.classList.add('show', 'warn');
      form.email.setAttribute('aria-invalid', 'true');
      form.email.focus();
      return;
    }
    if (!WAITLIST_ENDPOINT) {
      msg.textContent = '等待名單還在準備中，暫時無法送出。謝謝你願意加入！';
      msg.classList.add('show', 'warn');
      return;
    }
    try {
      const res = await fetch(WAITLIST_ENDPOINT, { method: 'POST', body: new FormData(form) });
      if (!res.ok) throw new Error(res.status);
      msg.textContent = '收到了！有新功能時會寫信通知你 ♡';
      msg.classList.add('show', 'ok');
      form.reset();
      otherBox.hidden = true;
    } catch {
      msg.textContent = '送出失敗了，請稍後再試一次。';
      msg.classList.add('show', 'warn');
    }
  });
