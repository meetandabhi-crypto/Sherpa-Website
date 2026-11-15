// Set this to your form service URL (for example a Formspree endpoint).
// While it is empty, the form shows a "not connected" message instead of sending.
const FORM_ENDPOINT = '';

// ---------- Reveal on scroll ----------
const revealEls = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}

// ---------- Pricing tabs (pricing page) ----------
const tabs = Array.from(document.querySelectorAll('.tab'));
const panels = Array.from(document.querySelectorAll('.panel'));

function selectTab(tab, focus) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  panels.forEach((p) => { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
  if (focus) tab.focus();
}

tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', (e) => {
    const move = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (move) {
      e.preventDefault();
      selectTab(tabs[(i + move + tabs.length) % tabs.length], true);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      selectTab(e.key === 'Home' ? tabs[0] : tabs[tabs.length - 1], true);
    }
  });
});

// pricing.html#psychology opens the Psychology tab
function tabFromHash() {
  const tab = document.getElementById('tab-' + location.hash.slice(1));
  if (tab) selectTab(tab);
}
if (tabs.length) {
  tabFromHash();
  window.addEventListener('hashchange', tabFromHash);
}

// ---------- Form (home page) ----------
const form = document.getElementById('fitForm');
if (form) {
  const statusEl = document.getElementById('formStatus');
  const subjectSelect = document.getElementById('subject');

  // index.html?subject=English#book pre-fills the subject
  const wanted = new URLSearchParams(location.search).get('subject');
  if (wanted) {
    const match = Array.from(subjectSelect.options).find((o) => o.value === wanted);
    if (match) subjectSelect.value = match.value;
  }

  function setStatus(msg, kind) {
    statusEl.textContent = msg;
    statusEl.className = 'form-status' + (kind ? ' is-' + kind : '');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fields = Array.from(form.elements).filter((f) => f.name);
    let firstBad = null;
    fields.forEach((f) => {
      const bad = !f.checkValidity();
      f.setAttribute('aria-invalid', String(bad));
      if (bad && !firstBad) firstBad = f;
    });
    if (firstBad) {
      setStatus('Check the highlighted fields and try again.', 'error');
      firstBad.focus();
      return;
    }

    if (!FORM_ENDPOINT) {
      setStatus('This form is not connected yet. Add your form endpoint in js/main.js.', 'error');
      return;
    }

    setStatus('Sending…');
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus('Thanks. We will confirm your time by SMS and email.', 'ok');
    } catch (err) {
      setStatus('Something went wrong and your details were not sent. Please try again.', 'error');
    }
  });
}

// ---------- Announcement bar ----------
const noticeClose = document.getElementById('noticeClose');
if (noticeClose) {
  noticeClose.addEventListener('click', () => {
    document.documentElement.classList.add('no-notice');
    try { sessionStorage.setItem('noNotice', '1'); } catch (e) { /* storage unavailable */ }
  });
}

// ---------- Start-free options pre-fill the form ----------
const startSelect = document.getElementById('startWith');
if (startSelect) {
  document.querySelectorAll('[data-start]').forEach((el) => {
    el.addEventListener('click', () => { startSelect.value = el.dataset.start; });
  });
  const startParam = new URLSearchParams(location.search).get('start');
  const startMatch = Array.from(startSelect.options).find((o) => o.value === startParam);
  if (startMatch) startSelect.value = startMatch.value;
}

// ---------- Hero hook: subject rotator, score count-up, pointer parallax ----------
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const rotator = document.getElementById('rotator');
if (rotator && !reduceMotion) {
  const items = Array.from(rotator.querySelectorAll('.rot-item'));
  let current = 0;
  setInterval(() => {
    const prev = items[current];
    current = (current + 1) % items.length;
    prev.classList.remove('is-on');
    prev.classList.add('is-off');
    items[current].classList.remove('is-off');
    items[current].classList.add('is-on');
    // reset the leaving word below the stack once it has faded out
    setTimeout(() => prev.classList.remove('is-off'), 500);
  }, 2200);
}

if (!reduceMotion) {
  document.querySelectorAll('[data-count]').forEach((el, i) => {
    const target = Number(el.dataset.count);
    el.textContent = '0';
    const delay = 1300 + i * 160;
    const duration = 1300;
    setTimeout(() => {
      const start = performance.now();
      (function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(tick);
      })(start);
    }, delay);
  });

  const frame = document.querySelector('.hero-frame');
  const sketch = document.querySelector('.hero-bg.sketch');
  if (frame && sketch && window.matchMedia('(pointer: fine)').matches) {
    let raf = 0;
    frame.addEventListener('pointermove', (e) => {
      const r = frame.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        sketch.style.setProperty('--px', px.toFixed(3));
        sketch.style.setProperty('--py', py.toFixed(3));
      });
    });
    frame.addEventListener('pointerleave', () => {
      sketch.style.setProperty('--px', 0);
      sketch.style.setProperty('--py', 0);
    });
  }
}

// ---------- Fit the hero illustration to wide and narrow frames ----------
const heroSketch = document.querySelector('.hero-bg.sketch');
if (heroSketch) {
  const fitSketch = () => {
    const box = heroSketch.getBoundingClientRect();
    const narrow = box.width / box.height < 1.05;
    heroSketch.setAttribute('viewBox', narrow ? heroSketch.dataset.narrow : heroSketch.dataset.wide);
  };
  fitSketch();
  window.addEventListener('resize', fitSketch);
}
