import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCashierDashboard } from "../../../api/cashier";
import styles from "./CashierHome.module.scss";

const fmt = (n) =>
  Number(n || 0).toLocaleString("uz-UZ", { maximumFractionDigits: 0 });

const METHODS = {
  CASH: { label: "Naqd", color: "green", icon: "bi-cash-stack", cls: "cash" },
  CARD: { label: "Karta", color: "blue", icon: "bi-credit-card-2-front", cls: "card" },
  TRANSFER: { label: "Bank", color: "yellow", icon: "bi-bank", cls: "bank" },
  ONLINE: { label: "Online", color: "purple", icon: "bi-globe2", cls: "online" },
};

const initials = (name) =>
  (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const todayLabel = () =>
  new Date().toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
  if (error) {
    return (
      <div className={styles.error}>
        <i className="bi bi-exclamation-triangle-fill"></i>
        {error}
      </div>
    );
  }
  if (!data) return null;

  const { today, month, unpaid, recent } = data;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.dateChip}>
            <i className="bi bi-calendar3"></i>
            {todayLabel()}
          </span>
          <h1>Bosh sahifa</h1>
          <p>Bugungi to'lovlar va umumiy statistika</p>
        </div>

        <button
          className={`${styles.refresh} ${refreshing ? styles.spinning : ""}`}
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <i className="bi bi-arrow-clockwise"></i>
          Yangilash
        </button>
      </div>

      <div className={styles.stats}>
        <StatCard
          title="Bugungi tushum"
          value={`${fmt(today.total)} so'm`}
          sub={`${today.count} ta to'lov`}
          color="blue"
          icon="bi-wallet2"
        />
        <StatCard
          title="Bu oy"
          value={`${fmt(month.total)} so'm`}
          sub={`${month.count} ta to'lov`}
          color="green"
          icon="bi-calendar2-check"
        />
        <StatCard
          title="To'lanmagan tashrif"
          value={unpaid.visits}
          sub="Doktor ko'riklari"
          color="orange"
          icon="bi-hourglass-split"
          onClick={() => navigate("/cashier/unpaid-visits")}
        />
        <StatCard
          title="To'lanmagan xizmat"
          value={unpaid.examinations}
          sub="Examination requestlar"
          color="red"
          icon="bi-clipboard2-pulse"
          onClick={() => navigate("/cashier/unpaid-examinations")}
        />
      </div>

      <div className={styles.grid2}>
        <Card title="Bugun — to'lov turi bo'yicha" icon="bi-pie-chart">
          <SourceRow
            label="Doktor ko'rik to'lovlari"
            icon="bi-heart-pulse"
            value={today.by_source.medical_visit}
            total={today.total}
            color="blue"
            onClick={() => navigate("/cashier/doctor-visits")}
          />
          <SourceRow
            label="Doktor ko'rik (examination)"
            icon="bi-clipboard2-check"
            value={today.by_source.examination_request}
            total={today.total}
            color="indigo"
            onClick={() => navigate("/cashier/examination-requests")}
          />
          <SourceRow
            label="Tashqi bemor to'lovlari"
            icon="bi-person-vcard"
            value={today.by_source.direct_service}
            total={today.total}
            color="purple"
            onClick={() => navigate("/cashier/direct-services")}
          />
          <SourceRow
            label="Davolanish to'lovlari"
            icon="bi-capsule-pill"
            value={today.by_source.treatment_plan}
            total={today.total}
            color="green"
            onClick={() => navigate("/cashier/treatment-plans")}
          />
        </Card>

        <Card title="Bugun — to'lov usuli bo'yicha" icon="bi-credit-card-2-back">
          {Object.entries(today.by_method).map(([code, amount]) => {
            const m = METHODS[code];
            return (
              <SourceRow
                key={code}
                label={m?.label || code}
                icon={m?.icon || "bi-cash"}
                value={amount}
                total={today.total}
                color={m?.color || "blue"}
              />
            );
          })}
        </Card>
      </div>

      <Card title="Oxirgi to'lovlar" icon="bi-clock-history" flush>
        {recent.length === 0 ? (
          <div className={styles.emptyBox}>
            <div className={styles.emptyIcon}>
              <i className="bi bi-inbox"></i>
            </div>
            <div className={styles.emptyText}>
              Hozircha to'lovlar mavjud emas
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
                {recent.map((p) => {
                  const m = METHODS[p.payment_method] || METHODS.CASH;
                  return (
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
                        <span className={`${styles.methodBadge} ${styles[m.cls]}`}>
                          <i className={`bi ${m.icon}`}></i>
                          {p.payment_method_display}
                        </span>
                      </td>
                      <td className={`${styles.right} ${styles.amount}`}>
                        {fmt(p.amount)} so'm
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ title, value, sub, color, icon, onClick }) {
  return (
    <div
      className={`${styles.statCard} ${styles[color]} ${
        onClick ? styles.clickable : ""
      }`}
      onClick={onClick}
    >
      <div className={styles.statTop}>
        <div className={`${styles.statIconBox} ${styles[color]}`}>
          <i className={`bi ${icon}`}></i>
        </div>
        {onClick && <i className={`bi bi-arrow-up-right ${styles.statArrow}`}></i>}
      </div>
      <div className={styles.statLabel}>{title}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statSub}>{sub}</div>
    </div>
  );
}

function Card({ title, icon, flush, children }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3>
          {icon && (
            <span className={styles.icon}>
              <i className={`bi ${icon}`}></i>
            </span>
          )}
          {title}
        </h3>
      </div>
      <div className={flush ? styles.cardBodyFlush : styles.cardBody}>
        {children}
      </div>
    </div>
  );
}

function SourceRow({ label, icon, value, total, color, onClick }) {
  const pct = total > 0 ? (Number(value) / Number(total)) * 100 : 0;

  return (
    <div
      className={`${styles.sourceRow} ${onClick ? styles.clickable : ""}`}
      onClick={onClick}
    >
      <div className={`${styles.chip} ${styles[color]}`}>
        <i className={`bi ${icon}`}></i>
      </div>

      <div className={styles.sourceMain}>
        <div className={styles.sourceHeader}>
          <span className={styles.sourceLabel}>{label}</span>
          <span className={styles.sourceValue}>
            {Number(value || 0).toLocaleString("uz-UZ")} so'm
          </span>
        </div>
        <div className={styles.sourceBar}>
          <div
            className={`${styles.fill} ${styles[color]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={styles.sourcePct}>{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

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
              <div className={styles.skeleton} style={{ width: 180, height: 20 }} />
            </div>
            <div className={styles.cardBody}>
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className={`${styles.skeleton} ${styles.skeletonRow}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}