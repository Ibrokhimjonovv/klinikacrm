import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import s from './PrintReceipt.module.scss';

/**
 * Chop etish uchun umumiy shablon.
 *
 * Props:
 *  - title:       sarlavha ostidagi matn
 *  - patientName: bemor F.I.O
 *  - patientInfo: qo'shimcha bemor ma'lumotlari (massiv: { label, value })
 *  - credentials: { username, password } — ixtiyoriy
 *  - complaintId: shikoyat ID raqami
 *  - complaint:   shikoyat matni
 *  - notes:       izoh
 *  - qrUrl:       QR code ichiga joylanadigan link (default: window.location.origin)
 */
const PrintReceipt = ({
    title = 'Bemor qabul varaqasi',
    patientName,
    patientInfo = [],
    credentials,
    complaintId,
    complaint,
    notes,
    qrUrl,
}) => {
    const now = new Date();
    const qrValue = qrUrl || (typeof window !== 'undefined' ? window.location.origin : '');

    return (
        <div className={s.PrintOnly}>
            {/* HEADER */}
            <div className={s.PrintHeader}>
                <div className={s.PrintBrand}>
                    <div className={s.PrintLogo}>
                        <i className="bi bi-hospital"></i>
                    </div>
                    <div>
                        <h1>Klinika CRM</h1>
                        <p>{title}</p>
                    </div>
                </div>

                <div className={s.PrintQR}>
                    <QRCodeSVG value={qrValue} size={72} level="M" />
                    <span>Bizning sayt</span>
                </div>
            </div>

            <div className={s.PrintDivider} />

            {/* BEMOR MA'LUMOTLARI */}
            {patientName && (
                <div className={s.PrintRow}>
                    <span>F.I.O:</span>
                    <strong>{patientName}</strong>
                </div>
            )}

            {patientInfo.map((row, i) => (
                <div className={s.PrintRow} key={i}>
                    <span>{row.label}:</span>
                    <strong>{row.value}</strong>
                </div>
            ))}

            {/* SHIKOYAT ID — ajralib turadigan blok */}
            {complaintId && (
                <div className={s.PrintComplaintBox}>
                    <span>Shikoyat ID raqami</span>
                    <h2>#{complaintId}</h2>
                    <p>
                        Bu raqamni saqlab qo'ying — davolash jarayonini kuzatish
                        uchun kerak bo'ladi
                    </p>
                </div>
            )}

            {/* SHIKOYAT VA IZOH */}
            {complaint && (
                <div className={s.PrintRow}>
                    <span>Shikoyat:</span>
                    <strong>{complaint}</strong>
                </div>
            )}

            {notes && (
                <div className={s.PrintRow}>
                    <span>Izoh:</span>
                    <strong>{notes}</strong>
                </div>
            )}

            {/* LOGIN / PAROL — ENG PASTDA */}
            {credentials && (
                <div className={s.PrintCredentials}>
                    <div className={s.PrintCredentialsHead}>
                        <i className="bi bi-shield-lock-fill"></i>
                        <span>Tizimga kirish ma'lumotlari</span>
                    </div>
                    <div className={s.PrintCredRow}>
                        <span>Login</span>
                        <strong>{credentials.username}</strong>
                    </div>
                    <div className={s.PrintCredRow}>
                        <span>Parol</span>
                        <strong>{credentials.password}</strong>
                    </div>
                    <p className={s.PrintCredHint}>
                        Bu ma'lumotlarni hech kimga bermang
                    </p>
                </div>
            )}

            {/* FOOTER */}
            <div className={s.PrintFooter}>
                <p className={s.PrintDate}>
                    Sana: {now.toLocaleDateString('uz-UZ')}{' '}
                    {now.toLocaleTimeString('uz-UZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </p>
                <p className={s.PrintThanks}>Tashrifingiz uchun rahmat!</p>
            </div>
        </div>
    );
};

export default PrintReceipt;