import "./admin-guard.js";

import {
  db,
  authReady,
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "./firebase.js";

await authReady;

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) { alert(message); return; }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

let selectedCustomer = null;

const searchBtn = document.getElementById("searchBtn");
const saveBtn = document.getElementById("saveBtn");
const saveBtnText = document.getElementById("saveBtnText");
const rewardType = document.getElementById("rewardType");

rewardType.addEventListener("change", () => {
  const isVoucher = rewardType.value === "Voucher";
  document.getElementById("hrFields").style.display = isVoucher ? "none" : "block";
  document.getElementById("voucherFields").style.display = isVoucher ? "block" : "none";
});

searchBtn.onclick = async () => {

  const mobile = document.getElementById("searchMobile").value.trim();

  if (mobile === "") {
    showToast("Enter mobile number");
    return;
  }

  searchBtn.disabled = true;
  searchBtn.textContent = "Searching...";

  const snap = await getDocs(collection(db, "users"));

  selectedCustomer = null;

  snap.forEach(docSnap => {

    const data = docSnap.data();

    if (data.mobile == mobile) {

      selectedCustomer = data;

      document.getElementById("name").textContent = data.name;
      document.getElementById("customerId").textContent = data.customerId;
      document.getElementById("hrpoint").textContent = data.hrpoint;

    }

  });

  searchBtn.disabled = false;
  searchBtn.textContent = "🔍 Search Customer";

  if (!selectedCustomer) {
    showToast("Customer not found");
  }

};

saveBtn.onclick = async () => {

  if (!selectedCustomer) {
    showToast("Search a customer first");
    return;
  }

  const type = rewardType.value;
  const theme = document.getElementById("theme").value;
  const source = document.getElementById("rewardSource").value;

  let cardData = {
    customerId: selectedCustomer.customerId || "",
    customerName: selectedCustomer.name,
    customerMobile: selectedCustomer.mobile,
    rewardType: type,
    source,
    theme,
    status: "ready",
    createdAt: serverTimestamp()
  };

  if (type === "Voucher") {

    const voucherTitle = document.getElementById("voucherTitle").value.trim();
    const voucherCode = document.getElementById("voucherCode").value.trim();
    const voucherValue = Number(document.getElementById("voucherValue").value);

    if (!voucherTitle || !voucherCode || !voucherValue || voucherValue <= 0) {
      showToast("Fill voucher title, code, and a valid value");
      return;
    }

    cardData.voucherTitle = voucherTitle;
    cardData.voucherCode = voucherCode;
    cardData.rewardValue = voucherValue;

  } else {

    const rewardValue = Number(document.getElementById("rewardValue").value);

    if (rewardValue <= 0 || !rewardValue) {
      showToast("Enter a valid reward value");
      return;
    }

    cardData.rewardValue = rewardValue;

  }

  saveBtn.disabled = true;
  saveBtnText.textContent = "Saving...";

  try {

    await addDoc(collection(db, "scratchCards"), cardData);

    try {
      await addDoc(collection(db, "notifications"), {
        customerMobile: selectedCustomer.mobile,
        title: "New Scratch Card!",
        message: `You've received a ${theme} scratch card. Open it from your dashboard.`,
        type: "scratch_card_added",
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Notification failed (scratch card still created):", e);
    }

    showToast("✅ Scratch card created successfully");

    document.getElementById("rewardValue").value = "";
    document.getElementById("voucherTitle").value = "";
    document.getElementById("voucherCode").value = "";
    document.getElementById("voucherValue").value = "";

  } catch (err) {
    console.error(err);
    showToast("Error: " + err.message);
  }

  saveBtn.disabled = false;
  saveBtnText.textContent = "🎁 Give Scratch Card";

};
