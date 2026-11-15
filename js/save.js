'use strict';

// o campo de treino do debug não vai para o save (volta como se não houvesse horda)
const saveJson = () => JSON.stringify(S, (k, v) => (k === 'horde' && v && v.train ? { active: false, queue: [], zs: [] } : v));

function save() {
  if (awaitingChoice || importing || Slots.dead || !Slots.ready) return false;
  try {
    localStorage.setItem(Slots.key(Slots.cur), saveJson());
    $('save-status').textContent = 'Salvo às ' + new Date().toLocaleTimeString('pt-BR');
    return true;
  } catch (e) { return false; /* armazenamento indisponível */ }
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
    const raw = localStorage.getItem(Slots.key(Slots.cur));
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
      if (!DIFFS[S.diff]) S.diff = 'normal';
      // trava de dificuldade: saves antigos começam travados na dificuldade em que estão
      S.meta.minDiff = Math.max(S.meta.minDiff || 0, diffRank(S.diff));
      if (!S.meta.runId) S.meta.runId = Slots.rid();
      if (!S.meta.wins || typeof S.meta.wins !== 'object') S.meta.wins = {};
      Endgame.migrateHeroes();
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
  const bytes = new TextEncoder().encode(saveJson());
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
  } catch (e) { throw new Error('O código não é válido (não parece um save do Voidfall).'); }
  let d;
  try { d = JSON.parse(json); } catch (e) { throw new Error('O código está incompleto ou corrompido.'); }
  if (!d || typeof d !== 'object' || !d.meta || typeof d.survivors !== 'number') throw new Error('Esse código não contém um save do Voidfall.');
  return d;
}
// Substitui o save atual e recarrega a página (o carregamento normal cuida da migração)
function importSave(code) {
  const d = decodeSave(code);
  if (Slots.buried(d.meta.runId)) throw new Error('Este save morreu no modo Apocalipse. A morte é permanente: ele não pode ser recuperado.');
  d.last = Date.now();
  importing = true;
  localStorage.setItem(Slots.key(Slots.cur), JSON.stringify(d));
  Slots.open(Slots.cur);
}

function startFirstRun() {
  awaitingChoice = true;
  // a abertura da história vem antes da escolha de dificuldade (só uma vez por save)
  Story.playOnce('intro', () => chooseDifficulty({
    title: '☣ Voidfall',
    sub: 'Você e mais dois sobreviventes encontraram um armazém abandonado. A horda chega ao anoitecer. <b>Escolha a dificuldade:</b>',
    cancel: false,
    onPick: diff => {
      S = newState(S.meta, diff);
      if (!S.meta.runId) S.meta.runId = Slots.rid();
      addLog(`Você e mais dois sobreviventes encontraram um armazém abandonado. A horda chega ao anoitecer. Prepare-se. (${DIFFS[diff].icon} ${DIFFS[diff].nome})`, 'warn');
      awaitingChoice = false;
      save();
    },
  }));
}

// Saves de antes do seletor: escolhe a dificuldade uma vez, sem perder o progresso
function startLegacyChoice() {
  awaitingChoice = true;
  chooseDifficulty({
    title: '☣ Escolha a dificuldade',
    sub: 'O jogo agora tem níveis de dificuldade. Escolha um para a <b>cidade atual</b>: seu progresso continua. Depois ela não muda mais neste save.',
    cancel: false,
    onPick: diff => {
      S.diff = diff;
      addLog(`Dificuldade definida: ${DIFFS[diff].icon} ${DIFFS[diff].nome}.`, 'warn');
      awaitingChoice = false;
      save();
    },
  });
}
