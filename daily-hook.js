// Tonight's lantern (portal builds only): ?daily=1 swaps LEVELS for one puzzle per local calendar day from DAILY (daily.js),
// with its own save key and a streak. Loaded after levels.js, before the game script.
(function () {
  const P = new URLSearchParams(location.search);
  const url = (on) => { const q = new URLSearchParams(location.search); on ? q.set('daily', '1') : q.delete('daily'); const s = q.toString(); return location.pathname + (s ? '?' + s : ''); };
  const nav = (on) => { const go = () => { location.href = url(on); }; window.Portal ? Portal.midgame(go) : go(); };
  window.LD_goDaily = () => nav(true);
  window.LD_leaveDaily = () => nav(false);
  window.LD_DAILY = null;
  if (!P.has('daily') || !window.DAILY || !DAILY.length) return;
  const now = new Date(), day = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(2026, 10, 1)) / 864e5);
  window.LD_DAILY = { day };
  window.LEVELS = [DAILY[((day % DAILY.length) + DAILY.length) % DAILY.length]];
  window.LD_dailyDone = function () {
    let s = {}; try { s = JSON.parse(localStorage.getItem('ld-streak') || '{}') || {}; } catch (e) {}
    if (s.last !== day) { s.n = s.last === day - 1 ? (s.n || 0) + 1 : 1; s.last = day; try { localStorage.setItem('ld-streak', JSON.stringify(s)); } catch (e) {} }
    return `Tonight's lantern is home. Streak: ${s.n} night${s.n > 1 ? 's' : ''}. A new lantern drifts in tomorrow.`;
  };
  const label = () => { const t = document.querySelector('.stat'), n = document.getElementById('lvn'), v = document.getElementById('lvt');
    if (t && n && v) { t.firstChild.textContent = "Tonight's lantern"; n.style.display = v.style.display = 'none'; if (n.nextSibling) n.nextSibling.textContent = ''; } };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', label) : label();
})();
