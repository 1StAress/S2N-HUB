// S2N HUB - TOURNAMENT DETAIL
// Preview Mode - ยังไม่เชื่อม Supabase

document.addEventListener("DOMContentLoaded", () => {

  const params = new URLSearchParams(window.location.search);
  const tournamentId = params.get("id");

  // PREVIEW DATA
  const tournaments = {
    "s2n-cup-001": {
      title: "S2N CHAMPIONS CUP",
      subtitle: "SEASON 01",
      status: "OPEN",
      prize: "฿5,000",
      mode: "SQUAD",
      map: "ERANGEL",
      date: "2026-12-15T20:00:00+07:00",
      teamLimit: 16,
      registered: 8,
      description:
        "การแข่งขัน PUBG Mobile แบบ Squad เพื่อค้นหาทีมที่แข็งแกร่งที่สุดใน S2N HUB"
    },

    "s2n-cup-002": {
      title: "S2N NIGHT BATTLE",
      subtitle: "WEEKLY SERIES",
      status: "OPEN",
      prize: "฿2,000",
      mode: "SQUAD",
      map: "ERANGEL",
      date: "2026-12-20T20:00:00+07:00",
      teamLimit: 12,
      registered: 6,
      description:
        "ศึกประจำสัปดาห์สำหรับสมาชิกและทีมที่ต้องการเก็บประสบการณ์การแข่งขัน"
    },

    "s2n-cup-003": {
      title: "S2N PRO LEAGUE",
      subtitle: "LIVE MATCH",
      status: "LIVE",
      prize: "฿10,000",
      mode: "SQUAD",
      map: "ERANGEL",
      date: "2026-11-04T20:00:00+07:00",
      teamLimit: 16,
      registered: 16,
      description:
        "การแข่งขันลีกสำหรับทีมที่ผ่านการคัดเลือก เข้าสู่สนามรบเพื่อชิงอันดับ"
    },

    "s2n-cup-004": {
      title: "S2N ROOKIE CUP",
      subtitle: "SEASON 00",
      status: "COMPLETED",
      prize: "฿1,000",
      mode: "SQUAD",
      map: "ERANGEL",
      date: "2026-10-25T20:00:00+07:00",
      teamLimit: 8,
      registered: 8,
      description:
        "การแข่งขันสำหรับผู้เล่นหน้าใหม่ เพื่อฝึกฝนและพัฒนาทักษะการเล่นเป็นทีม"
    }
  };

  const tournament = tournaments[tournamentId] || tournaments["s2n-cup-001"];

  // ELEMENTS
  const statusElement = document.getElementById("detail-status");
  const registerButton = document.getElementById("register-tournament-btn");

  // SET TOURNAMENT INFO
  document.getElementById("detail-title").textContent =
    tournament.title;

  document.getElementById("detail-subtitle").textContent =
    tournament.subtitle;

  document.getElementById("detail-prize").textContent =
    tournament.prize;

  document.getElementById("detail-mode").textContent =
    tournament.mode;

  document.getElementById("detail-map").textContent =
    tournament.map;

  document.getElementById("detail-description").textContent =
    tournament.description;

  // STATUS
  const statusLabels = {
    OPEN: "REGISTRATION OPEN",
    LIVE: "● LIVE NOW",
    COMPLETED: "COMPLETED"
  };

  statusElement.textContent =
    statusLabels[tournament.status] || tournament.status;

  statusElement.className = "detail-status";

  if (tournament.status === "LIVE") {
    statusElement.classList.add("live");
  }

  if (tournament.status === "COMPLETED") {
    statusElement.classList.add("completed");
  }

  // SUMMARY
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  document.getElementById("detail-date").textContent =
    formatDate(tournament.date);

  document.getElementById("detail-team-limit").textContent =
    `${tournament.teamLimit} TEAMS`;

  document.getElementById("detail-registered").textContent =
    `${String(tournament.registered).padStart(2, "0")} / ${tournament.teamLimit}`;

  // PROGRESS
  const progress = Math.min(
    100,
    Math.round(
      (tournament.registered / tournament.teamLimit) * 100
    )
  );

  document.getElementById("detail-progress-text").textContent =
    `${tournament.registered} / ${tournament.teamLimit}`;

  document.getElementById("detail-progress-fill").style.width =
    `${progress}%`;

  // COUNTDOWN
  function updateCountdown() {
    const countdownElement =
      document.getElementById("detail-countdown");

    if (tournament.status === "LIVE") {
      countdownElement.textContent = "LIVE";
      return;
    }

    if (tournament.status === "COMPLETED") {
      countdownElement.textContent = "ENDED";
      return;
    }

    const now = new Date();
    const eventDate = new Date(tournament.date);
    const difference = eventDate.getTime() - now.getTime();

    if (difference <= 0) {
      countdownElement.textContent = "STARTING";
      return;
    }

    const days = Math.floor(
      difference / (1000 * 60 * 60 * 24)
    );

    const hours = Math.floor(
      (difference / (1000 * 60 * 60)) % 24
    );

    countdownElement.textContent =
      `${days}D ${hours}H`;
  }

  updateCountdown();
  setInterval(updateCountdown, 60000);

  // TABS
  const tabButtons = document.querySelectorAll(".detail-tab");
  const tabContents = document.querySelectorAll(".detail-tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {

      const tabName = button.dataset.tab;

      tabButtons.forEach((item) => {
        item.classList.remove("active");
      });

      tabContents.forEach((content) => {
        content.classList.remove("active");
      });

      button.classList.add("active");

      const selectedTab =
        document.getElementById(`tab-${tabName}`);

      if (selectedTab) {
        selectedTab.classList.add("active");
      }

    });
  });

  // PREVIEW TEAMS
  const teams = [
    {
      name: "S2N ALPHA",
      captain: "PLAYER ONE",
      players: 4,
      status: "APPROVED"
    },
    {
      name: "S2N BRAVO",
      captain: "PLAYER TWO",
      players: 4,
      status: "APPROVED"
    },
    {
      name: "S2N CHARLIE",
      captain: "PLAYER THREE",
      players: 4,
      status: "PENDING"
    },
    {
      name: "S2N DELTA",
      captain: "PLAYER FOUR",
      players: 4,
      status: "APPROVED"
    }
  ];

  const teamsBody = document.getElementById("detail-teams-body");

  teamsBody.innerHTML = teams.map((team, index) => {

    const statusClass =
      team.status === "PENDING" ? "pending" : "";

    return `
      <tr>
        <td class="table-rank">
          ${String(index + 1).padStart(2, "0")}
        </td>

        <td class="table-team">
          ${team.name}
        </td>

        <td>
          ${team.captain}
        </td>

        <td>
          ${team.players} PLAYERS
        </td>

        <td>
          <span class="table-status ${statusClass}">
            ${team.status}
          </span>
        </td>
      </tr>
    `;

  }).join("");

  // PREVIEW MATCHES
  const matches = [
    {
      number: "MATCH 01",
      title: "ERANGEL / ROUND 01",
      date: formatDate(tournament.date),
      time: "20:00",
      status: tournament.status === "LIVE" ? "LIVE NOW" : "SCHEDULED"
    },
    {
      number: "MATCH 02",
      title: "ERANGEL / ROUND 02",
      date: formatDate(tournament.date),
      time: "20:40",
      status: tournament.status === "LIVE" ? "LIVE NOW" : "SCHEDULED"
    },
    {
      number: "MATCH 03",
      title: "ERANGEL / ROUND 03",
      date: formatDate(tournament.date),
      time: "21:20",
      status: tournament.status === "LIVE" ? "LIVE NOW" : "SCHEDULED"
    }
  ];

  const matchesList =
    document.getElementById("detail-matches-list");

  matchesList.innerHTML = matches.map((match) => {

    return `
      <article class="match-card">

        <div class="match-card-header">
          <span class="match-number">
            ${match.number}
          </span>

          <span class="match-status">
            ${match.status}
          </span>
        </div>

        <h3>
          ${match.title}
        </h3>

        <div class="match-card-info">

          <span>
            DATE:
            <strong>${match.date}</strong>
          </span>

          <span>
            TIME:
            <strong>${match.time}</strong>
          </span>

        </div>

      </article>
    `;

  }).join("");

  // PREVIEW RESULTS
  const results = [
    {
      rank: 1,
      team: "S2N ALPHA",
      place: 15,
      kills: 12,
      total: 27
    },
    {
      rank: 2,
      team: "S2N BRAVO",
      place: 12,
      kills: 10,
      total: 22
    },
    {
      rank: 3,
      team: "S2N CHARLIE",
      place: 10,
      kills: 8,
      total: 18
    }
  ];

  const resultsBody =
    document.getElementById("detail-results-body");

  resultsBody.innerHTML = results.map((result) => {

    return `
      <tr>

        <td class="table-rank">
          #${result.rank}
        </td>

        <td class="table-team">
          ${result.team}
        </td>

        <td>
          ${result.place}
        </td>

        <td>
          ${result.kills}
        </td>

        <td class="table-rank">
          ${result.total}
        </td>

      </tr>
    `;

  }).join("");

  // PREVIEW REGISTRATION
  if (registerButton) {

    if (tournament.status !== "OPEN") {
      registerButton.disabled = true;

      registerButton.textContent =
        tournament.status === "LIVE"
          ? "REGISTRATION CLOSED"
          : "EVENT COMPLETED";
    }

    registerButton.addEventListener("click", () => {

      if (tournament.status !== "OPEN") {
        return;
      }

      alert(
        "ระบบสมัครแข่งขันยังอยู่ใน Preview Mode\n\n" +
        "เมื่อเชื่อม Supabase แล้ว สมาชิกจะสามารถสมัครและรอ Admin อนุมัติได้"
      );

    });

  }

  console.log("S2N Tournament Detail Loaded");

});