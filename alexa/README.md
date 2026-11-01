# Alexa → Tarefas

Fluxo: **Alexa → skill (Alexa-hosted) → Worker da Cloudflare (D1) → app busca e cria a tarefa.**

- `worker.js` + `schema.sql`: caixa de entrada na nuvem (Cloudflare Worker + D1). Segredo `APP_KEY`; banco ligado como `DB`.
- `interaction-model.pt-BR.json`: modelo de voz da skill ("minhas tarefas", ~46 formas de pedir).
- `skill/`: código da skill. Troque `API_URL` e `API_KEY` antes de publicar (**nunca** commite a chave).
- No app: menu ⋯ → "Conectar Alexa" e colar o código de conexão (fica só no aparelho, fora do backup).
