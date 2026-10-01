import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

const pad = (n) => String(n).padStart(2, '0');

const formatPrinted = (iso) => {
    const d = iso ? new Date(iso) : new Date();
    return (
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}  ` +
        `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
    );
};

const formatShort = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return (
        `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
};

const formatBirth = (raw) => {
    if (!raw) return '';
    const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : String(raw);
};

const money = (n) =>
    Math.round(Number(n) || 0).toLocaleString('uz-UZ').replace(/\s/g, ' ');

const METHOD_LABEL = {
    CASH: 'Naqd',
    CARD: 'Karta',
    TRANSFER: "O'tkazma",
};

// Chek kengligi (mm)
const PAPER_MM = 110;
// Matn o'lchami (mm)
const FONT_MM = 4;

const RECEIPT_CSS = `
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff}
p{margin:0}
.rc{
  width:${PAPER_MM}mm;
  padding:2mm;
  color:#000;
  font-family:Arial,Helvetica,sans-serif;
  font-size:${FONT_MM}mm;
  font-weight:700;
  line-height:1.3;
}
.rc-sec{break-inside:avoid;page-break-inside:avoid}
.rc-title{
  text-align:center;
  margin:0 0 .4em;
  background:#000;
  color:#fff;
  padding:.3em .4em;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.rc-title-big{font-size:2.2em;font-weight:900;line-height:1.05;letter-spacing:.02em;text-transform:uppercase}
.rc-title-small{font-size:1.05em;font-weight:800;line-height:1.2;text-transform:uppercase;white-space:nowrap}
.rc-id{text-align:center;font-weight:800;font-size:1.1em;margin:.2em 0 .4em}
.rc-row{display:flex;justify-content:space-between;gap:.4em;margin:.15em 0}
.rc-row span:last-child{text-align:right;white-space:nowrap}
.rc-patient{margin:.15em 0 .3em;font-weight:800;font-size:1.1em;word-break:break-word}
.rc-sub{margin:.2em 0 0;font-size:.9em;word-break:break-word}
.rc-head{margin:.1em 0 .3em;font-weight:800;text-transform:uppercase;font-size:.95em}
.rc-pay{margin:.4em 0}
.rc-hr{border-top:.3mm dashed #000;margin:.5em 0}
.rc-qr{display:flex;justify-content:center;margin:2em 0 .2em}
.rc-qr svg{width:45%;height:auto}
.rc-site{text-align:center;margin:.15em 0;font-size:1.1em;font-weight:800}
.rc-thanks{text-align:center;margin:.3em 0 0;font-weight:800}
`;

const ReceiptContent = ({ plan, cashier }) => {
    const payments = plan.payments || [];
    const lastPaidAt = payments.length ? payments[0]?.created_at : null;

    return (
        <div className="rc">
            <div className="rc-sec">
                <div className="rc-title">
                    <div className="rc-title-big">American</div>
                    <div className="rc-title-small">Orthopedic Center</div>
                </div>
                <p className="rc-id">— ID: {plan.id} —</p>

                <div className="rc-row">
                    <span>Vaqt:</span>
                    <span>{formatPrinted(lastPaidAt)}</span>
                </div>
                <div className="rc-row">
                    <span>Kassir:</span>
                    <span>{cashier}</span>
                </div>
            </div>

            <div className="rc-hr" />

            <div className="rc-sec">
                <p>Bemor:</p>
                <p className="rc-patient">{plan.name}</p>
                {plan.birthDate && (
                    <div className="rc-row">
                        <span>Tug'ilgan sana:</span>
                        <span>{formatBirth(plan.birthDate)}</span>
                    </div>
                )}
                {plan.careType && (
                    <div className="rc-row">
                        <span>Turi:</span>
                        <span>{plan.careType}</span>
                    </div>
                )}
                {plan.diagnosis && (
                    <p className="rc-sub">Tashxis: {plan.diagnosis}</p>
                )}
            </div>

            {payments.length > 0 && (
                <>
                    <div className="rc-hr" />
                    <div className="rc-sec">
                        <p className="rc-head">To'lovlar</p>
                        {payments.map((h, i) => (
                            <div key={h.id ?? i} className="rc-pay">
                                <div className="rc-row">
                                    <span>
                                        {i + 1}. {formatShort(h.created_at)}
                                    </span>
                                    <span>= {money(h.amount)}</span>
                                </div>
                                <p className="rc-sub">
                                    {METHOD_LABEL[h.payment_method] || h.payment_method}
                                    {h.allocations?.length > 0 &&
                                        ' · ' +
                                            h.allocations
                                                .map((a) => `${a.day_number}-kun`)
                                                .join(', ')}
                                </p>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div className="rc-hr" />

            <div className="rc-sec">
                <div className="rc-row">
                    <span>To'lov uchun</span>
                    <span>{money(plan.total)}</span>
                </div>
                <div className="rc-row">
                    <span>To'langan</span>
                    <span>{money(plan.paid)}</span>
                </div>
                <div className="rc-row">
                    <span>Qarz</span>
                    <span>{money(plan.remaining)}</span>
                </div>
            </div>

            <div className="rc-hr" />

            <div className="rc-sec">
                <div className="rc-qr">
                    <QRCodeSVG value="https://aoc.uz" size={300} />
                </div>
                <p className="rc-site">aoc.uz</p>
                <p className="rc-thanks">Tashrifingiz uchun rahmat!</p>
            </div>
        </div>
    );
};

// ------------------------------------------------------------
// Chop etish: yashirin iframe orqali
// ------------------------------------------------------------
export const printPlanReceipt = (plan, cashier = 'Kassa') => {
    if (!plan) return;

    document.getElementById('rc-print-frame')?.remove();
    const body = renderToStaticMarkup(
        <ReceiptContent plan={plan} cashier={cashier} />
    );

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Chek ${plan.id}</title>
<style>
@page {
    size: ${PAPER_MM}mm auto;
    margin: 0;
}
html, body {
    margin: 0;
    padding: 0;
    width: ${PAPER_MM}mm;
    background: #fff;
}
body { padding: 0; }
${RECEIPT_CSS}
</style>
</head>
<body>${body}</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.id = 'rc-print-frame';
    iframe.style.cssText = [
        'position:fixed',
        'right:0',
        'bottom:0',
        `width:${PAPER_MM}mm`,
        'height:2000px',
        'border:0',
        'opacity:0',
        'pointer-events:none',
        'z-index:-1',
    ].join(';');
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win.document;
    doc.open();
    doc.write(html);
    doc.close();

    const remove = () => iframe.remove();
    win.onafterprint = remove;
    setTimeout(remove, 60000);

    const go = () => {
        // Kontent balandligiga qarab @page o'lchamini yangilaymiz
        try {
            const rc = doc.querySelector('.rc');
            if (rc) {
                const hMm = Math.ceil(rc.getBoundingClientRect().height * 0.264583) + 4;
                let styleEl = doc.getElementById('rc-dynamic-page');
                if (!styleEl) {
                    styleEl = doc.createElement('style');
                    styleEl.id = 'rc-dynamic-page';
                    doc.head.appendChild(styleEl);
                }
                styleEl.textContent = `@page { size: ${PAPER_MM}mm ${hMm}mm; margin: 0; }`;
            }
        } catch (e) {
            // e'tiborsiz
        }

        win.focus();
        win.print();
    };

    setTimeout(go, 150);
};