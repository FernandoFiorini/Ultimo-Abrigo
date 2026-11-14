'use strict';
// Jogador automatizado: carrega o jogo de verdade (os mesmos arquivos de js/) no Node, sem navegador,
// e joga sozinho ao vivo (zumbi por zumbi) por um tempo em cada dificuldade. Serve para ajustar o equilíbrio.
// Só roda quando você chama. Não faz parte do jogo publicado.
//
// Uso:  node tools/bot.js [--min 60] [--dif normal,dificil] [--cidade 1] [--clicar]
//   --min     minutos de jogo por dificuldade (padrão 60)
//   --dif     dificuldades separadas por vírgula (padrão: todas)
//   --cidade  cidade inicial (a ameaça dos zumbis sobe a cada cidade; padrão 1)
//   --clicar  o bot também vasculha (clique) uma vez por segundo, como um jogador ativo
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

// ---------- argumentos
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const MIN = Number(opt('min') || 60), CITY = Number(opt('cidade') || 1), CLICK = args.includes('--clicar');

// ---------- navegador falso (o mínimo para os scripts carregarem)
const el = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? () => '' : el()), apply: () => el(), set: () => true,
});
const store = {};
const ctx = {
  console, Math, Date, JSON, Buffer, performance, NodeFilter: { SHOW_TEXT: 4 },
  setTimeout() {}, setInterval() {}, clearTimeout() {}, requestAnimationFrame() {}, addEventListener() {},
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  location: { protocol: 'https:', hostname: 'bot' }, navigator: {},
  document: { hidden: true, addEventListener() {}, getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [],
    createElement: () => el(), createTreeWalker: () => ({ nextNode: () => null }), body: el() },
};
ctx.window = ctx;
vm.createContext(ctx);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
for (const f of html.match(/js\/[a-z]+\.js/g)) {
  if (/\/(main|menu|demos|tutorial)\.js$/.test(f)) continue;   // interface que só existe no navegador
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
}

// ---------- o bot (roda dentro do jogo)
vm.runInContext(String.raw`
  listeners.length = 0;                 // sem cena nem som
  const LOG = [];
  addLog = (t, type) => LOG.push({ t, type });
  save = () => {};

  // Decisões, uma vez por segundo de jogo: reparar, recrutar, distribuir funções e construir
  function think() {
    while (S.meta.champ && S.meta.champ.boxes.length) Champions.openBox(true);
    for (let i = 0; i < 5 && S.wallHp < maxWall() * 0.5 && S.res.sucata >= REPAIR_COST; i++) actions.repair();
    if (!hasMod('isolados') && S.survivors < maxSurv() && S.res.comida >= recruitCost() * 1.5 + 30 && rates().comida > 0) actions.recruit();
    for (let g = 0; idle() > 0 && g < 50; g++) {
      const r = rates();
      const k = r.comida < 0.3 ? 'forrageiro'
        : S.jobs.guarda < Math.ceil(S.survivors * 0.35) ? 'guarda'
        : S.jobs.armeiro < Math.ceil(S.jobs.guarda / 2) ? 'armeiro'
        : S.injured.length && S.jobs.medico < 1 ? 'medico'
        : 'coletor';
      actions.jobAdd(k);
    }
    // feridos sem médico: tira um coletor para cuidar deles
    if (S.injured.length && !S.jobs.medico && S.jobs.coletor > 1) { actions.jobSub('coletor'); actions.jobAdd('medico'); }
    // obra: barraca quando lota; com a defesa apertada, a defesa mais barata; senão, a obra mais barata
    const ok = k => !buildBlocked(k) && !buildLocked(k) && canAfford(buildCost(k));
    if (S.survivors >= maxSurv() && ok('beliche')) { actions.build('beliche'); return; }
    const DEF = ['torreC', 'torre', 'torreL', 'muro', 'alojamento'];
    const pool = ratio() < 1.3 ? DEF : Object.keys(BUILD).filter(k => k !== 'radio' && k !== 'lab');
    const opts = pool.filter(ok).sort((a, b) => (buildCost(a).sucata || 0) - (buildCost(b).sucata || 0));
    if (opts.length) actions.build(opts[0]);
  }

  function ratio() {
    const n = S.wave, th = waveThreat(n);
    return defenseEstimate(waveSize(n), n, S.res.municao).dmg * Endgame.mult('dmg') * Endgame.offlineMult() / Math.max(0.01, th);
  }

  // Joga 'minutes' minutos ao vivo numa dificuldade e devolve o relatório
  function runBot(diff, minutes, city, click) {
    S = newState(newMeta(), diff);
    S.meta.city = city;
    S.wallHp = maxWall();
    LOG.length = 0;
    Slots.dead = false;
    const dt = 0.1, total = minutes * 60, timeline = [];
    let t = 0, falls = 0, best = 0, fallen0 = S.meta.fallen || 0, thinkT = 0, fatSum = 0, fatN = 0, st = S, perished = false;
    while (t < total) {
      tick(dt, true);
      t += dt;
      // Apocalipse: a morte é permanente, o save acaba aqui
      if (Slots.dead) { falls++; perished = true; break; }
      if (S !== st) { falls++; st = S; S.meta.city = city; }
      best = Math.max(best, S.best || 0);
      if (S.horde.active) { fatSum += S.fatigue || 0; fatN++; }
      thinkT += dt;
      if (thinkT >= 1) { thinkT = 0; think(); if (click) actions.scavenge(); }
      if (Math.round(t * 10) % (600 * 10) === 0) timeline.push({ min: Math.round(t / 60), wave: S.wave, surv: S.survivors, guards: S.jobs.guarda });
    }
    return {
      diff, minutes, city, best, wave: S.wave, falls, perished, played: Math.round(t / 60), dead: (S.meta.fallen || 0) - fallen0, surv: S.survivors, max: maxSurv(),
      jobs: { ...S.jobs }, build: { ...S.build }, res: Object.fromEntries(Object.entries(S.res).map(([k, v]) => [k, Math.round(v)])),
      ratio: ratio(), fatigue: fatN ? fatSum / fatN : 0, injuries: LOG.filter(l => /se feriu de guarda/.test(l.t)).length,
      unpaid: LOG.filter(l => /manutenção/.test(l.t)).length, timeline,
    };
  }
`, ctx);

// ---------- execução e relatório
const diffs = (opt('dif') || Object.keys(vm.runInContext('DIFFS', ctx)).join(',')).split(',');
console.log(`🤖 Bot: ${MIN} min de jogo por dificuldade · cidade ${CITY}${CLICK ? ' · vasculhando 1x/s' : ''}\n`);
for (const d of diffs) {
  const t0 = Date.now();
  ctx.__args = [d, MIN, CITY, CLICK];
  const r = vm.runInContext('runBot(...__args)', ctx);
  const tw = Object.entries(r.build).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || 'nada';
  console.log(`== ${d} (${((Date.now() - t0) / 1000).toFixed(1)}s de processamento)`);
  console.log(`   melhor onda ${r.best} · onda atual ${r.wave} · quedas do abrigo ${r.falls} · mortes ${r.dead}` +
    (r.perished ? ` · ☠️ SAVE APAGADO (morte permanente) aos ${r.played} min` : ''));
  console.log(`   grupo ${r.surv}/${r.max} · funções ${JSON.stringify(r.jobs)}`);
  console.log(`   construções: ${tw}`);
  console.log(`   recursos ${JSON.stringify(r.res)}`);
  console.log(`   defesa ÷ ameaça na próxima onda: ${r.ratio.toFixed(2)} · cansaço médio na horda ${Math.round(r.fatigue * 100)}% · guardas feridos ${r.injuries} · hordas sem manutenção ${r.unpaid}`);
  console.log(`   a cada 10 min: ${r.timeline.map(p => `${p.min}min onda ${p.wave} (${p.surv} pessoas)`).join(' · ')}\n`);
}
