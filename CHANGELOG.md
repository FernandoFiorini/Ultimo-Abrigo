# Changelog

As versões seguem o formato `MAIOR.MÉDIA.PEQUENA`:

- **Pequena** (`1.00.000` → `1.00.001`): correções e ajustes pontuais.
- **Média** (`1.00.000` → `1.01.000`): novos recursos ou mudanças grandes.
- **Maior** (`1.00.000` → `2.00.000`): as maiores atualizações, que mudam o jogo como um todo.

## 1.07.000

Apocalipse, saves e vitória.

- **O jogo agora se chama Voidfall** (antes: Último Abrigo). Os saves continuam valendo.

- **Nova dificuldade 🔥 Apocalipse**, acima do Pesadelo: hordas maiores e mais rápidas, zumbis bem mais fortes, especiais chegando 2 ondas antes, 60s entre hordas e produção −30%. Em troca: **Esperança ×4**, **Abominação vale 💵 20** e **saque das expedições ×1,5**.
- **Morte permanente no Apocalipse:** se o abrigo cair e todos morrerem, o save é **apagado**. Vale também para quedas durante o progresso offline. Saves do Apocalipse não podem ser exportados, e um código exportado antes da morte não pode ser importado de novo.
- **Dificuldade travada para cima:** cada save guarda a maior dificuldade em que já jogou e nunca pode voltar para uma menor (nem ao mudar a dificuldade, nem ao evacuar, nem num Novo Mundo). Assim não dá para juntar Esperança e cash numa dificuldade alta e voltar para uma fácil. Saves antigos ficam travados na dificuldade atual.
- **3 espaços de salvamento.** O save antigo vai para o espaço 1 automaticamente.
- **Menu principal** ao abrir o jogo: **Continuar** (último save), **Carregar** (lista dos espaços, com apagar), **Novo jogo** (espaço, nome do jogador e dificuldade), **Hall da Fama**, **Skins** e **Créditos**. No jogo, o botão **☰ Menu** (rodapé ou Configurações › Dados) salva e volta para ele. O antigo botão Reiniciar saiu: para recomeçar, apague o espaço no menu.
- **Vitória** (concluir a Cura), na primeira vez em cada dificuldade de um save:
  - 💵 cash extra (de 10 no Fácil a 150 no Apocalipse);
  - o **nome do jogador aparece num sobrevivente lendário** na frente do abrigo, com a roupa da dificuldade vencida, em todos os saves;
  - **skins do líder**: uma por dificuldade vencida (Escoteiro, Veterano, Caçador, Pesadelo e Lenda do Apocalipse, com coroa) e a **Personalizada**, com cores escolhidas pelo jogador. Troque em Configurações › Visual ou no menu;
  - **bandeira de troféu** no telhado, na cor da maior dificuldade vencida;
  - nome no **Hall da Fama** do menu e um **certificado de vitória** para enviar ao desenvolvedor e entrar no Hall da Fama do site (lista `HALL_OF_FAME` em `js/config.js`; confira com `Victory.verify('UAV1:...')` no console).
- **Heróis únicos:** os heróis agora são um elenco fixo de 12, cada um com **visual próprio** no cenário (capacete de obra, boina, moicano, tapa-olho, óculos, barba, mochila...) e uma **habilidade única** que vale enquanto ele estiver ativo, além do bônus da classe:
  - 🎯 Rafa (crítico +10%), Valéria (+50% de dano na Abominação), Dandara (+25% de dano das armas do líder);
  - 🔧 Tonhão (reparo do muro +60%), Dona Neide (construções −15%), Seu Batista (torres 20% mais rápidas);
  - ⚕️ Dona Cida (feridos se recuperam 50% mais rápido), Lúcia (+1 remédio por horda vencida);
  - 🧭 Bia (expedições e operações 20% mais rápidas), Caio (+15% de chance de achar sobreviventes);
  - 🎖️ Zeca (+2 vagas para sobreviventes), Marcão (−10% no consumo de comida).
- **Heróis bloqueados aparecem na aba Heróis**, com o visual, o bônus da classe, a habilidade e **onde conseguir** cada um: distritos, Abominação ou Base militar (cada origem traz heróis específicos; esgotada a origem, vem qualquer um que falta).
- Saves antigos: cada herói vira um do elenco (mesma classe, e o mesmo nome quando possível), mantendo nível, experiência e arma.
- **Munição especial, rara de propósito:** bazuca, lança-granadas e lança-chamas não usam a munição do abrigo. Ela não se perde ao evacuar, e a aba Armas mostra quanto você tem e onde conseguir.
  - 🚀 **Foguetes** (bazuca, 1 por tiro, máximo 3): 1 por Abominação derrotada e 5% na Base militar.
  - 💣 **Granadas** (lança-granadas, 1 por tiro, máximo 6): 2 por Abominação, 20% na Base militar, 8% na Delegacia e 10% ao abater um Policial blindado com as suas armas. O lança-granadas vem com 2 carregadas e 2 de reserva.
  - ⛽ **Tanques de combustível** (lança-chamas, cada tanque enche a arma, máximo 3): 1 por Abominação, 10% na Base militar, 10% no Ferro-velho e 5% ao abater um Inchado com as suas armas.
- **Bazuca, a arma do chefe:** 1 tiro por carga (mesmo com melhorias) e recarga de 8s.
- **Lança-granadas mais contido:** 2 granadas por carga, recarga de 4s (como a bazuca) e dano menor (de 14 para 10 no centro da explosão).
- **Corpos e sangue que se renovam:** o cenário começa limpo, sem manchas nem corpos antigos. Cada morte deixa corpo e sangue no chão, e durante a horda tudo fica onde caiu (até 40 corpos e 90 manchas; passando disso, os mais antigos desbotam). No fim de cada onda a maioria some em poucos segundos e só **4 ou 5 corpos e 5 a 8 manchas, sorteados**, ficam marcados no cenário. Eles continuam lá durante o dia e a noite seguinte e, no fim da próxima onda, dão lugar a outros sorteados dela, então o cenário muda a cada noite. Evacuar ou perder o abrigo limpa o chão.
- **Prévias animadas:** passe o mouse sobre uma arma (aba Armas), o Ataque aéreo, a Fúria ou o Reparo total (Loja) ou as pesquisas Perfuração, Ponta oca, Armadilhas e Cerca elétrica para ver um pequeno vídeo do que ela faz, num popup no estilo do jogo. As cenas são desenhadas ao vivo com os mesmos bonecos do jogo (sem arquivos de vídeo), mostram o dano de cada golpe e usam a skin do líder. Itens com prévia têm a etiqueta "▶ prévia".
- **Armas do líder rebalanceadas:**
  - **Menos dano:** a pistola tira 4 de vida de um zumbi comum que tem ~7 no começo do jogo e ~16 na onda 8. Ela não mata mais com um tiro; as melhorias, a pesquisa e os heróis é que fazem as armas crescerem. A melhoria permanente Mira do líder caiu de +40% para +20% de dano por nível.
  - **Pente e recarga:** cada arma tem pente (pistola 5, espingarda 2, rifle 5, submetralhadora 30, lança-granadas 2, lança-chamas 40, bazuca 1) e tempo de recarga. A recarga é automática com o pente vazio, ou com **(R)** durante a horda (de dia, R continua recrutando; G também recruta). Trocar de arma interrompe a recarga.
  - **Alcance:** cada arma alcança uma distância a partir do muro (espingarda e lança-chamas curto, pistola e submetralhadora médio, rifle longo). Uma linha tracejada no chão mostra o limite, e a mira fica vermelha com "fora de alcance". A espingarda perde força com a distância.
  - **Munição escassa:** a munição por noite acabou. Recarregar gasta a **🔫 munição do abrigo**, a mesma dos guardas (espingarda 2 por tiro, rifle 3, submetralhadora 0,5). Só a pistola é grátis; bazuca, lança-granadas e lança-chamas usam munição especial. Os zumbis que você abate às vezes deixam 1 a 3 de munição para o abrigo.
  - Na aba Armas, cada arma mostra dano, pente, recarga, alcance, custo por tiro e **quantos tiros derrubam um zumbi comum na onda atual**.
  - **Escala de vida e dano:** os números aparecem ×10 e inteiros (dano 4, vida 16). A barra da Abominação mostra a vida restante.
- **Guardas e torres** alcançam menos: atiram a partir de 160 px do muro em vez de 210 (antes pegavam zumbis quase na borda da tela).
- **Novo som do rifle de caça:** estampido pesado com estalo, soco grave, eco rolando pela cidade e o ferrolho sendo manejado. Novos sons de recarga.
- **Novos inimigos** (entram nas ondas aos poucos, a partir da onda 5; no Apocalipse, 2 ondas antes):
  - 🪨 **Arremessador:** para longe do muro e o acerta com pedras, de mais longe que o Cuspidor.
  - 😱 **Uivador:** ao morrer, solta um grito que deixa os zumbis em volta 30% mais rápidos (acumula até o dobro).
  - 🍄 **Hospedeiro:** ao morrer, espalha esporos que dão +30% de vida aos zumbis em volta (até 3 vezes). Os fortalecidos ganham um brilho roxo; os acelerados, um rastro vermelho.
  - 🪖 **Policial blindado:** tiros no corpo ricocheteiam. **Mire na cabeça** com as armas do líder; guardas e torres só acertam a cabeça de vez em quando (20% e 30%). Explosões ferem pela metade, e fogo, armadilhas e a bazuca funcionam normalmente.
- **Novas noites especiais:**
  - ⚠️ **Investida:** no meio da noite, depois de um alarme e contagem regressiva, pelo menos 20 zumbis chegam **todos de uma vez**. +50% de sucata.
  - 😡 **Horda Furiosa:** zumbis 40% mais resistentes e 30% mais rápidos, mas rendem o dobro de sucata, **comida a cada abate** e um prêmio de comida e munição no fim.
  - 🏴‍☠️ **Noite dos Saqueadores** (a partir da onda 6): **humanos** no lugar dos zumbis. Correm, golpeiam o muro duas vezes por segundo e os Incendiários jogam coquetéis molotov de longe. Deixam comida e munição, e quem eles alcançam dentro do abrigo pode se ferir, mas nunca é mordido.
- **Alarme de onda perigosa:** 10 segundos antes de uma noite perigosa (Investida, Horda Furiosa, Saqueadores ou Abominação), toca uma sirene, aparece um aviso piscando com a contagem no cenário e os últimos 5 segundos são marcados com bipes.
- Novas amostras: Arremessador (ácido), Uivador (gás), Hospedeiro e Policial blindado (tecido).
- Conquistas novas: Na cabeça (100 tiros na cabeça de blindados) e Daqui não passa (repelir 3 ataques de saqueadores).
- Conquistas novas: Fogo cruzado (onda 10 no Apocalipse), Inferno na Terra (onda 30) e Lenda do Apocalipse (vencer no Apocalipse).

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
