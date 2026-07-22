import {
  db,
  authReady,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp
} from "./firebase.js";

await authReady;

const mobile = localStorage.getItem("userMobile");

if (!mobile) {
  alert("Please login first.");
  location.href = "index.html";
}

const canvas = document.getElementById("scratchCanvas");
const ctx = canvas.getContext("2d");

let scratchDocId = "";
let scratchData = {};
let isDrawing = false;
let claimed = false;

// Load Scratch Card
async function loadCard() {

  const q = query(
    collection(db, "scratchCards"),
    where("customerMobile", "==", mobile),
    where("status", "==", "ready")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    document.querySelector(".rewardCard").style.display = "none";
    document.getElementById("noCard").style.display = "block";
    return;
  }

  const card = snap.docs[0];

  scratchDocId = card.id;
  scratchData = card.data();

  if (scratchData.rewardType === "Voucher") {

    document.querySelector(".reveal-points").textContent =
      scratchData.voucherTitle || "Voucher";

    document.querySelector(".reveal-small").textContent =
      "🎟️ You won a voucher!";

  } else {

    document.querySelector(".reveal-points").textContent =
      scratchData.rewardValue + " HR";

    document.querySelector(".reveal-small").textContent =
      "Congratulations";

  }

  document.getElementById("themeName").textContent =
    scratchData.theme || "Lucky Gold";

  initCanvas();
}

function initCanvas() {

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = "#C0C0C0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#666";
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText(
    "SCRATCH HERE",
    canvas.width / 2,
    canvas.height / 2
  );

}

loadCard();
// =====================
// PART 2 - Scratch Engine
// =====================

function getPosition(e) {
  const rect = canvas.getBoundingClientRect();

  if (e.touches) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  }

  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function scratch(x, y) {

  if (claimed) return;

  ctx.globalCompositeOperation = "destination-out";

  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();

  checkProgress();
}

function checkProgress() {

  const pixels = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  ).data;

  let cleared = 0;

  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] === 0) cleared++;
  }

  const percent = cleared / (canvas.width * canvas.height);

  if (percent >= 0.60 && !claimed) {
    claimed = true;
    finishClaim();
  }

}

// Mouse

canvas.addEventListener("mousedown", () => {
  isDrawing = true;
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
});

canvas.addEventListener("mouseleave", () => {
  isDrawing = false;
});

canvas.addEventListener("mousemove", (e) => {

  if (!isDrawing) return;

  const p = getPosition(e);

  scratch(p.x, p.y);

});

// Touch

canvas.addEventListener("touchstart", (e) => {

  isDrawing = true;

  const p = getPosition(e);

  scratch(p.x, p.y);

});

canvas.addEventListener("touchmove", (e) => {

  e.preventDefault();

  if (!isDrawing) return;

  const p = getPosition(e);

  scratch(p.x, p.y);

}, { passive: false });

canvas.addEventListener("touchend", () => {

  isDrawing = false;

});

canvas.addEventListener("touchcancel", () => {

  isDrawing = false;

});
// =====================
// PART 3 - Claim Reward
// =====================

async function finishClaim() {

  try {

    // Hide scratch layer
    canvas.style.display = "none";

    // Loading
    const loading = document.getElementById("loadingScreen");
    if (loading) loading.style.display = "flex";

    // Find user
    const userQuery = query(
      collection(db, "users"),
      where("mobile", "==", mobile)
    );

    const userSnap = await getDocs(userQuery);

    if (!userSnap.empty) {

      const userDoc = userSnap.docs[0];
      const userData = userDoc.data();

      if (scratchData.rewardType === "Voucher") {

        try {
          await addDoc(collection(db, "vouchers"), {
            customerMobile: mobile,
            customerName: userData.name,
            title: scratchData.voucherTitle || "Voucher",
            code: scratchData.voucherCode || "",
            value: Number(scratchData.rewardValue) || 0,
            source: "Scratch card",
            claimedAt: serverTimestamp()
          });
        } catch (e) {
          console.error("Voucher save failed:", e);
        }

      } else {

        const currentHR = Number(userData.hrpoint || 0);

        await updateDoc(
          doc(db, "users", userDoc.id),
          {
            hrpoint: currentHR + Number(scratchData.rewardValue)
          }
        );

        try {
          const sourceLabel =
            scratchData.source === "recharge" ? "Recharge reward" :
            scratchData.source === "voucher" ? "Voucher purchase reward" :
            "Scratch card reward";

          await addDoc(collection(db, "walletHistory"), {
            customerMobile: mobile,
            type: "scratch",
            source: scratchData.source || "general",
            amount: Number(scratchData.rewardValue),
            description: `${sourceLabel} (${scratchData.theme || "Reward"})`,
            date: serverTimestamp()
          });
        } catch (e) {
          console.error("Wallet history entry failed (reward still applied):", e);
        }

      }
    }

    // Mark scratch card claimed
    await updateDoc(
      doc(db, "scratchCards", scratchDocId),
      {
        status: "claimed"
      }
    );

    // Confetti
    if (typeof confetti === "function") {
      confetti({
        particleCount: 180,
        spread: 100,
        origin: { y: 0.6 }
      });
    }

    if (loading) loading.style.display = "none";

    if (scratchData.rewardType === "Voucher") {

      alert(
        "🎉 Congratulations!\n\n" +
        (scratchData.voucherTitle || "Voucher") +
        " won! Code: " + (scratchData.voucherCode || "") +
        "\n\nSaved to My Vouchers."
      );

      location.href = "my-vouchers.html";

    } else {

      alert(
        "🎉 Congratulations!\n\n" +
        scratchData.rewardValue +
        " HR Points Added Successfully!"
      );

      location.href = "dashboard.html";

    }

  } catch (err) {

    console.error(err);

    alert("Error: " + err.message);

  }

}