import "./admin-guard.js";

import {
  db,
  authReady,
  doc,
  getDoc,
  setDoc
} from "./firebase.js";

await authReady;

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) { alert(message); return; }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

const settingsRef = doc(db, "hrSettings", "config");

async function loadSettings() {

  try {

    const snap = await getDoc(settingsRef);

    if (snap.exists()) {

      const d = snap.data();

      document.getElementById("conversionRate").value = d.conversionRate ?? 10;
      document.getElementById("minRedeem").value = d.minRedeem ?? 0;
      document.getElementById("maxRedeem").value = d.maxRedeem ?? "";
      document.getElementById("minRechargeForHR").value = d.minRechargeForHR ?? 0;
      document.getElementById("earnRate").value = d.earnRate ?? 0;
      document.getElementById("expiryDays").value = d.expiryDays ?? "";

    } else {
      document.getElementById("conversionRate").value = 10;
      document.getElementById("minRedeem").value = 0;
      document.getElementById("minRechargeForHR").value = 0;
      document.getElementById("earnRate").value = 0;
    }

  } catch (e) {
    console.error(e);
    showToast("Could not load existing settings (starting fresh)");
  }

}

const saveBtn = document.getElementById("saveBtn");
const saveBtnText = document.getElementById("saveBtnText");

saveBtn.onclick = async () => {

  const conversionRate = Number(document.getElementById("conversionRate").value) || 10;

  if (conversionRate <= 0) {
    showToast("Conversion rate must be greater than 0");
    return;
  }

  const maxRedeemRaw = document.getElementById("maxRedeem").value;
  const expiryRaw = document.getElementById("expiryDays").value;

  saveBtn.disabled = true;
  saveBtnText.textContent = "Saving...";

  try {

    await setDoc(settingsRef, {
      conversionRate,
      minRedeem: Number(document.getElementById("minRedeem").value) || 0,
      maxRedeem: maxRedeemRaw === "" ? null : Number(maxRedeemRaw),
      minRechargeForHR: Number(document.getElementById("minRechargeForHR").value) || 0,
      earnRate: Number(document.getElementById("earnRate").value) || 0,
      expiryDays: expiryRaw === "" ? null : Number(expiryRaw)
    }, { merge: true });

    showToast("✅ HR settings saved");

  } catch (e) {
    console.error(e);
    showToast("Failed to save settings");
  }

  saveBtn.disabled = false;
  saveBtnText.textContent = "💾 Save Settings";

};

loadSettings();
