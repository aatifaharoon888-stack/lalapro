// Auth pages
async function doSignup(e) {
  e.preventDefault();
  const f = e.target;
  const fd = new FormData(f); fd.append('action','signup');
  const r = await F.post(F.api + '/auth.php', fd);
  const m = F.$('.msg', f);
  if (r.ok) { m.className = 'msg ok'; m.textContent = 'Welcome to Finesse — entering studio…'; setTimeout(()=> location.href = r.redirect, 800); }
  else { m.className = 'msg err'; m.textContent = r.msg || 'Signup failed'; }
}
async function doLogin(e) {
  e.preventDefault();
  const f = e.target;
  const fd = new FormData(f); fd.append('action','login');
  const r = await F.post(F.api + '/auth.php', fd);
  const m = F.$('.msg', f);
  if (r.ok) { m.className = 'msg ok'; m.textContent = 'Signed in. Welcome back.'; setTimeout(()=> location.href = r.redirect, 600); }
  else { m.className = 'msg err'; m.textContent = r.msg || 'Login failed'; }
}
window.doSignup = doSignup; window.doLogin = doLogin;
