import { useEffect, useMemo, useState } from 'react';

const usePagination = (items = [], initialPageSize = 100) => {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSizeState] = useState(initialPageSize);

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const safePage = Math.min(page, totalPages);

    useEffect(() => {
        setPage(1);
    }, [total]);

    const setPageSize = (size) => {
        setPageSizeState(Number(size));
        setPage(1);
    };

    const pageItems = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return items.slice(start, start + pageSize);
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