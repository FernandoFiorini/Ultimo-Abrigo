# TODO

Ideias aprovadas para versões futuras, ainda não implementadas.

## Plataforma
- [ ] **Versão mobile:** layout pensado para celular (abas na parte de baixo, botões maiores, cenário em tela cheia na horizontal), e não só a versão de desktop adaptada.
- [ ] **PWA:** `manifest.json` e service worker para instalar o jogo no celular e jogar sem internet.
- [ ] **Notificações do navegador:** avisar quando a horda chega com a aba em segundo plano (com permissão do jogador).

## Conteúdo e interface
- [ ] **Versão em inglês:** separar todos os textos em um arquivo por idioma e adicionar o seletor de idioma nas Configurações.

## Eventos (depois do lançamento: precisam de jogadores voltando para valer a pena)
Sem servidor, a data vem do relógio do aparelho (dá para adiantar): as recompensas de eventos devem ser só cosméticas (skins, filtros, selos).
- [ ] **Noite dos Monstros:** em datas fixas (Sexta-feira 13, Halloween), a horda vem com monstros no lugar dos zumbis: lobisomem, vampiro, múmia... cada um com visual, sons e uma fraqueza própria (entram no Bestiário e no Glossário). Recompensas: skins temáticas.
- [ ] **Calendário de eventos:** organiza quando cada evento acontece (Natal, Ano Novo, Carnaval, Halloween...), mostra o próximo no menu e as recompensas de cada um.
- [ ] **Login diário:** recompensa por dia jogado, em sequência (ex.: 7 dias, com uma skin no último). Pensar no que acontece ao perder um dia.

## Heróis de campo
- [ ] **Animações dos heróis de campo:** refinar o visual do ataque básico, da ativa e da suprema de cada herói (hoje são efeitos simples: raios em zigue-zague, laser, feixe do disco, notas musicais, banners e flashes) e dar animações próprias a eles no telhado (cast, comemoração ao subir de nível).
- [ ] **Sons dos heróis de campo:** sons especiais para cada herói (ataque básico, ativa e suprema). Hoje usam o som de tiro comum.
- [ ] **Limite de caixas guardadas:** (o nível e o sorteio fixo já foram feitos na 1.07.000) se um dia as caixas forem vendidas, limitar o acúmulo (ex.: 20) e converter o excesso em 🏷️ Tampinhas.

## Desenvolvimento
- [ ] **Testar o envio do Reportar bug:** a chave do Web3Forms já está no config.js; mandar um relatório de teste com um save grande e conferir se chega no e-mail.
- [ ] **Contador de visitas:** criar o site em goatcounter.com e pôr o código em `GOATCOUNTER` (config.js).
- [ ] **Antes do lançamento:** autorização dos homenageados, testar no Firefox/Edge/Safari (filtros visuais e áudio), uma partida completa até a Cura jogando, e `DEV_MODE = false`.
