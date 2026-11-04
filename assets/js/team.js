// S2N HUB - Team Creation
// Preview Mode only

const teamForm = document.getElementById("create-team-form");
const teamMessage = document.getElementById("team-message");

function showTeamMessage(message, type) {
  teamMessage.textContent = message;
  teamMessage.className = `team-message show ${type}`;
}

function normalizePlayerName(name) {
  return name.trim().toLowerCase();
}

teamForm.addEventListener("submit", function(event) {
  event.preventDefault();
  
  const teamName = document
    .getElementById("team-name")
    .value.trim();
  
  const teamTag = document
    .getElementById("team-tag")
    .value.trim()
    .toUpperCase();
  
  const leader = document
    .getElementById("leader-name")
    .value.trim();
  
  const player1 = document
    .getElementById("player-1")
    .value.trim();
  
  const player2 = document
    .getElementById("player-2")
    .value.trim();
  
  const player3 = document
    .getElementById("player-3")
    .value.trim();
  
  const substitute = document
    .getElementById("substitute")
    .value.trim();
  
  const confirmTeam = document.getElementById("confirm-team");
  
  if (!teamName || !teamTag || !leader || !player1 || !player2 || !player3) {
    showTeamMessage(
      "กรุณากรอกชื่อทีม Tag และรายชื่อผู้เล่นหลักให้ครบ",
      "error"
    );
    return;
  }
  
  if (!/^[A-Z0-9]{2,6}$/.test(teamTag)) {
    showTeamMessage(
      "Team Tag ต้องเป็นภาษาอังกฤษตัวพิมพ์ใหญ่หรือตัวเลข 2-6 ตัว",
      "error"
    );
    return;
  }
  
  const players = [
    leader,
    player1,
    player2,
    player3
  ];
  
  if (substitute) {
    players.push(substitute);
  }
  
  const normalizedPlayers = players.map(normalizePlayerName);
  
  const hasDuplicatePlayers =
    new Set(normalizedPlayers).size !== normalizedPlayers.length;
  
  if (hasDuplicatePlayers) {
    showTeamMessage(
      "พบ PUBG Name ซ้ำกัน กรุณาตรวจสอบรายชื่อผู้เล่น",
      "error"
    );
    return;
  }
  
  if (!confirmTeam.checked) {
    showTeamMessage(
      "กรุณายืนยันข้อมูลทีมก่อนดำเนินการ",
      "error"
    );
    return;
  }
  
  const previewTeam = {
    teamName,
    teamTag,
    game: "PUBG MOBILE",
    leader,
    mainPlayers: [
      player1,
      player2,
      player3
    ],
    substitute: substitute || null,
    description: document
      .getElementById("team-description")
      .value.trim()
  };
  
  console.log("S2N TEAM PREVIEW:", previewTeam);
  
  showTeamMessage(
    "ตรวจสอบข้อมูลทีมเรียบร้อย! ขณะนี้ยังเป็น Preview Mode ข้อมูลยังไม่ได้บันทึกลงฐานข้อมูลจริง",
    "success"
  );
});