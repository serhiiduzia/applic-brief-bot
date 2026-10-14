const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
const baseArg = process.argv[2];

if (!token || !secret) {
  console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET in environment.");
  console.error("Usage: node --env-file=.env.local scripts/set-webhook.mjs https://<domain>");
  process.exit(1);
}

if (!baseArg) {
  console.error("Missing base URL argument.");
  console.error("Usage: node --env-file=.env.local scripts/set-webhook.mjs https://<domain>");
  process.exit(1);
}

const base = baseArg.replace(/\/+$/, "");

async function callTelegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  try {
    return await response.json();
  } catch {
    return { ok: false, error_code: response.status, description: response.statusText };
  }
}

async function main() {
  const webhookUrl = `${base}/api/telegram`;
  console.log(`Setting webhook to ${webhookUrl}`);
  const result = await callTelegram("setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
  console.log("setWebhook:", JSON.stringify(result, null, 2));

  const info = await callTelegram("getWebhookInfo", {});
  console.log("getWebhookInfo:", JSON.stringify(info, null, 2));

  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed: ${message.split(token).join("***")}`);
  process.exit(1);
});
