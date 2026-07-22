import {
  db,
  authReady,
  collection,
  getDocs,
  query,
  where
} from "./firebase.js";

await authReady;

const mobile = localStorage.getItem("userMobile");
const isAdmin = localStorage.getItem("admin") === "true";

// Only bounce out if neither a customer nor an admin is signed in.
if (!mobile && !isAdmin) {
  location.href = "index.html";
}

const historyList = document.getElementById("historyList");
const totalRecharge = document.getElementById("totalRecharge");
const totalHR = document.getElementById("totalHR");

function toMillis(ts) {
  return ts && ts.toMillis ? ts.toMillis() : 0;
}

async function loadHistory() {

  let rows = [];

  if (isAdmin) {

    // Admin view: completed history only. Pending/rejected requests
    // have their own dedicated "Recharge Requests" approval page.
    const snap = await getDocs(collection(db, "recharges"));

    snap.forEach(d => {
      rows.push({ kind: "recharge", data: d.data(), sortAt: toMillis(d.data().date) });
    });

  } else {

    // Customer view: completed recharges AND their still-pending /
    // rejected requests, merged into one timeline — otherwise a
    // customer has no way to see a request they submitted until
    // (if ever) it's approved.
    const rechargesSnap = await getDocs(
      query(collection(db, "recharges"), where("customerMobile", "==", mobile))
    );

    rechargesSnap.forEach(d => {
      rows.push({ kind: "recharge", data: d.data(), sortAt: toMillis(d.data().date) });
    });

    const requestsSnap = await getDocs(
      query(collection(db, "rechargeRequests"), where("customerMobile", "==", mobile))
    );

    requestsSnap.forEach(d => {
      const data = d.data();
      // Approved requests already show up as a "recharge" entry
      // above (recharge-requests.js writes both when approving) —
      // only surface pending/rejected here to avoid duplicates.
      if (data.status === "pending" || data.status === "rejected") {
        rows.push({ kind: "request", data, sortAt: toMillis(data.createdAt) });
      }
    });

  }

  historyList.innerHTML = "";

  if (rows.length === 0) {
    historyList.innerHTML = `
      <div class="historyCard">
        <h3>📭 No Recharge History</h3>
      </div>
    `;
    totalRecharge.textContent = "0";
    totalHR.textContent = "0 HR";
    return;
  }

  rows.sort((a, b) => b.sortAt - a.sortAt);

  let rechargeCount = 0;
  let hrTotal = 0;

  rows.forEach(({ kind, data }) => {

    const customerLine = isAdmin
      ? `<p>👤 ${data.customerName || "Unknown"} • ${data.customerMobile || "-"}</p>`
      : "";

    if (kind === "recharge") {

      rechargeCount++;
      hrTotal += Number(data.hrEarned || 0);

      const rechargeDate = data.date
        ? data.date.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "-";

      historyList.innerHTML += `
        <div class="historyCard">
          <h3>📱 ${data.rechargeNumber}</h3>
          ${customerLine}
          <p>💰 ₹${data.amount} Recharge</p>
          <p>⭐ +${data.hrEarned || 0} HR</p>
          <p>🗓️ ${rechargeDate}</p>
          <span class="status">✅ ${data.status || "Success"}</span>
        </div>
      `;

    } else {

      // Pending / rejected request — not counted in totals since
      // no HR has moved yet.
      const reqDate = data.createdAt
        ? data.createdAt.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "-";

      const isPending = data.status === "pending";

      const statusHtml = isPending
        ? `<span class="status pending">⏳ ${data.paymentStatus || "Pending"}</span>`
        : `<span class="status rejected">❌ Rejected</span>
           ${data.rejectReason ? `<p class="rejectNote">Reason: ${data.rejectReason}</p>` : ""}`;

      historyList.innerHTML += `
        <div class="historyCard">
          <h3>📱 ${data.rechargeNumber}</h3>
          <p>💰 ₹${data.amount} Recharge</p>
          <p>🔻 ${data.hrRedeemed || 0} HR redeem requested</p>
          <p>🗓️ ${reqDate}</p>
          ${statusHtml}
        </div>
      `;

    }

  });

  totalRecharge.textContent = rechargeCount;
  totalHR.textContent = hrTotal + " HR";

}

loadHistory();
