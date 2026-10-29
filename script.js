(() => {
  const $ = s => document.querySelector(s);
  const audio = new Audio();           // sirf ek audio, autoplay nahi
  audio.preload = 'none';
  let cur = -1, fs = 1.15, lastLn = -1;

  const list = $('#list'), dock = $('#dock');
  const fmt = s => isFinite(s) ? Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0') : '0:00';
  const esc = t => t.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

  // ---------- cards ----------
  TRACKS.forEach((t, i) => {
    const lines = t.text.split('\n');
    let idx = 0;
    const html = lines.map(l => {
      if (!l.trim()) return '<div class="gap"></div>';
      if (l.startsWith('# ')) return '<div class="hd">' + esc(l.slice(2)) + '</div>';
      return '<div class="ln" data-i="' + (idx++) + '">' + esc(l) + '</div>';
    }).join('');
    t._n = idx;

    const card = document.createElement('article');
    card.className = 'card';
    card.id = 'card-' + t.id;
    card.innerHTML =
      '<div class="card-head">' +
        '<button class="play" aria-label="Play ' + esc(t.title) + '">▶</button>' +
        '<div class="meta"><h3>' + esc(t.title) + '</h3><p>' + esc(t.artist) + '</p></div>' +
        '<button class="toggle" aria-expanded="false">बोल ▾</button>' +
      '</div>' +
      '<div class="trans">' +
        (t.placeholder ? '<div class="note">इस भजन के बोल जल्द जोड़े जाएँगे।</div>' : '') +
        '<div class="tools">' +
          '<button data-a="minus">A−</button><button data-a="plus">A+</button>' +
          '<button data-a="copy">📋 Copy</button><button data-a="share">📲 WhatsApp</button>' +
        '</div>' +
        '<div class="text">' + html + '</div>' +
      '</div>';
    list.appendChild(card);

    card.querySelector('.play').onclick = () => playTrack(i);
    const tg = card.querySelector('.toggle');
    tg.onclick = () => setOpen(i, !card.classList.contains('open'));
    card.querySelector('.tools').onclick = e => {
      const a = e.target.dataset.a; if (!a) return;
      if (a === 'plus') setFs(fs + .1);
      if (a === 'minus') setFs(fs - .1);
      if (a === 'copy') navigator.clipboard && navigator.clipboard.writeText(t.title + '\n\n' + t.text.replace(/^# /gm,'')).then(() => flash(e.target));
      if (a === 'share') window.open('https://wa.me/?text=' + encodeURIComponent('🚩 ' + t.title + '\n' + location.href), '_blank');
    };
  });

  function flash(b){ const o=b.textContent; b.textContent='✅ Copied'; setTimeout(()=>b.textContent=o,1200); }
  function setFs(v){ fs = Math.min(1.8, Math.max(.9, v)); document.documentElement.style.setProperty('--fs', fs + 'rem'); }
  function setOpen(i, open){
    const c = $('#card-' + TRACKS[i].id);
    c.classList.toggle('open', open);
    const tg = c.querySelector('.toggle');
    tg.textContent = open ? 'बोल ▴' : 'बोल ▾';
    tg.setAttribute('aria-expanded', open);
  }

  // ---------- player ----------
  function playTrack(i){
    if (i === cur) { audio.paused ? audio.play() : audio.pause(); return; }
    cur = i; lastLn = -1;
    const t = TRACKS[i];
    audio.src = t.file;
    audio.play().catch(() => alert('Audio chalane me dikkat aayi. File ka naam check karein: ' + t.file));
    dock.hidden = false;
    $('#dTitle').textContent = t.title;
    TRACKS.forEach((_, k) => { setOpen(k, k === i); $('#card-' + TRACKS[k].id).classList.toggle('active', k === i); });
    setTimeout(() => $('#card-' + t.id).scrollIntoView({behavior:'smooth', block:'start'}), 120);
  }
  const step = d => playTrack((cur < 0 ? 0 : cur + d + TRACKS.length) % TRACKS.length);

  function syncUI(){
    const playing = !audio.paused;
    $('#pp').textContent = playing ? '⏸' : '▶';
    TRACKS.forEach((t, k) => $('#card-' + t.id + ' .play').textContent = (k === cur && playing) ? '⏸' : '▶');
  }
  audio.onplay = audio.onpause = syncUI;
  audio.onended = () => step(1);
  audio.onerror = () => { if (cur >= 0) alert('Audio file nahi mili: ' + TRACKS[cur].file); };
  audio.ontimeupdate = () => {
    $('#seek').value = audio.duration ? (audio.currentTime / audio.duration * 100) : 0;
    $('#dTime').textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
    const t = TRACKS[cur];
    if (t && t.times && t.times.length) {            // line highlight (jab times bhare ho)
      let n = -1; t.times.forEach((s, k) => { if (audio.currentTime >= s) n = k; });
      if (n !== lastLn) {
        const root = $('#card-' + t.id);
        root.querySelectorAll('.ln.now').forEach(e => e.classList.remove('now'));
        const el = root.querySelector('.ln[data-i="' + n + '"]');
        if (el) { el.classList.add('now'); el.scrollIntoView({block:'center', behavior:'smooth'}); }
        lastLn = n;
      }
    }
  };
  $('#pp').onclick = () => cur < 0 ? playTrack(0) : (audio.paused ? audio.play() : audio.pause());
  $('#prev').onclick = () => step(-1);
  $('#next').onclick = () => step(1);
  $('#seek').oninput = e => { if (audio.duration) audio.currentTime = e.target.value / 100 * audio.duration; };
  $('#vol').oninput = e => audio.volume = e.target.value;


  // ---------- राम नाम जप (auto + counter) ----------
  const jap = new Audio('ram-naam-jap.mp3');
  jap.loop = true; jap.preload = 'auto';
  let count = 0;
  try { count = parseInt(localStorage.getItem('hjv_count') || '0', 10) || 0; } catch (e) {}
  const showCount = () => { $('#cnt').textContent = count; $('#mala').textContent = Math.floor(count / 108); };
  const saveCount = () => { try { localStorage.setItem('hjv_count', count); } catch (e) {} };
  showCount();

  const japSync = () => { $('#japPP').textContent = jap.paused ? '▶ चलाएँ' : '⏸ रोकें'; };
  const startJap = () => jap.play().then(() => { $('#japHint').textContent = 'राम नाम गिनने के लिए नीचे टैप करें'; $('#japHint').classList.remove('warn'); })
                                 .catch(() => {});
  jap.onplay = () => { if (cur >= 0 && !audio.paused) audio.pause(); japSync(); };
  jap.onpause = japSync;
  audio.addEventListener('play', () => { if (!jap.paused) jap.pause(); });

  // Page khulte hi chalane ki koshish. Browser sound-autoplay rokta hai,
  // to pehle tap/touch par jap shuru ho jayega.
  let japStarted = false;
  const firstTouch = e => {
    if (japStarted) return;
    if (e.target.closest && e.target.closest('.card, .dock, #japPP')) { cleanup(); return; }  // bhajan chunna ho to jap mat chalao
    japStarted = true; cleanup(); startJap();
  };
  const evs = ['pointerdown', 'touchend', 'click', 'keydown'];
  const cleanup = () => evs.forEach(ev => document.removeEventListener(ev, firstTouch, true));
  const splash = $('#splash');
  const hideSplash = () => { splash.classList.add('out'); setTimeout(() => splash.hidden = true, 650); };
  // 1) Seedha chalane ki koshish (jin browsers me allowed hai wahan page khulte hi bajega)
  // 2) Blocked ho to "प्रवेश करें" screen: ek tap par jap shuru
  jap.play().then(() => { japStarted = true; }).catch(() => { splash.hidden = false; });
  $('#enter').onclick = () => { japStarted = true; cleanup(); startJap(); hideSplash(); };

  $('#tap').addEventListener('click', e => {
    count++; showCount(); saveCount(); japStarted = true;
    if (navigator.vibrate) navigator.vibrate(count % 108 === 0 ? [60, 40, 60] : 12);
    const b = e.currentTarget; b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
    if (jap.paused) startJap();
  });
  $('#japPP').onclick = () => { japStarted = true; jap.paused ? startJap() : jap.pause(); };
  $('#japReset').onclick = () => { if (confirm('Counter 0 karein?')) { count = 0; showCount(); saveCount(); } };
  japSync();

  // ---------- golden embers ----------
  const cv = $('#embers'), cx = cv.getContext('2d');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let W, H, P = [];
    const resize = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
    resize(); addEventListener('resize', resize);
    const mk = init => ({ x: Math.random()*W, y: init ? Math.random()*H : H + 10, r: Math.random()*2.2 + .6, v: Math.random()*.7 + .25, d: Math.random()*Math.PI*2 });
    for (let i = 0; i < (innerWidth < 600 ? 28 : 55); i++) P.push(mk(true));
    (function loop(){
      if (!document.hidden) {
        cx.clearRect(0, 0, W, H);
        P.forEach((p, i) => {
          p.y -= p.v; p.d += .02; p.x += Math.sin(p.d) * .4;
          if (p.y < -10) P[i] = mk(false);
          const g = cx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
          g.addColorStop(0, 'rgba(255,214,120,.95)'); g.addColorStop(1, 'rgba(255,140,0,0)');
          cx.fillStyle = g; cx.beginPath(); cx.arc(p.x, p.y, p.r * 4, 0, 7); cx.fill();
        });
      }
      requestAnimationFrame(loop);
    })();
  }
})();
