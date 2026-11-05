
/* =========================================
   S2N HUB - TEAM DETAIL
   Supabase Connected Version
========================================= */

"use strict";

const s2nClient = window.supabaseClient;

const $ = (id) => document.getElementById(id);

const teamRoster = $("team-roster");
const messageBox = $("team-detail-message");

let currentUser = null;
let currentTeam = null;
let currentMembers = [];

// ======================================
// MESSAGE
// ======================================

function showTeamMessage(message, type = "success") {
  if (!messageBox) return;

  messageBox.textContent = message;
  messageBox.className = `team-detail-message show ${type}`;
  messageBox.style.display = "block";
}

// ======================================
// FORMAT DATE
// ======================================

function formatCreatedDate(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).toUpperCase();
}

// ======================================
// TEAM INFORMATION
// ======================================

function renderTeamInformation() {
  if (!currentTeam) return;

  const teamName = currentTeam.team_name || "UNKNOWN TEAM";
  const teamTag = currentTeam.team_tag || "-";
  const teamGame = currentTeam.game || "PUBG MOBILE";

  const leader = currentMembers.find(
    member => member.role === "leader"
  );

  const mainPlayers = currentMembers.filter(
    member =>
      member.role === "leader" ||
      member.role === "main"
  );

  const substitutes = currentMembers.filter(
    member => member.role === "substitute"
  );

  $("team-logo").textContent = teamTag;
  $("team-tag").textContent = `TAG // ${teamTag}`;
  $("team-name").textContent = teamName;
  $("team-game").textContent = `${teamGame} COMPETITIVE TEAM`;
  $("team-id").textContent = `TEAM ID: ${currentTeam.id}`;

  $("main-count").textContent = mainPlayers.length;
  $("sub-count").textContent = substitutes.length;

  $("leader-stat").textContent =
    leader?.pubg_name || "UNKNOWN";

  $("info-team-name").textContent = teamName;
  $("info-team-tag").textContent = teamTag;
  $("info-team-game").textContent = teamGame;

  $("info-created-date").textContent =
    formatCreatedDate(currentTeam.created_at);

  $("team-description").textContent =
    currentTeam.description || "No team description.";

  $("roster-total").textContent =
    `${String(currentMembers.length).padStart(2, "0")} PLAYERS`;

  // Button permissions
  const isLeader = currentTeam.leader_id === currentUser.id;

  const editButton = $("edit-team-btn");
  const leaveButton = $("leave-team-btn");

  if (editButton) {
    editButton.disabled = !isLeader;
    editButton.textContent = isLeader
      ? "EDIT TEAM"
      : "LEADER ONLY";
  }

  if (leaveButton) {
    leaveButton.disabled = isLeader;
    leaveButton.textContent = isLeader
      ? "LEADER CANNOT LEAVE"
      : "LEAVE TEAM";
  }
}

// ======================================
// PLAYER CARD
// ======================================

function createPlayerCard(member, index) {
  const card = document.createElement("div");
  card.className = "team-detail-player";

  const isLeader = member.role === "leader";
  const isSubstitute = member.role === "substitute";

  if (isLeader) {
    card.classList.add("leader");
  }

  if (isSubstitute) {
    card.classList.add("reserve");
  }

  const avatar = document.createElement("div");
  avatar.className = "team-detail-player-avatar";
  avatar.textContent = String(index).padStart(2, "0");

  const info = document.createElement("div");
  info.className = "team-detail-player-info";

  const name = document.createElement("strong");
  name.textContent = member.pubg_name || "UNKNOWN PLAYER";

  const roleText = document.createElement("small");

  if (isLeader) {
    roleText.textContent = "TEAM LEADER";
  } else if (isSubstitute) {
    roleText.textContent = "SUBSTITUTE";
  } else {
    roleText.textContent = "MAIN ROSTER";
  }

  info.append(name, roleText);

  const roleBadge = document.createElement("div");
  roleBadge.className = "team-detail-player-role";

  roleBadge.textContent = isSubstitute
    ? "RESERVE"
    : isLeader
      ? "LEADER"
      : "ACTIVE";

  card.append(avatar, info, roleBadge);

  return card;
}

// ======================================
// RENDER ROSTER
// ======================================

function renderTeamRoster() {
  if (!teamRoster) return;

  teamRoster.replaceChildren();

  const sortedMembers = [...currentMembers].sort((a, b) => {
    const positionA = Number(a.position || 0);
    const positionB = Number(b.position || 0);

    return positionA - positionB;
  });

  if (sortedMembers.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "ยังไม่มีรายชื่อสมาชิกในทีม";
    teamRoster.appendChild(empty);
    return;
  }

  sortedMembers.forEach((member, index) => {
    teamRoster.appendChild(
      createPlayerCard(member, index + 1)
    );
  });
}

// ======================================
// COPY
// ======================================

async function copyText(value, successMessage) {
  if (!value) {
    showTeamMessage("ไม่มีข้อมูลสำหรับคัดลอก", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(String(value));

    showTeamMessage(successMessage);
  } catch (error) {
    const input = document.createElement("textarea");

    input.value = String(value);
    input.style.position = "fixed";
    input.style.opacity = "0";

    document.body.appendChild(input);
    input.select();

    const copied = document.execCommand("copy");

    input.remove();

    showTeamMessage(
      copied ? successMessage : "ไม่สามารถคัดลอกได้",
      copied ? "success" : "error"
    );
  }
}

// ======================================
// EDIT TEAM NAME
// ======================================

async function editTeam() {
  if (!currentTeam || !currentUser) return;

  if (currentTeam.leader_id !== currentUser.id) {
    showTeamMessage(
      "เฉพาะหัวหน้าทีมเท่านั้นที่แก้ไขข้อมูลทีมได้",
      "error"
    );
    return;
  }

  const newName = prompt(
    "แก้ไขชื่อทีม",
    currentTeam.team_name || ""
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

  if (cleanName.length > 40) {
    showTeamMessage(
      "ชื่อทีมต้องมีความยาวไม่เกิน 40 ตัวอักษร",
      "error"
    );
    return;
  }

  const { data, error } = await s2nClient
    .from("s2n_teams")
    .update({
      team_name: cleanName
    })
    .eq("id", currentTeam.id)
    .eq("leader_id", currentUser.id)
    .select()
    .single();

  if (error) {
    console.error("S2N Team Update Error:", error);

    showTeamMessage(
      error.message || "ไม่สามารถแก้ไขชื่อทีมได้",
      "error"
    );

    return;
  }

  currentTeam = data;

  renderTeamInformation();

  showTeamMessage("บันทึกชื่อทีมเรียบร้อย");
}

// ======================================
// LEAVE TEAM
// ======================================

async function leaveTeam() {
  if (!currentTeam || !currentUser) return;

  if (currentTeam.leader_id === currentUser.id) {
    showTeamMessage(
      "หัวหน้าทีมไม่สามารถออกจากทีมด้วยคำสั่งนี้ได้",
      "error"
    );
    return;
  }

  const confirmed = confirm(
    `ต้องการออกจากทีม ${currentTeam.team_name} หรือไม่?\n\nการดำเนินการนี้จะลบสมาชิกภาพของคุณในทีม`
  );

  if (!confirmed) return;

  const { error } = await s2nClient
    .from("s2n_team_members")
    .delete()
    .eq("team_id", currentTeam.id)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("S2N Leave Team Error:", error);

    showTeamMessage(
      error.message || "ไม่สามารถออกจากทีมได้",
      "error"
    );

    return;
  }

  alert("ออกจากทีมเรียบร้อย");

  window.location.href = "my-team.html";
}

// ======================================
// LOAD TEAM
// ======================================

async function loadTeamDetail() {
  if (!s2nClient || typeof s2nClient.from !== "function") {
    showTeamMessage(
      "Supabase Client ไม่พร้อมใช้งาน",
      "error"
    );
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const teamId = params.get("id");

  if (!teamId) {
    showTeamMessage(
      "ไม่พบ Team ID ใน URL",
      "error"
    );
    return;
  }

  try {
    const {
      data: { user },
      error: authError
    } = await s2nClient.auth.getUser();

    if (authError) throw authError;

    if (!user) {
      window.location.href = "../login.html";
      return;
    }

    currentUser = user;

    const { data, error } = await s2nClient
      .from("s2n_teams")
      .select(`
        id,
        team_name,
        team_tag,
        game,
        description,
        leader_id,
        created_at,
        s2n_team_members (
          id,
          user_id,
          pubg_name,
          role,
          position
        )
      `)
      .eq("id", teamId)
      .single();

    if (error) throw error;

    if (!data) {
      showTeamMessage("ไม่พบข้อมูลทีม", "error");
      return;
    }

    currentTeam = data;
    currentMembers = data.s2n_team_members || [];

    // Check whether the current user belongs to this team
    const isMember = currentMembers.some(
      member => member.user_id === currentUser.id
    );

    const isLeader = currentTeam.leader_id === currentUser.id;

    if (!isMember && !isLeader) {
      showTeamMessage(
        "คุณไม่มีสิทธิ์เข้าถึงข้อมูลทีมนี้",
        "error"
      );

      $("edit-team-btn").disabled = true;
      $("leave-team-btn").disabled = true;

      return;
    }

    renderTeamInformation();
    renderTeamRoster();

    console.log("S2N HUB: Team detail loaded.");

  } catch (error) {
    console.error("S2N Team Detail Error:", error);

    showTeamMessage(
      error.message || "ไม่สามารถโหลดข้อมูลทีมได้",
      "error"
    );
  }
}

// ======================================
// EVENTS
// ======================================

$("edit-team-btn")?.addEventListener("click", editTeam);

$("leave-team-btn")?.addEventListener("click", leaveTeam);

$("copy-team-id-btn")?.addEventListener("click", () => {
  copyText(
    currentTeam?.id,
    "คัดลอก Team ID เรียบร้อย"
  );
});

$("copy-team-name-btn")?.addEventListener("click", () => {
  copyText(
    currentTeam?.team_name,
    "คัดลอกชื่อทีมเรียบร้อย"
  );
});

// ======================================
// INITIALIZE
// ======================================

loadTeamDetail();
