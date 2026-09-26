import React, { useRef, useState } from 'react';
import s from './ImageZoomViewer.module.scss';

/**
 * Rasmni ko'rsatuvchi komponent.
 * - Default holatda rasm "contain" qilib ko'rsatiladi.
 * - "Yaqinlashtirish" tugmasi bosilsa zoom rejimi yoqiladi.
 * - Zoom rejimida sichqoncha harakati bilan rasm shu nuqtaga qarab kattalashadi.
 * - Yana bir bosish bilan zoom rejimidan chiqiladi.
 */
const ImageZoomViewer = ({ src, alt = 'Rasm' }) => {
    const containerRef = useRef(null);
    const [isZoomed, setIsZoomed] = useState(false);
    const [origin, setOrigin] = useState('50% 50%'); // transform-origin

    const handleMouseMove = (e) => {
        if (!isZoomed || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // Chegaradan chiqmaslik uchun
        const clampedX = Math.max(0, Math.min(100, x));
        const clampedY = Math.max(0, Math.min(100, y));

        setOrigin(`${clampedX}% ${clampedY}%`);
    };

    const handleMouseLeave = () => {
        if (isZoomed) setOrigin('50% 50%');
    };

    const toggleZoom = () => {
        setIsZoomed((prev) => {
            if (!prev) setOrigin('50% 50%');
            return !prev;
        });
    };

    return (
        <div className={s.ZoomWrap}>
            <div className={s.ZoomToolbar}>
                {isZoomed && (
                    <span className={s.ZoomHint}>
                        <i className="bi bi-info-circle"></i>
                        Sichqonchani rasm ustida yurgizing
                    </span>
                )}
                <button
                    type="button"
                    className={`${s.ZoomBtn} ${isZoomed ? s.ZoomBtnActive : ''}`}
                    onClick={toggleZoom}
                    title={isZoomed ? 'Yaqinlashtirishni o‘chirish' : 'Yaqinlashtirish'}
                >
                    <i className={`bi ${isZoomed ? 'bi-zoom-out' : 'bi-zoom-in'}`}></i>
                    {isZoomed ? 'Kichraytirish' : 'Yaqinlashtirish'}
                </button>

            </div>
            <div
                ref={containerRef}
                className={`${s.ZoomContainer} ${isZoomed ? s.ZoomContainerActive : ''}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={isZoomed ? undefined : toggleZoom}
            >
                <img
                    src={src}
                    alt={alt}
                    className={`${s.ZoomImage} ${isZoomed ? s.ZoomImageActive : ''}`}
                    style={{ transformOrigin: origin }}
                    draggable={false}
                />
            </div>
        </div>
    );
};

export default ImageZoomViewer;