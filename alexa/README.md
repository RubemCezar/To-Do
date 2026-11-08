# Alexa → Tarefas

Fluxo: **Alexa → skill (Alexa-hosted) → Worker da Cloudflare (D1) → app busca e cria a tarefa.**

- `alexa/worker.js` + `alexa/schema.sql`: caixa de entrada na nuvem (Cloudflare Worker + D1). Segredo `APP_KEY`; banco ligado como `DB`.
- `skill-package/`: manifesto e modelo de voz (pt-BR, "meu caderno", 66 formas de pedir).
- `lambda/`: código da skill. Troque `API_URL` e `API_KEY` antes de fazer o Deploy (**nunca** commite a chave).
- Importar no console da Alexa: Create Skill → Custom → Alexa-hosted (Node.js) → Import skill → `https://github.com/RubemCezar/to-do.git`.
- No app: menu ⋯ → "Conectar Alexa" e colar o código de conexão (fica só no aparelho, fora do backup).

## Nome de chamada
Nome atual: **"pendências"**. Use SEMPRE a frase completa: **"Alexa, peça às pendências para adicionar comprar pão amanhã"** (lista específica: "… na lista do mercado"). "abra …" não funciona em aparelhos reais com nenhum nome.
Histórico: "minha lista" funcionou uma vez no app da Alexa, mas depois a Alexa passou a mandar tudo para a lista nativa (colisão com a palavra lista). "planner" gerou "não é possível iniciar" no Echo; "minhas tarefas" colidiu com a lista nativa; "bloquinho azul" funcionou mas foi rejeitado por gosto. Evite lista, tarefas, compras, lembretes, agenda e rotina no nome.
A frase sem "peça ao/à" ("adicione X na minha lista") **sempre** vai para a lista nativa: a Amazon encerrou a List Skill API em 01/07/2024 e não há como redirecioná-la.
Resposta "Pronto/Feito/Beleza, adicionei…" = foi para o app. "Incluí … na sua lista de tarefas" = foi para a lista nativa.
Ao importar a skill, o console reseta o nome para "change me": ajuste em Build → JSON Editor e faça Build.
