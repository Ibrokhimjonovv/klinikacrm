import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import logo from '../../../assets/logo.png';

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
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatBirth = (raw) => {
    if (!raw) return '';
    const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : String(raw);
};

const money = (n) =>
    Math.round(Number(n) || 0).toLocaleString('uz-UZ').replace(/\s/g, ' ');

const METHOD = { CASH: 'Naqd', CARD: 'Karta', TRANSFER: "O'tkazma" };

const PAPER_MM = 110;
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
.rc-logo{display:block;width:100%;height:auto;filter:grayscale(1) contrast(1.3);margin:0 0 .4em}
.rc-id{text-align:center;font-weight:800;font-size:1.1em;margin:.2em 0 .4em}
.rc-row{display:flex;justify-content:space-between;gap:.4em;margin:.15em 0}
.rc-row span:last-child{text-align:right;white-space:nowrap}
.rc-patient{margin:.15em 0 .3em;font-weight:800;font-size:1.1em;word-break:break-word}
.rc-sub{margin:.2em 0 0;font-size:.9em}
.rc-title{margin:.1em 0 .2em;font-weight:800}
.rc-hr{border-top:.3mm dashed #000;margin:.5em 0}
.rc-qr{display:flex;justify-content:center;margin:1em 0 .2em}
.rc-qr svg{width:30%;height:auto}
.rc-site{text-align:center;margin:.15em 0}
.rc-thanks{text-align:center;margin:.3em 0 0;font-weight:800}
`;

// Har bir kun bo'yicha to'langan summani to'lovlar allocations'idan yig'amiz
const buildDays = (payments = []) => {
    const map = new Map();
    payments.forEach((p) =>
        (p.allocations || []).forEach((a) => {
            const key = a.day_id ?? a.day_number;
            const prev = map.get(key) || { day_number: a.day_number, amount: 0 };
            prev.amount += Number(a.amount) || 0;
            map.set(key, prev);
        })
    );
    return [...map.values()].sort((a, b) => (a.day_number || 0) - (b.day_number || 0));
};

const ReceiptContent = ({ plan, cashier, logoSrc }) => {
    const days = buildDays(plan.payments);
    const lastPaid = (plan.payments || [])
        .map((p) => p.created_at)
        .filter(Boolean)
        .sort()
        .pop();

    return (
        <div className="rc">
            <div className="rc-sec">
                <img src={logoSrc} alt="American Orthopedic Center" className="rc-logo" />
                <p className="rc-id">— Reja ID: {plan.id} —</p>
                <div className="rc-row">
                    <span>Vaqt:</span>
                    <span>{formatPrinted(lastPaid)}</span>
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
                {plan.diagnosis && <p className="rc-sub">Tashxis: {plan.diagnosis}</p>}
            </div>

            <div className="rc-hr" />

            {days.length > 0 && (
                <>
                    <div className="rc-sec">
                        <p className="rc-title">Davolash kunlari:</p>
                        {days.map((d) => (
                            <div className="rc-row" key={d.day_number}>
                                <span>{d.day_number}-kun</span>
                                <span>= {money(d.amount)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="rc-hr" />
                </>
            )}

            {plan.payments?.length > 0 && (
                <>
                    <div className="rc-sec">
                        <p className="rc-title">To'lovlar:</p>
                        {plan.payments.map((p) => (
                            <div className="rc-row" key={p.id}>
                                <span>
                                    {formatShort(p.created_at)} · {METHOD[p.payment_method] || p.payment_method}
                                </span>
                                <span>{money(p.amount)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="rc-hr" />
                </>
            )}

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
                    <QRCodeSVG value="https://aoc-center.uz" size={300} />
                </div>
                <p className="rc-site">aoc-center.uz</p>
                <p className="rc-thanks">Tashrifingiz uchun rahmat!</p>
            </div>
        </div>
    );
};

export const printPlanReceipt = (plan, cashier = 'Kassa') => {
    if (!plan) return;

    document.getElementById('rc-print-frame')?.remove();

    const logoSrc = new URL(logo, window.location.href).href;
    const body = renderToStaticMarkup(
        <ReceiptContent plan={plan} cashier={cashier} logoSrc={logoSrc} />
    );

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Chek ${plan.id}</title>
<style>
@page { size: 76.2mm auto; margin: 0; }
html, body { margin: 0; padding: 0; width: 76.2mm; height: auto; background: #fff; }
${RECEIPT_CSS}
</style>
</head>
<body>${body}</body>
</html>`;

    const iframe = document.createElement('iframe');
    iframe.id = 'rc-print-frame';
    iframe.style.cssText = [
        'position:fixed', 'right:0', 'bottom:0',
        `width:${PAPER_MM}mm`, 'height:2000px',
        'border:0', 'opacity:0', 'pointer-events:none', 'z-index:-1',
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
        try {
            const rc = doc.querySelector('.rc');
            if (rc) {
                const hMm = Math.ceil(rc.getBoundingClientRect().height * 0.264583) + 4;
                const styleEl = doc.createElement('style');
                styleEl.textContent = `@page { size: ${PAPER_MM}mm ${hMm}mm; margin: 0; }`;
                doc.head.appendChild(styleEl);
            }
        } catch (e) { /* e'tiborsiz */ }
        win.focus();
        win.print();
    };

    const img = doc.querySelector('img');
    if (img && !img.complete) {
        img.onload = () => setTimeout(go, 80);
        img.onerror = () => setTimeout(go, 80);
    } else {
        setTimeout(go, 150);
    }
};