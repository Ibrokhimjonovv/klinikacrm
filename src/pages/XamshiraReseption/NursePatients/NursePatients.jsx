import React, { useEffect, useMemo, useState } from "react";
import s from "./NursePatients.module.scss";
import { Link } from "react-router-dom";
import DateTimeFormatter from "../../../components/shared/DateTimeFormatter/DateTimeFormatter";
import { useAppContext } from "../../../context/context";
import Loading from "../../../components/Loading/Loading";
import usePagination from "../../../components/shared/Pagination/usePagination";
import Pagination from "../../../components/shared/Pagination/Pagination";

const NursePatients = () => {
  const {
    patients: todayAdmissions,
    patientsLoading: loading,
    patientsError: error,
    fetchPatients,
  } = useAppContext();

  const [search, setSearch] = useState("");

  const [period, setPeriod] = useState("all"); // 'all' | 'today' | 'yesterday' | 'week'

  const PERIODS = [
    { key: "all", label: "Barcha davr" },
    { key: "today", label: "Bugun" },
    { key: "yesterday", label: "Kecha" },
    { key: "week", label: "1 hafta" },
  ];

  const getStartOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const filterByPeriod = (list, period) => {
    if (period === "all") return list;

    const todayStart = getStartOfDay(new Date());

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    return list.filter((p) => {
      const d = new Date(p.time);
      if (isNaN(d)) return false;

      if (period === "today") return d >= todayStart && d < tomorrowStart;
      if (period === "yesterday") return d >= yesterdayStart && d < todayStart;
      if (period === "week") return d >= weekStart && d < tomorrowStart;
      return true;
    });
  };

  // Ism bo'yicha qidirish — pagination'ga FILTRLANGAN ro'yxat beriladi
  const filtered = useMemo(() => {
    const byPeriod = filterByPeriod(todayAdmissions, period);
    const q = search.trim().toLowerCase();
    if (!q) return byPeriod;
    return byPeriod.filter((p) => (p.name || "").toLowerCase().includes(q));
  }, [todayAdmissions, search, period]);

  // Hooklar shartli return'lardan OLDIN chaqirilishi kerak
  const { pageItems, page, setPage, pageSize, setPageSize, total } =
    usePagination(filtered, 100); // default: 100 tadan

  useEffect(() => {
    setPage(1);
  }, [period, search]);

  useEffect(() => {
    // faqat ro'yxat bo'sh bo'lsa qayta so'rov yuborish (ixtiyoriy optimallashtirish)
    if (todayAdmissions.length === 0) {
      fetchPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Loading />;
  if (error) return <p>{error}</p>;

  return (
    <div className={s.ListCard}>
      <div className={s.ListHead}>
        <div className={s.ListHeadLeft}>
          <h3>Ro'yxatga olingan bemorlar</h3>
          <span className={s.CountBadge}>{total} ta</span>
        </div>

        <div className={s.ListHeadRight}>
          <div className={s.PeriodTabs}>
            {PERIODS.map((item) => (
              <button
                key={item.key}
                className={`${s.PeriodBtn} ${period === item.key ? s.PeriodActive : ""}`}
                onClick={() => setPeriod(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={s.SearchBox}>
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Bemor ismi bo'yicha qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {total === 0 ? (
        <p className={s.Empty}>
          {search.trim()
            ? "Bemor topilmadi"
            : period === "all"
              ? "Hali hech kim qabul qilinmagan"
              : period === "today"
                ? "Bugun hali hech kim qabul qilinmagan"
                : period === "yesterday"
                  ? "Kecha hech kim qabul qilinmagan"
                  : "Oxirgi 1 haftada hech kim qabul qilinmagan"}
        </p>
      ) : (
        <ul>
          {pageItems.map((p) => (
            <li key={p.id}>
              <Link to={`/nurse/patients/patient/${p.id}`}>
                <div className={s.PatientLeft}>
                  <div className={s.Avatar}>{p.name ? p.name[0] : "?"}</div>
                  <div className={s.PatientInfo}>
                    <p>{p.name}</p>
                    <span className="truncate">{p.complaint}</span>
                  </div>
                </div>
                <div className={s.PatientRight}>
                  <DateTimeFormatter
                    date={p.time}
                    format="datetime"
                    className={s.Time}
                  />
                  <span className={s.DoctorBadge}>
                    {p.doctor_name} {p.doctor_surename}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
};

export default NursePatients;
