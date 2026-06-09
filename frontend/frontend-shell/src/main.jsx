import React, { Suspense, lazy, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import "./style.css";

const UsersApp = lazy(() => import("mf_users/UsersApp"));
const ItemsApp = lazy(() => import("mf_items/ItemsApp"));
const RentalsApp = lazy(() => import("mf_rentals/RentalsApp"));
const API = import.meta.env.VITE_WEB_BFF_URL || "http://localhost:8081";
const MOBILE_API = import.meta.env.VITE_MOBILE_BFF_URL || "http://localhost:8082";
const ADMIN_EMAIL = "gal@example.com";

function isAdmin(auth) {
  return auth?.user?.email?.toLowerCase() === ADMIN_EMAIL;
}

function statusClass(status) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "UP" || normalized === "CLOSED") return "status-ok";
  if (normalized === "DEGRADED" || normalized === "HALF_OPEN") return "status-warn";
  if (normalized === "DOWN" || normalized === "OPEN") return "status-bad";

  return "status-neutral";
}

function StatusPill({ value }) {
  return (
    <span className={`status-pill ${statusClass(value)}`}>
      {value || "UNKNOWN"}
    </span>
  );
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok && !options.allowErrorStatus) {
    throw new Error(data.error || data.detail || `Request failed: ${response.status}`);
  }

  return {
    ...data,
    httpStatus: response.status
  };
}

function PatternAdminPanel({ auth }) {
  const [webReady, setWebReady] = useState(null);
  const [mobileReady, setMobileReady] = useState(null);
  const [webBreakers, setWebBreakers] = useState(null);
  const [mobileBreakers, setMobileBreakers] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const allowed = isAdmin(auth);

  async function refreshAll() {
    if (!allowed) return;

    setLoading(true);
    setMessage("");

    try {
      const [webReadyData, mobileReadyData, webBreakerData, mobileBreakerData] =
        await Promise.allSettled([
          fetchJson(`${API}/health/ready`, { allowErrorStatus: true }),
          fetchJson(`${MOBILE_API}/health/ready`, { allowErrorStatus: true }),
          fetchJson(`${API}/admin/breakers`),
          fetchJson(`${MOBILE_API}/admin/breakers`)
        ]);

      setWebReady(
        webReadyData.status === "fulfilled"
          ? webReadyData.value
          : { service: "web-bff", status: "DOWN", error: webReadyData.reason.message }
      );

      setMobileReady(
        mobileReadyData.status === "fulfilled"
          ? mobileReadyData.value
          : { service: "mobile-bff", status: "DOWN", error: mobileReadyData.reason.message }
      );

      setWebBreakers(
        webBreakerData.status === "fulfilled"
          ? webBreakerData.value
          : { service: "web-bff", breakers: [], error: webBreakerData.reason.message }
      );

      setMobileBreakers(
        mobileBreakerData.status === "fulfilled"
          ? mobileBreakerData.value
          : { service: "mobile-bff", breakers: [], error: mobileBreakerData.reason.message }
      );

      setMessage("System pattern status refreshed.");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function triggerItemBreakerProbe() {
    if (!allowed) return;

    setLoading(true);
    setMessage("");

    try {
      await Promise.allSettled([
        fetchJson(`${API}/api/web/items/available`),
        fetchJson(`${API}/api/web/items/available`),
        fetchJson(`${API}/api/web/items/available`),
        fetchJson(`${API}/api/web/items/available`)
      ]);

      const breakerData = await fetchJson(`${API}/admin/breakers`);
      setWebBreakers(breakerData);
      setMessage(
        "Probe finished. If item-service is stopped, the item.getAvailableItems breaker should become OPEN."
      );
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (allowed) {
      refreshAll();
    }
  }, [allowed]);

  if (!allowed) {
    return (
      <section className="card">
        <h2>Admin</h2>
        <p className="error-box">
          This page is only available for the administrator account {ADMIN_EMAIL}.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="card admin-hero">
        <div>
          <p className="eyebrow">Microservice patterns</p>
          <h2>ToolLoop System Administration</h2>
          <p className="muted">
            This screen demonstrates the implemented microservice patterns:
            Circuit Breaker and Health Check API.
          </p>
        </div>

        <div className="actions">
          <button className="primary" onClick={refreshAll} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh status"}
          </button>

          <button className="secondary" onClick={triggerItemBreakerProbe} disabled={loading}>
            Probe item-service breaker
          </button>
        </div>
      </div>

      {message && (
        <p className={message.toLowerCase().includes("failed") ? "error-box" : "success-box"}>
          {message}
        </p>
      )}

      <div className="grid">
        <HealthCard title="Web BFF readiness" data={webReady} />
        <HealthCard title="Mobile BFF readiness" data={mobileReady} />
      </div>

      <div className="grid">
        <BreakerCard title="Web BFF circuit breakers" data={webBreakers} />
        <BreakerCard title="Mobile BFF circuit breakers" data={mobileBreakers} />
      </div>
    </section>
  );
}

function HealthCard({ title, data }) {
  return (
    <div className="card">
      <div className="details-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">
            {data?.service || "Waiting for response..."}
            {data?.httpStatus ? ` · HTTP ${data.httpStatus}` : ""}
          </p>
        </div>

        <StatusPill value={data?.status} />
      </div>

      {data?.error && (
        <p className="error-box">{data.error}</p>
      )}

      {data?.status === "DEGRADED" && (
        <p className="warning">
          BFF is running, but at least one downstream service is unavailable.
        </p>
      )}

      {!data && (
        <p className="muted">Loading readiness information...</p>
      )}

      {data?.checks && (
        <div className="health-checks">
          {data.checks.map((check) => (
            <div className="health-row" key={check.name}>
              <div>
                <strong>{check.name}</strong>
                {check.error && <p className="muted">{check.error}</p>}
              </div>

              <StatusPill value={check.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BreakerCard({ title, data }) {
  const breakers = data?.breakers || [];

  return (
    <div className="card">
      <div className="details-header">
        <div>
          <h3>{title}</h3>
          <p className="muted">{data?.service || "Waiting for response..."}</p>
        </div>

        <span className="badge">{breakers.length} breakers</span>
      </div>

      {data?.error && (
        <p className="error-box">{data.error}</p>
      )}

      {!data && (
        <p className="muted">Loading circuit breaker information...</p>
      )}

      {data && breakers.length === 0 && !data.error && (
        <p className="muted-box">
          No circuit breakers have been registered yet. Use the application or call BFF endpoints first.
        </p>
      )}

      <div className="breaker-list">
        {breakers.map((breaker) => (
          <div className="breaker-row" key={breaker.name}>
            <div>
              <strong>{breaker.name}</strong>
              {breaker.lastError && <p className="muted">{breaker.lastError}</p>}

              {breaker.stats && (
                <p className="muted">
                  Fires: {breaker.stats.fires ?? 0} · Failures: {breaker.stats.failures ?? 0} ·
                  Fallbacks: {breaker.stats.fallbacks ?? 0} · Timeouts: {breaker.stats.timeouts ?? 0}
                </p>
              )}

              {breaker.failureCount !== undefined && (
                <p className="muted">
                  Failures: {breaker.failureCount} · Successes: {breaker.successCount}
                </p>
              )}
            </div>

            <StatusPill value={breaker.state} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ auth }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      if (!auth?.user?._id || !auth?.token) return;
      try {
        const response = await fetch(`${API}/api/web/dashboard/${auth.user._id}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load dashboard");
        setDashboard(data);
      } catch (err) {
        setError(err.message);
      }
    }
    loadDashboard();
  }, [auth]);

  if (!auth?.token) {
    return (
      <section className="card hero">
        <h2>Welcome to ToolLoop</h2>
        <p className="muted">
          Log in or register in the Users section.
        </p>
        <div className="actions">
          <a className="primary" href="/users">Go to Users</a>
          <a className="secondary" href="/items">Browse Items</a>
        </div>
      </section>
    );
  }
  if (error) return <p className="error">{error}</p>;
  if (!dashboard) return <p>Loading dashboard...</p>;

  return (
    <section>
      <div className="card">
        <h2>Dashboard</h2>
      </div>
      <div className="three">
        <div className="card">
          <h3>Profile</h3>
          <p>{dashboard.user.firstName} {dashboard.user.lastName}</p>
          <p className="muted">{dashboard.user.email}</p>
        </div>
        <div className="card">
          <h3>Owned items</h3>
          <p className="big">{dashboard.summary.ownedItemCount}</p>
        </div>
        <div className="card">
          <h3>Borrowing rentals</h3>
          <p className="big">{dashboard.summary.borrowedRentalCount}</p>
        </div>
      </div>
    </section>
  );
}

function Layout() {
  const navigate = useNavigate();
  const [auth, setAuth] = useState(() => {
    const raw = localStorage.getItem("toollop-auth");
    return raw ? JSON.parse(raw) : null;
  });

  function handleAuthChange(nextAuth) {
    setAuth(nextAuth);
    if (nextAuth) {
      localStorage.setItem("toollop-auth", JSON.stringify(nextAuth));
      navigate("/");
    } else {
      localStorage.removeItem("toollop-auth");
      navigate("/users");
    }
  }

  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand">ToolLoop</NavLink>
        <nav>
          <NavLink to="/users">Users</NavLink>
          <NavLink to="/items">Items</NavLink>
          <NavLink to="/rentals">Rentals</NavLink>
          {isAdmin(auth) && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="auth">
          {auth?.user ? <><span>{auth.user.firstName} {auth.user.lastName}</span><button className="secondary" onClick={() => handleAuthChange(null)}>Logout</button></> : <span>Not logged in</span>}
        </div>
      </header>
      <main className="container">
        <Suspense fallback={<p>Loading Micro Frontend...</p>}>
          <Routes>
            <Route path="/" element={<Dashboard auth={auth} />} />
            <Route path="/users/*" element={<UsersApp auth={auth} onAuthChange={handleAuthChange} />} />
            <Route path="/items/*" element={<ItemsApp auth={auth} />} />
            <Route path="/rentals/*" element={<RentalsApp auth={auth} />} />
            <Route path="/admin" element={<PatternAdminPanel auth={auth} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<BrowserRouter><Layout /></BrowserRouter>);
