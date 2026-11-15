'use strict';

// 📖 Bestiário e Glossário (atalho B).
// Bestiário: cada inimigo fica como "???" até você abater um. Mais abates liberam mais da ficha:
//   comuns 1 / 10 / 50 / 100 · chefes 1 / 3 / 10 (aparecem bem menos). Contagem em S.meta.stats.zk (por tipo).
// Glossário: fraquezas e truques descobertos jogando (ex.: fogo contra Hospedeiro). Nada vem liberado:
//   a primeira vez que acontece na horda, a página entra no glossário (S.meta.glos).
const Codex = (() => {
  // desc: o que é (1º nível) · fact: curiosidade (último nível)
  const BEAST = {
    normal: { desc: 'O morto-vivo de sempre: lento, teimoso e sempre em bando. Sozinho não assusta; mil deles derrubam qualquer muro.', fact: 'Seguem o barulho. Cada tiro do abrigo chama mais deles.' },
    corredor: { desc: 'Morreu há pouco e ainda tem músculo nas pernas. Corre curvado, quase o dobro da velocidade de um zumbi comum.', fact: 'Tem a mesma vida de um zumbi comum: um bom tiro resolve.' },
    tanque: { desc: 'Era grande em vida e ficou maior na morte. Aguenta muito castigo e bate forte no muro.', fact: 'O rifle atravessa a fila e acerta quem vem atrás dele.' },
    cuspidor: { desc: 'Para a uma distância segura e cospe ácido que corrói o muro e fere os guardas.', fact: 'O ácido é inflamável: morrendo queimado, ele explode e fere quem está em volta.' },
    explosivo: { desc: 'Inchado de gases. Ao chegar no muro, explode e leva um pedaço junto.', fact: 'Explodindo longe do muro, fere os zumbis em volta. Deixe-o chegar perto e vai doer.' },
    mordido: { desc: 'Alguém do seu grupo, que foi mordido e não resistiu. Volta com a horda, mais forte e com o próprio nome.', fact: 'Cada um deles tem um lugar no memorial.' },
    uivador: { desc: 'Cabelos brancos e olhos amarelos. Ao morrer, solta um grito que acelera os zumbis em volta.', fact: 'Abata-o longe do grupo: o grito só alcança quem está perto.' },
    hospedeiro: { desc: 'Coberto de fungos. Ao morrer, solta esporos que deixam os zumbis em volta mais resistentes.', fact: 'O fungo pega fogo fácil: queimado, leva o dobro de dano e não solta esporos.' },
    arremessador: { desc: 'Carrega uma sacola de pedras e as arremessa no muro de longe.', fact: 'Tem bom braço: alcança quase o dobro da distância de um cuspidor.' },
    blindado: { desc: 'Policial de choque que virou zumbi com colete e capacete. Tiros no corpo ricocheteiam.', fact: 'Só tiros na cabeça ferem de verdade. Explosões e fogo passam em parte pela armadura.' },
    gosma: { desc: 'Uma massa de gelatina verde que um dia foi gente. As balas afundam nela e quase não fazem efeito.', fact: 'O fogo a derrete: o lança-chamas faz o triplo de dano.' },
    saqueador: { desc: 'Gente viva, e perigosa. Corre rápido, bate no muro sem parar e carrega suprimentos.', fact: 'Abatidos, deixam comida e munição para o abrigo.' },
    incendiario: { desc: 'Saqueador com uma mochila de coquetéis molotov, que arremessa no muro.', fact: 'Rosto coberto por um pano preto. Ninguém sabe de onde eles vêm.' },
    cria: { desc: 'Filhote da Matriarca. Pequeno, rápido e sempre em bando.', fact: 'Frágil ao fogo: dano triplo, e o lança-chamas pega o bando inteiro de uma vez.' },
    broto: { desc: 'Pedaço do Hospedeiro Gigante que ganhou vida própria. Ao morrer, se divide de novo.', fact: 'Queimando, não se divide e leva o dobro de dano.' },
    chefe: { desc: 'A primeira grande ameaça: uma massa de músculos e espinhos que esmaga o muro.', fact: 'Não tem truque: concentre todo o fogo nela.' },
    saltador: { desc: 'Pernas enormes. Agacha e salta por cima da horda direto no muro.', fact: 'Acertá-lo enquanto se agacha interrompe o salto.' },
    rolador: { desc: 'Enrola-se numa bola blindada e rola até o muro.', fact: 'Rolando, as balas ricocheteiam. Espere a batida, quando ele fica tonto, ou use a bazuca.' },
    matriarca: { desc: 'Lenta e enorme, pare crias sem parar enquanto avança.', fact: 'Quanto mais ela vive, mais crias aparecem. O fogo limpa as crias.' },
    colosso: { desc: 'Um gigante coberto por uma casca grossa. Ao perdê-la, fica menor e muito mais rápido.', fact: 'Na última fase, rasteja: abaixe a mira.' },
    escavador: { desc: 'Cava por baixo da terra e reaparece perto do muro.', fact: 'Debaixo da terra, nada o acerta. Espere ele sair.' },
    colossal: { desc: 'Um Inchado do tamanho de um caminhão. A explosão dele perto do muro é devastadora.', fact: 'Explodido longe, fere a própria horda.' },
    carcaca: { desc: 'Um esqueleto coberto de osso, com um tumor brilhante que abre e fecha.', fact: 'Só o tumor aberto fere de verdade, e leva dano extra.' },
    cuspideira: { desc: 'Fica longe da defesa e cospe ácido que deixa poças no chão e corrói o muro.', fact: 'Use armas de longo alcance: ela não chega perto.' },
    reiuivador: { desc: 'Coroado de ossos. O grito dele cura e acelera a horda inteira.', fact: 'Ao morrer, o último grito atordoa todos os zumbis da tela.' },
    gigante: { desc: 'Uma colônia de fungos andando. Ao morrer, se divide em Brotos, que se dividem de novo.', fact: 'Queimando na hora da morte, não se divide.' },
    chefao: { desc: 'O líder dos saqueadores: escudo na frente, molotovs e granadas.', fact: 'O escudo para balas no corpo: mire na cabeça ou use explosivos.' },
  };
  const GROUPS = [
    ['Zumbis', ['normal', 'corredor', 'tanque', 'cuspidor', 'explosivo', 'uivador', 'hospedeiro', 'arremessador', 'blindado', 'gosma', 'mordido']],
    ['Humanos', ['saqueador', 'incendiario']],
    ['Chefes', ['chefe', 'saltador', 'rolador', 'matriarca', 'colosso', 'escavador', 'colossal', 'carcaca', 'cuspideira', 'reiuivador', 'gigante', 'chefao']],
    ['Crias e pedaços', ['cria', 'broto']],
  ];
  const TIERS = { common: [1, 10, 50, 100], boss: [1, 3, 10, 10] };

  // glossário: o que dá para descobrir (a ordem é a da lista)
  const GLOS = {
    fire_hospedeiro: { icon: '🔥', title: 'Fogo × Hospedeiro', text: 'O fungo queima fácil: o fogo causa o dobro de dano no Hospedeiro.' },
    burn_spores: { icon: '🍄', title: 'Esporos queimados', text: 'Hospedeiro ou Broto que morre queimando não solta esporos: ninguém em volta fica mais resistente.' },
    fire_cria: { icon: '🔥', title: 'Fogo × Crias', text: 'Crias são frágeis ao fogo: dano triplo. O lança-chamas pega o bando inteiro.' },
    burn_acid: { icon: '🤮', title: 'Ácido inflamável', text: 'Cuspidor que morre queimando faz o ácido explodir, ferindo os zumbis em volta.' },
    fire_gigante: { icon: '🔥', title: 'Fogo × Hospedeiro Gigante', text: 'O Hospedeiro Gigante também queima bem: +50% de dano com fogo.' },
    fire_broto: { icon: '🔥', title: 'Fogo × Broto', text: 'O Broto leva o dobro de dano com fogo.' },
    burn_split: { icon: '✂️', title: 'Divisão queimada', text: 'Hospedeiro Gigante ou Broto que morre queimando não se divide.' },
    bullet_gosma: { icon: '🫧', title: 'Balas × Gosma', text: 'As balas afundam na gelatina: só 30% do dano. Pedras dos guardas também.' },
    fire_gosma: { icon: '🔥', title: 'Fogo × Gosma', text: 'O fogo derrete a Gosma: dano triplo.' },
    head_blindado: { icon: '🪖', title: 'Na cabeça', text: 'O Policial blindado só leva dano cheio com tiro na cabeça. No corpo, a bala ricocheteia.' },
    weak_carcaca: { icon: '🦴', title: 'Tumor aberto', text: 'A Carcaça só leva dano de verdade com o tumor aberto, e aí leva dano extra.' },
    rocket_rolador: { icon: '🚀', title: 'Foguete × Rolador', text: 'O foguete da bazuca fere o Rolador mesmo rolando, quando as balas ricocheteiam.' },
  };

  const kills = t => { const st = S.meta.stats; return Math.max((st.zk && st.zk[t]) || 0, (ZTYPES[t].boss && st.bk && st.bk[t]) || 0); };
  const tiers = t => (ZTYPES[t].boss ? TIERS.boss : TIERS.common);
  const level = t => tiers(t).filter(n => kills(t) >= n).length;   // 0 = ???, 1 = nome, 2 = descrição, 3 = números, 4 = tudo
  const G = () => S.meta.glos || (S.meta.glos = {});
  // o que você já viu na janela: fichas (nível por tipo) e descobertas. O resto ganha "NOVO" e a bolinha no botão
  const SEEN = () => S.meta.cxSeen || (S.meta.cxSeen = { z: {}, g: {} });
  const ALL = () => GROUPS.flatMap(g => g[1]);
  const newZ = t => level(t) > (SEEN().z[t] || 0);
  const newG = id => G()[id] && !SEEN().g[id];
  const hasNew = () => ALL().some(newZ) || Object.keys(GLOS).some(newG);
  function markSeen(which) {
    const sn = SEEN();
    if (which === 'beast') for (const t of ALL()) sn.z[t] = level(t);
    else if (which === 'glos') for (const id of Object.keys(GLOS)) if (G()[id]) sn.g[id] = 1;
  }
  // abates: avisa no registro quando uma ficha sobe de nível
  const TIER_TXT = ['entrou no bestiário', 'descrição liberada', 'números liberados', 'ficha completa'];
  function onKills(type, before) {
    if (!BEAST[type] || simulating) return;
    const T = tiers(type), now = kills(type);
    const i = T.findIndex(n => before < n && now >= n);
    if (i < 0) return;
    addLog(`📖 ${i === 0 ? `Novo no bestiário: ${ZTYPES[type].nome}` : `Bestiário · ${ZTYPES[type].nome}: ${TIER_TXT[i]}`} (B).`);
  }

  // primeira vez que uma fraqueza acontece na horda: entra no glossário
  function discover(id) {
    if (!GLOS[id] || typeof S === 'undefined' || !S || G()[id] || simulating) return;
    G()[id] = 1;
    const g = GLOS[id];
    addLog(`📖 Descoberta: ${g.icon} ${g.title}. ${g.text} (veja no Glossário, B)`, 'good');
    emit('discover', { id });
    if (typeof document !== 'undefined' && typeof toast === 'function')
      toast({ icon: '📖', label: 'Nova descoberta', name: `${g.icon} ${g.title}`, desc: g.text, btn: 'Abrir glossário', onBtn: () => open('glos'), time: 5000 });
  }

  // ---------- janela ----------
  const relHp = t => { const h = ZTYPES[t].hp / ZTYPES.normal.hp; return h >= 1.95 ? `${fmt(h)}× a de um zumbi comum` : h > 1.05 ? `${fmt(h)}× a de um zumbi comum` : h < 0.95 ? 'menor que a de um zumbi comum' : 'a de um zumbi comum'; };
  const relSpd = t => { const v = ZTYPES[t].speed / ZTYPES.normal.speed; return v >= 1.5 ? 'muito rápido' : v >= 1.15 ? 'rápido' : v >= 0.85 ? 'normal' : v >= 0.5 ? 'lento' : 'muito lento'; };
  const KIND = { fire: '🔥 Fogo', bullet: '🔫 Balas', blast: '💣 Explosões' };
  let sel = null, tab = 'beast';

  function card(t) {
    const lv = level(t), n = kills(t);
    return `<button class="cx-tile${lv ? '' : ' unknown'}${sel === t ? ' on' : ''}" data-cx="${t}" title="${lv ? ZTYPES[t].nome : 'Desconhecido'}">${newZ(t) ? '<span class="cx-new">NOVO</span>' : ''}
      <canvas width="56" height="56" data-zp="${t}" data-sil="${lv ? '' : 1}"></canvas>
      <span class="cx-name">${lv ? ZTYPES[t].nome : '???'}</span><span class="cx-k">${lv ? '☠ ' + fmt(n) : ''}</span></button>`;
  }

  function detail(t) {
    if (!t) return '<p class="hint">Escolha um inimigo para ver a ficha.</p>';
    const Z = ZTYPES[t], lv = level(t), n = kills(t), T = tiers(t), B = BEAST[t] || {};
    const next = T.find(x => x > n);
    const lock = need => `<p class="cx-lock">🔒 Abata ${fmt(need)} para liberar ${need === T[1] ? 'a descrição' : need === T[2] ? 'os números' : 'as fraquezas e uma curiosidade'} (${fmt(n)}/${fmt(need)})</p>`;
    if (!lv) return `<div class="cx-detail"><canvas width="120" height="120" data-zp="${t}" data-sil="1"></canvas>
      <h3>???</h3><p class="hint">Você ainda não abateu nenhum. Continue jogando para descobrir o que é.</p></div>`;
    const res = Z.res ? Object.entries(Z.res).map(([k, m]) => `<li>${KIND[k]}: <b class="${m > 1 ? 'good-text' : 'warn-text'}">${m > 1 ? `${fmt(m)}× de dano` : `só ${Math.round(m * 100)}% do dano`}</b></li>`).join('') : '';
    const known = Object.keys(GLOS).filter(id => G()[id] && (id.endsWith('_' + t) || (BEAST[t] && GLOS[id].text.includes(Z.nome)))).map(id => `<li>${GLOS[id].icon} ${GLOS[id].title}</li>`).join('');
    return `<div class="cx-detail">
      <canvas width="120" height="120" data-zp="${t}"></canvas>
      <h3>${Z.icon ? Z.icon + ' ' : ''}${Z.nome}</h3>
      <div class="cx-kills">☠ ${fmt(n)} abatido${n === 1 ? '' : 's'}${next ? ` · próximo nível em ${fmt(next)}` : ' · ficha completa ✓'}</div>
      ${lv >= 2 ? `<p>${B.desc || ''}</p>${Z.tip ? `<p class="cx-tip">💡 ${Z.tip}</p>` : ''}` : lock(T[1])}
      ${lv >= 3 ? `<div class="cx-stats">
          <div><span>❤️ Vida</span><b>${relHp(t)}</b></div>
          <div><span>👣 Velocidade</span><b>${relSpd(t)}</b></div>
          <div><span>🧱 Dano no muro</span><b>${fmt(Z.dmg)} por golpe${Z.spit ? ' · ataca de longe' : ''}${Z.explode ? ' · explode' : ''}</b></div>
          <div><span>🔩 Saque</span><b>${fmt(Z.loot)} sucata${Z.food ? ` · ${Z.food} 🥫` : ''}${Z.ammo ? ` · ${Z.ammo} 🔫` : ''}</b></div>
        </div>` : lv >= 2 ? lock(T[2]) : ''}
      ${lv >= 4 ? `<h4>Fraquezas e resistências</h4>${res ? `<ul class="cx-res">${res}</ul>` : `<p class="hint">${Z.armor ? 'Blindado: veja a curiosidade.' : 'Nenhuma: qualquer arma serve.'}</p>`}
          ${known ? `<h4>No glossário</h4><ul class="cx-res">${known}</ul>` : ''}
          <p class="cx-fact">🧠 ${B.fact || ''}</p>` : lv >= 3 ? lock(T[3]) : ''}
    </div>`;
  }

  function glosHtml() {
    const ids = Object.keys(GLOS), got = ids.filter(id => G()[id]).length;
    return `<p class="hint">Fraquezas e truques que você já viu acontecer na horda. Experimente armas diferentes em cada inimigo para descobrir o resto. <b>${got}/${ids.length}</b> descobertas.</p>
      <div class="cx-glos">${ids.map(id => G()[id]
        ? `<div class="cx-g">${newG(id) ? '<span class="cx-new">NOVO</span>' : ''}<span class="cx-gi">${GLOS[id].icon}</span><div><b>${GLOS[id].title}</b><p>${GLOS[id].text}</p></div></div>`
        : `<div class="cx-g unknown"><span class="cx-gi">❔</span><div><b>???</b><p>Ainda não descoberto.</p></div></div>`).join('')}</div>`;
  }

  // cenas da história (js/story.js): as liberadas dá para assistir de novo
  function memHtml() {
    const L = Story.list(), got = L.filter(m => m.unlocked).length;
    return `<p class="hint">A história do Projeto Aurora, contada aos poucos: a abertura, a primeira evacuação e cada etapa da Cura. Clique numa memória para assistir de novo. <b>${got}/${L.length}</b> liberadas.</p>
      <div class="cx-glos">${L.map(m => m.unlocked
        ? `<button class="cx-g cx-mem" data-mem="${m.id}"><span class="cx-gi">${m.icon}</span><div><b>${m.title}</b><p>▶ Assistir</p></div></button>`
        : `<div class="cx-g unknown"><span class="cx-gi">🔒</span><div><b>???</b><p>${m.hint}</p></div></div>`).join('')}</div>`;
  }

  // ---------- estatísticas do save (S.meta.stats e o que já existe no meta: vale para todas as cidades do save)
  const dur = s => {
    s = Math.floor(s || 0);
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    return d ? `${d}d ${h}h` : h ? `${h}h ${String(m).padStart(2, '0')}min` : m ? `${m}min` : `${s}s`;
  };
  function statsHtml() {
    const st = S.meta.stats, m = S.meta, n = v => fmt(v || 0), c = m.champ || {};
    const row = (icon, label, v, tip) => `<div class="cx-st"${tip ? ` title="${tip}"` : ''}><span>${icon} ${label}</span><b>${v}</b></div>`;
    const sec = (title, rows) => `<section class="cx-sts"><h4>${title}</h4>${rows.join('')}</section>`;
    const Df = DIFFS[S.diff] || DIFFS.normal;
    const achDone = ACH.filter(a => m.ach[a.id]).length;
    const all = GROUPS.flatMap(g => g[1]), seen = all.filter(t => level(t)).length;
    const glos = Object.keys(GLOS).filter(id => G()[id]).length;
    const mem = typeof Story !== 'undefined' ? Story.list() : [];
    const skins = (typeof WSkins !== 'undefined' ? WSkins.DEFS.filter(d => WSkins.owned(d.id)).length : 0) + ((m.osk && m.osk.own && m.osk.own.length) || 0);
    const top = Object.entries(st.zk || {}).filter(([t]) => ZTYPES[t]).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([t, k]) => `${ZTYPES[t].icon || '🧟'} ${ZTYPES[t].nome} (${fmt(k)})`).join(' · ');
    const kph = st.time > 600 ? fmt(Math.round(st.kills / (st.time / 3600))) : '—';
    return `<p class="hint">Números deste save, somando todas as cidades e mundos. O tempo conta enquanto o jogo está aberto na tela.</p>
      <div class="cx-statgrid">
        ${sec('⏱️ Geral', [
          row('⏱️', 'Tempo jogado', dur(st.time), 'Tempo com o jogo aberto na tela (contado a partir da versão 1.07)'),
          row('▶️', 'Nesta sessão', dur(sessionT)),
          row('📅', 'Começou em', st.since ? new Date(st.since).toLocaleDateString('pt-BR') : '—', st.since ? '' : 'Save de antes da versão 1.07: sem data'),
          row(Df.icon, 'Dificuldade', Df.nome),
          row('🌊', 'Melhor onda', n(Math.max(st.bestWave || 0, S.best || 0))),
          row('🏙️', 'Cidade · mundo', `${m.city || 1} · ${m.worlds || 1}`),
          row('🚁', 'Evacuações', n(st.evacs)),
          row('✨', 'Esperança total', n(m.hopeTotal)),
        ])}
        ${sec('⚔️ Combate', [
          row('☠️', 'Zumbis abatidos', n(st.kills)),
          row('⚡', 'Abates por hora', kph, 'Média: abates ÷ tempo jogado'),
          row('👹', 'Chefes derrotados', n(st.bosses)),
          row('🎯', 'Tiros certeiros do líder', n(st.shots)),
          row('🪖', 'Tiros na cabeça (blindados)', n(st.headshots)),
          row('🛡️', 'Ondas sem dano no muro', n(st.flawless), 'Ondas 5+ vencidas sem o muro levar dano'),
          row('🏴‍☠️', 'Ataques de saqueadores repelidos', n(st.raids)),
          row('✈️', 'Ataques aéreos', n(st.airstrikes)),
        ])}
        ${sec('🏠 Abrigo', [
          row('🔍', 'Vasculhadas', n(st.scav)),
          row('🏗️', 'Construções', n(st.builds)),
          row('🗺️', 'Expedições', n(st.exps)),
          row('🔬', 'Pesquisas concluídas', n(st.research)),
          row('🏴', 'Distritos libertados', n(st.districts)),
          row('💊', 'Vidas salvas com remédio', n(st.saved)),
          row('🌅', 'Mordidos que voltaram curados', n(st.cured)),
          row('🕯️', 'Perdidos (memorial)', n(m.fallen)),
        ])}
        ${sec('🏆 Coleção', [
          row('🏆', 'Conquistas', `${achDone}/${ACH.length}`),
          row('🪖', 'Heróis de campo', `${Object.keys(c.owned || {}).length}/${Object.keys(CHAMPS).length}`),
          row('🏷️', 'Tampinhas', n(c.caps)),
          row('🎨', 'Skins', n(skins)),
          row('🐾', 'Pets', n((m.pets || []).length)),
          row('🧟', 'Bestiário', `${seen}/${all.length}`),
          row('📖', 'Glossário', `${glos}/${Object.keys(GLOS).length}`),
          row('🎞️', 'Memórias', `${mem.filter(x => x.unlocked).length}/${mem.length}`),
        ])}
      </div>
      ${top ? `<p class="hint cx-top">☠️ Mais abatidos: ${top}</p>` : ''}`;
  }

  function beastHtml() {
    const all = GROUPS.flatMap(g => g[1]), seen = all.filter(t => level(t)).length;
    return `<p class="hint">Abata inimigos para revelar a ficha de cada um. <b>${seen}/${all.length}</b> descobertos.</p>
      <div class="cx-wrap"><div class="cx-list">${GROUPS.map(([nome, ks]) => `<h4>${nome}</h4><div class="cx-grid">${ks.map(card).join('')}</div>`).join('')}</div>
      <div class="cx-side" id="cx-side">${detail(sel)}</div></div>`;
  }

  function paint(root) {
    for (const c of root.querySelectorAll('canvas[data-zp]')) Scene.zportrait(c, c.dataset.zp, !!c.dataset.sil);
  }

  function body() {
    return `<div class="tabs set-tabs cx-tabs" role="tablist">
        <button class="tab${tab === 'beast' ? ' active' : ''}" data-cxtab="beast">🧟 Bestiário${ALL().some(newZ) ? ' <i class="tab-dot"></i>' : ''}</button>
        <button class="tab${tab === 'glos' ? ' active' : ''}" data-cxtab="glos">📖 Glossário${Object.keys(GLOS).some(newG) ? ' <i class="tab-dot"></i>' : ''}</button>
        <button class="tab${tab === 'mem' ? ' active' : ''}" data-cxtab="mem">🎞️ Memórias</button>
        <button class="tab${tab === 'stats' ? ' active' : ''}" data-cxtab="stats">📊 Estatísticas</button></div>
      <div id="cx-body">${tab === 'beast' ? beastHtml() : tab === 'glos' ? glosHtml() : tab === 'stats' ? statsHtml() : memHtml()}</div>`;
  }

  function open(which) {
    if (which) tab = which;
    else if (!ALL().some(newZ) && Object.keys(GLOS).some(newG)) tab = 'glos';   // abre onde está a novidade
    else if (ALL().some(newZ)) tab = 'beast';
    if (!sel || !level(sel)) sel = ALL().find(t => level(t)) || null;
    if (tab === 'beast' && ALL().some(newZ)) sel = ALL().find(newZ);
    openDialog({
      title: '📖 Códice',
      staticBody: true, plain: true, wide: true,
      body: body(),
      cancel: 'Fechar',
      onMount: () => {
        const root = $('dialog-body');
        paint(root);
        markSeen(tab);   // o "NOVO" fica à mostra nesta abertura; na próxima já some
        root.addEventListener('click', e => {
          const tb = e.target.closest('[data-cxtab]');
          if (tb) { tab = tb.dataset.cxtab; root.innerHTML = body(); paint(root); markSeen(tab); return; }
          const mem = e.target.closest('[data-mem]');
          if (mem) { Story.play(mem.dataset.mem); return; }
          const b = e.target.closest('[data-cx]');
          if (!b) return;
          sel = b.dataset.cx;
          root.querySelectorAll('.cx-tile').forEach(x => x.classList.toggle('on', x === b));
          const side = $('cx-side');
          side.innerHTML = detail(sel);
          paint(side);
        });
      },
    });
  }

  return { discover, open, level, kills, hasNew, onKills, GLOS, BEAST };
})();
