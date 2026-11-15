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
//   --mirar   chance de acerto do líder com as armas, de 0 a 1 (padrão 0.6; 0 = o líder não atira)
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

// ---------- argumentos
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const MIN = Number(opt('min') || 60), CITY = Number(opt('cidade') || 1), CLICK = args.includes('--clicar');
const AIM = Number(opt('mirar') ?? 0.6);
const EVAC_RATIO = Number(opt('evacuar') ?? 0.6);
const SPEND = opt('gastar') || 'nada';   // campanha: onde gastar o cash (fragmento, tampinhas ou nada)   // campanha: evacua quando defesa ÷ ameaça da próxima onda cai abaixo disto

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
    const J = typeof Unlocks !== 'undefined' ? Unlocks.job : () => true;   // versões sem desbloqueio por onda
    for (let g = 0; idle() > 0 && g < 50; g++) {
      const r = rates();
      const k = r.comida < 0.3 ? 'forrageiro'
        : J('guarda') && S.jobs.guarda < Math.ceil(S.survivors * 0.35) ? 'guarda'
        : J('armeiro') && S.jobs.armeiro < Math.ceil(S.jobs.guarda / 2) ? 'armeiro'
        : J('medico') && S.injured.length && S.jobs.medico < 1 ? 'medico'
        : 'coletor';
      actions.jobAdd(k);
    }
    // guardas recém-liberados: tira gente do excesso de coletores para a defesa
    if (J('guarda') && S.jobs.guarda < Math.ceil(S.survivors * 0.35) && S.jobs.coletor > 2) { actions.jobSub('coletor'); actions.jobAdd('guarda'); }
    // feridos sem médico: tira um coletor para cuidar deles
    if (J('medico') && S.injured.length && !S.jobs.medico && S.jobs.coletor > 1) { actions.jobSub('coletor'); actions.jobAdd('medico'); }
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

  // O líder atira: no zumbi mais perto do muro ao alcance, acertando com a chance 'aim'
  // (um erro mira ao lado do zumbi). Só a pistola: o bot não compra armas.
  let aimShots = 0, aimHits = 0;
  function leaderShoot(aim) {
    if (!aim || !S.horde.active || S.clickCd > 0 || S.reload) return;
    const far = Weapons.reach();
    let z = null;
    for (const o of S.horde.zs) if (!o.dead && !o.under && o.x <= far && (!z || o.x < z.x)) z = o;
    if (!z) return;
    const s = zsc(z), hit = Math.random() < aim;
    aimShots++; if (hit) aimHits++;
    Weapons.fire(z.x + (hit ? 0 : 14 * s + 6), z.y - (z.lift || 0) - 10 * s);
  }

  // Joga 'minutes' minutos ao vivo numa dificuldade e devolve o relatório
  function runBot(diff, minutes, city, click, aim) {
    S = newState(newMeta(), diff);
    S.meta.city = city;
    S.wallHp = maxWall();
    LOG.length = 0;
    Slots.dead = false;
    const dt = 0.1, total = minutes * 60, timeline = [];
    let t = 0, falls = 0, best = 0, fallen0 = S.meta.fallen || 0, thinkT = 0, fatSum = 0, fatN = 0, st = S, perished = false;
    const early = {};
    aimShots = 0; aimHits = 0;
    while (t < total) {
      leaderShoot(aim);
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
      // como foram as primeiras ondas (o começo é o que mais mudou)
      if (S.horde.active && !early[S.horde.n] && S.horde.n <= 12) early[S.horde.n] = { wall0: S.wallHp / maxWall() };
      if (!S.horde.active && S.best && early[S.best] && early[S.best].wall == null) early[S.best].wall = S.wallHp / maxWall();
    }
    return {
      diff, minutes, city, best, wave: S.wave, falls, perished, played: Math.round(t / 60), dead: (S.meta.fallen || 0) - fallen0, surv: S.survivors, max: maxSurv(),
      jobs: { ...S.jobs }, build: { ...S.build }, res: Object.fromEntries(Object.entries(S.res).map(([k, v]) => [k, Math.round(v)])),
      ratio: ratio(), fatigue: fatN ? fatSum / fatN : 0, injuries: LOG.filter(l => /se feriu de guarda/.test(l.t)).length,
      unpaid: LOG.filter(l => /manutenção/.test(l.t)).length, timeline, early, aimShots,
      firstFall: (LOG.find(l => /O muro caiu/.test(l.t)) || {}).t ? 'sim' : 'não',
    };
  }

  // Campanha: joga as cidades em sequência, evacuando quando a defesa não segura a próxima onda
  // (depois da onda 10) ou quando o tempo da cidade acaba. Gasta a Esperança nas melhorias mais baratas.
  function runCampaign(diff, minutes, cities, aim) {
    const meta = newMeta(), out = [];
    let clock = 0, cashIn = 0, capsBought = 0;
    // cash: tudo o que entra (chefes e conquistas, que o bot resgata na hora); gasta conforme a estratégia SPEND
    const _gain = gainCash;
    gainCash = (n, ...a) => { cashIn += n; _gain(n, ...a); };
    function spend() {
      for (const a of ACH) if (meta.ach[a.id] === 'unlocked') claimAch(a.id);
      if (SPEND === 'fragmento' && !Champions.fragBlock()) {
        // o herói mais perto de liberar
        const k = Object.keys(CHAMPS).filter(x => !Champions.fragBlock(x)).sort((a, b) => (meta.champ.frags[b] || 0) - (meta.champ.frags[a] || 0))[0];
        if (k) Champions.buyFrag(k);
      }
      if (SPEND === 'tampinhas') while (meta.cash >= SHOP.tampinhas.cost) { buyShop('tampinhas'); capsBought++; }
    }
    meta.city = 1;
    for (let c = 1; c <= cities; c++) {
      S = newState(meta, diff);
      S.wallHp = maxWall();
      Slots.dead = false;
      const dt = 0.1, total = minutes * 60;
      let t = 0, falls = 0, st = S, thinkT = 0, why = 'tempo';
      while (t < total) {
        leaderShoot(aim);
        tick(dt, true);
        t += dt;
        if (Slots.dead) { why = 'save apagado'; break; }
        if (S !== st) { falls++; st = S; }
        thinkT += dt;
        if (thinkT >= 1) { thinkT = 0; think(); spend(); }
        // evacua quando a próxima onda não vai ser segurada
        if (!S.horde.active && S.best >= EVAC_WAVE && S.waveTimer < 5 && ratio() < EVAC_RATIO) { why = 'defesa fraca'; break; }
      }
      const g = hopeGain(), ch = meta.champ;
      clock += t;
      out.push({ city: c, best: S.best, falls, why, hope: g, hopeTotal: meta.hopeTotal + g, min: Math.round(t / 60), clock: Math.round(clock / 60),
        cash: cashIn, heroes: Object.keys(ch.owned).length, caps: ch.caps, capsBought: capsBought * CAPS_PACK, frags: meta.stats.fragsBought || 0 });
      if (why === 'save apagado') break;
      meta.hope += g; meta.hopeTotal += g; meta.city++;
      // compra as melhorias permanentes mais baratas enquanto der
      for (let i = 0; i < 100; i++) {
        const opts = Object.keys(PERKS).filter(k => perk(k) < PERKS[k].max && meta.hope >= perkCost(k)).sort((a, b) => perkCost(a) - perkCost(b));
        if (!opts.length) break;
        actions.perk(opts[0]);
      }
    }
    return out;
  }
`, ctx);

// ---------- campanha (várias cidades seguidas, evacuando)
const CAMP = Number(opt('campanha') || 0);
if (CAMP) {
  const diffsC = (opt('dif') || 'normal').split(',');
  console.log(`🤖 Campanha: ${CAMP} cidades · gastando o cash em: ${SPEND} · até ${MIN} min por cidade · líder ${AIM ? `${Math.round(AIM * 100)}% de acerto` : 'sem atirar'}\n`);
  for (const d of diffsC) {
    ctx.EVAC_RATIO = EVAC_RATIO; ctx.SPEND = SPEND;
    ctx.__args = [d, MIN, CAMP, AIM];
    const rs = vm.runInContext('runCampaign(...__args)', ctx);
    console.log(`== ${d}`);
    for (const r of rs) console.log(`   cidade ${r.city} (até ${r.clock} min): onda ${r.best} · quedas ${r.falls} · +${r.hope} ✨ · cash ganho ${r.cash} · heróis de campo ${r.heroes}/6 · fragmentos comprados ${r.frags} · 🏷️ ${r.caps} (${r.capsBought} comprados)`);
    console.log('');
  }
  process.exit(0);
}

// ---------- execução e relatório
const diffs = (opt('dif') || Object.keys(vm.runInContext('DIFFS', ctx)).join(',')).split(',');
console.log(`🤖 Bot: ${MIN} min de jogo por dificuldade · cidade ${CITY}${CLICK ? ' · vasculhando 1x/s' : ''} · líder ${AIM ? `atirando (${Math.round(AIM * 100)}% de acerto)` : 'sem atirar'}\n`);
for (const d of diffs) {
  const t0 = Date.now();
  ctx.__args = [d, MIN, CITY, CLICK, AIM];
  const r = vm.runInContext('runBot(...__args)', ctx);
  const tw = Object.entries(r.build).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ') || 'nada';
  console.log(`== ${d} (${((Date.now() - t0) / 1000).toFixed(1)}s de processamento)`);
  console.log(`   melhor onda ${r.best} · onda atual ${r.wave} · quedas do abrigo ${r.falls} · mortes ${r.dead}` +
    (r.perished ? ` · ☠️ SAVE APAGADO (morte permanente) aos ${r.played} min` : ''));
  console.log(`   grupo ${r.surv}/${r.max} · funções ${JSON.stringify(r.jobs)}`);
  console.log(`   construções: ${tw}`);
  console.log(`   recursos ${JSON.stringify(r.res)}`);
  console.log(`   defesa ÷ ameaça na próxima onda: ${r.ratio.toFixed(2)} · cansaço médio na horda ${Math.round(r.fatigue * 100)}% · guardas feridos ${r.injuries} · hordas sem manutenção ${r.unpaid}`);
  console.log(`   a cada 10 min: ${r.timeline.map(p => `${p.min}min onda ${p.wave} (${p.surv} pessoas)`).join(' · ')}`);
  console.log(`   muro no fim das primeiras ondas: ${Object.entries(r.early).filter(([, e]) => e.wall != null).map(([n, e]) => `${n}: ${Math.round(e.wall * 100)}%`).join(' · ')}\n`);
}
