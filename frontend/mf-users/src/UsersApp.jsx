import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_WEB_BFF_URL || "http://localhost:8081";

const initialForm = {
  firstName: "Gal",
  lastName: "Leitgeb",
  email: "gal@example.com",
  password: "password123",
  phone: "040123456",
  city: "Maribor"
};

export default function UsersApp({ auth, onAuthChange }) {
  const [mode, setMode] = useState("login");
  const [users, setUsers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(initialForm);

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function parse(response) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.detail || JSON.stringify(data));
    }
    return data;
  }

  function isPositiveMessage(text) {
    return ["successful", "updated", "deleted", "loaded"].some((word) =>
      text.toLowerCase().includes(word)
    );
  }

  async function submitAuth(event) {
    event.preventDefault();
    setMessage("");

    try {
      const path = mode === "login" ? "/api/web/auth/login" : "/api/web/auth/register";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : form;

      const data = await parse(
        await fetch(`${API}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        })
      );

      onAuthChange?.({ token: data.token, user: data });
      setProfile(data);
      setMessage(mode === "login" ? "Login successful" : "Registration successful");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function loadProfile() {
    if (!auth?.user?._id) {
      return setMessage("Login first.");
    }

    try {
      const data = await parse(
        await fetch(`${API}/api/web/users/${auth.user._id}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        })
      );

      setProfile(data);
      setForm((prev) => ({
        ...prev,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        email: data.email || prev.email,
        phone: data.phone || "",
        city: data.city || ""
      }));
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function loadUsers() {
    if (!auth?.token) {
      return setMessage("Login first.");
    }

    try {
      const data = await parse(
        await fetch(`${API}/api/web/users`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        })
      );

      setUsers(data);
      setMessage("Users loaded");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function updateProfile() {
    if (!auth?.user?._id) {
      return setMessage("Login first.");
    }

    try {
      const data = await parse(
        await fetch(`${API}/api/web/users/${auth.user._id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            phone: form.phone,
            city: form.city
          })
        })
      );

      setProfile(data);
      setMessage("Profile updated");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function deleteProfile() {
    if (!auth?.user?._id) {
      return setMessage("Login first.");
    }

    const confirmed = confirm(
      "Delete your profile? This removes your user account from the user-service."
    );

    if (!confirmed) return;

    try {
      await parse(
        await fetch(`${API}/api/web/users/${auth.user._id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${auth.token}` }
        })
      );

      setMessage("Profile deleted");
      setProfile(null);
      setUsers([]);
      onAuthChange?.(null);
    } catch (err) {
      setMessage(err.message);
    }
  }

  useEffect(() => {
    if (auth?.token) {
      loadProfile();
      loadUsers();
    } else {
      setProfile(null);
      setUsers([]);
    }
  }, [auth?.token]);

  const displayName = profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
    : "";

  return (
    <section>
      <div className="card">
        <h2>Users</h2>
        <p className="muted">
          Register, log in, view your profile, update your own data and list users through the user-service.
        </p>

        <div className="actions">
          <button className="secondary" onClick={() => setMode("login")}>Login</button>
          <button className="secondary" onClick={() => setMode("register")}>Register</button>
          <button className="secondary" onClick={loadUsers}>Refresh users</button>
        </div>

        {message && (
          <p className={isPositiveMessage(message) ? "success" : "error"}>
            {message}
          </p>
        )}
      </div>

      <div className="grid">
        <div className="card">
          <h3>{mode === "login" ? "Login" : "Register"}</h3>

          <form className="form" onSubmit={submitAuth}>
            {mode === "register" && (
              <>
                <label>
                  First name
                  <input
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                  />
                </label>

                <label>
                  Last name
                  <input
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                  />
                </label>

                <label>
                  Phone
                  <input
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </label>

                <label>
                  City
                  <input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                  />
                </label>
              </>
            )}

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
              />
            </label>

            <button className="primary">
              {mode === "login" ? "Login" : "Register"}
            </button>
          </form>
        </div>

        <div className="card profile-card">
          <h3>My Profile</h3>

          {!auth?.user && (
            <div className="empty">
              <strong>No active session</strong>
              <p className="muted">Log in or register to manage your profile.</p>
            </div>
          )}

          {auth?.user && (
            <>
              <div className="profile-header">
                <div className="avatar">
                  {(profile?.firstName?.[0] || auth.user.firstName?.[0] || "U").toUpperCase()}
                </div>

                <div>
                  <h2>{displayName || "Logged-in user"}</h2>
                  <p className="muted">{profile?.email || auth.user.email}</p>
                  <span className="badge">
                    {profile?.isActive === false ? "inactive" : "active"}
                  </span>
                </div>
              </div>

              <div className="form">
                <label>
                  First name
                  <input
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                  />
                </label>

                <label>
                  Last name
                  <input
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                  />
                </label>

                <label>
                  Phone
                  <input
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </label>

                <label>
                  City
                  <input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                  />
                </label>

                <div className="actions">
                  <button className="primary" type="button" onClick={updateProfile}>
                    Save profile
                  </button>

                  <button className="danger" type="button" onClick={deleteProfile}>
                    Delete profile
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Users list</h3>

        {!auth?.token && (
          <p className="muted">Log in to load users.</p>
        )}

        {auth?.token && users.length === 0 && (
          <p className="muted">No users loaded yet.</p>
        )}

        <div className="list">
          {users.map((u) => (
            <div className="row" key={u._id}>
              <div>
                <strong>{u.firstName} {u.lastName}</strong>
                <p className="muted">{u.email} · {u.city || "No city"}</p>
              </div>

              <span className="badge">{u.isActive ? "active" : "inactive"}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}