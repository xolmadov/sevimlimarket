// Ishlatish:
//   node telegram-setup.js BOT_TOKEN            -> bot va u koʻrgan chatlar (CHAT_ID) roʻyxati
//   node telegram-setup.js BOT_TOKEN CHAT_ID    -> test xabar yuboradi
const [, , T, C] = process.argv;
if (!T) { console.log('Ishlatish: node telegram-setup.js BOT_TOKEN [CHAT_ID]'); process.exit(1); }
const api = async (m, b) => { const r = await fetch(`https://api.telegram.org/bot${T}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }); return r.json(); };
(async () => {
  const me = await api('getMe');
  if (!me.ok) return console.log('Token notoʻgʻri:', me.description);
  console.log('Bot topildi: @' + me.result.username);
  if (!C) {
    const u = await api('getUpdates'), seen = new Map();
    (u.result || []).forEach(x => { const c = (x.message || x.channel_post || x.my_chat_member || {}).chat; if (c) seen.set(c.id, c); });
    if (!seen.size) return console.log('Chat topilmadi. Botni guruhga qoʻshing, guruhga biror xabar yozing va buyruqni qayta ishga tushiring.');
    for (const c of seen.values()) console.log('CHAT_ID:', c.id, '|', c.type, '|', c.title || c.first_name || '');
  } else {
    const r = await api('sendMessage', { chat_id: C, text: 'Sevimli Market: test xabar. Ulanish muvaffaqiyatli.' });
    console.log(r.ok ? 'Test xabar yuborildi!' : 'Xato: ' + r.description);
  }
})();
