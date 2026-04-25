// /api/webhook.js — Proxy do Mercado Pago para o Apps Script
// Vercel cria automaticamente o endpoint: https://planilhavida.com.br/api/webhook

// COLE AQUI A URL DO SEU APPS SCRIPT (a /exec)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxm8HQticCtrVjf2vm6BVJnW-KhE-DB-r5Ybmoa_S1k2H-6yKAH_JIhvUi3ezBV92U/exec";

export default async function handler(req, res) {
  // Logs pra debug (visíveis no painel do Vercel → Logs)
  console.log("Webhook recebido:", {
    method: req.method,
    query: req.query,
    body: req.body,
  });

  // Sempre responde 200 rapidamente pro Mercado Pago não retentar
  res.status(200).send("OK");

  // Em paralelo, repassa a notificação pro Apps Script (segue redirects)
  try {
    // Monta a URL com query string se vier
    const queryString = new URLSearchParams(req.query).toString();
    const targetUrl = APPS_SCRIPT_URL + (queryString ? "?" + queryString : "");

    const body =
      typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body || {});

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: req.method === "POST" ? body : undefined,
      redirect: "follow",
    });

    const text = await response.text();
    console.log("Apps Script respondeu:", response.status, text.substring(0, 200));
  } catch (err) {
    console.error("Erro ao repassar pro Apps Script:", err);
  }
}
