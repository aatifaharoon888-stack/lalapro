// FINESSE — shared JS (theme, loader, reveal, datetime, accessibility, chatbot, FABs)

const F = {
  api: '../backend',
  $: (s, r=document) => r.querySelector(s),
  $$: (s, r=document) => [...r.querySelectorAll(s)],
};
window.F = F;

/* ---------- Theme ---------- */
const initTheme = () => {
  const saved = localStorage.getItem('finesse-theme');
  if (saved === 'dark') document.documentElement.classList.add('dark');
};
const toggleTheme = () => {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('finesse-theme', dark ? 'dark' : 'light');
};
window.toggleTheme = toggleTheme;
initTheme();

/* ---------- Loader ---------- */
window.addEventListener('load', () => {
  setTimeout(() => F.$('.loader')?.classList.add('hide'), 500);
});

/* ---------- Reveal on scroll ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
document.addEventListener('DOMContentLoaded', () => {
  F.$$('.reveal').forEach(el => io.observe(el));
});

/* ---------- DateTime widget ---------- */
const tickDT = () => {
  const el = F.$('#dt-widget');
  if (!el) return;
  const d = new Date();
  el.innerHTML = `<b>${d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</b> · ${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
};
setInterval(tickDT, 1000); document.addEventListener('DOMContentLoaded', tickDT);

/* ---------- Accessibility toolbar ---------- */
window.a11y = {
  contrast() { document.documentElement.classList.toggle('contrast'); },
  bigger() { document.documentElement.style.fontSize = (parseFloat(getComputedStyle(document.documentElement).fontSize) + 2) + 'px'; },
  smaller() { document.documentElement.style.fontSize = (parseFloat(getComputedStyle(document.documentElement).fontSize) - 2) + 'px'; },
  speak() {
    if (!('speechSynthesis' in window)) return alert('TTS not supported');
    const text = document.body.innerText.slice(0, 1500);
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  },
  stop() { speechSynthesis?.cancel(); }
};

/* ---------- Chatbot ---------- */
window.chat = {
  toggle() { F.$('.chat-window').classList.toggle('open'); },
  send(e) {
    e?.preventDefault();
    const inp = F.$('#chat-input');
    const msg = inp.value.trim(); if (!msg) return;
    const body = F.$('.chat-body');
    body.insertAdjacentHTML('beforeend', `<div class="bubble me">${msg}</div>`);
    inp.value = '';
    const reply = chat.reply(msg);
    setTimeout(() => {
      body.insertAdjacentHTML('beforeend', `<div class="bubble bot">${reply}</div>`);
      body.scrollTop = body.scrollHeight;
    }, 600);
    body.scrollTop = body.scrollHeight;
  },
  reply(m) {
    const t = m.toLowerCase();
    if (t.includes('hi') || t.includes('hello')) return "Hello darling — looking to plan a look today?";
    if (t.includes('weather') || t.includes('rain') || t.includes('cold') || t.includes('hot'))
      return "Tell me your weather and I'll suggest the perfect outfit. Try the Planner ☂️";
    if (t.includes('outfit') || t.includes('suggest') || t.includes('recommend'))
      return "Open Diva Studio — drag pieces from your closet to compose a signature look.";
    if (t.includes('upload') || t.includes('add')) return "Head to Closet → click 'Add Item' to upload a piece with category & color.";
    if (t.includes('thanks') || t.includes('thank')) return "Always a pleasure. Stay finessed. ✨";
    return "I'm Finesse — your AI stylist. Ask me about outfits, weather looks, or your wardrobe.";
  }
};

/* ---------- Smooth page-up / down ---------- */
window.scrollUp = () => window.scrollTo({ top: 0, behavior: 'smooth' });
window.scrollDown = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

/* ---------- Helpers ---------- */
F.toast = (msg, type='ok') => {
  let el = F.$('#__toast');
  if (!el) { el = document.createElement('div'); el.id='__toast';
    el.style.cssText = 'position:fixed;bottom:6.5rem;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#f7f3ec;padding:.8rem 1.4rem;border-radius:999px;z-index:300;font-size:.85rem;letter-spacing:.1em;box-shadow:0 14px 30px -10px rgba(0,0,0,.4);transition:opacity .3s;';
    document.body.appendChild(el);
  }
  el.style.background = type === 'err' ? '#7a1f1f' : '#1a1a1a';
  el.textContent = msg; el.style.opacity = '1';
  clearTimeout(F._tt); F._tt = setTimeout(()=> el.style.opacity='0', 2400);
};

F.post = async (url, data) => {
  const fd = data instanceof FormData ? data : new FormData();
  if (!(data instanceof FormData)) Object.entries(data || {}).forEach(([k,v]) => fd.append(k,v));
  const r = await fetch(url, { method:'POST', body: fd, credentials:'same-origin' });
  return r.json();
};
F.get = async (url) => (await fetch(url, { credentials:'same-origin' })).json();

/* ---------- Renders chunks of UI shared across app pages ---------- */
F.renderChrome = (active='dashboard') => {
  const items = [
    ['dashboard','Dashboard','◇'],
    ['closet','Closet','❖'],
    ['diva','Diva Studio','✦'],
    ['planner','Planner','▣'],
  ];
  return `
  <aside class="sidebar">
    <div class="logo">FINE<span>SSE</span></div>
    <nav>
      ${items.map(([slug,label,ic]) => `<a href="${slug}.html" class="${slug===active?'active':''}"><span>${ic}</span> ${label}</a>`).join('')}
    </nav>
    <div class="foot">
      <button class="btn btn-ghost" style="width:100%;justify-content:center" onclick="toggleTheme()">◐ Theme</button>
      <a class="btn btn-ghost" style="width:100%;justify-content:center;margin-top:.5rem" href="${F.api}/auth.php?action=logout">Sign out</a>
    </div>
  </aside>`;
};

F.renderFloating = () => `
<button class="wa-fab" title="WhatsApp" onclick="window.open('https://wa.me/000000000','_blank')">
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.15 1.6 5.96L2 22l4.25-1.11a9.93 9.93 0 0 0 5.79 1.84h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02A9.84 9.84 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-2.95.77.79-2.88-.2-.31a8.22 8.22 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23a8.18 8.18 0 0 1 5.83 2.42 8.2 8.2 0 0 1 2.41 5.83c-.01 4.55-3.7 8.08-8.37 8.08z"/></svg>
</button>
<button class="chat-fab" title="Finesse AI" onclick="chat.toggle()">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
</button>
<div class="chat-window">
  <div class="chat-head"><b>Finesse Stylist</b><div style="font-size:.75rem;opacity:.7;letter-spacing:.15em;text-transform:uppercase">AI Assistant</div></div>
  <div class="chat-body">
    <div class="bubble bot">Welcome to Finesse. How can I style you today?</div>
  </div>
  <form class="chat-input" onsubmit="chat.send(event)">
    <input id="chat-input" placeholder="Ask the stylist…" autocomplete="off">
    <button type="submit">Send</button>
  </form>
</div>
<div class="a11y-bar" aria-label="Accessibility toolbar">
  <button title="High contrast" onclick="a11y.contrast()">◑</button>
  <button title="Increase text" onclick="a11y.bigger()">A+</button>
  <button title="Decrease text" onclick="a11y.smaller()">A−</button>
  <button title="Read page" onclick="a11y.speak()">🔊</button>
  <button title="Stop reading" onclick="a11y.stop()">■</button>
</div>`;

document.addEventListener('DOMContentLoaded', () => {
  const slot = F.$('#floating-slot');
  if (slot) slot.innerHTML = F.renderFloating();
});
