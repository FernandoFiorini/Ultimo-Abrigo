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
//   --completo  joga tudo: laboratório, pesquisa e a Cura, expedições, distritos, armas do líder, comerciante,
//               dilemas e mordidos (escolha sorteada), habilidades e pontos dos heróis de campo
//   --campanha N  joga N cidades seguidas, evacuando (com --completo, para ao encontrar a Cura)
//   --desafios N  na campanha, aceita N desafios sorteados em cada cidade nova (padrão 0)
//   --save ARQ    abre o save de um jogador (.voidfall, .txt ou o e-mail do Reportar bug), procura valores quebrados
//                 e continua jogando dali por --min minutos (padrão 30), registrando erros de código
//
// Teste completo (até a Cura):  node tools/bot.js --completo --campanha 8 --dif normal --min 90
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

// ---------- argumentos
const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const MIN = Number(opt('min') || 60), CITY = Number(opt('cidade') || 1), CLICK = args.includes('--clicar');
const AIM = Number(opt('mirar') ?? 0.6);
const EVAC_RATIO = Number(opt('evacuar') ?? 0.6);
const SPEND = opt('gastar') || 'nada';
const FULL = args.includes('--completo'), MODS_N = Number(opt('desafios') || 0);   // campanha: onde gastar o cash (fragmento, tampinhas ou nada)   // campanha: evacua quando defesa ÷ ameaça da próxima onda cai abaixo disto

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
  // sem cutscenes nem tela de vitória (menu.js e a interface não são carregados)
  Story.playOnce = (id, cb) => { if (cb) cb(); };
  globalThis.Victory = { win() {} };

  // ---------- jogo completo (--completo)
  // dilemas e mordidos: escolha sorteada entre as opções possíveis (contada no relatório)
  const FS = {};
  function resetFull() {
    Object.assign(FS, { dilemmas: {}, bites: { matar: 0, liberar: 0 }, merchant: 0, exps: 0, ops: 0, weapons: 0, research: 0, raises: 0 });
  }
  resetFull();
  function botDecide(kind, info) {
    if (kind === 'bite') { const i = Math.random() < 0.5 ? 0 : 1; FS.bites[i ? 'liberar' : 'matar']++; return i; }
    FS.dilemmas[info.D.id] = (FS.dilemmas[info.D.id] || 0) + 1;
    return info.can[Math.floor(Math.random() * info.can.length)];
  }
  const plus = (a, b) => { const o = { ...a }; for (const k in b) o[k] = (o[k] || 0) + b[k]; return o; };
  const LOC_ORDER = ['base', 'delegacia', 'hospital', 'ferro', 'mercado'];

  // laboratório cheio de cientistas e a Cura por fazer: vale melhorar (mais vagas e +25% de pesquisa por nível)
  const labUp = () => S.build.lab && S.build.lab < 5 && !buildBlocked('lab') && S.jobs.cientista >= Endgame.sciCap() && !S.meta.cured;
  // o que guardar antes de construir: o laboratório (se ainda não tem) ou a arma/melhoria mais barata
  function botReserve() {
    if (S.horde.active || S.wallHp < maxWall() * 0.6) return {};
    if (!S.build.lab && !buildLocked('lab') && !buildBlocked('lab')) return buildCost('lab');
    if (labUp()) return buildCost('lab');
    const ks = Object.keys(LWEAPONS).filter(k => Weapons.unlocked(k) && Weapons.lvl(k) < LW_MAX_LVL);
    if (!ks.length) return {};
    return ks.map(Weapons.cost).sort((a, b) => (a.sucata || 0) - (b.sucata || 0))[0];
  }

  function fullThink() {
    const m = S.meta, day = !S.horde.active;
    // heróis de campo: habilidades na horda, pontos de dia
    if (Champions.cur()) {
      if (!day) { Champions.useActive(); Champions.useSupreme(); }
      else for (let g = 0; g < 10; g++) {
        const k = Champions.cur(), slot = ['sup', 'act', 'p1', 'p2'].find(s => Champions.canRaise(k, s));
        if (!slot) break;
        Champions.raise(k + ':' + slot); FS.raises++;
      }
    }
    if (!day) return;
    // heróis de apoio: a melhor arma
    for (const h of m.heroes || []) Endgame.heroEquip(h.id);
    // (roda antes do think: o laboratório e as armas têm prioridade sobre as obras)
    // laboratório e cientistas (cerca de 15% do grupo, até o limite de vagas)
    const ok = k => !buildBlocked(k) && !buildLocked(k) && canAfford(buildCost(k));
    if ((!S.build.lab || labUp()) && ok('lab')) actions.build('lab');
    if (S.build.lab) {
      const want = Math.min(Endgame.sciCap(), Math.max(2, Math.floor(S.survivors * 0.3)));
      if (S.jobs.cientista < want) { if (idle() <= 0 && S.jobs.coletor > 1) actions.jobSub('coletor'); actions.jobAdd('cientista'); }
    }
    // a etapa da Cura desta cidade vem antes; as outras pesquisas só gastam o que não atrasa a Cura
    const st = m.cureStage || 0, CU = Endgame.CURE;
    // só guarda pesquisa para a Cura quando as amostras dela já estão garantidas (senão os pontos ficariam parados)
    const cureHere = st < CU.length && Endgame.cureCityOk(st) && Endgame.canPay({ ...CU[st].cost, rp: 0 });
    if (st < CU.length && Endgame.cureCityOk(st) && Endgame.canPay(CU[st].cost)) Endgame.researchCure();
    else {
      const T = Endgame.TECH;
      const opts = Object.keys(T).filter(k => Endgame.tl(k) < T[k].max && Endgame.canPay(cureHere ? plus(Endgame.techCost(k), CU[st].cost) : Endgame.techCost(k)))
        .sort((a, b) => (Endgame.techCost(a).rp || 0) - (Endgame.techCost(b).rp || 0));
      if (opts.length) { Endgame.research(opts[0]); FS.research++; }
    }
    // armas do líder: compra/melhora com folga de sucata e a defesa em dia; a mais forte fica na mão
    for (const k of Object.keys(LWEAPONS)) {
      const c = Weapons.cost(k);
      if (Weapons.unlocked(k) && Weapons.lvl(k) < LW_MAX_LVL && canAfford(c) && (S.build.lab || buildLocked('lab'))) { Weapons.buy(k); FS.weapons++; break; }
    }
    const own = Object.keys(LWEAPONS).filter(Weapons.owned), best = own[own.length - 1];
    if (best && Weapons.current() !== best) Weapons.equip(best + '|' + m.lw.cur);
    // comerciante: tudo o que for especial; trocas comuns só por munição, se estiver faltando
    if (S.merchant) S.merchant.offers.forEach((o, i) => {
      if (Events.offerBlock(o)) return;
      const special = o.get.sample || o.get.weapon || o.get.hero || o.get.rp || o.get.survivor;
      if (special || (o.get.municao && S.res.municao < 60)) { Events.merchantBuy(i); FS.merchant++; }
    });
    const safe = S.wallHp >= maxWall() * 0.7 && S.waveTimer > 30;
    // uma expedição por vez, tirando gente da coleta
    if (safe && !hasMod('semexp') && !S.exps.length) {
      const k = LOC_ORDER.find(l => S.best + 1 >= EXPED[l].unlock && S.jobs.coletor > EXPED[l].min + 1);
      if (k) {
        for (let i = 0; i < EXPED[k].min && idle() < EXPED[k].min; i++) actions.jobSub('coletor');
        const n0 = S.exps.length; actions.expGo(k); if (S.exps.length > n0) FS.exps++;
      }
    }
    // distritos: um esquadrão por vez, grande o bastante para ~70% de chance
    if (safe && !S.ops.length) for (const k of Object.keys(Endgame.DISTRICTS)) {
      const d = Endgame.DISTRICTS[k];
      if (S.districts[k] || !Endgame.districtOpen(k)) continue;
      let n = d.n;
      while (Endgame.opChance(k, n) < 0.7 && n < S.jobs.coletor - 1) n++;
      if (Endgame.opChance(k, n) < 0.6 || S.res.municao < n * 10 + 40 || S.jobs.coletor - 1 < n) break;
      for (let i = 0; i < n && idle() < n; i++) actions.jobSub('coletor');
      Endgame.opGo(k, n);
      if (S.ops.length) FS.ops++;
      break;
    }
  }

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
    // --completo: as obras não comem a poupança para o laboratório ou a próxima arma (a não ser com o muro baixo)
    const R = FULL ? botReserve() : {};
    const ok = k => !buildBlocked(k) && !buildLocked(k) && canAfford(plus(buildCost(k), R));
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
    resetFull(); autoDecide = FULL ? botDecide : null; document.hidden = !FULL;
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
      if (thinkT >= 1) { thinkT = 0; if (FULL) fullThink(); think(); if (click) actions.scavenge(); }
      if (Math.round(t * 10) % (600 * 10) === 0) timeline.push({ min: Math.round(t / 60), wave: S.wave, surv: S.survivors, guards: S.jobs.guarda });
      // como foram as primeiras ondas (o começo é o que mais mudou)
      if (S.horde.active && !early[S.horde.n] && S.horde.n <= 12) early[S.horde.n] = { wall0: S.wallHp / maxWall() };
      if (!S.horde.active && S.best && early[S.best] && early[S.best].wall == null) early[S.best].wall = S.wallHp / maxWall();
    }
    return {
      diff, minutes, city, best, wave: S.wave, falls, perished, played: Math.round(t / 60), dead: (S.meta.fallen || 0) - fallen0, surv: S.survivors, max: maxSurv(),
      jobs: { ...S.jobs }, build: { ...S.build }, res: Object.fromEntries(Object.entries(S.res).map(([k, v]) => [k, Math.round(v)])),
      ratio: ratio(), fatigue: fatN ? fatSum / fatN : 0, injuries: LOG.filter(l => /se feriu de guarda/.test(l.t)).length,
      unpaid: LOG.filter(l => /manutenção/.test(l.t)).length, timeline, early, aimShots, full: FULL ? fullSummary() : null,
      firstFall: (LOG.find(l => /O muro caiu/.test(l.t)) || {}).t ? 'sim' : 'não',
    };
  }

  // Campanha: joga as cidades em sequência, evacuando quando a defesa não segura a próxima onda
  // (depois da onda 10) ou quando o tempo da cidade acaba. Gasta a Esperança nas melhorias mais baratas.
  function fullSummary() {
    const m = S.meta, top = Object.entries(FS.dilemmas).sort((a, b) => b[1] - a[1]);
    return { cure: m.cureStage || 0, cured: !!m.cured, research: FS.research, techLv: Object.values(m.tech || {}).reduce((a, b) => a + b, 0),
      exps: FS.exps, ops: FS.ops, districts: Object.keys(S.districts || {}).filter(k => S.districts[k]).length, weapons: FS.weapons,
      lw: Object.keys(LWEAPONS).filter(Weapons.owned).map(k => k + ' ' + Weapons.lvl(k)).join(', '), merchant: FS.merchant,
      raises: FS.raises, heroes: (m.heroes || []).length, champs: Object.keys((m.champ && m.champ.owned) || {}).length, pets: (m.pets || []).length,
      bites: { ...FS.bites }, dilemmas: top.map(([k, n]) => k + ' ' + n).join(', '), rp: Math.round(m.rp || 0) };
  }

  function runCampaign(diff, minutes, cities, aim) {
    const meta = newMeta(), out = [];
    let clock = 0, cashIn = 0, capsBought = 0, dayT = 0, hordeT = 0, curedAt = null;
    resetFull(); autoDecide = FULL ? botDecide : null; document.hidden = !FULL;
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
      // desafios da cidade nova (a primeira não tem)
      let mods = [];
      if (c > 1 && MODS_N) { mods = Object.keys(MODS).sort(() => Math.random() - 0.5).slice(0, MODS_N); applyMods(mods); }
      const dt = 0.1, total = minutes * 60;
      let t = 0, falls = 0, st = S, thinkT = 0, why = 'tempo';
      while (t < total) {
        leaderShoot(aim);
        tick(dt, true);
        t += dt;
        if (S.horde.active) hordeT += dt; else dayT += dt;
        if (Slots.dead) { why = 'save apagado'; break; }
        if (S !== st) { falls++; st = S; }
        thinkT += dt;
        if (thinkT >= 1) { thinkT = 0; if (FULL) fullThink(); think(); spend(); }
        if (FULL && meta.cured) { why = 'Cura encontrada'; curedAt = { city: c, min: Math.round((clock + t) / 60), real: Math.round((hordeT + dayT / 2) / 60) }; break; }
        // evacua quando a próxima onda não vai ser segurada
        // --completo: só sai depois de fazer a etapa da Cura desta cidade (ou se o abrigo já caiu aqui)
        const cureDone = !FULL || falls > 0 || (meta.cureStage || 0) >= Math.min(c, Endgame.CURE.length);
        if (!S.horde.active && S.best >= EVAC_WAVE && S.waveTimer < 5 && cureDone && ratio() < EVAC_RATIO) { why = 'defesa fraca'; break; }
      }
      const g = hopeGain(), ch = meta.champ;
      clock += t;
      out.push({ city: c, best: S.best, falls, why, hope: g, hopeTotal: meta.hopeTotal + g, min: Math.round(t / 60), clock: Math.round(clock / 60),
        cash: cashIn, heroes: Object.keys(ch.owned).length, caps: ch.caps, capsBought: capsBought * CAPS_PACK, frags: meta.stats.fragsBought || 0,
        mods: mods.join(', '), real: Math.round((hordeT + dayT / 2) / 60), full: FULL ? fullSummary() : null, curedAt });
      if (why === 'save apagado' || why === 'Cura encontrada') break;
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

  // ---------- save de um jogador (--save): confere o estado e continua jogando a partir dele
  // Problemas de estado: números quebrados (NaN, infinito, negativos), funções a mais que pessoas, muro acima do máximo...
  function stateProblems() {
    const out = [], bad = v => typeof v !== 'number' || !isFinite(v);
    for (const r in S.res) if (bad(S.res[r]) || S.res[r] < -0.01) out.push('recurso ' + r + ' = ' + S.res[r]);
    if (bad(S.survivors) || S.survivors < 0) out.push('sobreviventes = ' + S.survivors);
    if (bad(S.wave) || S.wave < 1) out.push('onda = ' + S.wave);
    if (bad(S.wallHp) || S.wallHp > maxWall() * 1.01 + 1) out.push('muro ' + S.wallHp + ' / máximo ' + maxWall());
    if (bad(S.waveTimer)) out.push('cronômetro da onda = ' + S.waveTimer);
    if (assigned() > S.survivors) out.push('funções (' + assigned() + ') a mais que sobreviventes (' + S.survivors + ')');
    for (const k in S.jobs) if (bad(S.jobs[k]) || S.jobs[k] < 0) out.push('função ' + k + ' = ' + S.jobs[k]);
    for (const k in S.build) if (bad(S.build[k]) || S.build[k] < 0) out.push('construção ' + k + ' = ' + S.build[k]);
    const m = S.meta;
    for (const k of ['cash', 'hope', 'hopeTotal', 'rp']) if (m[k] != null && (bad(m[k]) || m[k] < -0.01)) out.push('meta.' + k + ' = ' + m[k]);
    for (const k in m.samples || {}) if (bad(m.samples[k]) || m.samples[k] < 0) out.push('amostra ' + k + ' = ' + m.samples[k]);
    const c = m.champ || {};
    if (bad(c.caps || 0) || (c.caps || 0) < 0) out.push('tampinhas = ' + c.caps);
    for (const b of c.boxes || []) if (!b || (typeof b !== 'string' && (!b.k || bad(b.w)))) out.push('caixa inválida: ' + JSON.stringify(b));
    for (const k in c.owned || {}) if (!CHAMPS[k]) out.push('herói de campo desconhecido: ' + k);
    if (!DIFFS[S.diff]) out.push('dificuldade desconhecida: ' + S.diff);
    return out;
  }
  function saveSummary() {
    const m = S.meta, D0 = DIFFS[S.diff] || {}, r = x => Math.round(x);
    return [
      '   ' + (m.player || '?') + ' · ' + (D0.nome || S.diff) + ' · cidade ' + (m.city || 1) + ', mundo ' + (m.worlds || 1) + ' · onda ' + S.wave + ' (melhor ' + S.best + ')' + (S.horde.active ? ' · horda em andamento' : ''),
      '   grupo ' + S.survivors + '/' + maxSurv() + ' · funções ' + JSON.stringify(S.jobs) + ' · feridos ' + S.injured.length + ' · mordidos ' + S.bitten.length,
      '   recursos ' + JSON.stringify(Object.fromEntries(Object.entries(S.res).map(([k, v]) => [k, r(v)]))) + ' · muro ' + r(S.wallHp) + '/' + maxWall(),
      '   construções ' + (Object.entries(S.build).filter(([, v]) => v).map(([k, v]) => k + ' ' + v).join(', ') || 'nenhuma'),
      '   Cura ' + (m.cureStage || 0) + '/5 · pesquisa ' + r(m.rp || 0) + ' 🔬 · Esperança ' + r(m.hope || 0) + ' (total ' + r(m.hopeTotal || 0) + ') · cash ' + r(m.cash || 0) + ' · desafios ' + ((S.mods || []).join(', ') || 'nenhum'),
      '   armas ' + Object.keys(LWEAPONS).filter(Weapons.owned).map(k => k + ' ' + Weapons.lvl(k)).join(', ') + ' · heróis de campo ' + Object.keys((m.champ && m.champ.owned) || {}).join(', ') + ' · caixas ' + ((m.champ && m.champ.boxes) || []).length + ' · pets ' + (m.pets || []).length,
      '   tempo jogado ' + r(((m.stats && m.stats.time) || 0) / 60) + ' min · abates ' + ((m.stats && m.stats.kills) || 0),
    ].join('\n');
  }
  function runSave(json, minutes, aim) {
    Slots.cur = 1; Slots.ready = true; Slots.dead = false;
    localStorage.setItem(Slots.key(1), json);
    load();
    LOG.length = 0;
    resetFull(); autoDecide = FULL ? botDecide : null; document.hidden = !FULL;
    const start = saveSummary(), startProblems = stateProblems();
    const errors = {}, problems = {}, timeline = [];
    const err = (e, where) => {
      const k = String(e && e.message || e);
      if (!errors[k]) errors[k] = { n: 0, where, stack: String(e && e.stack || '').split('\n').slice(1, 3).map(s => s.trim()).join(' | '), at: S.wave };
      errors[k].n++;
    };
    const dt = 0.1, total = minutes * 60;
    let t = 0, thinkT = 0, checkT = 0, falls = 0, st = S, fallen0 = S.meta.fallen || 0, best0 = S.best;
    while (t < total) {
      try { leaderShoot(aim); tick(dt, true); } catch (e) { err(e, 'tick'); }
      t += dt;
      if (Slots.dead) { timeline.push('☠️ save apagado (Apocalipse) aos ' + Math.round(t / 60) + ' min'); break; }
      if (S !== st) { falls++; st = S; timeline.push('🧱 o abrigo caiu aos ' + Math.round(t / 60) + ' min'); }
      thinkT += dt;
      if (thinkT >= 1) { thinkT = 0; try { if (FULL) fullThink(); think(); } catch (e) { err(e, 'decisões do bot'); } }
      checkT += dt;
      if (checkT >= 5) {
        checkT = 0;
        for (const p of stateProblems()) { const k = p.replace(/[-\d.e+]+$/, '#'); if (!problems[k]) problems[k] = { first: p, at: Math.round(t / 60), wave: S.wave, n: 0 }; problems[k].n++; }
      }
      if (Math.round(t * 10) % 3000 === 0) timeline.push(Math.round(t / 60) + ' min: onda ' + S.wave + ' · ' + S.survivors + ' pessoas · muro ' + Math.round(S.wallHp / maxWall() * 100) + '%');
    }
    return { start, startProblems, end: saveSummary(), errors, problems, timeline, falls, dead: (S.meta.fallen || 0) - fallen0, best0, best: S.best,
      bad: LOG.filter(l => l.type === 'bad').slice(-8).map(l => String(l.t).replace(/<[^>]+>/g, '')), full: FULL ? fullSummary() : null };
  }
`, ctx);

// ---------- campanha (várias cidades seguidas, evacuando)
const CAMP = Number(opt('campanha') || 0);
ctx.FULL = FULL; ctx.MODS_N = MODS_N;
const fullLine = f => f ? [
  `   🧪 Cura ${f.cure}/5${f.cured ? ' ✓' : ''} · pesquisas ${f.research} (níveis ${f.techLv}, ${f.rp} 🔬 sobrando) · expedições ${f.exps} · distritos ${f.districts} (${f.ops} ataques) · comerciante ${f.merchant} trocas`,
  `   🔫 armas ${f.lw || 'só a pistola'} (${f.weapons} compras) · heróis de campo ${f.champs} (${f.raises} pontos gastos) · heróis de apoio ${f.heroes} · pets ${f.pets}`,
  `   🎲 dilemas: ${f.dilemmas || 'nenhum'} · mordidos: ${f.bites.matar} mortos, ${f.bites.liberar} liberados`,
].join('\n') : '';
// ---------- save de um jogador: node tools/bot.js --save arquivo [--min 30] [--completo]
// O arquivo pode ser o .voidfall, um .txt exportado ou o texto inteiro do e-mail do Reportar bug (o código UA1: é achado sozinho).
const SAVE_FILE = opt('save');
if (SAVE_FILE) {
  const txt = fs.readFileSync(SAVE_FILE, 'utf8');
  let json = null;
  const m = /UA1:([A-Za-z0-9+/=\s]+)/.exec(txt);
  if (m) json = Buffer.from(m[1].replace(/\s+/g, ''), 'base64').toString('utf8');
  else if (/^\s*\{/.test(txt)) json = txt;
  let d;
  try { d = JSON.parse(json); } catch (e) { console.log('❌ Não achei um save válido nesse arquivo (procurei o código UA1: ou um JSON).'); process.exit(1); }
  d.last = Date.now();   // sem progresso offline: continua de onde o jogador parou
  const minutes = Number(opt('min') || 30);
  ctx.__args = [JSON.stringify(d), minutes, AIM];
  const r = vm.runInContext('runSave(...__args)', ctx);
  console.log(`🔎 Save de ${path.basename(SAVE_FILE)} · jogando ${minutes} min a partir dele${FULL ? ' (modo completo)' : ''}\n`);
  console.log('== Como estava\n' + r.start);
  console.log(r.startProblems.length ? '   ⚠️ problemas no save: ' + r.startProblems.join(' · ') : '   ✓ nenhum valor quebrado no save');
  console.log(`\n== Depois de ${minutes} min\n` + r.end);
  if (r.full) console.log(fullLine(r.full));
  console.log(`   melhor onda ${r.best0} → ${r.best} · quedas do abrigo ${r.falls} · mortes ${r.dead}`);
  if (r.timeline.length) console.log('   ' + r.timeline.join('\n   '));
  if (r.bad.length) console.log('   últimos avisos ruins do registro:\n     ' + r.bad.join('\n     '));
  const errs = Object.entries(r.errors), probs = Object.values(r.problems);
  console.log('\n== Diagnóstico');
  if (!errs.length && !probs.length) console.log('   ✓ nenhum erro de código e nenhum valor quebrado durante o teste');
  for (const [msg, e] of errs) console.log(`   💥 ERRO (${e.where}, ${e.n}x, desde a onda ${e.at}): ${msg}\n      ${e.stack}`);
  for (const p of probs) console.log(`   ⚠️ ${p.first} (desde ${p.at} min, onda ${p.wave}; visto ${p.n}x)`);
  process.exit(errs.length ? 2 : 0);
}

if (CAMP) {
  const diffsC = (opt('dif') || 'normal').split(',');
  console.log(`🤖 Campanha: ${CAMP} cidades · gastando o cash em: ${SPEND} · até ${MIN} min por cidade · líder ${AIM ? `${Math.round(AIM * 100)}% de acerto` : 'sem atirar'}\n`);
  for (const d of diffsC) {
    ctx.EVAC_RATIO = EVAC_RATIO; ctx.SPEND = SPEND;
    ctx.__args = [d, MIN, CAMP, AIM];
    const rs = vm.runInContext('runCampaign(...__args)', ctx);
    console.log(`== ${d}`);
    for (const r of rs) {
      console.log(`   cidade ${r.city} (até ${r.clock} min, ~${r.real} min reais com 2x de dia): onda ${r.best} · quedas ${r.falls} · saída: ${r.why} · +${r.hope} ✨ · cash ganho ${r.cash} · heróis de campo ${r.heroes}/6 · fragmentos comprados ${r.frags} · 🏷️ ${r.caps} (${r.capsBought} comprados)${r.mods ? ` · desafios: ${r.mods}` : ''}`);
      if (r.full) console.log(fullLine(r.full));
    }
    const last = rs[rs.length - 1];
    if (FULL) console.log(last.curedAt ? `   💉 CURA ENCONTRADA na cidade ${last.curedAt.city}, com ${last.curedAt.min} min de jogo (~${last.curedAt.real} min reais com 2x de dia)` : `   💉 Cura não encontrada (${last.full.cure}/5 etapas)`);
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
  if (r.full) console.log(fullLine(r.full));
  console.log(`   muro no fim das primeiras ondas: ${Object.entries(r.early).filter(([, e]) => e.wall != null).map(([n, e]) => `${n}: ${Math.round(e.wall * 100)}%`).join(' · ')}\n`);
}
