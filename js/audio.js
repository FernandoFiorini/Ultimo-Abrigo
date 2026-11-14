'use strict';

// Música e efeitos sonoros gerados na hora com a Web Audio API (sem arquivos de áudio).
const Sound = (() => {
  const P = k => Settings.get(k);

  let ac = null, master, musicBus, sfxBus, musicVerb, sfxVerb, noiseBuf;
  const moodGain = {};
  const MOODS = ['menu', 'day', 'tension', 'night', 'boss'];   // momentos com música própria
  let mood = 'day', step = 0, nextTime = 0, bar = 0;
  let voices = 0;
  const last = {};
  let ambientT = 0, groanT = 0;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const panOf = x => x == null ? 0 : Math.max(-0.8, Math.min(0.8, (x / 480) * 1.6 - 0.8));

  function impulse(sec, decay) {
    const len = Math.floor(ac.sampleRate * sec), b = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  function init() {
    if (ac) { if (ac.state === 'suspended' && !document.hidden) ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();

    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ac.createGain(); master.gain.value = P('vol');
    comp.connect(master); master.connect(ac.destination);

    musicBus = ac.createGain(); musicBus.gain.value = P('music') ? 0.5 * P('musicVol') : 0; musicBus.connect(comp);
    sfxBus = ac.createGain(); sfxBus.gain.value = P('sfx') ? P('sfxVol') : 0; sfxBus.connect(comp);

    musicVerb = ac.createConvolver(); musicVerb.buffer = impulse(3, 2.5);
    const mv = ac.createGain(); mv.gain.value = 0.4; musicVerb.connect(mv); mv.connect(musicBus);
    sfxVerb = ac.createConvolver(); sfxVerb.buffer = impulse(1.6, 3);
    const sv = ac.createGain(); sv.gain.value = 0.3; sfxVerb.connect(sv); sv.connect(sfxBus);

    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    for (const m of MOODS) {
      moodGain[m] = ac.createGain();
      moodGain[m].gain.value = 0;
      moodGain[m].connect(musicBus);
    }
    mood = currentMood();
    moodGain[mood].gain.value = 1;
    nextTime = ac.currentTime + 0.1;
    setInterval(scheduler, 25);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) ac.suspend(); else ac.resume();
    });
  }

  function out(node, bus, pan, send, verb) {
    let n = node;
    if (pan) { const p = ac.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; }
    n.connect(bus);
    if (send) { const s = ac.createGain(); s.gain.value = send; n.connect(s); s.connect(verb); }
  }

  function tone(o) {
    const t = o.t ?? ac.currentTime, a = o.a ?? 0.005, d = o.d ?? 0.2, vol = o.vol ?? 0.2;
    const osc = ac.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + a + d);
    if (o.detune) osc.detune.value = o.detune;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    if (o.hold) g.gain.setValueAtTime(vol, t + a + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + (o.hold || 0) + d);
    let n = osc;
    if (o.filter) {
      const f = ac.createBiquadFilter();
      f.type = o.filter.type || 'lowpass'; f.frequency.value = o.filter.f; f.Q.value = o.filter.q || 0.8;
      osc.connect(f); n = f;
    }
    n.connect(g);
    const music = o.bus === 'music';
    out(g, music ? (o.mood ? moodGain[o.mood] : musicBus) : sfxBus, o.pan, o.send, music ? musicVerb : sfxVerb);
    osc.start(t);
    osc.stop(t + a + (o.hold || 0) + d + 0.05);
    if (!music) { voices++; osc.onended = () => voices--; }
  }

  function noise(o) {
    const t = o.t ?? ac.currentTime, a = o.a ?? 0.002, d = o.d ?? 0.1, vol = o.vol ?? 0.2;
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1000, t); f.Q.value = o.q || 0.8;
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + a + d);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    src.connect(f); f.connect(g);
    const music = o.bus === 'music';
    out(g, music ? (o.mood ? moodGain[o.mood] : musicBus) : sfxBus, o.pan, o.send, music ? musicVerb : sfxVerb);
    src.start(t, Math.random() * 1.5);
    src.stop(t + a + d + 0.05);
    if (!music) { voices++; src.onended = () => voices--; }
  }

  // Som de cada arma do líder
  function weaponSound(w, pan) {
    const t = ac.currentTime;
    switch (w) {
      case 'espingarda':
        noise({ type: 'lowpass', f: 1400, f2: 300, d: 0.3, vol: 0.4, pan, send: 0.3 });
        tone({ f: 95, f2: 38, d: 0.22, vol: 0.4, pan });
        noise({ type: 'bandpass', f: 1800, q: 2, d: 0.05, vol: 0.1, t: t + 0.35, pan });   // engatilhar
        break;
      case 'rifle':
        // estampido pesado: estalo supersônico, soco grave, corpo largo e o eco rolando pela cidade
        noise({ type: 'highpass', f: 3500, d: 0.035, vol: 0.45, pan });
        tone({ type: 'sine', f: 70, f2: 28, d: 0.55, vol: 0.6, pan });
        tone({ type: 'triangle', f: 160, f2: 45, d: 0.25, vol: 0.35, pan });
        noise({ type: 'lowpass', f: 2200, f2: 180, d: 0.7, vol: 0.5, pan, send: 0.7 });
        noise({ type: 'lowpass', f: 900, f2: 150, a: 0.02, d: 0.9, vol: 0.16, t: t + 0.28, pan: -pan * 0.5, send: 0.9 });
        noise({ type: 'lowpass', f: 600, f2: 120, a: 0.03, d: 1.1, vol: 0.08, t: t + 0.65, pan: pan * 0.3, send: 1 });
        // ferrolho: abre e fecha
        noise({ type: 'bandpass', f: 2200, q: 3, d: 0.05, vol: 0.12, t: t + 0.55, pan });
        tone({ type: 'square', f: 900, f2: 600, d: 0.03, vol: 0.04, t: t + 0.56, pan, filter: { f: 2500 } });
        noise({ type: 'bandpass', f: 1600, q: 3, d: 0.06, vol: 0.14, t: t + 0.78, pan });
        break;
      case 'smg':
        noise({ type: 'bandpass', f: 3000, f2: 900, q: 0.8, d: 0.04, vol: 0.14, pan });
        tone({ f: 150, f2: 70, d: 0.04, vol: 0.1, pan });
        break;
      case 'granadas':
        tone({ type: 'triangle', f: 140, f2: 70, d: 0.12, vol: 0.25, pan });
        noise({ type: 'lowpass', f: 600, d: 0.1, vol: 0.12, pan });
        break;
      case 'chamas':
        noise({ type: 'bandpass', f: 700, f2: 1200, q: 0.5, d: 0.2, vol: 0.09, pan });
        break;
      case 'bazuca':
        noise({ type: 'bandpass', f: 300, f2: 2500, q: 0.7, d: 0.4, vol: 0.3, pan, send: 0.4 });
        tone({ f: 80, f2: 40, d: 0.3, vol: 0.35, pan });
        break;
    }
  }

  // Morte de cada chefe: um grito final com a "voz" dele e a queda
  function bossDeath(type, pan, t) {
    const V = {
      saltador:   { w: 'sawtooth', f: 900, f2: 120, q: 4, cut: 1600 },
      rolador:    { w: 'square', f: 160, f2: 40, q: 6, cut: 600 },
      matriarca:  { w: 'sawtooth', f: 1400, f2: 300, q: 6, cut: 2400 },
      colosso:    { w: 'sawtooth', f: 70, f2: 20, q: 8, cut: 350 },
      escavador:  { w: 'sawtooth', f: 200, f2: 50, q: 5, cut: 700 },
      colossal:   { w: 'sawtooth', f: 120, f2: 60, q: 3, cut: 500 },
      carcaca:    { w: 'square', f: 300, f2: 60, q: 7, cut: 900 },
      cuspideira: { w: 'sawtooth', f: 260, f2: 60, q: 9, cut: 700 },
      reiuivador: { w: 'sawtooth', f: 700, f2: 90, q: 3, cut: 1800 },
      gigante:    { w: 'sawtooth', f: 150, f2: 40, q: 7, cut: 600 },
      chefao:     { w: 'triangle', f: 400, f2: 150, q: 2, cut: 1500 },
    }[type] || { w: 'sawtooth', f: 90, f2: 25, q: 6, cut: 500 };
    tone({ type: V.w, f: V.f, f2: V.f2, a: 0.05, d: 1.6, vol: 0.18, filter: { type: 'bandpass', f: V.cut, q: V.q }, pan, send: 0.6 });
    tone({ f: 60, f2: 25, d: 0.6, vol: 0.4, t: t + 0.9, pan });
    noise({ type: 'lowpass', f: 400, d: 1, vol: 0.25, t: t + 0.9, pan, send: 0.4 });
    if (type === 'carcaca') for (let i = 0; i < 10; i++) noise({ type: 'highpass', f: 2500, d: 0.03, vol: 0.1, t: t + 0.9 + i * 0.05, pan });
    if (type === 'colosso') for (let i = 0; i < 6; i++) tone({ f: rand(60, 120), f2: 30, d: 0.3, vol: 0.15, t: t + 0.95 + i * 0.09, pan });
  }

  // Evita sobrecarga quando muitos sons acontecem juntos
  function allow(name, gap) {
    if (!ac || ac.state !== 'running' || !P('sfx') || voices > 48) return false;
    const now = ac.currentTime;
    if (last[name] && now - last[name] < gap) return false;
    last[name] = now;
    return true;
  }

  const SFX = {
    shot(d) {
      const pan = panOf(d.src === 'player' ? 60 : 180);
      if (d.quiet) return;
      if (d.src === 'player' && d.w && d.w !== 'pistola') { weaponSound(d.w, pan); return; }
      if (d.src === 'rock') {
        noise({ type: 'highpass', f: 2500, d: 0.08, vol: 0.05, pan });
        return;
      }
      const big = d.src === 'player', tw = d.src === 'tower';
      noise({ type: 'bandpass', f: tw ? 1800 : 2600, f2: 500, q: 0.7, d: big ? 0.12 : 0.08, vol: big ? 0.32 : 0.16, pan });
      tone({ f: big ? 170 : 140, f2: 50, d: 0.09, vol: big ? 0.3 : 0.14, pan });
      if (big) noise({ type: 'lowpass', f: 700, d: 0.35, vol: 0.05, pan, send: 0.4 });
      if (d.miss && Math.random() < 0.5) {
        // ricochete (só em metade dos erros, para não poluir)
        const t = ac.currentTime + 0.05, f = rand(2200, 3200);
        tone({ type: 'sine', f, f2: f * 0.45, a: 0.003, d: 0.22, vol: 0.035, t, pan: pan + 0.2, send: 0.4 });
      }
    },
    // sons leves e distantes que dão vida à cidade em ruínas
    ambience(d) {
      const t = ac.currentTime, pan = Math.max(-0.9, Math.min(0.9, panOf(d.x) * 1.1));
      switch (d.kind) {
        case 'glass':
          noise({ type: 'highpass', f: 5000, d: 0.12, vol: 0.03, pan, send: 0.6 });
          for (let i = 0; i < 6; i++) tone({ type: 'sine', f: rand(2600, 5200), d: rand(0.05, 0.2), vol: 0.012, t: t + 0.02 + i * rand(0.015, 0.05), pan, send: 0.6 });
          break;
        case 'debris':
          noise({ type: 'lowpass', f: 900, f2: 200, a: 0.05, d: 0.9, vol: 0.05, pan, send: 0.7 });
          for (let i = 0; i < 3; i++) tone({ f: rand(70, 110), f2: 45, d: 0.12, vol: 0.05, t: t + 0.12 + i * rand(0.12, 0.2), pan, send: 0.6 });
          for (let i = 0; i < 4; i++) noise({ type: 'bandpass', f: rand(1500, 2600), q: 3, d: 0.02, vol: 0.02, t: t + 0.5 + i * 0.07, pan });
          break;
        case 'metal': {
          const f0 = rand(280, 480);
          for (const m of [1, 2.76, 5.4]) tone({ type: 'sine', f: f0 * m, d: 1.3, vol: 0.016 / m, pan, send: 0.8 });
          break;
        }
        case 'creak':
          tone({ type: 'sawtooth', f: rand(80, 110), f2: rand(55, 70), a: 0.3, d: 0.9, vol: 0.016, filter: { type: 'bandpass', f: 800, q: 8 }, pan, send: 0.6 });
          break;
        case 'alarm':
          // alarme de carro ao longe, que logo para
          for (let i = 0; i < 6; i++) tone({ type: 'square', f: i % 2 ? 700 : 920, d: 0.16, vol: 0.006, t: t + i * 0.2, filter: { f: 1800 }, pan, send: 0.9 });
          break;
        case 'shot':
          noise({ type: 'lowpass', f: 700, d: 0.25, vol: 0.05, pan, send: 0.95 });
          if (Math.random() < 0.5) noise({ type: 'lowpass', f: 650, d: 0.22, vol: 0.035, t: t + rand(0.3, 0.6), pan, send: 0.95 });
          break;
      }
    },
    noAmmo() { tone({ type: 'square', f: 1400, d: 0.03, vol: 0.04, filter: { f: 3000 } }); },
    weaponSwap() {
      const t = ac.currentTime;
      noise({ type: 'bandpass', f: 2200, q: 3, d: 0.04, vol: 0.08 });
      noise({ type: 'bandpass', f: 1500, q: 3, d: 0.05, vol: 0.08, t: t + 0.08 });
    },
    lwAmmo() { tone({ type: 'triangle', f: 990, f2: 1480, d: 0.1, vol: 0.05 }); },
    // recarga: pente saindo e entrando (a espingarda engatilha)
    reload(d) {
      const t = ac.currentTime;
      if (d.phase === 'start') {
        noise({ type: 'bandpass', f: 1400, q: 3, d: 0.05, vol: 0.1 });
        tone({ type: 'square', f: 500, f2: 350, d: 0.04, vol: 0.03, filter: { f: 1800 } });
      } else {
        noise({ type: 'bandpass', f: 2000, q: 3, d: 0.04, vol: 0.12 });
        noise({ type: 'bandpass', f: 2600, q: 4, d: 0.04, vol: 0.12, t: t + 0.09 });
        if (d.k === 'espingarda' || d.k === 'rifle') noise({ type: 'bandpass', f: 1600, q: 3, d: 0.06, vol: 0.12, t: t + 0.2 });
      }
    },
    outOfRange() { tone({ type: 'square', f: 300, d: 0.05, vol: 0.025, filter: { f: 1200 } }); },
    hit(d) {
      noise({ type: 'lowpass', f: 900, d: 0.06, vol: 0.1, pan: panOf(d.x) });
      tone({ f: 110, f2: 60, d: 0.05, vol: 0.06, pan: panOf(d.x) });
    },
    zdeath(d) {
      const pan = panOf(d.x), t = ac.currentTime;
      if (d.type === 'chefe') {
        tone({ type: 'sawtooth', f: 90, f2: 25, a: 0.05, d: 2, vol: 0.3, filter: { f: 500, q: 6 }, pan, send: 0.5 });
        noise({ type: 'lowpass', f: 300, d: 1.5, vol: 0.3, t: t + 0.4, pan });
        return;
      }
      if (ZTYPES[d.type] && ZTYPES[d.type].boss) { bossDeath(d.type, pan, t); return; }
      if (d.type === 'cria') { tone({ type: 'square', f: 2200, f2: 900, d: 0.08, vol: 0.025, filter: { f: 4000 }, pan }); return; }
      if (d.type === 'explosivo') return; // o som é o da explosão
      tone({ type: 'sawtooth', f: rand(85, 140), f2: rand(40, 55), a: 0.03, d: rand(0.35, 0.6), vol: 0.06, filter: { f: 650, q: 5 }, pan });
      tone({ f: 75, f2: 38, d: 0.16, vol: 0.14, t: t + 0.28, pan });
      noise({ type: 'lowpass', f: 500, d: 0.1, vol: 0.06, t: t + 0.28, pan });
    },
    wallHit() {
      tone({ f: 95, f2: 48, d: 0.18, vol: 0.22, pan: -0.2 });
      noise({ type: 'bandpass', f: 420, q: 2, d: 0.08, vol: 0.14, pan: -0.2 });
    },
    wallDown() {
      noise({ type: 'lowpass', f: 1600, f2: 150, d: 1.1, vol: 0.4, pan: -0.2, send: 0.4 });
      tone({ f: 60, f2: 30, d: 0.9, vol: 0.35 });
    },
    breach() {
      const t = ac.currentTime;
      for (let i = 0; i < 2; i++) {
        tone({ type: 'square', f: 880, d: 0.12, vol: 0.04, t: t + i * 0.28, filter: { f: 2200 } });
        tone({ type: 'square', f: 660, d: 0.12, vol: 0.04, t: t + i * 0.28 + 0.14, filter: { f: 2200 } });
      }
      tone({ type: 'sawtooth', f: 520, f2: 260, a: 0.02, d: 0.5, vol: 0.05, filter: { f: 1500, q: 3 }, t: t + 0.05 });
    },
    // golpe corpo a corpo (pá, cano, taco) dentro do abrigo
    melee(d) {
      const pan = panOf(d.x);
      if (d.hit) {
        tone({ f: 140, f2: 60, d: 0.1, vol: 0.12, pan });
        noise({ type: 'bandpass', f: 700, q: 1.5, d: 0.07, vol: 0.1, pan });
      } else noise({ type: 'highpass', f: 2500, d: 0.08, vol: 0.03, pan });
    },
    injured(d) {
      const pan = panOf(d.x);
      tone({ type: 'triangle', f: 330, f2: 220, a: 0.01, d: 0.25, vol: 0.06, pan });
      noise({ type: 'lowpass', f: 900, d: 0.12, vol: 0.08, pan });
    },
    bitten(d) {
      const pan = panOf(d.x), t = ac.currentTime;
      noise({ type: 'bandpass', f: 1800, q: 4, d: 0.08, vol: 0.12, pan });
      tone({ type: 'sawtooth', f: 520, f2: 760, a: 0.02, d: 0.45, vol: 0.06, filter: { f: 2400, q: 2 }, pan, t: t + 0.05 });
      tone({ f: 70, f2: 40, d: 0.3, vol: 0.12, t: t + 0.05 });
    },
    biteChoice(d) {
      if (d.kill) { tone({ f: 120, f2: 50, d: 0.35, vol: 0.2 }); noise({ type: 'lowpass', f: 1200, f2: 200, d: 0.3, vol: 0.12 }); }
      else noise({ type: 'lowpass', f: 600, f2: 300, d: 0.8, vol: 0.06, send: 0.4 });
    },
    healed() {
      const t = ac.currentTime;
      tone({ type: 'triangle', f: 523, d: 0.12, vol: 0.06, t });
      tone({ type: 'triangle', f: 784, d: 0.18, vol: 0.06, t: t + 0.1 });
    },
    explode(d) {
      const pan = panOf(d.x);
      noise({ type: 'lowpass', f: 2200, f2: 90, d: 1.2, vol: 0.55, pan, send: 0.4 });
      tone({ f: 85, f2: 28, d: 0.9, vol: 0.5, pan });
    },
    spit(d) {
      const pan = panOf(d.x), t = ac.currentTime;
      if (d.proj === 'rock') {   // pedra arremessada: zunido e pancada no muro
        noise({ type: 'bandpass', f: 600, q: 1, d: 0.25, vol: 0.05, pan });
        tone({ f: 120, f2: 60, d: 0.12, vol: 0.12, t: t + 0.6, pan: -0.2 });
        return;
      }
      if (d.proj === 'grenade') {   // granada do Chefe Saqueador: assobio e explosão no muro
        tone({ type: 'sine', f: 1800, f2: 900, d: 0.55, vol: 0.03, pan });
        tone({ f: 80, f2: 30, d: 0.5, vol: 0.35, t: t + 0.6, pan: -0.2 });
        noise({ type: 'lowpass', f: 1800, f2: 120, d: 0.6, vol: 0.3, t: t + 0.6, pan: -0.2, send: 0.4 });
        return;
      }
      if (d.proj === 'molotov') {   // garrafa quebrando e fogo
        noise({ type: 'highpass', f: 5000, d: 0.12, vol: 0.08, t: t + 0.6, pan: -0.2 });
        noise({ type: 'lowpass', f: 900, a: 0.05, d: 0.7, vol: 0.12, t: t + 0.62, pan: -0.2 });
        return;
      }
      tone({ f: 280, f2: 900, d: 0.12, vol: 0.06, pan });
      noise({ type: 'bandpass', f: 1300, q: 3, d: 0.12, vol: 0.05, pan });
      noise({ type: 'highpass', f: 4000, d: 0.45, vol: 0.04, t: t + 0.6, pan: -0.2 });
    },
    // sirene de alerta antes de uma onda perigosa
    dangerWarn() {
      const t = ac.currentTime;
      for (let i = 0; i < 3; i++) {
        tone({ type: 'sawtooth', f: 520, f2: 1040, a: 0.05, d: 0.6, vol: 0.05, t: t + i * 1.2, filter: { f: 2400 }, send: 0.5 });
        tone({ type: 'sawtooth', f: 1040, f2: 520, a: 0.05, d: 0.6, vol: 0.05, t: t + i * 1.2 + 0.6, filter: { f: 2400 }, send: 0.5 });
      }
    },
    countdown(d) {
      const last = d.n === 1;
      tone({ type: 'square', f: last ? 1320 : 880, d: last ? 0.35 : 0.12, vol: 0.06, filter: { f: 3000 } });
    },
    rush() {
      const t = ac.currentTime;
      tone({ type: 'sawtooth', f: 98, a: 0.05, hold: 0.8, d: 1, vol: 0.15, filter: { f: 700, q: 3 }, send: 0.5 });
      tone({ type: 'sawtooth', f: 147, a: 0.05, hold: 0.8, d: 1, vol: 0.1, filter: { f: 700, q: 3 }, send: 0.5 });
      for (let i = 0; i < 6; i++) {
        const f = rand(70, 140);
        tone({ type: 'sawtooth', f, f2: f * 0.6, a: 0.1, d: rand(0.6, 1.2), vol: 0.05, t: t + rand(0, 0.6), filter: { f: 600, q: 5 }, pan: rand(0.2, 0.9) });
      }
    },
    zbuff(d) {
      const pan = panOf(d.x), t = ac.currentTime;
      if (d.kind === 'haste') {   // grito agudo
        tone({ type: 'sawtooth', f: 380, f2: 1100, a: 0.02, d: 0.5, vol: 0.06, filter: { type: 'bandpass', f: 1400, q: 3 }, pan, send: 0.5 });
        tone({ type: 'sawtooth', f: 1100, f2: 500, d: 0.4, vol: 0.04, t: t + 0.45, filter: { type: 'bandpass', f: 1200, q: 3 }, pan });
      } else {   // estouro úmido de esporos
        noise({ type: 'lowpass', f: 700, f2: 200, d: 0.5, vol: 0.12, pan });
        tone({ f: 160, f2: 70, d: 0.25, vol: 0.08, pan });
      }
    },
    armor(d) {
      const pan = panOf(d.x), f = rand(2400, 3200);
      tone({ type: 'triangle', f, f2: f * 0.8, d: 0.12, vol: 0.04, pan });
      tone({ type: 'sine', f: f * 1.5, d: 0.08, vol: 0.02, pan });
    },
    headshot(d) {
      const pan = panOf(d.x);
      noise({ type: 'bandpass', f: 3000, q: 2, d: 0.05, vol: 0.1, pan });
      tone({ f: 200, f2: 60, d: 0.08, vol: 0.12, pan });
    },
    waveStart(d) {
      const t = ac.currentTime;
      tone({ type: 'sawtooth', f: 110, a: 0.35, hold: 0.8, d: 0.9, vol: 0.12, filter: { f: 900 }, send: 0.5 });
      tone({ type: 'sawtooth', f: 165, a: 0.35, hold: 0.8, d: 0.9, vol: 0.08, filter: { f: 900 }, send: 0.5, detune: 8 });
      tone({ f: 120, f2: 40, d: 0.5, vol: 0.5, t });
      tone({ f: 120, f2: 40, d: 0.5, vol: 0.5, t: t + 0.5 });
      if (d && d.boss) tone({ type: 'sawtooth', f: 55, a: 0.5, hold: 1, d: 1, vol: 0.12, filter: { f: 400, q: 4 } });
      if (d && d.event) {
        // acorde sinistro para noites especiais
        [38, 41, 44, 47].forEach((m, i) => tone({ type: 'sawtooth', f: mtof(m), a: 0.6, hold: 1.2, d: 1.5, vol: 0.05, t: t + 0.8 + i * 0.05, filter: { f: 700, q: 2 }, send: 0.7 }));
        noise({ type: 'lowpass', f: 300, a: 0.5, d: 2, vol: 0.15, t: t + 0.8 });
      }
    },
    // cada chefe chega com um rugido próprio
    bossSpawn(d) {
      const t = ac.currentTime, pan = 0.6;
      switch (d.type) {
        case 'saltador':   // guincho agudo e respiração ofegante
          tone({ type: 'sawtooth', f: 300, f2: 1300, a: 0.05, d: 0.6, vol: 0.09, filter: { type: 'bandpass', f: 1500, q: 4 }, pan, send: 0.6 });
          for (let i = 0; i < 4; i++) noise({ type: 'bandpass', f: 900, q: 2, a: 0.04, d: 0.14, vol: 0.08, t: t + 0.7 + i * 0.22, pan });
          break;
        case 'rolador':    // placas rangendo e um ronco grave
          for (let i = 0; i < 5; i++) tone({ type: 'square', f: rand(160, 260), f2: rand(90, 140), d: 0.12, vol: 0.04, t: t + i * 0.1, filter: { f: 900, q: 6 }, pan });
          tone({ type: 'sawtooth', f: 70, f2: 45, a: 0.1, d: 1.3, vol: 0.2, filter: { f: 400, q: 6 }, t: t + 0.4, pan, send: 0.5 });
          break;
        case 'matriarca':  // chiado de inseto com muitos estalos
          noise({ type: 'bandpass', f: 4200, q: 6, a: 0.2, d: 1.2, vol: 0.06, pan, send: 0.5 });
          for (let i = 0; i < 12; i++) noise({ type: 'bandpass', f: rand(2000, 3500), q: 5, d: 0.02, vol: 0.06, t: t + i * 0.07, pan });
          tone({ type: 'sawtooth', f: 140, f2: 90, a: 0.2, d: 1, vol: 0.1, filter: { f: 700, q: 8 }, t: t + 0.3, pan });
          break;
        case 'colosso':    // passos de pedra pesadíssimos
          for (let i = 0; i < 3; i++) { tone({ f: 55, f2: 28, d: 0.5, vol: 0.45, t: t + i * 0.55, pan }); noise({ type: 'lowpass', f: 500, d: 0.4, vol: 0.2, t: t + i * 0.55, pan, send: 0.5 }); }
          tone({ type: 'sawtooth', f: 48, a: 0.3, hold: 0.6, d: 1, vol: 0.15, filter: { f: 300, q: 5 }, t: t + 1.6, pan, send: 0.6 });
          break;
        case 'escavador':  // terra sendo revirada e uma picareta
          noise({ type: 'lowpass', f: 700, f2: 200, a: 0.1, d: 1.2, vol: 0.2, pan, send: 0.4 });
          for (let i = 0; i < 3; i++) tone({ type: 'triangle', f: 1400, d: 0.25, vol: 0.05, t: t + 0.3 + i * 0.35, pan, send: 0.6 });
          break;
        case 'colossal':   // borbulhar enorme
          for (let i = 0; i < 10; i++) tone({ f: rand(80, 200), f2: rand(250, 400), a: 0.02, d: 0.12, vol: 0.08, t: t + i * rand(0.07, 0.14), pan });
          tone({ type: 'sawtooth', f: 60, f2: 40, a: 0.3, d: 1.4, vol: 0.15, filter: { f: 350, q: 6 }, pan, send: 0.5 });
          break;
        case 'carcaca':    // ossos estalando
          for (let i = 0; i < 8; i++) noise({ type: 'highpass', f: 2500, d: 0.03, vol: 0.12, t: t + i * rand(0.06, 0.13), pan, send: 0.4 });
          tone({ type: 'sawtooth', f: 90, f2: 50, a: 0.1, d: 1.4, vol: 0.18, filter: { f: 500, q: 8 }, t: t + 0.5, pan, send: 0.6 });
          break;
        case 'cuspideira': // gorgolejo ácido
          tone({ type: 'sawtooth', f: 180, f2: 70, a: 0.1, d: 1.1, vol: 0.12, filter: { type: 'bandpass', f: 600, q: 9 }, pan, send: 0.5 });
          for (let i = 0; i < 8; i++) tone({ f: rand(300, 600), f2: rand(700, 1000), d: 0.07, vol: 0.05, t: t + 0.2 + i * 0.1, pan });
          break;
        case 'reiuivador': // uivo longo e majestoso
          tone({ type: 'sawtooth', f: 220, f2: 660, a: 0.4, hold: 0.4, d: 1.2, vol: 0.08, filter: { type: 'bandpass', f: 900, q: 3 }, pan, send: 0.8 });
          tone({ type: 'sawtooth', f: 330, f2: 990, a: 0.4, hold: 0.4, d: 1.2, vol: 0.05, filter: { type: 'bandpass', f: 1300, q: 3 }, pan, send: 0.8 });
          break;
        case 'gigante':    // estouro úmido de esporos
          for (let i = 0; i < 6; i++) noise({ type: 'lowpass', f: 800, f2: 200, d: 0.25, vol: 0.12, t: t + i * 0.18, pan });
          tone({ type: 'sawtooth', f: 85, f2: 45, a: 0.2, d: 1.5, vol: 0.18, filter: { f: 450, q: 7 }, pan, send: 0.6 });
          break;
        case 'chefao':     // grito de guerra e apito
          tone({ type: 'square', f: 2200, d: 0.5, vol: 0.04, filter: { f: 4000 }, pan, send: 0.5 });
          tone({ type: 'square', f: 2200, d: 0.25, vol: 0.04, t: t + 0.6, filter: { f: 4000 }, pan, send: 0.5 });
          tone({ type: 'sawtooth', f: 160, f2: 240, a: 0.05, d: 0.6, vol: 0.08, filter: { type: 'bandpass', f: 800, q: 3 }, t: t + 0.9, pan, send: 0.5 });
          break;
        default:           // Abominação
          tone({ type: 'sawtooth', f: 75, f2: 38, a: 0.1, d: 1.9, vol: 0.3, filter: { f: 480, q: 7 }, pan, send: 0.6 });
          tone({ type: 'sawtooth', f: 112, f2: 50, a: 0.1, d: 1.7, vol: 0.15, filter: { f: 600, q: 5 }, pan });
          noise({ type: 'lowpass', f: 420, d: 1.6, vol: 0.25, pan });
      }
    },
    // ações especiais dos chefes
    boss(d) {
      const pan = panOf(d.x), t = ac.currentTime;
      switch (d.k) {
        case 'crouch': tone({ type: 'sawtooth', f: 90, f2: 160, a: 0.3, d: 0.9, vol: 0.08, filter: { f: 600, q: 6 }, pan }); break;   // tensão subindo
        case 'leap': noise({ type: 'bandpass', f: 400, f2: 2000, q: 1, d: 0.5, vol: 0.12, pan }); tone({ type: 'sawtooth', f: 500, f2: 1400, d: 0.3, vol: 0.05, filter: { type: 'bandpass', f: 1200, q: 3 }, pan }); break;
        case 'land':
          tone({ f: 60, f2: 22, d: 0.8, vol: 0.6, pan: -0.2 });
          noise({ type: 'lowpass', f: 1500, f2: 120, d: 0.9, vol: 0.45, pan: -0.2, send: 0.5 });
          noise({ type: 'bandpass', f: 400, q: 2, d: 0.2, vol: 0.2, t: t + 0.05, pan: -0.2 });
          break;
        case 'interrupt': tone({ type: 'triangle', f: 880, f2: 440, d: 0.3, vol: 0.08, pan }); tone({ type: 'sawtooth', f: 200, f2: 90, d: 0.4, vol: 0.08, filter: { f: 900 }, pan }); break;
        case 'curl': for (let i = 0; i < 4; i++) tone({ type: 'square', f: rand(200, 320), f2: 120, d: 0.06, vol: 0.04, t: t + i * 0.12, filter: { f: 1000, q: 4 }, pan }); break;
        case 'roll': noise({ type: 'lowpass', f: 300, a: 0.1, d: 1.2, vol: 0.25, pan }); tone({ type: 'sawtooth', f: 40, f2: 70, a: 0.2, d: 1, vol: 0.1, filter: { f: 300 }, pan }); break;
        case 'impact':
          tone({ f: 70, f2: 25, d: 0.7, vol: 0.6, pan: -0.2 });
          noise({ type: 'lowpass', f: 2500, f2: 150, d: 0.7, vol: 0.45, pan: -0.2, send: 0.4 });
          for (let i = 0; i < 3; i++) tone({ type: 'square', f: rand(300, 600), d: 0.08, vol: 0.03, t: t + 0.1 + i * 0.07, filter: { f: 1500 }, pan: -0.2 });
          break;
        case 'daze': for (let i = 0; i < 3; i++) tone({ type: 'sine', f: 1200 + i * 300, f2: 900 + i * 300, d: 0.15, vol: 0.04, t: t + i * 0.12, pan }); break;   // "piu piu"
        case 'brood': for (let i = 0; i < d.n; i++) { noise({ type: 'lowpass', f: 900, f2: 300, d: 0.15, vol: 0.1, t: t + i * 0.15, pan }); tone({ type: 'square', f: 1800, f2: 2600, d: 0.06, vol: 0.02, t: t + i * 0.15 + 0.08, filter: { f: 4000 }, pan }); } break;
        case 'shell':
          noise({ type: 'highpass', f: 1200, d: 0.5, vol: 0.3, pan, send: 0.4 });
          for (let i = 0; i < 8; i++) tone({ f: rand(80, 200), f2: 40, d: 0.15, vol: 0.12, t: t + i * 0.05, pan });
          tone({ type: 'sawtooth', f: 100, f2: 300, a: 0.1, d: 0.8, vol: 0.12, filter: { f: 900, q: 5 }, t: t + 0.3, pan, send: 0.5 });
          break;
        case 'dig': case 'rise':
          noise({ type: 'lowpass', f: 600, f2: 150, a: 0.05, d: d.k === 'rise' ? 0.8 : 1, vol: 0.3, pan, send: 0.3 });
          if (d.k === 'rise') tone({ f: 80, f2: 35, d: 0.4, vol: 0.35, pan });
          break;
        case 'fuse':   // chiado de pavio acelerando
          noise({ type: 'highpass', f: 4000, a: 0.05, d: 2, vol: 0.06, pan: -0.2 });
          for (let i = 0; i < 10; i++) tone({ type: 'square', f: 1000, d: 0.04, vol: 0.04, t: t + 2 * (1 - Math.pow(1 - i / 10, 0.6)), filter: { f: 3000 }, pan: -0.2 });
          break;
        case 'wallBoom': tone({ f: 45, f2: 18, d: 1.6, vol: 0.7 }); noise({ type: 'lowpass', f: 1200, f2: 60, d: 2, vol: 0.5, send: 0.6 }); break;
        case 'farBoom': [72, 76, 79].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.25, vol: 0.06, t: t + 0.4 + i * 0.08 })); break;
        case 'nearBoom': tone({ type: 'sawtooth', f: 300, f2: 120, d: 0.6, vol: 0.06, filter: { f: 900 }, t: t + 0.3 }); break;
        case 'open': tone({ type: 'sawtooth', f: 120, f2: 60, a: 0.05, d: 0.5, vol: 0.12, filter: { f: 700, q: 8 }, pan }); noise({ type: 'lowpass', f: 900, f2: 300, d: 0.3, vol: 0.1, pan }); tone({ type: 'triangle', f: 660, d: 0.2, vol: 0.05, t: t + 0.1, pan }); break;
        case 'close': for (let i = 0; i < 2; i++) noise({ type: 'highpass', f: 2500, d: 0.04, vol: 0.12, t: t + i * 0.08, pan }); break;
        case 'lobTell': tone({ type: 'sawtooth', f: 120, f2: 260, a: 0.2, d: 0.5, vol: 0.06, filter: { type: 'bandpass', f: 500, q: 8 }, pan }); break;
        case 'acid':
          tone({ f: 200, f2: 700, d: 0.2, vol: 0.08, pan }); noise({ type: 'bandpass', f: 900, q: 3, d: 0.2, vol: 0.08, pan });
          noise({ type: 'highpass', f: 3500, a: 0.02, d: 0.9, vol: 0.08, t: t + 0.85, pan: -0.2 });   // chiado do ácido no muro
          tone({ f: 90, f2: 50, d: 0.15, vol: 0.12, t: t + 0.85, pan: -0.2 });
          break;
        case 'howlTell': tone({ type: 'sawtooth', f: 110, f2: 220, a: 1, d: 0.3, vol: 0.05, filter: { f: 800, q: 4 }, pan }); break;
        case 'howl':
          tone({ type: 'sawtooth', f: 260, f2: 820, a: 0.05, hold: 0.3, d: 0.9, vol: 0.09, filter: { type: 'bandpass', f: 1100, q: 3 }, pan, send: 0.8 });
          tone({ type: 'sawtooth', f: 390, f2: 1230, a: 0.05, hold: 0.3, d: 0.9, vol: 0.06, filter: { type: 'bandpass', f: 1500, q: 3 }, pan, send: 0.8 });
          tone({ type: 'sawtooth', f: 130, f2: 400, a: 0.05, hold: 0.3, d: 0.9, vol: 0.06, filter: { f: 700, q: 3 }, pan, send: 0.8 });
          break;
        case 'stunAll': tone({ type: 'sine', f: 2400, f2: 600, d: 1.2, vol: 0.07, send: 0.8 }); noise({ type: 'lowpass', f: 400, d: 1, vol: 0.15 }); break;
        case 'split':
          noise({ type: 'lowpass', f: 1200, f2: 250, d: 0.4, vol: d.big ? 0.3 : 0.15, pan });
          tone({ f: 180, f2: 60, d: 0.3, vol: d.big ? 0.2 : 0.1, pan });
          break;
        case 'smash':
          if (d.type === 'chefe') break;
          tone({ f: 75, f2: 35, d: 0.3, vol: 0.3, pan: -0.2 }); noise({ type: 'lowpass', f: 900, d: 0.2, vol: 0.18, pan: -0.2 });
          break;
      }
    },
    waveEnd() {
      const t = ac.currentTime;
      [72, 76, 79, 84].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.8, vol: 0.08, t: t + i * 0.11, send: 0.6 }));
    },
    scavenge() {
      noise({ type: 'bandpass', f: rand(2500, 3500), q: 1.5, d: 0.07, vol: 0.06 });
      tone({ type: 'triangle', f: rand(700, 900), f2: rand(1100, 1300), d: 0.07, vol: 0.05 });
    },
    harvest(d) {
      const pan = panOf(d.x);
      noise({ type: 'highpass', f: 2500, d: 0.14, vol: 0.035, pan });
      tone({ f: 520, f2: 820, d: 0.06, vol: 0.035, pan, t: ac.currentTime + 0.08 });
    },
    recruit() {
      // passos chegando, porta rangendo e um "olá" musical
      const t = ac.currentTime;
      for (let i = 0; i < 3; i++) noise({ type: 'lowpass', f: 600, d: 0.06, vol: 0.08, t: t + i * 0.16, pan: -0.6 + i * 0.15 });
      tone({ type: 'sawtooth', f: 180, f2: 260, a: 0.05, d: 0.3, vol: 0.025, filter: { f: 900, q: 8 }, t: t + 0.45, pan: -0.4 });
      [67, 71, 74, 79].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.35, vol: 0.07, t: t + 0.6 + i * 0.09, send: 0.5 }));
    },
    assign(d) {
      const t = ac.currentTime;
      switch (d.k) {
        case 'forrageiro': // pá cavando terra e folhas
          noise({ type: 'lowpass', f: 900, f2: 300, d: 0.18, vol: 0.12, t });
          noise({ type: 'highpass', f: 3000, d: 0.15, vol: 0.04, t: t + 0.15 });
          tone({ type: 'triangle', f: mtof(72), d: 0.25, vol: 0.05, t: t + 0.2, send: 0.3 });
          tone({ type: 'triangle', f: mtof(79), d: 0.3, vol: 0.05, t: t + 0.3, send: 0.3 });
          break;
        case 'coletor': // sucata metálica batendo
          for (let i = 0; i < 3; i++) {
            tone({ type: 'square', f: rand(700, 1400), d: 0.1, vol: 0.025, t: t + i * 0.09, filter: { type: 'bandpass', f: 1800, q: 6 } });
            noise({ type: 'bandpass', f: 3500, q: 4, d: 0.06, vol: 0.05, t: t + i * 0.09 });
          }
          break;
        case 'armeiro': // martelo na bigorna
          tone({ type: 'triangle', f: 1760, d: 0.6, vol: 0.06, t, send: 0.4 });
          tone({ type: 'sine', f: 2637, d: 0.4, vol: 0.03, t });
          noise({ type: 'bandpass', f: 2500, d: 0.03, vol: 0.12, t });
          tone({ type: 'triangle', f: 1760, d: 0.5, vol: 0.05, t: t + 0.22, send: 0.4 });
          noise({ type: 'bandpass', f: 2500, d: 0.03, vol: 0.1, t: t + 0.22 });
          break;
        case 'guarda': // engatilhando a arma
          noise({ type: 'bandpass', f: 2200, q: 3, d: 0.04, vol: 0.18, t });
          tone({ type: 'square', f: 900, d: 0.02, vol: 0.04, t, filter: { f: 3000 } });
          noise({ type: 'bandpass', f: 1600, q: 3, d: 0.05, vol: 0.2, t: t + 0.14 });
          tone({ type: 'square', f: 600, d: 0.03, vol: 0.05, t: t + 0.14, filter: { f: 3000 } });
          break;
        case 'medico': // bipe de monitor cardíaco
          tone({ type: 'sine', f: 1046, d: 0.12, vol: 0.06, t });
          tone({ type: 'sine', f: 1046, d: 0.12, vol: 0.06, t: t + 0.25 });
          tone({ type: 'sine', f: 60, f2: 40, d: 0.12, vol: 0.15, t: t + 0.05 });
          break;
      }
    },
    cash() {
      // "cha-ching" de caixa registradora
      const t = ac.currentTime;
      noise({ type: 'bandpass', f: 3000, q: 2, d: 0.05, vol: 0.12, t });
      tone({ type: 'square', f: 1568, d: 0.12, vol: 0.04, t: t + 0.05, filter: { f: 5000 } });
      tone({ type: 'square', f: 2093, d: 0.5, vol: 0.05, t: t + 0.13, filter: { f: 5000 }, send: 0.5 });
      tone({ type: 'sine', f: 4186, d: 0.4, vol: 0.02, t: t + 0.13 });
    },
    shop(d) {
      const t = ac.currentTime;
      SFX.cash();
      if (d.k === 'aereo') {
        // jatos passando
        noise({ type: 'bandpass', f: 400, f2: 2500, q: 1.2, a: 0.6, d: 1.4, vol: 0.3, t, pan: -0.6 });
        noise({ type: 'lowpass', f: 300, a: 0.5, d: 1.5, vol: 0.25, t, pan: 0.2 });
      } else if (d.k === 'prod2x' || d.k === 'furia') {
        [60, 64, 67, 72, 76, 79].forEach((m, i) => tone({ type: 'sawtooth', f: mtof(m + (d.k === 'furia' ? -3 : 0)), d: 0.3, vol: 0.035, t: t + 0.2 + i * 0.05, filter: { f: 2500 }, send: 0.4 }));
      } else if (d.k.startsWith('tempo')) {
        tone({ f: 300, f2: 1800, a: 0.02, d: 0.6, vol: 0.06, t: t + 0.15, send: 0.5 });
        noise({ type: 'bandpass', f: 1500, f2: 6000, d: 0.6, vol: 0.05, t: t + 0.15 });
      }
    },
    sample() {
      // tilintar de tubo de ensaio
      const t = ac.currentTime;
      tone({ type: 'sine', f: 2637, d: 0.25, vol: 0.04, t, send: 0.5 });
      tone({ type: 'sine', f: 3520, d: 0.2, vol: 0.03, t: t + 0.06, send: 0.5 });
      tone({ type: 'sine', f: 400, f2: 900, d: 0.1, vol: 0.03, t: t + 0.12 });
    },
    research() {
      // borbulhar do laboratório e um acorde de descoberta
      const t = ac.currentTime;
      for (let i = 0; i < 5; i++) tone({ type: 'sine', f: rand(500, 900), f2: rand(1000, 1600), d: 0.06, vol: 0.03, t: t + i * 0.07 });
      [69, 73, 76, 81].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.6, vol: 0.05, t: t + 0.35 + i * 0.06, send: 0.6 }));
    },
    crit() {
      noise({ type: 'bandpass', f: 4000, q: 2, d: 0.05, vol: 0.08 });
    },
    trap() {
      tone({ type: 'square', f: 200, f2: 80, d: 0.06, vol: 0.05, filter: { f: 1500 } });
      noise({ type: 'bandpass', f: 2500, d: 0.04, vol: 0.06 });
    },
    shock() {
      tone({ type: 'sawtooth', f: rand(120, 180), d: 0.12, vol: 0.04, filter: { type: 'highpass', f: 800 } });
      noise({ type: 'highpass', f: 5000, d: 0.08, vol: 0.05 });
    },
    hero() {
      const t = ac.currentTime;
      [60, 64, 67, 72, 67, 72, 76].forEach((m, i) => tone({ type: 'square', f: mtof(m), d: 0.2, vol: 0.03, t: t + i * 0.1, filter: { f: 2500 }, send: 0.4 }));
      tone({ type: 'triangle', f: mtof(84), a: 0.02, d: 1.5, vol: 0.05, t: t + 0.7, send: 0.8 });
    },
    heroLevel() {
      const t = ac.currentTime;
      [72, 76, 79, 84].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.25, vol: 0.05, t: t + i * 0.05, send: 0.5 }));
    },
    weapon(d) {
      // lâmina sendo desembainhada; armas raras brilham mais
      const t = ac.currentTime;
      noise({ type: 'bandpass', f: 3000, f2: 7000, q: 3, d: 0.35, vol: 0.06, t });
      tone({ type: 'sine', f: 1800 + (d.rar || 0) * 400, d: 0.6, vol: 0.03 + (d.rar || 0) * 0.01, t: t + 0.1, send: 0.6 });
    },
    // ---- caixas de herói
    // a caixa sendo sacudida: batidas de madeira e coisas chacoalhando dentro (mais rápido a cada estrela)
    boxShake(d) {
      const t = ac.currentTime, n = d.n || 1, hits = 5 + n * 2, gap = 0.62 / hits;
      for (let i = 0; i < hits; i++) {
        const tt = t + i * gap + rand(0, 0.015), pan = i % 2 ? 0.25 : -0.25;
        tone({ type: 'triangle', f: rand(140, 210) + n * 20, f2: 80, d: 0.06, vol: 0.09, t: tt, pan });
        noise({ type: 'bandpass', f: rand(1800, 3200), q: 3, d: 0.035, vol: 0.06, t: tt + 0.01, pan: -pan });
      }
      noise({ type: 'lowpass', f: 500, a: 0.1, d: 0.5, vol: 0.05, t });
    },
    // subida de estrela: arpejo crescente, mais alto e mais longo a cada nível (★ é só um brilho de leve)
    boxStar(d) {
      const t = ac.currentTime, n = d.n || 1;
      if (n <= 1) { tone({ type: 'sine', f: mtof(84), d: 0.4, vol: 0.03, t, send: 0.6 }); return; }
      const notes = n >= 3 ? [72, 76, 79, 84, 88, 91, 96] : [67, 72, 76, 79];
      notes.forEach((m, i) => {
        tone({ type: 'square', f: mtof(m), d: 0.16, vol: 0.025 + n * 0.008, t: t + i * 0.055, filter: { f: 3500 } });
        tone({ type: 'triangle', f: mtof(m + 12), d: 0.3, vol: 0.03, t: t + i * 0.055, send: 0.6 });
      });
      const end = t + notes.length * 0.055;
      tone({ type: 'triangle', f: mtof(notes[notes.length - 1]), a: 0.02, d: n >= 3 ? 1.6 : 0.9, vol: 0.06, t: end, send: 0.8 });
      noise({ type: 'highpass', f: 6000, d: n >= 3 ? 1.2 : 0.6, vol: 0.03 + n * 0.01, t: end });
      tone({ f: 90, f2: 40, d: 0.35, vol: 0.12 + n * 0.06, t });   // pancada grave junto com o tremor
      if (n >= 3) for (let i = 0; i < 8; i++) tone({ type: 'sine', f: pick([2637, 3136, 3520, 4186]), d: 0.2, vol: 0.02, t: end + 0.1 + i * 0.08, pan: rand(-0.7, 0.7), send: 0.6 });
    },
    // não subiu: "uóó-uó" descendo e a caixa caindo de volta
    boxFail() {
      const t = ac.currentTime;
      tone({ type: 'triangle', f: mtof(64), f2: mtof(62), d: 0.18, vol: 0.06, t });
      tone({ type: 'triangle', f: mtof(60), f2: mtof(55), d: 0.4, vol: 0.06, t: t + 0.18 });
      tone({ f: 110, f2: 55, d: 0.12, vol: 0.12, t: t + 0.02 });
      noise({ type: 'lowpass', f: 700, d: 0.08, vol: 0.06, t: t + 0.02 });
    },
    // a caixa abre: fanfarra, bem maior no ★★★
    boxOpen(d) {
      const t = ac.currentTime, n = d.n || 1;
      noise({ type: 'bandpass', f: 400, f2: 3000, q: 0.8, d: 0.35, vol: 0.12, t });   // tampa estourando
      tone({ f: 120, f2: 45, d: 0.3, vol: 0.25, t });
      if (n <= 1) {
        [72, 76, 79].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.4, vol: 0.06, t: t + 0.1 + i * 0.09, send: 0.5 }));
        return;
      }
      if (n === 2) {
        [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36]].forEach(([m, dt]) => {
          tone({ type: 'square', f: mtof(m), d: 0.18, vol: 0.035, t: t + 0.1 + dt, filter: { f: 3000 } });
          tone({ type: 'triangle', f: mtof(m + 12), d: 0.25, vol: 0.03, t: t + 0.1 + dt, send: 0.4 });
        });
        [72, 76, 79, 84].forEach(m => tone({ type: 'triangle', f: mtof(m), a: 0.02, d: 1.2, vol: 0.04, t: t + 0.6, send: 0.7 }));
        return;
      }
      // ★★★: fanfarra de metais, acorde longo, rufar e chuva de brilhos
      for (let i = 0; i < 10; i++) noise({ type: 'bandpass', f: 250, q: 1, d: 0.06, vol: 0.12, t: t + i * 0.045 });
      [[60, 0.45], [64, 0.6], [67, 0.75], [72, 0.9], [67, 1.1], [72, 1.25]].forEach(([m, dt]) => {
        tone({ type: 'sawtooth', f: mtof(m), d: 0.2, vol: 0.04, t: t + dt, filter: { f: 2600 }, send: 0.4 });
        tone({ type: 'square', f: mtof(m + 12), d: 0.18, vol: 0.025, t: t + dt, filter: { f: 3500 } });
      });
      [60, 64, 67, 72, 76, 84].forEach(m => tone({ type: 'sawtooth', f: mtof(m), a: 0.05, hold: 0.6, d: 1.8, vol: 0.03, t: t + 1.45, filter: { f: 2200 }, send: 0.8 }));
      tone({ f: 70, f2: 30, d: 1.2, vol: 0.4, t: t + 1.45 });
      noise({ type: 'lowpass', f: 1500, f2: 100, d: 1.2, vol: 0.2, t: t + 1.45, send: 0.5 });
      for (let i = 0; i < 14; i++) tone({ type: 'sine', f: pick([2093, 2637, 3136, 3520, 4186]), d: 0.25, vol: 0.02, t: t + 1.5 + i * 0.09, pan: rand(-0.8, 0.8), send: 0.7 });
    },
    // cada carta de prêmio virando: um "flip" de papel e um brilho, mais alto e mais rico quanto mais raro
    boxItem(d) {
      const t = ac.currentTime, r = d.rare || 0;
      noise({ type: 'bandpass', f: 2600, f2: 1200, q: 1.5, d: 0.07, vol: 0.06, t });
      const notes = [[79], [79, 84], [79, 83, 86], [72, 76, 79, 84, 88]][r];
      notes.forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.25 + r * 0.15, vol: 0.035 + r * 0.01, t: t + 0.05 + i * 0.05, send: 0.3 + r * 0.15 }));
      if (r >= 3) noise({ type: 'highpass', f: 6000, d: 0.8, vol: 0.04, t: t + 0.1 });
    },
    // caixa de herói caindo: baque de madeira no chão e um "plim" dourado chamando atenção
    box() {
      const t = ac.currentTime;
      tone({ f: 110, f2: 50, d: 0.25, vol: 0.3, t });
      noise({ type: 'lowpass', f: 900, f2: 200, d: 0.2, vol: 0.2, t });
      tone({ type: 'triangle', f: 160, f2: 90, d: 0.08, vol: 0.12, t: t + 0.12 });   // quique
      [84, 88, 91, 96].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.4, vol: 0.045, t: t + 0.25 + i * 0.07, send: 0.6 }));
      noise({ type: 'highpass', f: 6000, d: 0.6, vol: 0.035, t: t + 0.3 });
    },
    // grau de habilidade aprendido: "tchin" metálico subindo, mais cheio a cada grau
    skillUp(d) {
      const t = ac.currentTime, r = d.r || 1;
      noise({ type: 'bandpass', f: 3000, q: 3, d: 0.05, vol: 0.06, t });
      [72, 76, 79, 84].slice(0, r + 1).forEach((m, i) => tone({ type: 'triangle', f: mtof(m + 2 * r), d: 0.3, vol: 0.05, t: t + i * 0.06, send: 0.5 }));
      tone({ type: 'sine', f: mtof(96 + 2 * r), d: 0.5, vol: 0.02, t: t + 0.2, send: 0.7 });
    },
    // ---- invocação de herói
    // cada fragmento encaixando: um "tlin" de cristal, subindo de tom
    summonShard(d) {
      const t = ac.currentTime, m = [72, 74, 76, 79, 81, 84][d.i || 0];
      noise({ type: 'bandpass', f: 4000, q: 4, d: 0.04, vol: 0.05, t });
      tone({ type: 'triangle', f: mtof(m), d: 0.35, vol: 0.05, t, send: 0.5 });
      tone({ type: 'sine', f: mtof(m + 19), d: 0.25, vol: 0.02, t: t + 0.01, send: 0.6 });
    },
    // carregando: zumbido que sobe até estourar
    summonCharge() {
      const t = ac.currentTime;
      tone({ type: 'sawtooth', f: 110, f2: 880, a: 0.9, d: 0.15, vol: 0.05, t, filter: { f: 1800 }, send: 0.4 });
      tone({ type: 'sine', f: 220, f2: 1760, a: 0.9, d: 0.1, vol: 0.04, t });
      noise({ type: 'bandpass', f: 300, f2: 5000, q: 1.5, a: 0.9, d: 0.1, vol: 0.06, t });
    },
    // o herói aparece: estouro grave e brilho
    summonBoom() {
      const t = ac.currentTime;
      tone({ f: 80, f2: 30, d: 0.9, vol: 0.4, t });
      noise({ type: 'lowpass', f: 2500, f2: 120, d: 0.9, vol: 0.25, t, send: 0.6 });
      [72, 76, 79, 84].forEach(m => tone({ type: 'triangle', f: mtof(m), a: 0.02, d: 1.6, vol: 0.035, t: t + 0.05, send: 0.8 }));
      noise({ type: 'highpass', f: 6000, d: 1.2, vol: 0.04, t: t + 0.05 });
    },
    // som característico de cada herói, quando ele aparece
    champCry(d) {
      const t = ac.currentTime + 0.25;
      switch (d.k) {
        case 'profeta':   // trovão estalando e rolando, com um coro grave
          noise({ type: 'highpass', f: 2500, d: 0.08, vol: 0.4, t });
          noise({ type: 'lowpass', f: 1800, f2: 90, d: 1.8, vol: 0.45, t: t + 0.03, send: 0.8 });
          tone({ f: 60, f2: 32, d: 1.4, vol: 0.35, t });
          [45, 52, 57, 64].forEach(m => tone({ type: 'sawtooth', f: mtof(m), a: 0.3, hold: 0.6, d: 1.2, vol: 0.025, t: t + 0.4, filter: { f: 900 }, send: 0.9 }));
          break;
        case 'x9':        // robô ligando: servo subindo, bipes e o "clunk" de pronto
          tone({ type: 'sawtooth', f: 180, f2: 900, a: 0.02, d: 0.5, vol: 0.05, t, filter: { f: 2200, q: 4 } });
          [[1200, 0.6], [1600, 0.72], [2400, 0.84]].forEach(([f, dt]) => tone({ type: 'square', f, d: 0.07, vol: 0.035, t: t + dt, filter: { f: 4000 } }));
          tone({ type: 'square', f: 110, f2: 55, d: 0.25, vol: 0.12, t: t + 1.0, filter: { f: 700 } });
          noise({ type: 'bandpass', f: 1200, q: 3, d: 0.06, vol: 0.12, t: t + 1.0 });
          tone({ type: 'sine', f: 60, a: 0.1, hold: 0.4, d: 0.5, vol: 0.12, t: t + 1.05 });
          break;
        case 'bilu':      // "tcharã!" de circo e o urso rugindo
          [[72, 0, 0.12], [76, 0.12, 0.12], [79, 0.24, 0.12], [84, 0.38, 0.6]].forEach(([m, dt, dd]) => {
            tone({ type: 'square', f: mtof(m), d: dd, vol: 0.04, t: t + dt, filter: { f: 3000 } });
            tone({ type: 'triangle', f: mtof(m - 12), d: dd, vol: 0.04, t: t + dt });
          });
          noise({ type: 'highpass', f: 5000, d: 0.5, vol: 0.05, t: t + 0.38 });   // prato
          tone({ type: 'sawtooth', f: 85, f2: 60, a: 0.12, hold: 0.3, d: 0.5, vol: 0.12, t: t + 1.0, filter: { f: 500, q: 3 } });
          noise({ type: 'lowpass', f: 380, a: 0.12, d: 0.8, vol: 0.2, t: t + 1.0 });
          break;
        case 'imune':     // batidas de coração, sussurros e um acorde dissonante
          [0, 0.22, 0.9, 1.12].forEach(dt => tone({ f: 70, f2: 40, d: 0.18, vol: 0.3, t: t + dt }));
          noise({ type: 'bandpass', f: 1800, f2: 3500, q: 6, a: 0.4, d: 1.4, vol: 0.06, t, pan: -0.6, send: 0.8 });
          noise({ type: 'bandpass', f: 2600, f2: 1400, q: 6, a: 0.5, d: 1.2, vol: 0.05, t: t + 0.4, pan: 0.6, send: 0.8 });
          [[440, 0], [466, 6], [659, -4]].forEach(([f, det]) => tone({ type: 'sine', f, detune: det, a: 0.7, hold: 0.5, d: 1.2, vol: 0.03, t: t + 0.2, send: 0.9 }));
          break;
        case 'waldir':    // disco voador: teremim ondulando e o zumbido do motor
          for (let i = 0; i < 10; i++) tone({ type: 'sine', f: 700 + i * 40, f2: i % 2 ? 620 + i * 40 : 900 + i * 40, d: 0.12, vol: 0.05, t: t + i * 0.12, send: 0.6 });
          tone({ type: 'sawtooth', f: 55, a: 0.3, hold: 0.8, d: 0.6, vol: 0.05, t, filter: { f: 300 } });
          tone({ type: 'sine', f: 1800, f2: 300, d: 0.5, vol: 0.04, t: t + 1.2, send: 0.6 });   // "piuuu"
          break;
        case 'ze':        // power chord distorcido e a batida da bateria
          [41.2, 82.4, 123.5, 164.8].forEach(f => {
            tone({ type: 'sawtooth', f, a: 0.01, hold: 0.7, d: 1.0, vol: 0.06, t, filter: { f: 1600, q: 2 }, send: 0.5 });
            tone({ type: 'square', f: f * 1.005, a: 0.01, hold: 0.7, d: 1.0, vol: 0.025, t, filter: { f: 1200 } });
          });
          tone({ f: 90, f2: 45, d: 0.3, vol: 0.4, t });
          noise({ type: 'bandpass', f: 1800, q: 1, d: 0.15, vol: 0.12, t: t + 0.01 });
          noise({ type: 'highpass', f: 5000, d: 1.4, vol: 0.06, t, send: 0.6 });
          break;
      }
    },
    district() {
      const t = ac.currentTime;
      tone({ type: 'sawtooth', f: mtof(55), a: 0.2, hold: 0.4, d: 0.8, vol: 0.08, filter: { f: 1200 }, send: 0.5 });
      [67, 72, 76, 79].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.5, vol: 0.06, t: t + 0.3 + i * 0.12, send: 0.5 }));
    },
    cure() {
      const t = ac.currentTime;
      [[60, 64, 67], [65, 69, 72], [67, 71, 74], [72, 76, 79, 84]].forEach((ch, i) =>
        ch.forEach(m => tone({ type: 'triangle', f: mtof(m), a: 0.05, d: i === 3 ? 3 : 0.6, vol: 0.05, t: t + i * 0.5, send: 0.8 })));
      noise({ type: 'highpass', f: 6000, d: 2.5, vol: 0.04, t: t + 1.5 });
    },
    achievement() {
      // fanfarra de conquista
      const t = ac.currentTime;
      [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36]].forEach(([m, dt]) => {
        tone({ type: 'square', f: mtof(m), d: 0.18, vol: 0.035, t: t + dt, filter: { f: 3000 } });
        tone({ type: 'triangle', f: mtof(m + 12), d: 0.25, vol: 0.03, t: t + dt, send: 0.4 });
      });
      [72, 76, 79, 84].forEach(m => tone({ type: 'triangle', f: mtof(m), a: 0.02, d: 1.2, vol: 0.04, t: t + 0.5, send: 0.7 }));
      noise({ type: 'highpass', f: 6000, d: 0.8, vol: 0.03, t: t + 0.5 });
    },
    boostEnd() {
      tone({ type: 'triangle', f: mtof(72), f2: mtof(60), d: 0.5, vol: 0.05 });
    },
    unassign() {
      tone({ type: 'triangle', f: mtof(64), f2: mtof(60), d: 0.15, vol: 0.05 });
    },
    expStart() {
      const t = ac.currentTime;
      for (let i = 0; i < 5; i++) noise({ type: 'lowpass', f: 650, d: 0.06, vol: 0.09, t: t + i * 0.2, pan: -0.5 + i * -0.05 });
      noise({ type: 'bandpass', f: 3000, f2: 5000, q: 4, d: 0.2, vol: 0.03, t });
      tone({ f: 900, d: 0.15, vol: 0.035, t: t + 0.3, send: 0.3 });
      tone({ f: 700, d: 0.25, vol: 0.035, t: t + 0.48, send: 0.3 });
    },
    expReturn() {
      const t = ac.currentTime;
      [60, 64, 67, 72].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 0.4, vol: 0.07, t: t + i * 0.1, send: 0.5 }));
      for (let i = 0; i < 3; i++) tone({ f: pick([2093, 2637, 3136]), d: 0.15, vol: 0.025, t: t + 0.45 + i * 0.07 });
    },
    built(d) {
      const t = ac.currentTime;
      if (d && d.perk) {
        [84, 88, 91, 96, 100].forEach((m, i) => tone({ f: mtof(m), d: 0.6, vol: 0.04, t: t + i * 0.06, send: 0.8 }));
        return;
      }
      for (let i = 0; i < 3; i++) {
        tone({ type: 'square', f: 320, f2: 180, d: 0.05, vol: 0.06, t: t + i * 0.13, filter: { f: 1400 } });
        noise({ type: 'bandpass', f: 2200, d: 0.04, vol: 0.08, t: t + i * 0.13 });
      }
      tone({ type: 'triangle', f: mtof(81), d: 0.4, vol: 0.06, t: t + 0.42, send: 0.5 });
      tone({ type: 'triangle', f: mtof(88), d: 0.5, vol: 0.06, t: t + 0.5, send: 0.5 });
    },
    gameOver() {
      const t = ac.currentTime;
      [57, 55, 53, 50].forEach((m, i) => tone({ type: 'sawtooth', f: mtof(m), a: 0.05, d: 0.9, vol: 0.06, t: t + i * 0.5, filter: { f: 900 }, send: 0.6 }));
    },
    evacuate() {
      // hélice do helicóptero
      const t = ac.currentTime, src = ac.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
      const g = ac.createGain(); g.gain.value = 0;
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = 13; lg.gain.value = 0.25;
      lfo.connect(lg); lg.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(sfxBus);
      const env = ac.createGain();
      g.disconnect(); g.connect(env); env.connect(sfxBus);
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(1, t + 0.8);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      src.start(t); lfo.start(t); src.stop(t + 3.6); lfo.stop(t + 3.6);
      [60, 64, 67, 72, 76].forEach((m, i) => tone({ type: 'triangle', f: mtof(m), d: 1.2, vol: 0.06, t: t + 0.5 + i * 0.15, send: 0.6 }));
    },
  };
  const GAPS = { outOfRange: 0.15, armor: 0.07, headshot: 0.05, zbuff: 0.15, sample: 0.1, crit: 0.08, trap: 0.06, shock: 0.1, research: 0.2, weapon: 0.3, assign: 0.06, unassign: 0.06, shot: 0.035, hit: 0.04, zdeath: 0.07, wallHit: 0.09, spit: 0.15, melee: 0.06, injured: 0.15, bitten: 0.3, harvest: 1.2, scavenge: 0.03 };

  function on(type, d) {
    // morte de chefe e cada ação de chefe têm o próprio limite (não somem no meio de outros sons)
    const key = type === 'zdeath' && d && ZTYPES[d.type] && ZTYPES[d.type].boss ? 'bossDeath' : type === 'boss' && d ? 'boss_' + d.k : type;
    if (!SFX[type] || !allow(key, GAPS[type] ?? 0.05)) return;
    SFX[type](d || {});
  }

  function ambient(dt) {
    if (!ac || ac.state !== 'running' || !P('sfx') || typeof S === 'undefined') return;
    const H = S.horde;
    ambientT -= dt;
    if (ambientT <= 0) {
      ambientT = rand(3, 8);
      const nightish = H.active || S.waveTimer < 20;
      const t = ac.currentTime;
      if (!nightish) {
        const n = Math.floor(rand(2, 5)), base = rand(2400, 3400), pan = rand(-0.8, 0.8);
        for (let i = 0; i < n; i++) tone({ f: base, f2: base * rand(1.2, 1.5), d: 0.06, vol: 0.018, t: t + i * 0.11, pan });
      } else if (!H.active) {
        for (let i = 0; i < 6; i++) tone({ f: 4600, d: 0.025, vol: 0.008, t: t + i * 0.06, pan: rand(-0.6, 0.6) });
      }
    }
    // gemidos da horda
    if (H.active && H.zs.length) {
      groanT -= dt;
      if (groanT <= 0) {
        groanT = rand(0.8, 2.5) / Math.min(3, 1 + H.zs.length / 10);
        const f = rand(70, 140), pan = rand(0.1, 0.8);
        tone({ type: 'sawtooth', f, f2: f * rand(0.6, 0.8), a: 0.15, d: rand(0.6, 1.1), vol: 0.035, filter: { f: rand(450, 750), q: 6 }, pan, send: 0.3 });
        tone({ type: 'sawtooth', f: f * 1.01, f2: f * 0.7, a: 0.15, d: 0.8, vol: 0.02, filter: { f: 500, q: 4 }, pan });
      }
    }
    // estalos da fogueira
    if (Math.random() < dt * 1.5) noise({ type: 'highpass', f: 3000, d: 0.015, vol: 0.02, pan: -0.5 });
  }

  // ======================= MÚSICA =======================
  // Cada estilo tem uma trilha de dia e uma de noite, tocadas em passos de semicolcheia.
  // v(o) toca uma nota no barramento do clima atual; o eco é feito repetindo a nota mais baixa.
  const mv = (m, t) => o => tone({ bus: 'music', mood: m, t, ...o });
  const mn = (m, t) => o => noise({ bus: 'music', mood: m, t, ...o });

  // ---------- Clássica (a trilha original) ----------
  const CL_DAY = { bpm: 76, chords: [[57, 60, 64], [57, 60, 65], [55, 60, 64], [55, 59, 62]], bass: [45, 41, 48, 43], penta: [69, 72, 74, 76, 79, 81] };
  const CL_NIGHT = { bpm: 132, chords: [[62, 65, 69], [62, 65, 69], [58, 62, 65], [57, 61, 64]], bass: [38, 38, 34, 33] };

  function classicDay(s, t) {
    const D = CL_DAY, i = bar % 4, chord = D.chords[i], barLen = stepDur() * 16, v = mv('day', t);
    if (s === 0) {
      for (const n of chord) {
        v({ type: 'triangle', f: mtof(n), a: 1.2, hold: barLen - 1.2, d: 1.5, vol: 0.022, filter: { f: 1300 }, send: 0.6 });
        v({ type: 'sine', f: mtof(n), a: 1.2, hold: barLen - 1.2, d: 1.5, vol: 0.02, detune: 7, send: 0.6 });
      }
    }
    if (s === 0 || s === 8) v({ type: 'sine', f: mtof(D.bass[i]), a: 0.03, d: 1.3, vol: 0.11 });
    if ([0, 3, 6, 8, 11, 14].includes(s) && Math.random() < 0.75) {
      const note = Math.random() < 0.7 ? pick(chord) + 12 : pick(D.penta);
      v({ type: 'triangle', f: mtof(note), a: 0.005, d: 0.9, vol: 0.045, send: 0.6, pan: rand(-0.4, 0.4) });
      if (Math.random() < 0.12) v({ type: 'sine', f: mtof(note + 12), a: 0.005, d: 1.4, vol: 0.02, send: 0.8 });
    }
  }

  function classicNight(s, t) {
    const N = CL_NIGHT, i = bar % 4, chord = N.chords[i], root = N.bass[i], barLen = stepDur() * 16, v = mv('night', t), nz = mn('night', t);
    if (s === 0) {
      for (const n of chord) v({ type: 'sawtooth', f: mtof(n - 12), a: 0.4, hold: barLen - 0.4, d: 0.6, vol: 0.016, filter: { f: 750 }, send: 0.3 });
      if (bar % 4 === 0) nz({ type: 'highpass', f: 5000, d: 1.3, vol: 0.05 });
    }
    if (s % 2 === 0 || (s >= 14 && Math.random() < 0.5))
      v({ type: 'sawtooth', f: mtof(root), a: 0.005, d: 0.14, vol: s === 0 ? 0.11 : 0.075, filter: { f: 380, q: 3 } });
    if ([0, 6, 8, 11].includes(s)) v({ type: 'sine', f: 125, f2: 42, a: 0.002, d: 0.24, vol: 0.4 });
    if (s === 4 || s === 12) {
      nz({ type: 'bandpass', f: 1800, d: 0.15, vol: 0.14, send: 0.2 });
      v({ type: 'triangle', f: 190, f2: 120, d: 0.08, vol: 0.08 });
    }
    nz({ type: 'highpass', f: 7500, d: 0.035, vol: s % 2 ? 0.02 : 0.035 });
    if (bossOnScreen() && (s === 2 || s === 10 || s === 14)) v({ type: 'sine', f: 95, f2: 55, a: 0.003, d: 0.35, vol: 0.3, send: 0.4 });
    if ([0, 3, 6, 8, 11, 14].includes(s)) {
      const n = chord[(s / 2 | 0) % 3] + 12;
      v({ type: 'sawtooth', f: mtof(n), a: 0.005, d: 0.13, vol: 0.026, filter: { f: 2400 }, pan: s % 2 ? 0.3 : -0.3 });
    }
  }

  // ---------- Synthwave ----------
  // Dia: synthwave calmo (Am9 – Fmaj7 – Cadd9 – G6), com pads de serra desafinados,
  // baixo pulsando em oitavas, arpejo com eco e bateria eletrônica suave
  const SW_DAY = {
    bpm: 84,
    chords: [[57, 60, 64, 71], [53, 57, 60, 64], [55, 60, 62, 64], [55, 59, 62, 64]],
    bass: [33, 29, 36, 31],
    arp: [[69, 72, 76, 79], [65, 69, 72, 76], [67, 72, 74, 76], [67, 71, 74, 79]],
    penta: [76, 79, 81, 84, 86, 88],
  };
  // Noite: darksynth em Ré menor (Dm – Dm – B♭ – A), baixo em semicolcheias,
  // bumbo nos 4 tempos, arpejo rápido e lead de serra
  const SW_NIGHT = {
    bpm: 116,
    chords: [[62, 65, 69, 74], [62, 65, 69, 72], [58, 62, 65, 69], [57, 61, 64, 69]],
    bass: [38, 38, 34, 33],
    arp: [[62, 65, 69, 74], [62, 65, 69, 72], [58, 62, 65, 70], [57, 61, 64, 69]],
    lead: [[74, 72, 69, 72], [74, 77, 76, 72], [70, 69, 65, 69], [69, 68, 69, 73]],
  };

  function synthDay(s, t) {
    const D = SW_DAY, i = bar % 4, chord = D.chords[i], barLen = stepDur() * 16, sd = stepDur(), v = mv('day', t), nz = mn('day', t);
    // 16 compassos: entrada só com pad, depois arpejo, baixo e bateria; os 2 últimos respiram sem bateria
    const sec = bar % 16, drums = bar >= 4 && sec < 14, lead = bar >= 8 && sec >= 4 && sec < 12;
    if (s === 0) {
      for (const n of chord) {
        v({ type: 'sawtooth', f: mtof(n), a: 1.4, hold: barLen - 1.2, d: 1.6, vol: 0.016, detune: -11, filter: { f: 1100, q: 0.5 }, send: 0.8, pan: -0.35 });
        v({ type: 'sawtooth', f: mtof(n), a: 1.4, hold: barLen - 1.2, d: 1.6, vol: 0.016, detune: 11, filter: { f: 1100, q: 0.5 }, send: 0.8, pan: 0.35 });
      }
      v({ type: 'sine', f: mtof(chord[0] - 12), a: 1.5, hold: barLen - 1.2, d: 1.6, vol: 0.03, send: 0.5 });
    }
    if (bar < 2) return;
    const arp = D.arp[i];
    const note = arp[[0, 1, 2, 3, 2, 1, 2, 3][s % 8]] + (s >= 8 && bar % 2 ? 12 : 0);
    const pan = s % 2 ? 0.3 : -0.3;
    v({ type: 'square', f: mtof(note), a: 0.004, d: 0.18, vol: 0.022, filter: { f: 2200, q: 2 }, send: 0.5, pan });
    v({ type: 'square', f: mtof(note), a: 0.004, d: 0.18, vol: 0.009, filter: { f: 1600, q: 2 }, send: 0.7, pan: -pan, t: t + sd * 3 });
    if (bar < 4) return;
    if (s % 2 === 0) {
      const root = D.bass[i] + (s % 4 === 2 ? 12 : 0);
      v({ type: 'sawtooth', f: mtof(root), a: 0.005, d: sd * 1.6, vol: s % 4 ? 0.05 : 0.07, filter: { f: 420, q: 4 } });
    }
    if (drums) {
      if (s === 0 || s === 8) v({ type: 'sine', f: 110, f2: 40, a: 0.002, d: 0.3, vol: 0.22 });
      if (s === 4 || s === 12) {
        nz({ type: 'bandpass', f: 1700, q: 0.7, d: 0.22, vol: 0.07, send: 1 });
        v({ type: 'triangle', f: 200, f2: 150, d: 0.1, vol: 0.05, send: 0.6 });
      }
      if (s % 4 === 2) nz({ type: 'highpass', f: 8000, d: 0.04, vol: 0.022, pan: 0.2 });
    }
    if (lead && [0, 6, 10].includes(s) && Math.random() < 0.7) {
      const n = Math.random() < 0.6 ? pick(chord) + 24 : pick(D.penta);
      if (n < 92) {
        v({ type: 'sawtooth', f: mtof(n), a: 0.06, hold: sd * 3, d: 1.2, vol: 0.014, detune: 6, filter: { f: 2600, q: 1 }, send: 0.9 });
        v({ type: 'triangle', f: mtof(n), a: 0.06, hold: sd * 3, d: 1.2, vol: 0.02, send: 0.9 });
      }
    }
  }

  function synthNight(s, t) {
    const N = SW_NIGHT, i = bar % 4, chord = N.chords[i], root = N.bass[i], barLen = stepDur() * 16, sd = stepDur(), v = mv('night', t), nz = mn('night', t);
    // a horda chega de uma vez: baixo e bumbo desde o início; arpejo a partir do 2º compasso, lead a partir do 5º
    const sec = bar % 16, leadOn = bar >= 4 && sec >= 4 && sec < 12, fill = sec === 15;
    if (s === 0) {
      for (const n of chord) {
        v({ type: 'sawtooth', f: mtof(n - 12), a: 0.5, hold: barLen - 0.5, d: 0.7, vol: 0.013, detune: -12, filter: { f: 750, q: 0.7 }, send: 0.5, pan: -0.4 });
        v({ type: 'sawtooth', f: mtof(n - 12), a: 0.5, hold: barLen - 0.5, d: 0.7, vol: 0.013, detune: 12, filter: { f: 750, q: 0.7 }, send: 0.5, pan: 0.4 });
      }
      if (bar % 4 === 3) nz({ type: 'bandpass', f: 400, f2: 6000, q: 1.5, a: barLen * 0.8, d: 0.2, vol: 0.05, send: 0.4 });
    }
    const oct = [0, 0, 12, 0, 0, 12, 0, 12][s % 8];
    v({ type: 'sawtooth', f: mtof(root + oct), a: 0.003, d: sd * 0.9, vol: s % 4 === 0 ? 0.085 : 0.06, filter: { f: 520, q: 5 } });
    if (s % 4 === 0) v({ type: 'sine', f: mtof(root - 12), a: 0.003, d: sd * 3, vol: 0.09 });
    if (s % 4 === 0) v({ type: 'sine', f: 140, f2: 42, a: 0.002, d: 0.22, vol: 0.38 });
    if (s === 4 || s === 12 || (fill && s >= 12)) {
      nz({ type: 'bandpass', f: 1600, q: 0.7, d: 0.2, vol: fill && s > 12 ? 0.08 : 0.13, send: 0.9 });
      v({ type: 'triangle', f: 210, f2: 150, d: 0.09, vol: 0.08, send: 0.5 });
    }
    nz({ type: 'highpass', f: 8000, d: s % 4 === 2 ? 0.06 : 0.03, vol: s % 4 === 2 ? 0.035 : 0.018, pan: 0.25 });
    if (bar >= 1) {
      const arp = N.arp[i];
      const n = arp[[0, 1, 2, 3, 2, 1, 2, 3][s % 8]] + (bar % 2 ? 12 : 0);
      const pan = s % 2 ? 0.35 : -0.35;
      v({ type: 'square', f: mtof(n), a: 0.003, d: 0.11, vol: 0.02, filter: { f: 2600, q: 3 }, send: 0.3, pan });
      v({ type: 'square', f: mtof(n), a: 0.003, d: 0.11, vol: 0.008, filter: { f: 1800, q: 2 }, send: 0.5, pan: -pan, t: t + sd * 3 });
    }
    if (leadOn && [0, 3, 6, 10].includes(s)) {
      const n = N.lead[i][[0, 3, 6, 10].indexOf(s)];
      v({ type: 'sawtooth', f: mtof(n), a: 0.01, hold: sd * 1.5, d: 0.35, vol: 0.022, detune: -7, filter: { f: 2400, q: 2 }, send: 0.6 });
      v({ type: 'sawtooth', f: mtof(n), a: 0.01, hold: sd * 1.5, d: 0.35, vol: 0.022, detune: 7, filter: { f: 2400, q: 2 }, send: 0.6 });
    }
    if (bossOnScreen() && (s === 0 || s === 8)) {
      v({ type: 'sawtooth', f: mtof(root - 12), a: 0.05, hold: sd * 4, d: 0.6, vol: 0.06, filter: { f: 380, q: 6 }, send: 0.5 });
      v({ type: 'sawtooth', f: mtof(root - 5), a: 0.05, hold: sd * 4, d: 0.6, vol: 0.04, filter: { f: 380, q: 6 }, send: 0.5 });
    }
  }

  // ---------- Terror ----------
  // Dia: drone grave, vento e uma caixinha de música desafinada com notas cromáticas.
  // Noite: batidas industriais, coração acelerado, cordas em trêmulo com segundas menores e metais graves.
  const TR_DAY = {
    bpm: 66,
    drone: [33, 33, 32, 33],                           // Lá grave, com um Sol# que incomoda
    box: [[81, 84, 83, 80, 81, 76, 77, 75], [81, 84, 83, 80, 81, 76, 72, 71],
          [77, 80, 79, 76, 77, 72, 73, 71], [76, 80, 81, 83, 84, 83, 80, 76]],
  };
  const TR_NIGHT = {
    bpm: 100,
    root: [38, 38, 37, 39],                            // Ré, Ré, Dó#, Ré#: a tonalidade não se firma
    trem: [[74, 75], [74, 75], [73, 74], [75, 76]],    // segundas menores em trêmulo
  };

  // som de caixinha de música: fundamental + um parcial metálico, com cauda longa
  function musicBox(v, f, vol, detune = 0, pan = 0, at) {
    const when = at ? { t: at } : {};
    v({ type: 'sine', f, a: 0.002, d: 1.6, vol, detune, send: 0.9, pan, ...when });
    v({ type: 'sine', f: f * 2.76, a: 0.002, d: 0.5, vol: vol * 0.35, detune, send: 0.9, pan, ...when });
  }

  function terrorDay(s, t) {
    const D = TR_DAY, i = bar % 4, barLen = stepDur() * 16, sd = stepDur(), v = mv('day', t), nz = mn('day', t);
    // drone que muda devagar, a cada compasso
    if (s === 0) {
      const r = D.drone[i];
      v({ type: 'sine', f: mtof(r), a: 1.8, hold: barLen - 1.4, d: 1.8, vol: 0.06, send: 0.4 });
      v({ type: 'sine', f: mtof(r + 7), a: 2, hold: barLen - 1.6, d: 1.8, vol: 0.025, detune: 9, send: 0.6 });
      v({ type: 'sawtooth', f: mtof(r + 12), a: 2, hold: barLen - 1.6, d: 2, vol: 0.008, filter: { f: 320, q: 2 }, send: 0.7 });
      // vento
      if (bar % 2 === 0) nz({ type: 'lowpass', f: 700, f2: 250, q: 3, a: 2, d: barLen, vol: 0.035, pan: rand(-0.5, 0.5), send: 0.5 });
      // estrondo distante a cada 4 compassos
      if (bar >= 4 && bar % 4 === 0) v({ type: 'sine', f: 60, f2: 28, a: 0.01, d: 2.2, vol: 0.14, send: 0.9 });
    }
    // caixinha de música em colcheias, sempre um pouco desafinada; às vezes pula notas
    if (bar >= 2 && s % 2 === 0 && Math.random() < 0.85) {
      const n = D.box[i][s / 2];
      const wobble = Math.sin(bar * 1.7 + s) * 18;  // a "corda" da caixinha perdendo afinação
      musicBox(v, mtof(n), 0.035, wobble, rand(-0.3, 0.3));
      // eco fantasma, uma oitava abaixo
      if (Math.random() < 0.25) musicBox(v, mtof(n - 12), 0.012, wobble - 30, rand(-0.6, 0.6), t + sd * 3);
    }
  }

  function terrorNight(s, t) {
    const N = TR_NIGHT, i = bar % 4, root = N.root[i], sd = stepDur(), v = mv('night', t), nz = mn('night', t);
    // coração acelerado: "tum-tum" duas vezes por compasso
    if (s === 0 || s === 8) v({ type: 'sine', f: 75, f2: 38, a: 0.003, d: 0.2, vol: 0.4 });
    if (s === 3 || s === 11) v({ type: 'sine', f: 68, f2: 36, a: 0.003, d: 0.18, vol: 0.28 });
    // pancadas metálicas industriais no 2 e no 4
    if (s === 4 || s === 12) {
      nz({ type: 'bandpass', f: 3200, q: 9, d: 0.35, vol: 0.12, send: 0.8 });
      v({ type: 'square', f: 420, f2: 260, d: 0.1, vol: 0.025, filter: { f: 1500, q: 3 } });
      nz({ type: 'lowpass', f: 900, d: 0.12, vol: 0.08 });
    }
    // engrenagem: estalos secos nas semicolcheias ímpares
    if (s % 2) nz({ type: 'highpass', f: 6000, d: 0.02, vol: 0.014, pan: s % 4 === 1 ? -0.4 : 0.4 });
    // cordas em trêmulo alternando um semitom
    if (bar >= 1) {
      const [a, b] = N.trem[i];
      v({ type: 'sawtooth', f: mtof(s % 2 ? b : a), a: 0.01, d: sd * 0.9, vol: 0.014, filter: { f: 1900, q: 1.5 }, send: 0.5, pan: s % 2 ? 0.3 : -0.3 });
    }
    // metais graves com trítono a cada 2 compassos
    if (s === 0 && bar % 2 === 0) {
      v({ type: 'sawtooth', f: mtof(root - 12), a: 0.08, hold: sd * 8, d: 1, vol: 0.05, filter: { f: 420, q: 6 }, send: 0.6 });
      v({ type: 'sawtooth', f: mtof(root - 6), a: 0.08, hold: sd * 8, d: 1, vol: 0.035, filter: { f: 420, q: 6 }, send: 0.6 });
    }
    // a caixinha de música do dia volta, distorcida, por cima do caos
    if (bar >= 4 && (s === 2 || s === 10) && Math.random() < 0.6)
      musicBox(v, mtof(pick(TR_DAY.box[i]) + (Math.random() < 0.5 ? 0 : -12)), 0.022, -45, rand(-0.5, 0.5));
    if (bossOnScreen() && (s === 2 || s === 6 || s === 10 || s === 14)) v({ type: 'sine', f: 95, f2: 50, a: 0.003, d: 0.35, vol: 0.28, send: 0.4 });
  }

  // ---------- Momentos especiais (valem para os 3 estilos, com o timbre de cada um) ----------
  // flavor: 'classic' (cordas e madeiras), 'synth' (serras desafinadas) ou 'terror' (caixinha de música e metal)
  const flavor = () => (STYLES[P('musicStyle')] ? P('musicStyle') : 'synth');
  const TENSION_TIME = 20;   // segundos antes da horda em que a música de tensão entra
  const MN = { bpm: 68, chords: [[52, 55, 59, 66], [48, 52, 55, 59], [55, 59, 62, 66], [54, 57, 62, 69]], arp: [[64, 67, 71, 74], [60, 64, 67, 71], [62, 67, 71, 74], [62, 66, 69, 74]] };
  const TN = { bpm: 96 };
  const BS = { bpm: 144, root: [38, 38, 39, 36], lead: [[74, 75, 74, 72], [74, 77, 75, 74], [75, 74, 72, 70], [72, 74, 75, 77]] };

  // Menu principal: tema calmo e melancólico (Em9, Cmaj7, G6, D/F#), arpejo lento e vento
  function menuStep(s, t) {
    const i = bar % 4, chord = MN.chords[i], barLen = stepDur() * 16, sd = stepDur(), v = mv('menu', t), nz = mn('menu', t), f = flavor();
    if (s === 0) {
      for (const n of chord) {
        if (f === 'synth') {
          v({ type: 'sawtooth', f: mtof(n), a: 1.6, hold: barLen - 1.4, d: 1.8, vol: 0.012, detune: -9, filter: { f: 900 }, send: 0.9, pan: -0.3 });
          v({ type: 'sawtooth', f: mtof(n), a: 1.6, hold: barLen - 1.4, d: 1.8, vol: 0.012, detune: 9, filter: { f: 900 }, send: 0.9, pan: 0.3 });
        } else v({ type: f === 'terror' ? 'sine' : 'triangle', f: mtof(n), a: 1.6, hold: barLen - 1.4, d: 1.8, vol: 0.02, detune: f === 'terror' ? -15 : 0, filter: { f: 1100 }, send: 0.8 });
      }
      v({ type: 'sine', f: mtof(chord[0] - 12), a: 1, hold: barLen - 1, d: 1.6, vol: 0.05, send: 0.5 });
      if (bar % 2 === 0) nz({ type: 'lowpass', f: 600, f2: 250, q: 2, a: 2, d: barLen, vol: 0.025, pan: rand(-0.5, 0.5), send: 0.5 });
    }
    if (bar >= 1 && s % 2 === 0 && Math.random() < 0.9) {
      const n = MN.arp[i][[0, 1, 2, 3, 2, 1, 3, 2][s / 2]];
      if (f === 'terror') musicBox(v, mtof(n + 12), 0.028, Math.sin(bar + s) * 14, rand(-0.3, 0.3));
      else v({ type: 'triangle', f: mtof(n + (f === 'synth' ? 12 : 0)), a: 0.005, d: 1.1, vol: 0.035, send: 0.7, pan: rand(-0.3, 0.3) });
      if (f === 'synth') v({ type: 'square', f: mtof(n + 12), a: 0.005, d: 0.3, vol: 0.006, filter: { f: 1800 }, send: 0.8, t: t + sd * 3 });
    }
  }

  // Tensão (últimos segundos antes da horda): relógio e coração que aceleram, drone subindo, acordes dissonantes
  function tensionStep(s, t) {
    const sd = stepDur(), barLen = sd * 16, v = mv('tension', t), nz = mn('tension', t), f = flavor();
    const left = typeof S !== 'undefined' ? S.waveTimer : TENSION_TIME, u = Math.max(0, Math.min(1, 1 - left / TENSION_TIME));
    // relógio: tique nas semínimas, depois nas colcheias, e nas semicolcheias nos últimos segundos
    const every = u > 0.8 ? 1 : u > 0.45 ? 2 : 4;
    if (s % every === 0) {
      nz({ type: 'highpass', f: s % 8 === 0 ? 4500 : 6500, d: 0.02, vol: 0.03 + u * 0.02, pan: s % 8 < 4 ? -0.3 : 0.3 });
      if (f === 'terror') v({ type: 'square', f: s % 8 === 0 ? 1400 : 1900, d: 0.015, vol: 0.006, filter: { f: 3000 } });
    }
    // coração
    if (s === 0 || s === 8) v({ type: 'sine', f: 70, f2: 36, a: 0.003, d: 0.2, vol: 0.22 + u * 0.15 });
    if (s === 3 || s === 11) v({ type: 'sine', f: 64, f2: 34, a: 0.003, d: 0.16, vol: 0.14 + u * 0.12 });
    if (s === 0) {
      // drone grave com segunda menor e filtro abrindo conforme a horda se aproxima
      const r = 38, ff = 260 + u * 1100;
      const type = f === 'classic' ? 'triangle' : 'sawtooth';
      v({ type, f: mtof(r), a: 0.8, hold: barLen - 0.6, d: 0.8, vol: f === 'classic' ? 0.05 : 0.03, detune: f === 'synth' ? -10 : 0, filter: { f: ff, q: 3 }, send: 0.5 });
      v({ type, f: mtof(r + 1), a: 1.2, hold: barLen - 1, d: 0.8, vol: 0.012 + u * 0.018, detune: f === 'synth' ? 10 : -20, filter: { f: ff, q: 3 }, send: 0.6 });
      // acorde dissonante a cada 2 compassos
      if (bar % 2 === 1) for (const n of [62, 65, 68]) v({ type: f === 'synth' ? 'sawtooth' : 'triangle', f: mtof(n), a: 0.01, d: 0.9, vol: 0.016, filter: { f: 1600 }, send: 0.8 });
      if (f === 'terror' && bar % 2 === 0) musicBox(v, mtof(pick([81, 80, 77, 76])), 0.02, -40, rand(-0.5, 0.5));
    }
    // subida final: ruído crescendo nos últimos segundos
    if (s === 0 && left <= 4.5 && left > 0) nz({ type: 'bandpass', f: 300, f2: 5000, q: 1.2, a: barLen * 0.9, d: 0.15, vol: 0.06, send: 0.6 });
  }

  // Chefe: trilha própria, rápida e pesada (frígio: Ré e Mi bemol), bumbo duplo, ostinato, power chords, coro e tambores
  function bossStep(s, t) {
    const i = bar % 4, root = BS.root[i], sd = stepDur(), barLen = sd * 16, v = mv('boss', t), nz = mn('boss', t), f = flavor();
    // bumbo duplo e caixa
    if (s % 4 === 0 || s === 2 || s === 10 || (bar % 4 === 3 && s >= 12)) v({ type: 'sine', f: 150, f2: 40, a: 0.002, d: 0.2, vol: 0.4 });
    if (s === 4 || s === 12) { nz({ type: 'bandpass', f: 1500, q: 0.8, d: 0.2, vol: 0.15, send: 0.6 }); v({ type: 'triangle', f: 220, f2: 140, d: 0.09, vol: 0.09 }); }
    nz({ type: 'highpass', f: 8000, d: 0.025, vol: s % 2 ? 0.015 : 0.03 });
    // ostinato no grave com a segunda menor
    const o = [0, 0, 12, 0, 1, 0, 12, 0][s % 8];
    v({ type: f === 'classic' ? 'triangle' : 'sawtooth', f: mtof(root + o), a: 0.003, d: sd * 0.9, vol: f === 'classic' ? 0.11 : 0.07, filter: { f: 600, q: 4 } });
    // power chords
    if ([0, 6, 10].includes(s)) {
      const type = f === 'terror' ? 'square' : 'sawtooth', ff = f === 'classic' ? 900 : 1500;
      for (const [n, dt] of [[root + 12, -8], [root + 19, 8], [root + 24, 0]])
        v({ type, f: mtof(n), a: 0.01, hold: sd * (s === 0 ? 4 : 2), d: 0.3, vol: 0.022, detune: dt, filter: { f: ff, q: 2 }, send: 0.4 });
    }
    // coro sustentado
    if (s === 0) for (const n of [root + 24, root + 27, root + 31]) v({ type: 'sine', f: mtof(n), a: 0.6, hold: barLen - 0.6, d: 0.8, vol: 0.02, detune: rand(-8, 8), send: 0.9 });
    // tambores graves no fim de cada 4 compassos
    if (bar % 4 === 3 && s >= 8 && s % 2 === 0) v({ type: 'sine', f: 110 - (s - 8) * 6, f2: 55, a: 0.002, d: 0.3, vol: 0.3, send: 0.5 });
    // melodia a partir do 5o compasso
    if (bar >= 4 && [0, 4, 8, 12].includes(s)) {
      const n = BS.lead[i][s / 4];
      if (f === 'terror') musicBox(v, mtof(n), 0.03, -30, 0);
      else {
        v({ type: 'sawtooth', f: mtof(n), a: 0.01, hold: sd * 2.5, d: 0.3, vol: 0.02, detune: -6, filter: { f: f === 'classic' ? 1400 : 2600, q: 2 }, send: 0.6 });
        v({ type: f === 'classic' ? 'triangle' : 'sawtooth', f: mtof(n), a: 0.01, hold: sd * 2.5, d: 0.3, vol: 0.02, detune: 6, filter: { f: 2400 }, send: 0.6 });
      }
    }
  }

  const STYLES = {
    classic: { day: CL_DAY, night: CL_NIGHT, dayStep: classicDay, nightStep: classicNight },
    synth:   { day: SW_DAY, night: SW_NIGHT, dayStep: synthDay, nightStep: synthNight },
    terror:  { day: TR_DAY, night: TR_NIGHT, dayStep: terrorDay, nightStep: terrorNight },
  };
  let styleKey = null;
  const style = () => STYLES[P('musicStyle')] || STYLES.synth;
  const bossOnScreen = () => typeof S !== 'undefined' && S.horde.zs && S.horde.zs.some(z => ZTYPES[z.type].boss);

  // qual música toca agora: menu principal, dia, tensão (últimos segundos antes da horda), horda, chefe na tela
  function currentMood() {
    const menu = document.getElementById('main-menu');
    if (menu && !menu.classList.contains('hidden')) return 'menu';
    if (typeof S === 'undefined' || !S || !S.horde) return 'menu';
    if (S.horde.active) return bossOnScreen() ? 'boss' : 'night';
    return S.waveTimer <= TENSION_TIME ? 'tension' : 'day';
  }
  const BPM = { menu: () => MN.bpm, day: () => style().day.bpm, tension: () => TN.bpm, night: () => style().night.bpm, boss: () => BS.bpm };
  const stepDur = () => 60 / BPM[mood]() / 4;
  const FADE = { menu: 2, day: 3, tension: 2, night: 1.2, boss: 0.8 };

  function setMood(m) {
    if (m === mood) return;
    const t = ac.currentTime;
    for (const k in moodGain) {
      const g = moodGain[k].gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(k === m ? 1 : 0, t + FADE[m]);
    }
    mood = m; step = 0; bar = 0;
    nextTime = t + 0.05;
  }

  function scheduler() {
    if (!ac || ac.state !== 'running') return;
    setMood(currentMood());
    // trocar de estilo recomeça a trilha do começo
    if (styleKey !== P('musicStyle')) { styleKey = P('musicStyle'); step = 0; bar = 0; nextTime = ac.currentTime + 0.3; }
    ambient(0.025);
    if (nextTime < ac.currentTime - 0.5) nextTime = ac.currentTime + 0.05;
    const st = style();
    while (nextTime < ac.currentTime + 0.15) {
      const sx = step % 16;
      if (mood === 'day') st.dayStep(sx, nextTime);
      else if (mood === 'night') st.nightStep(sx, nextTime);
      else if (mood === 'tension') tensionStep(sx, nextTime);
      else if (mood === 'boss') bossStep(sx, nextTime);
      else menuStep(sx, nextTime);
      nextTime += stepDur();
      step++;
      if (step % 16 === 0) bar++;
    }
  }

  function applyPrefs() {
    if (ac) {
      const t = ac.currentTime;
      master.gain.setTargetAtTime(P('vol'), t, 0.05);
      musicBus.gain.setTargetAtTime(P('music') ? 0.5 * P('musicVol') : 0, t, 0.1);
      sfxBus.gain.setTargetAtTime(P('sfx') ? P('sfxVol') : 0, t, 0.05);
    }
    const mb = document.getElementById('snd-music'), sb = document.getElementById('snd-sfx');
    if (mb) { mb.classList.toggle('off', !P('music')); mb.title = P('music') ? 'Desligar música' : 'Ligar música'; }
    if (sb) { sb.classList.toggle('off', !P('sfx')); sb.textContent = P('sfx') ? '🔊' : '🔇'; sb.title = P('sfx') ? 'Desligar efeitos' : 'Ligar efeitos'; }
  }

  function setup() {
    listeners.push(on);
    const start = () => init();
    document.addEventListener('pointerdown', start);
    document.addEventListener('keydown', start);
    const mb = document.getElementById('snd-music'), sb = document.getElementById('snd-sfx');
    if (mb) mb.onclick = () => Settings.set('music', !P('music'));
    if (sb) sb.onclick = () => Settings.set('sfx', !P('sfx'));
    Settings.on(k => { if (['music', 'sfx', 'vol', 'musicVol', 'sfxVol'].includes(k)) applyPrefs(); });
    applyPrefs();
  }

  return { setup, init };
})();
