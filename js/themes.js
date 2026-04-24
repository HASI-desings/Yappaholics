window.THEMES = (() => {
  const DEFS = {
    dark: {
      label: 'Dark', cls: '',
      bg: 'linear-gradient(160deg, #0a0a0a 0%, #1a0b2e 100%)'
    },
    light: {
      label: 'Light', cls: 'theme-light',
      bg: 'linear-gradient(160deg, #f0eef8 0%, #e4dff5 100%)'
    },
    neon: {
      label: 'Neon', cls: 'theme-neon',
      bg: 'linear-gradient(160deg, #050510 0%, #0d0d2b 100%)'
    },
    glass: {
      label: 'Glass', cls: 'theme-glass',
      bg: 'linear-gradient(135deg, #0f0725 0%, #1a0f3a 50%, #0a1525 100%)'
    }
  };

  let _cur = localStorage.getItem('theme') || 'dark';
  let _customBg = localStorage.getItem('customBg') || null;

  function apply(id) {
    if (!DEFS[id]) {
      console.warn(`Theme "${id}" not found, using dark`);
      id = 'dark';
    }
    
    const prev = DEFS[_cur];
    if (prev?.cls) document.body.classList.remove(prev.cls);
    _cur = id;
    localStorage.setItem('theme', id);
    
    const t = DEFS[id];
    if (t.cls) document.body.classList.add(t.cls);
    
    const bg = document.querySelector('.chat-bg');
    if (bg) {
      if (_customBg) {
        bg.style.backgroundImage = `url(${_customBg})`;
        bg.style.backgroundSize = 'cover';
      } else {
        bg.style.backgroundImage = t.bg;
        bg.style.backgroundSize = '';
      }
    }
    
    document.querySelectorAll('.theme-card').forEach(c => {
      c.classList.toggle('active', c.dataset.theme === id);
    });
  }

  function setCustom(dataUrl) {
    _customBg = dataUrl;
    localStorage.setItem('customBg', dataUrl);
    const bg = document.querySelector('.chat-bg');
    if (bg) { 
      bg.style.backgroundImage = `url(${dataUrl})`; 
      bg.style.backgroundSize = 'cover'; 
    }
  }

  function init() { 
    apply(_cur);
  }

  return { apply, setCustom, init, current: () => _cur, defs: DEFS };
})();
