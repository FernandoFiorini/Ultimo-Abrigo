'use strict';

// Eventos do dia: dilemas com escolha e o comerciante ambulante.
// Só acontecem com o jogo aberto (nunca no progresso offline), porque dependem de uma decisão do jogador.
const Events = (() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const chance = p => Math.random() < p;
  // recompensas e custos crescem com a onda
  const R = n => Math.max(1, Math.round(n * (1 + 0.12 * (S.wave - 1))));

  // Aplica ganhos (+) e perdas (−) de recursos e devolve o texto "+20 🔩 −10 🥫"
  function change(bag) {
    const parts = [];
    for (const r in bag) {
      const v = Math.max(-S.res[r], bag[r]);
      if (!v) continue;
      S.res[r] += v;
      parts.push(`${v > 0 ? '+' : '−'}${fmt(Math.abs(v))} ${RES[r].icon}`);
    }
    return parts.join(' ');
  }
  // Tira n pessoas que estão no abrigo (ajusta funções se preciso) e devolve os nomes
  function lose(n, cause) {
    const names = [];
    for (let i = 0; i < n && home() > 0; i++) {
      names.push(...removeSurvivors(1, cause));
      if (idle() < 0) {
        const busy = Object.keys(S.jobs).filter(k => S.jobs[k] > 0);
        S.jobs[pick(busy)]--;
      }
    }
    return names;
  }
  const checkOver = () => { if (home() <= 0 && !S.exps.length && !S.ops.length) gameOver(); };
  const arrive = n => emit('expReturn', { n });
  const sampleKeys = () => ['acido', 'gas', 'tecido'].filter(k => S.meta.samples[k] > 0);
  const totalSamples = () => sampleKeys().reduce((a, k) => a + S.meta.samples[k], 0);

  // Cada opção: label, hint (efeito mostrado antes de escolher), ok (pode escolher?), run() → [texto, tipo do registro]
  const DILEMMAS = [
    {
      id: 'ferido', icon: '🩸', title: 'Alguém ferido no portão',
      text: () => 'Uma pessoa ferida bate no portão pedindo abrigo. O braço está enfaixado às pressas e o pano está sujo de sangue. Pode ser só um corte... ou uma mordida.',
      cond: () => S.survivors < maxSurv(),
      opts: [
        { label: 'Acolher', hint: '+1 sobrevivente · 30% de chance de estar infectada',
          run: () => {
            if (chance(0.7)) { const n = addSurvivor(); arrive(1); return [`Era só um corte. ${n} se recuperou e se juntou ao grupo.`, 'good']; }
            const dead = lose(1, 'foi vítima de uma pessoa infectada'); checkOver();
            return [`Era uma mordida. Durante a noite a pessoa se transformou e atacou${dead.length ? ` ${dead[0]}, que não resistiu` : ''}.`, 'bad'];
          } },
        { label: 'Tratar com remédio', hint: '−1 💊 · +1 sobrevivente, sem risco', ok: () => S.res.remedio >= 1,
          run: () => { S.res.remedio -= 1; const n = addSurvivor(); arrive(1); return [`O remédio segurou a infecção. ${n} agradece e se junta ao grupo.`, 'good']; } },
        { label: 'Mandar embora', hint: 'Nada acontece', run: () => ['O portão continua fechado. A pessoa some na escuridão.', ''] },
      ],
    },
    {
      id: 'saqueadores', icon: '🏴‍☠️', title: 'Saqueadores no portão',
      text: () => 'Um bando armado cerca o abrigo e exige metade da sua sucata. Eles parecem nervosos, e estão em menor número do que querem aparentar.',
      cond: () => S.res.sucata >= 20,
      opts: [
        { label: 'Pagar', hint: () => `−${fmt(Math.floor(S.res.sucata / 2))} 🔩`,
          run: () => [`Os saqueadores levaram a sucata e foram embora. ${change({ sucata: -Math.floor(S.res.sucata / 2) })}.`, 'warn'] },
        { label: 'Lutar', hint: () => `${Math.round(fightChance() * 100)}% de vitória (guardas e torres ajudam) · derrota: muro danificado e uma morte`,
          run: () => {
            if (chance(fightChance())) return [`Os saqueadores fugiram e largaram o que carregavam! ${change({ municao: R(15), sucata: R(20) })}.`, 'good'];
            S.wallHp = Math.max(0, S.wallHp - maxWall() * 0.35);
            const dead = lose(1, 'morreu no tiroteio com saqueadores'); checkOver();
            return [`A luta foi feia. O muro foi danificado${dead.length ? ` e ${dead[0]} morreu no tiroteio` : ''}.`, 'bad'];
          } },
        { label: 'Oferecer comida', hint: () => `−${R(25)} 🥫`, ok: () => S.res.comida >= R(25),
          run: () => [`Eles aceitaram a comida no lugar da sucata. ${change({ comida: -R(25) })}.`, 'warn'] },
      ],
    },
    {
      id: 'caixa', icon: '🪂', title: 'Suprimentos do céu',
      text: () => 'Um avião passou baixo e largou uma caixa de paraquedas a algumas quadras. Os zumbis da região também ouviram o barulho.',
      cond: () => idle() >= 2,
      opts: [
        { label: 'Mandar 2 pessoas', hint: '15% de risco para cada · munição e remédios', ok: () => idle() >= 2, run: () => airdrop(2, 0.15, 1) },
        { label: 'Mandar 4 pessoas', hint: '6% de risco para cada · mais carga', ok: () => idle() >= 4, run: () => airdrop(4, 0.06, 1.5) },
        { label: 'Deixar para lá', hint: 'Nada acontece', run: () => ['A caixa ficou para os zumbis.', ''] },
      ],
    },
    {
      id: 'briga', icon: '🥊', title: 'Briga por comida',
      text: d => `${d.a} acusa ${d.b} de roubar rações durante a noite. Os dois estão a um passo de sair no soco e o resto do grupo está escolhendo lados.`,
      cond: () => S.survivors >= 4,
      setup: () => { const [a, b] = [...S.people].sort(() => Math.random() - 0.5); return { a, b }; },
      opts: [
        { label: 'Racionar para todos', hint: '−20% da comida, o grupo se acalma',
          run: () => [`Todos passaram a comer menos e a paz voltou. ${change({ comida: -Math.round(S.res.comida * 0.2) })}.`, 'warn'] },
        { label: d => `Expulsar ${d.b}`, hint: '−1 sobrevivente',
          run: d => {
            const i = S.people.indexOf(d.b);
            if (i >= 0 && home() > 1) { forgetPerson(d.b); S.survivors--; if (idle() < 0) { const busy = Object.keys(S.jobs).filter(k => S.jobs[k] > 0); S.jobs[pick(busy)]--; } syncPeople(); return [`${d.b} teve que deixar o abrigo. O grupo ficou mais quieto, e menor.`, 'warn']; }
            return [`${d.b} já tinha partido antes da decisão.`, ''];
          } },
        { label: 'Deixar que resolvam', hint: '50% de chance de dar errado',
          run: d => chance(0.5)
            ? [`${d.a} e ${d.b} se entenderam sozinhos. Ninguém fala mais no assunto.`, 'good']
            : [`A briga derrubou o estoque e parte da comida estragou. ${change({ comida: -Math.round(S.res.comida * 0.35) })}.`, 'bad'] },
      ],
    },
    {
      id: 'familia', icon: '👨‍👩‍👧', title: 'Uma família na estrada',
      text: () => 'Uma família passa pela rua puxando um carrinho de supermercado. Estão exaustos, com fome e procurando um lugar seguro.',
      cond: () => S.survivors + 2 <= maxSurv(),
      opts: [
        { label: 'Acolher todos', hint: () => `+2 sobreviventes · −${R(15)} 🥫`, ok: () => S.res.comida >= R(15),
          run: () => { change({ comida: -R(15) }); const a = addSurvivor(), b = addSurvivor(); arrive(2); return [`${a} e ${b} agora fazem parte do grupo.`, 'good']; } },
        { label: 'Dar comida e seguir', hint: () => `−${R(10)} 🥫 · eles contam onde há sucata`, ok: () => S.res.comida >= R(10),
          run: () => { change({ comida: -R(10) }); return [`Em agradecimento, contaram onde havia um ferro-velho intacto. ${change({ sucata: R(30) })}.`, 'good']; } },
        { label: 'Ignorar', hint: 'Nada acontece', run: () => ['A família seguiu viagem.', ''] },
      ],
    },
    {
      id: 'gerador', icon: '🔋', title: 'Um gerador velho',
      text: () => 'Os coletores arrastaram um gerador a diesel para dentro do abrigo. Está enferrujado, mas talvez ainda funcione.',
      opts: [
        { label: 'Desmontar', hint: () => `+${R(35)} 🔩`, run: () => [`O gerador virou peças. ${change({ sucata: R(35) })}.`, 'good'] },
        { label: 'Consertar e ligar holofotes', hint: () => `−${R(15)} 🔩 · muro restaurado por completo`, ok: () => S.res.sucata >= R(15),
          run: () => { change({ sucata: -R(15) }); S.wallHp = maxWall(); S.wallDown = false; S.overflow = 0; emit('shop', { k: 'muro', text: '🔋 Holofotes ligados!' }); return ['Os holofotes iluminam o muro e o grupo conseguiu reforçar cada rachadura.', 'good']; } },
      ],
    },
    {
      id: 'sinal', icon: '📡', title: 'Um sinal no rádio',
      text: () => 'O rádio capta uma transmissão militar pedindo que sobreviventes respondam. Pode ser ajuda... ou só barulho que vai atrair a horda.',
      cond: () => S.waveTimer > 30,
      opts: [
        { label: 'Responder', hint: '50%: soldados deixam munição · 50%: a horda chega agora',
          run: () => {
            if (chance(0.5)) return [`Um jipe passou e deixou suprimentos no portão. ${change({ municao: R(30), remedio: 1 })}.`, 'good'];
            S.waveTimer = Math.min(S.waveTimer, 12);
            return ['Ninguém respondeu, mas os gemidos lá fora aumentaram. A horda está vindo AGORA!', 'bad'];
          } },
        { label: 'Desligar o rádio', hint: 'Nada acontece', run: () => ['O abrigo ficou em silêncio.', ''] },
      ],
    },
    {
      id: 'pesquisadora', icon: '🥼', title: 'Uma pesquisadora de passagem',
      text: () => 'Uma pesquisadora de jaleco rasgado viu seu laboratório e oferece ajuda nos estudos, em troca de amostras para a própria pesquisa.',
      cond: () => S.build.lab > 0 && totalSamples() >= 2,
      opts: [
        { label: 'Entregar 2 amostras', hint: () => `−2 amostras · +${R(80)} 🔬 de pesquisa`, ok: () => totalSamples() >= 2,
          run: () => {
            for (let i = 0; i < 2; i++) { const ks = sampleKeys(); if (ks.length) S.meta.samples[pick(ks)]--; }
            const rp = R(80); S.meta.rp += rp;
            return [`Ela compartilhou as anotações dela antes de partir. +${fmt(rp)} 🔬 de pesquisa.`, 'good'];
          } },
        { label: 'Convidá-la a ficar', hint: () => `+1 sobrevivente · −${R(20)} 🥫`, ok: () => S.survivors < maxSurv() && S.res.comida >= R(20),
          run: () => { change({ comida: -R(20) }); const n = addSurvivor(); arrive(1); return [`${n} decidiu ficar e ajudar no abrigo.`, 'good']; } },
        { label: 'Recusar', hint: 'Nada acontece', run: () => ['Ela agradeceu e seguiu para o norte.', ''] },
      ],
    },
    {
      id: 'tempestade', icon: '⛈️', title: 'Tempestade',
      text: () => 'Uma tempestade forte alaga o depósito. Só dá tempo de salvar uma coisa antes que a água tome conta.',
      cond: () => S.res.comida >= 20 && S.res.sucata >= 20,
      opts: [
        { label: 'Salvar a comida', hint: '−30% da sucata enferruja',
          run: () => [`A comida ficou seca, mas parte da sucata enferrujou. ${change({ sucata: -Math.round(S.res.sucata * 0.3) })}.`, 'warn'] },
        { label: 'Salvar a sucata', hint: '−30% da comida estraga',
          run: () => [`A sucata está a salvo, mas a água estragou parte da comida. ${change({ comida: -Math.round(S.res.comida * 0.3) })}.`, 'warn'] },
      ],
    },
  ];

  const fightChance = () => Math.min(0.9, 0.25 + 0.07 * S.jobs.guarda + 0.05 * towerLevels());

  function airdrop(n, risk, mult) {
    let dead = 0;
    for (let i = 0; i < n; i++) if (chance(risk)) dead++;
    const names = lose(dead, 'não voltou da busca pela caixa de suprimentos');
    if (dead >= n) { checkOver(); return [`Ninguém voltou da caixa. ${joinNames(names)} foram cercados pelos zumbis.`, 'bad']; }
    const got = change({ municao: Math.round(R(20) * mult), remedio: Math.round((1 + Math.random() * 2) * mult) });
    return [dead ? `Trouxeram a caixa (${got}), mas ${joinNames(names)} não ${dead > 1 ? 'voltaram' : 'voltou'}.` : `Todos voltaram com a caixa! ${got}.`, dead ? 'warn' : 'good'];
  }

  // ---------- dilemas ----------
  // O jogo pausa enquanto o dilema está aberto. Se ninguém escolher em DILEMMA_TIME segundos (jogador ausente),
  // o grupo decide sozinho: uma das opções possíveis, sorteada (e arca com as consequências). O resultado
  // fecha sozinho depois de DILEMMA_CLOSE segundos, para o jogo não ficar parado.
  const DILEMMA_TIME = 20, DILEMMA_CLOSE = 10;
  const clock = s => `0:${String(Math.max(0, Math.ceil(s))).padStart(2, '0')}`;
  function openDilemma(D) {
    const data = D.setup ? D.setup() : {};
    const val = (v, ...a) => (typeof v === 'function' ? v(...a) : v);
    let result = null, auto = null, closeAt = 0;
    const deadline = Date.now() + DILEMMA_TIME * 1000;
    const left = () => (deadline - Date.now()) / 1000;
    const dlg = openDialog({
      title: `${D.icon} ${D.title}`,
      body: () => result
        ? `${auto ? `<p class="event-auto">⏱️ O tempo acabou e o grupo decidiu sozinho: <b>${auto}</b>.</p>` : ''}<p class="event-result ${result[1]}">${result[0]}</p>`
        : `<div class="event-timer" title="Se ninguém decidir, o grupo escolhe sozinho"><div class="et-bar"><div id="et-fill"></div></div><span id="et-txt">⏱️ ${clock(DILEMMA_TIME)}</span></div>
           <p class="event-text">${val(D.text, data)}</p>
           <div class="event-opts">${D.opts.map((o, i) => {
             const ok = !o.ok || o.ok(data);
             return `<button class="event-opt" data-opt="${i}" data-hotkey="${(i + 1) % 10}" ${ok ? '' : 'disabled'}>
               <span class="eo-label">${hk((i + 1) % 10)} ${val(o.label, data)}</span>
               <span class="eo-hint">${val(o.hint, data) || ''}</span></button>`;
           }).join('')}</div>`,
      buttons: [{ label: () => (auto ? `Continuar (${Math.max(0, Math.ceil((closeAt - Date.now()) / 1000))})` : 'Continuar'), cls: 'primary', hidden: () => !result }],
      onOpt: i => choose(+i),
    });
    function choose(i) {
      if (result) return;
      const o = D.opts[i];
      if (!o || (o.ok && !o.ok(data))) return;
      const st = S;
      result = o.run(data) || ['', ''];
      if (S !== st) { dlg.close(true); return; }
      addLog(`${D.icon} ${D.title}${auto ? ' (sem resposta, o grupo decidiu)' : ''}: ${result[0]}`, result[1]);
      emit('dilemma', { good: result[1] === 'good', bad: result[1] === 'bad' });
    }
    const tick = setInterval(() => {
      if (!dlg.open) { clearInterval(tick); return; }
      if (!result) {
        const s = left(), fill = document.getElementById('et-fill'), txt = document.getElementById('et-txt');
        if (fill) { fill.style.width = `${Math.max(0, s / DILEMMA_TIME) * 100}%`; fill.parentNode.parentNode.classList.toggle('urgent', s <= 5); }
        if (txt) txt.textContent = `⏱️ ${clock(s)}`;
        if (s > 0) return;
        // tempo esgotado: o grupo escolhe uma das opções possíveis
        const can = D.opts.map((o, i) => i).filter(i => !D.opts[i].ok || D.opts[i].ok(data));
        const i = can[Math.floor(Math.random() * can.length)];
        auto = val(D.opts[i].label, data);
        closeAt = Date.now() + DILEMMA_CLOSE * 1000;
        choose(i);
        if (dlg.open) { dlg.refresh(true); render(); }
        return;
      }
      if (auto) {
        if (Date.now() >= closeAt) { dlg.close(); clearInterval(tick); }
        else dlg.refresh(false);
      }
    }, 200);
  }

  function triggerDilemma() {
    const pool = DILEMMAS.filter(d => d.id !== S.lastEvent && (!d.cond || d.cond()));
    if (!pool.length) return;
    const D = pick(pool);
    S.lastEvent = D.id;
    openDilemma(D);
  }

  // ---------- comerciante ----------
  const SAMPLE_ICON = { acido: '🧪', gas: '☁️', tecido: '🧫' };
  // Quantidades acompanham a economia do abrigo: cada lado da troca vale ~MERCH_SECS segundos da produção
  // bruta daquele recurso (ou o valor pela onda, o que for maior). Assim, no fim do jogo ele não oferece
  // migalhas, e a troca continua justa entre um recurso que você produz muito e um que produz pouco.
  const MERCH_SECS = 45;
  const gross = r => ({
    comida: S.jobs.forrageiro * 0.6 * foodMult(),
    sucata: S.jobs.coletor * 0.5 * scrapMult(),
    municao: S.jobs.armeiro * AMMO_RATE * prodMult() * Endgame.mult('ammo'),
    remedio: S.jobs.medico * 0.04 * prodMult() * Endgame.mult('meds'),
  })[r] || 0;
  const rpRate = () => S.jobs.cientista * 0.12 * (1 + 0.25 * Math.max(0, S.build.lab - 1)) * Endgame.mult('rp');
  // base: quantidade no começo do jogo (equivale a uns 30 de comida)
  const Q = (r, base) => Math.max(R(base), Math.round(gross(r) * MERCH_SECS * base / 30));
  const bag = o => { const out = {}; for (const r in o) out[r] = Q(r, o[r]); return out; };
  // Fim de jogo: abrigo grande, cidade nova depois de evacuar ou laboratório funcionando
  const lateGame = () => S.meta.city > 1 || S.best >= 15 || (S.build.lab > 0 && S.wave >= 10);

  const OFFERS = [
    () => ({ give: bag({ sucata: 30 }), get: bag({ municao: 20 }) }),
    () => ({ give: bag({ comida: 30 }), get: bag({ sucata: 30 }) }),
    () => ({ give: bag({ sucata: 40 }), get: bag({ remedio: 2 }) }),
    () => ({ give: bag({ municao: 25 }), get: bag({ comida: 40 }) }),
    () => ({ give: bag({ comida: 40 }), get: bag({ municao: 22 }) }),
    () => ({ give: bag({ remedio: 2 }), get: bag({ sucata: 55 }) }),
    () => ({ give: bag({ sucata: 25 }), get: bag({ comida: 30 }) }),
  ];
  const RARE = [
    () => S.build.lab ? { give: bag({ sucata: 60 }), get: { sample: pick(['acido', 'gas', 'tecido']) }, left: 1 } : null,
    () => S.best >= 6 ? { give: bag({ comida: 80, sucata: 80 }), get: { weapon: 1 }, left: 1 } : null,
    () => ({ give: bag({ comida: 50, municao: 30 }), get: { survivor: 1 }, left: 1 }),
  ];
  // Ofertas de fim de jogo: coisas que a produção comum não dá
  const LATE = [
    () => S.build.lab ? { give: bag({ comida: 120, sucata: 120 }), get: { sample: pick(['acido', 'gas', 'tecido']), n: 2 + Math.floor(S.meta.city / 3) }, left: 1 } : null,
    () => S.build.lab ? { give: bag({ municao: 60, remedio: 3 }), get: { rp: Math.max(40, Math.round(rpRate() * 120)) }, left: 2 } : null,
    () => ({ give: bag({ comida: 150, sucata: 150, municao: 60 }), get: { weapon: 1, n: 2 }, left: 1 }),
    () => S.best >= 20 && Object.keys(Endgame.HEROES).some(k => !S.meta.heroes.some(h => h.key === k))
      ? { give: bag({ comida: 250, sucata: 250, remedio: 6 }), get: { hero: 1 }, left: 1 } : null,
  ];
  const shuffle = a => [...a].sort(() => Math.random() - 0.5);

  function arrive_() {
    const late = lateGame();
    // no fim de jogo vêm menos trocas básicas e duas ofertas especiais
    const offers = shuffle(OFFERS).slice(0, late ? 2 : 3).map(f => ({ ...f(), left: 2 }));
    if (late) offers.push(...shuffle(LATE).map(f => f()).filter(Boolean).slice(0, 2));
    if (chance(late ? 0.2 : 0.35)) { const r = pick(RARE)(); if (r) offers.push(r); }
    S.merchant = { t: MERCHANT_STAY, offers };
    addLog('🛒 Um comerciante ambulante parou no portão! Ele fica pouco tempo: veja as ofertas.', 'good');
    emit('merchant');
    toast({ icon: '🛒', label: 'Comerciante ambulante', name: 'Ofertas por tempo limitado',
      desc: late ? 'Trocas maiores e itens raros para quem já está longe.' : 'Troque recursos que estão sobrando pelos que estão faltando.', btn: 'Ver ofertas', onBtn: openMerchant });
  }

  function leave(reason) {
    S.merchant = null;
    S.merchantT = rnd(...MERCHANT_GAP);
    addLog(`🛒 O comerciante ${reason}.`);
    if (dlgMerchant) { dlgMerchant.close(true); dlgMerchant = null; }
  }

  function bagHtml(bag, check) {
    return Object.entries(bag).map(([r, v]) => {
      const n = bag.n || 1;
      if (r === 'n') return null;
      if (r === 'sample') return `${SAMPLE_ICON[v]} ${n} amostra${n > 1 ? 's' : ''}`;
      if (r === 'weapon') return `🗡️ ${n} arma${n > 1 ? 's' : ''}`;
      if (r === 'survivor') return '🧍 1 sobrevivente';
      if (r === 'hero') return '🦸 1 herói';
      if (r === 'rp') return `🔬 ${fmt(v)} de pesquisa`;
      const txt = `${RES[r].icon} ${fmt(v)}`;
      return check && S.res[r] < v ? `<span class="missing">${txt}</span>` : txt;
    }).filter(Boolean).join(' + ');
  }
  function offerBlock(o) {
    if (o.left <= 0) return 'Esgotado';
    if (!canAfford(o.give)) return 'Recursos insuficientes';
    if (o.get.survivor && S.survivors >= maxSurv()) return 'Sem vaga';
    if (o.get.hero && Object.keys(Endgame.HEROES).every(k => S.meta.heroes.some(h => h.key === k))) return 'Você já tem todos os heróis';
    return '';
  }

  function buy(i) {
    const o = S.merchant && S.merchant.offers[+i];
    if (!o || offerBlock(o)) return;
    pay(o.give);
    o.left--;
    let got;
    const n = o.get.n || 1;
    if (o.get.sample) { S.meta.samples[o.get.sample] += n; Endgame.count('samples', n); got = bagHtml(o.get); }
    else if (o.get.weapon) { for (let k = 0; k < n; k++) Endgame.gainWeapon('com o comerciante'); got = bagHtml(o.get); }
    else if (o.get.hero) { Endgame.gainHero('com o comerciante', 'merchant'); got = '🦸 um herói'; }
    else if (o.get.rp) { S.meta.rp += o.get.rp; got = bagHtml(o.get); }
    else if (o.get.survivor) { const n = addSurvivor(); arrive(1); got = `${n}, que decidiu ficar no abrigo`; }
    else got = change(o.get);
    addLog(`🛒 Troca feita: ${bagHtml(o.give)} por ${got}.`, 'good');
    emit('shop', { k: 'merchant', text: `🛒 ${got}` });
  }

  let dlgMerchant = null;
  function openMerchant() {
    if (!S.merchant) return;
    dlgMerchant = openDialog({
      title: '🛒 Comerciante ambulante',
      body: () => {
        const M = S.merchant;
        if (!M) return '<p class="event-text">O comerciante já foi embora.</p>';
        return `<p class="event-text">Um velho com uma mochila enorme e uma espingarda no ombro. "Tenho o que você precisa, se tiver o que eu quero." Ele vai embora em <b>${Math.ceil(M.t)}s</b> ou quando a horda chegar.</p>
          <div class="merchant-list">${M.offers.map((o, i) => {
            const block = offerBlock(o);
            return `<div class="row merchant-row ${o.left <= 0 ? 'locked' : ''}">
              <div class="main"><div class="title">${bagHtml(o.give, true)} → ${bagHtml(o.get)}</div>
              <div class="desc">${o.left > 0 ? `${o.left} troca(s) disponível(is)` : 'Esgotado'}</div></div>
              <button data-opt="${i}" data-hotkey="${(i + 1) % 10}" ${block ? `disabled title="${block}"` : ''}>Trocar ${hk((i + 1) % 10)}</button></div>`;
          }).join('')}</div>`;
      },
      cancel: 'Fechar',
      onOpt: i => buy(i),
      onClose: () => { dlgMerchant = null; },
    });
  }

  function tick(dt) {
    if (S.merchant) {
      S.merchant.t -= dt;
      if (S.horde.active) leave('foi embora antes de a horda chegar');
      else if (S.merchant.t <= 0) leave('pegou a mochila e seguiu viagem');
    } else if (!S.horde.active) {
      S.merchantT -= dt;
      if (S.merchantT <= 0 && S.waveTimer > 40 && !modalOpen) arrive_();
    }
    if (!S.horde.active && !modalOpen && !awaitingChoice) {
      S.eventT -= dt;
      if (S.eventT <= 0) {
        if (S.waveTimer > 20 && !S.merchant) { S.eventT = rnd(...EVENT_GAP); triggerDilemma(); }
        else S.eventT = 15;
      }
    }
  }

  return { tick, openMerchant, DILEMMAS, triggerDilemma };
})();
