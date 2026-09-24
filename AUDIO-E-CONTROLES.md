# Revisão: um jogador contra a máquina

## Áudio

Trilha original gerada por síntese no navegador, sem arquivos de música, gravações ou samples de terceiros. Não utiliza melodias, vozes nem efeitos extraídos de Street Fighter. O código de composição acompanha o projeto em dist/audio.js; não há assinatura, compra de faixa ou biblioteca de áudio necessária.

Abertura: tema eletrônico a 124 BPM, baixo, bateria, acordes e melodia sintetizada por modulação de frequência. Seleção: variação a 136 BPM, arpejos e nova linha melódica. Efeitos distintos para navegar, começar, confirmar, voltar e abrir controles. Volume limitado e botão de mute disponível.

O navegador exige uma primeira interação para iniciar o áudio. Pressione uma tecla, toque na página ou use SOM: ATIVAR. A trilha é suspensa ao ocultar a aba. O botão de som não altera a seleção.

## Birrow

Setas horizontais andam; cima pula; baixo agacha; segurar para trás defende (baixo + trás defende golpes baixos). As direções de defesa e os comandos clássicos acompanham o lado do adversário.

J: soco rápido. K: chute frontal. U: soco forte. I: rasteira. L: Batida Neon, onda sonora de uma unidade ativa por vez. O: Giro da Pista, rasteira giratória. Shift: Passinho, avanço sem invulnerabilidade. Os especiais também terão meia-lua para frente + J e meia-lua para trás + K.

Proposta de balanceamento inicial em dist/fighters.js: vida 1000, velocidade 250 unidades/segundo, recuo 190, gravidade 1800, salto 650. Tempos de ataque expressos em quadros de simulação a 60 Hz. Valores ainda serão testados no combate.

## Primeiro adversário: Halfred

Palco Coral Way. Um pouco mais lento que Birrow, maior alcance e mesma vida inicial. Carga Rápida: investida elétrica com recuperação longa quando bloqueada. Pulso de Bateria: descarga de curta distância. CPU inicial com reação de 300 ms, decisões a cada 180 ms, no máximo dois golpes por sequência e sem acesso a comandos futuros do jogador. Parâmetros propostos, não IA implementada.

## Estado desta entrega

Abertura, fade, Start, seleção, música, efeitos, consulta de controles e confirmação de confronto funcionam. Não há escolha de segundo jogador humano. Halfred é o adversário padrão; ao selecionar Halfred, Birrow ocupa o lado da máquina.

O combate, as movimentações e a IA ainda não foram implementados; estão definidos para a próxima etapa. Meu Patron e Cesar continuam disponíveis como prévias no elenco.

O gerador bloqueou o pedido de logo transparente isolado. Não foi produzido um PNG separado: a abertura usa a arte aprovada completa com o logo incorporado, e a seleção usa o cabeçalho da composição original. A caixa em torno de Start foi removida; a área inferior recebe a versão limpa da arte para eliminar a antiga opção de dois jogadores.

Publicação externa continua pendente de autorização após bloqueio anterior da revisão automática. Esta revisão permanece local.
