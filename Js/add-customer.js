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

function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateCustomerId(existingIds, totalUsers) {

  // Deleting a customer shrinks the count, which used to make the
  // next "HR00000X" collide with a still-active customer. Keep
  // incrementing until we land on an ID nobody currently has.
  let n = totalUsers + 1;

  while (existingIds.has("HR" + String(n).padStart(6, "0"))) {
    n++;
  }

  return "HR" + String(n).padStart(6, "0");

}

const addBtn = document.getElementById("addCustomerBtn");
const addText = document.getElementById("addCustomerText");

addBtn.onclick = async () => {

  const name = document.getElementById("name").value.trim();
  const mobile = document.getElementById("mobile").value.trim();

  if (name === "" || mobile === "") {
    showToast("Please fill all details.");
    return;
  }

  if (mobile.length !== 10 || !/^\d{10}$/.test(mobile)) {
    showToast("Enter a valid 10-digit mobile number.");
    return;
  }

  addBtn.disabled = true;
  addText.textContent = "Adding...";

  try {

    const snap = await getDocs(collection(db, "users"));

    let exists = false;
    const existingIds = new Set();

    snap.forEach(user => {
      const data = user.data();
      if (data.mobile === mobile) {
        exists = true;
      }
      if (data.customerId) {
        existingIds.add(data.customerId);
      }
    });

    if (exists) {
      showToast("Customer already exists.");
      addBtn.disabled = false;
      addText.textContent = "➕ Add Customer";
      return;
    }

    const customerId = generateCustomerId(existingIds, snap.size);
    const password = generatePassword();

    await addDoc(collection(db, "users"), {
      customerId: customerId,
      name: name,
      mobile: mobile,
      password: password,
      hrpoint: 0,
      rank: 1,
      status: "active",
      createdAt: serverTimestamp()
    });

    document.getElementById("resultId").textContent = customerId;
    document.getElementById("resultPassword").textContent = password;
    document.getElementById("resultPanel").style.display = "block";

    showToast("✅ Customer added successfully");

    document.getElementById("name").value = "";
    document.getElementById("mobile").value = "";

  } catch (err) {

    console.error(err);
    showToast("Failed to add customer. Please try again.");

  }

  addBtn.disabled = false;
  addText.textContent = "➕ Add Customer";

};
