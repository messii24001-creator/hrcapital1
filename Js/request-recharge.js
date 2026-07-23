import {
  db,
  authReady,
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  addDoc,
  serverTimestamp
} from "./firebase.js";

import { sendTelegramAlert } from "./telegram-notify.js";

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

// hrSettings defaults — used until Phase 4 admin settings page
// exists and an admin actually saves a config doc.
let hrSettings = {
  conversionRate: 10,   // 10 HR = ₹1
  maxRedeem: Infinity,
  minRedeem: 0,
  minRechargeForHR: 0
};

// paymentSettings defaults — Online stays "not configured" until
// Phase 4 lets an admin fill these in.
let paymentSettings = {
  onlineEnabled: false,
  cashEnabled: true,
  upiId: "",
  accountHolder: "",
  qrImageUrl: "",
  instructions: ""
};

async function loadData() {

  try {

    const q = query(collection(db, "users"), where("mobile", "==", mobile));
    const snap = await getDocs(q);

    if (snap.empty) {
      showToast("Account not found. Please login again.");
      setTimeout(() => (window.location.href = "index.html"), 1200);
      return;
    }

    customerDocId = snap.docs[0].id;
    customer = snap.docs[0].data();

    document.getElementById("availableHR").textContent =
      Number(customer.hrpoint).toLocaleString("en-IN");
    document.getElementById("availableHRValue").textContent =
      Math.floor(Number(customer.hrpoint) / hrSettings.conversionRate).toLocaleString("en-IN");

  } catch (e) {
    console.error(e);
    showToast("Failed to load your account.");
    return;
  }

  try {
    const hrDoc = await getDoc(doc(db, "hrSettings", "config"));
    if (hrDoc.exists()) {
      const d = hrDoc.data();
      hrSettings.conversionRate = Number(d.conversionRate) || 10;
      hrSettings.maxRedeem = (d.maxRedeem === null || d.maxRedeem === undefined) ? Infinity : Number(d.maxRedeem);
      hrSettings.minRedeem = Number(d.minRedeem) || 0;
      hrSettings.minRechargeForHR = Number(d.minRechargeForHR) || 0;
    }
  } catch (e) {
    console.error("hrSettings not available yet, using defaults:", e);
  }

  try {
    const payDoc = await getDoc(doc(db, "paymentSettings", "config"));
    if (payDoc.exists()) {
      const d = payDoc.data();
      paymentSettings.onlineEnabled = !!d.onlineEnabled;
      paymentSettings.cashEnabled = d.cashEnabled !== false;
      paymentSettings.upiId = d.upiId || "";
      paymentSettings.accountHolder = d.accountHolder || "";
      paymentSettings.qrImageUrl = d.qrImageUrl || "";
      paymentSettings.instructions = d.instructions || "";
    }
  } catch (e) {
    console.error("paymentSettings not available yet, using defaults:", e);
  }

  document.getElementById("availableHRValue").textContent =
    Math.floor(Number(customer.hrpoint) / hrSettings.conversionRate).toLocaleString("en-IN");

  recalc();

}

// ============ STEP 1: calculator ============

const amountInput = document.getElementById("amount");
const hrRedeemInput = document.getElementById("hrRedeem");

function maxRedeemable() {

  if (!customer) return 0;

  const amount = Number(amountInput.value) || 0;

  if (amount < hrSettings.minRechargeForHR) return 0;

  const userHR = Number(customer.hrpoint) || 0;
  const maxByAmount = amount * hrSettings.conversionRate;

  return Math.max(0, Math.min(userHR, maxByAmount, hrSettings.maxRedeem));

}

function recalc() {

  const amount = Number(amountInput.value) || 0;
  let hrRedeem = Number(hrRedeemInput.value) || 0;

  const max = maxRedeemable();
  const hint = document.getElementById("hrRedeemHint");

  if (amount > 0 && amount < hrSettings.minRechargeForHR) {

    hrRedeem = 0;
    hrRedeemInput.value = 0;
    hrRedeemInput.disabled = true;

    if (hint) hint.textContent = `Recharges below ₹${hrSettings.minRechargeForHR} can't redeem HR.`;

  } else {

    hrRedeemInput.disabled = false;

    if (hrRedeem > max) {
      hrRedeem = max;
      hrRedeemInput.value = max;
    }

    if (hrRedeem > 0 && hrRedeem < hrSettings.minRedeem) {
      hrRedeem = Math.min(hrSettings.minRedeem, max);
      hrRedeemInput.value = hrRedeem;
    }

    if (hrRedeem < 0) {
      hrRedeem = 0;
      hrRedeemInput.value = 0;
    }

    if (hint) {
      hint.textContent = hrSettings.minRedeem > 0
        ? `Minimum ${hrSettings.minRedeem} HR if redeeming.`
        : "";
    }

  }

  const hrValue = Math.floor(hrRedeem / hrSettings.conversionRate);
  const remaining = Math.max(0, amount - hrValue);

  document.getElementById("calcAmount").textContent = "₹" + amount.toLocaleString("en-IN");
  document.getElementById("calcHRValue").textContent = "− ₹" + hrValue.toLocaleString("en-IN");
  document.getElementById("calcRemaining").textContent = "₹" + remaining.toLocaleString("en-IN");

}

amountInput.addEventListener("input", recalc);
hrRedeemInput.addEventListener("input", recalc);

document.getElementById("useMaxBtn").onclick = () => {
  hrRedeemInput.value = maxRedeemable();
  recalc();
};

// ============ STEP navigation ============

let requestData = null;

document.getElementById("continueBtn").onclick = () => {

  const operator = document.getElementById("operator").value;
  const rechargeNumber = document.getElementById("rechargeNumber").value.trim();
  const amount = Number(amountInput.value);
  const hrRedeem = Number(hrRedeemInput.value) || 0;

  if (!rechargeNumber || !amount || amount <= 0) {
    showToast("Please fill recharge number and amount.");
    return;
  }

  const hrValue = Math.floor(hrRedeem / hrSettings.conversionRate);
  const remaining = Math.max(0, amount - hrValue);

  requestData = {
    operator,
    rechargeNumber,
    amount,
    hrRedeemed: hrRedeem,
    cashPaid: remaining
  };

  document.getElementById("payAmount").textContent = "₹" + remaining.toLocaleString("en-IN");

  // Show/hide online vs "not configured" panel
  document.getElementById("onlineConfigured").style.display =
    paymentSettings.onlineEnabled && paymentSettings.upiId ? "block" : "none";
  document.getElementById("onlineNotConfigured").style.display =
    paymentSettings.onlineEnabled && paymentSettings.upiId ? "none" : "block";

  if (paymentSettings.onlineEnabled && paymentSettings.upiId) {
    document.getElementById("upiId").textContent = paymentSettings.upiId;
    document.getElementById("upiName").textContent = paymentSettings.accountHolder || "—";
    document.getElementById("payInstructions").textContent = paymentSettings.instructions || "";

    if (paymentSettings.qrImageUrl) {
      const qr = document.getElementById("qrImage");
      qr.src = paymentSettings.qrImageUrl;
      qr.style.display = "block";
    }
  }

  document.getElementById("step1").style.display = "none";
  document.getElementById("step2").style.display = "block";

};

document.getElementById("backToStep1").onclick = () => {
  document.getElementById("step2").style.display = "none";
  document.getElementById("step1").style.display = "block";
};

// ============ STEP 2: tabs ============

const onlineTab = document.getElementById("onlineTab");
const cashTab = document.getElementById("cashTab");

onlineTab.onclick = () => {
  onlineTab.classList.add("active");
  cashTab.classList.remove("active");
  document.getElementById("onlinePanel").style.display = "block";
  document.getElementById("cashPanel").style.display = "none";
};

cashTab.onclick = () => {
  cashTab.classList.add("active");
  onlineTab.classList.remove("active");
  document.getElementById("cashPanel").style.display = "block";
  document.getElementById("onlinePanel").style.display = "none";
};

document.getElementById("copyUpiBtn").onclick = () => {
  navigator.clipboard.writeText(paymentSettings.upiId)
    .then(() => showToast("UPI ID copied"))
    .catch(() => showToast("Couldn't copy — please copy manually"));
};

// ============ Submit request ============

async function submitRequest(paymentMethod, paymentStatus, btn) {

  try {

    await addDoc(collection(db, "rechargeRequests"), {
      customerId: customer.customerId || "",
      customerName: customer.name,
      customerMobile: customer.mobile,
      operator: requestData.operator,
      rechargeNumber: requestData.rechargeNumber,
      amount: requestData.amount,
      hrRedeemed: requestData.hrRedeemed,
      cashPaid: requestData.cashPaid,
      paymentMethod,
      status: "pending",
      paymentStatus,
      rejectReason: "",
      createdAt: serverTimestamp()
    });

    document.getElementById("successTitle").textContent =
      paymentMethod === "online" ? "Payment Submitted" : "Request Submitted";
    document.getElementById("successText").textContent = paymentStatus;

    document.getElementById("step2").style.display = "none";
    document.getElementById("step3").style.display = "block";

    sendTelegramAlert(
      `🔔 <b>New Recharge Request</b>\n` +
      `👤 ${customer.name} (${customer.mobile})\n` +
      `📱 ${requestData.rechargeNumber} — ${requestData.operator}\n` +
      `💰 ₹${requestData.amount} • 🔻 ${requestData.hrRedeemed} HR redeemed\n` +
      `💵 You receive: ₹${requestData.cashPaid}\n` +
      `💳 Payment: ${paymentMethod} — ${paymentStatus}`
    );

  } catch (e) {
    console.error(e);
    showToast("Failed to submit request. Please try again.");
    if (btn) btn.disabled = false;
  }

}

document.getElementById("paidBtn").onclick = () => {
  const btn = document.getElementById("paidBtn");
  btn.disabled = true;
  submitRequest("online", "Payment Pending Verification", btn);
};

document.getElementById("cashConfirmBtn").onclick = () => {
  const btn = document.getElementById("cashConfirmBtn");
  btn.disabled = true;
  submitRequest("cash", "Waiting for Cash Verification", btn);
};

loadData();
        
