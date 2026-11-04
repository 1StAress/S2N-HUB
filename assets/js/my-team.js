// S2N HUB - My Teams V1.2
// Supabase Connected + Debug

const s2nClient = window.supabaseClient;

const teamList = document.getElementById("my-team-list");
const teamSearch = document.getElementById("team-search");
const emptyState = document.getElementById("my-team-empty");

let myTeams = [];

// ======================================
// INITIALIZATION
// ======================================

console.log("S2N HUB: My Teams V1.2 initialized.");

console.log("S2N CLIENT:", s2nClient);
console.log("S2N AUTH TYPE:", typeof s2nClient?.auth);
console.log("S2N FROM TYPE:", typeof s2nClient?.from);

if (!s2nClient || typeof s2nClient.from !== "function") {
  console.error("S2N DEBUG: Invalid Supabase Client.");
}

if (!teamList || !teamSearch || !emptyState) {
  console.error("S2N DEBUG: My Teams HTML elements missing.");
}

// ======================================
// MESSAGE
// ======================================

function showEmptyState(message = "ไม่พบข้อมูลทีม") {
  if (!emptyState) return;

  emptyState.textContent = message;
  emptyState.classList.remove("hidden");
}

// ======================================
// PLAYER ROW
// ======================================

function createPlayerRow(name, role, reserve = false) {
  const row = document.createElement("div");
  row.className = "my-team-player";

  const playerName = document.createElement("span");
  playerName.className = "my-team-player-name";
  playerName.textContent = name || "UNKNOWN";

  const playerRole = document.createElement("span");
  playerRole.className =
    `my-team-player-role${reserve ? " reserve" : ""}`;

  playerRole.textContent = role;

  row.append(playerName, playerRole);

  return row;
}

// ======================================
// TEAM CARD
// ======================================

function createTeamCard(team) {
  const card = document.createElement("article");
  card.className = "my-team-card";

  // Header
  const top = document.createElement("div");
  top.className = "my-team-card-top";

  const logo = document.createElement("div");
  logo.className = "my-team-logo";
  logo.textContent = team.team_tag || "S2N";

  const title = document.createElement("div");
  title.className = "my-team-title";

  const teamName = document.createElement("h3");
  teamName.textContent = team.team_name || "UNKNOWN TEAM";

  const game = document.createElement("p");
  game.textContent = team.game || "PUBG MOBILE";

  const tag = document.createElement("span");
  tag.className = "my-team-tag";
  tag.textContent = `TAG // ${team.team_tag || "-"}`;

  title.append(teamName, game, tag);
  top.append(logo, title);

  // Roster
  const roster = document.createElement("div");
  roster.className = "my-team-roster";

  const heading = document.createElement("div");
  heading.className = "my-team-roster-heading";
  heading.textContent = "MAIN ROSTER";

  roster.appendChild(heading);

  const members = team.members || [];

  members
    .filter(member => member.role !== "substitute")
    .sort((a, b) => a.position - b.position)
    .forEach(member => {
      const role =
        member.role === "leader"
          ? "LEADER"
          : "MAIN";

      roster.appendChild(
        createPlayerRow(member.pubg_name, role)
      );
    });

  // Substitute
  const substitute = members.find(
    member => member.role === "substitute"
  );

  if (substitute) {
    const subHeading = document.createElement("div");
    subHeading.className = "my-team-roster-heading";
    subHeading.textContent = "SUBSTITUTE";

    roster.appendChild(subHeading);

    roster.appendChild(
      createPlayerRow(
        substitute.pubg_name,
        "RESERVE",
        true
      )
    );
  }

  // Footer
  const footer = document.createElement("div");
  footer.className = "my-team-card-footer";

  const teamId = document.createElement("span");
  teamId.textContent = team.id;

  const detailLink = document.createElement("a");
  detailLink.className = "my-team-detail-link";

  detailLink.href =
    `team-detail.html?id=${encodeURIComponent(team.id)}`;

  detailLink.textContent = "VIEW DETAILS →";

  footer.append(teamId, detailLink);

  card.append(top, roster, footer);

  return card;
}

// ======================================
// OVERVIEW
// ======================================

function updateOverview(teams) {
  const teamCount = document.getElementById("my-team-count");
  const mainCount = document.getElementById("main-roster-count");
  const subCount = document.getElementById("sub-roster-count");

  if (teamCount) {
    teamCount.textContent = teams.length;
  }

  if (mainCount) {
    mainCount.textContent = teams.reduce(
      (total, team) => {
        return total + (team.members || []).filter(
          member =>
            member.role === "leader" ||
            member.role === "main"
        ).length;
      },
      0
    );
  }

  if (subCount) {
    subCount.textContent = teams.reduce(
      (total, team) => {
        return total + (team.members || []).filter(
          member => member.role === "substitute"
        ).length;
      },
      0
    );
  }
}

// ======================================
// RENDER
// ======================================

function renderMyTeams() {
  if (!teamList || !teamSearch || !emptyState) {
    return;
  }

  const keyword = teamSearch.value
    .trim()
    .toLowerCase();

  const filteredTeams = myTeams.filter(team => {
    return (
      (team.team_name || "").toLowerCase().includes(keyword) ||
      (team.team_tag || "").toLowerCase().includes(keyword) ||
      (team.leader_name || "").toLowerCase().includes(keyword)
    );
  });

  teamList.innerHTML = "";

  if (filteredTeams.length === 0) {
    showEmptyState(
      myTeams.length === 0
        ? "ยังไม่มีทีมของคุณ"
        : "ไม่พบทีมที่ตรงกับคำค้นหา"
    );

    return;
  }

  emptyState.classList.add("hidden");

  filteredTeams.forEach(team => {
    teamList.appendChild(createTeamCard(team));
  });
}

// ======================================
// LOAD MY TEAMS
// ======================================

async function loadMyTeams() {
  console.log("S2N DEBUG: Loading My Teams...");

  if (!s2nClient || typeof s2nClient.from !== "function") {
    showEmptyState("Supabase Client ไม่พร้อมใช้งาน");
    return;
  }

  try {
    // Authentication
    console.log("S2N DEBUG: Checking user session...");

    const {
      data: { user },
      error: authError
    } = await s2nClient.auth.getUser();

    if (authError) {
      console.error("S2N DEBUG: Auth error:", authError);
      throw authError;
    }

    if (!user) {
      console.warn("S2N DEBUG: User not logged in.");

      window.location.href = "../login.html";
      return;
    }

    console.log("S2N DEBUG: User authenticated:", user.id);

    // Query Teams
    console.log("S2N DEBUG: Querying s2n_teams...");

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
      .eq("leader_id", user.id)
      .order("created_at", { ascending: false });

    console.log("S2N DEBUG: Teams query result:", {
      data,
      error
    });

    if (error) {
      throw error;
    }

    // Normalize Data
    myTeams = (data || []).map(team => {
      const members = team.s2n_team_members || [];

      const leader = members.find(
        member => member.role === "leader"
      );

      return {
        ...team,
        members,
        leader_name: leader
          ? leader.pubg_name
          : "UNKNOWN"
      };
    });

    console.log(
      "S2N DEBUG: Loaded teams:",
      myTeams.length
    );

    // Update UI
    updateOverview(myTeams);
    renderMyTeams();

  } catch (error) {
    console.error("S2N DEBUG: Load My Teams error:", error);

    showEmptyState(
      error.message || "ไม่สามารถโหลดข้อมูลทีมได้"
    );
  }
}

// ======================================
// SEARCH
// ======================================

if (teamSearch) {
  teamSearch.addEventListener(
    "input",
    renderMyTeams
  );
}

// ======================================
// START
// ======================================

loadMyTeams();