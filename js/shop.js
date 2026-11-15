'use strict';

function timeGain(secs) {
  const r = rates(), g = {};
  for (const k in RES) g[k] = Math.max(0, r[k]) * secs;
  return g;
}

function shopBlock(k) {
  if (S.meta.cash < SHOP[k].cost) return 'Cash insuficiente';
  switch (k) {
    case 'prod2x': return S.meta.boosts.prod >= BOOST_MAX ? 'Limite de 4h' : '';
    case 'furia': return S.meta.boosts.furia >= BOOST_MAX ? 'Limite de 4h' : '';
    case 'aereo': return !S.horde.active ? 'Só durante a horda' : S.horde.strikeT > 0 ? 'A caminho...' : !S.horde.zs.length ? 'Nenhum zumbi na tela' : '';
    case 'muro': return S.wallHp >= maxWall() ? 'Muro já está inteiro' : '';
    case 'veterano': return S.survivors >= maxSurv() ? 'Sem vaga' : '';
    case 'retorno': return S.exps.length ? '' : 'Nenhuma expedição fora';
    case 'fragmento': return Champions.fragBlock();
  }
  return '';
}

function buyShop(k) {
  if (shopBlock(k)) return;
  // fragmento: abre a escolha do herói (o cash só sai quando você escolhe)
  if (k === 'fragmento') { Champions.fragPicker(); return; }
  const it = SHOP[k];
  S.meta.cash -= it.cost;
  let msg = '';
  switch (k) {
    case 'prod2x': S.meta.boosts.prod = Math.min(BOOST_MAX, S.meta.boosts.prod + 600); msg = 'produção dobrada!'; break;
    case 'furia': S.meta.boosts.furia = Math.min(BOOST_MAX, S.meta.boosts.furia + 600); msg = 'os atiradores estão furiosos!'; break;
    case 'tempo15': case 'tempo60': case 'tempo240': {
      const g = timeGain(it.secs), got = [];
      for (const r in g) if (g[r] >= 1) { S.res[r] += g[r]; got.push(`+${fmt(g[r])} ${RES[r].icon}`); }
      msg = got.join(' ') || 'sem produção para adiantar';
      break;
    }
    case 'aereo': S.horde.strikeT = 1.2; S.meta.stats.airstrikes++; msg = 'os aviões estão a caminho!'; break;
    case 'muro': S.wallHp = maxWall(); S.wallDown = false; S.overflow = 0; msg = 'muro restaurado!'; break;
    case 'veterano': msg = `${addSurvivor()} chegou ao abrigo, com anos de experiência nas ruas!`; break;
    case 'medkit': S.res.remedio += 5; msg = '+5 remédios'; break;
    case 'tampinhas': S.meta.champ.caps = (S.meta.champ.caps || 0) + CAPS_PACK; msg = `+${CAPS_PACK} 🏷️ Tampinhas`; break;
    case 'retorno': {
      const list = S.exps;
      S.exps = [];
      for (const e of list) expReturn(e);
      msg = 'as expedições voltaram!';
      break;
    }
  }
  addLog(`💵 ${it.icon} ${it.nome}: ${msg}`, 'good');
  emit('shop', { k, text: `${it.icon} ${msg}` });
}

function gainCash(n, reason, x, y) {
  S.meta.cash += n;
  addLog(`💵 +${n} cash: ${reason}`, 'good');
  emit('cash', { n, x, y });
}
