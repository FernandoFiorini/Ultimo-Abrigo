'use strict';

// o campo de treino do debug não vai para o save (volta como se não houvesse horda)
const saveJson = () => JSON.stringify(S, (k, v) => (k === 'horde' && v && v.train ? { active: false, queue: [], zs: [] } : v));

// Cópia de segurança: a cada BAK_GAP, o save anterior (que já carregou direito) vira a cópia do espaço.
// Se o save principal corromper (aba fechada no meio da gravação, armazenamento cheio), o jogo abre a cópia.
const BAK_GAP = 60000;
let lastBak = 0;
function save() {
  if (awaitingChoice || importing || Slots.dead || !Slots.ready) return false;
  try {
    const key = Slots.key(Slots.cur);
    if (Date.now() - lastBak > BAK_GAP) {
      const prev = localStorage.getItem(key);
      if (prev && Slots.valid(prev)) { try { localStorage.setItem(Slots.bakKey(Slots.cur), prev); } catch (e) { /* sem espaço para a cópia: segue sem ela */ } }
      lastBak = Date.now();
    }
    localStorage.setItem(key, saveJson());
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
    let raw = localStorage.getItem(Slots.key(Slots.cur));
    // save corrompido: abre a cópia de segurança (e avisa depois de carregar)
    let restored = false;
    if (raw && !Slots.valid(raw)) {
      const bak = localStorage.getItem(Slots.bakKey(Slots.cur));
      if (bak && Slots.valid(bak)) { raw = bak; restored = true; }
    }
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
      // saves de antes da 1.07 não sabem quando começaram (o padrão seria a data de hoje)
      if (d.meta && d.meta.stats && !d.meta.stats.since) meta.stats.since = 0;
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
      if (restored) {
        addLog('💾 O save deste espaço estava corrompido. Abrimos a cópia de segurança mais recente (pode faltar o último minuto de jogo).', 'warn');
        setTimeout(() => { if (typeof toast === 'function') toast({ icon: '💾', label: 'Progresso recuperado', name: 'Abrimos a cópia de segurança', desc: 'O save estava corrompido. Pode faltar o último minuto de jogo.', time: 8000 }); }, 1500);
      }
    } else {
      firstRun = true;
    }
  } catch (e) { S = newState(); firstRun = true; }
}
let sessionT = 0;   // segundos jogados desde que a página abriu
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
function importSave(code, slot = Slots.cur) {
  const d = decodeSave(code);
  if (Slots.buried(d.meta.runId)) throw new Error('Este save morreu no modo Apocalipse. A morte é permanente: ele não pode ser recuperado.');
  d.last = Date.now();
  importing = true;
  localStorage.setItem(Slots.key(slot), JSON.stringify(d));
  Store.del(Slots.bakKey(slot));   // a cópia de segurança era do progresso substituído
  Slots.open(slot);
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
