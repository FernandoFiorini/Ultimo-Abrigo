'use strict';

// Espaços de salvamento, perfil do jogador (vale para todos os saves deste navegador) e morte permanente.
const Store = {
  get(k, def = null) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } },
};

const Slots = (() => {
  const PFX = 'ultimoAbrigo.slot', LAST = 'ultimoAbrigo.last', GRAVE = 'ultimoAbrigo.graveyard', AUTO = 'ultimoAbrigo.autoload';
  const ids = () => Array.from({ length: SLOT_COUNT }, (_, i) => i + 1);
  const key = i => PFX + i;
  const raw = i => { try { return localStorage.getItem(key(i)); } catch (e) { return null; } };

  // Save único das versões antigas vira o espaço 1
  function migrate() {
    try {
      const old = localStorage.getItem(SAVE_KEY);
      if (!old) return;
      if (!ids().some(raw)) { localStorage.setItem(key(1), old); localStorage.setItem(LAST, '1'); }
      localStorage.removeItem(SAVE_KEY);
    } catch (e) { /* sem armazenamento */ }
  }

  // Resumo para o menu (sem carregar o jogo)
  function info(i) {
    const r = raw(i);
    if (!r) return null;
    try {
      const d = JSON.parse(r), m = d.meta || {};
      return {
        i, name: m.player || 'Sobrevivente', diff: DIFFS[d.diff] ? d.diff : 'normal',
        city: m.city || 1, world: m.worlds || 1, wave: d.wave || 1, best: (m.stats && m.stats.bestWave) || d.best || 0,
        survivors: d.survivors || 0, last: d.last || 0, wins: m.wins || {}, cured: !!m.cured,
      };
    } catch (e) { return { i, broken: true, name: '(save corrompido)', diff: 'normal' }; }
  }

  const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

  const api = {
    cur: 1,
    dead: false,    // o save atual morreu no Apocalipse: nada mais é salvo
    ready: false,   // o jogo está rodando (antes disso não há o que salvar)
    death: null,    // resumo da última morte permanente, para a tela de fim
    ids, key, migrate, info, rid,
    list: () => ids().map(info),
    has: i => !!raw(i),
    firstFree: () => ids().find(i => !raw(i)) || null,
    last() { const l = Store.get(LAST); return l && raw(l) ? l : (ids().find(raw) || null); },
    setLast(i) { Store.set(LAST, i); },
    remove(i) {
      Store.del(key(i));
      if (Store.get(LAST) === i) Store.del(LAST);
    },
    write(i, state) { try { localStorage.setItem(key(i), JSON.stringify(state)); return true; } catch (e) { return false; } },
    // ids de saves mortos no Apocalipse: um código exportado antes da morte não ressuscita o save
    bury(id) { if (!id) return; const g = Store.get(GRAVE, []); if (!g.includes(id)) { g.push(id); Store.set(GRAVE, g.slice(-500)); } },
    buried: id => !!id && Store.get(GRAVE, []).includes(id),
    // Recarrega a página direto num save (sem passar pelo menu)
    open(i) {
      try { sessionStorage.setItem(AUTO, String(i)); } catch (e) { /* sem armazenamento */ }
      location.reload();
    },
    takeAutoload() {
      try { const v = sessionStorage.getItem(AUTO); sessionStorage.removeItem(AUTO); return v ? +v : null; } catch (e) { return null; }
    },
    toMenu() { if (api.ready) save(); location.reload(); },

    // O abrigo caiu no Apocalipse: o save é apagado de vez
    perish() {
      if (api.dead) return;
      api.dead = true;
      const m = S.meta;
      api.death = { name: m.player, best: S.best, kills: S.kills, city: m.city, world: m.worlds || 1, fallen: m.fallen || 0 };
      api.bury(m.runId);
      api.remove(api.cur);
      S = newState(m, S.diff);   // estado limpo (nunca é salvo), para a simulação parar sem erros
      emit('gameOver');
      if (api.ready) Menu.death();
    },
  };
  return api;
})();

// Perfil: vitórias, skins liberadas e a skin do líder. Vale para todos os saves deste navegador.
const Profile = (() => {
  const KEY = 'ultimoAbrigo.profile';
  // body: corpo do líder em todas as skins ('m' masculino · 'f' feminino: cabelo comprido, sem barba)
  const DEF = () => ({ winners: [], skins: ['padrao'], skin: 'padrao', body: 'm',
    custom: { shirt: '#3c3e48', pants: '#282832', hair: '#1e1914', cape: '#a02828', crown: false }, trophy: -1 });
  let p = Object.assign(DEF(), Store.get(KEY, {}));
  p.custom = Object.assign(DEF().custom, p.custom);
  const persist = () => Store.set(KEY, p);
  const rgb = h => { const n = parseInt(String(h).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };

  return {
    get: () => p,
    unlocked: k => p.skins.includes(k),
    setSkin(k) { if (LEADER_SKINS[k] && p.skins.includes(k)) { p.skin = k; persist(); } },
    setCustom(k, v) { p.custom[k] = v; persist(); },
    setBody(b) { p.body = b === 'f' ? 'f' : 'm'; persist(); },
    // aplica o corpo escolhido a um visual de skin
    body: look => (p.body === 'f' ? { ...look, longHair: true, bald: false, beard: null, mustache: null } : look),
    // Registra uma vitória e devolve as skins liberadas agora
    win(entry) {
      p.winners.unshift(entry);
      p.winners.length = Math.min(p.winners.length, 50);
      p.trophy = Math.max(p.trophy, diffRank(entry.d));
      const fresh = [];
      for (const [k, s] of Object.entries(LEADER_SKINS)) {
        if (p.skins.includes(k)) continue;
        if (s.diff === '*' || s.diff === entry.d) { p.skins.push(k); fresh.push(k); }
      }
      persist();
      return fresh;
    },
    // Visual do líder no telhado
    look() {
      if (p.skin === 'custom' && p.skins.includes('custom')) {
        const c = p.custom;
        return this.body({ shirt: rgb(c.shirt), pants: rgb(c.pants), hair: rgb(c.hair), cape: rgb(c.cape), crown: !!c.crown });
      }
      return this.body(LEADER_SKINS[p.skins.includes(p.skin) ? p.skin : 'padrao']);
    },
    // Nomes que aparecem como NPCs no abrigo: vencedores deste navegador + Hall da Fama do site
    hall() {
      const seen = new Set(), out = [];
      for (const w of [...p.winners.map(w => ({ ...w, local: true })), ...HALL_OF_FAME]) {
        const id = w.n + '|' + w.d;
        if (!w.n || seen.has(id)) continue;
        seen.add(id);
        out.push(w);
      }
      return out;
    },
  };
})();
