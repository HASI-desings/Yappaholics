window.APP = (() => {
  let _me = null;
  let _typing = false;
  let _typingTimer = null;
  let _inCall = false;
  let _myMsgIds = new Set();
  const USER_KEY = 'mm-user';

  const $ = id => document.getElementById(id);
  const qs = s => document.querySelector(s);
  const qsa = s => document.querySelectorAll(s);

  function showScreen(id) {
    qsa('.screen').forEach(s => s.classList.remove('active'));
    requestAnimationFrame(() => { const el = $(id); if (el) el.classList.add('active'); });
  }

  function fmt(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function fmtDate(ms) {
    const d = new Date(ms), t = new Date();
    t.setHours(0,0,0,0);
    const y = new Date(t); y.setDate(y.getDate()-1);
    if (d >= t) return 'Today';
    if (d >= y) return 'Yesterday';
    return d.toLocaleDateString([], { month:'short', day:'numeric', year:'numeric' });
  }

  function esc(s) {
    return String(s||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }

  function normMsg(r) {
    return {
      id: r.id,
      from: r.from_user,
      type: r.type,
      text: r.text,
      ts: new Date(r.created_at).getTime(),
      file: r.file_url ? {
        url: r.file_url, name: r.file_name,
        size: r.file_size, mime: r.file_mime
      } : null
    };
  }

  let _lastDate = '';
  function appendMsg(m) {
    const list = $('msg-list');
    const d = fmtDate(m.ts);
    if (d !== _lastDate) {
      const div = document.createElement('div');
      div.className = 'date-divider'; div.textContent = d;
      list.appendChild(div); _lastDate = d;
    }
    if ($('msg-' + m.id)) return;
    const mine = m.from === _me?.id;
    const wrap = document.createElement('div');
    wrap.className = 'msg-group ' + (mine ? 'me' : 'them');
    wrap.id = 'msg-' + m.id;
    const b = document.createElement('div');
    b.className = 'bubble';
    if (m.type === 'text') {
      b.innerHTML = `<span>${esc(m.text)}</span><span class="ts">${fmt(m.ts)}</span>`;
    } else if (m.type === 'file' && m.file) {
      const { url, name, size, mime } = m.file;
      if (MEDIA.isImage(mime)) {
        b.innerHTML = `<div class="msg-image"><img src="${url}" loading="lazy"/><span class="ts">${fmt(m.ts)}</span></div>`;
        b.querySelector('img').onclick = () => openLightbox(url, false);
      } else if (MEDIA.isVideo(mime)) {
        b.innerHTML = `<div class="msg-image"><video src="${url}" controls playsinline></video><span class="ts">${fmt(m.ts)}</span></div>`;
      } else if (MEDIA.isAudio(mime)) {
        b.innerHTML = `<div class="msg-audio"><audio src="${url}" controls></audio><span class="ts">${fmt(m.ts)}</span></div>`;
      } else {
        b.innerHTML = `<a class="msg-file" href="${url}" target="_blank" download="${esc(name)}">
          <span class="file-icon">📎</span>
          <div class="file-info"><div class="file-name">${esc(name)}</div><div class="file-size">${MEDIA.fmtSize(size)}</div></div>
          <span class="ts">${fmt(m.ts)}</span></a>`;
      }
    }
    wrap.appendChild(b);
    list.appendChild(wrap);
    list.scrollTop = list.scrollHeight;
  }

  async function sendText() {
    const inp = $('msg-input');
    const txt = inp.value.trim();
    if (!txt || !_me) return;
    inp.value = ''; inp.style.height = '';
    const row = { from_user: _me.id, type: 'text', text: txt };
    const saved = await SUPA.insertMessage(row);
    if (saved) { _myMsgIds.add(saved.id); appendMsg(normMsg(saved)); }
  }

  async function sendFileMsg(fileData) {
    if (!_me) return;
    const row = {
      from_user: _me.id, type: 'file',
      file_url: fileData.url, file_name: fileData.name,
      file_size: fileData.size, file_mime: fileData.mime
    };
    const saved = await SUPA.insertMessage(row);
    if (saved) { _myMsgIds.add(saved.id); appendMsg(normMsg(saved)); }
  }

  function openLightbox(src, isVid) {
    const lb = $('lightbox'); lb.innerHTML = '';
    const el = document.createElement(isVid ? 'video' : 'img');
    el.src = src;
    if (isVid) { el.controls = true; el.autoplay = true; el.playsinline = true; }
    const close = document.createElement('button');
    close.className = 'lb-close'; close.textContent = '✕';
    close.onclick = () => lb.classList.remove('show');
    lb.appendChild(close); lb.appendChild(el);
    lb.classList.add('show');
  }

  function openDrawer()  { $('drawer-overlay').classList.add('open'); $('media-drawer').classList.add('open'); }
  function closeDrawer() { $('drawer-overlay').classList.remove('open'); $('media-drawer').classList.remove('open'); }
  function openTheme()   { $('theme-overlay').classList.add('open'); $('theme-panel').classList.add('open'); }
  function closeTheme()  { $('theme-overlay').classList.remove('open'); $('theme-panel').classList.remove('open'); }

  function startCall() { showScreen('call-screen'); _inCall = true; RTC.call(); }
  function endCall()   { RTC.end(); _inCall = false; showScreen('chat-screen'); }

  function initRealtimeChannel(uid) {
    const ch = SUPA.initChannel(uid);

    ch.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages'
    }, payload => {
      const m = normMsg(payload.new);
      if (!_myMsgIds.has(m.id)) appendMsg(m);
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const peerOnline = Object.keys(state).some(k => k !== uid);
      qs('.online-dot').classList.toggle('offline', !peerOnline);
    });

    ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.uid === uid) return;
      const el = qs('.h-status');
      if (payload.v) { el.textContent = 'typing…'; el.classList.add('typing'); }
      else { el.textContent = ''; el.classList.remove('typing'); }
    });

    ch.on('broadcast', { event: 'emergency' }, () => {
      EMERGENCY.start();
      $('emergency-alert').classList.add('active');
    });

    ch.on('broadcast', { event: 'emergency_ack' }, () => {});

    ch.on('broadcast', { event: 'rtc_offer' }, ({ payload }) => {
      showScreen('call-screen'); _inCall = true;
      RTC.onOffer(payload);
    });
    ch.on('broadcast', { event: 'rtc_answer' }, ({ payload }) => RTC.onAnswer(payload));
    ch.on('broadcast', { event: 'rtc_ice' }, ({ payload }) => RTC.onIce(payload));
    ch.on('broadcast', { event: 'rtc_end' }, () => { RTC.end(); _inCall = false; showScreen('chat-screen'); });

    ch.subscribe(async s => {
      if (s === 'SUBSCRIBED') {
        await ch.track({ user_id: uid, online_at: new Date().toISOString() });
      }
    });
  }

  function patchRTC() {
    const orig = RTC;
    const _origCall = orig.call.bind(orig);
    orig.call = function() {
      const pc = _origCall();
      return pc;
    };
    window._rtcSignal = function(ev, data) { SUPA.broadcast(ev, data); };
  }

  function saveSelectedUser(uid) {
    if (!uid) return;
    localStorage.setItem(USER_KEY, uid);
  }

  function getSavedUser() {
    const saved = localStorage.getItem(USER_KEY);
    return saved === 'mano' ? 'mano' : 'mahi';
  }

  async function enterChatAs(uid) {
    _me = { id: uid, name: uid === 'mahi' ? 'Mahi' : 'Mano', avatar: 'M' };
    $('my-avatar').textContent = _me.avatar;

    initRealtimeChannel(_me.id);
    EMERGENCY.primeOnInteraction();

    const history = await SUPA.getHistory();
    $('msg-list').innerHTML = ''; _lastDate = '';
    history.forEach(r => appendMsg(normMsg(r)));

    showScreen('chat-screen');
  }

  function initLogin() {
    let selected = getSavedUser();
    const tiles = qsa('.user-tile');

    function updateSelection(uid) {
      selected = uid;
      tiles.forEach(x => x.classList.toggle('selected', x.dataset.uid === uid));
      saveSelectedUser(uid);
    }

    tiles.forEach(t => {
      t.addEventListener('click', () => updateSelection(t.dataset.uid));
    });

    updateSelection(selected);

    $('btn-enter').addEventListener('click', async () => {
      await enterChatAs(selected);
    });

    if (localStorage.getItem(USER_KEY)) {
      enterChatAs(selected);
    }
  }

  function initChat() {
    $('attach-btn').addEventListener('click', openDrawer);
    $('drawer-overlay').addEventListener('click', closeDrawer);
    $('theme-overlay').addEventListener('click', closeTheme);
    $('theme-btn').addEventListener('click', openTheme);

    $('msg-input').addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      if (!_typing) { _typing = true; SUPA.broadcast('typing', { uid: _me?.id, v: true }); }
      clearTimeout(_typingTimer);
      _typingTimer = setTimeout(() => { _typing = false; SUPA.broadcast('typing', { uid: _me?.id, v: false }); }, 1600);
    });

    $('msg-input').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }
    });

    $('send-btn').addEventListener('click', sendText);

    $('mic-btn').addEventListener('click', () => {
      MEDIA.startVoice(async blob => {
        const d = await MEDIA.uploadBlob(blob, 'voice.webm');
        sendFileMsg(d);
      });
    });

    qs('.rec-cancel').addEventListener('click', MEDIA.cancelVoice);
    qs('.rec-send').addEventListener('click', MEDIA.stopVoice);

    $('emergency-btn').addEventListener('click', () => {
      SUPA.broadcast('emergency', { from: _me?.id });
    });

    qs('.ack-btn').addEventListener('click', () => {
      EMERGENCY.stop();
      $('emergency-alert').classList.remove('active');
      SUPA.broadcast('emergency_ack', {});
    });

    $('call-btn').addEventListener('click', startCall);
    $('end-call-btn').addEventListener('click', endCall);
    $('mute-btn').addEventListener('click', function() {
      this.textContent = RTC.toggleMute() ? '🔇' : '🎤';
    });
    $('cam-btn').addEventListener('click', function() {
      this.textContent = RTC.toggleCam() ? '📵' : '📷';
    });

    $('lightbox').addEventListener('click', function(e) {
      if (e.target === this) this.classList.remove('show');
    });

    initDrawerItems();
    initThemePanel();
    initVideoNote();
  }

  function initDrawerItems() {
    const mkInput = (accept, cb) => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = accept; inp.style.display = 'none';
      inp.onchange = cb; document.body.appendChild(inp);
      return inp;
    };

    const fileInp = mkInput('*/*', async () => {
      if (!fileInp.files[0]) return; closeDrawer();
      const d = await MEDIA.uploadFile(fileInp.files[0]); sendFileMsg(d);
      fileInp.value = '';
    });

    const photoInp = mkInput('image/*,video/*', async () => {
      if (!photoInp.files[0]) return; closeDrawer();
      const d = await MEDIA.uploadFile(photoInp.files[0]); sendFileMsg(d);
      photoInp.value = '';
    });

    const handlers = {
      'drawer-camera': () => { closeDrawer(); MEDIA.startVideoNote(); },
      'drawer-voice':  () => {
        closeDrawer();
        MEDIA.startVoice(async blob => {
          const d = await MEDIA.uploadBlob(blob, 'voice.webm'); sendFileMsg(d);
        });
      },
      'drawer-photo': () => { closeDrawer(); photoInp.click(); },
      'drawer-file':  () => { closeDrawer(); fileInp.click(); },
      'drawer-gif':   () => { closeDrawer(); photoInp.click(); }
    };

    Object.entries(handlers).forEach(([id, fn]) => {
      const el = $(id); if (el) el.addEventListener('click', fn);
    });
  }

  function initThemePanel() {
    qsa('.theme-card').forEach(c => {
      c.addEventListener('click', () => { THEMES.apply(c.dataset.theme); closeTheme(); });
    });
    $('upload-bg-btn').addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = () => {
        if (!inp.files[0]) return;
        const r = new FileReader();
        r.onload = e => { THEMES.setCustom(e.target.result); closeTheme(); };
        r.readAsDataURL(inp.files[0]);
      };
      inp.click();
    });
  }

  function initVideoNote() {
    qs('.vn-rec').addEventListener('click', MEDIA.recordVideoNote);
    qs('.vn-stop').addEventListener('click', MEDIA.stopVideoNote);
    qs('.vn-send').addEventListener('click', () => {
      MEDIA.sendVideoNote(async blob => {
        const d = await MEDIA.uploadBlob(blob, 'vidnote.webm'); sendFileMsg(d);
      });
    });
    qs('.vn-cancel').addEventListener('click', MEDIA.closeVideoNote);
  }

  function patchWebRTC() {
    // WebRTC is already properly configured in webrtc.js
    // No patching needed
  }

  function init() {
    try {
      THEMES.init();
      EMERGENCY.primeOnInteraction();
      patchWebRTC();
      initLogin();
      initChat();
      showScreen('login-screen');
      
      if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      }
      
      console.log('✓ M&M\'s App initialized successfully');
    } catch (e) {
      console.error('✗ App initialization error:', e);
    }
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', APP.init);
