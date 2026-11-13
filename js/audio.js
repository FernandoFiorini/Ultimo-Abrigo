'use strict';

// Música e efeitos sonoros gerados na hora com a Web Audio API (sem arquivos de áudio).
const Sound = (() => {
  const PREF_KEY = 'ultimoAbrigo.audio';
  const prefs = { music: true, sfx: true, vol: 0.7 };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { /* sem armazenamento */ }
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* sem armazenamento */ } };

  let ac = null, master, musicBus, sfxBus, musicVerb, sfxVerb, noiseBuf;
  const moodGain = {};
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
    master = ac.createGain(); master.gain.value = prefs.vol;
    comp.connect(master); master.connect(ac.destination);

    musicBus = ac.createGain(); musicBus.gain.value = prefs.music ? 0.5 : 0; musicBus.connect(comp);
    sfxBus = ac.createGain(); sfxBus.gain.value = prefs.sfx ? 1 : 0; sfxBus.connect(comp);

    musicVerb = ac.createConvolver(); musicVerb.buffer = impulse(3, 2.5);
    const mv = ac.createGain(); mv.gain.value = 0.4; musicVerb.connect(mv); mv.connect(musicBus);
    sfxVerb = ac.createConvolver(); sfxVerb.buffer = impulse(1.6, 3);
    const sv = ac.createGain(); sv.gain.value = 0.3; sfxVerb.connect(sv); sv.connect(sfxBus);

    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    for (const m of ['day', 'night']) {
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

  // Evita sobrecarga quando muitos sons acontecem juntos
  function allow(name, gap) {
    if (!ac || ac.state !== 'running' || !prefs.sfx || voices > 48) return false;
    const now = ac.currentTime;
    if (last[name] && now - last[name] < gap) return false;
    last[name] = now;
    return true;
  }

  const SFX = {
    shot(d) {
      const pan = panOf(d.src === 'player' ? 60 : 180);
      if (d.src === 'rock') {
        noise({ type: 'highpass', f: 2500, d: 0.08, vol: 0.05, pan });
        return;
      }
      const big = d.src === 'player', tw = d.src === 'tower';
      noise({ type: 'bandpass', f: tw ? 1800 : 2600, f2: 500, q: 0.7, d: big ? 0.12 : 0.08, vol: big ? 0.32 : 0.16, pan });
      tone({ f: big ? 170 : 140, f2: 50, d: 0.09, vol: big ? 0.3 : 0.14, pan });
      if (big) noise({ type: 'lowpass', f: 700, d: 0.35, vol: 0.05, pan, send: 0.4 });
    },
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
    explode(d) {
      const pan = panOf(d.x);
      noise({ type: 'lowpass', f: 2200, f2: 90, d: 1.2, vol: 0.55, pan, send: 0.4 });
      tone({ f: 85, f2: 28, d: 0.9, vol: 0.5, pan });
    },
    spit(d) {
      const pan = panOf(d.x), t = ac.currentTime;
      tone({ f: 280, f2: 900, d: 0.12, vol: 0.06, pan });
      noise({ type: 'bandpass', f: 1300, q: 3, d: 0.12, vol: 0.05, pan });
      noise({ type: 'highpass', f: 4000, d: 0.45, vol: 0.04, t: t + 0.6, pan: -0.2 });
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
    bossSpawn() {
      tone({ type: 'sawtooth', f: 75, f2: 38, a: 0.1, d: 1.9, vol: 0.3, filter: { f: 480, q: 7 }, pan: 0.6, send: 0.6 });
      tone({ type: 'sawtooth', f: 112, f2: 50, a: 0.1, d: 1.7, vol: 0.15, filter: { f: 600, q: 5 }, pan: 0.6 });
      noise({ type: 'lowpass', f: 420, d: 1.6, vol: 0.25, pan: 0.6 });
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
  const GAPS = { sample: 0.1, crit: 0.08, trap: 0.06, shock: 0.1, research: 0.2, weapon: 0.3, assign: 0.06, unassign: 0.06, shot: 0.035, hit: 0.04, zdeath: 0.07, wallHit: 0.09, spit: 0.15, harvest: 1.2, scavenge: 0.03 };

  function on(type, d) {
    if (!SFX[type] || !allow(type, GAPS[type] ?? 0.05)) return;
    SFX[type](d || {});
  }

  function ambient(dt) {
    if (!ac || ac.state !== 'running' || !prefs.sfx || typeof S === 'undefined') return;
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

  const DAY = {
    bpm: 76,
    chords: [[57, 60, 64], [57, 60, 65], [55, 60, 64], [55, 59, 62]],
    bass: [45, 41, 48, 43],
    penta: [69, 72, 74, 76, 79, 81],
  };
  const NIGHT = {
    bpm: 132,
    chords: [[62, 65, 69], [62, 65, 69], [58, 62, 65], [57, 61, 64]],
    bass: [38, 38, 34, 33],
  };

  const currentMood = () => (typeof S !== 'undefined' && S.horde && S.horde.active) ? 'night' : 'day';
  const stepDur = () => 60 / (mood === 'day' ? DAY.bpm : NIGHT.bpm) / 4;

  function setMood(m) {
    if (m === mood) return;
    const t = ac.currentTime;
    for (const k in moodGain) {
      const g = moodGain[k].gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(k === m ? 1 : 0, t + (m === 'night' ? 1.2 : 3));
    }
    mood = m; step = 0; bar = 0;
    nextTime = t + 0.05;
  }

  function scheduler() {
    if (!ac || ac.state !== 'running') return;
    setMood(currentMood());
    ambient(0.025);
    if (nextTime < ac.currentTime - 0.5) nextTime = ac.currentTime + 0.05;
    while (nextTime < ac.currentTime + 0.15) {
      if (mood === 'day') dayStep(step % 16, nextTime); else nightStep(step % 16, nextTime);
      nextTime += stepDur();
      step++;
      if (step % 16 === 0) bar++;
    }
  }

  function dayStep(s, t) {
    const i = bar % 4, chord = DAY.chords[i], barLen = stepDur() * 16, m = 'day';
    if (s === 0) {
      for (const n of chord) {
        tone({ bus: 'music', mood: m, type: 'triangle', f: mtof(n), a: 1.2, hold: barLen - 1.2, d: 1.5, vol: 0.022, t, filter: { f: 1300 }, send: 0.6 });
        tone({ bus: 'music', mood: m, type: 'sine', f: mtof(n), a: 1.2, hold: barLen - 1.2, d: 1.5, vol: 0.02, t, detune: 7, send: 0.6 });
      }
    }
    if (s === 0 || s === 8) tone({ bus: 'music', mood: m, type: 'sine', f: mtof(DAY.bass[i]), a: 0.03, d: 1.3, vol: 0.11, t });
    if ([0, 3, 6, 8, 11, 14].includes(s) && Math.random() < 0.75) {
      const note = Math.random() < 0.7 ? pick(chord) + 12 : pick(DAY.penta);
      tone({ bus: 'music', mood: m, type: 'triangle', f: mtof(note), a: 0.005, d: 0.9, vol: 0.045, t, send: 0.6, pan: rand(-0.4, 0.4) });
      if (Math.random() < 0.12) tone({ bus: 'music', mood: m, type: 'sine', f: mtof(note + 12), a: 0.005, d: 1.4, vol: 0.02, t, send: 0.8 });
    }
  }

  function nightStep(s, t) {
    const i = bar % 4, chord = NIGHT.chords[i], root = NIGHT.bass[i], barLen = stepDur() * 16, m = 'night';
    const boss = typeof S !== 'undefined' && S.horde.zs && S.horde.zs.some(z => ZTYPES[z.type].boss);
    if (s === 0) {
      for (const n of chord) tone({ bus: 'music', mood: m, type: 'sawtooth', f: mtof(n - 12), a: 0.4, hold: barLen - 0.4, d: 0.6, vol: 0.016, t, filter: { f: 750 }, send: 0.3 });
      if (bar % 4 === 0) noise({ bus: 'music', mood: m, type: 'highpass', f: 5000, d: 1.3, vol: 0.05, t });
    }
    // baixo pulsante
    if (s % 2 === 0 || (s >= 14 && Math.random() < 0.5)) {
      tone({ bus: 'music', mood: m, type: 'sawtooth', f: mtof(root), a: 0.005, d: 0.14, vol: s === 0 ? 0.11 : 0.075, t, filter: { f: 380, q: 3 } });
    }
    // bateria
    if ([0, 6, 8, 11].includes(s)) tone({ bus: 'music', mood: m, type: 'sine', f: 125, f2: 42, a: 0.002, d: 0.24, vol: 0.4, t });
    if (s === 4 || s === 12) {
      noise({ bus: 'music', mood: m, type: 'bandpass', f: 1800, d: 0.15, vol: 0.14, t, send: 0.2 });
      tone({ bus: 'music', mood: m, type: 'triangle', f: 190, f2: 120, d: 0.08, vol: 0.08, t });
    }
    noise({ bus: 'music', mood: m, type: 'highpass', f: 7500, d: 0.035, vol: s % 2 ? 0.02 : 0.035, t });
    if (boss && (s === 2 || s === 10 || s === 14)) tone({ bus: 'music', mood: m, type: 'sine', f: 95, f2: 55, a: 0.003, d: 0.35, vol: 0.3, t, send: 0.4 });
    // cordas em ostinato
    if ([0, 3, 6, 8, 11, 14].includes(s)) {
      const n = chord[(s / 2 | 0) % 3] + 12;
      tone({ bus: 'music', mood: m, type: 'sawtooth', f: mtof(n), a: 0.005, d: 0.13, vol: 0.026, t, filter: { f: 2400 }, pan: s % 2 ? 0.3 : -0.3 });
    }
  }

  function applyPrefs() {
    if (ac) {
      const t = ac.currentTime;
      master.gain.setTargetAtTime(prefs.vol, t, 0.05);
      musicBus.gain.setTargetAtTime(prefs.music ? 0.5 : 0, t, 0.1);
      sfxBus.gain.setTargetAtTime(prefs.sfx ? 1 : 0, t, 0.05);
    }
    const mb = document.getElementById('snd-music'), sb = document.getElementById('snd-sfx');
    if (mb) { mb.classList.toggle('off', !prefs.music); mb.title = prefs.music ? 'Desligar música' : 'Ligar música'; }
    if (sb) { sb.classList.toggle('off', !prefs.sfx); sb.textContent = prefs.sfx ? '🔊' : '🔇'; sb.title = prefs.sfx ? 'Desligar efeitos' : 'Ligar efeitos'; }
    savePrefs();
  }

  function setup() {
    listeners.push(on);
    const start = () => init();
    document.addEventListener('pointerdown', start);
    document.addEventListener('keydown', start);
    const mb = document.getElementById('snd-music'), sb = document.getElementById('snd-sfx'), vol = document.getElementById('snd-vol');
    if (mb) mb.onclick = () => { prefs.music = !prefs.music; applyPrefs(); };
    if (sb) sb.onclick = () => { prefs.sfx = !prefs.sfx; applyPrefs(); };
    if (vol) { vol.value = Math.round(prefs.vol * 100); vol.oninput = () => { prefs.vol = vol.value / 100; applyPrefs(); }; }
    applyPrefs();
  }

  return { setup, init };
})();
