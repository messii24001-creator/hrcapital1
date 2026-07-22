import {
  db,
  authReady,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc
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
  recharge_approved: "✅",
  recharge_rejected: "❌",
  scratch_card_added: "🎁",
  bonus_hr: "⭐",
  promo: "📣",
  system: "🔧",
  admin_announcement: "📢"
};

const listEl = document.getElementById("notifList");
let items = [];

function formatDate(ts) {
  if (!ts || !ts.toDate) return "-";
  return ts.toDate().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  });
}

function render() {

  if (items.length === 0) {
    document.getElementById("unreadSummary").textContent = "No notifications";
    listEl.innerHTML = `
      <div class="emptyState">
        <div class="icon">🔔</div>
        No notifications yet
      </div>
    `;
    return;
  }

  const unreadCount = items.filter(i => !i.data.read).length;

  document.getElementById("unreadSummary").textContent =
    unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up";

  listEl.innerHTML = "";

  items.forEach(({ id, data }) => {

    const card = document.createElement("div");
    card.className = "notifCard" + (data.read ? "" : " unread");
    card.dataset.id = id;

    const icon = iconMap[data.type] || "🔔";

    card.innerHTML = `
      <h3><span class="notifIcon">${icon}</span>${data.title || "Notification"}</h3>
      <p>${data.message || ""}</p>
      <span class="time">${formatDate(data.createdAt)}</span>
    `;

    card.onclick = () => markRead(id);

    listEl.appendChild(card);

  });

}

async function markRead(id) {

  const item = items.find(i => i.id === id);
  if (!item || item.data.read) return;

  item.data.read = true;
  render();

  try {
    await updateDoc(doc(db, "notifications", id), { read: true });
  } catch (e) {
    console.error(e);
  }

}

document.getElementById("markAllReadBtn").onclick = async () => {

  const unread = items.filter(i => !i.data.read);

  if (unread.length === 0) {
    showToast("Nothing to mark");
    return;
  }

  unread.forEach(i => (i.data.read = true));
  render();

  try {
    await Promise.all(
      unread.map(i => updateDoc(doc(db, "notifications", i.id), { read: true }))
    );
    showToast("✅ All marked as read");
  } catch (e) {
    console.error(e);
    showToast("Some notifications failed to update");
  }

};

async function loadNotifications() {

  try {

    const q = query(collection(db, "notifications"), where("customerMobile", "==", mobile));
    const snap = await getDocs(q);

    items = [];
    snap.forEach(d => items.push({ id: d.id, data: d.data() }));

    items.sort((a, b) => {
      const at = a.data.createdAt && a.data.createdAt.toMillis ? a.data.createdAt.toMillis() : 0;
      const bt = b.data.createdAt && b.data.createdAt.toMillis ? b.data.createdAt.toMillis() : 0;
      return bt - at;
    });

    render();

  } catch (e) {
    console.error(e);
    showToast("Failed to load notifications");
  }

}

loadNotifications();
