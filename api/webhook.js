// api/webhook.js — Recebe notificação do Mercado Pago, busca email do pagador
// na API do MP e entrega o arquivo via Resend. Sem Apps Script.

import { readFileSync } from 'fs';
import { join } from 'path';

const MP_TOKEN   = process.env.MP_ACCESS_TOKEN;
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'VidaFinanceira <entrega@planilhavida.com.br>';

export default async function handler(req, res) {
  console.log('Webhook recebido:', req.method, JSON.stringify(req.body), 'query:', JSON.stringify(req.query));

  // MP usa dois formatos: novo (body.type) e legado IPN (query.topic)
  const type      = req.body?.type      || req.query?.topic;
  const paymentId = req.body?.data?.id  || req.query?.id;

  // Ignora notificações que não sejam de pagamento
  if (type !== 'payment' || !paymentId) {
    console.log('Ignorando notificação não-pagamento:', type);
    return res.status(200).send('OK');
  }

  try {
    // 1. Busca os detalhes do pagamento na API do Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    const payment = await mpRes.json();

    console.log('Pagamento:', payment.id, '| Status:', payment.status, '| Email:', payment.payer?.email);

    // Só entrega se aprovado
    if (payment.status !== 'approved') {
      console.log('Pagamento não aprovado, ignorando.');
      return res.status(200).send('OK');
    }

    const email     = payment.payer.email;
    const firstName = payment.payer.first_name || '';

    // 2. Lê o arquivo xlsx incluído no bundle da função
    const filePath   = join(process.cwd(), 'files', 'Financeiro.xlsx');
    const fileBase64 = readFileSync(filePath).toString('base64');

    // 3. Envia o email com o arquivo anexado via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:     FROM_EMAIL,
        reply_to: 'alex.anascimento99@gmail.com',
        to:       [email],
        subject:  'Sua Planilha Financeira chegou! - VidaFinanceira',
        headers:  { 'X-Priority': '1' },
        html:     buildEmail(firstName),
        attachments: [{ filename: 'PlanilhaFinanceira-VidaFinanceira.xlsx', content: fileBase64 }],
      }),
    });

    const emailData = await emailRes.json();
    console.log('Resend:', emailRes.status, JSON.stringify(emailData));

  } catch (err) {
    console.error('Erro ao processar webhook:', err.message);
  }

  res.status(200).send('OK');
}

function buildEmail(firstName) {
  const nome = firstName ? `, ${firstName}` : '';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sua Planilha chegou!</title></head>
<body style="margin:0;padding:0;background:#F5F0E4;font-family:'Helvetica Neue',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E4;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(15,27,60,.12)">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#0F1B3C 0%,#1A2A5C 100%);padding:36px 40px;text-align:center">
    <div style="font-family:Georgia,serif;font-size:26px;font-weight:700;color:#fff">
      Vida<span style="color:#DCAF3C">Financeira</span>
    </div>
    <div style="font-size:48px;margin:16px 0">🎉</div>
    <div style="font-family:Georgia,serif;font-size:24px;color:#fff;font-weight:700">
      Compra confirmada${nome}!
    </div>
    <div style="color:rgba(255,255,255,.7);font-size:15px;margin-top:8px">
      Sua planilha está anexada neste e-mail
    </div>
  </td></tr>

  <!-- BODY -->
  <tr><td style="padding:36px 40px">

    <!-- DESTAQUE -->
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="background:#FFF8EE;border-left:4px solid #DCAF3C;border-radius:0 12px 12px 0;padding:20px 24px;margin-bottom:24px">
      <div style="font-weight:700;color:#0F1B3C;font-size:16px;margin-bottom:6px">
        📎 Arquivo em anexo
      </div>
      <div style="color:#5A6275;font-size:14px;line-height:1.6">
        Procure por <strong>PlanilhaFinanceira-VidaFinanceira.xlsx</strong> nos anexos deste e-mail.
        Se não aparecer, confira a pasta <strong>Spam / Lixo Eletrônico</strong>.
      </div>
    </td></tr>
    </table>

    <div style="height:24px"></div>

    <!-- PASSOS -->
    <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#828795;margin-bottom:16px">
      Como começar
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="40" valign="top">
        <div style="width:32px;height:32px;background:#1F965A;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;text-align:center;line-height:32px">1</div>
      </td>
      <td style="padding:4px 0 16px 12px;color:#3A4256;font-size:15px">
        <strong>Baixe o arquivo</strong> clicando no anexo <em>PlanilhaFinanceira-VidaFinanceira.xlsx</em>
      </td>
    </tr>
    <tr>
      <td width="40" valign="top">
        <div style="width:32px;height:32px;background:#1F965A;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;text-align:center;line-height:32px">2</div>
      </td>
      <td style="padding:4px 0 16px 12px;color:#3A4256;font-size:15px">
        <strong>Abra no Excel</strong> OU faça upload no Google Drive (drive.google.com → Novo → Upload)
      </td>
    </tr>
    <tr>
      <td width="40" valign="top">
        <div style="width:32px;height:32px;background:#1F965A;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;text-align:center;line-height:32px">3</div>
      </td>
      <td style="padding:4px 0 4px 12px;color:#3A4256;font-size:15px">
        <strong>Vá na aba "📖 Como Usar"</strong> — tem 5 passos simples para configurar tudo hoje
      </td>
    </tr>
    </table>

    <div style="height:28px"></div>

    <!-- GARANTIA -->
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="background:rgba(31,150,90,.08);border:1px solid rgba(31,150,90,.2);border-radius:12px;padding:18px 24px;text-align:center">
      <div style="font-weight:700;color:#146E45;font-size:15px">🛡️ Garantia de 7 dias</div>
      <div style="color:#5A6275;font-size:13px;margin-top:6px;line-height:1.6">
        Se por qualquer motivo você não gostar, respondendo este e-mail devolvemos 100% do seu dinheiro. Sem perguntas.
      </div>
    </td></tr>
    </table>

  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:#F5F0E4;padding:24px 40px;text-align:center;border-top:1px solid #EDE8DF">
    <div style="color:#828795;font-size:13px;line-height:1.6">
      Dúvidas? Responda este e-mail ou fale com a gente em
      <a href="mailto:alex.anascimento99@gmail.com" style="color:#1F965A;font-weight:600">alex.anascimento99@gmail.com</a>
    </div>
    <div style="color:#B0B8C8;font-size:11px;margin-top:12px">
      © 2026 VidaFinanceira · Você recebeu este e-mail por ter comprado em planilhavida.com.br
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
