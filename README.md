# ☣ Último Abrigo

Jogo idle de sobrevivência zumbi para navegador, feito em **JavaScript puro**, sem frameworks, sem bibliotecas e sem nenhum arquivo de imagem ou áudio: os gráficos em pixel art são desenhados no Canvas e toda a música e os efeitos sonoros são sintetizados em tempo real com a Web Audio API.

**[▶ Jogar agora](https://fernandofiorini.github.io/Ultimo-Abrigo/)**

![Horda atacando o abrigo durante uma Lua de Sangue, com a Abominação em cena](assets/screenshot.png)

## Sobre o jogo

Você lidera um pequeno grupo de sobreviventes num armazém abandonado. De dia, distribui as pessoas entre funções, constrói defesas e manda expedições atrás de suprimentos. À noite, a horda ataca o muro em tempo real, e você pode ajudar atirando nos zumbis com um clique.

O jogo continua progredindo com a aba fechada: ao voltar, as ondas que aconteceram enquanto você estava fora são resolvidas e o resultado é resumido.

## Destaques técnicos

- **Zero dependências e zero assets.** Todos os personagens, prédios, efeitos e o ciclo de dia e noite são desenhados com primitivas do Canvas 2D. A trilha (calma de dia, tensa durante a horda) e mais de 30 efeitos sonoros são gerados por osciladores, filtros e ruído da Web Audio API.
- **Simulação desacoplada da renderização.** A lógica roda pelo relógio do jogo, o que permite pausar, simular horas de progresso offline e resolver ondas instantaneamente quando a aba fica em segundo plano. A cena anima pelo tempo real dos quadros.
- **Combate em tempo real com fallback analítico.** Ao vivo, cada zumbi, tiro e impacto é simulado. Offline, a mesma onda é resolvida por uma estimativa da cadência de tiro durante a duração da onda, para que o resultado seja coerente nos dois modos.
- **Balanceamento guiado por simulação.** As curvas de dificuldade foram ajustadas com um jogador automatizado que joga uma hora em cada nível sem intervenção.
- **Arquitetura orientada a eventos.** A lógica emite eventos (`shot`, `zdeath`, `waveStart`…) que a cena e o áudio consomem, sem que a simulação conheça a apresentação.
- **Saves compatíveis entre versões.** O save é mesclado com o estado padrão, então campos adicionados em versões novas não quebram progressos antigos.

## Sistemas

| Sistema | Descrição |
|---|---|
| Sobreviventes | Cada um com nome (e às vezes um talento), em seis funções (forrageiro, coletor, armeiro, guarda, médico, cientista), com consumo de comida, risco de fome e um memorial para quem morreu |
| Armas do líder | Mira manual na horda e sete armas com melhorias (da pistola à bazuca), munição própria por noite e até 3 armas por noite, em (Q) (W) (E) |
| Invasão | Se o muro cair, os zumbis entram no abrigo e os sobreviventes lutam corpo a corpo. Quem é alcançado morre, escapa ferido (precisa de médico) ou é mordido, e cada mordida pede uma decisão: matar (luto no grupo) ou liberar (pode voltar transformado na horda seguinte, ou curado) |
| Combate | Guardas e torres com precisão que evolui por treinamento, pesquisa, talentos e heróis; tiros errados também gastam munição |
| Hordas | Ondas crescentes com seis tipos de zumbi: comum, corredor, brutamontes, cuspidor, inchado (explode) e a Abominação, chefe a cada 10 ondas |
| Noites especiais | Lua de Sangue, Neblina, Horda Dupla, Chuva Ácida e Noite dos Corredores, cada uma com regras e visual próprios |
| Expedições e distritos | Missões com risco de morte e recompensas; esquadrões libertam distritos da cidade em troca de bônus |
| Pesquisa | Laboratório, amostras coletadas de zumbis especiais e uma árvore com 14 tecnologias, incluindo automações |
| Heróis | Personagens permanentes com classe, nível e armas de quatro raridades |
| Prestígio em duas camadas | Evacuar a cidade gera Esperança e melhorias permanentes; concluir a pesquisa da Cura inicia um Novo Mundo com Legado |
| Eventos | Dilemas com escolha durante o dia e um comerciante ambulante com trocas por tempo limitado |
| Desafios de prestígio | Regras opcionais para cada nova cidade que aumentam a Esperança ganha |
| Configurações | Três estilos musicais (Clássica, Synthwave e Terror), três estilos de cenário, volumes separados, velocidade 2x de dia e opções de acessibilidade |
| Metajogo | 36 conquistas, desafios semanais, loja de boosts, recordes por dificuldade e quatro níveis de dificuldade |

## Como jogar

1. Escolha a dificuldade.
2. Na aba **Equipe**, distribua os sobreviventes: comida primeiro, depois guardas e armeiros para a munição.
3. Construa barracas para abrigar mais gente e torres e muro para aguentar as hordas.
4. Durante a noite, mire e clique para atirar com o líder ((Q) (W) (E) trocam de arma). De dia, use o botão Vasculhar para juntar recursos.
5. Ao sobreviver à onda 10, evacue para ganhar Esperança e recomeçar mais forte.

### Atalhos de teclado

| Tecla | Ação |
|---|---|
| `1` a `0` | Trocar de aba |
| `Q` `W` `E` `R` | Trocar de arma na horda (ou a roda do mouse) |
| `Espaço` | Pausar / continuar |
| `V` | Vasculhar |
| `G` | Recrutar |
| `C` | Consertar o muro |
| `F` | Velocidade 2x durante o dia |
| `M` | Ligar / desligar o som |
| `O` | Abrir o comerciante |
| `H` ou `?` | Lista de atalhos |

### Backup do progresso

O progresso fica salvo no navegador. Use **Exportar** no rodapé para gerar um código (ou baixar um `.txt`) e **Importar** para carregá-lo em outro navegador ou aparelho.

## Estrutura do projeto

```
index.html          interface e ordem de carregamento dos scripts
css/style.css       layout, tema escuro e responsividade
js/
  config.js         constantes de balanceamento e tabelas de dados (zumbis, funções, construções, dificuldades)
  settings.js       configurações do aparelho (áudio, estilos, acessibilidade) e a janela de configurações
  state.js          estado do jogo, multiplicadores derivados e barramento de eventos
  combat.js         hordas: surgimento, movimento, tiros, dano ao muro e resolução offline
  simulation.js     passo de simulação, progresso offline e controle de tempo
  progression.js    expedições e evacuação (prestígio)
  invasion.js       muro caído: luta dentro do abrigo, feridos, médicos e a decisão sobre os mordidos
  debug.js          menu de debug para montar cenários de teste (F9; exige DEV_MODE = true em config.js e rodar localmente)
  achievements.js   conquistas e estatísticas
  shop.js           loja e moeda rara
  actions.js        ações disparadas pelo jogador
  save.js           salvar, carregar, migrar saves antigos, exportar e importar
  ui.js             painéis, abas, notificações e seletor de dificuldade
  weapons.js        armas do líder: mira, tiros, explosões, fogo, munição e melhorias
  endgame.js        pesquisa, a Cura, noites especiais, distritos, heróis e desafios semanais
  events.js         dilemas com escolha e comerciante ambulante
  tutorial.js       dicas do primeiro jogo e atalhos de teclado
  scene.js          renderização em pixel art no Canvas, com três estilos visuais
  audio.js          música generativa em três estilos e efeitos sonoros sintetizados
  main.js           inicialização e laço principal
```

Os scripts são carregados em ordem pelo `index.html`, sem etapa de build.

## Rodando localmente

Não há dependências. Basta abrir o `index.html` no navegador.

Se preferir um servidor local:

```bash
npx serve .
# ou
python -m http.server
```

## Publicando no GitHub Pages

1. Envie o projeto para um repositório no GitHub.
2. Em **Settings → Pages**, escolha **Deploy from a branch**, a branch `main` e a pasta `/ (root)`.
3. Após alguns minutos o jogo fica disponível em `https://fernandofiorini.github.io/Ultimo-Abrigo/`.

## Versionamento

A versão atual aparece no rodapé do jogo e o histórico está no [CHANGELOG](CHANGELOG.md). O formato é `MAIOR.MÉDIA.PEQUENA` (ex.: `1.00.000`): ajustes sobem o último número, novos recursos sobem o do meio e as maiores atualizações sobem o primeiro.

## Tecnologias

HTML5 · CSS3 · JavaScript (ES2020) · Canvas 2D · Web Audio API · localStorage
