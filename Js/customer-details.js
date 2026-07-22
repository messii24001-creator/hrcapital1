import "./admin-guard.js";

import {
  db,
  authReady,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
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

let currentCustomer = null;

const searchBtn = document.getElementById("searchBtn");

searchBtn.onclick = async () => {

  const mobile = document.getElementById("searchMobile").value.trim();

  if (mobile === "") {
    showToast("Enter mobile number");
    return;
  }

  searchBtn.disabled = true;
  searchBtn.textContent = "Searching...";

  const snap = await getDocs(collection(db, "users"));

  let users = [];

  snap.forEach(userDoc => {
    users.push({ id: userDoc.id, ...userDoc.data() });
  });

  users.sort((a, b) => Number(b.hrpoint) - Number(a.hrpoint));

  currentCustomer = null;

  for (let i = 0; i < users.length; i++) {

    const data = users[i];

    if (data.mobile == mobile) {

      currentCustomer = data;

      let level = "🥉 Bronze";

      if (Number(data.hrpoint) >= 1000) level = "💎 Platinum";
      else if (Number(data.hrpoint) >= 500) level = "🥇 Gold";
      else if (Number(data.hrpoint) >= 200) level = "🥈 Silver";

      document.getElementById("name").textContent = data.name;
      document.getElementById("mobile").textContent = data.mobile;
      document.getElementById("hrpoint").textContent = data.hrpoint;
      document.getElementById("rank").textContent = "#" + (i + 1);
      document.getElementById("status").textContent = data.status + " | " + level;

      break;

    }

  }

  searchBtn.disabled = false;
  searchBtn.textContent = "🔍 Search Customer";

  if (currentCustomer == null) {
    showToast("Customer not found");
  }

};

document.getElementById("editBtn").onclick = async () => {

  if (!currentCustomer) {
    showToast("Search a customer first");
    return;
  }

  const newHR = prompt("Enter new HR points", currentCustomer.hrpoint);

  if (newHR == null || newHR.trim() === "" || isNaN(Number(newHR))) return;

  const oldHR = Number(currentCustomer.hrpoint) || 0;
  const updatedHR = Number(newHR);
  const delta = updatedHR - oldHR;

  try {

    await updateDoc(doc(db, "users", currentCustomer.id), {
      hrpoint: updatedHR
    });

    if (delta !== 0) {
      try {
        await addDoc(collection(db, "walletHistory"), {
          customerMobile: currentCustomer.mobile,
          type: "adjustment",
          source: "general",
          amount: delta,
          description: `Manual HR adjustment by admin (${oldHR} → ${updatedHR})`,
          date: serverTimestamp()
        });
      } catch (e) {
        console.error("Wallet history entry failed (HR still updated):", e);
      }
    }

    showToast("✅ HR points updated");
    searchBtn.click();

  } catch (err) {
    console.error(err);
    showToast("Update failed");
  }

};

document.getElementById("deleteBtn").onclick = async () => {

  if (!currentCustomer) {
    showToast("Search a customer first");
    return;
  }

  const ok = confirm(
    `⚠️ Delete ${currentCustomer.name} (${currentCustomer.mobile}) permanently?\n\nThis also removes their recharge and scratch card history. This cannot be undone.`
  );

  if (!ok) return;

  try {

    await deleteDoc(doc(db, "users", currentCustomer.id));

    const rechargeSnap = await getDocs(collection(db, "recharges"));

    for (const rechargeDoc of rechargeSnap.docs) {
      const recharge = rechargeDoc.data();
      if (
        recharge.customerMobile == currentCustomer.mobile ||
        recharge.rechargeNumber == currentCustomer.mobile
      ) {
        await deleteDoc(doc(db, "recharges", rechargeDoc.id));
      }
    }

    const scratchSnap = await getDocs(collection(db, "scratchCards"));

    for (const scratchDoc of scratchSnap.docs) {
      const scratch = scratchDoc.data();
      if (scratch.customerMobile == currentCustomer.mobile) {
        await deleteDoc(doc(db, "scratchCards", scratchDoc.id));
      }
    }

    const requestsSnap = await getDocs(collection(db, "rechargeRequests"));

    for (const reqDoc of requestsSnap.docs) {
      if (reqDoc.data().customerMobile == currentCustomer.mobile) {
        await deleteDoc(doc(db, "rechargeRequests", reqDoc.id));
      }
    }

    const walletSnap = await getDocs(collection(db, "walletHistory"));

    for (const wDoc of walletSnap.docs) {
      if (wDoc.data().customerMobile == currentCustomer.mobile) {
        await deleteDoc(doc(db, "walletHistory", wDoc.id));
      }
    }

    const notifSnap = await getDocs(collection(db, "notifications"));

    for (const nDoc of notifSnap.docs) {
      if (nDoc.data().customerMobile == currentCustomer.mobile) {
        await deleteDoc(doc(db, "notifications", nDoc.id));
      }
    }

    const voucherSnap = await getDocs(collection(db, "vouchers"));

    for (const vDoc of voucherSnap.docs) {
      if (vDoc.data().customerMobile == currentCustomer.mobile) {
        await deleteDoc(doc(db, "vouchers", vDoc.id));
      }
    }

    const voucherSalesSnap = await getDocs(collection(db, "voucherSales"));

    for (const vsDoc of voucherSalesSnap.docs) {
      if (vsDoc.data().customerMobile == currentCustomer.mobile) {
        await deleteDoc(doc(db, "voucherSales", vsDoc.id));
      }
    }

    showToast("✅ Customer and related data deleted");

    document.getElementById("name").textContent = "-";
    document.getElementById("mobile").textContent = "-";
    document.getElementById("hrpoint").textContent = "-";
    document.getElementById("rank").textContent = "-";
    document.getElementById("status").textContent = "-";
    document.getElementById("searchMobile").value = "";

    currentCustomer = null;

  } catch (err) {
    console.error(err);
    showToast("❌ Delete failed");
  }

};
        
