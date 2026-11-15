/* Sherpa Education · interactions */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - t, 3);

  $('#yr').textContent = new Date().getFullYear();

  /* ---------- nav ---------- */
  const nav = $('#nav'), toggle = $('#navToggle');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); document.body.style.overflow = '';
  }));

  /* keep the summit in frame on narrow screens */
  const range = $('#heroRange');
  const frame = () => range.setAttribute('preserveAspectRatio', innerWidth < 760 ? 'xMaxYMax slice' : 'xMidYMax slice');
  frame(); addEventListener('resize', frame);

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- counters ---------- */
  const countIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, to = +el.dataset.count, dec = +el.dataset.dec, dur = 1800, t0 = performance.now();
    const tick = now => {
      const p = reduce ? 1 : clamp((now - t0) / dur);
      el.textContent = (to * ease(p)).toFixed(dec);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick); countIO.unobserve(el);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- hero: faceted (low-poly) mountain ----------
     The ridge is subdivided, each column split into rows of jittered points, and every quad
     becomes two triangles, shaded by which way they face and snow-capped near the top. */
  const facets = $('#facets'), flags = $('#flags');
  const items = [];
  if (facets) {
    const BASE = 620, ROWS = 6, MAXW = 70;
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const ridge0 = facets.dataset.ridge.split(' ').map(p => p.split(',').map(Number));
    const ridge = [];
    for (let i = 0; i < ridge0.length - 1; i++) {
      const [x0, y0] = ridge0[i], [x1, y1] = ridge0[i + 1], n = Math.max(1, Math.ceil((x1 - x0) / MAXW));
      for (let k = 0; k < n; k++) ridge.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]);
    }
    ridge.push(ridge0[ridge0.length - 1]);
    const cols = ridge.map(([x, y], i) => {
      const w = ((ridge[i + 1] || ridge[i])[0] - (ridge[i - 1] || ridge[i])[0]) / 2;
      return Array.from({ length: ROWS + 1 }, (_, r) => {
        const t = r / ROWS, edge = r === 0 || r === ROWS || i === 0 || i === ridge.length - 1;
        return [x + (edge ? 0 : (rnd() - .5) * w * .7), y + (BASE - y) * t + (edge ? 0 : (rnd() - .5) * 14)];
      });
    });
    const peakX = 1040, peakY = 100;
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const dark = [36, 38, 76], light = [84, 92, 146], snowHi = [238, 236, 232], snowLo = [160, 164, 186]; // tones for a navy hero
    const frag = document.createDocumentFragment();
    for (let i = 0; i < cols.length - 1; i++) for (let r = 0; r < ROWS; r++) {
      const A = cols[i][r], B = cols[i + 1][r], C = cols[i + 1][r + 1], D = cols[i][r + 1];
      ((i + r) % 2 ? [[A, B, C], [A, C, D]] : [[A, B, D], [B, C, D]]).forEach(t => {
        const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
        const lum = clamp((cx < peakX ? .62 : .22) + (rnd() - .5) * .32 + (1 - cy / BASE) * .18);
        const snow = cy < 205 - Math.abs(cx - peakX) * .25;
        const rgb = snow ? mix(snowLo, snowHi, lum) : mix(dark, light, lum * .75);
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        p.setAttribute('d', `M${t.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L')}Z`);
        p.setAttribute('fill', `rgb(${rgb})`); p.setAttribute('stroke', `rgb(${rgb})`); p.setAttribute('stroke-width', '.6');
        p.setAttribute('class', 'facet');
        frag.appendChild(p);
        const h = clamp((BASE - cy) / (BASE - peakY));
        items.push({ p, cx, cy, h, band: Math.min(8, Math.floor(Math.pow(h, .8) * 9)), dist: Math.hypot(cx - peakX, cy - peakY), r1: rnd(), r2: rnd(), r3: rnd() });
      });
    }
    facets.appendChild(frag);
  }

  /* Simple rise: each range glides up and fades in, back to front, then the flag goes up. */
  const layHero = () => {
    if (reduce || !document.body.animate) { flags.classList.add('is-up'); return; }
    const ease = 'cubic-bezier(.22,.61,.36,1)';
    // fade each range to its own resting opacity (the back ranges are deliberately faint)
    [$('.layer--far path'), $('.layer--mid path'), facets].forEach((el, i) => {
      const rest = getComputedStyle(el).opacity;
      el.animate([{ transform: 'translateY(60px)', opacity: 0 }, { transform: 'none', opacity: rest }],
        { duration: 1200, delay: 150 + i * 150, easing: ease, fill: 'backwards' });
    });
    setTimeout(() => flags.classList.add('is-up'), 1850);
  };

  /* ---------- opening sequence ---------- */
  const root = document.documentElement, intro = $('#intro');
  const startHero = () => { root.classList.add('ready'); layHero(); };
  if (root.classList.contains('intro-on') && intro) {
    const word = $('#introWord');
    word.innerHTML = [...word.textContent].map((c, i) => `<span style="--d:${i * 35}ms">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    let done = false;
    const exit = () => {
      if (done) return; done = true;
      const mark = $('#introMark'), target = $('.nav .brand__mark');
      const a = mark.getBoundingClientRect(), b = target.getBoundingClientRect();
      // the logo flies up into the nav while the night panel sinks away
      const fly = mark.cloneNode(true); fly.classList.add('intro__fly');
      Object.assign(fly.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
      document.body.appendChild(fly); mark.style.visibility = 'hidden';
      fly.animate([{ transform: 'none', color: '#F4F1EA' },
        { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width})`, color: '#F4F1EA' }],
        { duration: 1000, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' })
        .onfinish = () => { root.classList.add('mark-landed'); fly.remove(); };
      intro.classList.add('is-out');
      setTimeout(startHero, 450);
      setTimeout(() => intro.remove(), 1500);
    };
    setTimeout(exit, 2300);
    intro.addEventListener('click', exit);
    setTimeout(() => { if (!done) exit(); }, 4000);   // never leave anyone stuck behind it
  } else {
    root.classList.add('ready', 'mark-landed');
    layHero();
  }

  /* ---------- scroll-linked: parallax, route ink ---------- */
  const layers = $$('.hero__range .layer');
  const ink = $('#ascentInk'), ascent = $('#ascent');
  const inkLen = ink ? ink.getTotalLength() : 0;
  if (ink) { ink.style.strokeDasharray = inkLen; ink.style.strokeDashoffset = inkLen; }
  let ticking = false;

  const onScroll = () => {
    const y = scrollY, vh = innerHeight;
    nav.classList.toggle('is-scrolled', y > 20);

    if (!reduce) layers.forEach(l => { l.style.transform = `translateY(${y * +l.dataset.depth * .35}px)`; });

    if (ink) {
      const r = ascent.getBoundingClientRect();
      const p = clamp((vh * .6 - r.top) / r.height);
      ink.style.strokeDashoffset = inkLen * (1 - p);
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- magnetic buttons ---------- */
  if (!reduce && matchMedia('(hover: hover)').matches) {
    $$('.magnetic').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .18}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- testimonials: flags hung on a sagging rope ---------- */
  const rail = $('#voicesRail'), ropeSvg = $('#voicesRope');
  const cards = $$('.flagcard', rail);
  cards.forEach((c, i) => c.style.setProperty('--i', i));
  // The rope sags in long arcs (like prayer flags strung between poles);
  // each flag hangs at the rope's height where its centre sits.
  const drawRope = () => {
    cards.forEach(c => { c.style.top = '0px'; });
    const W = rail.scrollWidth, base = 14, A = innerWidth < 760 ? 22 : 44;
    const P = (cards[0].offsetWidth + 34) * 3;          // one arc every three flags
    const x0 = cards[0].offsetLeft - 60;
    const f = x => base + A * Math.sin(Math.PI * clamp(((x - x0) % P + P) % P / P));
    const cardBase = cards[0].offsetTop;
    ropeSvg.setAttribute('width', W); ropeSvg.style.width = W + 'px';
    ropeSvg.setAttribute('height', 120); ropeSvg.style.height = '120px';
    let d = `M0 ${f(0).toFixed(1)}`;
    for (let x = 12; x <= W; x += 12) d += ` L${x} ${f(x).toFixed(1)}`;
    let pegs = '';
    cards.forEach(c => {
      const cx = c.offsetLeft + c.offsetWidth / 2, y = f(cx);
      c.style.top = (y - cardBase + 4) + 'px';
      const slope = clamp(Math.atan2(f(cx + 1) - f(cx - 1), 2) * 180 / Math.PI, -3, 3);
      c.style.setProperty('--tilt', slope.toFixed(2) + 'deg');
      [c.offsetLeft + 28, c.offsetLeft + c.offsetWidth - 28].forEach(px => {
        pegs += `<rect class="peg" x="${px - 4}" y="${(f(px) - 9).toFixed(1)}" width="8" height="18" rx="2"/>`;
      });
    });
    ropeSvg.innerHTML = `<path class="rope-line" d="${d}"/>${pegs}`;
  };
  drawRope(); addEventListener('resize', drawRope);
  if (document.fonts) document.fonts.ready.then(drawRope);
  const gapPx = () => parseFloat(getComputedStyle(rail).columnGap) || 34;
  const atEnd = () => rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8;
  const stepBy = dir => {
    if (dir > 0 && atEnd()) { rail.scrollTo({ left: 0, behavior: 'smooth' }); return; }   // loop back to the first card
    rail.scrollBy({ left: dir * (cards[0].offsetWidth + gapPx()), behavior: 'smooth' });
  };
  $('#vPrev').addEventListener('click', () => { stepBy(-1); restartAuto(); });
  $('#vNext').addEventListener('click', () => { stepBy(1); restartAuto(); });
  let down = false, sx = 0, sl = 0;
  rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('is-drag'); });
  addEventListener('pointerup', () => { down = false; rail.classList.remove('is-drag'); });
  rail.addEventListener('pointermove', e => { if (down) rail.scrollLeft = sl - (e.clientX - sx); });

  // autoplay: move to the next card every few seconds; pause while someone is reading or interacting
  const AUTO_MS = 4000;
  let autoTimer = null, paused = false, onScreen = false;
  const tick = () => { if (!paused && onScreen && !document.hidden) stepBy(1); };
  function restartAuto() { clearInterval(autoTimer); if (!reduce) autoTimer = setInterval(tick, AUTO_MS); }
  ['mouseenter', 'focusin', 'touchstart'].forEach(ev => rail.addEventListener(ev, () => { paused = true; }, { passive: true }));
  ['mouseleave', 'focusout'].forEach(ev => rail.addEventListener(ev, () => { paused = false; restartAuto(); }));
  rail.addEventListener('touchend', () => { setTimeout(() => { paused = false; restartAuto(); }, 2500); }, { passive: true });
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: .3 }).observe(rail);
  restartAuto();

  /* ---------- chat: messages arrive one by one, with a typing indicator ---------- */
  const chat = $('#chat');
  if (chat && !reduce) {
    const msgs = $$('.msg', chat), typing = $('#typing');
    chat.classList.add('is-playing');
    const chatIO = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      chatIO.disconnect();
      let t = 300;
      msgs.forEach((m, i) => {
        const them = m.classList.contains('msg--them'), firstOfRun = them && !(msgs[i - 1] || {}).classList?.contains('msg--them');
        if (firstOfRun) {
          setTimeout(() => { m.before(typing); typing.classList.add('is-on'); }, t);
          t += 1300;
        }
        setTimeout(() => { if (them) typing.classList.remove('is-on'); m.classList.add('is-shown'); }, t);
        t += them ? 1100 : 750;
      });
    }, { threshold: .45 });
    chatIO.observe(chat);
  }

  /* ---------- FAQ: one open at a time, smooth height ---------- */
  $$('.faq__list details').forEach(d => {
    const body = d.querySelector('div');
    d.querySelector('summary').addEventListener('click', e => {
      e.preventDefault();
      if (d.open) {
        body.animate([{ height: body.scrollHeight + 'px' }, { height: '0px' }], { duration: reduce ? 0 : 350, easing: 'ease' }).onfinish = () => d.open = false;
      } else {
        $$('.faq__list details[open]').forEach(o => o.open = false);
        d.open = true;
        body.animate([{ height: '0px' }, { height: body.scrollHeight + 'px' }], { duration: reduce ? 0 : 400, easing: 'cubic-bezier(.2,.7,.1,1)' });
      }
    });
  });

  /* ---------- summit starfield ---------- */
  const cv = $('#stars');
  if (cv) {
    const ctx = cv.getContext('2d');
    let stars = [], w, h, running = false;
    const size = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = cv.offsetWidth; h = cv.offsetHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round(w * h / 5000) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 + .2, p: Math.random() * 6.28, s: Math.random() * .02 + .005 }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      stars.forEach(s => {
        s.p += s.s;
        ctx.globalAlpha = .25 + Math.sin(s.p) * .25 + .25;
        ctx.fillStyle = '#F4F1EA'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill();
      });
      if (running && !reduce) requestAnimationFrame(draw);
    };
    size(); draw(); addEventListener('resize', size);
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) draw(); }).observe(cv);
  }

  /* ---------- enquiry form (placeholder: not connected yet) ----------
     To go live, point this at Formspree, Netlify Forms, or your own endpoint, e.g.
     fetch('https://formspree.io/f/XXXX', { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
  */
  const form = $('#enquiryForm'), note = $('#formNote');
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach(i => {
      const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value));
      i.classList.toggle('is-error', bad); if (bad) ok = false;
    });
    if (!ok) { note.textContent = 'Please add a name and a valid email so we can reach you.'; return; }
    note.textContent = '▲ Thanks! You\'re roped in. We\'ll be in touch shortly. (Demo form: nothing was sent.)';
    form.reset();
  });
})();
