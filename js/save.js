'use strict';

function save() {
  if (awaitingChoice || importing) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    $('save-status').textContent = 'Salvo às ' + new Date().toLocaleTimeString('pt-BR');
  } catch (e) { /* armazenamento indisponível */ }
}

// Junta o save com os valores padrão (campos novos ganham o padrão; listas vêm do save)
function mergeDeep(base, saved) {
  const out = { ...base };
  for (const k in saved) {
    const b = base[k], v = saved[k];
    out[k] = b && v && typeof b === 'object' && typeof v === 'object' && !Array.isArray(b) ? mergeDeep(b, v) : v;
  }
  return out;
}

function load() {
  S = newState();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (!(d.meta && d.meta.diffChosen)) legacyChoice = true;
      // quem já jogava antes do tutorial não precisa dele
      const veteran = d.meta && !d.meta.tutorial && ((d.meta.stats && d.meta.stats.bestWave) || d.best || 0) >= 2;
      const base = newState();
      const meta = mergeDeep(base.meta, d.meta || {});
      // saves antigos: aproveita o que já foi conquistado nesta partida
      meta.stats.bestWave = Math.max(meta.stats.bestWave, d.best || 0);
      meta.stats.kills = Math.max(meta.stats.kills, d.kills || 0);
      S = { ...base, ...d, meta,
        res: { ...base.res, ...d.res },
        jobs: { ...base.jobs, ...d.jobs },
        build: { ...base.build, ...d.build },
        horde: { ...base.horde, ...d.horde },
        exps: d.exps || [],
        log: (d.log || []).slice(0, 3) };
      if (veteran) S.meta.tutorial = { off: true };
      syncPeople();
      offlineProgress();
    } else {
      firstRun = true;
    }
  } catch (e) { S = newState(); firstRun = true; }
}
let firstRun = false, legacyChoice = false, awaitingChoice = false, modalOpen = false, importing = false, paused = false;

// ---------- exportar / importar ----------
// O código é o JSON do save em Base64 (com UTF-8, por causa dos acentos e emojis do registro)
const SAVE_PREFIX = 'UA1:';
function exportCode() {
  save();
  const bytes = new TextEncoder().encode(JSON.stringify(S));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return SAVE_PREFIX + btoa(bin);
}
function decodeSave(code) {
  code = String(code || '').trim().replace(/\s+/g, '');
  if (code.startsWith(SAVE_PREFIX)) code = code.slice(SAVE_PREFIX.length);
  let json;
  try {
    const bin = atob(code);
    json = new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  } catch (e) { throw new Error('O código não é válido (não parece um save do Último Abrigo).'); }
  let d;
  try { d = JSON.parse(json); } catch (e) { throw new Error('O código está incompleto ou corrompido.'); }
  if (!d || typeof d !== 'object' || !d.meta || typeof d.survivors !== 'number') throw new Error('Esse código não contém um save do Último Abrigo.');
  return d;
}
// Substitui o save atual e recarrega a página (o carregamento normal cuida da migração)
function importSave(code) {
  const d = decodeSave(code);
  d.last = Date.now();
  importing = true;
  localStorage.setItem(SAVE_KEY, JSON.stringify(d));
  location.reload();
}

function startFirstRun() {
  awaitingChoice = true;
  chooseDifficulty({
    title: '☣ Último Abrigo',
    sub: 'Você e mais dois sobreviventes encontraram um armazém abandonado. A horda chega ao anoitecer. <b>Escolha a dificuldade:</b>',
    cancel: false,
    onPick: diff => {
      S = newState(S.meta, diff);
      addLog(`Você e mais dois sobreviventes encontraram um armazém abandonado. A horda chega ao anoitecer. Prepare-se. (${DIFFS[diff].icon} ${DIFFS[diff].nome})`, 'warn');
      awaitingChoice = false;
      save();
    },
  });
}

// Saves de antes do seletor: escolhe a dificuldade uma vez, sem perder o progresso
function startLegacyChoice() {
  awaitingChoice = true;
  chooseDifficulty({
    title: '☣ Escolha a dificuldade',
    sub: 'O jogo agora tem níveis de dificuldade. Escolha um para a <b>cidade atual</b>: seu progresso continua. Depois, dá para mudar pelo selo ao lado do título (recomeçando a cidade).',
    cancel: false,
    onPick: diff => {
      S.diff = diff;
      addLog(`Dificuldade definida: ${DIFFS[diff].icon} ${DIFFS[diff].nome}.`, 'warn');
      awaitingChoice = false;
      save();
    },
  });
}
