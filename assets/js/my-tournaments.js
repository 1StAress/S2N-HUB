// S2N HUB - My Tournaments
// Preview Mode: Mock Data

const applications = [
  {
    id: "APP-S2N-001",
    tournamentId: "s2n-cup-001",
    tournamentName: "S2N CUP SEASON 01",
    game: "PUBG MOBILE",
    teamName: "S2N ALPHA",
    teamLeader: "S2N_JP",
    submittedAt: "2026-10-28",
    status: "PENDING",
    note: "กำลังรอตรวจสอบข้อมูลทีมและรายชื่อสมาชิก"
  },
  {
    id: "APP-S2N-002",
    tournamentId: "s2n-cup-002",
    tournamentName: "S2N NIGHT LEAGUE",
    game: "PUBG MOBILE",
    teamName: "S2N OMEGA",
    teamLeader: "S2N_RAVEN",
    submittedAt: "2026-10-25",
    status: "APPROVED",
    note: "ทีมได้รับการอนุมัติแล้ว สามารถติดตามตารางการแข่งขันได้"
  },
  {
    id: "APP-S2N-003",
    tournamentId: "s2n-cup-003",
    tournamentName: "S2N COMMUNITY SHOWDOWN",
    game: "PUBG MOBILE",
    teamName: "S2N NOVA",
    teamLeader: "S2N_NOVA",
    submittedAt: "2026-10-20",
    status: "REJECTED",
    note: "รายชื่อสมาชิกไม่ครบตามเงื่อนไขการแข่งขัน"
  }
];

const statusLabels = {
  PENDING: "รอตรวจสอบ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่ผ่าน"
};

const container = document.getElementById("applications-container");
const emptyState = document.getElementById("empty-state");
const statusFilter = document.getElementById("status-filter");
const searchInput = document.getElementById("search-input");

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function updateStats() {
  document.getElementById("total-count").textContent =
    applications.length;

  document.getElementById("pending-count").textContent =
    applications.filter(item => item.status === "PENDING").length;

  document.getElementById("approved-count").textContent =
    applications.filter(item => item.status === "APPROVED").length;

  document.getElementById("rejected-count").textContent =
    applications.filter(item => item.status === "REJECTED").length;
}

function renderApplications() {
  const selectedStatus = statusFilter.value;
  const keyword = searchInput.value.trim().toLowerCase();

  const filteredApplications = applications.filter(item => {
    const matchesStatus =
      selectedStatus === "ALL" ||
      item.status === selectedStatus;

    const matchesKeyword =
      item.tournamentName.toLowerCase().includes(keyword) ||
      item.teamName.toLowerCase().includes(keyword) ||
      item.id.toLowerCase().includes(keyword);

    return matchesStatus && matchesKeyword;
  });

  container.innerHTML = "";

  if (filteredApplications.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  filteredApplications.forEach(item => {
    const card = document.createElement("article");
    card.className = "application-card";

    const info = document.createElement("div");
    info.className = "application-info";

    const title = document.createElement("h3");
    title.textContent = item.tournamentName;

    const meta = document.createElement("div");
    meta.className = "application-meta";

    const game = document.createElement("span");
    game.textContent = item.game;

    const applicationId = document.createElement("span");
    applicationId.textContent = `Application: ${item.id}`;

    const date = document.createElement("span");
    date.textContent = `สมัครเมื่อ ${formatDate(item.submittedAt)}`;

    meta.append(game, applicationId, date);

    const team = document.createElement("div");
    team.className = "application-team";

    const teamLabel = document.createElement("span");
    teamLabel.textContent = "TEAM: ";

    const teamName = document.createElement("strong");
    teamName.textContent = item.teamName;

    const leader = document.createElement("span");
    leader.textContent = ` | Leader: ${item.teamLeader}`;

    team.append(teamLabel, teamName, leader);

    const note = document.createElement("div");
    note.className = "application-note";
    note.textContent = item.note;

    info.append(title, meta, team, note);

    const status = document.createElement("div");
    status.className =
      `application-status ${item.status.toLowerCase()}`;

    status.textContent = statusLabels[item.status];

    card.append(info, status);
    container.appendChild(card);
  });
}

statusFilter.addEventListener("change", renderApplications);
searchInput.addEventListener("input", renderApplications);

updateStats();
renderApplications();