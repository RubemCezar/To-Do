# Alexa → Tarefas

Fluxo: **Alexa → skill (Alexa-hosted) → Worker da Cloudflare (D1) → app busca e cria a tarefa.**

- `alexa/worker.js` + `alexa/schema.sql`: caixa de entrada na nuvem (Cloudflare Worker + D1). Segredo `APP_KEY`; banco ligado como `DB`.
- `skill-package/`: manifesto e modelo de voz (pt-BR, "meu caderno", 66 formas de pedir).
- `lambda/`: código da skill. Troque `API_URL` e `API_KEY` antes de fazer o Deploy (**nunca** commite a chave).
- Importar no console da Alexa: Create Skill → Custom → Alexa-hosted (Node.js) → Import skill → `https://github.com/RubemCezar/to-do.git`.
- No app: menu ⋯ → "Conectar Alexa" e colar o código de conexão (fica só no aparelho, fora do backup).

## Nome de chamada
Nome atual: **"minha lista"**. Testado no simulador: "abra minha lista" e "peça à minha lista para adicionar …" chamam a skill.
Atenção: "minhas tarefas" colide com a lista nativa da Alexa (que responde no lugar da skill). A frase sem "peça à/ao" ("adicione X na minha lista") **sempre** vai para a lista nativa: a Amazon encerrou a List Skill API em 01/07/2024 e não há como redirecioná-la.
Resposta "Pronto/Feito/Beleza, adicionei…" = foi para o app. "Incluí … na sua lista de tarefas" = foi para a lista nativa.
Ao importar a skill, o console reseta o nome para "change me": ajuste em Build → JSON Editor e faça Build.
