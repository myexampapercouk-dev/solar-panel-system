const $ = id => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduce) document.querySelectorAll('.solar-scene animateMotion, .solar-scene animateTransform').forEach(el => el.remove());
const rupees = n => '₹' + Math.round(n).toLocaleString('en-IN');

/* ---- savings calculator (index only) ---- */
if ($('bill')) {
  let shown = 28800, raf;
  function tween(to) {
    cancelAnimationFrame(raf);
    if (reduce) { shown = to; $('save').textContent = rupees(to); return; }
    const from = shown, t0 = performance.now();
    const step = t => {
      const p = Math.min(1, (t - t0) / 450), e = 1 - Math.pow(1 - p, 3);
      shown = from + (to - from) * e;
      $('save').textContent = rupees(shown);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function updateCalc() {
    const bill = +$('bill').value;
    $('billOut').textContent = rupees(bill);
    tween(bill * 12 * 0.8);
    $('kw').textContent = Math.max(1, Math.round(bill / 500) / 2) + ' kW';
  }
  $('bill').addEventListener('input', updateCalc);
  updateCalc();
}

/* ---- animated counters + generic scroll reveal (every page) ---- */
function count(el) {
  if (reduce) return;
  const to = +el.dataset.to, suf = el.dataset.suf || '', dec = 'dec' in el.dataset, t0 = performance.now();
  const step = t => {
    const p = Math.min(1, (t - t0) / 1400), v = to * (1 - Math.pow(1 - p, 3));
    el.textContent = (dec ? v.toFixed(1) : Math.round(v).toLocaleString('en-US')) + suf;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return;
  en.target.classList.add('in');
  en.target.querySelectorAll('[data-to]').forEach(count);
  io.unobserve(en.target);
}), { threshold: .25 });
document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

/* ---- sticky header on scroll (every page) ---- */
const header = $('site-header');
if (header) {
  function onScroll(){ header.classList.toggle('is-scrolled', window.scrollY > 30); }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---- mobile menu particles (every page) ---- */
if ($('menu-particles')) (function(){
  const field = $('menu-particles');
  const count = 26;
  let html = '';
  for (let i = 0; i < count; i++){
    const size = (Math.random() * 2.4 + 1.4).toFixed(1);
    const left = (Math.random() * 100).toFixed(1);
    const top = (Math.random() * 100).toFixed(1);
    const dx = (Math.random() * 20 - 10).toFixed(1);
    const dy = (Math.random() * -24 - 6).toFixed(1);
    const driftDur = (Math.random() * 6 + 5).toFixed(1);
    const twinkleDur = (Math.random() * 3 + 2).toFixed(1);
    const delay = (Math.random() * 5).toFixed(1);
    const opacity = (Math.random() * 0.4 + 0.35).toFixed(2);
    html += `<span style="left:${left}%;top:${top}%;width:${size}px;height:${size}px;--dx:${dx}px;--dy:${dy}px;opacity:${opacity};animation-duration:${driftDur}s,${twinkleDur}s;animation-delay:${delay}s,${delay}s"></span>`;
  }
  field.innerHTML = html;
})();

/* ---- mobile menu (every page) ---- */
const menuToggle = $('menu-toggle'), menuClose = $('menu-close'), menuBackdrop = $('menu-backdrop'), mobileMenu = $('mobile-menu');
if (menuToggle && mobileMenu) {
  function setMenu(open){
    mobileMenu.classList.toggle('open', open);
    menuBackdrop.classList.toggle('open', open);
    mobileMenu.setAttribute('aria-hidden', !open);
    menuToggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }
  menuToggle.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));
  menuClose.addEventListener('click', () => setMenu(false));
  menuBackdrop.addEventListener('click', () => setMenu(false));
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
}

/* ---- quote / contact form -> WhatsApp handoff (any page with #quote-form) ---- */
if ($('quote-form')) $('quote-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;

  // email the submission to the owner's Gmail (Netlify Function) before the WhatsApp handoff
  $('msg').textContent = 'Sending...';
  const payload = new URLSearchParams(new FormData(f));
  payload.set('page', location.pathname);
  try {
    await fetch('/.netlify/functions/send-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString()
    });
  } catch (err) {}
  const name = f.name.value.trim();
  const phone = f.phone.value.trim();
  const email = f.email.value.trim();
  const bill = f.bill ? f.bill.value.trim() : '';
  const msg = f.message ? f.message.value.trim() : '';
  const type = f.type ? f.type.value : '';

  const lines = [
    'New quote request from website:',
    `Name: ${name}`,
    `Phone: ${phone}`,
    email ? `Email: ${email}` : null,
    bill ? `Average monthly bill: ₹${bill}` : null,
    type ? `Property type: ${type}` : null,
    msg ? `Message: ${msg}` : null
  ].filter(Boolean);

  const waNumber = '917417049145'; // 91 = India country code + 7417049145
  const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(lines.join('\n'))}`;

  $('msg').textContent = 'Thanks! Redirecting you to WhatsApp to send your details...';
  f.reset();
  window.location.href = waUrl;
});

/* ---- gallery filter + lightbox (gallery page only) ---- */
if ($('gallery-grid')) (function(){
  const grid = $('gallery-grid');
  const btns = document.querySelectorAll('.filter-btn');
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    const f = b.dataset.filter;
    grid.querySelectorAll('.tile').forEach(t => {
      t.classList.toggle('hidden', f !== 'all' && t.dataset.cat !== f);
    });
  }));
  const box = $('lightbox'), boxInner = $('lightbox-body'), boxCap = $('lightbox-title');
  if (box) {
    grid.querySelectorAll('.tile').forEach(t => t.addEventListener('click', () => {
      boxInner.innerHTML = t.querySelector('svg').outerHTML;
      boxCap.textContent = t.querySelector('figcaption').textContent;
      box.classList.add('open');
    }));
    $('lightbox-close').addEventListener('click', () => box.classList.remove('open'));
    box.addEventListener('click', e => { if (e.target === box) box.classList.remove('open'); });
    addEventListener('keydown', e => { if (e.key === 'Escape') box.classList.remove('open'); });
  }
})();

/* ---- AI chat assistant (every page) ---- */
if ($('ai-toggle')) (function(){
  const toggle = $('ai-toggle'), panel = $('ai-panel'), close = $('ai-close');
  const form = $('ai-form'), input = $('ai-input'), body = $('ai-body');

  function setOpen(open){
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    if (open) setTimeout(() => input.focus(), 150);
  }
  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  close.addEventListener('click', () => setOpen(false));

  function addMsg(text, who){
    const p = document.createElement('p');
    p.className = 'ai-msg ' + who;
    p.textContent = text;
    body.appendChild(p);
    body.scrollTop = body.scrollHeight;
  }

  function reply(text){
    const t = text.toLowerCase();
    if (/price|cost|quote|how much/.test(t))
      return "Cost depends on your monthly bill and roof size. Try the calculator on the homepage, or submit the 'Get a free quote' form and we'll send an exact number within a day.";
    if (/warrant/.test(t))
      return "Panels carry a 25-year performance warranty, and our installation work is covered for 5 years.";
    if (/sav|bill/.test(t))
      return "Most homes cut their electricity bill by up to 80%. Use the slider in the homepage 'savings' section to estimate yours.";
    if (/install|process|how long|time|step/.test(t))
      return "Installation follows 4 steps: site survey, custom design, permits & installation, then ongoing monitoring. Most homes are live within a few weeks.";
    if (/whatsapp|call|human|talk|contact|person/.test(t))
      return "Sure — tap the green WhatsApp button just below this chat and our team will pick it up right away.";
    return "Thanks for asking! For a precise answer, fill in the free quote form or message us on WhatsApp — tap the green button below.";
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const val = input.value.trim();
    if (!val) return;
    addMsg(val, 'user');
    input.value = '';
    setTimeout(() => addMsg(reply(val), 'bot'), 450);
  });
})();
