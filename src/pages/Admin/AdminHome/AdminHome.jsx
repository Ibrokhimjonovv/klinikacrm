import React, { useState, useEffect, useCallback } from "react";
import s from "./AdminHome.module.scss";
import { api } from "../../../App";

const MONTH_LABELS = [
  "Yan",
  "Fev",
  "Mar",
  "Apr",
  "May",
  "Iyun",
  "Iyul",
  "Avg",
  "Sen",
  "Okt",
  "Noy",
  "Dek",
];

const formatChange = (n) => `So'nggi oydan ${n >= 0 ? "+" : ""}${n}`;

const PatientsChart = ({ data, view }) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  const width = 640;
  const height = 220;
  const paddingX = 30;
  const paddingTop = 24;
  const paddingBottom = 30;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;
  const maxValue = Math.max(...data.map((d) => d.value)) * 1.15;
  const stepX = chartW / (data.length - 1 || 1);
  const barSlot = chartW / data.length;
  const barWidth = barSlot * 0.5;
  const getX = (i) => paddingX + i * stepX;
  const getY = (value) => paddingTop + chartH - (value / maxValue) * chartH;
  const linePoints = data
    .map((d, i) => `${getX(i)},${getY(d.value)}`)
    .join(" ");
  const areaPoints = `${getX(0)},${paddingTop + chartH} ${linePoints} ${getX(data.length - 1)},${paddingTop + chartH}`;
  const gridLines = [0, 0.5, 1].map((f) => paddingTop + chartH - f * chartH);

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const tooltipX =
    hoverIndex !== null
      ? view === "bar"
        ? paddingX + hoverIndex * barSlot + barSlot / 2
        : getX(hoverIndex)
      : 0;
  const tooltipY = hovered
    ? view === "bar"
      ? paddingTop + chartH - (hovered.value / maxValue) * chartH
      : getY(hovered.value)
    : 0;

  const tooltipText = hovered
    ? `${hovered.label}: ${hovered.value} ta bemor`
    : "";
  const tooltipWidth = 26 + tooltipText.length * 5.6;
  const tooltipBoxX = Math.min(
    Math.max(tooltipX - tooltipWidth / 2, paddingX),
    width - paddingX - tooltipWidth,
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={s.ChartSvg}>
      {gridLines.map((y, i) => (
        <line
          key={i}
          x1={paddingX}
          y1={y}
          x2={width - paddingX}
          y2={y}
          className={s.GridLine}
        />
      ))}

      {view === "bar" ? (
        data.map((d, i) => {
          const barH = (d.value / maxValue) * chartH;
          const x = paddingX + i * barSlot + (barSlot - barWidth) / 2;
          const y = paddingTop + chartH - barH;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={4}
              className={`${s.ChartBar} ${hoverIndex === i ? s.ChartBarActive : ""}`}
            />
          );
        })
      ) : (
        <>
          <polygon points={areaPoints} className={s.ChartArea} />
          <polyline points={linePoints} className={s.ChartLine} />
          {data.map((d, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(d.value)}
              r={hoverIndex === i ? 6 : 4}
              className={s.ChartDot}
            />
          ))}
        </>
      )}

      {/* Har oy uchun ko'rinmas, keng "hover zonasi" — sichqonchani
          aniq nuqtaga tekkizmasdan ham tooltip chiqishi uchun */}
      {data.map((d, i) => (
        <rect
          key={`hit-${i}`}
          x={paddingX + i * barSlot}
          y={paddingTop}
          width={barSlot}
          height={chartH}
          className={s.ChartHitArea}
          onMouseEnter={() => setHoverIndex(i)}
          onMouseLeave={() => setHoverIndex(null)}
        />
      ))}

      {data.map((d, i) => (
        <text
          key={i}
          x={view === "bar" ? paddingX + i * barSlot + barSlot / 2 : getX(i)}
          y={height - 8}
          textAnchor="middle"
          className={`${s.ChartAxisLabel} ${hoverIndex === i ? s.ChartAxisLabelActive : ""}`}
        >
          {d.label}
        </text>
      ))}

      {hovered && (
        <g className={s.ChartTooltip} style={{ pointerEvents: "none" }}>
          <line
            x1={tooltipX}
            y1={tooltipY}
            x2={tooltipX}
            y2={paddingTop + chartH}
            className={s.ChartTooltipLine}
          />
          <rect
            x={tooltipBoxX}
            y={Math.max(tooltipY - 34, 2)}
            width={tooltipWidth}
            height={24}
            rx={6}
            className={s.ChartTooltipBox}
          />
          <text
            x={tooltipBoxX + tooltipWidth / 2}
            y={Math.max(tooltipY - 34, 2) + 16}
            textAnchor="middle"
            className={s.ChartTooltipText}
          >
            {tooltipText}
          </text>
        </g>
      )}
    </svg>
  );
};

const AdminHome = () => {
  const [chartView, setChartView] = useState("bar");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("hospital_access");
      const res = await fetch(`${api}/dashboard/status/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`Xato: ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e.message || "Ma'lumotni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading && !data)
    return (
      <section className={s.Dashboard}>
        <p>Yuklanmoqda...</p>
      </section>
    );
  if (error && !data) {
    return (
      <section className={s.Dashboard}>
        <p>{error}</p>
        <button className={s.SecondaryBtn} onClick={fetchStatus}>
          Qayta urinish
        </button>
      </section>
    );
  }

  const { staff, patients, rooms } = data;

  const staffBreakdown = [
    { role: "Bosh shifokorlar", count: staff.doctors, color: "#4a7bb5" },
    { role: "Shifokorlar", count: staff.assistants, color: "#8a5bd6" },
    { role: "Hamshiralar", count: staff.nurses, color: "#17643c" },
    {
      role: "Qabul hamshiralari",
      count: staff.receptionists,
      color: "#d99400",
    },
  ];

  // Jami xodimlar: har bir toifani qo'shib hisoblaymiz
  const totalStaff = staffBreakdown.reduce((sum, r) => sum + (r.count || 0), 0);

  const stats = [
    {
      title: "Jami xodimlar",
      value: totalStaff,
      change: `${staff.departments} ta bo'lim`,
      icon: "bi-people-fill",
      dark: true,
    },
    {
      title: "Bosh shifokorlar",
      value: staff.doctors,
      change: `${staff.departments} ta bo'lim`,
      icon: "bi-heart-pulse",
    },
    {
      title: "Hamshiralar",
      value: staff.nurses,
      change: `${staff.shifts} ta smena`,
      icon: "bi-clipboard2-pulse",
    },
    {
      title: "Jami bemorlar",
      value: patients.total,
      change: formatChange(patients.change),
      icon: "bi-person-lines-fill",
    },
  ];

  const monthlyPatients = (patients.monthly_chart || []).map((m) => ({
    label: MONTH_LABELS[m.month - 1] ?? String(m.month),
    value: m.count,
  }));

  const occupiedPercent =
    rooms.percentage ??
    (rooms.total > 0 ? Math.round((rooms.occupied / rooms.total) * 100) : 0);

  return (
    <section className={s.Dashboard}>
      <div className={s.TopRow}>
        <div>
          <h1>Boshqaruv paneli</h1>
          <p>Klinika bo'yicha umumiy ko'rsatkichlar</p>
        </div>
        <div className={s.TopBtns}>
          <button
            className={s.SecondaryBtn}
            onClick={fetchStatus}
            disabled={loading}
          >
            {loading ? "Yuklanmoqda..." : "Ma'lumotlarni qayta yuklash"}
          </button>
        </div>
      </div>

      <div className={s.StatsRow}>
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`${s.StatCard} ${stat.dark ? s.StatCardDark : ""}`}
          >
            <div className={s.StatTop}>
              <p>{stat.title}</p>
              <i className={`bi ${stat.icon}`}></i>
            </div>
            <h2>{stat.value}</h2>
            <span>{stat.change}</span>
          </div>
        ))}
      </div>

      <div className={s.ChartCard}>
        <div className={s.ChartHead}>
          <h3>
            Bemorlar statistikasi <span>(oylik)</span>
          </h3>
          <div className={s.ChartSwitch}>
            <button
              className={chartView === "bar" ? s.Active : ""}
              onClick={() => setChartView("bar")}
            >
              <i className="bi bi-bar-chart-fill"></i>
            </button>
            <button
              className={chartView === "line" ? s.Active : ""}
              onClick={() => setChartView("line")}
            >
              <i className="bi bi-graph-up"></i>
            </button>
          </div>
        </div>

        <div className={s.ChartSvgWrap}>
          {monthlyPatients.length > 0 ? (
            <PatientsChart data={monthlyPatients} view={chartView} />
          ) : (
            <p>Ma'lumot yo'q</p>
          )}
        </div>
      </div>

      <div className={s.BottomRow}>
        <div className={s.BreakdownCard}>
          <h3>Xodimlar taqsimoti</h3>
          <ul className={s.BreakdownList}>
            {staffBreakdown.map((row, i) => {
              const percent =
                totalStaff > 0 ? Math.round((row.count / totalStaff) * 100) : 0;
              return (
                <li key={i}>
                  <div className={s.BreakdownHead}>
                    <span>{row.role}</span>
                    <span className={s.BreakdownCount}>{row.count}</span>
                  </div>
                  <div className={s.BreakdownBarTrack}>
                    <div
                      className={s.BreakdownBarFill}
                      style={{
                        width: `${percent}%`,
                        backgroundColor: row.color,
                      }}
                    ></div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={s.ProgressCard}>
          <h3>Xonalar bandligi</h3>
          <div className={s.Donut} style={{ "--percent": occupiedPercent }}>
            <div className={s.DonutInner}>
              <h2>{occupiedPercent}%</h2>
              <span>Band</span>
            </div>
          </div>
          <p className={s.RoomsCaption}>
            {rooms.occupied} / {rooms.total} xona band
          </p>
          <div className={s.Legend}>
            <span>
              <i className={s.occupied}></i> Band
            </span>
            <span>
              <i className={s.free}></i> Bo'sh
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminHome;
