# Alexa → Tarefas

Fluxo: **Alexa → skill (Alexa-hosted) → Worker da Cloudflare (D1) → app busca e cria a tarefa.**

- `alexa/worker.js` + `alexa/schema.sql`: caixa de entrada na nuvem (Cloudflare Worker + D1). Segredo `APP_KEY`; banco ligado como `DB`.
- `skill-package/`: manifesto e modelo de voz (pt-BR, "meu caderno", 66 formas de pedir).
- `lambda/`: código da skill. Troque `API_URL` e `API_KEY` antes de fazer o Deploy (**nunca** commite a chave).
- Importar no console da Alexa: Create Skill → Custom → Alexa-hosted (Node.js) → Import skill → `https://github.com/RubemCezar/to-do.git`.
- No app: menu ⋯ → "Conectar Alexa" e colar o código de conexão (fica só no aparelho, fora do backup).

## Nome de chamada
O nome **"meu caderno"** foi escolhido de propósito: "minhas tarefas" colide com a lista de tarefas nativa da Alexa, que responde no lugar da skill.
Exemplos: "Alexa, peça ao meu caderno para adicionar comprar pão amanhã" · "Alexa, abra meu caderno".
Ao importar a skill, o console reseta o nome para "change me": ajuste em Build → Invocations (ou no JSON Editor) e faça Build.
