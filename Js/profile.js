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

import { uploadImageToCloudinary } from "./cloudinary-upload.js";

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

let customer = null;
let customerDocId = null;
let selectedPhoto = null;

async function loadProfile() {

  try {

    const snap = await getDocs(query(collection(db, "users"), where("mobile", "==", mobile)));

    if (snap.empty) {
      showToast("Account not found. Please login again.");
      setTimeout(() => (window.location.href = "index.html"), 1200);
      return;
    }

    customerDocId = snap.docs[0].id;
    customer = snap.docs[0].data();

    document.getElementById("profileName").textContent = customer.name;
    document.getElementById("profileId").textContent = customer.customerId || customer.mobile;

    document.getElementById("nameInput").value = customer.name || "";
    document.getElementById("emailInput").value = customer.email || "";

    if (customer.photoUrl) {
      document.getElementById("avatarImg").src = customer.photoUrl;
      document.getElementById("avatarImg").style.display = "block";
      document.getElementById("avatarInitial").style.display = "none";
    } else {
      document.getElementById("avatarInitial").textContent =
        (customer.name || "?").charAt(0).toUpperCase();
    }

    document.getElementById("joinDate").textContent = customer.createdAt && customer.createdAt.toDate
      ? customer.createdAt.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
      : "—";

    // Total recharge + total HR earned, from recharge history
    const rechargeSnap = await getDocs(
      query(collection(db, "recharges"), where("customerMobile", "==", mobile))
    );

    let totalRecharge = 0;
    let totalHREarned = 0;

    rechargeSnap.forEach(d => {
      totalRecharge++;
      totalHREarned += Number(d.data().hrEarned) || 0;
    });

    document.getElementById("totalRecharge").textContent = totalRecharge;
    document.getElementById("totalHREarned").textContent = totalHREarned.toLocaleString("en-IN") + " HR";

    // Current rank
    const usersSnap = await getDocs(collection(db, "users"));
    let users = [];
    usersSnap.forEach(d => users.push(d.data()));
    users.sort((a, b) => Number(b.hrpoint) - Number(a.hrpoint));

    const rankIndex = users.findIndex(u => u.mobile == mobile);
    document.getElementById("currentRank").textContent = rankIndex >= 0 ? "#" + (rankIndex + 1) : "—";

  } catch (e) {
    console.error(e);
    showToast("Failed to load profile");
  }

}

document.getElementById("photoFile").addEventListener("change", (e) => {

  const file = e.target.files[0];
  if (!file) return;

  selectedPhoto = file;

  const img = document.getElementById("avatarImg");
  img.src = URL.createObjectURL(file);
  img.style.display = "block";
  document.getElementById("avatarInitial").style.display = "none";

});

const saveBtn = document.getElementById("saveBtn");
const saveBtnText = document.getElementById("saveBtnText");

saveBtn.onclick = async () => {

  if (!customer || !customerDocId) {
    showToast("Still loading your profile — try again in a moment");
    return;
  }

  const name = document.getElementById("nameInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();

  if (!name) {
    showToast("Name can't be empty");
    return;
  }

  if (password && password.length < 4) {
    showToast("Password should be at least 4 characters");
    return;
  }

  saveBtn.disabled = true;
  saveBtnText.textContent = "Saving...";

  const updates = { name, email };

  if (password) {
    updates.password = password;
  }

  // Photo upload is optional and kept separate from the main save —
  // if Cloudinary isn't configured, the photo just won't upload,
  // but the name/email/password changes below still go through.
  let photoFailed = false;

  if (selectedPhoto) {

    try {
      updates.photoUrl = await uploadImageToCloudinary(selectedPhoto);
    } catch (e) {
      console.error("Photo upload failed:", e);
      photoFailed = true;
    }

  }

  try {

    await updateDoc(doc(db, "users", customerDocId), updates);

    document.getElementById("profileName").textContent = name;
    document.getElementById("passwordInput").value = "";
    selectedPhoto = null;

    if (photoFailed) {
      showToast("✅ Details saved — photo upload isn't available yet");
    } else {
      showToast("✅ Profile updated");
    }

  } catch (e) {
    console.error(e);
    showToast("Failed to save profile. Please try again.");
  }

  saveBtn.disabled = false;
  saveBtnText.textContent = "💾 Save Changes";

};

document.getElementById("logoutBtn").onclick = () => {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("userMobile");
    window.location.href = "index.html";
  }
};

loadProfile();
