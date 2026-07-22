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

let currentCustomer = null;

const searchBtn = document.getElementById("searchBtn");

searchBtn.onclick = async () => {

  const mobile = document.getElementById("searchMobile").value.trim();

  if (!mobile) {
    showToast("Enter a mobile number");
    return;
  }

  searchBtn.disabled = true;
  searchBtn.textContent = "Searching...";

  const snap = await getDocs(collection(db, "users"));

  currentCustomer = null;

  snap.forEach(userDoc => {
    const data = userDoc.data();
    if (data.mobile == mobile) {
      currentCustomer = data;
      document.getElementById("name").textContent = data.name;
      document.getElementById("mobile").textContent = data.mobile;
      document.getElementById("currentHR").textContent = data.hrpoint;
    }
  });

  if (!currentCustomer) {
    showToast("Customer not found");
  }

  searchBtn.disabled = false;
  searchBtn.textContent = "🔍 Search Customer";

};

const saveBtn = document.getElementById("saveBtn");
const saveBtnText = document.getElementById("saveBtnText");

saveBtn.onclick = async () => {

  if (!currentCustomer) {
    showToast("Search a customer first");
    return;
  }

  const voucherName = document.getElementById("voucherName").value.trim();
  const voucherCode = document.getElementById("voucherCode").value.trim();
  const price = Number(document.getElementById("price").value);
  const paymentMode = document.getElementById("paymentMode").value;

  if (!voucherName || !price || price <= 0) {
    showToast("Enter voucher name and a valid price");
    return;
  }

  saveBtn.disabled = true;
  saveBtnText.textContent = "Saving...";

  try {

    await addDoc(collection(db, "voucherSales"), {
      customerName: currentCustomer.name,
      customerMobile: currentCustomer.mobile,
      voucherName,
      voucherCode,
      price,
      paymentMode,
      status: "Sold",
      date: serverTimestamp()
    });

    showToast("✅ Voucher sale recorded. Now give a scratch card reward if you want to.");

    document.getElementById("voucherName").value = "";
    document.getElementById("voucherCode").value = "";
    document.getElementById("price").value = "";

  } catch (err) {
    console.error(err);
    showToast("Failed to save voucher sale. Please try again.");
  }

  saveBtn.disabled = false;
  saveBtnText.textContent = "🎫 Record Voucher Sale";

};
