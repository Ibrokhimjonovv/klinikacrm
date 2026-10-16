import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import logo from './logo.png';
import s from './PrintReceipt.module.scss';

const CLINIC_NAME = 'American Orthopedic Center';
const SITE_URL = 'https://aoc.uz';
const SITE_LABEL = 'aoc.uz';
const INSTAGRAM_HANDLE = '@american_orthopedic_center';

const pad = (n) => String(n).padStart(2, '0');
const formatDate = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const isWide = (row) => row.wide ?? String(row.value ?? '').length > 30;

const PAGE_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 8;
const MAX_CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - PAGE_PADDING_MM * 2;

const mmToPx = (mm) => {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.height = `${mm}mm`;
    document.body.appendChild(probe);
    const px = probe.getBoundingClientRect().height;
    document.body.removeChild(probe);
    return px;
};

export const logoReady = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false); 
    img.src = logo;
});


const PrintReceipt = ({
    title = 'Bemor qabul varaqasi',
    patientName,
    patientInfo = [],
    credentials,
    complaintId,
    complaint,
    notes,
    qrUrl = SITE_URL,
    qrCaption = SITE_LABEL,
}) => {
    const now = new Date();
    const sheetRef = useRef(null);

    useEffect(() => {
        const sheetEl = sheetRef.current;
        if (!sheetEl) return;

        const applyFitScale = () => {
            try {
                sheetEl.style.transform = 'none';
                sheetEl.style.width = '';

                const naturalHeightPx = sheetEl.getBoundingClientRect().height
                const maxHeightPx = mmToPx(MAX_CONTENT_HEIGHT_MM)

                if (naturalHeightPx > maxHeightPx && naturalHeightPx > 0) {
                    const scale = maxHeightPx / naturalHeightPx
                    sheetEl.style.transformOrigin = 'top left'
                    sheetEl.style.transform = `scale(${scale})`
                    sheetEl.style.width = `${100 / scale}%`
                }
            } catch (err) {
                console.error('Chekni A4ga moslashtirishda xatolik:', err)
            }
        }

        const resetScale = () => {
            sheetEl.style.transform = 'none'
            sheetEl.style.width = ''
        }

        window.addEventListener('beforeprint', applyFitScale)
        window.addEventListener('afterprint', resetScale)
        return () => {
            window.removeEventListener('beforeprint', applyFitScale)
            window.removeEventListener('afterprint', resetScale)
        }
    }, [title, patientName, patientInfo, credentials, complaintId, complaint, notes])

    return (
        <div className={s.PrintOnly}>
            <div className={s.Sheet} ref={sheetRef}>
                {/* HEADER — logotip + QR */}
                <header className={s.Header}>
                    <img className={s.Logo} src={logo} alt={CLINIC_NAME} />

                    <div className={s.QR}>
                        <div className={s.QRTile}>
                            <QRCodeSVG value={qrUrl} size={96} level="M" />
                        </div>
                        {qrCaption && <span>{qrCaption}</span>}
                    </div>
                </header>

                {/* SARLAVHA + SANA */}
                <div className={s.TitleBar}>
                    <h1>{title}</h1>
                    <div className={s.DateTime}>
                        <strong>{formatDate(now)}</strong>
                        <span>{formatTime(now)}</span>
                    </div>
                </div>

                <section className={s.Body}>
                    {patientName && (
                        <div className={s.Patient}>
                            <span>F.I.O</span>
                            <strong>{patientName}</strong>
                        </div>
                    )}

                    {patientInfo.length > 0 && (
                        <div className={s.Grid}>
                            {patientInfo.map((row, i) => (
                                <div
                                    className={`${s.Field} ${isWide(row) ? s.FieldWide : ''}`}
                                    key={i}
                                >
                                    <span>{row.label}</span>
                                    <strong>{row.value}</strong>
                                </div>
                            ))}
                        </div>
                    )}

                    {complaintId && (
                        <div className={s.Ticket}>
                            <div className={s.TicketNumber}>
                                <h2>#{complaintId}</h2>
                            </div>
                            <div className={s.TicketDivider} />
                            <div className={s.TicketInfo}>
                                <span>Shikoyat ID raqami</span>
                                <p>
                                    Bu raqamni saqlab qo'ying — davolash jarayonini kuzatish
                                    uchun kerak bo'ladi
                                </p>
                            </div>
                        </div>
                    )}

                    {complaint && (
                        <div className={s.Entry}>
                            <span>Shikoyat</span>
                            <p>{complaint}</p>
                        </div>
                    )}

                    {notes && (
                        <div className={s.Entry}>
                            <span>Izoh</span>
                            <p>{notes}</p>
                        </div>
                    )}
                </section>

                {credentials && (
                    <>
                        <div className={s.Cut}>
                        </div>
                        <div className={s.Credentials}>
                            <div className={s.CredentialsHead}>
                                <i className="bi bi-shield-lock-fill"></i>
                                <span>Tizimga kirish ma'lumotlari</span>
                            </div>
                            <div className={s.CredGrid}>
                                <div className={s.CredBox}>
                                    <span>Login</span>
                                    <strong>{credentials.username}</strong>
                                </div>
                                <div className={s.CredBox}>
                                    <span>Parol</span>
                                    <strong>{credentials.password}</strong>
                                </div>
                            </div>
                            <p className={s.CredHint}>Bu ma'lumotlarni hech kimga bermang</p>
                        </div>
                    </>
                )}

                <footer className={s.Footer}>
                    <p className={s.Thanks}>
                        <i className="bi bi-heart-fill"></i>
                        Tashrifingiz uchun rahmat!
                    </p>
                    <p className={s.Handle}>
                        <i className="bi bi-instagram"></i>
                        {INSTAGRAM_HANDLE}
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default PrintReceipt;