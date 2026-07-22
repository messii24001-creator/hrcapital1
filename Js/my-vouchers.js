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

function formatDate(ts) {
  if (!ts || !ts.toDate) return "-";
  return ts.toDate().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

async function loadVouchers() {

  try {

    const q = query(collection(db, "vouchers"), where("customerMobile", "==", mobile));
    const snap = await getDocs(q);

    const listEl = document.getElementById("voucherList");

    if (snap.empty) {
      listEl.innerHTML = `
        <div class="emptyState">
          <div class="icon">🎟️</div>
          No vouchers yet — win one from a scratch card!
        </div>
      `;
      return;
    }

    let rows = [];
    snap.forEach(d => rows.push(d.data()));

    rows.sort((a, b) => {
      const at = a.claimedAt && a.claimedAt.toMillis ? a.claimedAt.toMillis() : 0;
      const bt = b.claimedAt && b.claimedAt.toMillis ? b.claimedAt.toMillis() : 0;
      return bt - at;
    });

    listEl.innerHTML = "";

    rows.forEach(data => {

      const card = document.createElement("div");
      card.className = "voucherCard";

      card.innerHTML = `
        <div class="voucherTitle">${data.title}</div>
        <div class="voucherValue">Worth ₹${data.value}</div>
        <div class="voucherCodeRow">
          <span>${data.code}</span>
          <button type="button">Copy</button>
        </div>
        <div class="voucherDate">Won on ${formatDate(data.claimedAt)}</div>
      `;

      card.querySelector("button").onclick = () => {
        navigator.clipboard.writeText(data.code)
          .then(() => showToast("Code copied"))
          .catch(() => showToast("Couldn't copy — please copy manually"));
      };

      listEl.appendChild(card);

    });

  } catch (e) {
    console.error(e);
    showToast("Failed to load vouchers");
  }

}

loadVouchers();
