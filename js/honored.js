'use strict';

// Sobreviventes homenageados (lista HONORED em config.js): entram no grupo como qualquer sobrevivente,
// mas só eles falam as próprias frases, num balão no cenário e no registro. Ver também pickName (state.js).
const Honored = (() => {
  const pickOf = a => a[Math.floor(Math.random() * a.length)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const list = () => (typeof HONORED !== 'undefined' ? HONORED : []);
  const byName = n => list().find(h => h.nome === n);
  const present = () => (S.people || []).filter(byName);
  let wait = rand(20, 35);

  // fala uma frase. kind: 'frases' (do dia a dia) ou 'horda' (quando a horda chega); sem frases desse tipo, usa as do dia a dia
  function say(name, kind = 'frases') {
    const h = byName(name);
    if (!h) return false;
    const pool = (h[kind] && h[kind].length ? h[kind] : h.frases) || [];
    if (!pool.length) return false;
    const text = pickOf(pool);
    emit('say', { name, text, fem: h.sexo === 'f', look: h.visual });
    addLog(`💬 ${name}: "${text}"`);
    return true;
  }

  // de tempos em tempos, de dia ou de noite, alguém da lista que está no grupo fala
  function tick(dt) {
    if (!list().length || (typeof paused !== 'undefined' && paused)) return;
    wait -= dt;
    if (wait > 0) return;
    wait = rand(HONORED_GAP[0], HONORED_GAP[1]);
    const ps = present();
    if (ps.length) say(pickOf(ps));
  }

  // a horda chegou: às vezes um deles grita a frase de horda
  function onWaveStart() {
    const ps = present();
    if (ps.length && Math.random() < 0.6) { say(pickOf(ps), 'horda'); wait = Math.max(wait, 20); }
  }

  // últimas palavras (vão para o memorial)
  function lastWords(name) { const h = byName(name); return h && h.adeus && h.adeus.length ? pickOf(h.adeus) : null; }

  function setup() { listeners.push(t => { if (t === 'waveStart') onWaveStart(); }); }

  return { say, tick, setup, lastWords, is: n => !!byName(n), byName };
})();
