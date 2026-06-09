import React, { Suspense, lazy, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import "./style.css";

const UsersApp = lazy(() => import("mf_users/UsersApp"));
const ItemsApp = lazy(() => import("mf_items/ItemsApp"));
const RentalsApp = lazy(() => import("mf_rentals/RentalsApp"));
const API = import.meta.env.VITE_WEB_BFF_URL || "http://localhost:8081";

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
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<BrowserRouter><Layout /></BrowserRouter>);
