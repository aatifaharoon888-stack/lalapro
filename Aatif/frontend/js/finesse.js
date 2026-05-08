/**
 * FINESSE — Shared JS  v3
 * (theme · loader · scroll-reveal · datetime · accessibility · AI chatbot · global search · FABs)
 *
 * NEW in v3:
 *  - F.search — sidebar search bar with live dropdown (items, outfits, plans)
 *  - Ctrl+K / ⌘+K keyboard shortcut opens full-screen search overlay
 *  - Search highlights matched text in results
 *  - All v2 chatbot features retained
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
  bigger() {
    const cur = parseFloat(getComputedStyle(document.documentElement).fontSize);
    document.documentElement.style.fontSize = (cur + 2) + 'px';
  },
  smaller() {
    const cur = parseFloat(getComputedStyle(document.documentElement).fontSize);
    document.documentElement.style.fontSize = (cur - 2) + 'px';
  },
  speak() {
    if (!('speechSynthesis' in window)) return alert('TTS not supported');
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(document.body.innerText.slice(0, 1500)));
  },
  stop() { speechSynthesis?.cancel(); },
};

/* ================================================================
   GLOBAL SEARCH  — sidebar bar + Ctrl+K overlay
   ================================================================ */
F.search = {

  _timer:     null,
  _lastQuery: '',
  _open:      false,

  init() {
    const input = F.$('#sidebar-search-input');
    const clear = F.$('#sidebar-search-clear');
    if (!input) return;

    input.addEventListener('input', () => {
      const q = input.value.trim();
      clear && (clear.style.display = q ? 'block' : 'none');
      clearTimeout(F.search._timer);
      if (q.length < 2) { F.search.hideDropdown(); return; }
      F.search.showDropdown('<div class="s-loading">Searching</div>');
      F.search._timer = setTimeout(() => F.search.fetch(q), 280);
    });

    clear && clear.addEventListener('click', () => {
      input.value = '';
      clear.style.display = 'none';
      F.search.hideDropdown();
      input.focus();
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { F.search.hideDropdown(); input.blur(); }
    });

    document.addEventListener('click', e => {
      if (!F.$('.sidebar-search')?.contains(e.target)) F.search.hideDropdown();
    });

    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); F.search.openOverlay();
      }
    });

    const overlay = F.$('#global-search-overlay');
    overlay && overlay.addEventListener('click', e => {
      if (e.target === overlay) F.search.closeOverlay();
    });

    const overlayInput = F.$('#global-search-input');
    overlayInput && overlayInput.addEventListener('input', () => {
      const q = overlayInput.value.trim();
      clearTimeout(F.search._timer);
      const box = F.$('#global-search-results');
      if (q.length < 2) { box.innerHTML = '<div class="s-empty">Type to search…</div>'; return; }
      box.innerHTML = '<div class="s-loading">Searching</div>';
      F.search._timer = setTimeout(() => F.search.fetchOverlay(q), 280);
    });

    overlayInput && overlayInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') F.search.closeOverlay();
    });
  },

  async fetch(q) {
    if (q === F.search._lastQuery) return;
    F.search._lastQuery = q;
    try {
      const data = await F.get(F.api + '/search.php?q=' + encodeURIComponent(q));
      if (!data.ok) { F.search.showDropdown('<div class="s-empty">Login to search.</div>'); return; }
      F.search.showDropdown(F.search.buildHTML(data.results, q, true));
    } catch (_) {
      F.search.showDropdown('<div class="s-empty">Search unavailable.</div>');
    }
  },

  async fetchOverlay(q) {
    const box = F.$('#global-search-results');
    try {
      const data = await F.get(F.api + '/search.php?q=' + encodeURIComponent(q));
      box.innerHTML = data.results.length
        ? F.search.buildHTML(data.results, q, false)
        : `<div class="s-empty">No results for "<b>${F.search._esc(q)}</b>"</div>`;
    } catch (_) {
      box.innerHTML = '<div class="s-empty">Search unavailable.</div>';
    }
  },

  buildHTML(results, q, compact) {
    if (!results.length)
      return `<div class="s-empty">No results for "<b>${F.search._esc(q)}</b>"</div>`;

    const groups = { item: [], outfit: [], plan: [] };
    results.forEach(r => groups[r.type] && groups[r.type].push(r));
    const labels = { item: '❖ Closet Items', outfit: '✦ Saved Looks', plan: '▣ Planner' };
    let html = '';

    for (const [type, rows] of Object.entries(groups)) {
      if (!rows.length) continue;
      html += `<div class="s-section-label">${labels[type]}</div>`;
      rows.forEach(r => {
        const thumb = r.image
          ? `<div class="s-thumb"><img src="${r.image}" alt="" loading="lazy"></div>`
          : `<div class="s-thumb">${r.icon}</div>`;
        html += `
          <a href="${r.url}" class="s-result" tabindex="0">
            ${thumb}
            <div class="s-result-text">
              <b>${F.search._highlight(F.search._esc(r.title), q)}</b>
              <span>${F.search._esc(r.sub)}</span>
            </div>
            <span class="s-arrow">›</span>
          </a>`;
      });
    }

    if (compact) html += `<div class="s-shortcut">Press <kbd>Ctrl+K</kbd> for full search</div>`;
    return html;
  },

  showDropdown(html) {
    let dd = F.$('#sidebar-search-dropdown');
    if (!dd) {
      dd = document.createElement('div');
      dd.id = 'sidebar-search-dropdown';
      dd.className = 'search-dropdown';
      F.$('.sidebar-search') && F.$('.sidebar-search').appendChild(dd);
    }
    dd.innerHTML = html;
    dd.classList.add('open');
    F.search._open = true;
  },

  hideDropdown() {
    F.$('#sidebar-search-dropdown')?.classList.remove('open');
    F.search._open = false;
    F.search._lastQuery = '';
  },

  openOverlay() {
    F.$('#global-search-overlay')?.classList.add('show');
    setTimeout(() => F.$('#global-search-input')?.focus(), 80);
  },

  closeOverlay() {
    F.$('#global-search-overlay')?.classList.remove('show');
    const inp = F.$('#global-search-input');
    const box = F.$('#global-search-results');
    if (inp) inp.value = '';
    if (box) box.innerHTML = '<div class="s-empty">Type to search your wardrobe…</div>';
  },

  _esc(str = '') {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  _highlight(escaped, q) {
    if (!q) return escaped;
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(`(${safe})`, 'gi'),
      '<span class="s-highlight">$1</span>');
  },
};

/* ================================================================
   CHATBOT  — async, AI-powered via backend/chatbot.php
   ================================================================ */
window.chat = {

  toggle() {
    const win = F.$('.chat-window');
    win.classList.toggle('open');
    if (win.classList.contains('open'))
      setTimeout(() => F.$('#chat-input')?.focus(), 80);
  },

  async send(e) {
    e?.preventDefault();
    const inp  = F.$('#chat-input');
    const msg  = inp.value.trim();
    if (!msg || chat._busy) return;

    const body = F.$('.chat-body');
    body.insertAdjacentHTML('beforeend',
      `<div class="bubble me">${chat._escape(msg)}</div>`);
    inp.value = '';
    chat._scrollBottom(body);

    chat._busy = true;
    const typingId = `typing-${Date.now()}`;
    body.insertAdjacentHTML('beforeend',
      `<div class="bubble bot typing" id="${typingId}">
         <span class="dots"><span>·</span><span>·</span><span>·</span></span>
       </div>`);
    chat._scrollBottom(body);
    chat._injectTypingCSS();

    try {
      const fd = new FormData(); fd.append('message', msg);
      const res  = await fetch(F.api + '/chatbot.php',
        { method:'POST', body:fd, credentials:'same-origin' });
      const data = await res.json();
      document.getElementById(typingId)?.remove();
      const reply = data.reply || 'I\'m here whenever you need styling advice. ✨';
      body.insertAdjacentHTML('beforeend',
        `<div class="bubble bot">${chat._escape(reply).replace(/\n/g,'<br>')}</div>`);
    } catch (_) {
      document.getElementById(typingId)?.remove();
      body.insertAdjacentHTML('beforeend',
        '<div class="bubble bot">Connection issue — please try again. 🙏</div>');
    }

    chat._busy = false;
    chat._scrollBottom(body);
  },

  async clearHistory() {
    const body = F.$('.chat-body');
    body.innerHTML = '<div class="bubble bot">Cleared. How can I style you today? ✨</div>';
    try {
      const fd = new FormData(); fd.append('clear','1');
      await fetch(F.api + '/chatbot.php',{ method:'POST', body:fd, credentials:'same-origin' });
    } catch (_) {}
  },

  _busy: false,
  _scrollBottom(el) { el.scrollTop = el.scrollHeight; },
  _escape(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;')
              .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  },
  _cssInjected: false,
  _injectTypingCSS() {
    if (chat._cssInjected) return; chat._cssInjected = true;
    const s = document.createElement('style');
    s.textContent = `.bubble.typing{min-width:48px}.dots{display:inline-flex;gap:4px;
      align-items:center;height:20px}.dots span{display:inline-block;width:6px;height:6px;
      border-radius:50%;background:currentColor;opacity:.4;
      animation:dotBounce 1.2s ease-in-out infinite}
      .dots span:nth-child(2){animation-delay:.2s}.dots span:nth-child(3){animation-delay:.4s}
      @keyframes dotBounce{0%,80%,100%{transform:translateY(0);opacity:.4}
      40%{transform:translateY(-6px);opacity:1}}`;
    document.head.appendChild(s);
  },
};

/* ── Smooth scroll helpers ───────────────────────────────────── */
window.scrollUp   = () => window.scrollTo({ top:0, behavior:'smooth' });
window.scrollDown = () => window.scrollTo({ top:document.body.scrollHeight, behavior:'smooth' });

/* ================================================================
   HELPERS  —  F.toast  F.post  F.get
   ================================================================ */
F.toast = (msg, type = 'ok') => {
  let el = F.$('#__toast');
  if (!el) {
    el = document.createElement('div'); el.id = '__toast';
    el.style.cssText = 'position:fixed;bottom:6.5rem;left:50%;transform:translateX(-50%);' +
      'background:#1a1a1a;color:#f7f3ec;padding:.8rem 1.4rem;border-radius:999px;z-index:300;' +
      'font-size:.85rem;letter-spacing:.1em;box-shadow:0 14px 30px -10px rgba(0,0,0,.4);' +
      'transition:opacity .3s;pointer-events:none;';
    document.body.appendChild(el);
  }
  el.style.background = type === 'err' ? '#7a1f1f' : '#1a1a1a';
  el.textContent = msg; el.style.opacity = '1';
  clearTimeout(F._tt); F._tt = setTimeout(() => el.style.opacity = '0', 2400);
};

F.post = async (url, data) => {
  const fd = data instanceof FormData ? data : new FormData();
  if (!(data instanceof FormData)) Object.entries(data||{}).forEach(([k,v]) => fd.append(k,v));
  const r = await fetch(url, { method:'POST', body:fd, credentials:'same-origin' });
  return r.json();
};
F.get = async (url) => (await fetch(url, { credentials:'same-origin' })).json();

/* ================================================================
   CHROME RENDERER  —  sidebar (with search bar) + floating UI
   ================================================================ */
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

    <!-- ══ GLOBAL SEARCH BAR ═════════════════════════════ -->
    <div class="sidebar-search">
      <div class="sidebar-search-bar">
        <span class="s-icon" style="color:var(--muted);font-size:1rem">⌕</span>
        <input
          id="sidebar-search-input"
          type="search"
          placeholder="Search closet, looks…"
          autocomplete="off"
          maxlength="80"
          aria-label="Search wardrobe"
          style="flex:1;background:transparent;border:0;outline:none;
                 font-size:.82rem;color:var(--text);min-width:0"
        >
        <button
          id="sidebar-search-clear"
          title="Clear"
          aria-label="Clear search"
          style="display:none;background:transparent;border:0;color:var(--muted);
                 cursor:pointer;font-size:1rem;line-height:1;padding:0;flex-shrink:0"
        >×</button>
      </div>
    </div>
    <!-- ═════════════════════════════════════════════════ -->

    <nav>
      ${items.map(([slug,label,ic]) =>
        `<a href="${slug}.html" class="${slug===active?'active':''}">
          <span>${ic}</span> ${label}
        </a>`).join('')}
    </nav>

    <div class="foot">
      <button class="btn btn-ghost" style="width:100%;justify-content:center"
              onclick="toggleTheme()">◐ Theme</button>
      <a class="btn btn-ghost"
         style="width:100%;justify-content:center;margin-top:.5rem"
         href="${F.api}/auth.php?action=logout">Sign out</a>
      <div style="margin-top:.75rem;text-align:center;font-size:.68rem;
                  color:var(--muted);letter-spacing:.1em">
        <kbd style="background:var(--border);padding:1px 5px;
             border-radius:4px;font-size:.65rem">Ctrl+K</kbd> full search
      </div>
    </div>
  </aside>`;
};

F.renderFloating = () => `
<button class="wa-fab" title="WhatsApp"
        onclick="window.open('https://wa.me/000000000','_blank')">
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 2.1.55 4.15 1.6 5.96L2 22l4.25-1.11
      a9.93 9.93 0 0 0 5.79 1.84h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02
      A9.84 9.84 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-2.95.77
      .79-2.88-.2-.31a8.22 8.22 0 0 1-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23
      a8.18 8.18 0 0 1 5.83 2.42 8.2 8.2 0 0 1 2.41 5.83c-.01 4.55-3.7 8.08-8.37 8.08z"/>
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
        <div style="font-size:.72rem;opacity:.7;letter-spacing:.15em;
                    text-transform:uppercase;margin-top:2px">AI · Powered by Claude</div>
      </div>
      <button onclick="chat.clearHistory()" title="Clear conversation"
              style="opacity:.5;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;
                     color:inherit;padding:.2rem .45rem;border-radius:5px;
                     border:1px solid rgba(255,255,255,.2)">Clear</button>
    </div>
  </div>
  <div class="chat-body">
    <div class="bubble bot">Welcome to Finesse ✨ How can I style you today?</div>
  </div>
  <form class="chat-input" onsubmit="chat.send(event)">
    <input id="chat-input" placeholder="Ask your stylist…"
           autocomplete="off" maxlength="500">
    <button type="submit">Send</button>
  </form>
</div>

<div class="a11y-bar" aria-label="Accessibility toolbar">
  <button title="High contrast"  onclick="a11y.contrast()">◑</button>
  <button title="Increase text"  onclick="a11y.bigger()">A+</button>
  <button title="Decrease text"  onclick="a11y.smaller()">A−</button>
  <button title="Read page"      onclick="a11y.speak()">🔊</button>
  <button title="Stop reading"   onclick="a11y.stop()">■</button>
</div>

<!-- ══ GLOBAL SEARCH OVERLAY (Ctrl+K) ══════════════════════ -->
<div id="global-search-overlay"
     style="position:fixed;inset:0;background:rgba(10,10,10,.55);z-index:800;
            display:none;align-items:flex-start;justify-content:center;
            padding-top:10vh;backdrop-filter:blur(6px)"
     role="dialog" aria-modal="true" aria-label="Global search">
  <div style="width:min(580px,92vw);background:var(--bg);border:1px solid var(--border);
              border-radius:var(--radius-lg);box-shadow:0 40px 100px -20px rgba(10,10,10,.5);
              overflow:hidden;animation:dropIn .25s ease both">
    <div style="display:flex;align-items:center;gap:.75rem;padding:1rem 1.25rem;
                border-bottom:1px solid var(--border)">
      <span style="font-size:1.1rem;color:var(--accent)">⌕</span>
      <input id="global-search-input" type="search"
             placeholder="Search closet, looks, planner…"
             autocomplete="off" maxlength="80"
             style="flex:1;background:transparent;border:0;outline:none;
                    font-size:1rem;color:var(--text)">
      <span onclick="F.search.closeOverlay()"
            style="padding:.2rem .5rem;border:1px solid var(--border);border-radius:6px;
                   font-size:.72rem;color:var(--muted);cursor:pointer;letter-spacing:.1em">ESC</span>
    </div>
    <div id="global-search-results"
         style="max-height:400px;overflow-y:auto">
      <div class="s-empty">Type to search your wardrobe…</div>
    </div>
    <div style="padding:.6rem 1.25rem;border-top:1px solid var(--border);
                font-size:.72rem;color:var(--muted);background:var(--surface);
                display:flex;gap:1.2rem;letter-spacing:.08em">
      <span><kbd style="background:var(--border);padding:1px 4px;border-radius:3px">↑↓</kbd> Navigate</span>
      <span><kbd style="background:var(--border);padding:1px 4px;border-radius:3px">Enter</kbd> Open</span>
      <span><kbd style="background:var(--border);padding:1px 4px;border-radius:3px">Esc</kbd> Close</span>
    </div>
  </div>
</div>`;

/* Inject floating elements and init search */
document.addEventListener('DOMContentLoaded', () => {
  const slot = F.$('#floating-slot');
  if (slot) slot.innerHTML = F.renderFloating();
  setTimeout(() => F.search.init(), 0);
});
