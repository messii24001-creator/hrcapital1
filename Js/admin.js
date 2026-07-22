import {
  db,
  authReady,
  collection,
  query,
  where,
  getDocs
} from "./firebase.js";

await authReady;

// Already logged in as admin? skip straight to dashboard.
if (localStorage.getItem("admin") === "true") {
  window.location.href = "admin-dashboard.html";
}

const btn = document.getElementById("adminLoginBtn");
const btnText = document.getElementById("adminLoginText");

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) { alert(message); return; }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2400);
}

btn.addEventListener("click", async () => {

  const mobile = document.getElementById("adminMobile").value.trim();
  const password = document.getElementById("adminPassword").value.trim();

  if (mobile === "" || password === "") {
    showToast("Fill all details");
    return;
  }

  btn.disabled = true;
  btnText.textContent = "Checking...";

  try {

    const q = query(
      collection(db, "admins"),
      where("mobile", "==", mobile),
      where("password", "==", password)
    );

    const snap = await getDocs(q);

    if (snap.empty) {

      showToast("Wrong admin details");

    } else {

      localStorage.removeItem("userMobile");
      localStorage.setItem("admin", "true");

      window.location.href = "admin-dashboard.html";
      return;

    }

  } catch (err) {

    console.error(err);
    showToast("Login failed. Please try again.");

  }

  btn.disabled = false;
  btnText.textContent = "Admin Login";

});
