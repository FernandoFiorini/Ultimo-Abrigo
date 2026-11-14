'use strict';

// Skins das armas do líder: só visual (cores da arma, detalhes, efeito do tiro e som). Dano, alcance e recarga não mudam.
// Compradas com 🏷️ Tampinhas na Loja › Skins e equipadas uma por arma. Ficam no save (S.meta.wsk), inclusive no Novo Mundo.
// Os protótipos aprovados vieram da página "Arsenal de Skins".
const WSkins = (() => {
  const rand = (a, b) => a + Math.random() * (b - a);
  const PRICE = { comum: 30, rara: 60, epica: 100, lendaria: 180 };
  const RAR = { comum: 'Comum', rara: 'Rara', epica: 'Épica', lendaria: 'Lendária' };
  const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const shadeHex = (h, f) => '#' + hex(h).map(v => Math.max(0, Math.min(255, Math.round(v * f))).toString(16).padStart(2, '0')).join('');

  // cores padrão de cada arma (as mesmas de antes das skins)
  const DARK = '#222226', STEEL = '#60646c', WOOD = '#704824', OLIVE = '#4e5830', OLIVE_D = '#373e22';
  const BASEPAL = { body: WOOD, bodyHi: '#8a5c36', bodyLo: '#4f3119', metal: DARK, metalHi: STEEL, metalLo: '#18181b', accent: '#aa281e', glow: '#96c8e6' };
  const DEFAULT = {
    pistola: { ...BASEPAL, body: DARK, bodyHi: '#3d3d44', bodyLo: '#1c1c20' },
    espingarda: BASEPAL, rifle: BASEPAL,
    smg: { ...BASEPAL, body: DARK, bodyHi: '#3d3d44', bodyLo: DARK },
    granadas: { ...BASEPAL, body: OLIVE, bodyHi: '#6a7642', bodyLo: OLIVE_D },
    chamas: { ...BASEPAL, body: DARK, bodyHi: '#3d3d44', bodyLo: '#1c1c20', metalLo: DARK },
    bazuca: { ...BASEPAL, body: OLIVE, bodyHi: '#6a7642', bodyLo: OLIVE_D },
  };

  // ======================= as skins =======================
  // pal: cores · pat: textura da madeira · deco(P, t): detalhes na vitrine da loja · mini(R, t): 1 ou 2 pixels na arma do jogo
  // shot: efeito do tiro · snd: camadas de som (['t', onda, f, f2, dur, vol, atraso] ou ['n', filtro, f, f2, dur, vol, atraso, q])
  // boomSnd: camadas tocadas na explosão (granadas) · baseSnd 'none': sem o som padrão da arma
  // estalos espalhados no tempo (fogos e contador Geiger)
  function crackle(t0, n) { const out = []; for (let i = 0; i < n; i++) out.push(['n', 'highpass', 4000 + Math.random() * 3000, 0, 0.02, 0.05 + Math.random() * 0.05, t0 + Math.random() * 0.9]); return out; }
  function geiger(t0, dur, n) { const out = []; for (let i = 0; i < n; i++) out.push(['n', 'highpass', 6000, 0, 0.008, 0.08, t0 + Math.random() * dur]); return out; }
  const DEFS = [
    { id: 'horus', w: 'pistola', nome: 'Olho de Hórus', tema: 'Mitologia egípcia', rar: 'lendaria',
      pal: { body: '#1f3f8a', bodyHi: '#3a64c8', bodyLo: '#132a5c', metal: '#c9962e', metalHi: '#f2cf62', metalLo: '#8a6018', accent: '#2fb5a8', glow: '#ffe9a0' },
      deco(P, t) { P('#132a5c', 30, 8, 6, 1); P('#fff4d8', 31, 9, 3, 1); P('#132a5c', 32, 9, 1, 1); P('#132a5c', 33, 10, 1, 2); P('#132a5c', 35, 9, 2, 1);
        for (const y of [14, 17, 20]) P('#2fb5a8', 23 - Math.floor((y - 13) / 3), y, 6, 1);
        if (Math.sin(t * 2) > 0.6) P('#fff8c0', 32, 9, 1, 1); },
      mini(R) { R('#2fb5a8', 6, -12, 1, 1); },
      shot: { kind: 'tracer', cols: ['#fff8c0', '#f2cf62', '#c9962e'], len: 7, flash: ['#fff8c0', '#f2cf62'], extra: { n: 10, sp: [8, 30], life: [0.4, 0.9], cols: ['#f2cf62', '#d8b060', '#a07a40'], spread: 0.6, g: 60 } },
      snd: [['t', 'sine', 2093, 0, 0.5, 0.08, 0.02], ['t', 'sine', 2637, 0, 0.6, 0.06, 0.08], ['n', 'highpass', 6000, 0, 0.4, 0.05, 0.05]],
      fx: ['Lápis-lazúli e ouro, o Olho de Hórus no ferrolho e faixas turquesa na empunhadura', 'Traçante dourado que solta areia brilhante', 'Estalo seco com um brilho metálico de sinos'] },
    { id: 'sertao', w: 'pistola', nome: 'Estrela do Sertão', tema: 'Cangaço', rar: 'rara',
      pal: { body: '#7a4a22', bodyHi: '#a06a34', bodyLo: '#4e2c12', metal: '#5a4630', metalHi: '#a8865a', metalLo: '#3a2c1c', accent: '#d8a830', glow: '#ffe9a0' },
      deco(P) { for (const [x, y] of [[23, 15], [22, 19]]) { P('#d8a830', x + 1, y - 1, 1, 1); P('#d8a830', x, y, 3, 1); P('#d8a830', x + 1, y + 1, 1, 1); }
        for (let x = 21; x < 44; x += 4) P('#d8a830', x, 7, 1, 1); P('#c23a2a', 38, 11, 3, 1); },
      mini(R) { R('#d8a830', 5, -12, 1, 1); },
      shot: { kind: 'tracer', cols: ['#fff1c0', '#ffb04a', '#c86a20'], flash: ['#fff1c0', '#ffb04a'], extra: { n: 8, sp: [4, 14], life: [0.6, 1.2], cols: ['#bdb6a8', '#8a847a', '#5a5650'], spread: 0.8, g: -8, s: 2, drag: 0.97 } },
      snd: [['t', 'sine', 2600, 900, 0.35, 0.06, 0.08], ['n', 'lowpass', 900, 300, 0.3, 0.12, 0.02]],
      fx: ['Couro curtido, metal envelhecido e estrelas de cangaceiro na empunhadura', 'Traçante alaranjado e uma baforada de fumaça de pólvora', 'Tiro com assobio de ricochete'] },
    { id: 'raio', w: 'pistola', nome: 'Raio Retrô', tema: 'Ficção científica dos anos 50', rar: 'epica',
      pal: { body: '#b8c0c8', bodyHi: '#e8eef4', bodyLo: '#7a828a', metal: '#c8d0d8', metalHi: '#ffffff', metalLo: '#8a929a', accent: '#d83a3a', glow: '#7aff7a' },
      deco(P, t) { P('#d83a3a', 24, 4, 3, 3); P('#d83a3a', 25, 3, 1, 1); P('#d83a3a', 36, 4, 3, 3);
        P('#d83a3a', 21, 15, 1, 6); const gl = 0.6 + 0.4 * Math.sin(t * 5); P(`rgba(122,255,122,${gl})`, 46, 7, 2, 4); P('#2a8a2a', 44, 7, 2, 4); },
      mini(R) { R('#d83a3a', 5, -13, 1, 1); R('#7aff7a', 8, -11, 1, 1); },
      shot: { kind: 'rings', cols: ['#e8ffe8', '#7aff7a', '#2a9a2a'], flash: ['#e8ffe8', '#7aff7a'], tracer: '122,255,122' },
      snd: [['t', 'square', 1800, 300, 0.25, 0.06], ['t', 'sine', 1200, 200, 0.3, 0.08, 0.02]], baseSnd: 'none',
      fx: ['Cromado com aletas vermelhas e um bulbo de energia verde na ponta', 'Anéis de energia verdes em vez de bala', 'O "piu" clássico das pistolas de raio'] },
    { id: 'vampiro', w: 'pistola', nome: 'Beijo do Vampiro', tema: 'Gótico', rar: 'epica',
      pal: { body: '#6a0e18', bodyHi: '#9a1a28', bodyLo: '#3a0610', metal: '#1a1418', metalHi: '#4a3a44', metalLo: '#0c080a', accent: '#c21a2a', glow: '#ff3a4a' },
      deco(P, t) { P('#4a3a44', 17, 5, 3, 1); P('#4a3a44', 16, 4, 1, 1); P('#4a3a44', 15, 5, 1, 2); P('#c21a2a', 33, 12, 2, 1);
        P(`rgba(255,58,74,${0.5 + 0.5 * Math.sin(t * 3)})`, 33, 12, 1, 1); },
      mini(R) { R('#c21a2a', 6, -10, 1, 1); },
      shot: { kind: 'tracer', cols: ['#ffd0d0', '#ff3a4a', '#8a0a14'], flash: ['#ffd0d0', '#ff3a4a'], extra: { n: 3, sp: [14, 28], life: [0.8, 1.2], cols: ['#2a1a22', '#1a1014'], spread: 0.7, shape: 'bat', wob: 20, g: -20 } },
      snd: [['t', 'sine', 110, 0, 0.8, 0.12, 0.02], ['t', 'sine', 3200, 4200, 0.06, 0.04, 0.15], ['t', 'sine', 3400, 4600, 0.06, 0.04, 0.3]],
      fx: ['Metal negro, empunhadura carmim, asas de morcego atrás do cão e um rubi que pulsa', 'Traçante vermelho-sangue que solta morcegos', 'Gongo grave e guinchos de morcego'] },

    { id: 'abobora', w: 'espingarda', nome: 'Abóbora Maldita', tema: 'Halloween', rar: 'epica',
      pal: { body: '#d86a1a', bodyHi: '#f08a2a', bodyLo: '#8a3a0a', metal: '#2a1a34', metalHi: '#5a3a74', metalLo: '#160c1c', accent: '#7ad84a', glow: '#ffe066' },
      deco(P, t) { const gl = `rgba(255,224,102,${0.7 + 0.3 * Math.sin(t * 7)})`; P(gl, 4, 11, 2, 1); P(gl, 8, 11, 2, 1); P(gl, 4, 13, 6, 1); P('#2a1a0a', 5, 13, 1, 1); P('#2a1a0a', 8, 13, 1, 1);
        P('#7ad84a', 13, 8, 1, 2); P('#7ad84a', 12, 7, 1, 1); },
      mini(R, t) { R(Math.sin(t * 7) > 0 ? '#ffe066' : '#d8a020', 0, -10, 1, 1); },
      shot: { kind: 'pellets', cols: ['#f0e0ff', '#b46cff', '#6a2a9a'], tracer: '180,108,255', flash: ['#f0e0ff', '#b46cff'], extra: { n: 10, sp: [16, 40], life: [0.3, 0.7], cols: ['#ffe066', '#f08a2a', '#ffffff'], spread: 0.5 } },
      snd: [['t', 'triangle', 600, 220, 0.6, 0.08, 0.05], ['t', 'square', 900, 0, 0.04, 0.03, 0.2], ['t', 'square', 1000, 0, 0.04, 0.03, 0.27], ['t', 'square', 1100, 0, 0.04, 0.03, 0.34]],
      fx: ['Coronha de abóbora com rosto entalhado que brilha por dentro, cabo de cipó e metal roxo', 'Chumbo de fogo roxo e faíscas cor de doce', 'Estrondo, um "uuu" de fantasma e uma risadinha'] },
    { id: 'sucata', w: 'espingarda', nome: 'Sucata Punk', tema: 'Pós-apocalíptico', rar: 'comum',
      pal: { body: '#6a4a3a', bodyHi: '#8a6a50', bodyLo: '#3a281e', metal: '#7a4a2a', metalHi: '#b07040', metalLo: '#4a2a14', accent: '#9a9a9a', glow: '#ffb04a' },
      deco(P) { P('#9a9a9a', 3, 10, 3, 4); P('#bdbdbd', 3, 10, 3, 1); P('#9a9a9a', 40, 12, 3, 3);
        for (const x of [30, 38, 46, 54]) P('#cfcfcf', x, 7, 1, 1); for (const x of [18, 24]) P('#d8d8d8', x, 9, 1, 1); P('#3a3a3a', 56, 12, 6, 1); },
      mini(R) { R('#9a9a9a', 0, -10, 1, 1); },
      shot: { kind: 'pellets', cols: ['#fff1c0', '#ffb04a', '#a05a20'], tracer: '255,176,74', flash: ['#fff1c0', '#ffb04a'], extra: { n: 14, sp: [20, 70], life: [0.15, 0.4], cols: ['#ffffff', '#ffd04a', '#ff8a2a'], spread: 0.7, g: 80 } },
      snd: [['t', 'square', 320, 260, 0.08, 0.05, 0.05], ['n', 'bandpass', 2600, 0, 0.12, 0.12, 0.06, 6]],
      fx: ['Ferrugem, fita isolante, pregos no cano e parafusos à mostra', 'Chumbo com chuva de faíscas', 'Estrondo com um "clanc" de lata batendo'] },

    { id: 'dragao', w: 'rifle', nome: 'Fôlego do Dragão', tema: 'Dragões', rar: 'lendaria', pat: 'scales',
      pal: { body: '#7a1a16', bodyHi: '#b83a24', bodyLo: '#4a0e0c', metal: '#c9962e', metalHi: '#f2cf62', metalLo: '#8a6018', accent: '#ff5a24', glow: '#ff4a1c' },
      deco(P, t) {
        for (const [x, y] of [[24, 2], [25, 1], [26, 2], [27, 0], [28, 1], [29, 2], [30, 1], [31, 2]]) P('#8a6018', x, y); P('#f2cf62', 27, 0); P('#f2cf62', 25, 1);
        P('#f2cf62', 55, 4, 3, 1); P('#f2cf62', 57, 5, 4, 1); P('#c9962e', 60, 7, 9, 3); P('#f2cf62', 60, 7, 8, 1); P('#8a6018', 62, 7, 4, 1); P('#2a0606', 67, 7);
        P(`rgba(255,176,32,${0.6 + 0.4 * Math.sin(t * 4)})`, 63, 8, 2, 1); P('#2a0606', 63, 10, 7, 2); P(`rgba(255,106,26,${0.5 + 0.3 * Math.sin(t * 6)})`, 64, 11, 5, 1);
        for (const x of [64, 66, 68]) P('#f4ead8', x, 10); for (const x of [65, 67]) P('#f4ead8', x, 11); P('#c9962e', 60, 12, 9, 1); P('#8a6018', 60, 13, 7, 1); P('#c9962e', 58, 10, 5, 3);
      },
      mouth: { x: 70, y: 11 },
      mini(R, t) { R('#f2cf62', 13, -12, 1, 2); if (Math.sin(t * 4) > 0) R('#ffb020', 13, -12, 1, 1); }, tipDx: 1,
      shot: { kind: 'stream', n: 46, sp: [18, 48], life: [0.35, 0.8], cols: ['#fff1a8', '#ffc23a', '#ff7a1c', '#e23a12', '#8a1a0c'], spread: 0.25, dy: 0.8, drag: 0.96, g: -6, tracer: '255,140,40' },
      snd: [['t', 'sawtooth', 130, 55, 0.6, 0.08, 0.02], ['n', 'lowpass', 1200, 300, 0.8, 0.25, 0.03]],
      fx: ['Coronha de escamas vermelhas, metal dourado, asa sobre a luneta e cabeça de dragão na boca do cano', 'O tiro sai como uma baforada de fogo', 'Estampido com rugido e o fogo rolando'] },
    { id: 'runa', w: 'rifle', nome: 'Runa de Gelo', tema: 'Mitologia nórdica', rar: 'lendaria',
      pal: { body: '#c8c0a8', bodyHi: '#e8e0c8', bodyLo: '#8a8270', metal: '#5a7a98', metalHi: '#bfe0f4', metalLo: '#2b3a52', accent: '#5ae0ff', glow: '#9ff0ff' },
      deco(P, t) { const gl = `rgba(90,224,255,${0.55 + 0.45 * Math.sin(t * 2.5)})`;
        for (const [x, y] of [[4, 10], [4, 11], [5, 12], [8, 10], [9, 11], [8, 12], [12, 10], [12, 11], [13, 11], [12, 12], [35, 11], [36, 10], [37, 11], [40, 10], [40, 11], [41, 12]]) P(gl, x, y);
        P('#e8faff', 62, 7, 1, 1); P('#bfe0f4', 63, 6, 1, 1); P('#e8faff', 62, 12, 1, 1); P('#bfe0f4', 63, 13, 1, 1); P('#e8faff', 64, 8, 1, 4); },
      mini(R, t) { R(Math.sin(t * 2.5) > 0 ? '#5ae0ff' : '#2a8aaa', 1, -10, 1, 1); },
      shot: { kind: 'tracer', cols: ['#ffffff', '#9ff0ff', '#3a9ac8'], tracer: '159,240,255', len: 9, flash: ['#ffffff', '#9ff0ff'], extra: { n: 14, sp: [10, 36], life: [0.4, 0.9], cols: ['#ffffff', '#cfefff', '#7ac8e8'], spread: 0.5, g: 30, drag: 0.97 } },
      snd: [['t', 'sine', 2637, 0, 0.7, 0.06, 0.03], ['t', 'sine', 3136, 0, 0.8, 0.05, 0.09], ['n', 'highpass', 7000, 0, 0.25, 0.08, 0.05]],
      fx: ['Madeira clara de freixo, aço azulado, runas que brilham e cristais de gelo na boca do cano', 'Traçante de gelo que estilhaça em cristais', 'Estampido com um tilintar de cristal'] },
    { id: 'espectral', w: 'rifle', nome: 'Caçador Espectral', tema: 'Fantasmas', rar: 'epica', ghost: true,
      pal: { body: '#3a8a8a', bodyHi: '#7ae0d8', bodyLo: '#1a4a4a', metal: '#5ab8b0', metalHi: '#c8fff4', metalLo: '#2a6a66', accent: '#c8fff4', glow: '#e8fffa' },
      deco(P, t) { for (let i = 0; i < 4; i++) { const y = 8 - ((t * 6 + i * 3) % 8); P(`rgba(200,255,244,${0.15 + 0.1 * i})`, 10 + i * 12, y, 1, 1); } },
      mini(R, t) { if (Math.sin(t * 3) > 0) R('#c8fff4', 4, -14, 1, 1); },
      shot: { kind: 'tracer', cols: ['#ffffff', '#c8fff4', '#5ab8b0'], tracer: '200,255,244', len: 10, flash: ['#ffffff', '#c8fff4'], extra: { n: 8, sp: [10, 26], life: [0.7, 1.2], cols: ['#e8fffa', '#9ae8e0', '#3a8a8a'], spread: 0.4, wob: 30, s: 2 } },
      snd: [['n', 'bandpass', 400, 1800, 0.6, 0.12, 0.02, 3], ['n', 'bandpass', 400, 1800, 0.6, 0.05, 0.3, 3]],
      fx: ['A arma inteira fica translúcida e cintilante, com fiapos de alma subindo', 'Traçante fantasma que deixa almas ondulando no ar', 'Estampido seguido de um "uuuush" com eco'] },
    { id: 'sakura', w: 'rifle', nome: 'Sakura', tema: 'Japão feudal', rar: 'rara',
      pal: { body: '#1a1414', bodyHi: '#3a2a2a', bodyLo: '#0c0808', metal: '#2a2224', metalHi: '#c8a040', metalLo: '#140e10', accent: '#c22a2a', glow: '#ffb8d0' },
      deco(P, t) { for (const [x, y] of [[4, 11], [9, 13], [13, 10], [35, 11], [42, 11]]) { P('#ffb8d0', x, y, 2, 1); P('#fff0f6', x, y, 1, 1); }
        P('#c8a040', 30, 9, 1, 4); P('#c8a040', 47, 10, 1, 3); P('#c22a2a', 3, 16, 1, 3 + Math.round(Math.sin(t * 2))); P('#c22a2a', 2, 18, 3, 1); },
      mini(R) { R('#ffb8d0', 1, -10, 1, 1); },
      shot: { kind: 'tracer', cols: ['#ffffff', '#ffe0ec', '#ffb8d0'], tracer: '255,224,236', flash: ['#ffffff', '#ffd0e0'], extra: { n: 12, sp: [10, 30], life: [0.8, 1.4], cols: ['#ffb8d0', '#ff9ac0', '#e87aa8'], spread: 0.6, wob: 24, g: 14, shape: 'petal' } },
      snd: [['t', 'sine', 1319, 0, 0.6, 0.05, 0.08], ['t', 'sine', 1568, 0, 0.6, 0.04, 0.16], ['t', 'sine', 1760, 0, 0.8, 0.04, 0.24]],
      fx: ['Laca preta com detalhes dourados, flores de cerejeira e um cordão vermelho pendurado na coronha', 'Traçante branco e uma chuva de pétalas de cerejeira', 'Estampido com um sininho de vento japonês'] },

    { id: 'neon', w: 'smg', nome: 'Neon 2084', tema: 'Cyberpunk', rar: 'epica',
      pal: { body: '#1a1424', bodyHi: '#2a2238', bodyLo: '#0e0a14', metal: '#16121e', metalHi: '#3a3050', metalLo: '#0a080e', accent: '#ff2ad8', glow: '#2af0ff' },
      deco(P, t) { const a = 0.6 + 0.4 * Math.sin(t * 6), b = 0.6 + 0.4 * Math.sin(t * 6 + 2);
        P(`rgba(255,42,216,${a})`, 14, 10, 22, 1); P(`rgba(42,240,255,${b})`, 36, 10, 14, 1); P(`rgba(42,240,255,${b})`, 31, 14, 1, 7); P(`rgba(255,42,216,${a})`, 2, 11, 1, 3); P('#2af0ff', 18, 5, 1, 1); },
      mini(R, t) { R(Math.sin(t * 6) > 0 ? '#ff2ad8' : '#2af0ff', 3, -10, 3, 1); },
      shot: { kind: 'tracer', cols: ['#ffffff', '#ff2ad8', '#8a0a7a'], alt: ['#ffffff', '#2af0ff', '#0a6a8a'], tracer: '255,42,216', tracerAlt: '42,240,255', len: 5, flash: ['#ffffff', '#ff8af0'] },
      snd: [['t', 'square', 900, 200, 0.06, 0.05]],
      fx: ['Carcaça preta com linhas de neon rosa e ciano que pulsam', 'Traçantes alternando rosa e ciano', 'Cada tiro é um "zap" de sintetizador'] },
    { id: 'enxame', w: 'smg', nome: 'Enxame', tema: 'Colmeia', rar: 'rara', pat: 'stripes',
      pal: { body: '#e8b820', bodyHi: '#ffd84a', bodyLo: '#2a2218', metal: '#2a2218', metalHi: '#e8b820', metalLo: '#14100c', accent: '#ffd84a', glow: '#ffe066' },
      deco(P, t) { for (let x = 15; x < 36; x += 4) P('#e8b820', x, 8, 2, 3); for (let x = 37; x < 50; x += 4) P('#e8b820', x, 8, 1, 1);
        const d = Math.floor(t * 2) % 4; P('#ffb020', 33, 22 + Math.min(d, 2), 1, 1); },
      mini(R) { R('#e8b820', 1, -11, 3, 1); },
      shot: { kind: 'tracer', cols: ['#fff8c0', '#ffd84a', '#a07a10'], tracer: '255,216,74', len: 4, flash: ['#fff8c0', '#ffd84a'], extra: { n: 2, sp: [16, 30], life: [0.9, 1.4], cols: ['#ffd23a'], spread: 0.5, shape: 'bee', jit: 60 } },
      snd: [['t', 'sawtooth', 170, 180, 0.12, 0.03], ['t', 'sawtooth', 176, 170, 0.12, 0.03]],
      fx: ['Listras amarelas e pretas de abelha e mel pingando do pente', 'Cada rajada solta abelhas que zanzam no ar', 'Disparos com zumbido de colmeia'] },

    { id: 'natal', w: 'granadas', nome: 'Natal Explosivo', tema: 'Festas de fim de ano', rar: 'rara',
      pal: { body: '#c22a2a', bodyHi: '#e85050', bodyLo: '#7a1414', metal: '#1a6a3a', metalHi: '#3aa060', metalLo: '#0e4a24', accent: '#e8b830', glow: '#ffe066' },
      deco(P, t) { P('#e8b830', 26, 6, 2, 11); P('#e8b830', 20, 11, 14, 1); P('#e8b830', 25, 4, 1, 2); P('#e8b830', 28, 4, 1, 2);
        for (let x = 36; x < 58; x += 4) P(['#ffe066', '#ff5050', '#5ac8ff'][(x / 4 + Math.floor(t * 3)) % 3], x, 7, 1, 1); },
      mini(R) { R('#e8b830', 4, -12, 1, 3); },
      shot: { kind: 'orb', cols: ['#c22a2a', '#e8b830'], trail: ['#ffffff', '#e8f4ff'], boom: 'neve' },
      snd: [['t', 'sine', 2349, 0, 0.3, 0.05, 0.05], ['t', 'sine', 2637, 0, 0.3, 0.05, 0.12], ['t', 'sine', 3136, 0, 0.4, 0.05, 0.19]],
      boomSnd: [['t', 'sine', 2349, 0, 0.6, 0.04, 0.02], ['t', 'sine', 3136, 0, 0.6, 0.04, 0.06]],
      fx: ['Vermelho e verde, tambor embrulhado como presente com laço dourado e pisca-pisca no tubo', 'A granada é um presente; a explosão solta neve e fitas', 'Guizos ao disparar e na explosão'] },
    { id: 'trovao', w: 'granadas', nome: 'Martelo do Trovão', tema: 'Mitologia nórdica', rar: 'epica',
      pal: { body: '#5a6a7a', bodyHi: '#8a9aaa', bodyLo: '#3a4450', metal: '#5a3a24', metalHi: '#8a5a3a', metalLo: '#3a2414', accent: '#5ab0ff', glow: '#bfe8ff' },
      deco(P, t) { const c = Math.sin(t * 5) > 0.2 ? '#bfe8ff' : '#5ab0ff';
        for (const [x, y] of [[27, 7], [26, 8], [27, 9], [26, 10], [25, 11], [26, 12], [25, 13], [24, 14]]) P(c, x, y); P('#8a5a3a', 42, 15, 3, 1); P('#8a5a3a', 42, 17, 3, 1); },
      mini(R, t) { if (Math.sin(t * 5) > 0.2) R('#bfe8ff', 4, -12, 1, 2); },
      shot: { kind: 'orb', cols: ['#bfe8ff', '#ffffff'], trail: ['#ffffff', '#5ab0ff'], boom: 'raio' },
      snd: [],
      boomSnd: [['n', 'highpass', 3000, 0, 0.12, 0.25, 0], ['n', 'lowpass', 600, 80, 1.4, 0.4, 0.05]],
      fx: ['Aço de martelo, empunhaduras de couro trançado e um raio gravado no tambor que acende', 'A granada é uma esfera elétrica; na explosão cai um raio do céu', 'Disparo e um trovão estalando e rolando'] },

    { id: 'hefesto', w: 'chamas', nome: 'Forja de Hefesto', tema: 'Mitologia grega', rar: 'epica',
      pal: { body: '#4a3a2a', bodyHi: '#6a5440', bodyLo: '#2a2018', metal: '#5a4a3a', metalHi: '#a08060', metalLo: '#2a2018', accent: '#3a3230', glow: '#ff8a2a' },
      deco(P, t) { const a = 0.6 + 0.4 * Math.sin(t * 2.5);
        for (const [x, y] of [[4, 6], [5, 7], [5, 8], [6, 9], [3, 13], [4, 14], [5, 15], [7, 17]]) P(`rgba(255,138,42,${a})`, x, y); for (let x = 18; x < 46; x += 6) P(`rgba(255,180,60,${a})`, x, 11, 2, 1); P('#a08060', 26, 7, 6, 2); P('#5a4a3a', 28, 9, 2, 1); },
      mini(R, t) { if (Math.sin(t * 2.5) > 0) R('#ff8a2a', -5, -10, 1, 1); },
      shot: { kind: 'stream', n: 30, sp: [16, 40], life: [0.5, 1], cols: ['#ffffff', '#ffe066', '#ffa020', '#d84a10', '#5a1a08'], spread: 0.25, g: 70, s: 2, dy: 1, tracer: '255,160,40' },
      snd: [['t', 'sine', 900, 0, 0.5, 0.06, 0.1], ['t', 'sine', 1340, 0, 0.4, 0.05, 0.1], ['n', 'lowpass', 300, 120, 0.9, 0.2]],
      fx: ['Ferro escuro com rachaduras de lava que brilham e uma bigorna em miniatura sobre a lança', 'Em vez de chama, sai metal derretido em gotas pesadas que caem', 'Rugido grave da forja e uma martelada na bigorna'] },

    // ---------- rodada 3 ----------
    { id: 'tridente', w: 'espingarda', nome: 'Tridente de Netuno', tema: 'Mitologia greco-romana', rar: 'lendaria',
      pal: { body: '#1e6a6a', bodyHi: '#2fa0a0', bodyLo: '#104444', metal: '#a87a3a', metalHi: '#e0b060', metalLo: '#6a4a1a', accent: '#ff7a6a', glow: '#bfe4ff' },
      deco(P, t) { P('#e0b060', 64, 6, 2, 1); P('#e0b060', 65, 4, 1, 3); P('#e0b060', 64, 12, 2, 1); P('#e0b060', 65, 12, 1, 3); P('#e0b060', 66, 8, 2, 4);
        for (let x = 1; x < 14; x += 3) P('#bfe4ff', x, 12 + ((x + Math.floor(t * 4)) % 2), 2, 1); P('#ff7a6a', 9, 13, 1, 1); P('#ff7a6a', 44, 13, 1, 1); },
      mini(R) { R('#e0b060', 12, -12, 1, 3); },
      shot: { kind: 'pellets', cols: ['#ffffff', '#bfe4ff', '#4a9ad8'], tracer: '191,228,255', flash: ['#ffffff', '#bfe4ff'], extra: { n: 16, sp: [20, 60], life: [0.3, 0.7], cols: ['#ffffff', '#bfe4ff', '#4a9ad8'], spread: 0.4, g: 120 } },
      snd: [['n', 'highpass', 2500, 0, 0.1, 0.3, 0.03], ['n', 'lowpass', 900, 70, 1.6, 0.35, 0.06], ['n', 'bandpass', 3000, 0, 1.4, 0.06, 0.1, 0.5], ['t', 'sine', 60, 30, 1.0, 0.25, 0.06]],
      fx: ['Bronze e verde-mar, ondas na coronha, coral e as pontas do tridente na boca do cano', 'O leque de chumbo vira um jato de água com gotas caindo', 'Um trovão estalando e rolando sobre o mar, com chuva forte caindo'] },
    // ---------- rodada 2 ----------
    { id: 'fliperama', w: 'smg', nome: 'Fliperama 8-bit', tema: 'Videogame dos anos 80', rar: 'epica',
      pal: { body: '#2a2ad8', bodyHi: '#5a5aff', bodyLo: '#14147a', metal: '#1a1a1a', metalHi: '#ffffff', metalLo: '#000000', accent: '#ff3a3a', glow: '#ffe04a' },
      deco(P, t) { const k = Math.floor(t * 4); ['#ff3a3a', '#ffe04a', '#3aff6a', '#3ad8ff'].forEach((c, i) => P((k + i) % 4 === 0 ? '#ffffff' : c, 17 + i * 4, 10, 2, 1));
        P('#ff3a3a', 18, 2, 3, 3); P('#ffffff', 18, 2, 1, 1); P('#1a1a1a', 19, 5, 1, 2); P('#ffe04a', 5, 11, 3, 1); P('#000000', 6, 11, 1, 1); },
      mini(R, t) { R(Math.sin(t * 8) > 0 ? '#ffe04a' : '#ff3a3a', 3, -10, 2, 1); },
      shot: { kind: 'tracer', cols: ['#ffffff', '#3ad8ff', '#2a2ad8'], tracer: '58,216,255', len: 3, flash: ['#ffffff', '#ffe04a'], extra: { n: 2, sp: [20, 40], life: [0.3, 0.6], cols: ['#ff3a3a', '#ffe04a', '#3aff6a', '#3ad8ff'], spread: 0.5, s: 2 } },
      snd: [['t', 'square', 1046, 0, 0.04, 0.04], ['t', 'square', 1318, 0, 0.04, 0.04, 0.04], ['t', 'square', 1568, 0, 0.05, 0.04, 0.08]], baseSnd: 'none',
      fx: ['Carcaça azul de fliperama, botão vermelho de joystick, luzes de pontuação piscando e a entrada de ficha na coronha', 'Tiros curtos de videogame e pixels coloridos saltando', 'Cada disparo é um "pew-pew" de chiptune'] },
    { id: 'chicago', w: 'smg', nome: 'Chicago 1929', tema: 'Gângsteres', rar: 'rara',
      pal: { body: '#5a3218', bodyHi: '#8a5a30', bodyLo: '#3a1e0c', metal: '#1c1c1c', metalHi: '#c8a040', metalLo: '#0c0c0c', accent: '#c8a040', glow: '#ffe9a0' },
      deco(P) { P('#1c1c1c', 27, 13, 10, 9); P('#0c0c0c', 28, 14, 8, 7); P('#c8a040', 27, 13, 10, 1); P('#c8a040', 27, 21, 10, 1); P('#c8a040', 31, 17, 2, 1);
        for (let x = 37; x < 50; x += 3) P('#c8a040', x, 8, 1, 4); P('#5a3218', 44, 12, 2, 6); P('#8a5a30', 44, 12, 1, 6); },
      mini(R) { R('#1c1c1c', 3, -9, 3, 3); R('#c8a040', 3, -9, 3, 1); },
      shot: { kind: 'tracer', cols: ['#fff1c0', '#ffc860', '#a07020'], tracer: '255,200,96', len: 4, flash: ['#fff1c0', '#ffc860'], extra: { n: 2, dir: -2.2, spread: 0.4, sp: [20, 34], life: [0.5, 0.8], cols: ['#f2cf62', '#c8a040'], g: 140 } },
      snd: [['n', 'bandpass', 1200, 0, 0.03, 0.06, 0, 3], ['t', 'sine', 3200, 0, 0.08, 0.03, 0.08]],
      fx: ['Nogueira e aço escuro com o pente redondo de tambor, aletas douradas no cano e empunhadura vertical', 'Traçante amarelado e cápsulas douradas pulando da arma', 'A metralhadora matraqueando e o tilintar das cápsulas'] },
    { id: 'pandora', w: 'granadas', nome: 'Caixa de Pandora', tema: 'Mitologia grega', rar: 'lendaria',
      pal: { body: '#141414', bodyHi: '#2a2a2a', bodyLo: '#0a0a0a', metal: '#b8862a', metalHi: '#f2cf62', metalLo: '#6a4a14', accent: '#b46cff', glow: '#d9a8ff' },
      deco(P, t) {
        P('#0a0a0a', 19, 5, 16, 13); P('#141414', 20, 6, 14, 11); P('#2a2a2a', 20, 6, 14, 1);
        P('#141414', 24, 2, 6, 4); P('#b8862a', 23, 2, 8, 1); P('#f2cf62', 26, 1, 2, 1);
        for (let x = 20; x < 34; x += 2) { P('#b8862a', x, 9, 1, 1); P('#b8862a', x + 1, 10, 1, 1); P('#b8862a', x, 14, 1, 1); P('#b8862a', x + 1, 13, 1, 1); }
        const a = 0.5 + 0.5 * Math.sin(t * 3);
        for (const [x, y] of [[25, 6], [26, 7], [25, 8], [29, 11], [30, 12], [29, 13], [22, 12], [23, 11]]) P(`rgba(180,108,255,${a})`, x, y);
        for (let x = 34; x < 44; x += 2) P('#7a7a7a', x, 5 + ((x / 2) % 2));
        for (let i = 0; i < 4; i++) { const y = 1 - ((t * 5 + i * 2.5) % 9); P(`rgba(185,140,255,${0.15 + 0.12 * i})`, 26 + Math.round(Math.sin(t * 2 + i) * 2), y); }
      },
      mini(R, t) { R('#141414', 3, -12, 3, 3); R(Math.sin(t * 3) > 0 ? '#b46cff' : '#6a3a9a', 4, -11, 1, 1); R('#b8862a', 3, -12, 3, 1); },
      shot: { kind: 'orb', cols: ['#2a0a3a', '#d9a8ff'], trail: ['#b46cff', '#4a1a6a', '#0a0610'], boom: 'pandora' },
      snd: [['t', 'sawtooth', 90, 140, 0.35, 0.05, 0], ['n', 'bandpass', 3500, 0, 0.02, 0.08, 0.05, 8], ['n', 'bandpass', 3200, 0, 0.02, 0.08, 0.1, 8], ['n', 'bandpass', 3800, 0, 0.02, 0.08, 0.14, 8], ['n', 'bandpass', 3400, 0, 0.02, 0.07, 0.2, 8], ['n', 'bandpass', 1200, 2600, 0.5, 0.06, 0.1, 6]],
      boomSnd: [['t', 'sawtooth', 880, 220, 0.6, 0.04, 0], ['t', 'sawtooth', 932, 233, 0.6, 0.03, 0], ['t', 'sine', 1568, 0, 1.2, 0.05, 0.65], ['t', 'sine', 2349, 0, 1.4, 0.03, 0.7]],
      fx: ['O tambor vira o jarro de Pandora: preto com faixas gregas douradas, rachaduras roxas que pulsam, correntes e fumaça escapando da tampa', 'Granada escura; a explosão solta os males (redemoinho negro e roxo) e, por último, uma faísca dourada sobe devagar: a esperança', 'Tampa rangendo, correntes, sussurros, um grito dissonante na explosão e um sino suave no fim'] },
    { id: 'toxico', w: 'chamas', nome: 'Lixo Tóxico', tema: 'Radiação', rar: 'rara',
      pal: { body: '#2a2a2a', bodyHi: '#3a3a3a', bodyLo: '#1a1a1a', metal: '#3a4a2a', metalHi: '#6a8a3a', metalLo: '#1a2414', accent: '#c8b020', glow: '#9aff3a' },
      deco(P, t) { P('#1a1a1a', 5, 10, 2, 2); P('#1a1a1a', 4, 7, 4, 2); P('#1a1a1a', 2, 12, 3, 2); P('#1a1a1a', 7, 12, 3, 2);
        P('#9aff3a', 4, 4, 4, 1); P('#9aff3a', 5, 5 + (Math.floor(t * 2) % 3), 1, 1);
        for (let x = 16; x < 46; x += 4) { P('#c8b020', x, 10, 2, 1); P('#1a1a1a', x + 2, 10, 2, 1); } },
      mini(R, t) { R(Math.sin(t * 4) > 0 ? '#9aff3a' : '#5ad82a', -5, -13, 2, 1); },
      shot: { kind: 'stream', n: 42, sp: [18, 44], life: [0.4, 0.85], cols: ['#f0ffc0', '#b8ff4a', '#6ad82a', '#2a8a1a', '#1a3a10'], spread: 0.25, drag: 0.96, g: -4, dy: 1, tracer: '154,255,58',
        more: { n: 6, sp: [10, 24], life: [0.6, 1.1], cols: ['#d8ffb0', '#8ae84a'], spread: 0.6, shape: 'ring', r0: 1, g: -10 } },
      snd: [['t', 'sine', 300, 700, 0.08, 0.04, 0.1], ['t', 'sine', 280, 650, 0.08, 0.04, 0.3], ...geiger(0.02, 0.7, 12)],
      fx: ['Tanque amarelo de lixo radioativo com o símbolo de radiação, gosma verde escorrendo e faixas de perigo na lança', 'Fogo verde-fosforescente com bolhas tóxicas subindo', 'O estalar de um contador Geiger e bolhas borbulhando'] },
    { id: 'cerbero', w: 'chamas', nome: 'Cérbero', tema: 'Mitologia grega', rar: 'lendaria',
      pal: { body: '#1a0a0a', bodyHi: '#2a1414', bodyLo: '#0e0606', metal: '#2a1414', metalHi: '#5a2a2a', metalLo: '#0e0606', accent: '#3a0a0a', glow: '#ff3a1a' },
      deco(P, t) { for (const x of [1, 4, 7]) { P('#3a0a0a', x, 2, 3, 3); P('#3a0a0a', x, 1, 1, 1); P('#3a0a0a', x + 2, 1, 1, 1); P(`rgba(255,58,26,${0.6 + 0.4 * Math.sin(t * 4 + x)})`, x + 1, 3, 1, 1); }
        for (let x = 16; x < 46; x += 3) P('#c8c8c8', x, 8, 1, 1); P('#5a2a2a', 15, 9, 32, 1); },
      mini(R, t) { R(Math.sin(t * 4) > 0 ? '#ff3a1a' : '#8a1a0a', -5, -13, 1, 1); R('#3a0a0a', -6, -14, 1, 1); },
      shot: { kind: 'stream', n: 44, sp: [18, 46], life: [0.35, 0.8], cols: ['#ffe0a0', '#ff6a1a', '#c81a0a', '#5a0606', '#1a0a0a'], spread: 0.25, drag: 0.96, g: -8, dy: 1, tracer: '200,26,10',
        more: { n: 8, sp: [8, 18], life: [0.8, 1.4], cols: ['#3a3434', '#1a1616', '#0a0808'], spread: 0.6, s: 2, g: -14, drag: 0.97 } },
      snd: [['t', 'sawtooth', 75, 60, 0.4, 0.06, 0], ['t', 'sawtooth', 85, 65, 0.4, 0.06, 0.15], ['t', 'sawtooth', 70, 55, 0.5, 0.06, 0.3], ['n', 'lowpass', 500, 200, 0.8, 0.15]],
      fx: ['Tanque com as três cabeças do cão do inferno, de olhos vermelhos acesos, e uma coleira de espinhos na lança', 'Fogo do inferno vermelho-escuro com fumaça preta', 'Três rosnados em sequência e o fogo rugindo'] },
    { id: 'plasma', w: 'chamas', nome: 'Plasma Solar', tema: 'Ficção científica', rar: 'epica',
      pal: { body: '#e8e8f0', bodyHi: '#ffffff', bodyLo: '#9a9ab0', metal: '#c8c8d8', metalHi: '#ffffff', metalLo: '#7a7a9a', accent: '#ffb020', glow: '#9ad8ff' },
      deco(P, t) { P('#fff0a0', 4, 9, 4, 4); P('#ffffff', 5, 10, 2, 2); const r = Math.floor(t * 6) % 2;
        for (const [x, y] of r ? [[5, 7], [5, 14], [2, 11], [9, 11]] : [[3, 8], [8, 8], [3, 14], [8, 14]]) P('#ffe066', x, y);
        for (let i = 0; i < 4; i++) P(`rgba(154,216,255,${0.4 + 0.6 * ((Math.floor(t * 8) + i) % 4 === 0)})`, 20 + i * 7, 9, 2, 4); },
      mini(R, t) { R(Math.sin(t * 8) > 0 ? '#9ad8ff' : '#ffffff', 4, -11, 2, 1); },
      shot: { kind: 'stream', n: 36, sp: [40, 70], life: [0.2, 0.45], cols: ['#ffffff', '#e0f4ff', '#9ad8ff', '#5a8aff', '#3a3aa0'], spread: 0.08, dy: 0.5, tracer: '154,216,255',
        more: { n: 8, sp: [20, 50], life: [0.15, 0.35], cols: ['#ffffff', '#9ad8ff'], spread: 0.9 } },
      snd: [['t', 'sawtooth', 110, 0, 0.7, 0.04], ['t', 'square', 220, 0, 0.7, 0.02], ['n', 'highpass', 5000, 0, 0.6, 0.06], ['t', 'sine', 2400, 600, 0.2, 0.04, 0.02]], baseSnd: 'none',
      fx: ['Branco e prata, com um pequeno sol no tanque (os raios giram) e bobinas de energia azul acendendo em sequência na lança', 'Em vez de chama, um feixe reto de plasma azul-branco com faíscas', 'Zumbido elétrico grave e um estalo de descarga'] },
    { id: 'churrasco', w: 'chamas', nome: 'Churrasco do Abrigo', tema: 'Domingo no Brasil', rar: 'comum',
      pal: { body: '#3a3a3a', bodyHi: '#5a5a5a', bodyLo: '#2a2a2a', metal: '#4a4a4a', metalHi: '#9a9a9a', metalLo: '#2a2a2a', accent: '#3a6ad8', glow: '#ffb04a' },
      deco(P, t) { P('#3a6ad8', 2, 3, 8, 2); P('#9a9a9a', 4, 1, 4, 2); P('#ffffff', 3, 10, 1, 3); P('#ffffff', 5, 10, 1, 3); P('#ffffff', 7, 10, 2, 1); P('#ffffff', 7, 12, 2, 1);
        P('#c8c8c8', 16, 7, 30, 1); for (const x of [20, 26, 32]) { P('#8a3a2a', x, 5, 4, 2); P('#b85a3a', x, 5, 4, 1); } P('#c87a5a', 38, 5, 5, 2);
        for (let i = 0; i < 3; i++) { const y = 4 - ((t * 4 + i * 3) % 7); P(`rgba(200,200,200,${0.15 + 0.1 * i})`, 24 + i * 6 + Math.round(Math.sin(t + i)), y, 2, 1); } },
      mini(R) { R('#3a6ad8', -5, -13, 2, 3); R('#8a3a2a', 3, -12, 3, 1); },
      shot: { kind: 'stream', n: 40, sp: [18, 44], life: [0.35, 0.8], cols: ['#fff1a8', '#ffc23a', '#ff8a2a', '#c84a1a', '#5a2a1a'], spread: 0.25, drag: 0.96, g: -6, dy: 1,
        more: { n: 6, sp: [6, 14], life: [1, 1.6], cols: ['#d8d8d8', '#a8a8a8', '#787878'], spread: 0.5, s: 2, g: -16, drag: 0.97 } },
      snd: [['n', 'highpass', 6000, 3000, 0.9, 0.08, 0.05], ['n', 'bandpass', 2500, 0, 0.02, 0.06, 0.2, 6], ['n', 'bandpass', 2800, 0, 0.02, 0.06, 0.37, 6], ['n', 'bandpass', 2300, 0, 0.02, 0.06, 0.55, 6]],
      fx: ['O tanque vira um botijão de gás azul (P13), com espetinhos de linguiça e picanha na lança e fumaça de churrasco', 'Fogo de churrasqueira com fumaça cinza subindo', 'O chiado da carne na brasa e a gordura estalando'] },
    { id: 'anonovo', w: 'bazuca', nome: 'Dragão de Ano Novo', tema: 'Festival chinês', rar: 'lendaria',
      pal: { body: '#c22a2a', bodyHi: '#e85050', bodyLo: '#7a1414', metal: '#c8a040', metalHi: '#f2cf62', metalLo: '#8a6a20', accent: '#f2cf62', glow: '#ffe066' },
      deco(P, t) { for (let x = 6; x < 58; x += 5) P('#f2cf62', x, 8 + (x % 2), 2, 1);
        const w = Math.round(Math.sin(t * 3) * 1.5); P('#f2cf62', 66, 3 + w, 4, 1); P('#f2cf62', 66, 16 - w, 4, 1); P('#2a0606', 63, 8, 1, 1); P('#ffffff', 62, 12, 3, 1); },
      mini(R) { R('#f2cf62', 13, -16, 1, 1); },
      shot: { kind: 'rocket', look: ['#c22a2a', '#f2cf62', '#ffe066'], trail: ['#ffffff', '#ffd84a', '#ff5050'], boom: 'fogos' },
      snd: [['t', 'sine', 500, 2600, 0.6, 0.05, 0], ['n', 'highpass', 4000, 0, 0.6, 0.04, 0]], baseSnd: 'none',
      boomSnd: [['n', 'highpass', 8000, 0, 0.9, 0.03, 0.25], ...crackle(0.2, 22)],
      fx: ['Vermelho e dourado, escamas douradas no tubo e cabeça de dragão de festival com bigodes que balançam', 'Rastro de faíscas de rojão e explosão em fogos de artifício coloridos', 'O assobio do rojão subindo, o estouro e o chiado de estrelinhas estalando no céu'] },

    // ---------- rodada 4 ----------
    { id: 'pederneira', w: 'pistola', nome: 'Pederneira do Corsário', tema: 'Piratas', rar: 'rara',
      pal: { body: '#6a3a1a', bodyHi: '#8a5a2a', bodyLo: '#3a1e0c', metal: '#a8803a', metalHi: '#e0c070', metalLo: '#6a4a1a', accent: '#c8c8c8', glow: '#ffd890' },
      deco(P) { P('#6a3a1a', 12, 8, 8, 3); P('#8a5a2a', 12, 8, 8, 1); P('#e0c070', 17, 4, 2, 3); P('#3a3a3a', 18, 3, 1, 1); P('#e0c070', 44, 7, 3, 4); P('#e0c070', 23, 21, 4, 2); P('#e0c070', 25, 11, 1, 2); },
      mini(R) { R('#e0c070', 7, -11, 1, 1); },
      shot: { kind: 'tracer', cols: ['#fff1c0', '#ffb04a', '#a05a20'], tracer: '255,176,74', flash: ['#ffffff', '#ffd04a'], extra: { n: 14, sp: [4, 18], life: [0.8, 1.5], cols: ['#e8e4dc', '#bdb6a8', '#8a847a'], spread: 0.6, g: -10, s: 2, drag: 0.96 } },
      snd: [['n', 'bandpass', 4000, 0, 0.03, 0.12, 0, 6], ['n', 'lowpass', 1200, 200, 0.6, 0.25, 0.06], ['n', 'highpass', 3000, 800, 0.8, 0.04, 0.2]],
      fx: ['Madeira escura com coronha longa de pistola de pederneira, cão de pedra, latão no cano e na base da empunhadura', 'Faísca da pederneira e uma nuvem grande de fumaça branca de pólvora negra', 'O "tic" da pedra, o estampido abafado e a fumaça chiando'] },
    { id: 'aguaviva', w: 'pistola', nome: 'Água-Viva', tema: 'Fundo do mar bioluminescente', rar: 'epica', ghost: true,
      pal: { body: '#d85ab8', bodyHi: '#ff9ae0', bodyLo: '#8a2a78', metal: '#5ab8e8', metalHi: '#c8f4ff', metalLo: '#2a6a9a', accent: '#ff9ae0', glow: '#c8f4ff' },
      deco(P, t) { for (let i = 0; i < 4; i++) { const sw = Math.round(Math.sin(t * 3 + i) * 1); P('rgba(255,154,224,0.7)', 22 + i * 2 + sw, 22 + (i % 2), 1, 3); }
        for (let x = 21; x < 44; x += 4) P(`rgba(200,244,255,${0.4 + 0.4 * Math.sin(t * 4 + x)})`, x, 8, 2, 1); },
      mini(R, t) { R(Math.sin(t * 4) > 0 ? '#c8f4ff' : '#ff9ae0', 6, -12, 1, 1); },
      shot: { kind: 'rings', cols: ['#ffffff', '#ff9ae0', '#c8f4ff'], tracer: '255,154,224', flash: ['#ffffff', '#c8f4ff'], extra: { n: 6, sp: [10, 24], life: [0.8, 1.3], cols: ['#ffd0f0', '#c8f4ff', '#5ab8e8'], spread: 0.5, wob: 18, g: -6 } },
      snd: [['t', 'sine', 300, 900, 0.12, 0.08], ['t', 'sine', 500, 1300, 0.1, 0.05, 0.06], ['t', 'sine', 2600, 0, 0.6, 0.03, 0.1], ['t', 'sine', 3300, 0, 0.6, 0.02, 0.16]], baseSnd: 'none',
      fx: ['Translúcida em rosa e azul que brilham no escuro, com tentáculos balançando embaixo da empunhadura e pontos de luz pulsando no ferrolho', 'Bolhas de luz em vez de bala, soltando faíscas que flutuam', 'Um "blup" líquido e um brilho de sino aquático, sem estampido'] },
    { id: 'ametista', w: 'pistola', nome: 'Ametista', tema: 'Cristais', rar: 'lendaria',
      pal: { body: '#5a2a8a', bodyHi: '#9a5ad8', bodyLo: '#3a1a5a', metal: '#7a4ab8', metalHi: '#e0c8ff', metalLo: '#4a2a7a', accent: '#ffffff', glow: '#e0c8ff' },
      deco(P, t) { for (const [x, y] of [[22, 7], [27, 8], [33, 7], [38, 9], [24, 15], [22, 19]]) P('#e0c8ff', x, y, 1, 1);
        P('#9a5ad8', 44, 5, 3, 7); P('#e0c8ff', 45, 5, 1, 2); P('#e0c8ff', 46, 6, 1, 1); P('#3a1a5a', 46, 10, 1, 2);
        const k = Math.floor(t * 3) % 6; P('#ffffff', 21 + k * 4, 7, 1, 1); },
      mini(R) { R('#e0c8ff', 8, -12, 1, 2); },
      shot: { kind: 'tracer', cols: ['#ffffff', '#e0c8ff', '#9a5ad8'], tracer: '224,200,255', len: 8, flash: ['#ffffff', '#e0c8ff'], extra: { n: 12, sp: [16, 44], life: [0.3, 0.7], cols: ['#ffffff', '#e0c8ff', '#9a5ad8'], spread: 0.7, g: 50 } },
      snd: [['t', 'sine', 2093, 0, 0.8, 0.05, 0.03], ['t', 'sine', 2794, 0, 0.7, 0.04, 0.06], ['t', 'sine', 3520, 0, 0.6, 0.03, 0.09], ['n', 'highpass', 7000, 0, 0.15, 0.08, 0.02]],
      fx: ['Esculpida em ametista roxa, com facetas que brilham uma de cada vez e uma ponta de cristal bruto na boca do cano', 'Traçante de cristal que estilhaça em lascas brilhantes', 'Estalo com um acorde de taças de cristal'] },
    { id: 'mandacaru', w: 'pistola', nome: 'Mandacaru', tema: 'Sertão e faroeste', rar: 'rara',
      pal: { body: '#3a7a3a', bodyHi: '#5aa05a', bodyLo: '#1e4a1e', metal: '#2a5a2a', metalHi: '#7ac87a', metalLo: '#143014', accent: '#ff6ab8', glow: '#ffe066' },
      deco(P) { for (const [x, y] of [[21, 6], [26, 6], [31, 6], [36, 6], [41, 6], [22, 14], [21, 18], [26, 17]]) P('#e8e0b0', x, y, 1, 1); P('#ff6ab8', 18, 4, 2, 2); P('#ffe066', 18, 4, 1, 1); },
      mini(R) { R('#ff6ab8', 5, -13, 1, 1); },
      shot: { kind: 'tracer', cols: ['#ffffff', '#e8e0b0', '#a8a070'], tracer: '232,224,176', len: 4, flash: ['#fff1c0', '#ffb04a'], extra: { n: 6, sp: [40, 70], life: [0.2, 0.4], cols: ['#e8e0b0', '#c8c090'], spread: 0.25 } },
      snd: [['t', 'triangle', 196, 220, 0.4, 0.08, 0.04], ['t', 'triangle', 294, 0, 0.3, 0.05, 0.06], ['t', 'sine', 1800, 1200, 0.08, 0.04, 0.02]],
      fx: ['Corpo de mandacaru verde, coberto de espinhos, com uma flor rosa no cão', 'Traçante claro que solta uma rajada de espinhos', 'Estalo com o "boing" de um berimbau de boca'] },
    { id: 'berserker', w: 'espingarda', nome: 'Berserker', tema: 'Vikings', rar: 'epica',
      pal: { body: '#5a3a1e', bodyHi: '#7a5a34', bodyLo: '#3a2410', metal: '#6a6e74', metalHi: '#b8bcc4', metalLo: '#3a3e44', accent: '#c8c0b0', glow: '#ffd890' },
      deco(P) { P('#b8bcc4', 50, 12, 10, 2); P('#b8bcc4', 54, 14, 6, 3); P('#ffffff', 59, 14, 1, 3); P('#3a2410', 50, 11, 3, 1);
        P('#8a7a5a', 0, 9, 4, 6); P('#c8c0a0', 1, 10, 1, 1); P('#c8c0a0', 2, 12, 1, 1); for (const x of [6, 10]) P('#3a2410', x, 9, 1, 6); },
      mini(R) { R('#b8bcc4', 8, -9, 2, 1); },
      shot: { kind: 'pellets', cols: ['#fff1c0', '#ffc860', '#a07020'], tracer: '255,200,96', flash: ['#fff1c0', '#ffc860'], extra: { n: 10, sp: [20, 50], life: [0.4, 0.8], cols: ['#a07a4a', '#7a5a34'], spread: 0.6, g: 120 } },
      snd: [['t', 'sawtooth', 110, 98, 0.7, 0.07, 0.02], ['t', 'sawtooth', 165, 147, 0.7, 0.04, 0.02]],
      fx: ['Madeira rústica com pele de lobo na coronha, tiras de couro e um machado viking preso embaixo do cano', 'Chumbo com lascas de madeira voando', 'Estrondo com o sopro grave de uma trompa de guerra'] },
    { id: 'vapor', w: 'espingarda', nome: 'Engrenagem a Vapor', tema: 'Steampunk', rar: 'lendaria',
      pal: { body: '#6a4a2a', bodyHi: '#8a6a40', bodyLo: '#3a2814', metal: '#b8862a', metalHi: '#f2cf62', metalLo: '#6a4a14', accent: '#3a3a3a', glow: '#ffffff' },
      deco(P, t) { const r = Math.floor(t * 4) % 2; P('#b8862a', 18, 3, 5, 5); P('#3a2814', 19, 4, 3, 3); P('#f2cf62', 20, 5, 1, 1); for (const [x, y] of r ? [[20, 2], [23, 5], [20, 8], [17, 5]] : [[18, 2], [22, 2], [22, 7], [18, 7]]) P('#b8862a', x, y, 1, 1);
        P('#e8e4dc', 32, 4, 4, 4); P('#3a3a3a', 33, 5, 1, 1); P('#c22a2a', 34, 6, 1, 1); P('#b8862a', 31, 4, 1, 4);
        for (let i = 0; i < 3; i++) { const y = 2 - ((t * 6 + i * 2) % 6); P(`rgba(230,230,230,${0.2 + 0.15 * i})`, 26 + i, y, 1, 1); } },
      mini(R) { R('#f2cf62', 3, -13, 2, 2); },
      shot: { kind: 'pellets', cols: ['#fff1c0', '#ffc860', '#a07020'], tracer: '255,200,96', flash: ['#fff1c0', '#ffc860'], extra: { n: 12, sp: [8, 22], life: [0.8, 1.4], cols: ['#ffffff', '#e8e8e8', '#b8b8b8'], spread: 0.8, g: -16, s: 2, drag: 0.96 } },
      snd: [['t', 'sine', 1568, 1480, 0.6, 0.05, 0.1], ['t', 'sine', 2093, 1976, 0.6, 0.03, 0.1], ['n', 'highpass', 5000, 0, 0.7, 0.06, 0.08]],
      fx: ['Latão e madeira com uma engrenagem girando, um manômetro com ponteiro e vapor saindo pelas válvulas', 'Chumbo com baforadas de vapor branco', 'Estrondo e o apito de uma caldeira soltando vapor'] },
    { id: 'muertos', w: 'espingarda', nome: 'Dia de los Muertos', tema: 'Festa mexicana', rar: 'lendaria',
      pal: { body: '#1a1a1e', bodyHi: '#2a2a30', bodyLo: '#0e0e10', metal: '#e8e4dc', metalHi: '#ffffff', metalLo: '#8a867e', accent: '#ff8a1a', glow: '#ff8a1a' },
      deco(P) { P('#f4f0e8', 3, 10, 7, 4); P('#1a1a1e', 4, 11, 2, 1); P('#1a1a1e', 7, 11, 2, 1); P('#1a1a1e', 6, 12, 1, 1); P('#ff4a7a', 4, 10, 1, 1); P('#3ab8ff', 8, 10, 1, 1); P('#1a1a1e', 4, 13, 5, 1); P('#f4f0e8', 5, 13, 1, 1); P('#f4f0e8', 7, 13, 1, 1);
        for (const x of [32, 42, 52]) { P('#ff8a1a', x, 6, 3, 2); P('#ffc23a', x + 1, 6, 1, 1); } P('#7ad84a', 37, 7, 2, 1); P('#7ad84a', 47, 7, 2, 1); },
      mini(R) { R('#ff8a1a', 7, -12, 1, 1); R('#f4f0e8', -1, -10, 1, 1); },
      shot: { kind: 'pellets', cols: ['#fff1c0', '#ffc23a', '#ff8a1a'], tracer: '255,194,58', flash: ['#fff1c0', '#ffc23a'], extra: { n: 12, sp: [10, 30], life: [0.9, 1.5], cols: ['#ff8a1a', '#ffc23a', '#ff6a1a'], spread: 0.7, wob: 20, g: 18, shape: 'petal' } },
      snd: [['t', 'sawtooth', 523, 0, 0.12, 0.05, 0.1], ['t', 'sawtooth', 659, 0, 0.12, 0.05, 0.22], ['t', 'sawtooth', 784, 0, 0.3, 0.05, 0.34], ['t', 'sawtooth', 1046, 0, 0.12, 0.025, 0.1]],
      fx: ['Preta com uma caveira de açúcar colorida na coronha e flores de cempasúchil (laranja) no cano', 'Chumbo dourado e pétalas laranja flutuando', 'Estrondo e um toque de trompete de mariachi'] },
    { id: 'vulcao', w: 'bazuca', nome: 'Vulcão', tema: 'Fúria da terra', rar: 'lendaria',
      pal: { body: '#3a2a24', bodyHi: '#5a4438', bodyLo: '#1e1410', metal: '#2a2018', metalHi: '#5a4a3a', metalLo: '#140c08', accent: '#ff6a1a', glow: '#ffb04a' },
      deco(P, t) { const a = 0.55 + 0.45 * Math.sin(t * 2.2);
        for (const [x, y] of [[8, 8], [9, 9], [10, 10], [11, 9], [20, 11], [21, 10], [22, 9], [23, 10], [36, 8], [37, 9], [38, 10], [39, 11], [48, 10], [49, 9], [50, 8], [51, 9]]) P(`rgba(255,${120 + Math.round(60 * a)},30,${a})`, x, y);
        for (let i = 0; i < 4; i++) { const y = 4 - ((t * 5 + i * 2.5) % 9); P(`rgba(90,80,80,${0.2 + 0.12 * i})`, 63 + Math.round(Math.sin(t * 2 + i)), y, 2, 1); } },
      mini(R, t) { R(Math.sin(t * 2.2) > 0 ? '#ff6a1a' : '#a03a10', 6, -13, 3, 1); },
      shot: { kind: 'rocket', look: ['#3a2a24', '#ff6a1a', '#ffb04a'], trail: ['#ffe066', '#ff6a1a', '#5a2a1a', '#2a2a2a'], boom: 'erupcao' },
      snd: [['t', 'sine', 50, 35, 0.5, 0.4, 0], ['n', 'lowpass', 300, 900, 0.25, 0.3, 0], ['t', 'triangle', 120, 60, 0.2, 0.15, 0.02], ['n', 'bandpass', 400, 800, 0.35, 0.12, 0.05, 2]], baseSnd: 'none',
      boomSnd: [['t', 'sine', 60, 25, 1.4, 0.6, 0], ['n', 'lowpass', 1500, 60, 1.6, 0.5, 0], ['n', 'highpass', 3000, 0, 1, 0.04, 0.08],
        ['n', 'bandpass', 1800, 0, 0.03, 0.08, 0.2, 4], ['n', 'bandpass', 2400, 0, 0.03, 0.07, 0.33, 4], ['n', 'bandpass', 1500, 0, 0.03, 0.08, 0.46, 4], ['n', 'bandpass', 2100, 0, 0.03, 0.06, 0.6, 4], ['n', 'bandpass', 1700, 0, 0.03, 0.06, 0.76, 4]],
      fx: ['Tubo de basalto com rachaduras de lava pulsando e fumaça saindo da boca', 'O foguete é uma pedra de lava em brasa; a explosão é uma erupção que joga lava e pedras para cima', 'Tranco grave e um "blorp" de magma no disparo; no impacto, um estrondo de terremoto, pedras caindo e a lava chiando'] },
    { id: 'missil', w: 'bazuca', nome: 'Míssil Teleguiado', tema: 'Militar moderno', rar: 'epica',
      pal: { body: '#4a4e54', bodyHi: '#6a7078', bodyLo: '#2a2e34', metal: '#1e2024', metalHi: '#4a4e54', metalLo: '#101214', accent: '#ffcc00', glow: '#ff3a2a' },
      deco(P, t) { for (let x = 52; x < 60; x += 2) { P('#ffcc00', x, 6, 1, 8); P('#101214', x + 1, 6, 1, 8); }
        const on = Math.floor(t * 3) % 2; P(on ? '#ff3a2a' : '#5a1410', 29, 3, 1, 2); P('#ff3a2a', 25, 1, 1, 1); P('#ff3a2a', 27, 1, 1, 1);
        P('#e8e8e8', 8, 8, 3, 1); P('#e8e8e8', 8, 10, 3, 1); },
      mini(R, t) { R(Math.floor(t * 3) % 2 ? '#ff3a2a' : '#5a1410', 7, -16, 1, 1); R('#ffcc00', 11, -14, 1, 3); },
      shot: { kind: 'rocket', look: ['#e8e8e8', '#c22a2a', '#ffcc00'], trail: ['#ffffff', '#e8e8e8', '#bdbdbd', '#8a8a8a'], boom: 'fogo' },
      snd: [['t', 'square', 1760, 0, 0.04, 0.035, 0], ['t', 'square', 1760, 0, 0.04, 0.035, 0.06], ['t', 'square', 2349, 0, 0.09, 0.045, 0.12],
        ['n', 'highpass', 2000, 0, 0.12, 0.2, 0.2], ['n', 'bandpass', 600, 3200, 0.25, 0.25, 0.2, 1.2], ['t', 'sawtooth', 180, 90, 0.25, 0.04, 0.2]], baseSnd: 'none',
      boomSnd: [['n', 'highpass', 2500, 0, 0.06, 0.5, 0], ['t', 'sine', 80, 30, 0.8, 0.55, 0], ['n', 'lowpass', 2500, 150, 0.9, 0.45, 0.01], ['n', 'lowpass', 800, 100, 1.2, 0.12, 0.48]],
      fx: ['Grafite fosco com faixas de perigo pretas e amarelas na boca, mira digital com a luz vermelha piscando e marcas brancas', 'Míssil branco de ponta vermelha com um rastro longo de fumaça branca e explosão de fogo', 'Os bipes de travar o alvo ("bip-bip-biiip"), a ignição chiando, o "vuuush" e um estrondo seco com eco'] },
    { id: 'alien', w: 'bazuca', nome: 'Disparador Alienígena', tema: 'Tecnologia de outro mundo', rar: 'lendaria',
      pal: { body: '#2a4a3a', bodyHi: '#4ad8a0', bodyLo: '#143024', metal: '#1a2a24', metalHi: '#8affd0', metalLo: '#0a1410', accent: '#c8ff4a', glow: '#8affd0' },
      deco(P, t) { for (let i = 0; i < 4; i++) { const on = (Math.floor(t * 6) + i) % 4 === 0; P(on ? '#e0fff4' : '#4ad8a0', 12 + i * 11, 6, 2, 8); }
        P('#8affd0', 62, 5, 4, 10); P(`rgba(224,255,244,${0.5 + 0.5 * Math.sin(t * 5)})`, 63, 8, 2, 4);
        for (const [x, y] of [[16, 9], [17, 10], [28, 9], [29, 11], [40, 10], [41, 9]]) P('#c8ff4a', x, y); },
      mini(R, t) { R(Math.sin(t * 5) > 0 ? '#e0fff4' : '#4ad8a0', 13, -14, 2, 3); },
      shot: { kind: 'rocket', look: ['#8affd0', '#ffffff', '#c8ff4a'], trail: ['#e0fff4', '#8affd0', '#2a8a6a'], boom: 'plasma' },
      snd: [['t', 'sine', 300, 1200, 0.15, 0.08, 0], ['t', 'sine', 305, 1220, 0.15, 0.06, 0], ['t', 'square', 1500, 200, 0.25, 0.06, 0.12],
        ['t', 'sine', 600, 900, 0.07, 0.05, 0.18], ['t', 'sine', 900, 600, 0.07, 0.05, 0.25], ['t', 'sine', 600, 900, 0.07, 0.05, 0.32]], baseSnd: 'none',
      boomSnd: [['t', 'sawtooth', 220, 55, 0.6, 0.08, 0], ['t', 'sine', 880, 110, 0.8, 0.08, 0], ['n', 'bandpass', 2000, 300, 0.6, 0.15, 0, 1], ['t', 'sine', 2637, 0, 0.8, 0.03, 0.18], ['t', 'sine', 3520, 0, 0.7, 0.02, 0.24]],
      fx: ['Liga verde-escura com anéis de energia acendendo em sequência, símbolos de outro mundo e um bulbo brilhante na boca', 'Dispara uma esfera de plasma verde que explode num anel de energia com faíscas', 'Um zumbido que carrega, um "piu" de raio, o "uó-uó" do disco voando e uma explosão eletrônica que se desfaz em brilho'] },
    { id: 'avalanche', w: 'bazuca', nome: 'Avalanche', tema: 'Gelo eterno', rar: 'epica',
      pal: { body: '#c8e4f4', bodyHi: '#ffffff', bodyLo: '#7aa8c8', metal: '#5a7a98', metalHi: '#e8f8ff', metalLo: '#2b3a52', accent: '#9ff0ff', glow: '#9ff0ff' },
      deco(P, t) { for (const [x, h] of [[9, 3], [15, 2], [27, 4], [33, 2], [41, 3], [50, 2], [56, 3]]) { P('#e8f8ff', x, 14, 1, h); P('#9ff0ff', x, 14 + h - 1, 1, 1); }
        const k = Math.floor(t * 4) % 6; P('#ffffff', 10 + k * 9, 7, 1, 1); P('#ffffff', 5, 5, 1, 1); P('#e8f8ff', 64, 4, 2, 1); },
      mini(R) { R('#e8f8ff', 6, -11, 1, 2); R('#e8f8ff', 10, -11, 1, 1); },
      shot: { kind: 'rocket', look: ['#e8faff', '#9ff0ff', '#ffffff'], trail: ['#ffffff', '#dff6ff', '#9ad8f0'], boom: 'gelo' },
      snd: [['n', 'highpass', 5000, 0, 0.04, 0.3, 0], ['t', 'sine', 3200, 2000, 0.08, 0.05, 0], ['n', 'bandpass', 800, 2400, 0.4, 0.15, 0.03, 0.8]], baseSnd: 'none',
      boomSnd: [['t', 'sine', 90, 40, 0.5, 0.35, 0], ['n', 'highpass', 4000, 0, 0.6, 0.25, 0],
        ['t', 'sine', 4186, 0, 0.12, 0.04, 0.02], ['t', 'sine', 3520, 0, 0.12, 0.04, 0.08], ['t', 'sine', 4699, 0, 0.12, 0.035, 0.14], ['t', 'sine', 3136, 0, 0.12, 0.035, 0.21], ['t', 'sine', 3951, 0, 0.14, 0.03, 0.29], ['t', 'sine', 2794, 0, 0.18, 0.03, 0.38], ['n', 'bandpass', 600, 200, 1.2, 0.08, 0.08, 0.7]],
      fx: ['Tubo de gelo azul-claro com pingentes pendurados e brilhos de geada correndo por ele', 'O foguete é uma estaca de gelo com rastro de neve; a explosão estilhaça em cristais e névoa', 'O gelo trincando no disparo, o vento uivando e, no impacto, um baque com uma cascata de vidro se quebrando'] },
  ];
  const byId = Object.fromEntries(DEFS.map(d => [d.id, d]));

  // ======================= estado (no save) =======================
  const M = () => (typeof S !== 'undefined' && S && S.meta) ? (S.meta.wsk || (S.meta.wsk = { own: [], eq: {} })) : { own: [], eq: {} };
  const caps = () => (typeof S !== 'undefined' && S && S.meta && S.meta.champ) ? S.meta.champ.caps || 0 : 0;
  const owned = id => M().own.includes(id);
  const equipped = w => { const id = M().eq[w]; return id && byId[id] && owned(id) ? byId[id] : null; };
  function buy(id) {
    const d = byId[id];
    if (!d || owned(id) || caps() < PRICE[d.rar]) return false;
    S.meta.champ.caps -= PRICE[d.rar];
    M().own.push(id); M().eq[d.w] = id;
    addLog(`🏷️ Skin comprada e equipada: ${d.nome} (${LWEAPONS[d.w].nome}).`, 'good');
    return true;
  }
  // equipa uma skin (ou null = arma padrão) numa arma
  function setEquip(w, id) { const m = M(); if (id && (!owned(id) || byId[id].w !== w)) return; m.eq[w] = id || null; }
  function equip(id) { const d = byId[id]; if (!d || !owned(id)) return; const m = M(); m.eq[d.w] = m.eq[d.w] === id ? null : id; }

  // ======================= no jogo =======================
  const palCache = {};
  // cores da arma desenhada no jogo (arrays, para receber o tom da noite)
  function pal(w) {
    const d = equipped(w), key = w + ':' + (d ? d.id : '-');
    if (!palCache[key]) { const src = d ? { ...DEFAULT[w], ...d.pal } : DEFAULT[w]; palCache[key] = Object.fromEntries(Object.entries(src).map(([k, v]) => [k, hex(v)])); }
    return palCache[key];
  }
  const ghost = w => { const d = equipped(w); return !!(d && d.ghost); };
  // detalhes da skin sobre a arma do jogo (R da cena, já com o deslocamento do corpo)
  function mini(w, R, t) {
    const d = equipped(w);
    if (!d || !d.mini) return;
    d.mini((c, x, y, ww, hh) => R(typeof c === 'string' && c[0] === '#' && c.length === 7 ? hex(c) : c, x, y, ww, hh), t);
  }
  const tipDx = w => { const d = equipped(w); return d && d.tipDx || 0; };

  // efeitos do tiro no cenário (lista própria, desenhada pela cena)
  const fxParts = [];
  let alt = 0;
  // d: evento 'shot' do jogador · (ox, oy): ponta da arma · devolve a cor do traçante (ou null = padrão)
  function onShot(d, ox, oy) {
    const sk = equipped(d.w);
    if (!sk) return null;
    const s = sk.shot, ang = Math.atan2(d.y - oy, d.x - ox), m = { x: ox, y: oy }, sc = 0.55;
    let tr = s.tracer || null;
    if (s.tracerAlt && alt++ % 2) tr = s.tracerAlt;
    if (d.quiet) return tr;   // projéteis extras da espingarda: só o traçante
    if (s.flash) burst(fxParts, m, sc, { n: 5, sp: [10, 30], life: [0.05, 0.12], cols: s.flash, spread: 0.8, dir: ang });
    if (s.kind === 'rings') for (let i = 0; i < 3; i++) fxParts.push(P_({ x: ox + Math.cos(ang) * i * 3, y: oy + Math.sin(ang) * i * 3, vx: Math.cos(ang) * 120 * sc, vy: Math.sin(ang) * 120 * sc, life: 0.5, max: 0.5, cols: s.cols, shape: 'ring', r0: 1 + i, delay: i * 0.06 }));
    else if (s.kind === 'stream') burst(fxParts, m, sc, { ...s, n: Math.ceil(s.n * 0.5), dir: ang });
    if (s.more) burst(fxParts, m, sc, { ...s.more, n: Math.ceil(s.more.n * 0.6), dir: ang });
    if (s.extra) burst(fxParts, m, sc, { ...s.extra, n: Math.ceil(s.extra.n * 0.6), dir: ang + (s.extra.dir || 0) });
    if (s.alt && !s.tracerAlt) tr = null;
    return tr;
  }
  // granada/foguete do jogador explodiu
  function onExplode(d) {
    const sk = d.w && equipped(d.w);
    if (!sk || !sk.shot.boom) return false;
    BOOMS[sk.shot.boom](fxParts, d.x, d.y, 0.8);
    return true;
  }
  // visual do projétil no ar (granada e foguete)
  function projLook(k) {
    const sk = equipped(k);
    if (!sk) return null;
    if (sk.shot.kind === 'orb') return { cols: sk.shot.cols.map(hex), trail: sk.shot.trail };
    if (sk.shot.kind === 'rocket') return { look: sk.shot.look.map(hex), trail: sk.shot.trail };
    return null;
  }
  function trail(k, x, y) { const sk = equipped(k); if (sk && sk.shot.trail && Math.random() < 0.8) fxParts.push(P_({ x, y, vx: rand(-6, 2), vy: rand(-6, 6), life: 0.35, max: 0.35, cols: sk.shot.trail })); }
  let lastFx = 0;
  function drawFx(ctx) {
    const now = performance.now(), dt = lastFx ? Math.min(0.05, (now - lastFx) / 1000) : 0; lastFx = now;
    if (fxParts.length) stepDraw(ctx, fxParts, (typeof paused !== 'undefined' && paused) ? 0 : dt, 9999, 9999);
  }

  // som da skin: camadas a mais no tiro (e se tira o som padrão), e na explosão
  const shotSnd = w => { const d = equipped(w); return d ? d.snd : null; };
  const skipBase = w => { const d = equipped(w); return !!(d && d.baseSnd === 'none'); };
  const boomSnd = w => { const d = w && equipped(w); return d ? d.boomSnd || null : null; };

  // ======================= motor de partículas (o mesmo dos protótipos) =======================
  function P_(o) { return Object.assign({ s: 1, g: 0, drag: 1, wob: 0, jit: 0, shape: 'px', ph: Math.random() * 6 }, o); }
  function burst(list, m, sc, o) {
    for (let i = 0; i < (o.n || 10); i++) {
      const a = (o.dir ?? 0) + rand(-(o.spread ?? 3.2), o.spread ?? 3.2), sp = rand(o.sp[0], o.sp[1]) * sc;
      list.push(P_({ x: m.x, y: m.y + rand(-(o.dy || 0), o.dy || 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(o.life[0], o.life[1]), max: o.life[1],
        cols: o.cols, s: o.s || 1, g: (o.g || 0) * sc, drag: o.drag ?? 1, wob: o.wob || 0, jit: o.jit || 0, shape: o.shape || 'px' }));
    }
  }
  const BOOMS = {
    fogo: (L, x, y, sc) => burst(L, { x, y }, sc, { n: 26, sp: [10, 46], life: [0.3, 0.8], cols: ['#fff3c0', '#ffc23a', '#ff7a1c', '#b8320f', '#4a3a30'], spread: Math.PI, g: -10 }),
    erupcao: (L, x, y, sc) => { burst(L, { x, y }, sc, { n: 26, dir: -Math.PI / 2, spread: 0.9, sp: [24, 60], life: [0.6, 1.2], cols: ['#ffe066', '#ff6a1a', '#c83a10', '#3a2a24'], g: 110, s: 2 }); burst(L, { x, y }, sc, { n: 10, sp: [8, 22], life: [0.8, 1.4], cols: ['#5a5050', '#3a3434'], spread: Math.PI, g: -12, s: 2, drag: 0.96 }); },
    plasma: (L, x, y, sc) => { for (let i = 0; i < 3; i++) L.push(P_({ x, y, life: 0.55, max: 0.55, cols: ['#ffffff', '#8affd0', '#2a8a6a'], shape: 'ring', r0: 1 + i * 2, delay: i * 0.08 })); burst(L, { x, y }, sc, { n: 22, sp: [14, 46], life: [0.2, 0.6], cols: ['#ffffff', '#c8ff4a', '#8affd0'], spread: Math.PI }); },
    gelo: (L, x, y, sc) => { burst(L, { x, y }, sc, { n: 26, sp: [16, 56], life: [0.4, 0.9], cols: ['#ffffff', '#e8faff', '#9ff0ff', '#5a8ab8'], spread: Math.PI, g: 90 }); burst(L, { x, y }, sc, { n: 12, sp: [4, 14], life: [0.8, 1.4], cols: ['#ffffff', '#dff6ff'], spread: Math.PI, s: 2, wob: 8, drag: 0.96 }); },
    pandora: (L, x, y, sc) => { burst(L, { x, y }, sc, { n: 26, sp: [8, 34], life: [0.5, 1.1], cols: ['#d9a8ff', '#6a2a9a', '#2a0a3a', '#0a0610'], spread: Math.PI, wob: 26, s: 2, drag: 0.96 });
      L.push(P_({ x, y, vx: 0, vy: -14 * sc, life: 2.2, max: 2.2, cols: ['#fff8c0', '#ffe066', '#f2cf62'], s: 2, delay: 0.6, wob: 6 })); },
    fogos: (L, x, y, sc) => { for (const c of [['#ffffff', '#ff5a5a', '#c22a2a'], ['#ffffff', '#ffd84a', '#c89a1a'], ['#ffffff', '#6fe39a', '#2a8a4a']]) burst(L, { x: x + rand(-6, 6), y: y + rand(-8, 2) }, sc, { n: 14, sp: [14, 34], life: [0.5, 1], cols: c, spread: Math.PI, g: 24, drag: 0.95 }); },
    neve: (L, x, y, sc) => { burst(L, { x, y }, sc, { n: 14, sp: [10, 40], life: [0.2, 0.5], cols: ['#ffffff', '#ffe066', '#ff5050'], spread: Math.PI }); burst(L, { x, y }, sc, { n: 22, sp: [6, 30], life: [0.9, 1.6], cols: ['#ffffff', '#dfefff', '#a8c8e8'], spread: Math.PI, g: 14, wob: 10, drag: 0.97 }); burst(L, { x, y }, sc, { n: 6, sp: [10, 30], life: [0.6, 1.1], cols: ['#e8b830', '#c22a2a', '#2a8a3a'], spread: Math.PI, g: 30, s: 2 }); },
    raio: (L, x, y, sc) => { L.push(P_({ x, y, life: 0.35, max: 0.35, cols: ['#ffffff', '#bfe8ff', '#5ab0ff'], shape: 'bolt' })); L.push(P_({ x, y, life: 0.25, max: 0.25, cols: ['#ffffff', '#8fd0ff'], shape: 'bolt' })); burst(L, { x, y }, sc, { n: 20, sp: [14, 50], life: [0.15, 0.45], cols: ['#ffffff', '#bfe8ff', '#5ab0ff', '#2a5aa0'], spread: Math.PI }); },
  };
  function stepDraw(ctx, L, dt, W, H) {
    for (const p of L) {
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt + (p.wob ? Math.sin(p.ph + p.life * 9) * p.wob * dt : 0) + (p.jit ? rand(-p.jit, p.jit) * dt : 0);
      p.y += p.vy * dt + (p.jit ? rand(-p.jit, p.jit) * dt : 0);
      p.life -= dt;
    }
    for (let i = L.length - 1; i >= 0; i--) if (L[i].life <= 0 || L[i].x > W + 20 || L[i].y > H + 20) L.splice(i, 1);
    for (const p of L) {
      if (p.delay > 0) continue;
      const age = 1 - Math.max(0, p.life) / p.max, col = p.cols[Math.min(p.cols.length - 1, Math.floor(age * p.cols.length))];
      ctx.globalAlpha = Math.min(1, p.life * 4);
      ctx.fillStyle = col; ctx.strokeStyle = col;
      const x = Math.round(p.x), y = Math.round(p.y);
      if (p.shape === 'line') ctx.fillRect(x - p.len, y, p.len, 1);
      else if (p.shape === 'ring') { const r = (p.r0 || 1) + age * 4; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, r * 0.6, r, 0, 0, Math.PI * 2); ctx.stroke(); }
      else if (p.shape === 'bolt') { ctx.lineWidth = 1; ctx.beginPath(); let bx = x + rand(-6, 6), by = Math.max(0, y - 120); ctx.moveTo(bx, by); while (by < y) { by += rand(2, 5); bx += rand(-3, 3); ctx.lineTo(by >= y ? x : bx, Math.min(by, y)); } ctx.stroke(); }
      else if (p.shape === 'orb') { ctx.fillRect(x - 1, y - 1, p.s + 1, p.s + 1); ctx.fillStyle = p.cols[1] || col; ctx.fillRect(x, y - 1, 1, 1); }
      else if (p.shape === 'bat') { ctx.fillRect(x - 1, y, 3, 1); if (Math.sin(p.ph + p.life * 30) > 0) { ctx.fillRect(x - 2, y - 1, 1, 1); ctx.fillRect(x + 2, y - 1, 1, 1); } else { ctx.fillRect(x - 2, y + 1, 1, 1); ctx.fillRect(x + 2, y + 1, 1, 1); } }
      else if (p.shape === 'bee') { ctx.fillStyle = '#ffd23a'; ctx.fillRect(x, y, 2, 1); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x + 1, y, 1, 1); ctx.fillStyle = '#ffffffaa'; ctx.fillRect(x, y - 1, 1, 1); }
      else if (p.shape === 'petal') { ctx.fillRect(x, y, 2, 1); ctx.fillStyle = '#fff0f6'; ctx.fillRect(x, y, 1, 1); }
      else ctx.fillRect(x, y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
  }

  // ======================= vitrine da loja =======================
  const SW = 116, SH = 26, OY = 1;
  // deslocamento horizontal de cada arma para ela ficar no centro da vitrine (largura real do desenho, com os detalhes das skins)
  const SPAN = { pistola: [15, 47], espingarda: [0, 67], rifle: [0, 70], smg: [2, 55], granadas: [2, 61], chamas: [0, 62], bazuca: [0, 70] };
  const OXW = Object.fromEntries(Object.entries(SPAN).map(([w, [a, b]]) => [w, Math.round((SW - (b - a + 1)) / 2 - a)]));
  function rows(P, list, k, pat) {
    for (const [y, a, b] of list) for (let x = a; x <= b; x++) {
      let c = k.body;
      if (pat === 'scales') { const q = (x + (y % 2) * 2) % 4; if (q === 0) c = k.bodyHi; else if (q === 1 && y > list[0][0]) c = k.bodyLo; }
      else if (pat === 'stripes') c = Math.floor(x / 3) % 2 ? k.body : k.bodyLo;
      else if ((x * 7 + y * 3) % 11 === 0) c = k.bodyLo;
      if (y === list[0][0] && pat !== 'scales') c = k.bodyHi;
      P(c, x, y);
    }
  }
  const BASE = {
    pistola(P, k) {
      P(k.metal, 19, 6, 2, 2); P(k.metal, 20, 7, 24, 4); P(k.metalHi, 20, 7, 24, 1); P(k.metalLo, 20, 10, 24, 1);
      for (let x = 22; x <= 27; x += 2) P(k.metalLo, x, 8, 1, 2);
      P(k.metal, 44, 8, 2, 2); P(k.metal, 42, 6, 1, 1); P(k.metal, 21, 6, 1, 1); P(k.body, 24, 11, 18, 2);
      for (let y = 13; y <= 22; y++) { const x = 24 - Math.floor((y - 13) / 3); P(k.body, x, y, 6, 1); P(k.bodyHi, x, y, 1, 1); if (y % 2) P(k.bodyLo, x + 2, y, 3, 1); }
      P(k.metal, 30, 13, 1, 4); P(k.metal, 30, 17, 7, 1); P(k.metal, 37, 13, 1, 4); P(k.metalHi, 33, 13, 1, 3);
      return { x: 46, y: 9 };
    },
    espingarda(P, k, pat) {
      rows(P, [[9, 2, 14], [10, 1, 14], [11, 0, 14], [12, 0, 12], [13, 0, 10], [14, 0, 8]], k, pat);
      rows(P, [[13, 13, 16], [14, 14, 17], [15, 14, 17], [16, 15, 18]], k, pat);
      P(k.metal, 15, 8, 12, 5); P(k.metalHi, 15, 8, 12, 1); P(k.metal, 18, 13, 1, 2); P(k.metal, 18, 15, 5, 1); P(k.metal, 22, 13, 1, 2);
      P(k.metal, 27, 8, 37, 2); P(k.metalHi, 27, 8, 37, 1); P(k.metalLo, 27, 10, 37, 2); P(k.metalHi, 27, 10, 37, 1);
      rows(P, [[12, 36, 47], [13, 36, 47], [14, 37, 46]], k, pat); for (let x = 37; x < 47; x += 2) P(k.bodyLo, x, 13, 1, 1);
      P(k.metalHi, 62, 7, 1, 1);
      return { x: 64, y: 9.5 };
    },
    rifle(P, k, pat) {
      rows(P, [[9, 3, 16], [10, 2, 16], [11, 1, 16], [12, 0, 14], [13, 0, 12], [14, 0, 10], [15, 0, 7]], k, pat);
      rows(P, [[13, 17, 20], [14, 18, 21], [15, 18, 21], [16, 19, 22], [17, 19, 22]], k, pat);
      rows(P, [[10, 31, 46], [11, 31, 46], [12, 32, 45]], k, pat);
      P(k.metalLo, 0, 12, 1, 4); P(k.metalLo, 1, 11, 1, 1); P(k.metal, 16, 8, 16, 5); P(k.metalHi, 16, 8, 16, 1);
      P(k.metalHi, 27, 7, 1, 1); P(k.metalHi, 28, 6, 2, 1); P(k.metal, 22, 13, 1, 2); P(k.metal, 23, 15, 4, 1); P(k.metal, 27, 13, 1, 2); P(k.metalHi, 24, 13, 1, 2);
      P(k.metal, 31, 9, 31, 2); P(k.metalHi, 31, 9, 31, 1); P(k.metal, 23, 6, 2, 2); P(k.metal, 32, 6, 2, 2);
      P(k.metal, 20, 3, 17, 3); P(k.metalHi, 20, 3, 17, 1); P(k.metal, 19, 2, 1, 5); P(k.metal, 36, 2, 3, 5); P(k.metalHi, 36, 2, 3, 1);
      P(k.glow, 39, 3, 1, 3); P(k.metal, 60, 8); P(k.metal, 62, 8, 2, 4);
      return { x: 64, y: 9.5 };
    },
    smg(P, k) {
      P(k.metal, 2, 9, 1, 6); P(k.metal, 2, 9, 12, 1); P(k.metal, 2, 14, 12, 1);
      P(k.metal, 14, 7, 22, 6); P(k.metalHi, 14, 7, 22, 1); P(k.metalLo, 14, 12, 22, 1);
      for (let y = 13; y <= 20; y++) { const x = 21 - Math.floor((y - 13) / 3); P(k.body, x, y, 5, 1); P(k.bodyHi, x, y, 1, 1); }
      for (let y = 13; y <= 22; y++) { P(k.bodyLo, 30 + Math.floor((y - 13) / 4), y, 4, 1); P(k.body, 30 + Math.floor((y - 13) / 4), y, 1, 1); }
      P(k.metal, 36, 8, 14, 4); P(k.metalHi, 36, 8, 14, 1); for (let i = 0; i < 4; i++) P(k.metalLo, 38 + i * 3, 9, 1, 2);
      P(k.metal, 50, 9, 5, 2); P(k.metal, 17, 5, 2, 2); P(k.metal, 46, 6, 1, 2);
      return { x: 55, y: 10 };
    },
    granadas(P, k) {
      P(k.metal, 2, 10, 1, 5); P(k.metal, 2, 10, 10, 1); P(k.metal, 2, 14, 10, 1); P(k.metal, 12, 9, 8, 5); P(k.metalHi, 12, 9, 8, 1); P(k.metal, 14, 14, 4, 6);
      P(k.body, 20, 6, 14, 11); P(k.bodyHi, 20, 6, 14, 1); P(k.bodyLo, 20, 16, 14, 1); for (const x of [23, 27, 31]) P(k.bodyLo, x, 7, 1, 9); P(k.metalHi, 26, 11, 2, 1);
      P(k.body, 34, 7, 24, 7); P(k.bodyHi, 34, 7, 24, 1); P(k.bodyLo, 34, 13, 24, 1); P(k.metal, 58, 6, 3, 9); P('#050505', 60, 8, 1, 5);
      P(k.metal, 42, 14, 3, 6); P(k.metal, 36, 4, 3, 3);
      return { x: 61, y: 10.5 };
    },
    chamas(P, k) {
      P(k.accent, 2, 4, 8, 17); P(shadeHex(k.accent, 1.25), 3, 4, 1, 17); P(shadeHex(k.accent, 0.7), 9, 4, 1, 17);
      P(k.metal, 4, 2, 4, 2); P(k.metalLo, 2, 8, 8, 1); P(k.metalLo, 2, 16, 8, 1);
      for (const [x, y] of [[6, 21], [7, 22], [8, 22], [9, 22], [10, 21], [11, 20], [12, 19], [13, 18], [14, 17], [15, 16], [16, 15], [17, 14]]) P(k.metalLo, x, y);
      P(k.metal, 14, 9, 34, 4); P(k.metalHi, 14, 9, 34, 1); P(k.body, 18, 13, 4, 6); P(k.body, 32, 13, 3, 5);
      P(k.metal, 48, 10, 10, 2); P(k.metalHi, 48, 10, 10, 1); P(k.metalLo, 58, 9, 3, 4);
      return { x: 61, y: 11 };
    },
    bazuca(P, k) {
      P(k.bodyLo, 0, 4, 5, 12); P(k.body, 4, 6, 58, 8); P(k.bodyHi, 4, 6, 58, 1); P(k.bodyLo, 4, 13, 58, 1);
      P(k.bodyLo, 60, 4, 6, 12); P('#050505', 65, 6, 1, 8); P(k.metalLo, 18, 6, 2, 8); P(k.metalLo, 46, 6, 2, 8);
      P(k.metal, 24, 2, 6, 4); P(k.glow, 29, 3, 1, 2); P(k.metal, 22, 14, 3, 7); P(k.metal, 34, 14, 3, 6);
      return { x: 66, y: 10 };
    },
  };
  // desenha a vitrine de uma skin (ou da arma padrão) num canvas SW×SH; devolve a boca do cano
  function showcase(c, id, w, t, parts, dt) {
    const ctx = c.getContext('2d'), d = id ? byId[id] : null, k = d ? { ...DEFAULT[w], ...d.pal } : DEFAULT[w];
    const OX = OXW[w] ?? 4;
    ctx.clearRect(0, 0, SW, SH);
    const P = (col, x, y, ww = 1, hh = 1) => { ctx.fillStyle = col; ctx.fillRect(x + OX, y + OY, ww, hh); };
    if (d && d.ghost) ctx.globalAlpha = 0.55 + 0.2 * Math.sin(t * 3);
    const m = BASE[w](P, k, d && d.pat);
    if (d) d.deco(P, t);
    ctx.globalAlpha = 1;
    const mm = (d && d.mouth) || m, mouth = { x: mm.x + OX, y: mm.y + OY };
    if (parts) stepDraw(ctx, parts, dt, SW, SH);
    return mouth;
  }
  // tiro de teste na vitrine (efeito completo, para a direita)
  function testShot(id, mouth, parts) {
    const s = byId[id].shot, sc = 1;
    if (s.flash) burst(parts, mouth, sc, { n: 6, sp: [10, 30], life: [0.05, 0.12], cols: s.flash, spread: 0.8 });
    if (s.kind === 'tracer' || s.kind === 'pellets') {
      const n = s.kind === 'pellets' ? 5 : 1;
      for (let i = 0; i < n; i++) parts.push(P_({ x: mouth.x, y: mouth.y, vx: 240, vy: n > 1 ? rand(-36, 36) : 0, life: 0.35, max: 0.35, cols: s.cols, shape: 'line', len: s.len || 6 }));
    } else if (s.kind === 'rings') for (let i = 0; i < 3; i++) parts.push(P_({ x: mouth.x + i * 3, y: mouth.y, vx: 120, life: 0.5, max: 0.5, cols: s.cols, shape: 'ring', r0: 1 + i, delay: i * 0.06 }));
    else if (s.kind === 'stream') burst(parts, mouth, sc, { ...s, dir: 0 });
    else if (s.kind === 'orb') { const o = P_({ x: mouth.x, y: mouth.y, vx: 70, vy: -42, g: 90, life: 0.9, max: 0.9, cols: s.cols, s: 2, shape: 'orb' }); parts.push(o); setTimeout(() => { BOOMS[s.boom](parts, Math.min(o.x, SW - 12), Math.min(o.y, SH - 4), 1); o.life = 0; }, 850); }
    else if (s.kind === 'rocket') { const o = P_({ x: mouth.x, y: mouth.y, vx: 60, vy: 0, life: 0.6, max: 0.6, cols: [s.look[0], s.look[1]], s: 2, shape: 'orb' }); parts.push(o);
      const tr = setInterval(() => { if (o.life <= 0) return clearInterval(tr); parts.push(P_({ x: o.x - 1, y: o.y, vx: rand(-6, 2), vy: rand(-6, 6), life: 0.35, max: 0.35, cols: s.trail })); }, 30);
      setTimeout(() => { BOOMS[s.boom](parts, Math.min(o.x + 30, SW - 14), Math.min(o.y, SH - 4), 1); o.life = 0; }, 550); }
    if (s.more) burst(parts, mouth, sc, { ...s.more, dir: 0 });
    if (s.extra) burst(parts, mouth, sc, { ...s.extra, dir: s.extra.dir || 0 });
  }

  // ======================= loja (Loja › Skins) =======================
  // som padrão de cada arma, só para o botão Testar da loja
  const TEST_BASE = {
    pistola: [['n', 'highpass', 2500, 0, 0.05, 0.35], ['t', 'sine', 180, 60, 0.12, 0.35]],
    espingarda: [['n', 'lowpass', 1600, 300, 0.32, 0.45], ['t', 'sine', 95, 38, 0.25, 0.45]],
    rifle: [['n', 'highpass', 3500, 0, 0.04, 0.4], ['t', 'sine', 70, 28, 0.5, 0.5], ['n', 'lowpass', 2200, 180, 0.6, 0.4]],
    smg: [['n', 'bandpass', 2400, 0, 0.04, 0.3, 0, 1.5], ['t', 'square', 160, 80, 0.05, 0.12]],
    granadas: [['t', 'sine', 160, 70, 0.15, 0.4], ['n', 'bandpass', 600, 0, 0.08, 0.3]],
    chamas: [['n', 'bandpass', 500, 1400, 0.7, 0.35, 0, 0.7], ['n', 'lowpass', 400, 200, 0.7, 0.25]],
    bazuca: [['n', 'bandpass', 300, 2500, 0.45, 0.35, 0, 0.8]],
  };
  const BOOM_BASE = [['t', 'sine', 70, 28, 0.6, 0.6, 0.85], ['n', 'lowpass', 1800, 120, 0.7, 0.5, 0.85]];
  const shopCards = {};
  let shopRaf = 0, shopLast = 0, shopSig = '';
  // aba da arma e filtro de raridade (lembrados neste navegador)
  const SHOP_KEY = 'ultimoAbrigo.wskShop';
  let shopTab = null, shopRar = 'all', shopCat = 'armas';
  try { const v = JSON.parse(localStorage.getItem(SHOP_KEY) || '{}'); shopTab = v.tab || null; shopRar = v.rar || 'all'; shopCat = v.cat || 'armas'; } catch (e) { /* sem armazenamento */ }
  const saveShop = () => { try { localStorage.setItem(SHOP_KEY, JSON.stringify({ tab: shopTab, rar: shopRar, cat: shopCat })); } catch (e) { /* sem armazenamento */ } };
  function setCat(c) { shopCat = c; shopRar = 'all'; shopSig = ''; saveShop(); }
  function setTab(w) { shopTab = w; shopSig = ''; saveShop(); }
  // skin em destaque ao abrir a loja (vinda da janela Visual): rola até ela e pisca
  let spot = null;
  function spotlight(id) { spot = id; shopSig = ''; }
  function setRar(r) { shopRar = r; shopSig = ''; saveShop(); }
  function test(id) {
    const d = byId[id], c = shopCards[id];
    if (!d || !c) return;
    if (typeof Sound !== 'undefined') {
      Sound.init();
      const delayed = (d.boomSnd || []).map(L => { const x = [...L]; x[6] = (x[6] || 0) + 0.85; return x; });
      Sound.layers([...(d.baseSnd === 'none' ? [] : TEST_BASE[d.w]), ...d.snd, ...(d.shot.kind === 'orb' ? BOOM_BASE : []), ...delayed]);
    }
    const shots = d.w === 'smg' ? 6 : 1;
    for (let i = 0; i < shots; i++) setTimeout(() => { testShot(id, c.mouth, c.parts); if (i && typeof Sound !== 'undefined') Sound.layers([...TEST_BASE.smg, ...d.snd]); }, i * 90);
  }
  function shopLoop(now) {
    shopRaf = 0;
    const el = typeof document !== 'undefined' && document.getElementById('skins-shop');
    if (!el || !el.offsetParent) return;   // a aba não está à vista: para (volta no próximo render)
    const dt = shopLast ? Math.min(0.05, (now - shopLast) / 1000) : 0; shopLast = now;
    for (const [id, c] of Object.entries(shopCards)) if (c.canvas.isConnected) c.mouth = showcase(c.canvas, id, byId[id].w, now / 1000, c.parts, dt);
    shopRaf = requestAnimationFrame(shopLoop);
  }
  // categorias da loja de skins: armas do líder e roupas (skins de personagem, em oskins.js)
  const OCATS = [['armas', '🔫 Armas'], ['lider', '🧍 Líder'], ['sobrev', '👥 Sobreviventes'], ['herois', '⭐ Heróis']];
  const catsHtml = () => OCATS.map(([k, n]) => {
    const list = k === 'armas' ? DEFS : (typeof OSkins !== 'undefined' ? OSkins.CATS[k] : []);
    const got = list.filter(d => (k === 'armas' ? owned(d.id) : OSkins.owned(d.id))).length;
    return `<button class="wsk-cat${k === shopCat ? ' on' : ''}" data-act="wskCat" data-k="${k}">${n} <small>${got}/${list.length}</small></button>`;
  }).join('');
  const rarsHtml = list => [['all', 'Todas'], ['lendaria', 'Lendárias'], ['epica', 'Épicas'], ['rara', 'Raras'], ['comum', 'Comuns']].map(([r, n]) => {
    const c = list.filter(d => r === 'all' || d.rar === r).length;
    return `<button class="wsk-rf r-${r}${shopRar === r ? ' on' : ''}" data-act="wskRar" data-k="${r}" ${c ? '' : 'disabled'}>${n} <small>${c}</small></button>`;
  }).join('');
  const RORD = ['lendaria', 'epica', 'rara', 'comum'];
  // roupas: líder, uniformes do grupo e trajes dos heróis
  function renderOutfits(el) {
    const O = OSkins, cat = shopCat, all = O.CATS[cat], key = JSON.stringify(['o', caps(), S.meta.osk, cat, shopRar]);
    if (key === shopSig && el.querySelector('.wsk-list')) return;
    shopSig = key;
    const list = all.filter(d => shopRar === 'all' || d.rar === shopRar).sort((a, b) => RORD.indexOf(a.rar) - RORD.indexOf(b.rar));
    const TIT = { lider: '🧍 Roupas do líder', sobrev: '👥 Uniformes do grupo', herois: '⭐ Trajes dos heróis de campo' };
    const NOTE = { lider: 'Trocam a roupa do líder por cima do seu personagem (alguns escondem o cabelo).', sobrev: 'Valem para o grupo inteiro: cada função continua com um detalhe próprio.', herois: 'Mantêm o rosto e o que identifica cada herói; só a roupa muda.' };
    const using = d => (cat === 'herois' ? O.equipped('herois', d.k) : O.equipped(cat)) === d;
    const cards = list.map(d => {
      const own = O.owned(d.id), on = own && using(d), price = O.PRICE[d.rar], can = caps() >= price;
      const btn = on ? `<button class="small primary" data-act="oskEquip" data-k="${d.id}" title="Clique para tirar">✔ Em uso</button>`
        : own ? `<button class="small" data-act="oskEquip" data-k="${d.id}">Vestir</button>`
        : `<button class="small${can ? ' primary' : ''}" data-act="oskBuy" data-k="${d.id}" ${can ? '' : 'disabled'} title="${can ? '' : 'Faltam ' + (price - caps()) + ' 🏷️'}">Comprar · 🏷️ ${price}</button>`;
      return `<div class="wsk-card osk-card r-${d.rar}${on ? ' on' : ''}" data-oskcard="${d.id}">
          ${O.previewHtml(d)}
          <div class="wsk-id"><b>${d.nome}</b> <span class="wsk-rar">${O.RAR[d.rar]}</span><small>${cat === 'herois' ? CHAMPS[d.k].nome : d.tema}</small></div>
          <p class="osk-desc">${d.desc}</p>
          <div class="wsk-btns">${btn}</div>
        </div>`;
    }).join('');
    el.querySelector('.wsk-slot').innerHTML = `<div class="wsk-nav"><div class="wsk-cats">${catsHtml()}</div>
        <div class="wsk-head"><b>${TIT[cat]}</b><div class="wsk-rfs">${rarsHtml(all)}</div></div></div>
      <p class="hint">${NOTE[cat]}</p>
      <div class="wsk-list">${cards || '<p class="hint">Nenhuma desta raridade.</p>'}</div>`;
    O.paintPreviews(el.querySelector('.wsk-slot'));
    if (spot) {
      const sid = spot; spot = null;
      setTimeout(() => { const c = el.querySelector(`[data-oskcard="${sid}"]`); if (c) { c.scrollIntoView({ block: 'center', behavior: 'smooth' }); c.classList.add('spot'); setTimeout(() => c.classList.remove('spot'), 2200); } }, 60);
    }
  }

  function renderShop(el) {
    if (shopCat !== 'armas' && typeof OSkins !== 'undefined') { for (const id of Object.keys(shopCards)) delete shopCards[id]; return renderOutfits(el); }
    const m = M(), key = JSON.stringify([caps(), m.own, m.eq, shopTab, shopRar]);
    if (key !== shopSig || !el.querySelector('.wsk-list')) {
      shopSig = key;
      const groups = Object.keys(LWEAPONS).filter(w => DEFS.some(d => d.w === w));
      if (!groups.includes(shopTab)) shopTab = groups[0];
      const w = shopTab;
      const list = DEFS.filter(d => d.w === w && (shopRar === 'all' || d.rar === shopRar)).sort((a, b) => RORD.indexOf(a.rar) - RORD.indexOf(b.rar));
      // navegação compacta: categorias · ícones das armas · nome da arma e filtro de raridade
      const cats = catsHtml();
      const weps = groups.map(g => { const all = DEFS.filter(d => d.w === g), got = all.filter(d => owned(d.id)).length, on = m.eq[g] && owned(m.eq[g]);
        return `<button class="wsk-wep${g === w ? ' on' : ''}${on ? ' eq' : ''}" data-act="wskTab" data-k="${g}" title="${LWEAPONS[g].nome}: ${got} de ${all.length}${on ? ' · com skin equipada' : ''}">
          <span class="wsk-wi">${LWEAPONS[g].icon}</span><small>${got}/${all.length}</small></button>`; }).join('');
      const rars = rarsHtml(DEFS.filter(d => d.w === w));
      el.querySelector('.wsk-slot').innerHTML = `<div class="wsk-nav"><div class="wsk-cats">${cats}</div><div class="wsk-weps" role="tablist">${weps}</div>
          <div class="wsk-head"><b>${LWEAPONS[w].icon} ${LWEAPONS[w].nome}</b><div class="wsk-rfs">${rars}</div></div></div>
        <div class="wsk-list">${list.length ? list.map(d => {
          const own = owned(d.id), on = own && m.eq[w] === d.id, price = PRICE[d.rar], can = caps() >= price;
          return `<div class="wsk-card r-${d.rar}${on ? ' on' : ''}">
            <canvas width="${SW}" height="${SH}" data-wsk="${d.id}" aria-label="${d.nome}"></canvas>
            <div class="wsk-id"><b>${d.nome}</b> <span class="wsk-rar">${RAR[d.rar]}</span><small>${d.tema}</small></div>
            <ul class="wsk-fx"><li>🎨 ${d.fx[0]}</li><li>💥 ${d.fx[1]}</li><li>🔊 ${d.fx[2]}</li></ul>
            <div class="wsk-btns"><button class="small" data-act="wskTest" data-k="${d.id}">▶ Testar</button>
              ${on ? `<button class="small primary" data-act="wskEquip" data-k="${d.id}" title="Clique para voltar à arma padrão">✔ Equipada</button>`
                : own ? `<button class="small" data-act="wskEquip" data-k="${d.id}">Equipar</button>`
                : `<button class="small${can ? ' primary' : ''}" data-act="wskBuy" data-k="${d.id}" ${can ? '' : 'disabled'} title="${can ? '' : `Faltam ${price - caps()} 🏷️`}">Comprar · 🏷️ ${price}</button>`}</div>
          </div>`;
        }).join('') : '<p class="hint">Nenhuma skin desta raridade para esta arma.</p>'}</div>`;
      if (spot) {
        const sid = spot; spot = null;
        setTimeout(() => { const c = el.querySelector(`canvas[data-wsk="${sid}"]`), card = c && c.closest('.wsk-card'); if (card) { card.scrollIntoView({ block: 'center', behavior: 'smooth' }); card.classList.add('spot'); setTimeout(() => card.classList.remove('spot'), 2200); } }, 60);
      }
      for (const id of Object.keys(shopCards)) delete shopCards[id];
      for (const c of el.querySelectorAll('canvas[data-wsk]')) {
        const id = c.dataset.wsk;
        shopCards[id] = { canvas: c, parts: [], mouth: showcase(c, id, byId[id].w, 0) };
      }
    }
    if (!shopRaf && el.offsetParent) { shopLast = 0; shopRaf = requestAnimationFrame(shopLoop); }
  }

  return { DEFS, byId, PRICE, RAR, SW, SH, owned, equipped, buy, equip, caps, pal, ghost, mini, tipDx, onShot, onExplode, projLook, trail, drawFx, shotSnd, skipBase, boomSnd, showcase, testShot, test, renderShop, setTab, setRar, setEquip, spotlight, setCat, cat: () => shopCat };
})();
