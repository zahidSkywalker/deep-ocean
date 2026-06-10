import http from "http";
import fs from "fs";
import path from "path";
import os from "os";

const VALID_TOKEN = "echo-agent-ded88850c74e66049b708806b9f9adccaa5879e249033a39";
const ZAI_BASE_URL = "https://internal-api.z.ai/v1";
const ZAI_API_KEY = "Z.ai";

function loadZaiConfig() {
  const paths = [
    path.join(process.cwd(), ".z-ai-config"),
    path.join(os.homedir(), ".z-ai-config"),
    "/etc/.z-ai-config",
  ];
  for (const p of paths) {
    try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch {}
  }
  return {};
}
const zaiConfig = loadZaiConfig();
console.log("[relay] Config loaded");

// Prevent crashes from unhandled rejections
process.on("unhandledRejection", (err) => {
  console.error("[relay] Unhandled rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("[relay] Uncaught exception:", err);
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
    // Timeout after 10s
    setTimeout(() => reject(new Error("Body read timeout")), 10000);
  });
}

const server = http.createServer((req, res) => {
  // Handle async with explicit error boundary
  (async () => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    console.log("[relay]", req.method, req.url);

    if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "alive", service: "zai-relay", v: "3.0" }));
    }

    if (req.method === "POST" && req.url === "/api/chat") {
      const authHeader = req.headers["authorization"] || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (token !== VALID_TOKEN) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Unauthorized" }));
      }

      console.log("[relay] Auth passed, reading body...");
      const raw = await readBody(req);
      console.log("[relay] Body received:", raw.length, "bytes");

      let body;
      try { body = JSON.parse(raw); } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Invalid JSON" }));
      }

      const { message, system_prompt, conversation_history, max_tokens = 2048, temperature = 0.7 } = body;

      const messages = [];
      if (system_prompt) messages.push({ role: "system", content: system_prompt });
      if (conversation_history) {
        for (const m of conversation_history) {
          if (m.role !== "system") messages.push({ role: m.role, content: m.content });
        }
      }
      if (message) {
        const last = conversation_history ? conversation_history[conversation_history.length - 1] : null;
        if (!last || last.content !== message || last.role !== "user") {
          messages.push({ role: "user", content: message });
        }
      }

      console.log("[relay] Calling Z.ai API...");

      const hdrs = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + ZAI_API_KEY,
        "X-Z-AI-From": "Z",
      };
      if (zaiConfig.chatId) hdrs["X-Chat-Id"] = zaiConfig.chatId;
      if (zaiConfig.userId) hdrs["X-User-Id"] = zaiConfig.userId;
      if (zaiConfig.token) hdrs["X-Token"] = zaiConfig.token;

      const apiRes = await fetch(ZAI_BASE_URL + "/chat/completions", {
        method: "POST",
        headers: hdrs,
        body: JSON.stringify({
          messages,
          max_tokens,
          temperature,
          thinking: { type: "disabled" },
        }),
      });

      console.log("[relay] API responded:", apiRes.status);
      const data = await apiRes.json();
      const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "No response";

      console.log("[relay] Done:", reply.substring(0, 50));
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: true, response: reply, model: data.model, usage: data.usage }));
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Not found" }));
  })().catch((err) => {
    console.error("[relay] Handler error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });
});

server.listen(4000, "0.0.0.0", () => {
  console.log("[relay] Listening on :4000");
});
