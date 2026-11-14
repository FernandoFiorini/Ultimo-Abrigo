'use strict';

// Skins de personagem: roupas do líder, uniformes dos sobreviventes e trajes alternativos dos heróis de campo.
// Só visual. Compradas com 🏷️ Tampinhas na Loja › Skins e equipadas na janela 🎨 Visual. Ficam no save (S.meta.osk).
// Os protótipos aprovados vieram da página "Guarda-Roupa do Abrigo".
const OSkins = (() => {
  const GOLD = [230, 190, 60];
  const PRICE = { comum: 30, rara: 60, epica: 100, lendaria: 180 };
  const RAR = { comum: 'Comum', rara: 'Rara', epica: 'Épica', lendaria: 'Lendária' };
  const JOBS = ['forrageiro', 'coletor', 'armeiro', 'guarda', 'medico', 'cientista'];
  const ji = j => Math.max(0, JOBS.indexOf(j));

  // ---------- líder: look (cores e acessórios simples) · body/head/front: detalhes desenhados · noHair: esconde o cabelo ----------
  const LIDER = [
    { id: 'cangaceiro', nome: 'Cangaceiro', tema: 'Sertão nordestino', rar: 'lendaria', look: { shirt: [130, 86, 44], pants: [92, 70, 48], belt: [60, 40, 20] },
      body(R, dy) { for (let i = 0; i < 6; i++) { R([170, 130, 50], -3 + i, -11 + dy + i, 1, 1); R([170, 130, 50], 2 - i, -11 + dy + i, 1, 1); } },
      head(R, dy, o, hx) { R([110, 70, 30], hx - 3, -18 + dy, 11, 1); R([110, 70, 30], hx - 2, -19 + dy, 9, 1); R([130, 86, 40], hx - 1, -21 + dy, 7, 2); R(GOLD, hx + 2, -20 + dy, 1, 1); R(GOLD, hx + 1, -19 + dy, 3, 1); },
      desc: 'Chapéu de couro em meia-lua com estrela, gibão de couro e cartucheiras cruzadas no peito.' },
    { id: 'bombeiro', nome: 'Bombeiro', tema: 'Profissões', rar: 'rara', look: { shirt: [200, 170, 100], pants: [190, 160, 92], boots: [30, 30, 30] },
      body(R, dy) { R([235, 235, 140], -3, -8 + dy, 6, 1); R([235, 235, 140], -2, -3, 1, 1); R([235, 235, 140], 1, -3, 1, 1); },
      head(R, dy, o, hx) { R([200, 30, 30], hx - 1, -19 + dy, 7, 3); R([200, 30, 30], hx - 2, -17 + dy, 9, 1); R(GOLD, hx + 2, -19 + dy, 1, 1); },
      desc: 'Capacete vermelho de aba longa com brasão, jaqueta e calça de proteção com faixas refletivas.' },
    { id: 'astronauta', nome: 'Astronauta', tema: 'Corrida espacial', rar: 'lendaria', noHair: true, look: { shirt: [228, 228, 232], pants: [220, 220, 226], pack: [210, 210, 216], boots: [120, 120, 130], glove: [200, 200, 206] },
      body(R, dy) { R([40, 90, 200], -2, -10 + dy, 1, 1); R([200, 40, 40], 1, -9 + dy, 1, 1); },
      head(R, dy, o, hx) { R([235, 235, 240], hx - 1, -19 + dy, 7, 8); R([200, 150, 40], hx + 1, -17 + dy, 5, 4); R([255, 230, 140], hx + 2, -17 + dy, 1, 1); R([180, 180, 186], hx - 1, -12 + dy, 7, 1); },
      desc: 'Traje branco de missão com bandeirinha e mochila de oxigênio, capacete com o visor dourado.' },
    { id: 'samurai', nome: 'Samurai', tema: 'Japão feudal', rar: 'lendaria', noHair: true, look: { shirt: [150, 24, 24], pants: [28, 26, 30], belt: [200, 160, 60], sleeve: [28, 26, 30], glove: [28, 26, 30] },
      body(R, dy) {
        for (let y = -11; y <= -7; y++) R(y % 2 ? [150, 24, 24] : [70, 14, 14], -3, y + dy, 6, 1);
        for (const [x, y] of [[-2, -10], [0, -10], [2, -10], [-1, -8], [1, -8]]) R([200, 160, 60], x, y + dy, 1, 1);
        R([150, 24, 24], -5, -11 + dy, 2, 5); R([70, 14, 14], -5, -9 + dy, 2, 1); R([200, 160, 60], -5, -11 + dy, 2, 1);
        R([150, 24, 24], -3, -5, 2, 2); R([150, 24, 24], 1, -5, 2, 2); R([70, 14, 14], -1, -5, 2, 1);
        R([28, 26, 30], -7, -6 + dy, 5, 1); R([200, 160, 60], -3, -6 + dy, 1, 1); R([28, 26, 30], 3, -7 + dy, 2, 1);
      },
      head(R, dy, o, hx) {
        R([28, 26, 30], hx - 1, -18 + dy, 7, 2); R([60, 56, 62], hx, -18 + dy, 5, 1);
        R([150, 24, 24], hx - 2, -16 + dy, 2, 4); R([70, 14, 14], hx - 2, -14 + dy, 2, 1); R([150, 24, 24], hx - 3, -13 + dy, 2, 1);
        R([200, 160, 60], hx + 1, -19 + dy, 3, 1); R([200, 160, 60], hx, -20 + dy, 1, 1); R([200, 160, 60], hx + 4, -20 + dy, 1, 1); R([200, 160, 60], hx - 1, -21 + dy, 1, 1); R([200, 160, 60], hx + 5, -21 + dy, 1, 1);
        R([150, 24, 24], hx + 1, -13 + dy, 5, 2); R([28, 26, 30], hx + 2, -13 + dy, 3, 1); R([230, 230, 230], hx + 5, -12 + dy, 1, 1);
      },
      desc: 'Kabuto com a meia-lua dourada e o protetor de nuca, meia-máscara vermelha, peitoral amarrado com cordão dourado, ombreira grande, saia de placas e a katana na cintura.' },
    { id: 'ninja', nome: 'Ninja', tema: 'Sombras', rar: 'epica', noHair: true, look: { shirt: [26, 26, 30], pants: [26, 26, 30], belt: [170, 20, 20], boots: [16, 16, 18] },
      head(R, dy, o, hx) { R([26, 26, 30], hx - 1, -17 + dy, 7, 7); R(o.skin, hx + 2, -14 + dy, 3, 1); R([20, 20, 20], hx + 3, -14 + dy, 1, 1); R([170, 20, 20], hx - 1, -16 + dy, 7, 1); R([170, 20, 20], hx - 3, -16 + dy, 2, 1); R([170, 20, 20], hx - 4, -15 + dy, 1, 1); },
      desc: 'Todo de preto, só os olhos à mostra, com faixa vermelha na cabeça (as pontas soltas) e na cintura.' },
    { id: 'peste', nome: 'Médico da Peste', tema: 'Peste negra', rar: 'lendaria', noHair: true, look: { shirt: [24, 24, 26], pants: [24, 24, 26], glove: [60, 50, 40], boots: [16, 16, 18] },
      body(R) { R([24, 24, 26], -3, -5, 6, 3); },
      head(R, dy, o, hx) { R([20, 20, 22], hx - 3, -17 + dy, 10, 1); R([20, 20, 22], hx - 1, -20 + dy, 7, 3); R([200, 180, 140], hx, -16 + dy, 5, 5); R([200, 180, 140], hx + 5, -14 + dy, 2, 2); R([200, 180, 140], hx + 7, -13 + dy, 1, 1); R([150, 220, 230], hx + 3, -15 + dy, 1, 1); },
      desc: 'Sobretudo preto até os joelhos, chapéu de abas e a máscara de bico com lentes de vidro.' },
    { id: 'cavaleiro', nome: 'Cavaleiro', tema: 'Idade Média', rar: 'lendaria', noHair: true, look: { shirt: [170, 175, 185], pants: [150, 155, 165], cape: [40, 70, 160], boots: [120, 124, 134], glove: [150, 155, 165] },
      body(R, dy) { R([210, 214, 222], -3, -11 + dy, 6, 1); R([40, 70, 160], -1, -10 + dy, 2, 3); R(GOLD, -1, -9 + dy, 2, 1); },
      head(R, dy, o, hx) { R([170, 175, 185], hx - 1, -18 + dy, 7, 7); R([210, 214, 222], hx - 1, -18 + dy, 7, 1); R([30, 30, 30], hx + 1, -15 + dy, 5, 1); R([200, 30, 30], hx + 1, -21 + dy, 2, 3); },
      desc: 'Armadura de aço, elmo fechado com fenda e pluma vermelha, capa azul e brasão no peito.' },
    { id: 'escafandro', nome: 'Escafandrista', tema: 'Fundo do mar', rar: 'epica', noHair: true, look: { shirt: [150, 140, 110], pants: [150, 140, 110], boots: [70, 70, 70], glove: [120, 110, 90] },
      head(R, dy, o, hx) { R([190, 150, 60], hx - 2, -19 + dy, 9, 8); R([230, 190, 90], hx - 2, -19 + dy, 9, 1); R([20, 30, 40], hx + 2, -17 + dy, 4, 4); R([100, 170, 200], hx + 3, -16 + dy, 1, 1); for (const [a, b] of [[hx - 1, -12], [hx + 5, -12], [hx - 2, -15]]) R([120, 90, 30], a, b + dy, 1, 1); },
      desc: 'Escafandro de latão com escotilha de vidro e parafusos, macacão de lona e botas pesadas.' },
    { id: 'hazmat', nome: 'Contenção Biológica', tema: 'Laboratório', rar: 'rara', noHair: true, look: { shirt: [230, 200, 40], pants: [230, 200, 40], boots: [30, 30, 30], glove: [30, 30, 30] },
      body(R, dy) { R([30, 30, 30], -3, -6 + dy, 6, 1); R([200, 30, 30], 1, -10 + dy, 1, 1); },
      head(R, dy, o, hx) { R([230, 200, 40], hx - 1, -18 + dy, 7, 7); R([60, 80, 90], hx + 1, -16 + dy, 4, 3); R([140, 190, 210], hx + 2, -16 + dy, 1, 1); R([40, 40, 40], hx + 4, -12 + dy, 2, 2); },
      desc: 'Traje de proteção amarelo fechado, visor escuro, filtro de ar, luvas e botas pretas.' },
    { id: 'policial', nome: 'Policial', tema: 'Delegacia', rar: 'rara', look: { shirt: [34, 48, 88], pants: [28, 34, 60], belt: [16, 16, 18], boots: [16, 16, 18] },
      body(R, dy) { R(GOLD, -2, -10 + dy, 1, 1); R([240, 240, 240], 1, -10 + dy, 2, 1); R([16, 16, 18], 2, -11 + dy, 1, 2); R([30, 30, 30], -4, -7 + dy, 1, 2); R(GOLD, -1, -6 + dy, 1, 1); },
      head(R, dy, o, hx) { R([24, 32, 62], hx - 1, -19 + dy, 6, 2); R([24, 32, 62], hx, -20 + dy, 5, 1); R([10, 10, 12], hx + 3, -17 + dy, 3, 1); R(GOLD, hx + 1, -19 + dy, 1, 1); R([30, 30, 30], hx + 2, -14 + dy, 3, 1); R([20, 20, 20], hx + 3, -14 + dy, 1, 1); },
      desc: 'Farda azul-marinho com distintivo dourado, rádio no ombro, cinto preto com coldre, quepe com brasão e óculos escuros.' },
  ];

  // ---------- sobreviventes: job(função) → cores e acessórios; head: chapéu do uniforme ----------
  const plaid = (a, b) => (R, dy) => { for (let y = -11; y < -6; y++) for (let x = -3; x < 3; x++) if ((x + y) % 2 === 0) R((y % 2 ? a : b), x, y + dy, 1, 1); };
  const SOBREV = [
    { id: 'escoteiros', nome: 'Escoteiros', tema: 'Acampamento', rar: 'comum', job: j => ({ shirt: [176, 156, 104], pants: [96, 84, 60], scarf: [[200, 40, 40], [40, 90, 180], [230, 180, 40], [40, 140, 70], [240, 240, 240], [140, 60, 160]][ji(j)], cross: j === 'medico', helmet: j === 'guarda' ? [90, 96, 60] : null }),
      head: (R, dy, o, hx) => { if (o.helmet) return; R([150, 120, 70], hx - 2, -17 + dy, 9, 1); R([150, 120, 70], hx, -19 + dy, 5, 2); },
      desc: 'Camisa cáqui com lenço no pescoço, de uma cor para cada função, e chapéu de escoteiro.' },
    { id: 'obras', nome: 'Canteiro de Obras', tema: 'Construção', rar: 'comum', job: j => ({ shirt: [90, 110, 140], pants: [60, 74, 110], vest: [240, 120, 30], hardhat: j === 'medico' ? [240, 240, 240] : j === 'guarda' ? [60, 120, 200] : [240, 200, 40], cross: j === 'medico' }),
      desc: 'Colete laranja refletivo, calça jeans e capacete de obra (azul para o guarda, branco para o médico).' },
    { id: 'junina', nome: 'Festa Junina', tema: 'Arraiá do abrigo', rar: 'rara', job: j => ({ shirt: [200, 60, 50], pants: [70, 80, 120], body: plaid([[200, 60, 50], [60, 120, 190], [230, 180, 40], [60, 150, 80], [200, 60, 150], [240, 140, 40]][ji(j)], [245, 235, 210]), cross: j === 'medico' }),
      head: (R, dy, o, hx) => { R([220, 190, 110], hx - 2, -17 + dy, 9, 1); R([220, 190, 110], hx, -19 + dy, 5, 2); R([200, 60, 50], hx, -18 + dy, 5, 1); },
      desc: 'Camisas xadrez de várias cores e chapéu de palha com fita.' },
    { id: 'plantao', nome: 'Plantão', tema: 'Hospital', rar: 'comum', job: j => ({ shirt: [[90, 170, 150], [80, 140, 200], [140, 100, 180], [90, 170, 150], [80, 140, 200], [236, 240, 240]][ji(j)], pants: [[90, 170, 150], [80, 140, 200], [140, 100, 180], [90, 170, 150], [80, 140, 200], [60, 80, 100]][ji(j)], mask: [200, 230, 230], cross: j === 'medico' }),
      head: (R, dy, o, hx) => R([200, 230, 230], hx - 1, -18 + dy, 6, 2),
      desc: 'Pijamas cirúrgicos coloridos, touca e máscara (o cientista de jaleco branco).' },
    { id: 'pelotao', nome: 'Pelotão', tema: 'Militar', rar: 'rara', job: j => ({ shirt: [86, 98, 58], pants: [70, 80, 50], helmet: j === 'guarda' || j === 'armeiro' ? [70, 78, 50] : null, beret: j === 'guarda' || j === 'armeiro' ? null : [110, 30, 30], cross: j === 'medico',
        body: (R, dy) => { for (const [x, y] of [[-3, -10], [0, -9], [2, -8], [-2, -7], [1, -11]]) R([56, 66, 38], x, y + dy, 1, 1); } }),
      desc: 'Uniforme camuflado, boina vermelha e capacete para quem fica na linha de frente.' },
    { id: 'selecao', nome: 'Seleção do Abrigo', tema: 'Futebol', rar: 'rara', job: j => ({ shirt: [250, 210, 40], pants: [40, 70, 170], boots: [240, 240, 240], cross: j === 'medico',
        body: (R, dy) => { R([40, 140, 70], -1, -11 + dy, 2, 1); R([40, 140, 70], -3, -11 + dy, 1, 1); R([40, 140, 70], 2, -11 + dy, 1, 1); } }),
      desc: 'Camisa amarela de gola verde, calção azul e meião branco, como num domingo de jogo.' },
    { id: 'inverno', nome: 'Inverno', tema: 'Frio', rar: 'comum', job: j => ({ shirt: [[160, 50, 50], [60, 90, 150], [90, 90, 96], [80, 96, 60], [236, 236, 236], [120, 80, 140]][ji(j)], pants: [60, 56, 64], scarf: [[240, 240, 240], [230, 180, 40], [200, 40, 40], [240, 240, 240], [200, 40, 40], [230, 180, 40]][ji(j)], cross: j === 'medico' }),
      head: (R, dy, o, hx) => { R(o.scarf, hx - 1, -18 + dy, 6, 2); R([240, 240, 240], hx + 1, -19 + dy, 2, 1); },
      desc: 'Casacos grossos, cachecóis e gorros de lã com pompom.' },
  ];

  // ---------- heróis: k (herói) · alt (o que muda) · body/head/front ----------
  const HEROIS = [
    { id: 'h_profeta', k: 'profeta', nome: 'Profeta do Deserto', rar: 'epica', alt: { shirt: [196, 168, 116], pants: [150, 120, 80], scarf: [120, 60, 30] },
      front: (R, dy) => { R([110, 80, 40], 4, -20 + dy, 1, 20); R([170, 210, 255], 4, -21 + dy, 1, 1); },
      desc: 'Manto de areia e um cajado com um raio preso na ponta. Mantém o cabelo e a barba brancos.' },
    { id: 'h_x9', k: 'x9', nome: 'Protótipo Dourado', rar: 'epica', alt: { shirt: [200, 160, 50], pants: [140, 110, 40], helmet: [220, 180, 60] },
      body: (R, dy) => { R([255, 90, 90], -1, -9 + dy, 2, 1); },
      desc: 'Placas douradas de edição de colecionador e o núcleo vermelho no peito. Mantém os óculos e o capacete.' },
    { id: 'h_bilu', k: 'bilu', nome: 'Gala do Circo', rar: 'epica', alt: { shirt: [40, 40, 120], cap: null, scarf: [240, 200, 60] },
      head: (R, dy, o, hx) => { R([20, 20, 20], hx, -22 + dy, 5, 5); R([20, 20, 20], hx - 1, -17 + dy, 7, 1); R([190, 40, 40], hx, -18 + dy, 5, 1); },
      desc: 'Fraque azul de apresentação e cartola com fita vermelha. Mantém o bigode e a gravata amarela.' },
    { id: 'h_imune', k: 'imune', nome: 'Jaleco da Pesquisa', rar: 'epica', alt: { shirt: [236, 240, 240], pants: [60, 80, 100] },
      body: (R, dy) => { R([40, 140, 120], -2, -10 + dy, 1, 2); },
      desc: 'Jaleco branco com um tubo de amostra no bolso: ela ajudando na Cura. Mantém o curativo e o cabelo.' },
    { id: 'h_waldir', k: 'waldir', nome: 'Volta ao Espaço', rar: 'epica', alt: { shirt: [200, 205, 215], pants: [200, 205, 215] },
      head: (R, dy, o, hx) => { R([200, 205, 215], hx + 2, -20 + dy, 1, 3); R([120, 255, 140], hx + 2, -21 + dy, 1, 1); },
      desc: 'Macacão prateado que "os de lá" deram de presente e uma antena com luz verde. Mantém os óculos e o bigode.' },
    { id: 'h_ze', k: 'ze', nome: 'Turnê de Metal', rar: 'epica', alt: { shirt: [20, 20, 22], pants: [30, 30, 34], bandana: [120, 40, 160] },
      body: (R, dy) => { R([200, 200, 200], -4, -12 + dy, 1, 1); R([200, 200, 200], 3, -12 + dy, 1, 1); R([230, 230, 230], -1, -9 + dy, 2, 2); },
      desc: 'Jaqueta de couro de turnê com tachas e caveira, bandana roxa. Mantém o cabelo comprido e a barba.' },
  ];
  const CATS = { lider: LIDER, sobrev: SOBREV, herois: HEROIS };
  const byId = {};
  for (const [cat, list] of Object.entries(CATS)) for (const d of list) { d.cat = cat; byId[d.id] = d; }

  // ---------- estado ----------
  const M = () => (typeof S !== 'undefined' && S && S.meta) ? (S.meta.osk || (S.meta.osk = { own: [], lider: null, sobrev: null, herois: {} })) : { own: [], lider: null, sobrev: null, herois: {} };
  const caps = () => (typeof S !== 'undefined' && S && S.meta && S.meta.champ) ? S.meta.champ.caps || 0 : 0;
  const owned = id => M().own.includes(id);
  function equipped(cat, k) {
    const m = M(), id = cat === 'herois' ? (m.herois || {})[k] : m[cat];
    return id && byId[id] && owned(id) ? byId[id] : null;
  }
  function buy(id) {
    const d = byId[id];
    if (!d || owned(id) || caps() < PRICE[d.rar]) return false;
    S.meta.champ.caps -= PRICE[d.rar];
    M().own.push(id);
    equip(id, true);
    addLog(`🏷️ Roupa comprada e vestida: ${d.nome}.`, 'good');
    return true;
  }
  // equipa (ou tira, se já estiver em uso; force: sempre veste)
  function equip(id, force) {
    const d = byId[id], m = M();
    if (!d || !owned(id)) return;
    if (d.cat === 'herois') { m.herois = m.herois || {}; m.herois[d.k] = !force && m.herois[d.k] === id ? null : id; }
    else m[d.cat] = !force && m[d.cat] === id ? null : id;
    if (d.cat === 'sobrev' && typeof Scene !== 'undefined' && Scene.restyle) Scene.restyle();
  }
  function unequip(cat, k) { const m = M(); if (cat === 'herois') { if (m.herois) m.herois[k] = null; } else m[cat] = null; if (cat === 'sobrev' && typeof Scene !== 'undefined' && Scene.restyle) Scene.restyle(); }

  // ---------- aplicar no visual ----------
  const dress = (base, d) => ({ ...base, ...d.look, body: d.body, head: d.head, front: d.front, noHair: !!d.noHair });
  // líder: roupa comprada equipada (ou null: vale a skin de roupa do perfil)
  function leaderLook(base, id) { const d = id ? byId[id] : equipped('lider'); return d ? dress(base, d) : null; }
  // sobreviventes: chamado pela cena ao vestir alguém; devolve true se o uniforme foi aplicado
  const SURV_KEYS = ['scarf', 'vest', 'hardhat', 'beret', 'mask', 'body', 'head', 'boots', 'belt', 'helmet', 'cross', 'apron', 'glasses'];
  function applySurvivor(p, job, id) {
    const d = id ? byId[id] : equipped('sobrev');
    if (!d) return false;
    const j = JOBS.includes(job) ? job : JOBS[(p.id || 0) % JOBS.length];   // ociosos e feridos usam o uniforme de alguma função
    for (const k of SURV_KEYS) p[k] = undefined;
    Object.assign(p, d.job(j));
    if (d.head) p.head = d.head;
    return true;
  }
  // heróis: traje alternativo por cima do visual original
  function heroLook(k, base, id) { const d = id ? byId[id] : equipped('herois', k); return d ? { ...base, ...d.alt, body: d.body, head: d.head, front: d.front } : base; }

  // ---------- vitrines (loja e janela Visual) ----------
  const PEOPLE = [{ skin: [224, 176, 140], hair: [40, 30, 20] }, { skin: [110, 72, 50], hair: [20, 20, 20], afro: true }, { skin: [234, 192, 160], hair: [190, 150, 80], bun: true }, { skin: [200, 150, 110], hair: [120, 75, 35], beard: [120, 75, 35] }];
  const PREV_JOBS = ['forrageiro', 'guarda', 'medico', 'cientista'];
  // canvases de prévia de uma skin: data-osk="id|i" (i: qual boneco)
  function previewHtml(d, size = 52) {
    if (d.cat === 'sobrev') return `<div class="osk-prev four">${PREV_JOBS.map((j, i) => `<canvas width="${size}" height="${size}" data-osk="${d.id}|${i}"></canvas>`).join('')}</div>`;
    if (d.cat === 'herois') return `<div class="osk-prev two"><canvas width="${size}" height="${size}" data-osk="${d.id}|orig"></canvas><canvas width="${size}" height="${size}" data-osk="${d.id}|alt"></canvas></div>`;
    return `<div class="osk-prev one"><canvas width="${size}" height="${size}" data-osk="${d.id}|0"></canvas></div>`;
  }
  function paintPreviews(root) {
    if (!root || typeof Scene === 'undefined') return;
    root.querySelectorAll('canvas[data-osk]').forEach(c => {
      const [id, i] = c.dataset.osk.split('|'), d = byId[id];
      if (!d) return;
      let look;
      if (d.cat === 'lider') look = dress(Profile.look(null, 'padrao'), d);
      else if (d.cat === 'sobrev') { const p = { ...PEOPLE[+i], id: +i, shirt: [90, 90, 90], pants: [60, 60, 70] }; applySurvivor(p, PREV_JOBS[+i], id); look = p; }
      else { const base = CHAMPS[d.k].look; look = i === 'orig' ? base : heroLook(d.k, base, id); }
      Scene.portrait(c, look);
    });
  }

  return { CATS, byId, PRICE, RAR, owned, equipped, buy, equip, unequip, caps, leaderLook, applySurvivor, heroLook, previewHtml, paintPreviews };
})();
