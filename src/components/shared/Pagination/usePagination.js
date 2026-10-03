import { useEffect, useMemo, useState } from 'react';

/**
 * Ro'yxatni sahifalarga bo'lish (frontend tomonida).
 *
 * const { pageItems, page, setPage, pageSize, setPageSize, total } = usePagination(items, 100);
 *
 *  - items:           to'liq (yoki filtrlangan) massiv
 *  - initialPageSize: boshlang'ich "nechtadan ko'rsatish" (default 100)
 */
const usePagination = (items = [], initialPageSize = 100) => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSizeState] = useState(initialPageSize);

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Ro'yxat qisqarib ketsa (masalan qidiruvda) — mavjud bo'lmagan sahifada qolib ketmaymiz
    const safePage = Math.min(page, totalPages);

    // Ro'yxat soni o'zgarsa (qidiruv/filtr) — 1-sahifaga qaytamiz
    useEffect(() => {
        setPage(1);
    }, [total]);

    // Hajm o'zgarsa — 1-sahifaga qaytamiz
    const setPageSize = (size) => {
        setPageSizeState(Number(size));
        setPage(1);
    };

    const pageItems = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return items.slice(start, start + pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, safePage, pageSize]);

    return {
        pageItems,
        page: safePage,
        setPage,
        pageSize,
        setPageSize,
        total,
        totalPages,
    };
};

export default usePagination;