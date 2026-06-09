import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_WEB_BFF_URL || "http://localhost:8081";

const emptyItem = {
  name: "Cordless Drill",
  description: "Useful tool for home repairs",
  category: "Tools",
  status: "AVAILABLE",
  location: "Maribor"
};

function toDatetimeLocalValue(date = new Date()) {
  const localOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - localOffsetMs).toISOString().slice(0, 16);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const rentalDefaults = {
  startDate: toDatetimeLocalValue(addDays(new Date(), 1)),
  endDate: toDatetimeLocalValue(addDays(new Date(), 2)),
  message: "Can I borrow this?"
};

export default function ItemsApp({ auth }) {
  const [items, setItems] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyItem);
  const [rentalForm, setRentalForm] = useState(rentalDefaults);
  const [category, setCategory] = useState("Tools");
  const [message, setMessage] = useState("");

  const myUserId = auth?.user?._id;
  const minRentalDate = toDatetimeLocalValue(new Date());

  async function parse(response) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.detail || JSON.stringify(data));
    }
    return data;
  }

  function showMessage(text) {
    setMessage(text);
  }

  async function load(path = "/api/web/items") {
    try {
      const data = await parse(await fetch(`${API}${path}`));
      setItems(data);
    } catch (err) {
      showMessage(err.message);
    }
  }

  async function loadUsersForOwnerNames() {
    if (!auth?.token) {
      setUsersById({});
      return;
    }

    try {
      const users = await parse(
        await fetch(`${API}/api/web/users`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        })
      );

      const map = {};
      for (const user of users) {
        map[user._id] = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
      }

      setUsersById(map);
    } catch {
      setUsersById({});
    }
  }

  async function loadDetails(id) {
    try {
      const data = await parse(await fetch(`${API}/api/web/items/${id}`));
      setSelected(data);
    } catch (err) {
      showMessage(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadUsersForOwnerNames();
  }, [auth?.token]);

  const ownerItems = useMemo(
    () => myUserId ? items.filter((i) => i.ownerId === myUserId) : [],
    [items, myUserId]
  );

  function ownerLabel(ownerId) {
    if (!ownerId) return "Unknown owner";
    if (ownerId === myUserId) return "You";
    return usersById[ownerId] || "Owner information unavailable";
  }

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateRental(name, value) {
    setRentalForm((prev) => ({ ...prev, [name]: value }));
  }

  function edit(item) {
    setSelected(item);
    setForm({
      name: item.name,
      description: item.description,
      category: item.category,
      status: item.status,
      location: item.location
    });
    setEditing(true);
    setShowForm(true);
  }

  function plus() {
    setForm(emptyItem);
    setEditing(false);
    setShowForm(true);
  }

  async function saveItem(event) {
    event.preventDefault();

    if (!myUserId) {
      return showMessage("Login first. The item owner is set automatically from the logged-in user.");
    }

    try {
      const url = editing
        ? `${API}/api/web/items/${selected.id}`
        : `${API}/api/web/items`;

      const method = editing ? "PUT" : "POST";
      const body = editing ? form : { ...form, ownerId: myUserId };

      const data = await parse(
        await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        })
      );

      showMessage(data.message || (editing ? "Item updated" : "Item created"));
      setShowForm(false);
      await load();

      if (editing && selected?.id) {
        await loadDetails(selected.id);
      }
    } catch (err) {
      showMessage(err.message);
    }
  }

  async function updateStatus(item, status) {
    try {
      const data = await parse(
        await fetch(`${API}/api/web/items/${item.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        })
      );

      showMessage(data.message || "Status updated");
      await load();
      await loadDetails(item.id);
    } catch (err) {
      showMessage(err.message);
    }
  }

  async function deleteItem(item) {
    if (!confirm(`Delete ${item.name}?`)) return;

    try {
      const data = await parse(
        await fetch(`${API}/api/web/items/${item.id}`, {
          method: "DELETE"
        })
      );

      showMessage(data.message || "Item deleted");

      if (selected?.id === item.id) {
        setSelected(null);
      }

      await load();
    } catch (err) {
      showMessage(err.message);
    }
  }

  function validateRentalDates() {
    const now = new Date();
    const start = new Date(rentalForm.startDate);
    const end = new Date(rentalForm.endDate);

    if (!rentalForm.startDate || !rentalForm.endDate) {
      return "Please choose both rental dates.";
    }

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "Please choose valid rental dates.";
    }

    if (start < now) {
      return "The start date cannot be in the past.";
    }

    if (start >= end) {
      return "The start date must be before the end date.";
    }

    return null;
  }

  async function requestRental() {
    if (!myUserId) {
      return showMessage("Login first.");
    }

    if (!selected) return;

    if (selected.ownerId === myUserId) {
      return showMessage("You cannot request a rental for your own item.");
    }

    if (selected.status !== "AVAILABLE") {
      return showMessage("This item is not currently available.");
    }

    const validationError = validateRentalDates();

    if (validationError) {
      return showMessage(validationError);
    }

    try {
      const rental = await parse(
        await fetch(`${API}/api/web/items/${selected.id}/rentals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            borrowerId: myUserId,
            startDate: new Date(rentalForm.startDate).toISOString(),
            endDate: new Date(rentalForm.endDate).toISOString(),
            message: rentalForm.message
          })
        })
      );

      showMessage(`Rental requested successfully: ${rental.id}`);
      setRentalForm(rentalDefaults);
    } catch (err) {
      showMessage(err.message);
    }
  }

  return (
    <section>
      <div className="card">
        <div className="row">
          <div>
            <h2>Items</h2>
            <p className="muted">
              Browse items, create your own listings, update availability and request rentals.
            </p>
          </div>

          <button className="icon" onClick={plus} title="Create item">+</button>
        </div>

        {message && <p className="message">{message}</p>}
      </div>

      <div className="card">
        <div className="actions">
          <button className="secondary" onClick={() => load()}>All</button>
          <button className="secondary" onClick={() => load("/api/web/items/available")}>Available</button>

          {myUserId && (
            <button className="secondary" onClick={() => load(`/api/web/items/owner/${myUserId}`)}>
              My items
            </button>
          )}

          <input
            style={{ maxWidth: 220 }}
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <button className="secondary" onClick={() => load(`/api/web/items/category/${category}`)}>
            Category
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h3>{editing ? "Edit item" : "Create item"}</h3>

          <form className="form" onSubmit={saveItem}>
            <label>
              Name
              <input value={form.name} onChange={(e) => update("name", e.target.value)} />
            </label>

            <label>
              Description
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)} />
            </label>

            <label>
              Category
              <input value={form.category} onChange={(e) => update("category", e.target.value)} />
            </label>

            <label>
              Location
              <input value={form.location} onChange={(e) => update("location", e.target.value)} />
            </label>

            {editing && (
              <label>
                Status
                <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                  <option>AVAILABLE</option>
                  <option>BORROWED</option>
                  <option>UNAVAILABLE</option>
                </select>
              </label>
            )}

            <div className="actions">
              <button className="primary">Save</button>
              <button className="secondary" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid">
        <div className="card">
          <h3>Item list</h3>

          {items.length === 0 && (
            <p className="muted">No items found for the selected filter.</p>
          )}

          <div className="list">
            {items.map((item) => (
              <div className="row" key={item.id}>
                <div onClick={() => loadDetails(item.id)} style={{ cursor: "pointer" }}>
                  <strong>{item.name}</strong>
                  <p className="muted">
                    {item.category} · {item.location} · <span className="badge">{item.status}</span>
                  </p>
                  <small>Owner: {ownerLabel(item.ownerId)}</small>
                </div>

                <div className="actions">
                  <button className="secondary" onClick={() => loadDetails(item.id)}>Details</button>

                  {item.ownerId === myUserId && (
                    <>
                      <button className="secondary" onClick={() => edit(item)}>Edit</button>
                      <button className="danger" onClick={() => deleteItem(item)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Item details</h3>

          {selected ? (
            <>
              <p>
                <strong>{selected.name}</strong>{" "}
                <span className="badge">{selected.status}</span>
              </p>

              <p>{selected.description}</p>
              <p className="muted">{selected.category} · {selected.location}</p>
              <p className="muted">Owner: {ownerLabel(selected.ownerId)}</p>

              {selected.ownerId !== myUserId && (
                <div className="form rental-box">
                  <h4>Request rental</h4>

                  {!myUserId && (
                    <p className="muted">Log in before requesting this item.</p>
                  )}

                  {selected.status !== "AVAILABLE" && (
                    <p className="warning">This item is not currently available.</p>
                  )}

                  <label>
                    From
                    <input
                      type="datetime-local"
                      min={minRentalDate}
                      value={rentalForm.startDate}
                      onChange={(e) => updateRental("startDate", e.target.value)}
                    />
                  </label>

                  <label>
                    To
                    <input
                      type="datetime-local"
                      min={rentalForm.startDate || minRentalDate}
                      value={rentalForm.endDate}
                      onChange={(e) => updateRental("endDate", e.target.value)}
                    />
                  </label>

                  <label>
                    Message
                    <textarea
                      value={rentalForm.message}
                      onChange={(e) => updateRental("message", e.target.value)}
                    />
                  </label>

                  <button
                    className="primary"
                    onClick={requestRental}
                    disabled={!myUserId || selected.status !== "AVAILABLE"}
                  >
                    Request this item
                  </button>
                </div>
              )}

              {selected.ownerId === myUserId && (
                <div className="actions">
                  <button className="secondary" onClick={() => updateStatus(selected, "AVAILABLE")}>
                    Mark available
                  </button>

                  <button className="secondary" onClick={() => updateStatus(selected, "UNAVAILABLE")}>
                    Mark unavailable
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="muted">Click an item to view details.</p>
          )}
        </div>
      </div>

      {myUserId && (
        <div className="card">
          <h3>My items on current list</h3>
          <p className="big">{ownerItems.length}</p>
        </div>
      )}
    </section>
  );
}