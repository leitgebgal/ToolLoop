import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_WEB_BFF_URL || "http://localhost:8081";

function formatDate(value) {
  if (!value) return "Unknown date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function isPositiveMessage(text) {
  return ["updated", "cancelled", "loaded", "success"].some((word) =>
    text.toLowerCase().includes(word)
  );
}

function getAllowedOwnerActions(rental) {
  if (!rental) return [];

  switch (rental.status) {
    case "Pending":
      return [
        { label: "Approve", status: "Approved", className: "secondary" },
        { label: "Reject", status: "Rejected", className: "danger" }
      ];

    case "Approved":
      return [
        { label: "Mark active", status: "Active", className: "secondary" }
      ];

    case "Active":
      return [
        { label: "Mark completed", status: "Completed", className: "primary" }
      ];

    default:
      return [];
  }
}

function canCancel(rental) {
  return ["Pending", "Approved", "Active"].includes(rental.status);
}

export default function RentalsApp({ auth }) {
  const [borrowed, setBorrowed] = useState([]);
  const [owned, setOwned] = useState([]);
  const [selected, setSelected] = useState(null);
  const [events, setEvents] = useState([]);
  const [itemNames, setItemNames] = useState({});
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  const myUserId = auth?.user?._id;

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

  async function loadItemNames(rentals) {
    const uniqueItemIds = [...new Set(rentals.map((r) => r.itemId).filter(Boolean))];

    if (uniqueItemIds.length === 0) {
      setItemNames({});
      return;
    }

    const results = await Promise.allSettled(
      uniqueItemIds.map(async (itemId) => {
        const item = await parse(await fetch(`${API}/api/web/items/${itemId}`));
        return [itemId, item.name || "Unnamed item"];
      })
    );

    const map = {};

    for (const result of results) {
      if (result.status === "fulfilled") {
        const [itemId, name] = result.value;
        map[itemId] = name;
      }
    }

    setItemNames(map);
  }

  function itemLabel(itemId) {
    if (!itemId) return "Unknown item";
    return itemNames[itemId] || "Loading item name...";
  }

  async function loadRentals() {
    if (!myUserId) {
      setBorrowed([]);
      setOwned([]);
      setSelected(null);
      setItemNames({});
      return;
    }

    try {
      const [borrowedRentals, ownedRentals] = await Promise.all([
        parse(await fetch(`${API}/api/web/rentals/borrower/${myUserId}`)),
        parse(await fetch(`${API}/api/web/rentals/owner/${myUserId}`))
      ]);

      setBorrowed(borrowedRentals);
      setOwned(ownedRentals);

      await loadItemNames([...borrowedRentals, ...ownedRentals]);

      showMessage("Rentals loaded");
    } catch (err) {
      showMessage(err.message);
    }
  }

  async function loadDetails(id) {
    try {
      const rental = await parse(await fetch(`${API}/api/web/rentals/${id}`));
      setSelected(rental);

      if (rental.itemId && !itemNames[rental.itemId]) {
        await loadItemNames([rental]);
      }
    } catch (err) {
      showMessage(err.message);
    }
  }

  async function updateRentalStatus(nextStatus) {
    if (!selected) return;

    const isOwner = selected.ownerId === myUserId;

    if (!isOwner) {
      showMessage("Only the owner of the item can change rental status.");
      return;
    }

    try {
      const data = await parse(
        await fetch(`${API}/api/web/rentals/${selected.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: nextStatus,
            rejectionReason: nextStatus === "Rejected" ? reason || null : null
          })
        })
      );

      setSelected(data);
      showMessage(`Rental updated to ${data.status}`);
      await loadRentals();
    } catch (err) {
      showMessage(err.message);
    }
  }

  async function cancelRental(rental) {
    if (!myUserId) return;

    if (!canCancel(rental)) {
      showMessage(`Rental with status ${rental.status} cannot be cancelled.`);
      return;
    }

    const confirmed = confirm(`Cancel rental for ${itemLabel(rental.itemId)}?`);

    if (!confirmed) return;

    try {
      await parse(
        await fetch(`${API}/api/web/rentals/${rental.id}?requesterId=${myUserId}`, {
          method: "DELETE"
        })
      );

      showMessage("Rental cancelled");

      if (selected?.id === rental.id) {
        setSelected(null);
      }

      await loadRentals();
    } catch (err) {
      showMessage(err.message);
    }
  }

  useEffect(() => {
    loadRentals();
  }, [myUserId]);

  useEffect(() => {
    const source = new EventSource(`${API}/api/web/rentals/stream`);

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setEvents((prev) => [parsed, ...prev].slice(0, 8));
      } catch {
        setEvents((prev) => [event.data, ...prev].slice(0, 8));
      }
    };

    source.onerror = () => source.close();

    return () => source.close();
  }, []);

  const pendingOwned = useMemo(
    () => owned.filter((r) => r.status === "Pending"),
    [owned]
  );

  function RentalRow({ rental, role }) {
    return (
      <div className="row">
        <div onClick={() => loadDetails(rental.id)} style={{ cursor: "pointer" }}>
          <strong>{itemLabel(rental.itemId)}</strong>{" "}
          <span className="badge">{rental.status}</span>
          <p className="muted">
            {role === "borrower" ? "You requested this item" : "Request for your item"}
          </p>
          <small>
            {formatDate(rental.startDate)} → {formatDate(rental.endDate)}
          </small>
        </div>

        <div className="actions">
          <button className="secondary" onClick={() => loadDetails(rental.id)}>
            Details
          </button>

          {canCancel(rental) && (
            <button className="danger" onClick={() => cancelRental(rental)}>
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!myUserId) {
    return (
      <section>
        <div className="card">
          <h2>Rentals</h2>
          <p className="muted">
            Please log in. Rentals are loaded automatically for the logged-in user.
          </p>
        </div>
      </section>
    );
  }

  const selectedIsOwner = selected?.ownerId === myUserId;
  const selectedIsBorrower = selected?.borrowerId === myUserId;
  const ownerActions = getAllowedOwnerActions(selected);

  return (
    <section>
      <div className="card">
        <div className="row">
          <div>
            <h2>Rentals</h2>
            <p className="muted">
              View rentals where you are the borrower or the owner. Status changes are only shown when you are allowed to perform them.
            </p>
          </div>

          <button className="secondary" onClick={loadRentals}>
            Refresh
          </button>
        </div>

        {message && (
          <p className={isPositiveMessage(message) ? "success-box" : "error-box"}>
            {message}
          </p>
        )}
      </div>

      <div className="three">
        <div className="card">
          <h3>Borrowing</h3>
          <p className="big">{borrowed.length}</p>
        </div>

        <div className="card">
          <h3>Owned item requests</h3>
          <p className="big">{owned.length}</p>
        </div>

        <div className="card">
          <h3>Pending approvals</h3>
          <p className="big">{pendingOwned.length}</p>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>My borrowed rentals</h3>

          {borrowed.length === 0 && (
            <p className="muted">You have not requested any rentals yet.</p>
          )}

          <div className="list">
            {borrowed.map((r) => (
              <RentalRow key={r.id} rental={r} role="borrower" />
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Requests for my items</h3>

          {owned.length === 0 && (
            <p className="muted">No one has requested your items yet.</p>
          )}

          <div className="list">
            {owned.map((r) => (
              <RentalRow key={r.id} rental={r} role="owner" />
            ))}
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Rental details</h3>

          {selected ? (
            <>
              <div className="details-header">
                <div>
                  <h3>{itemLabel(selected.itemId)}</h3>
                  <p className="muted">
                    {formatDate(selected.startDate)} → {formatDate(selected.endDate)}
                  </p>
                </div>

                <span className="badge">{selected.status}</span>
              </div>

              <div className="details-list">
                <p>
                  <strong>Your role:</strong>{" "}
                  {selectedIsOwner ? "Item owner" : selectedIsBorrower ? "Borrower" : "Viewer"}
                </p>

                <p>
                  <strong>Borrower:</strong>{" "}
                  {selected.borrowerId === myUserId ? "you" : "another user"}
                </p>

                <p>
                  <strong>Owner:</strong>{" "}
                  {selected.ownerId === myUserId ? "you" : "another user"}
                </p>

                {selected.message && (
                  <p>
                    <strong>Message:</strong> {selected.message}
                  </p>
                )}

                {selected.rejectionReason && (
                  <p className="error-box">
                    <strong>Rejection reason:</strong> {selected.rejectionReason}
                  </p>
                )}
              </div>

              {selectedIsOwner && ownerActions.length > 0 && (
                <div className="form status-panel">
                  <h4>Manage request</h4>

                  {selected.status === "Pending" && (
                    <label>
                      Rejection reason
                      <input
                        placeholder="Optional reason if you reject the request"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </label>
                  )}

                  <div className="actions">
                    {ownerActions.map((action) => (
                      <button
                        key={action.status}
                        className={action.className}
                        onClick={() => updateRentalStatus(action.status)}
                      >
                        {action.label}
                      </button>
                    ))}

                    {canCancel(selected) && (
                      <button className="danger" onClick={() => cancelRental(selected)}>
                        Cancel rental
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedIsOwner && ownerActions.length === 0 && (
                <p className="muted-box">
                  This rental is already in a final state. No further status changes are available.
                </p>
              )}

              {selectedIsBorrower && (
                <div className="muted-box">
                  <strong>Status changes are owner-only.</strong>
                  <p>
                    As the borrower, you can view the request and cancel it while the rental is still pending, approved or active.
                  </p>

                  {canCancel(selected) && (
                    <button className="danger" onClick={() => cancelRental(selected)}>
                      Cancel my rental
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="muted">Select a rental to see details.</p>
          )}
        </div>

        <div className="card">
          <h3>Live rental events</h3>

          {events.length === 0 ? (
            <p className="muted">No rental events received yet.</p>
          ) : (
            <pre>{JSON.stringify(events, null, 2)}</pre>
          )}
        </div>
      </div>
    </section>
  );
}