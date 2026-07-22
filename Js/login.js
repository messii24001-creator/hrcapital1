import {
  db,
  authReady,
  collection,
  query,
  where,
  getDocs
} from "./firebase.js";

await authReady;

// Auto Login
const savedUser = localStorage.getItem("userMobile");

if (savedUser) {
  window.location.href = "dashboard.html";
}

// Buttons
const loginBtn = document.getElementById("loginBtn");
const loginText = document.getElementById("loginText");
const adminOpen = document.getElementById("adminOpen");

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) { alert(message); return; }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

// Double Tap → Admin Login
let tap = 0;

adminOpen.addEventListener("click", () => {
  tap++;

  if (tap === 2) {
    window.location.href = "admin.html";
  }

  setTimeout(() => {
    tap = 0;
  }, 500);
});

// Customer Login
loginBtn.addEventListener("click", async () => {

  const mobile = document.getElementById("mobile").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!mobile || !password) {
    showToast("Please fill all details");
    return;
  }

  if (mobile.length !== 10 || !/^\d{10}$/.test(mobile)) {
    showToast("Enter a valid 10-digit mobile number");
    return;
  }

  loginBtn.disabled = true;
  loginText.textContent = "Logging in...";

  try {

    const q = query(
      collection(db, "users"),
      where("mobile", "==", mobile),
      where("password", "==", password)
    );

    const snap = await getDocs(q);

    if (snap.empty) {

      showToast("Invalid mobile number or password");

    } else {

      localStorage.removeItem("admin");
      localStorage.setItem("userMobile", mobile);

      window.location.href = "dashboard.html";
      return;

    }

  } catch (error) {

    console.error(error);
    showToast("Login failed. Please try again.");

  }

  loginBtn.disabled = false;
  loginText.textContent = "🚀 Login Securely";

});
