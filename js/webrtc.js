window.RTC = (() => {
  const CFG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  let _pc = null;
  let _localStream = null;

  async function call() {
    try {
      _localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      document.getElementById('local-video').srcObject = _localStream;

      _pc = new RTCPeerConnection(CFG);
      _localStream.getTracks().forEach(t => _pc.addTrack(t, _localStream));

      _pc.ontrack = e => { 
        const el = document.getElementById('remote-video');
        if (el) el.srcObject = e.streams[0]; 
      };
      _pc.onicecandidate = e => { 
        if (e.candidate) SUPA.broadcast('rtc_ice', e.candidate); 
      };

      const offer = await _pc.createOffer();
      await _pc.setLocalDescription(offer);
      SUPA.broadcast('rtc_offer', offer);
    } catch (e) {
      console.error('RTC call error:', e);
    }
  }

  async function onOffer(offer) {
    try {
      _localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      document.getElementById('local-video').srcObject = _localStream;

      _pc = new RTCPeerConnection(CFG);
      _localStream.getTracks().forEach(t => _pc.addTrack(t, _localStream));

      _pc.ontrack = e => { 
        const el = document.getElementById('remote-video');
        if (el) el.srcObject = e.streams[0]; 
      };
      _pc.onicecandidate = e => { 
        if (e.candidate) SUPA.broadcast('rtc_ice', e.candidate); 
      };

      await _pc.setRemoteDescription(new RTCSessionDescription(offer));
      const ans = await _pc.createAnswer();
      await _pc.setLocalDescription(ans);
      SUPA.broadcast('rtc_answer', ans);
    } catch (e) {
      console.error('RTC onOffer error:', e);
    }
  }

  async function onAnswer(ans) {
    try {
      if (_pc) await _pc.setRemoteDescription(new RTCSessionDescription(ans));
    } catch (e) {
      console.error('RTC onAnswer error:', e);
    }
  }

  async function onIce(c) {
    try {
      if (_pc && c) await _pc.addIceCandidate(new RTCIceCandidate(c));
    } catch (e) {
      console.error('RTC onIce error:', e);
    }
  }

  function end() {
    if (_localStream) _localStream.getTracks().forEach(t => t.stop());
    if (_pc) { _pc.close(); _pc = null; }
    const localEl = document.getElementById('local-video');
    const remoteEl = document.getElementById('remote-video');
    if (localEl) localEl.srcObject = null;
    if (remoteEl) remoteEl.srcObject = null;
    SUPA.broadcast('rtc_end', {});
  }

  function toggleMute() {
    if (!_localStream) return false;
    const t = _localStream.getAudioTracks()[0];
    if (t) t.enabled = !t.enabled;
    return !t?.enabled;
  }

  function toggleCam() {
    if (!_localStream) return false;
    const t = _localStream.getVideoTracks()[0];
    if (t) t.enabled = !t.enabled;
    return !t?.enabled;
  }

  return { call, onOffer, onAnswer, onIce, end, toggleMute, toggleCam };
})();
