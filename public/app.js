const $ = id => document.getElementById(id);
async function api(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}
function esc(v) { return String(v).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
function render(d) {
  $('statusText').textContent = d.connected ? 'Online' : 'Offline';
  $('statusDot').parentElement.classList.toggle('online', !!d.connected);
  $('health').textContent = d.player ? `${Math.round(d.player.health)}/20` : '—';
  $('food').textContent = d.player ? `${Math.round(d.player.food)}/20` : '—';
  $('position').textContent = d.player ? `${d.player.position.x}, ${d.player.position.y}, ${d.player.position.z}` : '—';
  $('mode').textContent = d.mode || 'idle';
  $('inventory').innerHTML = d.inventory?.length ? d.inventory.map(i => `<div class="item"><span>${esc(i.name)}</span><b>${i.count}</b></div>`).join('') : '<div class="item"><span>Inventory empty</span><b>—</b></div>';
  $('logs').textContent = d.logs?.length ? d.logs.join('\n') : 'Waiting for bot events…';
  $('logs').scrollTop = $('logs').scrollHeight;
  if (d.server) {
    if (!$('host').value) $('host').value = d.server.host === 'YOUR_SERVER_IP' ? '' : d.server.host;
    if (!$('port').value) $('port').value = d.server.port || 25565;
    if (!$('username').value) $('username').value = d.server.username || '';
  }
}
async function refresh() { try { render(await api('/api/status')); } catch (e) { $('logs').textContent = e.message; } }
async function connect() { await api('/api/connect', { method:'POST', body: JSON.stringify({ host:$('host').value.trim(), port:Number($('port').value), username:$('username').value.trim() }) }); }
document.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', async () => { try { if (b.dataset.action === 'connect') await connect(); else await api(`/api/${b.dataset.action}`, { method:'POST' }); await refresh(); } catch (e) { $('logs').textContent = e.message; } }));
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', async () => { try { await api('/api/mode', { method:'POST', body:JSON.stringify({ mode:b.dataset.mode }) }); await refresh(); } catch (e) { $('logs').textContent=e.message; } }));
['host','port','username'].forEach(id => $(id).addEventListener('change', () => localStorage.setItem(`mc-${id}`, $(id).value)));
for (const id of ['host','port','username']) $(id).value = localStorage.getItem(`mc-${id}`) || $(id).value;
refresh();
setInterval(refresh, 1500);
