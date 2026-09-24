import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import logo from './logo.png';
import s from './PrintReceipt.module.scss';

const CLINIC_NAME = 'American Orthopedic Center';
const SITE_URL = 'https://aoc-center.uz';
const SITE_LABEL = 'aoc-center.uz';
const INSTAGRAM_HANDLE = '@american_orthopedic_center';

const pad = (n) => String(n).padStart(2, '0');
const formatDate = (d) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
const formatTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

// Uzun qiymatlar (masalan manzil) butun qatorni egallaydi.
// Majburlash uchun patientInfo elementida `wide: true/false` berish mumkin.
const isWide = (row) => row.wide ?? String(row.value ?? '').length > 30;

// ---- A4'ga "to'liq sig'dirish" uchun sozlamalar ----
// @page { margin: 0 } + .PrintOnly { padding: 8mm } bilan mos keladi.
const PAGE_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 8;
const MAX_CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - PAGE_PADDING_MM * 2;

// Berilgan mm qiymatini joriy render kontekstidagi (ekran yoki chop etish)
// haqiqiy piksel qiymatiga aylantiradi — shunda o'lchov chek bilan bir xil birlikda bo'ladi.
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

/**
 * Chop etish uchun umumiy shablon — American Orthopedic Center.
 *
 * Props:
 *  - title:       sarlavha (default: "Bemor qabul varaqasi")
 *  - patientName: bemor F.I.O
 *  - patientInfo: qo'shimcha bemor ma'lumotlari (massiv: { label, value, wide? })
 *  - credentials: { username, password } — ixtiyoriy
 *  - complaintId: shikoyat ID raqami
 *  - complaint:   shikoyat matni
 *  - notes:       izoh
 *  - qrUrl:       QR code ichidagi link (default: https://aoc-center.uz)
 *  - qrCaption:   QR ostidagi yozuv (default: "aoc-center.uz")
 */
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

    // ---- Chek balandligi A4'dan oshib ketsa, avtomatik kichraytiramiz ----
    useEffect(() => {
        const sheetEl = sheetRef.current;
        if (!sheetEl) return;

        const applyFitScale = () => {
            try {
                // Avval haqiqiy (tabiiy) balandlikni o'lchash uchun scale'ni tozalaymiz
                sheetEl.style.transform = 'none';
                sheetEl.style.width = '';

                const naturalHeightPx = sheetEl.getBoundingClientRect().height
                const maxHeightPx = mmToPx(MAX_CONTENT_HEIGHT_MM)

                if (naturalHeightPx > maxHeightPx && naturalHeightPx > 0) {
                    const scale = maxHeightPx / naturalHeightPx
                    sheetEl.style.transformOrigin = 'top left'
                    sheetEl.style.transform = `scale(${scale})`
                    // Kenglikni ham kompensatsiya qilamiz, aks holda chek torayib qoladi
                    sheetEl.style.width = `${100 / scale}%`
                }
            } catch (err) {
                // O'lchashda muammo bo'lsa — hech narsa qilmaymiz, chek tabiiy holida chop etiladi
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
                    {/* BEMOR MA'LUMOTLARI */}
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

                    {/* SHIKOYAT ID — chipta */}
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

                    {/* SHIKOYAT VA IZOH */}
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

                {/* LOGIN / PAROL — kesish chizig'idan keyin */}
                {credentials && (
                    <>
                        <div className={s.Cut}>
                            {/* <i className="bi bi-scissors"></i> */}
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

                {/* FOOTER */}
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