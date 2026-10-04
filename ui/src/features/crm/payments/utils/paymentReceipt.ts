// Printed payment receipt ("To'lov cheki") for thermal receipt printers (58 or 80 mm).
// The layout follows the paper receipt the center already hands out: logo and name,
// a thank-you line, then label/value rows.

export interface PaymentReceiptData {
  payment_id: number;
  receipt_number?: string | null;
  payer_name?: string | null;
  subject?: string | null;
  expected_amount?: number | null;
  discount_amount?: number | null;
  paid_amount?: number | null;
  currency?: string | null;
  teacher_name?: string | null;
  paid_at?: string | null;
  billing_month?: string | null;
  cashier_name?: string | null;
  center_name?: string | null;
  center_phone?: string | null;
  center_address?: string | null;
}

// 57 mm thermal roll (often sold as 57x40 or 58 mm). The printer can only print the
// middle ~48 mm, so the side padding keeps every line inside that area.
export const RECEIPT_PAPER_WIDTH_MM = 57;
const RECEIPT_SIDE_PADDING_MM = 4.5;
const PX_PER_MM = 96 / 25.4;

const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
const RECEIPT_TIME_ZONE = 'Asia/Tashkent';
export const RECEIPT_LOGO_PATH = '/temurbek-school-logo.jpg';

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string);

// 340000 -> "340.000 so'm", grouped with dots as on the paper receipt.
export const formatReceiptAmount = (amount: number | null | undefined, currency?: string | null) => {
  const value = Math.round(Number(amount || 0));
  const grouped = Math.abs(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const unit = !currency || currency.toUpperCase() === 'UZS' ? "so'm" : currency.toUpperCase();
  return `${value < 0 ? '-' : ''}${grouped} ${unit}`;
};

// "2026-10" -> "Oktyabr uchun".
export const formatReceiptMonth = (billingMonth?: string | null) => {
  const month = Number(String(billingMonth || '').slice(5, 7));
  return month >= 1 && month <= 12 ? `${UZ_MONTHS[month - 1]} uchun` : '';
};

// Payment time in the center's time zone: "03.10.2026 13:51".
export const formatReceiptTime = (paidAt?: string | null) => {
  if (!paidAt) return '';
  const date = new Date(paidAt);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: RECEIPT_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
};

export const buildReceiptRows = (receipt: PaymentReceiptData): Array<[string, string]> => {
  const rows: Array<[string, string]> = [
    ["To'lovchi", receipt.payer_name || ''],
    ['Fan', receipt.subject || ''],
    ["To'lov miqdori", formatReceiptAmount(receipt.expected_amount, receipt.currency)],
  ];
  if (Number(receipt.discount_amount || 0) > 0) rows.push(['Chegirma', formatReceiptAmount(receipt.discount_amount, receipt.currency)]);
  rows.push(
    ["To'langan summa", formatReceiptAmount(receipt.paid_amount, receipt.currency)],
    ["O'qituvchi", receipt.teacher_name || ''],
    ['Vaqt', formatReceiptTime(receipt.paid_at)],
    ['Kassir', receipt.cashier_name || ''],
    ["To'landi", formatReceiptMonth(receipt.billing_month)],
    ['Telefon', receipt.center_phone || ''],
    ['Manzil', receipt.center_address || ''],
  );
  // Rows with nothing to show (for example the cashier on payments recorded before the
  // cashier was saved) are left off instead of printing an empty label.
  return rows.filter(([, value]) => value.trim() !== '');
};

export const buildReceiptHtml = (receipt: PaymentReceiptData, logoUrl = RECEIPT_LOGO_PATH) => {
  const centerName = receipt.center_name || 'TEMURBEK SCHOOL';
  const rows = buildReceiptRows(receipt)
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}:</th><td>${escapeHtml(value)}</td></tr>`)
    .join('');
  return `<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><title>To'lov cheki</title>
<style>
@page{size:${RECEIPT_PAPER_WIDTH_MM}mm 200mm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#000}
body{width:${RECEIPT_PAPER_WIDTH_MM}mm;padding:3mm ${RECEIPT_SIDE_PADDING_MM}mm 5mm;font:12px/1.35 Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.head{display:flex;align-items:center;gap:3mm;margin-bottom:4mm}
.head img{width:18mm;height:18mm;object-fit:contain;filter:grayscale(1) contrast(1.4)}
.head .name{font-weight:700;font-size:14px;letter-spacing:.04em;text-transform:uppercase}
h1{margin:0 0 3mm;text-align:center;font-size:15px;text-decoration:underline;text-transform:uppercase}
.thanks{margin:0 0 3mm;font-size:12px}
table{width:100%;border-collapse:collapse}
th,td{padding:.8mm 0;vertical-align:top;text-align:left;font-size:12px;overflow-wrap:anywhere}
th{width:45%;padding-right:1.5mm;font-weight:700}
.rule{border-top:1.5px solid #000;margin-top:4mm}
</style></head>
<body>
<div class="head"><img src="${escapeHtml(logoUrl)}" alt=""><div class="name">${escapeHtml(centerName)}</div></div>
<h1>To'lov cheki</h1>
<p class="thanks">Rahmat! ${escapeHtml(centerName)} bilan birga o'sing</p>
<table>${rows}</table>
<div class="rule"></div>
</body></html>`;
};

// Prints through a hidden iframe so no window opens and pop-up blockers don't interfere.
// Waits for the logo to load first, then removes the frame after the print dialog closes.
export const printReceiptHtml = (html: string) => new Promise<void>((resolve) => {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(frame);
  const cleanup = () => { setTimeout(() => frame.remove(), 1000); resolve(); };
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) { cleanup(); return; }
  doc.open();
  doc.write(html);
  doc.close();
  const print = () => {
    const heightMm = Math.ceil(doc.documentElement.scrollHeight / PX_PER_MM) + 2;
    const pageSize = doc.createElement('style');
    pageSize.textContent = `@page{size:${RECEIPT_PAPER_WIDTH_MM}mm ${heightMm}mm;margin:0}`;
    doc.head.appendChild(pageSize);
    win.focus();
    win.addEventListener('afterprint', cleanup, { once: true });
    win.print();
    // Some browsers never fire afterprint; fall back to cleaning up later.
    setTimeout(cleanup, 60000);
  };
  const images = Array.from(doc.images).filter((image) => !image.complete);
  if (images.length === 0) { print(); return; }
  let waiting = images.length;
  const done = () => { waiting -= 1; if (waiting === 0) print(); };
  images.forEach((image) => { image.addEventListener('load', done, { once: true }); image.addEventListener('error', done, { once: true }); });
});
