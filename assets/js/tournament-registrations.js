/* ==========================================
S2N HUB - TOURNAMENT REGISTRATIONS
ADMIN APPROVAL SYSTEM
========================================== */

document.addEventListener("DOMContentLoaded", initTournamentRegistrations);

async function initTournamentRegistrations() {
const supabase = window.supabaseClient;

const tournamentSelect = document.getElementById("tournament-select");
const registrationList = document.getElementById("registration-list");
const registrationCount = document.getElementById("registration-count");
const registrationMessage = document.getElementById("registration-message");

let currentEntries = [];
let isProcessing = false;

if (!supabase) {
showMessage("ไม่พบ Supabase Client");
return;
}

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

try {
const {
data: { user },
error: authError
} = await supabase.auth.getUser();

if (authError || !user) {
  window.location.replace("../index.html");
  return;
}
const { data: profile, error: profileError } = await supabase
  .from("s2n_members")
  .select("role")
  .eq("user_id", user.id)
  .maybeSingle();
if (profileError) throw profileError;
if (!profile || profile.role !== "admin") {
  window.location.replace("../dashboard.html");
  return;
}
await loadTournaments();

} catch (error) {
console.error("Admin Auth Error:", error);
showMessage("ตรวจสอบสิทธิ์ไม่สำเร็จ: " + error.message);
}

// ==========================================
// LOAD TOURNAMENTS
// ==========================================

async function loadTournaments() {
tournamentSelect.innerHTML =
‘กำลังโหลดรายการ…’;

const { data, error } = await supabase
  .from("s2n_tournaments")
  .select("id, tournament_name, created_at")
  .order("created_at", { ascending: false });
if (error) {
  showMessage("โหลด Tournament ไม่สำเร็จ: " + error.message);
  return;
}
if (!data || data.length === 0) {
  tournamentSelect.innerHTML =
    '<option value="">ไม่มีรายการแข่งขัน</option>';
  registrationList.innerHTML =
    '<div class="registration-empty">ยังไม่มี Tournament</div>';
  registrationCount.textContent = "0 รายการ";
  return;
}
tournamentSelect.innerHTML =
  '<option value="">-- เลือกรายการแข่งขัน --</option>';
data.forEach((tournament) => {
  const option = document.createElement("option");
  option.value = tournament.id;
  option.textContent = tournament.tournament_name;
  tournamentSelect.appendChild(option);
});
showMessage("เลือกรายการแข่งขันเพื่อจัดการทีม");

}

tournamentSelect.addEventListener("change", function () {
loadRegistrations(this.value);
});

// ==========================================
// LOAD REGISTRATIONS
// ==========================================

async function loadRegistrations(tournamentId) {
registrationList.innerHTML = "";
registrationCount.textContent = "0 รายการ";
currentEntries = [];

if (!tournamentId) {
  registrationList.innerHTML =
    '<div class="registration-empty">กรุณาเลือกรายการแข่งขัน</div>';
  showMessage("");
  return;
}
showMessage("กำลังโหลดข้อมูลทีม...");
const { data, error } = await supabase
  .from("s2n_tournament_team_details")
  .select(`
    tournament_id,
    tournament_name,
    entry_id,
    entry_status,
    registered_at,
    team_id,
    team_name,
    team_tag,
    member_count,
    members
  `)
  .eq("tournament_id", tournamentId)
  .not("entry_id", "is", null)
  .order("registered_at", { ascending: true });
if (error) {
  console.error("Load Registration Error:", error);
  registrationList.innerHTML =
    '<div class="registration-empty">โหลดข้อมูลไม่สำเร็จ</div>';
  showMessage("เกิดข้อผิดพลาด: " + error.message);
  return;
}
currentEntries = data || [];
registrationCount.textContent =
  `${currentEntries.length} รายการ`;
if (currentEntries.length === 0) {
  registrationList.innerHTML =
    '<div class="registration-empty">ยังไม่มีทีมสมัครแข่งขัน</div>';
  showMessage("ไม่พบรายการสมัคร");
  return;
}
registrationList.innerHTML = currentEntries
  .map((entry, index) => renderRegistration(entry, index))
  .join("");
showMessage(`พบรายการสมัคร ${currentEntries.length} รายการ`);

}

// ==========================================
// REGISTRATION ACTION EVENTS
// ==========================================

registrationList.addEventListener("click", async function (event) {
const actionButton = event.target.closest("[data-action]");

if (!actionButton) return;
if (isProcessing) return;
const action = actionButton.dataset.action;
const entryId = actionButton.dataset.entryId;
if (action === "approve") {
  await updateEntryStatus(
    entryId,
    "approved",
    actionButton
  );
  return;
}
if (action === "reject") {
  await updateEntryStatus(
    entryId,
    "rejected",
    actionButton
  );
  return;
}
if (action === "copy") {
  const index = Number(actionButton.dataset.index);
  const entry = currentEntries[index];
  if (!entry) return;
  try {
    await navigator.clipboard.writeText(
      createAnnouncement(entry)
    );
    const originalText = actionButton.textContent;
    actionButton.textContent = "COPIED";
    setTimeout(() => {
      actionButton.textContent = originalText;
    }, 1500);
  } catch (error) {
    console.error("Clipboard Error:", error);
    showMessage("คัดลอกไม่สำเร็จ กรุณาเปิดผ่าน HTTPS");
  }
}

});

// ==========================================
// UPDATE ENTRY STATUS
// ==========================================

async function updateEntryStatus(entryId, newStatus, button) {
if (!entryId) {
showMessage("ไม่พบ Entry ID");
return;
}

const actionText =
  newStatus === "approved"
    ? "อนุมัติทีมนี้"
    : "ปฏิเสธทีมนี้";
if (!confirm(`ยืนยัน${actionText}?`)) {
  return;
}
isProcessing = true;
const originalText = button.textContent;
button.disabled = true;
button.textContent = "PROCESSING...";
try {
  const { data, error } = await supabase
    .from("s2n_tournament_entries")
    .update({ status: newStatus })
    .eq("id", entryId)
    .select("id, status")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error("ไม่พบรายการ หรือไม่มีสิทธิ์แก้ไข");
  }
  showMessage(
    newStatus === "approved"
      ? "อนุมัติทีมเรียบร้อย"
      : "ปฏิเสธทีมเรียบร้อย"
  );
  await loadRegistrations(tournamentSelect.value);
} catch (error) {
  console.error("Update Status Error:", error);
  showMessage("อัปเดตสถานะไม่สำเร็จ: " + error.message);
  button.disabled = false;
  button.textContent = originalText;
} finally {
  isProcessing = false;
}

}

// ==========================================
// GET TEAM ROSTER
// ==========================================

function getRoster(entry) {
const members = Array.isArray(entry.members)
? […entry.members]
: [];

members.sort((a, b) => {
  return Number(a.position ?? 99) -
    Number(b.position ?? 99);
});
const mainPlayers = members.filter((member) => {
  return (
    member.role === "leader" ||
    member.role === "main"
  );
});
const substitute = members.find((member) => {
  return member.role === "substitute";
});
return {
  mainPlayers,
  substitute
};

}

// ==========================================
// RENDER REGISTRATION CARD
// ==========================================

function renderRegistration(entry, index) {
const { mainPlayers, substitute } = getRoster(entry);

const status = entry.entry_status || "pending";
const statusLabels = {
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED"
};
const playerHTML = [0, 1, 2, 3]
  .map((i) => {
    const player = mainPlayers[i];
    return `
      <div class="registration-player">
        <span class="registration-player-label">
          P${i + 1}
        </span>
        <span>
          ${escapeHTML(player?.pubg_name || "ว่าง")}
        </span>
      </div>
    `;
  })
  .join("");
const substituteHTML = substitute
  ? `
    <div class="registration-player">
      <span class="registration-player-label">
        SUB
      </span>
      <span>
        ${escapeHTML(substitute.pubg_name || "ว่าง")}
      </span>
    </div>
  `
  : "";
let actionHTML = "";
if (status === "pending") {
  actionHTML = `
    <div class="registration-actions">
      <button
        type="button"
        class="registration-approve-btn"
        data-action="approve"
        data-entry-id="${escapeHTML(entry.entry_id)}"
      >
        APPROVE
      </button>
      <button
        type="button"
        class="registration-reject-btn"
        data-action="reject"
        data-entry-id="${escapeHTML(entry.entry_id)}"
      >
        REJECT
      </button>
    </div>
  `;
}
return `
  <article class="registration-card">
    <div class="registration-card-header">
      <div>
        <div class="registration-team-name">
          ${escapeHTML(entry.team_name || "ไม่ระบุทีม")}
        </div>
        <div class="registration-team-tag">
          TAG : ${escapeHTML(entry.team_tag || "-")}
        </div>
      </div>
      <span class="registration-status status-${escapeHTML(status)}">
        ${escapeHTML(statusLabels[status] || status.toUpperCase())}
      </span>
    </div>
    <div class="registration-roster">
      ${playerHTML}
      ${substituteHTML}
    </div>
    <div class="registration-date">
      Date created : ${escapeHTML(formatDate(entry.registered_at))}
    </div>
    ${actionHTML}
    <button
      type="button"
      class="copy-registration-btn"
      data-action="copy"
      data-index="${index}"
    >
      COPY TEAM INFO
    </button>
  </article>
`;

}

// ==========================================
// CREATE ANNOUNCEMENT
// ==========================================

function createAnnouncement(entry) {
const { mainPlayers, substitute } = getRoster(entry);

const lines = [
  `Tournament ${entry.tournament_name || "-"}`,
  "",
  `TEAM : ${entry.team_name || "-"}`,
  `TAG : ${entry.team_tag || "-"}`
];
for (let i = 0; i < 4; i++) {
  const player = mainPlayers[i];
  lines.push(
    `P${i + 1} : ${player?.pubg_name || "ว่าง"}`
  );
}
if (substitute) {
  lines.push(
    `SUB : ${substitute.pubg_name || "ว่าง"}`
  );
}
lines.push(
  "",
  `Date created ${formatDate(entry.registered_at)}`
);
return lines.join("\n");

}

// ==========================================
// DATE FORMAT
// ==========================================

function formatDate(value) {
if (!value) return "-";

const date = new Date(value);
if (Number.isNaN(date.getTime())) {
  return "-";
}
const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h12"
}).formatToParts(date);
const get = (type) => {
  return parts.find((part) => part.type === type)?.value || "";
};
return (
  `${get("day")}/${get("month")}/${get("year")} : ` +
  `${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()}`
);

}

// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHTML(value) {
return String(value ?? "-").replace(/[&<>"’]/g, (char) => {
const entities = {
"&": "&",
"<": "<",
">": ">",
‘"’: """,
"’": "'"
};

  return entities[char];
});

}

// ==========================================
// MESSAGE
// ==========================================

function showMessage(message) {
registrationMessage.textContent = message;
}
}