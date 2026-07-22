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

if (!mobile) {
  window.location.href = "index.html";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) { alert(message); return; }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

const iconMap = {
  earned: "💰",
  redeemed: "🔻",
  bonus: "⭐",
  scratch: "🎁",
  adjustment: "⚙️"
};

const labelMap = {
  earned: "HR Earned",
  redeemed: "HR Redeemed",
  bonus: "Bonus HR",
  scratch: "Scratch Reward",
  adjustment: "Manual Adjustment"
};

const sourceLabelMap = {
  recharge: "via Recharge",
  voucher: "via Voucher",
  general: "General / Loyalty"
};

let currentFilter = "all";
let allRows = [];

function formatDate(ts) {
  if (!ts || !ts.toDate) return "-";
  return ts.toDate().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

async function loadWallet() {

  try {

    const q = query(collection(db, "walletHistory"), where("customerMobile", "==", mobile));
    const snap = await getDocs(q);

    allRows = [];
    snap.forEach(d => allRows.push(d.data()));

    allRows.sort((a, b) => {
      const at = a.date && a.date.toMillis ? a.date.toMillis() : 0;
      const bt = b.date && b.date.toMillis ? b.date.toMillis() : 0;
      return bt - at;
    });

    render();

  } catch (e) {
    console.error(e);
    showToast("Failed to load wallet history");
  }

}

function render() {

  const rows = currentFilter === "all"
    ? allRows
    : allRows.filter(r => (r.source || "general") === currentFilter);

  const listEl = document.getElementById("walletList");

  if (rows.length === 0) {
    listEl.innerHTML = `
      <div class="emptyState">
        <div class="icon">💼</div>
        No ${currentFilter === "all" ? "" : sourceLabelMap[currentFilter] + " "}wallet activity yet
      </div>
    `;
    document.getElementById("totalEarned").textContent = "0";
    document.getElementById("totalRedeemed").textContent = "0";
    return;
  }

  let totalEarned = 0;
  let totalRedeemed = 0;

  listEl.innerHTML = "";

  rows.forEach(data => {

    const amount = Number(data.amount) || 0;
    const isNegative = data.type === "redeemed" || (data.type === "adjustment" && amount < 0);

    if (isNegative) {
      totalRedeemed += Math.abs(amount);
    } else {
      totalEarned += Math.abs(amount);
    }

    const icon = iconMap[data.type] || "💠";
    const label = labelMap[data.type] || data.type;
    const sourceTag = sourceLabelMap[data.source] || null;

    const card = document.createElement("div");
    card.className = "walletCard";

    card.innerHTML = `
      <div class="walletLeft">
        <div class="walletIcon">${icon}</div>
        <div class="walletDesc">
          <h4>${data.description || label}</h4>
          <span>${formatDate(data.date)}${sourceTag ? " • " + sourceTag : ""}</span>
        </div>
      </div>
      <div class="walletAmount ${isNegative ? "negative" : "positive"}">
        ${isNegative ? "−" : "+"}${Math.abs(amount)} HR
      </div>
    `;

    listEl.appendChild(card);

  });

  document.getElementById("totalEarned").textContent = totalEarned.toLocaleString("en-IN");
  document.getElementById("totalRedeemed").textContent = totalRedeemed.toLocaleString("en-IN");

}

document.querySelectorAll(".tabBtn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tabBtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.source;
    render();
  };
});

loadWallet();
