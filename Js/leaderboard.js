import {
  db,
  authReady,
  collection,
  getDocs
} from "./firebase.js";

await authReady;

const myMobile = localStorage.getItem("userMobile");

const firstName = document.getElementById("firstName");
const firstHR = document.getElementById("firstHR");

const secondName = document.getElementById("secondName");
const secondHR = document.getElementById("secondHR");

const thirdName = document.getElementById("thirdName");
const thirdHR = document.getElementById("thirdHR");

const leaderboardList = document.getElementById("leaderboardList");

function maskMobile(mobile) {
  if (!mobile || mobile.length < 4) return mobile || "";
  return "xxxxxx" + mobile.slice(-4);
}

async function loadLeaderboard() {

  const snap = await getDocs(collection(db, "users"));

  let users = [];

  snap.forEach(doc => {

    const data = doc.data();

    users.push({
      name: data.name || "Unknown",
      mobile: data.mobile || "",
      hr: Number(data.hrpoint || 0)
    });

  });

  users.sort((a, b) => b.hr - a.hr);

  if (users.length > 0) {
    firstName.textContent = users[0].name;
    firstHR.textContent = users[0].hr + " HR";
  }

  if (users.length > 1) {
    secondName.textContent = users[1].name;
    secondHR.textContent = users[1].hr + " HR";
  }

  if (users.length > 2) {
    thirdName.textContent = users[2].name;
    thirdHR.textContent = users[2].hr + " HR";
  }

  leaderboardList.innerHTML = "";

  users.forEach((user, index) => {

    const highlight =
      user.mobile === myMobile ? "rankCard myRank" : "rankCard";

    leaderboardList.innerHTML += `
      <div class="${highlight}">
        <div class="rankLeft">
          <div class="rankNumber">#${index + 1}</div>

          <div>
            <div class="rankName">${user.name}</div>
            <small>${maskMobile(user.mobile)}</small>
          </div>
        </div>

        <div class="rankHR">${user.hr} HR</div>
      </div>
    `;

  });

}

loadLeaderboard();