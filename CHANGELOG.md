# Changelog

As versões seguem o formato `MAIOR.MÉDIA.PEQUENA`:

- **Pequena** (`1.00.000` → `1.00.001`): correções e ajustes pontuais.
- **Média** (`1.00.000` → `1.01.000`): novos recursos ou mudanças grandes.
- **Maior** (`1.00.000` → `2.00.000`): as maiores atualizações, que mudam o jogo como um todo.

## 1.06.000

Quando o muro cai.

- **Invasão do abrigo:** com o muro destruído, os zumbis não param mais nele: entram no acampamento e atacam quem estiver por perto. Os sobreviventes que não estão nos postos de tiro partem para cima deles e lutam corpo a corpo (causam dano, mas morrem com facilidade). Guardas, torres e as armas do líder continuam atirando em quem entrou.
- **Três destinos para quem é alcançado:** morrer, escapar **ferido** ou ser **mordido**. Remédios e o Médico de campo transformam uma morte em ferimento grave.
- **Feridos:** não trabalham até serem tratados. Cada médico cuida de um ferido por vez (e não produz remédio enquanto isso). Sem médico livre, a cada 2 minutos um ferido piora: gasta um remédio ou morre. Os feridos aparecem enfaixados perto do abrigo, com os médicos ao lado, e marcados com 🤕 na lista da equipe.
- **Decisão sobre os mordidos:** depois da horda, cada pessoa mordida exige uma escolha na tela:
  - **Matar:** sem risco, mas o grupo fica de **luto** (−15% de produção por 2min 30s, acumulável).
  - **Liberar:** sem luto, mas a pessoa provavelmente volta na **próxima horda como Transformado**, um zumbi mais forte e rápido que leva o nome dela. Com sorte (25%), resiste à infecção e volta curada alguns minutos depois, trazendo remédios.
- **Progresso offline:** o dano que passa do muro também gera mortos, feridos e mordidos; as decisões ficam esperando a sua volta.
- **Avisos:** resumo da invasão no registro, alerta de feridos sem médico, de luto e de muro caído antes da horda, e indicadores 🕯️ Luto e 🤕 feridos no cenário.
- Uma onda em que os zumbis invadiram o abrigo não conta mais como "sem dano ao muro" (conquista Intocável).
- **Menu de debug** (F9, \` ou botão 🐞 no rodapé): cenários prontos de invasão, mordidos, feridos, Transformado e cura, além de atalhos para muro, onda, pessoas, luto, recursos e tempo. Desligado por padrão: só aparece com `DEV_MODE = true` em `js/config.js` e rodando localmente.

## 1.05.001

Menus e armas da noite.

- **Até 3 armas por noite**, nos espaços (Q) (W) (E). Saves antigos: a arma que estava no espaço R vai para um espaço livre, se houver.
- **Arma equipada mais visível:** na barra da noite, a arma em uso fica maior, iluminada e com a etiqueta "EM MÃOS"; as outras ficam apagadas. Ao trocar de arma (Q/W/E, clique na barra ou roda do mouse), aparece um aviso no cenário com o nome da arma e a munição.
- **O líder segura a arma escolhida:** cada uma das 7 armas tem desenho próprio no telhado (pistola, espingarda com telha, rifle com luneta, submetralhadora com pente, lança-granadas, lança-chamas com tanque nas costas e bazuca no ombro). Ao trocar, ele abaixa e levanta a arma, e o clarão, a chama e os projéteis saem da ponta do cano certo.
- **Aba Armas:** cada arma equipada mostra "✔ Equipada (Q)", e os botões de espaço ficam em "Levar à noite: (Q) (W) (E)".
- **(R) recruta** (antes era G, que continua funcionando). R deixou de ser espaço de arma.
- **Atalho sem efeito agora avisa:** se o botão estiver indisponível (abrigo lotado, comida insuficiente, desafio Isolados), ele treme e o registro diz o motivo.
- **Atalhos no mesmo formato em todo lugar:** (V), (R), (C), (F) e (O) nos botões, (1) a (0) nas abas, (H) em Atalhos e na lista de atalhos.
- **Menus numerados:** opções dos acontecimentos, ofertas do comerciante, desafios da cidade e abas das Configurações mostram (1), (2)... e podem ser escolhidos com as teclas de número.
- **Configurações em abas:** Jogo, Visual (com Acessibilidade), Áudio e Dados.

## 1.05.000

Ambientação do cenário.

- **Acampamento refeito:** chão de terra batida separado do asfalto da rua; abrigo com arame farpado no telhado, caixa d'água, sacos de areia na porta, lampião e tambor de água; varal de lâmpadas coloridas que acende à noite; barracas com duas águas, cordas e luz dentro à noite; lona sobre a bancada de ferramentas; sacos de areia junto ao muro; varal de roupas balançando; fogueira com anel de pedras, troncos para sentar e panela fumegando no tripé.
- **Mais um carro na rua:** abandonado no meio da pista, inclinado pelos pneus murchos, com um vidro estourado, outro trincado, porta aberta, ferrugem e cacos de vidro brilhando no asfalto.
- **Janela de Configurações:** as descrições das opções voltaram a ficar numa linha só (o realce de palavras-chave as quebrava em pedaços; agora ele não vale nessa janela) e há mais espaço em volta da descrição do estilo musical.
- **Noite mais clara:** o céu e o cenário escurecem bem menos à noite, nos três estilos visuais.
- **Corpos pelo cenário:** pessoas e zumbis caídos na rua, de quem não chegou ao abrigo. Os zumbis que você abate ficam no chão por 40 segundos (antes, 5) e somem devagar.
- **Sangue:** manchas antigas e rastros de arrasto na rua (fora do acampamento), poças sob os corpos e manchas que duram mais onde os zumbis caem.
- **Zumbis se despedaçam ao morrer, de formas diferentes:** caem para trás, caem de cara, perdem a cabeça (que sai rolando, com sangue jorrando do pescoço), partem ao meio (as pernas ficam de pé um instante antes de tombar) ou se desmancham em pedaços. Explosões (granadas, bazuca, ataque aéreo e Inchados) sempre despedaçam. As partes voam, quicam no chão e ficam no cenário junto com os corpos.
- **Opção "Sangue e mutilação" (⚙️ → Visual):** desligada, tira manchas, poças, respingos e o despedaçamento; os zumbis só caem e os impactos levantam poeira.
- **Acontecimentos aleatórios:** a cada 7–18 segundos, algo acontece na cidade, com som leve e distante: vidro quebrando (com cacos caindo de uma janela), entulho despencando de um prédio, metal batendo, madeira rangendo, um alarme de carro ao longe e, à noite, tiros distantes.

## 1.04.001

- **Palavras-chave em destaque:** no registro, nas dicas, nas descrições, nas notificações e nas janelas, termos importantes ganham cor e negrito: perigo em vermelho (horda, zumbis, Abominação, mortes, fome), vida em verde (sobreviventes, remédios, vida, Cura), recompensas em dourado (Esperança, Legado, cash, conquistas), e cores próprias para comida, sucata, munição, pesquisa e muro. No modo para daltonismo, vermelho e verde viram laranja e azul.

## 1.04.000

Mira manual e armas do líder.

- **Mira:** durante a horda, o cursor vira uma mira e o clique atira no ponto mirado. Tiro fora do zumbi erra. De dia, clicar no cenário não vasculha mais: use o botão 🔍 Vasculhar (ou V).
- **Sete armas do líder**, numa aba nova (🔫 Armas): Pistola, Espingarda (5 projéteis em leque), Rifle de caça (atravessa zumbis), Submetralhadora (segure para atirar), Lança-granadas (dano em área), Lança-chamas (incendeia a área) e a **Bazuca**, que mata qualquer zumbi comum da área com um tiro e tira 40% da vida da Abominação. A Bazuca só é liberada na onda 25 e depois de derrotar 5 Abominações.
- **Compra e melhorias:** armas são compradas com recursos da cidade e ficam para sempre (sobrevivem a evacuações e a novos mundos). Cada uma vai até o nível 5, com mais dano, cadência e munição, e melhorias próprias (mais projéteis, mais zumbis atravessados, área maior, fogo mais longo).
- **Munição própria por noite:** cada arma recarrega no início da horda e não usa a munição dos guardas. Zumbis que você abate têm 20% de chance de deixar munição extra para as suas armas. A Pistola tem munição infinita.
- **Quatro espaços (Q W E R):** escolha quais armas levar. Troque durante a horda com Q W E R, com a roda do mouse ou tocando na barra de armas sobre o cenário.
- Cada arma tem som e efeito próprios: granadas em arco, foguete com rastro de fumaça, zumbis em chamas, explosão maior da Bazuca.
- A melhoria permanente **Mira do líder** agora dá +40% de dano das suas armas por nível (antes +1 de dano).
- **Atalhos:** Recrutar passou do R para o **G**; a tecla 0 abre a 10ª aba.

## 1.03.000

Tiros errados e precisão.

- **Guardas e torres podem errar:** guardas começam acertando 65% dos tiros e torres 80%. O tiro errado passa raspando, levanta poeira no chão e às vezes ricocheteia, e **também gasta munição**. O clique do jogador continua acertando sempre.
- **Precisão evolui com o jogo** (até 95%): o Treinamento de tiro agora dá +3% de precisão por nível, a nova pesquisa **🔭 Miras ópticas** dá +5% por nível, o talento Boa mira dá +2% por pessoa e o herói Atirador dá metade do bônus dele em precisão.
- O painel de defesa mostra a precisão atual de guardas e torres, e o alerta de munição passou a considerar os tiros errados.
- No progresso offline, as ondas usam a mesma precisão do jogo ao vivo, no lugar do desconto fixo de antes.
- **Compensação no começo:** os zumbis das 6 primeiras ondas são mais fracos (30% menos vida na onda 1, chegando ao normal na onda 7) e o jogo começa com 40 de munição em vez de 30.

## 1.02.000

Configurações, estilos e um grupo com mais personalidade.

- **Configurações (⚙️):** nova janela com tudo em um lugar: música e efeitos, volume geral, da música e dos efeitos, estilo musical, estilo do cenário, velocidade, acessibilidade, exportar/importar e rever as dicas do tutorial. As preferências ficam salvas no navegador.
- **Três estilos musicais:** Clássica (a trilha original), Synthwave e Terror (caixinha de música desafinada e drones de dia; batidas industriais, coração acelerado e cordas em trêmulo à noite).
- **Estilos do cenário:** Clássico, Synthwave (céu roxo, sol listrado e prédios em neon) e Terror (céu cinzento e neblina constante). O modo Automático acompanha o estilo da música.
- **Memorial:** quem morre entra numa lista na aba Equipe, com a causa, a onda e a cidade. O memorial sobrevive a evacuações e a novos mundos.
- **Talentos:** cerca de 1 em cada 3 sobreviventes chega com um talento (Boa mira, Mão verde, Come pouco, Força bruta e outros) que dá um bônus ao grupo enquanto a pessoa estiver viva.
- **Velocidade 2x:** botão ao lado de Vasculhar (atalho F) que acelera o dia. Na horda o jogo volta à velocidade normal, e o progresso offline não é acelerado.
- **Acessibilidade:** opções para reduzir efeitos visuais, desligar o tremor de tela e trocar verde e vermelho por azul e laranja nos avisos.
- **Pausa congela o cenário:** com o jogo pausado, os personagens, o fogo e as partículas param (a música continua tocando) e não dá para vasculhar.
- O controle de volume saiu do cabeçalho e foi para as Configurações; os botões de música e efeitos continuam lá.

## 1.01.001

- Nova trilha em estilo **synthwave**: de dia, pads de sintetizador, baixo pulsando em oitavas, arpejo com eco e bateria eletrônica suave; à noite, uma versão darksynth mais rápida e pesada, com baixo em semicolcheias, bumbo nos quatro tempos e um tema de lead. Os efeitos sonoros não mudaram.

## 1.01.000

Eventos, comerciante e qualidade de vida.

- **Dilemas:** de tempos em tempos, de dia, o abrigo enfrenta uma situação com escolha (alguém ferido no portão, saqueadores, uma caixa de suprimentos, briga por comida e outras). O jogo pausa até você decidir.
- **Comerciante ambulante:** aparece durante o dia com três ou quatro trocas de recursos, às vezes uma oferta rara (amostra, arma ou um sobrevivente). Vai embora depois de um tempo ou quando a horda chega.
- **Sobreviventes com nome:** cada pessoa do grupo tem nome, que aparece no registro quando alguém chega, morre ou não volta de uma expedição. A lista completa fica na aba Equipe.
- **Desafios de prestígio:** ao evacuar, escolha desafios opcionais para a nova cidade (sem torres, escassez, hordas maiores e outros). Cada um aumenta a Esperança ganha nela.
- **Exportar e importar o progresso:** gere um código (ou arquivo .txt) do save para fazer backup ou continuar em outro aparelho.
- **Tutorial curto:** dicas que aparecem uma vez, no momento certo, no primeiro jogo. Dá para pular.
- **Atalhos de teclado:** 1 a 9 trocam de aba, Espaço pausa, V vasculha, R recruta, C conserta o muro, M tira o som, O abre o comerciante e H mostra a lista.
- **Alertas de recursos:** o painel mostra quanto tempo a comida e a sucata ainda duram, avisa quando falta munição para a próxima horda e quando o muro está fraco perto do anoitecer.

## 1.00.000

Primeira versão publicada.

- Abrigo com seis funções de sobreviventes, construções, fome e recrutamento.
- Hordas em tempo real com seis tipos de zumbi, incluindo a Abominação a cada 10 ondas.
- Cena em pixel art no Canvas com ciclo de dia e noite, partículas e efeitos.
- Música generativa e efeitos sonoros sintetizados com a Web Audio API.
- Expedições, distritos da cidade e heróis com armas de quatro raridades.
- Pesquisa com laboratório, amostras, 14 tecnologias e automações.
- Prestígio em duas camadas: evacuação (Esperança) e a Cura (Legado).
- Noites especiais, conquistas, desafios semanais, loja de boosts e recordes.
- Quatro níveis de dificuldade e progresso offline de até 8 horas.
