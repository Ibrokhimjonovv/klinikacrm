// src/components/shared/QueueReceipt/QueueTicketReceipt.js

/**
 * Navbat chekini printerga chiqaradi.
 *
 * @param {Object} data
 * @param {number|string} data.number    - navbat raqami (majburiy)
 * @param {string} [data.date]           - sana (ISO yoki matn)
 * @param {string} [data.issuedAt]       - olingan vaqt (ISO)
 * @param {string} [data.operator]       - kassir/xodim ismi
 * @param {string} [data.id]             - chek ID (ixtiyoriy)
 * @param {string} [data.qrUrl]          - QR manzil (default: https://aoc.uz)
 * @param {string} [data.clinicName]     - klinika nomi (default: AMERICAN)
 * @param {string} [data.clinicSub]      - klinika subtitle (default: ORTHOPEDIC CENTER)
 * @param {string} [data.headerColor]    - header fon rangi (default: '#000000')
 * @param {string} [data.headerTextColor]- header matn rangi (default: '#ffffff')
 * @param {string} [data.accentColor]    - raqam va ajratgich rangi (default: '#000000')
 */
export const printQueueTicket = (data = {}) => {
    if (!data || data.number == null) {
        console.warn('printQueueTicket: navbat raqami yo\'q');
        return;
    }

    const pad2 = (n) => String(n).padStart(2, '0');

    const fmtDate = (val) => {
        const d = val ? new Date(val) : new Date();
        if (isNaN(d.getTime())) return String(val);
        return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
    };

    const fmtTime = (val) => {
        const d = val ? new Date(val) : new Date();
        if (isNaN(d.getTime())) return String(val);
        return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    };

    const dateStr = fmtDate(data.date || data.issuedAt);
    const timeStr = fmtTime(data.issuedAt);
    const operator = data.operator || 'Kassa';

    const number = String(data.number).padStart(2, '0');
    const receiptId = data.id != null ? data.id : data.number;

    const qrUrl = data.qrUrl || 'https://aoc.uz';
    const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`;

    // ── Ranglar (custom qilish mumkin) ─────────────────────
    const clinicName    = data.clinicName      || 'AMERICAN';
    const clinicSub     = data.clinicSub       || 'ORTHOPEDIC CENTER';
    const headerColor   = data.headerColor     || '#000000'; // fon rangi
    const headerText    = data.headerTextColor || '#ffffff'; // matn rangi
    const accentColor   = data.accentColor     || '#000000'; // raqam rangi

    const html = `
<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8" />
<title>Navbat №${number}</title>
<style>
    @page { size: 80mm auto; margin: 3mm; }
    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        /* 🔑 MUHIM: fon va ranglarni printerda majburiy chop etish */
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
    }

    body {
        font-family: 'Courier New', Courier, monospace;
        width: 72mm;
        margin: 0 auto;
        padding: 2mm;
        color: #000;
        font-size: 12px;
        line-height: 1.4;
        background: #fff;
    }

    /* ── HEADER (fon rangi chop etiladi) ──────────────── */
    .header {
        background: ${headerColor} !important;
        color: ${headerText} !important;
        text-align: center;
        padding: 6mm 3mm;
        margin-bottom: 3mm;
        border-radius: 2px;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    .header .clinic-name {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 26px;
        font-weight: 900;
        letter-spacing: 2px;
        line-height: 1;
        color: ${headerText} !important;
    }
    .header .clinic-sub {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 3px;
        margin-top: 1.5mm;
        color: ${headerText} !important;
    }

    /* ── ID qatori ────────────────────────────────────── */
    .id-row {
        text-align: center;
        font-size: 13px;
        font-weight: 700;
        margin: 2mm 0 3mm;
        letter-spacing: 1px;
    }

    /* ── Meta ─────────────────────────────────────────── */
    .meta-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 700;
        margin: 0.8mm 0;
    }

    .divider {
        border-top: 1px dashed #000;
        margin: 2.5mm 0;
    }

    /* ── NAVBAT RAQAMI ────────────────────────────────── */
    .queue-section {
        text-align: center;
        padding: 4mm 0;
    }
    .queue-label {
        font-size: 11px;
        letter-spacing: 3px;
        font-weight: 700;
        margin-bottom: 2mm;
    }
    .queue-number {
        font-family: Arial Black, Arial, sans-serif;
        font-size: 90px;
        font-weight: 900;
        line-height: 1;
        letter-spacing: -2px;
        margin: 2mm 0;
        color: ${accentColor} !important;
    }
    .queue-sub {
        font-size: 11px;
        letter-spacing: 1px;
        margin-top: 2mm;
    }

    .row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        margin: 0.6mm 0;
    }
    .row .label { font-weight: 700; }
    .row .value { font-weight: 700; text-align: right; }

    /* ── FOOTER ───────────────────────────────────────── */
    .footer {
        text-align: center;
        margin-top: 4mm;
    }
    .footer .qr {
        width: 40mm;
        height: 40mm;
        margin: 2mm auto;
        display: block;
    }
    .footer .url {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 1px;
        margin-top: 1mm;
    }
    .footer .thanks {
        font-size: 12px;
        font-weight: 700;
        margin-top: 2mm;
        letter-spacing: 0.5px;
    }
</style>
</head>
<body>

    <!-- HEADER -->
    <div class="header">
        <div class="clinic-name">AMERICAN</div>
        <div class="clinic-sub">${clinicSub}</div>
    </div>

    <!-- ID -->
    <div class="id-row">— ID: ${receiptId} —</div>

    <!-- VAQT / KASSIR -->
    <div class="meta-row">
        <span>Vaqt:</span>
        <span>${timeStr} ${dateStr}</span>
    </div>
    <div class="meta-row">
        <span>Kassir:</span>
        <span>${operator}</span>
    </div>

    <div class="divider"></div>

    <!-- NAVBAT RAQAMI -->
    <div class="queue-section">
        <div class="queue-label">NAVBAT RAQAMI</div>
        <div class="queue-number">${number}</div>
        <div class="queue-sub">ILTIMOS, NAVBATINGIZNI KUTING</div>
    </div>

    <div class="divider"></div>

    <!-- MA'LUMOTLAR -->
    <div class="row">
        <span class="label">Sana:</span>
        <span class="value">${dateStr}</span>
    </div>
    <div class="row">
        <span class="label">Vaqt:</span>
        <span class="value">${timeStr}</span>
    </div>
    <div class="row">
        <span class="label">Xodim:</span>
        <span class="value">${operator}</span>
    </div>

    <div class="divider"></div>

    <!-- FOOTER -->
    <div class="footer">
        <img class="qr" src="${qrImg}" alt="QR" />
        <div class="url">aoc.uz</div>
        <div class="thanks">Tashrifingiz uchun rahmat!</div>
    </div>

    <script>
        window.onload = function () {
            window.focus();
            setTimeout(function () {
                window.print();
                setTimeout(function () { window.close(); }, 500);
            }, 400);
        };
    </script>
</body>
</html>
    `;

    const printWindow = window.open('', '_blank', 'width=340,height=700');
    if (!printWindow) {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => document.body.removeChild(iframe), 6000);
        return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
};