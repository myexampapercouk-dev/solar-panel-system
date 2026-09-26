// Emails quote / contact form submissions to the owner's Gmail inbox.
// Required Netlify environment variables (Site configuration -> Environment variables):
//   GMAIL_USER          the Gmail address that sends the email, e.g. owner@gmail.com
//   GMAIL_APP_PASSWORD  a Google app password for that account (16 characters)
// Optional:
//   MAIL_TO             where submissions are delivered (defaults to GMAIL_USER)

const nodemailer = require('nodemailer');

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => String(s || '').trim().slice(0, n);

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  let data;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString() : (event.body || '');
    const type = (event.headers['content-type'] || '').toLowerCase();
    data = type.includes('application/json') ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw));
  } catch (err) {
    return json(400, { ok: false, error: 'Invalid request' });
  }

  // honeypot: real visitors never see or fill this field
  if (data['bot-field']) return json(200, { ok: true });

  const f = {
    form: clip(data['form-name'], 40) || 'quote',
    name: clip(data.name, 120),
    phone: clip(data.phone, 40),
    email: clip(data.email, 160),
    bill: clip(data.bill, 20),
    type: clip(data.type, 40),
    message: clip(data.message, 4000),
    page: clip(data.page, 200)
  };
  if (!f.name || !f.phone) return json(400, { ok: false, error: 'Name and phone are required' });

  const { GMAIL_USER, GMAIL_APP_PASSWORD, MAIL_TO } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.error('send-quote: GMAIL_USER / GMAIL_APP_PASSWORD are not set');
    return json(500, { ok: false, error: 'Email is not configured' });
  }

  const rows = [
    ['Name', f.name],
    ['Phone', f.phone],
    ['Email', f.email],
    ['Average monthly bill', f.bill && '₹' + f.bill],
    ['Property type', f.type],
    ['Message', f.message],
    ['Sent from', f.page]
  ].filter(([, v]) => v);

  const text = `New ${f.form} request from the website\n\n` + rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  const html = `<h2 style="font-family:Arial,sans-serif">New ${esc(f.form)} request from the website</h2>
<table style="font-family:Arial,sans-serif;border-collapse:collapse">
${rows.map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#555;vertical-align:top"><b>${esc(k)}</b></td><td style="padding:6px 0;white-space:pre-wrap">${esc(v)}</td></tr>`).join('\n')}
</table>`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD.replace(/\s+/g, '') }
  });

  try {
    await transporter.sendMail({
      from: `"Solar Panel System website" <${GMAIL_USER}>`,
      to: MAIL_TO || GMAIL_USER,
      replyTo: f.email || undefined,
      subject: `New ${f.form} request: ${f.name} (${f.phone})`,
      text,
      html
    });
    return json(200, { ok: true });
  } catch (err) {
    console.error('send-quote: sendMail failed', err);
    return json(502, { ok: false, error: 'Could not send email' });
  }
};
