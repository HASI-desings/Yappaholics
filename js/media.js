window.MEDIA = (() => {
  let _mr = null;
  let _chunks = [];
  let _timer = null;
  let _secs = 0;
  let _vidStream = null;
  let _vidRec = null;
  let _vidChunks = [];
  let _vidBlob = null;

  function fmtSize(b) {
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }

  async function startVoice(onDone) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
      _chunks = []; _secs = 0;
      _mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      _mr.ondataavailable = e => { if (e.data.size) _chunks.push(e.data); };
      _mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(_chunks, { type: 'audio/webm' });
        onDone(blob);
      };
      _mr.start();
      document.querySelector('.recording-ui').classList.add('show');
      document.querySelector('.chat-input-wrap').classList.add('hidden');
      _timer = setInterval(() => {
        _secs++;
        const el = document.querySelector('.rec-time');
        if (el) el.textContent = '🎙 ' + fmtTime(_secs);
      }, 1000);
    } catch (e) {
      console.error('Voice recording error:', e);
      alert('Cannot access microphone. Please check permissions.');
    }
  }

  function stopVoice() {
    clearInterval(_timer);
    if (_mr && _mr.state !== 'inactive') _mr.stop();
    const recUI = document.querySelector('.recording-ui');
    const inputWrap = document.querySelector('.chat-input-wrap');
    if (recUI) recUI.classList.remove('show');
    if (inputWrap) inputWrap.classList.remove('hidden');
  }

  function cancelVoice() {
    clearInterval(_timer);
    if (_mr && _mr.state !== 'inactive') { _mr.onstop = null; _mr.stop(); }
    const recUI = document.querySelector('.recording-ui');
    const inputWrap = document.querySelector('.chat-input-wrap');
    if (recUI) recUI.classList.remove('show');
    if (inputWrap) inputWrap.classList.remove('hidden');
  }

  async function startVideoNote() {
    try {
      _vidStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true }
      });
      const el = document.querySelector('.vidnote-preview');
      const v = el.querySelector('.vn-live');
      v.srcObject = _vidStream;
      await v.play();
      el.classList.add('show');
      _vidChunks = [];
      _vidBlob = null;
    } catch (e) {
      console.error('Video note error:', e);
      alert('Cannot access camera. Please check permissions.');
    }
  }

  function recordVideoNote() {
    try {
      _vidRec = new MediaRecorder(_vidStream, { mimeType: 'video/webm' });
      _vidRec.ondataavailable = e => { if (e.data.size) _vidChunks.push(e.data); };
      _vidRec.onstop = () => {
        _vidBlob = new Blob(_vidChunks, { type: 'video/webm' });
      };
      _vidRec.start();
      document.querySelector('.vn-rec').classList.add('hidden');
      document.querySelector('.vn-stop').classList.remove('hidden');
    } catch (e) {
      console.error('Video recording error:', e);
    }
  }

  function stopVideoNote() {
    if (_vidRec && _vidRec.state !== 'inactive') _vidRec.stop();
    document.querySelector('.vn-stop').classList.add('hidden');
    document.querySelector('.vn-send').classList.remove('hidden');
  }

  function sendVideoNote(onDone) {
    if (!_vidBlob) return;
    onDone(_vidBlob);
    closeVideoNote();
  }

  function closeVideoNote() {
    if (_vidStream) _vidStream.getTracks().forEach(t => t.stop());
    _vidStream = null;
    _vidBlob = null;
    _vidChunks = [];
    const el = document.querySelector('.vidnote-preview');
    if (el) el.classList.remove('show');
    const recBtn = document.querySelector('.vn-rec');
    const stopBtn = document.querySelector('.vn-stop');
    const sendBtn = document.querySelector('.vn-send');
    if (recBtn) recBtn.classList.remove('hidden');
    if (stopBtn) stopBtn.classList.add('hidden');
    if (sendBtn) sendBtn.classList.add('hidden');
  }

  async function uploadBlob(blob, name) {
    return SUPA.uploadFile(blob, name);
  }

  async function uploadFile(file) {
    return SUPA.uploadFile(file, file.name);
  }

  function isImage(mime) { return mime && mime.startsWith('image/'); }
  function isVideo(mime) { return mime && mime.startsWith('video/'); }
  function isAudio(mime) { return mime && mime.startsWith('audio/'); }

  return {
    fmtSize, fmtTime,
    startVoice, stopVoice, cancelVoice,
    startVideoNote, recordVideoNote, stopVideoNote, sendVideoNote, closeVideoNote,
    uploadBlob, uploadFile,
    isImage, isVideo, isAudio
  };
})();
