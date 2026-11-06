// S2N HUB - ALL TEAMS DIRECTORY V1.0

const s2nClient = window.supabaseClient;

const teamList = document.getElementById("all-team-list");
const teamSearch = document.getElementById("all-team-search");
const teamMessage = document.getElementById("all-team-message");

let allTeams = [];

// ======================================
// MESSAGE
// ======================================

function showMessage(message) {
  teamMessage.textContent = message;
  teamMessage.classList.remove("hidden");
}

function hideMessage() {
  teamMessage.classList.add("hidden");
}

// ======================================
// TEAM CARD
// ======================================

function createTeamCard(team) {
  const card = document.createElement("a");
  
  card.className = "all-team-card";
  
  card.href =
    `team-detail.html?id=${encodeURIComponent(team.id)}`;
  
  // Team identity
  const identity = document.createElement("div");
  identity.className = "all-team-identity";
  
  const logo = document.createElement("div");
  logo.className = "all-team-logo";
  logo.textContent = team.team_tag || "S2N";
  
  const title = document.createElement("div");
  title.className = "all-team-title";
  
  const name = document.createElement("h3");
  name.textContent = team.team_name || "UNKNOWN TEAM";
  
  const tag = document.createElement("span");
  tag.className = "all-team-tag";
  tag.textContent = `TAG // ${team.team_tag || "-"}`;
  
  title.append(name, tag);
  identity.append(logo, title);
  
  // Team information
  const information = document.createElement("div");
  information.className = "all-team-information";
  
  const game = document.createElement("span");
  game.textContent = team.game || "PUBG MOBILE";
  
  const memberCount = document.createElement("span");
  const members = team.s2n_team_members || [];
  
  memberCount.textContent =
    `${members.length} PLAYERS`;
  
  information.append(game, memberCount);
  
  // Description
  const description = document.createElement("p");
  description.className = "all-team-description";
  
  description.textContent =
    team.description || "No team description available.";
  
  // Footer
  const footer = document.createElement("div");
  footer.className = "all-team-footer";
  
  const created = document.createElement("span");
  
  created.textContent = team.created_at ?
    new Date(team.created_at).toLocaleDateString("th-TH") :
    "UNKNOWN DATE";
  
  const detail = document.createElement("span");
  detail.className = "all-team-detail";
  detail.textContent = "VIEW TEAM →";
  
  footer.append(created, detail);
  
  card.append(
    identity,
    information,
    description,
    footer
  );
  
  return card;
}

// ======================================
// RENDER
// ======================================

function renderAllTeams() {
  const keyword = teamSearch.value.trim().toLowerCase();
  
  const filteredTeams = allTeams.filter(team => {
    const name = (team.team_name || "").toLowerCase();
    const tag = (team.team_tag || "").toLowerCase();
    const game = (team.game || "").toLowerCase();
    
    return (
      name.includes(keyword) ||
      tag.includes(keyword) ||
      game.includes(keyword)
    );
  });
  
  teamList.innerHTML = "";
  
  if (filteredTeams.length === 0) {
    showMessage(
      allTeams.length === 0 ?
      "ยังไม่มีทีมในระบบ" :
      "ไม่พบทีมที่ตรงกับคำค้นหา"
    );
    
    return;
  }
  
  hideMessage();
  
  filteredTeams.forEach(team => {
    teamList.appendChild(createTeamCard(team));
  });
}

// ======================================
// LOAD ALL TEAMS
// ======================================

async function loadAllTeams() {
  if (!s2nClient) {
    showMessage("Supabase Client ไม่พร้อมใช้งาน");
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
    
    const {
      data,
      error
    } = await s2nClient
      .from("s2n_teams")
      .select(`
        id,
        team_name,
        team_tag,
        game,
        description,
        created_at,
        s2n_team_members (
          id
        )
      `)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    
    allTeams = data || [];
    
    const totalPlayers = allTeams.reduce(
      (total, team) =>
      total + (team.s2n_team_members || []).length,
      0
    );
    
    document.getElementById("all-team-count")
      .textContent = allTeams.length;
    
    document.getElementById("all-player-count")
      .textContent = totalPlayers;
    
    renderAllTeams();
    
    console.log("S2N HUB: All Teams Loaded", allTeams);
    
  } catch (error) {
    console.error("S2N All Teams Error:", error);
    
    showMessage(
      error.message || "ไม่สามารถโหลดข้อมูลทีมได้"
    );
  }
}

// ======================================
// SEARCH
// ======================================

teamSearch.addEventListener(
  "input",
  renderAllTeams
);

// ======================================
// START
// ======================================

loadAllTeams();

