const SUPA_URL = 'https://yloxybwewqwlbwdiwitf.supabase.co';
const SUPA_KEY = 'sb_publishable_lybe35Yr33QfizJQhRqOfA_9Eadq-fH';

const _db = supabase.createClient(SUPA_URL, SUPA_KEY);
window.DB = _db;

window.SUPA = (() => {
  let _ch = null;

  function initChannel(uid) {
    _ch = _db.channel('mm-realtime', {
      config: {
        broadcast: { self: false },
        presence: { key: uid }
      }
    });
    return _ch;
  }

  function channel() { return _ch; }

  async function getHistory() {
    const { data, error } = await _db
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) console.error('history:', error.message);
    return data || [];
  }

  async function insertMessage(msg) {
    const { data, error } = await _db
      .from('messages')
      .insert(msg)
      .select()
      .single();
    if (error) console.error('insert:', error.message);
    return data;
  }

  function broadcast(ev, payload) {
    if (_ch) _ch.send({ type: 'broadcast', event: ev, payload: payload || {} });
  }

  async function uploadFile(file, name) {
    const path = Date.now() + '-' + (name || file.name || 'file');
    const { error } = await _db.storage.from('media').upload(path, file, {
      cacheControl: '31536000',
      upsert: false
    });
    if (error) throw error;
    const { data: u } = _db.storage.from('media').getPublicUrl(path);
    return {
      url: u.publicUrl,
      name: file.name || name || 'file',
      size: file.size,
      mime: file.type
    };
  }

  return { initChannel, channel, getHistory, insertMessage, broadcast, uploadFile };
})();
