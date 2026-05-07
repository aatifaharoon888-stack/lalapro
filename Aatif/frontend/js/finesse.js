// FINESSE — shared JS (theme, loader, reveal, datetime, accessibility, chatbot, FABs)
/**
 * FINESSE — Shared JS
 * (theme · loader · scroll-reveal · datetime · accessibility · chatbot · FABs)
 *
 * CHANGES from v1:
 *  - chat.send() is now async — calls backend/chatbot.php
 *  - Typing indicator ("·· ·") shown while awaiting reply
 *  - Conversation history tracked client-side for UI rendering
 *  - chat.clearHistory() added (resets session on server too)
 *  - All existing helpers (F.$, F.$$, F.post, F.get, F.toast) unchanged
 */

/* ── Core namespace ──────────────────────────────────────────── */
const F = {
  api: '../backend',
  $:  (s, r = document) => r.querySelector(s),
  $$: (s, r = document) => [...r.querySelectorAll(s)],
};
window.F = F;

/* ── Theme ───────────────────────────────────────────────────── */
const initTheme = () => {
  if (localStorage.getItem('finesse-theme') === 'dark')
    document.documentElement.classList.add('dark');
};
const toggleTheme = () => {
  const dark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('finesse-theme', dark ? 'dark' : 'light');
};
window.toggleTheme = toggleTheme;
initTheme();

/* ── Page loader ─────────────────────────────────────────────── */
window.addEventListener('load', () => {
  setTimeout(() => F.$('.loader')?.classList.add('hide'), 500);
});

/* ── Reveal on scroll ────────────────────────────────────────── */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  });
}, { threshold: 0.12 });

document.addEventListener('DOMContentLoaded', () => {
  F.$$('.reveal').forEach(el => io.observe(el));
});

/* ── DateTime widget ─────────────────────────────────────────── */
const tickDT = () => {
  const el = F.$('#dt-widget');
  if (!el) return;
  const d = new Date();
  el.innerHTML =
    `<b>${d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}</b>` +
    ` · ${d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}`;
};
setInterval(tickDT, 1000);
document.addEventListener('DOMContentLoaded', tickDT);

/* ── Accessibility toolbar ───────────────────────────────────── */
window.a11y = {
  contrast() { document.documentElement.classList.toggle('contrast'); },
  bigger()   {
    const cur = parseFloat(getComputedStyle(document.documentElement).fontSize);
    document.documentElement.style.fontSize = (cur + 2) + 'px';
  },
  smaller()  {
    const cur = parseFloat(getComputedStyle(document.documentElement).fontSize);
    document.documentElement.style.fontSize = (cur - 2) + 'px';
  },
  speak()    {
    if (!('speechSynthesis' in window)) return alert('TTS not supported');
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(document.body.innerText.slice(0, 1500)));
  },
  stop()     { speechSynthesis?.cancel(); },
};

/* ═══════════════════════════════════════════════════════════════
   CHATBOT  —  async, AI-powered via backend/chatbot.php
   ═══════════════════════════════════════════════════════════════ */
window.chat = {

  /** Toggle the chat window open / closed */
  toggle() {
    const win = F.$('.chat-window');
    win.classList.toggle('open');
    // Auto-focus the input when opening
    if (win.classList.contains('open')) {
      setTimeout(() => F.$('#chat-input')?.focus(), 80);
    }
  },

  /** Send a message — async, calls backend */
  async send(e) {
    e?.preventDefault();
    const inp  = F.$('#chat-input');
    const msg  = inp.value.trim();
    if (!msg || chat._busy) return;

    const body = F.$('.chat-body');

    // 1. Render user bubble
    body.insertAdjacentHTML('beforeend', `
      <div class="bubble me">${chat._escape(msg)}</div>`);
    inp.value = '';
    chat._scrollBottom(body);

    // 2. Show typing indicator
    chat._busy = true;
    const typingId = `typing-${Date.now()}`;
    body.insertAdjacentHTML('beforeend', `
      <div class="bubble bot typing" id="${typingId}">
        <span class="dots"><span>·</span><span>·</span><span>·</span></span>
      </div>`);
    chat._scrollBottom(body);

    // 3. Inject typing animation CSS once
    chat._injectTypingCSS();

    // 4. Call backend
    try {
      const fd = new FormData();
      fd.append('message', msg);
      const res  = await fetch(F.api + '/chatbot.php', {
        method: 'POST',
        body:    fd,
        credentials: 'same-origin',
      });
      const data = await res.json();

      document.getElementById(typingId)?.remove();

      const reply = data.reply || "I'm here whenever you need styling advice. ✨";
      // Render reply — allow simple line-breaks but escape HTML
      body.insertAdjacentHTML('beforeend', `
        <div class="bubble bot">${chat._escape(reply).replace(/\n/g, '<br>')}</div>`);

    } catch (_err) {
      document.getElementById(typingId)?.remove();
      body.insertAdjacentHTML('beforeend', `
        <div class="bubble bot">Connection issue — please try again in a moment. 🙏</div>`);
    }

    chat._busy = false;
    chat._scrollBottom(body);
  },

  /** Clear conversation history (both UI and server session) */
  async clearHistory() {
    const body = F.$('.chat-body');
    body.innerHTML = `<div class="bubble bot">Conversation cleared. How can I style you today? ✨</div>`;
    // Reset server-side session history
    try {
      const fd = new FormData();
      fd.append('clear', '1');
      await fetch(F.api + '/chatbot.php', { method:'POST', body: fd, credentials:'same-origin' });
    } catch (_) { /* silent */ }
  },

  /* ── private helpers ── */
  _busy: false,

  _scrollBottom(el) {
    el.scrollTop = el.scrollHeight;
  },

  /** Minimal HTML escape to prevent XSS in bubbles */
  _escape(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  /** Inject the typing-dots animation CSS (once) */
  _cssInjected: false,
  _injectTypingCSS() {
    if (chat._cssInjected) return;
    chat._cssInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      .bubble.typing { min-width: 48px; }
      .dots { display: inline-flex; gap: 4px; align-items: center; height: 20px; }
      .dots span {
        display: inline-block; width: 6px; height: 6px;
        border-radius: 50%; background: currentColor; opacity: .4;
        animation: dotBounce 1.2s ease-in-out infinite;
      }
      .dots span:nth-child(2) { animation-delay: .2s; }
      .dots span:nth-child(3) { animation-delay: .4s; }
      @keyframes dotBounce {
        0%, 80%, 100% { transform: translateY(0);   opacity: .4; }
        40%            { transform: translateY(-6px); opacity: 1;  }
      }
    `;
    document.head.appendChild(style);
  },
};

/* ── Smooth page scroll helpers ──────────────────────────────── */
window.scrollUp   = () => window.scrollTo({ top: 0,                        behavior: 'smooth' });
window.scrollDown = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

/* ═══════════════════════════════════════════════════════════════
   HELPERS  — F.toast  F.post  F.get
   ═══════════════════════════════════════════════════════════════ */
F.toast = (msg, type = 'ok') => {
  let el = F.$('#__toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '__toast';
    el.style.cssText = [
      'position:fixed', 'bottom:6.5rem', 'left:50%',
      'transform:translateX(-50%)',
      'background:#1a1a1a', 'color:#f7f3ec',
      'padding:.8rem 1.4rem', 'border-radius:999px',
      'z-index:300', 'font-size:.85rem',
      'letter-spacing:.1em',
      'box-shadow:0 14px 30px -10px rgba(0,0,0,.4)',
      'transition:opacity .3s', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(el);
  }
  el.style.background = type === 'err' ? '#7a1f1f' : '#1a1a1a';
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(F._tt);
  F._tt = setTimeout(() => el.style.opacity = '0', 2400);
};

F.post = async (url, data) => {
  const fd = data instanceof FormData ? data : new FormData();
  if (!(data instanceof FormData)) {
    Object.entries(data || {}).forEach(([k, v]) => fd.append(k, v));
  }
  const r = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
  return r.json();
};

F.get = async (url) => (await fetch(url, { credentials: 'same-origin' })).json();

/* ═══════════════════════════════════════════════════════════════
   CHROME RENDERER  — sidebar + floating elements
   ═══════════════════════════════════════════════════════════════ */
F.renderChrome = (active = 'dashboard') => {
  const items = [
    ['dashboard', 'Dashboard',  '◇'],
    ['closet',    'Closet',     '❖'],
    ['diva',      'Diva Studio','✦'],
    ['planner',   'Planner',    '▣'],
  ];
  return `
  <aside class="sidebar">
    <div class="logo">FINE<span>SSE</span></div>
    <nav>
      ${items.map(([slug, label, ic]) =>
        `<a href="${slug}.html" class="${slug === active ? 'active' : ''}">
          <span>${ic}</span> ${label}
        </a>`
      ).join('')}
    </nav>
    <div class="foot">
      <button class="btn btn-ghost" style="width:100%;justify-content:center"
              onclick="toggleTheme()">◐ Theme</button>
      <a class="btn btn-ghost"
         style="width:100%;justify-content:center;margin-top:.5rem"
         href="${F.api}/auth.php?action=logout">Sign out</a>
    </div>
  </aside>`;
};

F.renderFloating = () => `
<button class="wa-fab" title="WhatsApp"
        onclick="window.open('https://wa.me/000000000','_blank')">
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.15 1.6 5.96L2 22l4.25-1.11a9.93 9.93 0 0 0 5.79 1.84h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02A9.84 9.84 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-2.95.77.79-2.88-.2-.31a8.22 8.22 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23a8.18 8.18 0 0 1 5.83 2.42 8.2 8.2 0 0 1 2.41 5.83c-.01 4.55-3.7 8.08-8.37 8.08z"/>
  </svg>
</button>

<button class="chat-fab" title="Finesse AI Stylist" onclick="chat.toggle()">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
</button>

<div class="chat-window">
  <div class="chat-head">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <b>Finesse Stylist</b>
        <div style="font-size:.72rem;opacity:.7;letter-spacing:.15em;text-transform:uppercase;margin-top:2px">
          AI Assistant · Powered by Claude
        </div>
      </div>
      <button onclick="chat.clearHistory()"
              title="Clear conversation"
              style="opacity:.5;font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;
                     color:inherit;padding:.25rem .5rem;border-radius:6px;
                     border:1px solid rgba(255,255,255,.2);">
        Clear
      </button>
    </div>
  </div>
  <div class="chat-body">
    <div class="bubble bot">Welcome to Finesse ✨ How can I style you today?</div>
  </div>
  <form class="chat-input" onsubmit="chat.send(event)">
    <input id="chat-input"
           placeholder="Ask your stylist…"
           autocomplete="off"
           maxlength="500">
    <button type="submit">Send</button>
  </form>
</div>

<div class="a11y-bar" aria-label="Accessibility toolbar">
  <button title="High contrast"  onclick="a11y.contrast()">◑</button>
  <button title="Increase text"  onclick="a11y.bigger()">A+</button>
  <button title="Decrease text"  onclick="a11y.smaller()">A−</button>
  <button title="Read page"      onclick="a11y.speak()">🔊</button>
  <button title="Stop reading"   onclick="a11y.stop()">■</button>
</div>`;

/* Inject floating elements on DOM ready */
document.addEventListener('DOMContentLoaded', () => {
  const slot = F.$('#floating-slot');
  if (slot) slot.innerHTML = F.renderFloating();
});
