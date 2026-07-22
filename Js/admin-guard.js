// Shared admin auth guard.
// Import this at the top of every admin-only page's script
// so the page redirects to admin login if not authenticated.

if (localStorage.getItem("admin") !== "true") {
  window.location.href = "admin.html";
}

export function adminLogout() {
  localStorage.removeItem("admin");
  window.location.href = "admin.html";
}
