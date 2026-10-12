import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCashierDashboard } from "../../../api/cashier";
import styles from "./CashierHome.module.scss";

const fmt = (n) =>
  Number(n || 0).toLocaleString("uz-UZ", { maximumFractionDigits: 0 });

const METHOD_LABELS = {
  CASH: "Naqd",
  CARD: "Karta",
  TRANSFER: "Bank",
  ONLINE: "Online",
};

const METHOD_COLORS = {
  CASH: "green",
  CARD: "blue",
  TRANSFER: "yellow",
  ONLINE: "purple",
};

const METHOD_CLASS = {
  CASH: "cash",
  CARD: "card",
  TRANSFER: "bank",
  ONLINE: "online",
};

const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function CashierHome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  const load = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    getCashierDashboard()
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.detail || "Xato yuz berdi"))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <div className={styles.error}>❌ {error}</div>;
  if (!data) return null;

  const { today, month, unpaid, recent } = data;

  return (
    <div className={styles.page}>
      {/* ============ HEADER ============ */}
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h1>Bosh sahifa</h1>
          <p>Bugungi to‘lovlar va umumiy statistika</p>
        </div>

        <button
          className={`${styles.refresh} ${refreshing ? styles.spinning : ""}`}
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Yangilash
        </button>
      </div>

      {/* ============ STAT CARDS ============ */}
      <div className={styles.stats}>
        <StatCard
          title="Bugungi tushum"
          value={`${fmt(today.total)} so'm`}
          sub={`${today.count} ta to'lov`}
          color="blue"
          icon="💰"
        />
        <StatCard
          title="Bu oy"
          value={`${fmt(month.total)} so'm`}
          sub={`${month.count} ta to'lov`}
          color="green"
          icon="📅"
        />
        <StatCard
          title="To'lanmagan tashrif"
          value={unpaid.visits}
          sub="Doktor ko'riklari"
          color="orange"
          icon="⏳"
          onClick={() => navigate("/cashier/unpaid-visits")}
        />
        <StatCard
          title="To'lanmagan xizmat"
          value={unpaid.examinations}
          sub="Examination requestlar"
          color="red"
          icon="🩺"
          onClick={() => navigate("/cashier/unpaid-examinations")}
        />
      </div>

      {/* ============ BREAKDOWNS ============ */}
      <div className={styles.grid2}>
        <Card
          title="Bugun — to'lov turi bo'yicha"
          icon="📊"
        >
          <SourceRow
            label="Doktor ko'rik to'lovlari"
            dotColor="#3b82f6"
            value={today.by_source.medical_visit}
            total={today.total}
            fillClass="blue"
            onClick={() => navigate("/cashier/doctor-visits")}
          />
          <SourceRow
            label="Doktor ko'rik (examination)"
            dotColor="#6366f1"
            value={today.by_source.examination_request}
            total={today.total}
            fillClass="indigo"
            onClick={() => navigate("/cashier/examination-requests")}
          />
          <SourceRow
            label="Tashqi bemor to'lovlari"
            dotColor="#a855f7"
            value={today.by_source.direct_service}
            total={today.total}
            fillClass="purple"
            onClick={() => navigate("/cashier/direct-services")}
          />
          <SourceRow
            label="Davolanish to'lovlari"
            dotColor="#10b981"
            value={today.by_source.treatment_plan}
            total={today.total}
            fillClass="green"
            onClick={() => navigate("/cashier/treatment-plans")}
          />
        </Card>

        <Card title="Bugun — to'lov usuli bo'yicha" icon="💳">
          {Object.entries(today.by_method).map(([code, amount]) => (
            <SourceRow
              key={code}
              label={METHOD_LABELS[code] || code}
              dotColor={
                code === "CASH"
                  ? "#10b981"
                  : code === "CARD"
                  ? "#3b82f6"
                  : code === "TRANSFER"
                  ? "#eab308"
                  : "#a855f7"
              }
              value={amount}
              total={today.total}
              fillClass={METHOD_COLORS[code] || "blue"}
            />
          ))}
        </Card>
      </div>

      {/* ============ RECENT ============ */}
      <Card title="Oxirgi to'lovlar" icon="🕒">
        {recent.length === 0 ? (
          <div className={styles.emptyBox}>
            <div className={styles.emptyIcon}>📭</div>
            <div className={styles.emptyText}>
              Hozircha to‘lovlar mavjud emas
            </div>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Bemor</th>
                  <th>Turi</th>
                  <th>Usul</th>
                  <th className={styles.right}>Summa</th>
                  <th>Vaqt</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className={styles.patientCell}>
                        <div className={styles.avatar}>
                          {initials(p.patient?.full_name)}
                        </div>
                        <span className={styles.name}>
                          {p.patient?.full_name || "—"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.badge}>{p.source}</span>
                    </td>
                    <td>
                      <span
                        className={`${styles.methodBadge} ${
                          styles[METHOD_CLASS[p.payment_method] || "cash"]
                        }`}
                      >
                        {p.payment_method_display}
                      </span>
                    </td>
                    <td className={`${styles.right} ${styles.amount}`}>
                      {fmt(p.amount)} so‘m
                    </td>
                    <td className={styles.muted}>
                      {new Date(p.created_at).toLocaleString("uz-UZ", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function StatCard({ title, value, sub, color, icon, onClick }) {
  return (
    <div
      className={`${styles.statCard} ${styles[color]} ${
        onClick ? styles.clickable : ""
      }`}
      onClick={onClick}
    >
      <div className={styles.statTop}>
        <div className={styles.statLabel}>{title}</div>
        <div className={`${styles.statIconBox} ${styles[color]}`}>{icon}</div>
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statSub}>{sub}</div>
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3>
          {icon && <span className={styles.icon}>{icon}</span>}
          {title}
        </h3>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}

function SourceRow({ label, value, total, fillClass, dotColor, onClick }) {
  const pct = total > 0 ? (Number(value) / Number(total)) * 100 : 0;

  return (
    <div
      className={`${styles.sourceRow} ${onClick ? styles.clickable : ""}`}
      onClick={onClick}
    >
      <div className={styles.sourceHeader}>
        <span className={styles.sourceLabel}>
          <span className={styles.dot} style={{ background: dotColor }} />
          {label}
        </span>
        <span className={styles.sourceValue}>
          {Number(value || 0).toLocaleString("uz-UZ")} so‘m
        </span>
      </div>
      <div className={styles.sourceBar}>
        <div
          className={`${styles.fill} ${styles[fillClass]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   SKELETON
   ========================================================= */
function LoadingSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <h1>Bosh sahifa</h1>
          <p>Yuklanmoqda...</p>
        </div>
      </div>

      <div className={styles.stats}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
        ))}
      </div>

      <div className={styles.grid2}>
        {[1, 2].map((i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cardHead}>
              <div
                className={styles.skeleton}
                style={{ width: 180, height: 20 }}
              />
            </div>
            <div className={styles.cardBody}>
              {[1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  className={`${styles.skeleton} ${styles.skeletonRow}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}