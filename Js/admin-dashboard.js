import "./admin-guard.js";

import {
  db,
  authReady,
  collection,
  getDocs
} from "./firebase.js";

await authReady;

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) { alert(message); return; }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function isToday(date) {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

async function loadDashboard() {

  try {

    // ----- Customers + HR issued -----
    const usersSnap = await getDocs(collection(db, "users"));

    let totalHR = 0;
    usersSnap.forEach(doc => {
      totalHR += Number(doc.data().hrpoint) || 0;
    });

    document.getElementById("totalUsers").textContent = usersSnap.size.toLocaleString("en-IN");
    document.getElementById("totalHR").textContent = totalHR.toLocaleString("en-IN");

    // ----- Recharge requests: pending / approved / rejected -----
    const requestsSnap = await getDocs(collection(db, "rechargeRequests"));

    let pending = 0, approved = 0, rejected = 0;

    requestsSnap.forEach(doc => {
      const status = doc.data().status;
      if (status === "pending") pending++;
      else if (status === "approved") approved++;
      else if (status === "rejected") rejected++;
    });

    document.getElementById("pendingRequests").textContent = pending;
    document.getElementById("approvedRequests").textContent = approved;
    document.getElementById("rejectedRequests").textContent = rejected;

    const badge = document.getElementById("requestsBadge");
    if (pending > 0) {
      badge.textContent = pending > 99 ? "99+" : pending;
      badge.style.display = "flex";
    }

    // ----- Today's recharge (from approved recharge history) -----
    const rechargesSnap = await getDocs(collection(db, "recharges"));

    let todaysTotal = 0;

    rechargesSnap.forEach(doc => {
      const data = doc.data();
      if (data.date && data.date.toDate && isToday(data.date.toDate())) {
        todaysTotal += Number(data.amount) || 0;
      }
    });

    document.getElementById("todaysRecharge").textContent = "₹" + todaysTotal.toLocaleString("en-IN");

  } catch (e) {

    console.error(e);
    showToast("Failed to load dashboard stats");

  }

}

loadDashboard();

document.getElementById("rechargeRequestsBtn").onclick = () => {
  window.location.href = "recharge-requests.html";
};

document.getElementById("addCustomer").onclick = () => {
  window.location.href = "add-customer.html";
};

document.getElementById("addRecharge").onclick = () => {
  window.location.href = "add-recharge.html";
};

document.getElementById("rechargeHistory").onclick = () => {
  window.location.href = "recharge-history.html";
};

document.getElementById("customerDetails").onclick = () => {
  window.location.href = "customer-details.html";
};

document.getElementById("leaderboardBtn").onclick = () => {
  window.location.href = "leaderboard.html";
};

document.getElementById("giveScratchBtn").onclick = () => {
  window.location.href = "give-scratch.html";
};

document.getElementById("paymentSettingsBtn").onclick = () => {
  window.location.href = "payment-settings.html";
};

document.getElementById("hrSettingsBtn").onclick = () => {
  window.location.href = "hr-settings.html";
};

document.getElementById("sendNotifBtn").onclick = () => {
  window.location.href = "send-notification.html";
};

document.getElementById("sellVoucherBtn").onclick = () => {
  window.location.href = "add-voucher.html";
};

document.getElementById("logoutBtn").onclick = () => {
  if (confirm("Logout from admin panel?")) {
    localStorage.removeItem("admin");
    window.location.href = "admin.html";
  }
};
