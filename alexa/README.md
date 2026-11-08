# Alexa → Tarefas

Fluxo: **Alexa → skill (Alexa-hosted) → Worker da Cloudflare (D1) → app busca e cria a tarefa.**

- `alexa/worker.js` + `alexa/schema.sql`: caixa de entrada na nuvem (Cloudflare Worker + D1). Segredo `APP_KEY`; banco ligado como `DB`.
- `skill-package/`: manifesto e modelo de voz (pt-BR, "meu caderno", 66 formas de pedir).
- `lambda/`: código da skill. Troque `API_URL` e `API_KEY` antes de fazer o Deploy (**nunca** commite a chave).
- Importar no console da Alexa: Create Skill → Custom → Alexa-hosted (Node.js) → Import skill → `https://github.com/RubemCezar/to-do.git`.
- No app: menu ⋯ → "Conectar Alexa" e colar o código de conexão (fica só no aparelho, fora do backup).

## Nome de chamada
Nome atual: **"meu planner"**. Chame com "Alexa, abra meu planner" e depois diga a tarefa, ou "Alexa, peça ao meu planner para adicionar …".
Histórico: "planner" (uma palavra) gerou "não é possível iniciar planner neste dispositivo" no Echo; use sempre duas palavras. "minhas tarefas" colidiu com a lista nativa; "minha lista" passou no simulador mas, no Echo real, a Alexa respondeu com a lista de compras nativa. Evite lista, tarefas, compras, lembretes, agenda e rotina no nome.
A frase sem "peça ao/à" ("adicione X na minha lista") **sempre** vai para a lista nativa: a Amazon encerrou a List Skill API em 01/07/2024 e não há como redirecioná-la.
Resposta "Pronto/Feito/Beleza, adicionei…" = foi para o app. "Incluí … na sua lista de tarefas" = foi para a lista nativa.
Ao importar a skill, o console reseta o nome para "change me": ajuste em Build → JSON Editor e faça Build.
