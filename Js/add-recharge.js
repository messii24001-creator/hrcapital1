import "./admin-guard.js";

import {
  db,
  authReady,
  collection,
  getDocs,
  updateDoc,
  doc,
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

let currentUserDoc = null;
let currentUserData = null;

const searchBtn = document.getElementById("searchBtn");
const saveBtn = document.getElementById("saveRecharge");
const saveText = document.getElementById("saveRechargeText");

searchBtn.onclick = async () => {

  const mobile = document.getElementById("searchMobile").value.trim();

  if (!mobile) {
    showToast("Enter a mobile number");
    return;
  }

  searchBtn.disabled = true;
  searchBtn.textContent = "Searching...";

  const snap = await getDocs(collection(db, "users"));

  let found = false;
  currentUserDoc = null;
  currentUserData = null;

  snap.forEach(userDoc => {

    const data = userDoc.data();

    if (data.mobile == mobile) {

      found = true;
      currentUserDoc = userDoc;
      currentUserData = data;

      document.getElementById("name").textContent = data.name;
      document.getElementById("mobile").textContent = data.mobile;
      document.getElementById("currentHR").textContent = data.hrpoint;
    }

  });

  if (!found) {
    showToast("Customer not found");
  }

  searchBtn.disabled = false;
  searchBtn.textContent = "🔍 Search Customer";

};

saveBtn.onclick = async () => {

  if (!currentUserDoc) {
    showToast("Search a customer first");
    return;
  }

  const rechargeNumber = document.getElementById("rechargeNumber").value.trim();
  const amount = Number(document.getElementById("amount").value);
  const hrEarned = Number(document.getElementById("hrEarned").value);
  const paymentMode = document.getElementById("paymentMode").value;

  if (!rechargeNumber || !amount || !hrEarned) {
    showToast("Please fill all details");
    return;
  }

  if (amount <= 0 || hrEarned <= 0) {
    showToast("Amount and HR earned must be greater than 0");
    return;
  }

  saveBtn.disabled = true;
  saveText.textContent = "Saving...";

  try {

    await addDoc(collection(db, "recharges"), {
      customerName: currentUserData.name,
      customerMobile: currentUserData.mobile,
      rechargeNumber: rechargeNumber,
      amount: amount,
      hrEarned: hrEarned,
      paymentMode: paymentMode,
      status: "Success",
      date: serverTimestamp()
    });

    const newHR = Number(currentUserData.hrpoint) + hrEarned;

    await updateDoc(doc(db, "users", currentUserDoc.id), {
      hrpoint: newHR
    });

    document.getElementById("currentHR").textContent = newHR;
    currentUserData.hrpoint = newHR;

    try {
      await addDoc(collection(db, "walletHistory"), {
        customerMobile: currentUserData.mobile,
        type: "earned",
        source: "recharge",
        amount: hrEarned,
        description: `HR earned — recharge for ${rechargeNumber}`,
        date: serverTimestamp()
      });
    } catch (e) {
      console.error("Wallet history entry failed (recharge still saved):", e);
    }

    showToast("✅ Recharge saved successfully!");

    document.getElementById("rechargeNumber").value = "";
    document.getElementById("amount").value = "";
    document.getElementById("hrEarned").value = "";

  } catch (err) {

    console.error(err);
    showToast("Failed to save recharge. Please try again.");

  }

  saveBtn.disabled = false;
  saveText.textContent = "⚡ Save Recharge";

};
