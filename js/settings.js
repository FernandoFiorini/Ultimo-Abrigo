'use strict';

// Preferências do aparelho (áudio, visual, acessibilidade). Ficam fora do save:
// valem para este navegador e não viajam no código de exportação.
const Settings = (() => {
  const KEY = 'ultimoAbrigo.settings', OLD_AUDIO = 'ultimoAbrigo.audio';
  const DEF = {
    music: true, sfx: true, vol: 0.7, musicVol: 1, sfxVol: 1,
    musicStyle: 'synth',   // classic | synth | terror
    sceneStyle: 'auto',    // auto (segue a música) | classic | synth | terror
    speed2x: false,
    reduceFx: false, noShake: false, colorblind: false,
  };
  const v = { ...DEF };
  // preferências de áudio da 1.01 e anteriores
  try { Object.assign(v, JSON.parse(localStorage.getItem(OLD_AUDIO) || '{}')); } catch (e) { /* sem armazenamento */ }
  try { Object.assign(v, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* sem armazenamento */ }
  const subs = [];
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
  return {
    get: k => v[k],
    set(k, val) {
      if (v[k] === val) return;
      v[k] = val;
      persist();
      for (const f of subs) f(k, val);
    },
    on: f => subs.push(f),
  };
})();

const MUSIC_STYLES = {
  classic: { nome: 'Clássica', desc: 'Violões e pads suaves de dia, cordas tensas à noite' },
  synth:   { nome: 'Synthwave', desc: 'Sintetizadores dos anos 80: calmo de dia, darksynth à noite' },
  terror:  { nome: 'Terror', desc: 'Caixinha de música e drones de dia, batidas industriais e coração acelerado à noite' },
};
const SCENE_STYLES = {
  auto:    { nome: 'Automático', desc: 'Combina com o estilo da música' },
  classic: { nome: 'Clássico', desc: 'Pôr do sol alaranjado' },
  synth:   { nome: 'Synthwave', desc: 'Céu roxo, sol listrado e neon' },
  terror:  { nome: 'Terror', desc: 'Céu cinzento, neblina constante' },
};
// estilo visual efetivo
const sceneStyle = () => {
  const s = Settings.get('sceneStyle');
  return s === 'auto' || !SCENE_STYLES[s] ? (MUSIC_STYLES[Settings.get('musicStyle')] ? Settings.get('musicStyle') : 'synth') : s;
};
// velocidade 2x só vale de dia
const fastOn = () => Settings.get('speed2x') && typeof S !== 'undefined' && S && !S.horde.active;

function applyBodyPrefs() {
  document.body.classList.toggle('cb', !!Settings.get('colorblind'));
}

// ---------- janela de configurações ----------
function openSettings() {
  const seg = (key, opts) => `<div class="segs">${Object.entries(opts).map(([k, o]) => `
    <label class="seg" title="${o.desc}"><input type="radio" name="${key}" value="${k}" data-set="${key}" ${Settings.get(key) === k ? 'checked' : ''}><span>${o.nome}</span></label>`).join('')}</div>`;
  const check = (key, label, hint) => `
    <label class="opt"><input type="checkbox" data-set="${key}" ${Settings.get(key) ? 'checked' : ''}>
      <span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span></label>`;
  const range = (key, label) => `
    <label class="opt range"><span><b>${label}</b></span>
      <input type="range" min="0" max="100" data-set="${key}" value="${Math.round(Settings.get(key) * 100)}"><output>${Math.round(Settings.get(key) * 100)}%</output></label>`;

  openDialog({
    title: '⚙️ Configurações',
    staticBody: true,
    body: `
      <h3>🔊 Áudio</h3>
      ${check('music', 'Música')}
      ${check('sfx', 'Efeitos sonoros')}
      ${range('vol', 'Volume geral')}
      ${range('musicVol', 'Volume da música')}
      ${range('sfxVol', 'Volume dos efeitos')}
      <div class="opt-label">Estilo musical</div>
      ${seg('musicStyle', MUSIC_STYLES)}
      <p class="hint" id="style-desc">${MUSIC_STYLES[Settings.get('musicStyle')].desc}</p>

      <h3>🎨 Visual</h3>
      <div class="opt-label">Estilo do cenário</div>
      ${seg('sceneStyle', SCENE_STYLES)}

      <h3>⏩ Jogo</h3>
      ${check('speed2x', 'Velocidade 2x durante o dia', 'Acelera produção e o tempo até a horda. Volta ao normal sozinho quando a horda chega. Atalho: F')}

      <h3>♿ Acessibilidade</h3>
      ${check('reduceFx', 'Reduzir efeitos visuais', 'Menos partículas, fumaça e clarões')}
      ${check('noShake', 'Desligar tremor de tela')}
      ${check('colorblind', 'Cores para daltonismo', 'Troca verde e vermelho por azul e laranja nos avisos')}

      <h3>💾 Dados</h3>
      <div class="actions">
        <button data-cmd="export">Exportar progresso</button>
        <button data-cmd="import">Importar progresso</button>
        <button data-cmd="tips">Rever dicas do tutorial</button>
        <button data-cmd="keys">⌨️ Atalhos</button>
      </div>`,
    cancel: 'Fechar',
    onMount: () => {
      const body = $('dialog-body');
      body.addEventListener('input', e => {
        const el = e.target, k = el.dataset.set;
        if (!k) return;
        if (el.type === 'range') { Settings.set(k, el.value / 100); el.nextElementSibling.textContent = el.value + '%'; }
      });
      body.addEventListener('change', e => {
        const el = e.target, k = el.dataset.set;
        if (!k) return;
        if (el.type === 'checkbox') Settings.set(k, el.checked);
        else if (el.type === 'radio') Settings.set(k, el.value);
        if (k === 'musicStyle') $('style-desc').textContent = MUSIC_STYLES[el.value].desc;
        render();
      });
      body.addEventListener('click', e => {
        const b = e.target.closest('[data-cmd]');
        if (!b) return;
        const cmd = b.dataset.cmd;
        if (cmd === 'export') showExport();
        else if (cmd === 'import') showImport();
        else if (cmd === 'keys') showShortcuts();
        else if (cmd === 'tips') { Tutorial.reset(); addLog('💡 As dicas do tutorial vão aparecer de novo.'); dialogEsc(); }
      });
    },
  });
}
