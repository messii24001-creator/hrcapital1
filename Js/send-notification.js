import "./admin-guard.js";

import {
  db,
  authReady,
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp
} from "./firebase.js";

await authReady;

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) { alert(message); return; }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

let mode = "specific";
let foundCustomer = null;

const specificTab = document.getElementById("specificTab");
const allTab = document.getElementById("allTab");

specificTab.onclick = () => {
  mode = "specific";
  specificTab.classList.add("active");
  allTab.classList.remove("active");
  document.getElementById("specificPanel").style.display = "block";
  document.getElementById("allPanel").style.display = "none";
};

allTab.onclick = () => {
  mode = "all";
  allTab.classList.add("active");
  specificTab.classList.remove("active");
  document.getElementById("allPanel").style.display = "block";
  document.getElementById("specificPanel").style.display = "none";
};

const searchBtn = document.getElementById("searchBtn");

searchBtn.onclick = async () => {

  const mobile = document.getElementById("searchMobile").value.trim();

  if (!mobile) {
    showToast("Enter a mobile number");
    return;
  }

  searchBtn.disabled = true;
  searchBtn.textContent = "Searching...";

  const snap = await getDocs(query(collection(db, "users"), where("mobile", "==", mobile)));

  foundCustomer = null;

  if (!snap.empty) {
    foundCustomer = snap.docs[0].data();
    document.getElementById("foundName").textContent = foundCustomer.name;
  } else {
    document.getElementById("foundName").textContent = "—";
    showToast("Customer not found");
  }

  searchBtn.disabled = false;
  searchBtn.textContent = "🔍 Search Customer";

};

const sendBtn = document.getElementById("sendBtn");
const sendBtnText = document.getElementById("sendBtnText");

sendBtn.onclick = async () => {

  const type = document.getElementById("notifType").value;
  const title = document.getElementById("notifTitle").value.trim();
  const message = document.getElementById("notifMessage").value.trim();

  if (!title || !message) {
    showToast("Fill in both title and message");
    return;
  }

  if (mode === "specific" && !foundCustomer) {
    showToast("Search and select a customer first");
    return;
  }

  sendBtn.disabled = true;

  try {

    if (mode === "specific") {

      sendBtnText.textContent = "Sending...";

      await addDoc(collection(db, "notifications"), {
        customerMobile: foundCustomer.mobile,
        title,
        message,
        type,
        read: false,
        createdAt: serverTimestamp()
      });

      showToast(`✅ Sent to ${foundCustomer.name}`);

    } else {

      const usersSnap = await getDocs(collection(db, "users"));
      const total = usersSnap.size;
      let sent = 0;

      // One notification document per customer — keeps each
      // customer's read/unread state independent, instead of
      // sharing a single doc that any one of them could mark read
      // for everyone.
      for (const userDoc of usersSnap.docs) {

        sendBtnText.textContent = `Sending... (${sent + 1}/${total})`;

        await addDoc(collection(db, "notifications"), {
          customerMobile: userDoc.data().mobile,
          title,
          message,
          type,
          read: false,
          createdAt: serverTimestamp()
        });

        sent++;

      }

      showToast(`✅ Sent to ${sent} customers`);

    }

    document.getElementById("notifTitle").value = "";
    document.getElementById("notifMessage").value = "";

  } catch (e) {
    console.error(e);
    showToast("Failed to send notification");
  }

  sendBtn.disabled = false;
  sendBtnText.textContent = "📤 Send Notification";

};
