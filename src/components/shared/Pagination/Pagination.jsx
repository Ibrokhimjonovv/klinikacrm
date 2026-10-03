import React from 'react';
import s from './Pagination.module.scss';

// Sahifa raqamlari: 1 ... 4 5 [6] 7 8 ... 20 ko'rinishida
const DOTS = '...';

const getPageRange = (current, totalPages, siblings = 1) => {
    // birinchi + oxirgi + joriy + 2 yon + 2 ta "..." joyi
    const maxVisible = siblings * 2 + 5;

    if (totalPages <= maxVisible) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const left = Math.max(current - siblings, 1);
    const right = Math.min(current + siblings, totalPages);

    const showLeftDots = left > 2;
    const showRightDots = right < totalPages - 1;

    const range = (from, to) =>
        Array.from({ length: to - from + 1 }, (_, i) => from + i);

    if (!showLeftDots && showRightDots) {
        return [...range(1, 3 + siblings * 2), DOTS, totalPages];
    }
    if (showLeftDots && !showRightDots) {
        return [1, DOTS, ...range(totalPages - (2 + siblings * 2), totalPages)];
    }
    return [1, DOTS, ...range(left, right), DOTS, totalPages];
};

/**
 * Props:
 *  - total:              jami elementlar soni
 *  - page:               joriy sahifa (1 dan boshlanadi)
 *  - pageSize:           bitta sahifadagi elementlar soni
 *  - onPageChange(n):    sahifa o'zgarganda
 *  - onPageSizeChange(n):"nechtadan ko'rsatish" o'zgarganda
 *  - pageSizeOptions:    tanlov variantlari (default [10, 25, 50, 100])
 *  - className:          ixtiyoriy qo'shimcha class
 */
const Pagination = ({
    total,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [5, 10, 25, 50, 100],
    className = '',
}) => {
    // Ro'yxat eng kichik hajmdan ham qisqa bo'lsa — paginatsiya kerak emas
    if (!total) return null;

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    const pages = getPageRange(page, totalPages);

    const go = (n) => {
        if (n < 1 || n > totalPages || n === page) return;
        onPageChange(n);
    };

    return (
        <div className={`${s.Pagination} ${className}`}>
            <div className={s.Left}>
                <p className={s.Summary}>
                    <strong>{from}–{to}</strong> / {total} ta
                </p>

                {onPageSizeChange && (
                    <label className={s.SizeSelect}>
                        <span>Ko'rsatish:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        >
                            {pageSizeOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt} tadan
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </div>

            {totalPages > 1 && (
                <nav className={s.Pages} aria-label="Sahifalar">
                    <button
                        type="button"
                        className={s.NavBtn}
                        onClick={() => go(page - 1)}
                        disabled={page === 1}
                        aria-label="Oldingi sahifa"
                    >
                        <i className="bi bi-chevron-left"></i>
                    </button>

                    {pages.map((p, i) =>
                        p === DOTS ? (
                            <span key={`dots-${i}`} className={s.Dots}>…</span>
                        ) : (
                            <button
                                key={p}
                                type="button"
                                className={`${s.PageBtn} ${p === page ? s.Active : ''}`}
                                onClick={() => go(p)}
                                aria-current={p === page ? 'page' : undefined}
                                aria-label={`${p}-sahifa`}
                            >
                                {p}
                            </button>
                        )
                    )}

                    <button
                        type="button"
                        className={s.NavBtn}
                        onClick={() => go(page + 1)}
                        disabled={page === totalPages}
                        aria-label="Keyingi sahifa"
                    >
                        <i className="bi bi-chevron-right"></i>
                    </button>
                </nav>
            )}
        </div>
    );
};

export default Pagination;