import {
  db,
  authReady,
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit
} from "./firebase.js";

await authReady;

const mobile = localStorage.getItem("userMobile");

// Login Check
if (!mobile) {
  window.location.href = "index.html";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function animateCount(el, target) {
  const duration = 700;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);
    el.innerHTML = value.toLocaleString("en-IN") + ' <span class="unit">HR</span>';
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Dashboard Data
async function loadDashboard() {

  try {

    const snap = await getDocs(collection(db, "users"));

    let users = [];

    snap.forEach(doc => {
      users.push(doc.data());
    });

    users.sort((a, b) => Number(b.hrpoint) - Number(a.hrpoint));

    let customer = null;
    let rankIndex = -1;

    for (let i = 0; i < users.length; i++) {
      if (users[i].mobile == mobile) {
        customer = users[i];
        rankIndex = i;
        break;
      }
    }

    if (!customer) {
      showToast("Account not found. Please login again.");
      localStorage.removeItem("userMobile");
      setTimeout(() => (window.location.href = "index.html"), 1200);
      return;
    }

    document.getElementById("customerName").textContent = customer.name;
    document.getElementById("customerId").textContent = customer.customerId || "—";
    document.getElementById("customerMobile").textContent = customer.mobile;

    let conversionRate = 10;
    try {
      const hrDoc = await getDoc(doc(db, "hrSettings", "config"));
      if (hrDoc.exists() && Number(hrDoc.data().conversionRate) > 0) {
        conversionRate = Number(hrDoc.data().conversionRate);
      }
    } catch (e) {
      console.error("hrSettings not available, using default conversion rate:", e);
    }

    document.getElementById("hrValue").textContent =
      Math.floor(Number(customer.hrpoint) / conversionRate).toLocaleString("en-IN");
    document.getElementById("rank").textContent = "#" + (rankIndex + 1);

    animateCount(document.getElementById("hrPoints"), Number(customer.hrpoint) || 0);

    let member = "🥉 Bronze";
    if (Number(customer.hrpoint) >= 1000) member = "💎 Platinum";
    else if (Number(customer.hrpoint) >= 500) member = "🥇 Gold";
    else if (Number(customer.hrpoint) >= 200) member = "🥈 Silver";

    document.getElementById("memberBadge").textContent = member;

    // Last recharge
    try {
      const rq = query(
        collection(db, "recharges"),
        where("customerMobile", "==", mobile),
        orderBy("date", "desc"),
        limit(1)
      );

      const rSnap = await getDocs(rq);

      if (!rSnap.empty) {
        const r = rSnap.docs[0].data();
        const dateStr = r.date
          ? r.date.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
          : "--";
        document.getElementById("lastRecharge").textContent = `₹${r.amount} • ${dateStr}`;
      } else {
        document.getElementById("lastRecharge").textContent = "No recharge yet";
      }
    } catch (e) {
      // Firestore may need a composite index for orderBy + where the first time;
      // fail quietly here so the rest of the dashboard still works.
      console.error("Last recharge lookup failed:", e);
      document.getElementById("lastRecharge").textContent = "—";
    }

    // Unread notification count
    try {
      const nq = query(
        collection(db, "notifications"),
        where("customerMobile", "==", mobile),
        where("read", "==", false)
      );

      const nSnap = await getDocs(nq);
      const badge = document.getElementById("notifyBadge");

      if (nSnap.size > 0) {
        badge.textContent = nSnap.size > 9 ? "9+" : nSnap.size;
        badge.style.display = "flex";
      }
    } catch (e) {
      console.error("Notification count lookup failed:", e);
    }

  } catch (e) {

    console.error(e);
    showToast("Dashboard load failed. Pull down to retry.");

  }

}

loadDashboard();

// Buttons
document.getElementById("rechargeBtn").onclick = () => {
  window.location.href = "request-recharge.html";
};

document.getElementById("scratchBtn").onclick = () => {
  window.location.href = "scratch.html";
};

document.getElementById("walletHistoryBtn").onclick = () => {
  window.location.href = "wallet-history.html";
};

document.getElementById("historyBtn").onclick = () => {
  window.location.href = "recharge-history.html";
};

document.getElementById("notificationBtn").onclick = () => {
  window.location.href = "notifications.html";
};

document.getElementById("notificationCard").onclick = () => {
  window.location.href = "notifications.html";
};

document.getElementById("leaderboardBtn").onclick = () => {
  window.location.href = "leaderboard.html";
};

document.getElementById("profileBtn").onclick = () => {
  window.location.href = "profile.html";
};

document.getElementById("vouchersBtn").onclick = () => {
  window.location.href = "my-vouchers.html";
};

// Logout
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

  logoutBtn.addEventListener("click", () => {

    if (confirm("Are you sure you want to logout?")) {

      localStorage.removeItem("userMobile");
      window.location.href = "index.html";

    }

  });

}
