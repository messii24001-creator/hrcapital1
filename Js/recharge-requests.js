import "./admin-guard.js";

import {
  db,
  authReady,
  collection,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp
} from "./firebase.js";

await authReady;

let earnRate = 0;

getDoc(doc(db, "hrSettings", "config"))
  .then(snap => {
    if (snap.exists()) earnRate = Number(snap.data().earnRate) || 0;
  })
  .catch(() => {});

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) { alert(message); return; }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

const listEl = document.getElementById("requestList");
let currentFilter = "pending";
let allRequests = [];
const processingIds = new Set();

function formatDate(ts) {
  if (!ts || !ts.toDate) return "-";
  return ts.toDate().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function render() {

  const filtered = currentFilter === "all"
    ? allRequests
    : allRequests.filter(r => r.data.status === currentFilter);

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="emptyState">
        <div class="icon">📭</div>
        No ${currentFilter === "all" ? "" : currentFilter} requests
      </div>
    `;
    return;
  }

  listEl.innerHTML = "";

  filtered.forEach(({ id, data }) => {

    const card = document.createElement("div");
    card.className = "requestCard";

    let actionsHtml = "";

    if (data.status === "pending") {
      actionsHtml = `
        <div class="requestActions">
          <button class="btnApprove" data-id="${id}" data-action="approve">✅ Approve</button>
          <button class="btnReject" data-id="${id}" data-action="reject">❌ Reject</button>
        </div>
      `;
    } else if (data.status === "rejected" && data.rejectReason) {
      actionsHtml = `<div class="rejectReason">Reason: ${data.rejectReason}</div>`;
    }

    card.innerHTML = `
      <div class="requestTop">
        <div>
          <h3>${data.customerName || "Unknown"}</h3>
          <p>${data.customerMobile} • ${data.operator} • ${data.rechargeNumber}</p>
        </div>
        <span class="statusPill ${data.status}">${data.status}</span>
      </div>

      <div class="infoRow"><b>Amount</b><span>₹${data.amount}</span></div>
      <div class="infoRow"><b>HR Redeemed</b><span>${data.hrRedeemed || 0} HR</span></div>
      <div class="infoRow"><b>You Receive</b><span>₹${data.cashPaid}</span></div>
      <div class="infoRow"><b>Payment</b><span>${data.paymentMethod} — ${data.paymentStatus}</span></div>
      <div class="infoRow"><b>Requested</b><span>${formatDate(data.createdAt)}</span></div>

      ${actionsHtml}
    `;

    listEl.appendChild(card);

  });

  listEl.querySelectorAll("[data-action='approve']").forEach(btn => {
    btn.onclick = () => approveRequest(btn.dataset.id);
  });

  listEl.querySelectorAll("[data-action='reject']").forEach(btn => {
    btn.onclick = () => rejectRequest(btn.dataset.id);
  });

}

async function loadRequests() {

  try {

    const snap = await getDocs(collection(db, "rechargeRequests"));

    allRequests = [];

    snap.forEach(d => {
      allRequests.push({ id: d.id, data: d.data() });
    });

    allRequests.sort((a, b) => {
      const at = a.data.createdAt && a.data.createdAt.toMillis ? a.data.createdAt.toMillis() : 0;
      const bt = b.data.createdAt && b.data.createdAt.toMillis ? b.data.createdAt.toMillis() : 0;
      return bt - at;
    });

    render();

  } catch (e) {
    console.error(e);
    showToast("Failed to load requests");
  }

}

async function approveRequest(requestId) {

  if (processingIds.has(requestId)) return;

  const reqEntry = allRequests.find(r => r.id === requestId);
  if (!reqEntry) return;

  const request = reqEntry.data;

  const suggestedBonus = Math.floor(Number(request.amount) * earnRate);
  const bonusInput = prompt("Bonus HR to award for this recharge:", String(suggestedBonus));
  if (bonusInput === null) return; // cancelled

  const bonusHR = Number(bonusInput) || 0;

  if (bonusHR < 0) {
    showToast("Bonus HR cannot be negative");
    return;
  }

  processingIds.add(requestId);

  try {

    // Re-fetch the customer fresh — their HR balance may have changed
    // since this request was submitted (e.g. another request was
    // already approved), so we must not trust stale numbers.
    const userQuery = query(collection(db, "users"), where("mobile", "==", request.customerMobile));
    const userSnap = await getDocs(userQuery);

    if (userSnap.empty) {
      showToast("Customer not found — cannot approve");
      return;
    }

    const userDocRef = userSnap.docs[0];
    const currentHR = Number(userDocRef.data().hrpoint) || 0;
    const hrRedeemed = Number(request.hrRedeemed) || 0;

    if (currentHR < hrRedeemed) {
      showToast(`⚠️ Customer only has ${currentHR} HR now (needs ${hrRedeemed}). Cannot approve — HR balance changed since request.`);
      return;
    }

    const newHR = currentHR - hrRedeemed + bonusHR;

    await updateDoc(doc(db, "users", userDocRef.id), {
      hrpoint: newHR
    });

    await addDoc(collection(db, "recharges"), {
      customerName: request.customerName,
      customerMobile: request.customerMobile,
      rechargeNumber: request.rechargeNumber,
      amount: request.amount,
      hrEarned: bonusHR,
      hrRedeemed: hrRedeemed,
      paymentMode: request.paymentMethod,
      status: "Success",
      date: serverTimestamp()
    });

    if (hrRedeemed > 0) {
      await addDoc(collection(db, "walletHistory"), {
        customerMobile: request.customerMobile,
        type: "redeemed",
        source: "recharge",
        amount: hrRedeemed,
        description: `Redeemed for recharge ${request.rechargeNumber}`,
        date: serverTimestamp()
      });
    }

    if (bonusHR > 0) {
      await addDoc(collection(db, "walletHistory"), {
        customerMobile: request.customerMobile,
        type: "bonus",
        source: "recharge",
        amount: bonusHR,
        description: `Bonus HR for recharge ${request.rechargeNumber}`,
        date: serverTimestamp()
      });
    }

    await addDoc(collection(db, "notifications"), {
      customerMobile: request.customerMobile,
      title: "Recharge Approved",
      message: `Your ₹${request.amount} recharge for ${request.rechargeNumber} has been approved.`,
      type: "recharge_approved",
      read: false,
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, "rechargeRequests", requestId), {
      status: "approved",
      bonusHR: bonusHR,
      approvedAt: serverTimestamp()
    });

    showToast("✅ Request approved");
    loadRequests();

  } catch (e) {
    console.error(e);
    showToast("Failed to approve request");
  } finally {
    processingIds.delete(requestId);
  }

}

async function rejectRequest(requestId) {

  if (processingIds.has(requestId)) return;

  const reqEntry = allRequests.find(r => r.id === requestId);
  if (!reqEntry) return;

  const request = reqEntry.data;

  const reason = prompt("Reason for rejecting this request:");
  if (reason === null) return;

  if (reason.trim() === "") {
    showToast("Please provide a rejection reason");
    return;
  }

  processingIds.add(requestId);

  try {

    await updateDoc(doc(db, "rechargeRequests", requestId), {
      status: "rejected",
      rejectReason: reason.trim(),
      rejectedAt: serverTimestamp()
    });

    await addDoc(collection(db, "notifications"), {
      customerMobile: request.customerMobile,
      title: "Recharge Rejected",
      message: reason.trim(),
      type: "recharge_rejected",
      read: false,
      createdAt: serverTimestamp()
    });

    showToast("Request rejected");
    loadRequests();

  } catch (e) {
    console.error(e);
    showToast("Failed to reject request");
  } finally {
    processingIds.delete(requestId);
  }

}

document.querySelectorAll(".tabBtn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tabBtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.status;
    render();
  };
});

loadRequests();
                   
