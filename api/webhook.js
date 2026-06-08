// /api/webhook.js — Proxy do Mercado Pago para o Apps Script
// Vercel cria automaticamente o endpoint: https://planilhavida.com.br/api/webhook

// COLE AQUI A URL DO SEU APPS SCRIPT (a /exec)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm8HQticCtrVjf2vm6BVJnW-KhE-DB-r5Ybmoa_S1k2H-6yKAH_JIhvUi3ezBV92U/exec";

export default async function handler(req, res) {
  console.log("Webhook recebido:", {
    method: req.method,
    query: req.query,
    body: req.body,
  });

  // Repassa ao Apps Script ANTES de responder ao MP.
  // Sem isso, o Vercel pode encerrar a função assim que res.send() retorna,
  // e o fetch nunca completa — a planilha nunca é enviada.
  try {
    const queryString = new URLSearchParams(req.query).toString();
    const targetUrl = APPS_SCRIPT_URL + (queryString ? "?" + queryString : "");

    const body =
      typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body || {});

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: req.method === "POST" ? body : undefined,
      redirect: "follow",
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const text = await response.text();
    console.log("Apps Script respondeu:", response.status, text.substring(0, 200));
  } catch (err) {
    console.error("Erro ao repassar pro Apps Script:", err.message);
  }

  // Responde 200 ao MP apenas após tentar repassar (MP aguenta até ~20s)
  res.status(200).send("OK");
}
