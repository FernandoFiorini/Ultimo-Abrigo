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
    tips: true,            // dicas do tutorial
    guide: true,           // tutorial guiado das ondas 1 e 2 (só aparece uma vez)
    reduceFx: false, noShake: false, colorblind: false,
    blood: true,           // sangue e mutilação (corpos se despedaçando)
    vfilter: 'none',       // filtro visual (js/vfilter.js): crt | sepia | noturna | sangue | camera
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
  const inGame = typeof S !== 'undefined' && S && Slots.ready;   // também abre pelo menu principal, sem jogo carregado
  const seg = (key, opts) => `<div class="segs">${Object.entries(opts).map(([k, o]) => `
    <label class="seg" title="${o.desc}"><input type="radio" name="${key}" value="${k}" data-set="${key}" ${Settings.get(key) === k ? 'checked' : ''}><span>${o.nome}</span></label>`).join('')}</div>`;
  const check = (key, label, hint) => `
    <label class="opt"><input type="checkbox" data-set="${key}" ${Settings.get(key) ? 'checked' : ''}>
      <span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span></label>`;
  const range = (key, label) => `
    <label class="opt range"><span><b>${label}</b></span>
      <input type="range" min="0" max="100" data-set="${key}" value="${Math.round(Settings.get(key) * 100)}"><output>${Math.round(Settings.get(key) * 100)}%</output></label>`;

  const TABS = { game: '⏩ Jogo', visual: '🎨 Visual', audio: '🔊 Áudio', data: '💾 Dados' };
  const cur = TABS[openSettings.tab] ? openSettings.tab : 'game';
  const pane = (id, html) => `<div class="set-pane" data-pane="${id}"${id === cur ? '' : ' hidden'}>${html}</div>`;

  openDialog({
    title: '⚙️ Configurações',
    staticBody: true,
    plain: true,
    body: `
      <div class="tabs set-tabs" role="tablist">${Object.entries(TABS).map(([id, nome], i) => `
        <button class="tab${id === cur ? ' active' : ''}" role="tab" aria-selected="${id === cur}" data-tab="${id}" data-hotkey="${i + 1}">${nome} ${hk(i + 1)}</button>`).join('')}
      </div>

      ${pane('game', `
      ${check('speed2x', 'Velocidade 2x durante o dia', 'Acelera produção e o tempo até a horda. Volta ao normal sozinho quando a horda chega. Atalho: F')}
      ${check('guide', 'Tutorial guiado', 'Nas duas primeiras ondas, pausa o jogo e mostra onde clicar, passo a passo. Aparece só na primeira vez.')}
      ${check('tips', 'Mostrar dicas', 'Os balões de dica do tutorial (canto da tela). Desligado, nenhuma dica aparece, em nenhum save.')}
      <div class="actions">
        <button data-cmd="guide">🎓 Rever tutorial guiado</button>
        ${inGame ? '<button data-cmd="tips">Rever dicas do tutorial</button>' : ''}
        <button data-cmd="keys">⌨️ Atalhos</button>
      </div>`)}

      ${pane('visual', `
      ${inGame ? '<div class="actions"><button data-cmd="skins">🎨 Visual: skins e personagem</button></div>' : ''}
      <div class="opt-label">Estilo do cenário</div>
      ${seg('sceneStyle', SCENE_STYLES)}
      <div class="opt-label">Filtro visual</div>
      <div class="segs vf-segs">${Object.entries(VFILTERS).map(([k, f]) => { const ok = VFilter.unlocked(k); return `
        <label class="seg${ok ? '' : ' locked'}" title="${ok ? f.desc : '🔒 ' + VFilter.how(k)}"><input type="radio" name="vfilter" value="${k}" data-set="vfilter" ${VFilter.current() === k ? 'checked' : ''} ${ok ? '' : 'disabled'}><span>${ok ? f.icon : '🔒'} ${f.nome}</span></label>`; }).join('')}</div>
      <p class="hint"><span id="vf-desc">${VFILTERS[VFilter.current()].desc}.</span> Novos filtros são liberados ao encontrar a Cura: cada dificuldade vencida libera um.</p>
      ${check('blood', 'Sangue e mutilação', 'Sangue no cenário e zumbis se despedaçando ao morrer. Desligado, os zumbis só caem e os impactos levantam poeira.')}
      <h3>♿ Acessibilidade</h3>
      ${check('reduceFx', 'Reduzir efeitos visuais', 'Menos partículas, fumaça e clarões')}
      ${check('noShake', 'Desligar tremor de tela')}
      ${check('colorblind', 'Cores para daltonismo', 'Troca verde e vermelho por azul e laranja nos avisos')}`)}

      ${pane('audio', `
      ${check('music', 'Música')}
      ${check('sfx', 'Efeitos sonoros')}
      ${range('vol', 'Volume geral')}
      ${range('musicVol', 'Volume da música')}
      ${range('sfxVol', 'Volume dos efeitos')}
      <div class="opt-label">Estilo musical</div>
      ${seg('musicStyle', MUSIC_STYLES)}
      <p class="hint" id="style-desc">${MUSIC_STYLES[Settings.get('musicStyle')].desc}</p>`)}

      ${pane('data', !inGame ? `<p class="hint">O progresso é salvo automaticamente neste navegador. Abra um jogo para exportar ou importar um código de progresso.</p>
      <div class="actions"><button data-cmd="bug">🐞 Reportar bug</button></div>` : `
      <p class="hint">O progresso é salvo automaticamente neste navegador, no <b>espaço ${Slots.cur}</b> (${escHtml(S.meta.player)}). Exporte um código para guardar uma cópia ou levar o jogo para outro aparelho.</p>
      <div class="actions">
        <button data-cmd="export">Exportar progresso</button>
        <button data-cmd="import">Importar progresso</button>
        <button data-cmd="menu">☰ Menu principal</button>
        <button data-cmd="bug">🐞 Reportar bug</button>
      </div>`)}`,
    cancel: 'Fechar',
    onMount: () => {
      const body = $('dialog-body');
      body.querySelector('.set-tabs').addEventListener('click', e => {
        const t = e.target.closest('[data-tab]');
        if (!t) return;
        openSettings.tab = t.dataset.tab;
        for (const b of body.querySelectorAll('[data-tab]')) {
          const on = b === t;
          b.classList.toggle('active', on);
          b.setAttribute('aria-selected', on);
        }
        for (const p of body.querySelectorAll('[data-pane]')) p.hidden = p.dataset.pane !== t.dataset.tab;
      });
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
        if (k === 'vfilter') $('vf-desc').textContent = VFILTERS[el.value].desc + '.';
        if (inGame) render();
      });
      body.addEventListener('click', e => {
        const b = e.target.closest('[data-cmd]');
        if (!b) return;
        const cmd = b.dataset.cmd;
        if (cmd === 'export') showExport();
        else if (cmd === 'import') showImport();
        else if (cmd === 'keys') showShortcuts();
        else if (cmd === 'skins') showSkins();
        else if (cmd === 'menu') Slots.toMenu();
        else if (cmd === 'bug') BugReport.open();
        else if (cmd === 'guide') {
          Guide.reset();
          b.textContent = '✓ O guia volta no próximo jogo novo';
          b.disabled = true;
          const cb = body.querySelector('[data-set="guide"]');
          if (cb) cb.checked = true;
          if (inGame) addLog('🎓 O tutorial guiado vai aparecer de novo nas primeiras ondas de um jogo novo.');
        }
        else if (cmd === 'tips') { Settings.set('tips', true); Tutorial.reset(); addLog('💡 As dicas do tutorial vão aparecer de novo.'); dialogEsc(); }
      });
    },
  });
}
