const rawUrl = process.argv[2];

if (!rawUrl) {
  console.error("Usage: node scripts/check-mcp.mjs <connector-url>");
  process.exit(1);
}

function maskUrl(value) {
  try {
    const url = new URL(value);
    if (url.searchParams.has("key")) url.searchParams.set("key", "***");
    return url.toString();
  } catch {
    return "<invalid url>";
  }
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function parseBody(text, contentType) {
  if (contentType.includes("text/event-stream")) {
    const messages = [];
    for (const line of text.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data) messages.push(JSON.parse(data));
    }
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }
  return text ? JSON.parse(text) : null;
}

let nextId = 1;

async function post(payload, expectResponse) {
  let response;
  try {
    response = await fetch(rawUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    fail(`request to ${maskUrl(rawUrl)} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const text = await response.text();
  if (!response.ok) {
    fail(`${payload.method}: HTTP ${response.status} ${text.slice(0, 500)}`);
  }
  if (!expectResponse) return null;
  let message;
  try {
    message = parseBody(text, response.headers.get("content-type") ?? "");
  } catch (error) {
    fail(`${payload.method}: cannot parse response: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!message) fail(`${payload.method}: empty response`);
  if (message.error) fail(`${payload.method}: JSON-RPC error ${JSON.stringify(message.error)}`);
  return message.result;
}

async function request(method, params) {
  return post({ jsonrpc: "2.0", id: nextId++, method, params }, true);
}

console.log(`Checking MCP server at ${maskUrl(rawUrl)}`);

const init = await request("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "check-mcp", version: "1.0.0" },
});
console.log(`initialize: ${init.serverInfo?.name ?? "?"} ${init.serverInfo?.version ?? ""} (protocol ${init.protocolVersion})`);

await post({ jsonrpc: "2.0", method: "notifications/initialized" }, false);

const tools = await request("tools/list", {});
const names = (tools.tools ?? []).map((tool) => tool.name);
console.log(`tools/list: ${names.join(", ")}`);

const result = await request("tools/call", { name: "list_briefs", arguments: {} });
if (result.isError) {
  fail(`list_briefs returned error: ${result.content?.[0]?.text ?? JSON.stringify(result)}`);
}
console.log("list_briefs:");
console.log(JSON.stringify(result.structuredContent ?? result.content, null, 2));
console.log("OK");
