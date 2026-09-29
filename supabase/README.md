# Ranking online (Supabase)

O jogo so usa o ranking quando `supabaseEndereco` e `supabaseChavePublica` estao preenchidos no `GameV2.js`.

## Como ligar

1. Crie um projeto no Supabase (plano gratis; regiao Sao Paulo).
2. Em Authentication > Sign In / Providers, ligue **Anonymous sign-ins**.
3. Rode `migrations/20260929000000_ranking.sql` no SQL Editor (ou pela API de gerenciamento).
4. Publique a funcao `functions/partida` (index.ts e regras.ts) com o nome `partida`.
5. Preencha no `GameV2.js` o endereco do projeto (`https://<ref>.supabase.co`) e a chave publica (anon/publishable).

## Regras

`functions/partida/regras.ts` usa os mesmos limites do vigia do jogo (troncos por segundo, granulados por tronco
e por segundo, altura por tronco). Teste com:

    node --experimental-strip-types supabase/functions/partida/regras.test.ts
