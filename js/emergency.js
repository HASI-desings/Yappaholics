window.EMERGENCY = (() => {
  let _ctx = null;
  let _nodes = [];
  let _loop = null;
  let _active = false;

  function _unlockCtx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
  }

  function _makeChicken() {
    const t = _ctx.currentTime;

    const mk = (type, freq, start, dur, vol) => {
      const o = _ctx.createOscillator();
      const g = _ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, start);
      o.frequency.exponentialRampToValueAtTime(freq * 2.8, start + dur * .3);
      o.frequency.exponentialRampToValueAtTime(freq * .6, start + dur * .7);
      o.frequency.exponentialRampToValueAtTime(freq * 1.4, start + dur);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + .01);
      g.gain.exponentialRampToValueAtTime(.001, start + dur);
      o.connect(g);
      g.connect(_ctx.destination);
      o.start(start);
      o.stop(start + dur);
      _nodes.push(o, g);
    };

    const mkNoise = (start, dur, vol) => {
      const buf = _ctx.createBuffer(1, _ctx.sampleRate * dur, _ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * .5;
      const src = _ctx.createBufferSource();
      const g = _ctx.createGain();
      const flt = _ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.frequency.setValueAtTime(800, start);
      flt.Q.value = .8;
      src.buffer = buf;
      src.connect(flt);
      flt.connect(g);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(vol, start + .02);
      g.gain.exponentialRampToValueAtTime(.001, start + dur);
      g.connect(_ctx.destination);
      src.start(start);
      _nodes.push(src, g);
    };

    mk('sawtooth', 320, t, .18, .7);
    mk('sine', 280, t + .08, .22, .5);
    mkNoise(t + .03, .12, .4);
    mk('square', 480, t + .22, .14, .6);
    mkNoise(t + .25, .1, .35);
    mk('sawtooth', 240, t + .36, .25, .8);
    mk('sine', 360, t + .4, .2, .4);
    mkNoise(t + .42, .15, .5);
    mk('triangle', 520, t + .55, .3, .6);
    mkNoise(t + .6, .2, .45);
    mk('sawtooth', 200, t + .72, .28, .9);
    mkNoise(t + .75, .25, .55);
  }

  function start() {
    if (_active) return;
    _active = true;
    _unlockCtx();
    _makeChicken();
    _loop = setInterval(() => {
      _nodes.forEach(n => { try { if (n.stop) n.stop(); } catch(e){} });
      _nodes = [];
      _makeChicken();
    }, 1050);
  }

  function stop() {
    _active = false;
    clearInterval(_loop);
    _nodes.forEach(n => { try { if (n.stop) n.stop(); } catch(e){} });
    _nodes = [];
  }

  function primeOnInteraction() {
    const resume = () => {
      _unlockCtx();
      document.removeEventListener('touchstart', resume);
      document.removeEventListener('click', resume);
    };
    document.addEventListener('touchstart', resume, { once: true });
    document.addEventListener('click', resume, { once: true });
  }

  return { start, stop, primeOnInteraction };
})();
