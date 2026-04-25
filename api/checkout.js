// /api/checkout.js — Cria preferência de pagamento no MP via API e redireciona pro checkout
// O cliente clica no botão -> vai pra /api/checkout -> redireciona pro Mercado Pago

export default async function handler(req, res) {
  // Token vem das variáveis de ambiente da Vercel (mais seguro que hardcoded)
  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

  if (!ACCESS_TOKEN) {
    return res.status(500).send("MP_ACCESS_TOKEN não configurado");
  }

  // URL base do site (pra retornos)
  const SITE_URL = "https://www.planilhavida.com.br";

  // Preferência de pagamento
  const preference = {
    items: [
      {
        title: "Planilha Financeira Pessoal",
        description: "Planilha completa com 9 abas + dashboard automático",
        quantity: 1,
        currency_id: "BRL",
        unit_price: 27.0,
      },
    ],
    notification_url: SITE_URL + "/api/webhook",
    back_urls: {
      success: SITE_URL + "/obrigado.html",
      pending: SITE_URL + "/obrigado.html",
      failure: SITE_URL,
    },
    auto_return: "approved",
    statement_descriptor: "VIDAFINANCEIRA",
    payment_methods: {
      installments: 3,
    },
  };

  try {
    const response = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preference),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro ao criar preferência:", data);
      return res
        .status(500)
        .send("Erro ao criar pagamento. Tente novamente em instantes.");
    }

    // Redireciona pro checkout do MP
    return res.redirect(302, data.init_point);
  } catch (err) {
    console.error("Erro:", err);
    return res
      .status(500)
      .send("Erro ao processar pagamento. Tente novamente.");
  }
}
