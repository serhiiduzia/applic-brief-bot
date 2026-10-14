# Brief Bot

Telegram-бот з AI, який брифує клієнтів природною мовою, та MCP-конектор для Claude, через який Claude читає брифи й профіль компанії, формує брендовану комерційну пропозицію (КП) і надсилає її клієнту від імені бота.

Усе деплоїться разом на Vercel:

| Шлях | Що робить |
| --- | --- |
| `/api/telegram` | вебхук бота (`GET` → `{"ok":true}`) |
| `/api/mcp?key=<MCP_ACCESS_KEY>` | MCP-сервер (Streamable HTTP, stateless) |
| `/api/proposal?id=<id>` | брендована сторінка КП з кнопкою «Завантажити PDF» |

## Запуск

```bash
npm install
npm run typecheck
```

1. Створіть `.env.local` за зразком `.env.example`.
2. Підключіть до проєкту Vercel базу Upstash for Redis (Storage → Create Database → Upstash for Redis → Connect to project), потім `npx vercel@latest env pull .env.local --yes`.
3. Додайте змінні в Production на Vercel і задеплойте (`git push` у `main`).
4. Зареєструйте вебхук: `node --env-file=.env.local scripts/set-webhook.mjs https://<project>.vercel.app`.
5. Перевірте MCP: `node scripts/check-mcp.mjs "https://<project>.vercel.app/api/mcp?key=<MCP_ACCESS_KEY>"`.

## Змінні середовища

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (необов'язково, за замовчуванням `gpt-5-mini`)
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (або `KV_REST_API_URL` / `KV_REST_API_TOKEN`)
- `MCP_ACCESS_KEY`

## Профіль компанії

Назва, опис, послуги, контакти, кольори, ставка й валюта: `src/domain/company.ts`. Лого: `public/logo.*` (у профілі шлях `/logo.<ext>`) або повний URL.

## Підключення до Claude

claude.ai → Settings → Connectors → Add custom connector → назва `Brief Bot`, URL `https://<project>.vercel.app/api/mcp?key=<MCP_ACCESS_KEY>` → Add.

Claude Code: `claude mcp add --transport http brief-bot "https://<project>.vercel.app/api/mcp?key=<MCP_ACCESS_KEY>"`.

URL з ключем працює як пароль до брифів: не діліться ним. Запит без ключа або з неправильним ключем отримує 404.

### Tools конектора

| Tool | Що робить |
| --- | --- |
| `get_company_profile` | профіль компанії (лого повним URL) |
| `list_briefs` | список брифів, найновіші першими (`limit`, `offset`) |
| `get_brief` | повний бриф за `chat_id` |
| `send_message` | надсилає клієнту текст від імені бота |
| `send_proposal` | зберігає КП і надсилає клієнту посилання на брендовану сторінку |

Надсилати можна лише на явне прохання користувача. Надіслані повідомлення й КП потрапляють в історію діалогу, тож бот бачить їх, коли клієнт відповідає.

## Ключі Redis

| Ключ | Вміст | TTL |
| --- | --- | --- |
| `chat:{chatId}` | історія діалогу (до 40 повідомлень) | 7 днів |
| `brief:{chatId}` | бриф (JSON) | без TTL |
| `briefs` | sorted set: `chatId` за часом створення брифу | без TTL |
| `proposal:{id}` | КП (JSON) | 180 днів |
| `update:{update_id}` | дедуплікація update | 1 день |
