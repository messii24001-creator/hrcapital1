import "./admin-guard.js";

import {
  db,
  authReady,
  doc,
  getDoc,
  setDoc
} from "./firebase.js";

import { uploadImageToCloudinary } from "./cloudinary-upload.js";

await authReady;

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) { alert(message); return; }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

let existingQrUrl = "";
let selectedFile = null;

const settingsRef = doc(db, "paymentSettings", "config");

async function loadSettings() {

  try {

    const snap = await getDoc(settingsRef);

    if (snap.exists()) {

      const d = snap.data();

      document.getElementById("onlineEnabled").checked = !!d.onlineEnabled;
      document.getElementById("upiId").value = d.upiId || "";
      document.getElementById("accountHolder").value = d.accountHolder || "";
      document.getElementById("upiMobile").value = d.mobile || "";
      document.getElementById("instructions").value = d.instructions || "";
      document.getElementById("cashEnabled").checked = d.cashEnabled !== false;

      if (d.qrImageUrl) {
        existingQrUrl = d.qrImageUrl;
        const preview = document.getElementById("qrPreview");
        preview.src = d.qrImageUrl;
        preview.style.display = "block";
      }

    }

  } catch (e) {
    console.error(e);
    showToast("Could not load existing settings (starting fresh)");
  }

}

document.getElementById("qrFile").addEventListener("change", (e) => {

  const file = e.target.files[0];
  if (!file) return;

  selectedFile = file;

  const preview = document.getElementById("qrPreview");
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";

});

const saveBtn = document.getElementById("saveBtn");
const saveBtnText = document.getElementById("saveBtnText");

saveBtn.onclick = async () => {

  const onlineEnabled = document.getElementById("onlineEnabled").checked;
  const upiId = document.getElementById("upiId").value.trim();

  if (onlineEnabled && !upiId) {
    showToast("Add a UPI ID before enabling online payment");
    return;
  }

  saveBtn.disabled = true;
  saveBtnText.textContent = "Saving...";

  let qrImageUrl = existingQrUrl;
  let qrFailed = false;

  // QR upload is optional and kept separate from the main save —
  // if Cloudinary isn't configured, the QR just won't upload, but
  // the UPI ID / instructions / toggles below still save fine.
  if (selectedFile) {

    try {
      qrImageUrl = await uploadImageToCloudinary(selectedFile);
    } catch (e) {
      console.error("QR upload failed:", e);
      qrFailed = true;
    }

  }

  try {

    await setDoc(settingsRef, {
      onlineEnabled,
      upiId,
      accountHolder: document.getElementById("accountHolder").value.trim(),
      mobile: document.getElementById("upiMobile").value.trim(),
      qrImageUrl,
      instructions: document.getElementById("instructions").value.trim(),
      cashEnabled: document.getElementById("cashEnabled").checked
    }, { merge: true });

    existingQrUrl = qrImageUrl;
    selectedFile = null;

    if (qrFailed) {
      showToast("✅ Settings saved — QR upload isn't available yet (customers can still see the UPI ID)");
    } else {
      showToast("✅ Payment settings saved");
    }

  } catch (e) {
    console.error(e);
    showToast("Failed to save settings. Please try again.");
  }

  saveBtn.disabled = false;
  saveBtnText.textContent = "💾 Save Settings";

};

loadSettings();
