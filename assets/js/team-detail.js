/* =========================================
   S2N HUB - TEAM DETAIL
   PREVIEW MODE
========================================= */

"use strict";

const teamData = {
  id: "S2N-TEAM-001",
  name: "S2N ALPHA",
  tag: "S2N",
  game: "PUBG MOBILE",
  leader: "S2N_JP",
  createdDate: "28 OCT 2026",
  description: "Competitive PUBG Mobile team under S2N HUB.",
  
  mainPlayers: [
    "S2N_JP",
    "S2N_PLAYER02",
    "S2N_PLAYER03",
    "S2N_PLAYER04"
  ],
  
  substitute: "S2N_SUB01"
};

/* DOM */

const $ = (id) => document.getElementById(id);

/* MESSAGE */

function showTeamMessage(message, type = "success") {
  const messageBox = $("team-detail-message");
  
  if (!messageBox) return;
  
  messageBox.textContent = message;
  messageBox.className = `team-detail-message show ${type}`;
  messageBox.style.display = "block";
  
  clearTimeout(showTeamMessage.timeout);
  
  showTeamMessage.timeout = setTimeout(() => {
    messageBox.style.display = "none";
  }, 3000);
}

/* TEAM INFORMATION */

function renderTeamInformation() {
  $("team-logo").textContent = teamData.tag;
  $("team-tag").textContent = `TAG // ${teamData.tag}`;
  $("team-name").textContent = teamData.name;
  $("team-game").textContent =
    `${teamData.game} COMPETITIVE TEAM`;
  $("team-id").textContent = `TEAM ID: ${teamData.id}`;
  
  $("main-count").textContent =
    teamData.mainPlayers.length;
  
  $("sub-count").textContent =
    teamData.substitute ? 1 : 0;
  
  $("leader-stat").textContent = teamData.leader;
  
  $("info-team-name").textContent = teamData.name;
  $("info-team-tag").textContent = teamData.tag;
  $("info-team-game").textContent = teamData.game;
  $("info-created-date").textContent =
    teamData.createdDate;
  
  $("team-description").textContent =
    teamData.description || "No team description.";
  
  const totalPlayers =
    teamData.mainPlayers.length +
    (teamData.substitute ? 1 : 0);
  
  $("roster-total").textContent =
    `${String(totalPlayers).padStart(2, "0")} PLAYERS`;
}

/* PLAYER CARD */

function createPlayerCard(player, index, role) {
  const card = document.createElement("div");
  
  card.className = "team-detail-player";
  
  if (role === "TEAM LEADER") {
    card.classList.add("leader");
  }
  
  if (role === "SUBSTITUTE") {
    card.classList.add("reserve");
  }
  
  const avatar = document.createElement("div");
  avatar.className = "team-detail-player-avatar";
  avatar.textContent = String(index).padStart(2, "0");
  
  const info = document.createElement("div");
  info.className = "team-detail-player-info";
  
  const name = document.createElement("strong");
  name.textContent = player;
  
  const roleText = document.createElement("small");
  roleText.textContent = role;
  
  info.append(name, roleText);
  
  const roleBadge = document.createElement("div");
  roleBadge.className = "team-detail-player-role";
  
  roleBadge.textContent =
    role === "SUBSTITUTE" ? "RESERVE" : "ACTIVE";
  
  card.append(avatar, info, roleBadge);
  
  return card;
}

/* ROSTER */

function renderTeamRoster() {
  const roster = $("team-roster");
  
  roster.replaceChildren();
  
  teamData.mainPlayers.forEach((player, index) => {
    const role =
      player === teamData.leader ?
      "TEAM LEADER" :
      "MAIN ROSTER";
    
    roster.appendChild(
      createPlayerCard(player, index + 1, role)
    );
  });
  
  if (teamData.substitute) {
    roster.appendChild(
      createPlayerCard(
        teamData.substitute,
        5,
        "SUBSTITUTE"
      )
    );
  }
}

/* COPY */

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    
    showTeamMessage(message);
  } catch (error) {
    const input = document.createElement("textarea");
    
    input.value = text;
    input.style.position = "fixed";
    input.style.opacity = "0";
    
    document.body.appendChild(input);
    input.select();
    
    const copied = document.execCommand("copy");
    
    input.remove();
    
    showTeamMessage(
      copied ?
      message :
      "ไม่สามารถคัดลอกได้",
      copied ? "success" : "error"
    );
  }
}

/* EDIT TEAM */

function editTeam() {
  const newName = prompt(
    "แก้ไขชื่อทีม",
    teamData.name
  );
  
  if (newName === null) return;
  
  const cleanName = newName.trim();
  
  if (!cleanName) {
    showTeamMessage(
      "ชื่อทีมไม่สามารถเว้นว่างได้",
      "error"
    );
    return;
  }
  
  teamData.name = cleanName.toUpperCase();
  
  renderTeamInformation();
  
  showTeamMessage(
    "แก้ไขชื่อทีมใน Preview Mode เรียบร้อย"
  );
}

/* LEAVE TEAM */

function leaveTeam() {
  const confirmed = confirm(
    "ต้องการจำลองการออกจากทีมนี้หรือไม่?\n\nPreview Mode เท่านั้น"
  );
  
  if (!confirmed) return;
  
  showTeamMessage(
    "Preview Mode: ยังไม่มีการออกจากทีมจริง",
    "error"
  );
}

/* EVENTS */

$("edit-team-btn").addEventListener(
  "click",
  editTeam
);

$("leave-team-btn").addEventListener(
  "click",
  leaveTeam
);

$("copy-team-id-btn").addEventListener(
  "click",
  () => copyText(
    teamData.id,
    "คัดลอก Team ID เรียบร้อย"
  )
);

$("copy-team-name-btn").addEventListener(
  "click",
  () => copyText(
    teamData.name,
    "คัดลอกชื่อทีมเรียบร้อย"
  )
);

/* INITIALIZE */

function initializeTeamDetail() {
  renderTeamInformation();
  renderTeamRoster();
  
  console.log(
    "S2N HUB Team Detail - Preview Mode"
  );
}

initializeTeamDetail();