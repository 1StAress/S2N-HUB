document.addEventListener(“DOMContentLoaded”, async () => {
“use strict”;

const supabase = window.supabaseClient;
if (!supabase) {
    console.error("Supabase client not found.");
    return;
}
const $ = (selector) => document.querySelector(selector);
const tournamentSelect = $("#tournament-select");
const memberSelect = $("#member-select");
const slotNumberInput = $("#slot-number");
const slotNameInput = $("#slot-name");
const assignForm = $("#assign-player-form");
const assignButton = $("#assign-player-btn");
const messageBox = $("#slot-message");
const rosterContainer = $("#slot-roster-container");
const playerCount = $("#assigned-player-count");
let currentUser = null;
let currentMember = null;
let tournaments = [];
let members = [];
let currentTournament = null;
function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function showMessage(message, type = "info") {
    messageBox.textContent = message;
    messageBox.className = "slot-message " + type;
}
function setLoading(button, loading, text) {
    button.disabled = loading;
    button.textContent = loading ? "กำลังดำเนินการ..." : text;
}
async function checkAdmin() {
    const {
        data: { user },
        error
    } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.replace("../login.html");
        return false;
    }
    currentUser = user;
    const {
        data: member,
        error: memberError
    } = await supabase
        .from("s2n_members")
        .select("id, user_id, username, role")
        .eq("user_id", user.id)
        .maybeSingle();
    if (memberError || !member) {
        window.location.replace("../dashboard.html");
        return false;
    }
    currentMember = member;
    const role = String(member.role || "")
        .trim()
        .toLowerCase();
    if (role !== "admin") {
        window.location.replace("../dashboard.html");
        return false;
    }
    return true;
}
async function loadTournaments() {
    const {
        data,
        error
    } = await supabase
        .from("s2n_tournaments")
        .select("id, tournament_name, match_type, status, max_teams")
        .order("created_at", { ascending: false });
    if (error) {
        showMessage("ไม่สามารถโหลด Tournament ได้", "error");
        console.error(error);
        return;
    }
    tournaments = data || [];
    tournamentSelect.innerHTML =
        '<option value="">เลือก Tournament</option>';
    tournaments.forEach((tournament) => {
        const option = document.createElement("option");
        option.value = tournament.id;
        option.textContent = tournament.tournament_name;
        tournamentSelect.appendChild(option);
    });
    if (tournaments.length === 0) {
        tournamentSelect.innerHTML =
            '<option value="">ยังไม่มี Tournament</option>';
    }
}
async function loadMembers() {
    const {
        data,
        error
    } = await supabase
        .from("s2n_members")
        .select("user_id, username, display_name, nickname, pubg_name, pubg_uid, role")
        .order("username", { ascending: true });
    if (error) {
        showMessage("ไม่สามารถโหลดสมาชิกได้", "error");
        console.error(error);
        return;
    }
    members = data || [];
    memberSelect.innerHTML =
        '<option value="">เลือกสมาชิก</option>';
    members.forEach((member) => {
        const option = document.createElement("option");
        option.value = member.user_id;
        const gameName = member.pubg_name || member.username;
        const uid = member.pubg_uid || "ไม่มี UID";
        option.textContent =
            gameName + " | " + member.username + " | " + uid;
        memberSelect.appendChild(option);
    });
}
function updateTournamentInfo() {
    const tournamentID = tournamentSelect.value;
    currentTournament = tournaments.find(
        (item) => item.id === tournamentID
    ) || null;
    if (!currentTournament) {
        $("#tournament-match-type").textContent = "---";
        $("#tournament-status").textContent = "---";
        $("#tournament-max-slots").textContent = "---";
        rosterContainer.innerHTML = `
            <div class="slot-empty-state">
                <span class="material-symbols-rounded">groups</span>
                <p>เลือก Tournament เพื่อดูรายชื่อผู้เล่น</p>
            </div>
        `;
        playerCount.textContent = "0";
        return;
    }
    $("#tournament-match-type").textContent =
        String(currentTournament.match_type || "team").toUpperCase();
    $("#tournament-status").textContent =
        String(currentTournament.status || "upcoming").toUpperCase();
    $("#tournament-max-slots").textContent =
        currentTournament.max_teams || 0;
    slotNumberInput.max = currentTournament.max_teams || 100;
    loadSlotRoster();
}
async function loadSlotRoster() {
    if (!currentTournament) return;
    rosterContainer.innerHTML = `
        <div class="slot-empty-state">
            <span class="material-symbols-rounded">sync</span>
            <p>กำลังโหลดรายชื่อผู้เล่น...</p>
        </div>
    `;
    const {
        data,
        error
    } = await supabase
        .from("s2n_tournament_player_slots")
        .select("tournament_id, tournament_name, slot_number, slot_name, user_id, username, display_name, nickname, pubg_name, pubg_uid, entry_status, assigned_at")
        .eq("tournament_id", currentTournament.id)
        .order("slot_number", { ascending: true });
    if (error) {
        console.error(error);
        rosterContainer.innerHTML = `
            <div class="slot-empty-state">
                <p>โหลดรายชื่อไม่สำเร็จ</p>
            </div>
        `;
        showMessage("โหลดข้อมูลสล็อตไม่สำเร็จ", "error");
        return;
    }
    renderSlotRoster(data || []);
}
function renderSlotRoster(players) {
    playerCount.textContent = String(players.length);
    if (players.length === 0) {
        rosterContainer.innerHTML = `
            <div class="slot-empty-state">
                <span class="material-symbols-rounded">groups</span>
                <p>ยังไม่มีผู้เล่นใน Tournament นี้</p>
            </div>
        `;
        return;
    }
    const grouped = {};
    players.forEach((player) => {
        const key = String(player.slot_number);
        if (!grouped[key]) {
            grouped[key] = {
                slot_number: player.slot_number,
                slot_name: player.slot_name,
                players: []
            };
        }
        grouped[key].players.push(player);
    });
    rosterContainer.innerHTML = Object.values(grouped)
        .map((slot) => {
            const playerCards = slot.players
                .map((player) => {
                    const pubgName =
                        player.pubg_name || player.username || "Unknown";
                    const username =
                        player.username || "Unknown";
                    const uid =
                        player.pubg_uid || "ไม่มี UID";
                    return `
                        <div class="slot-player-card">
                            <div class="slot-player-avatar">
                                ${escapeHTML(pubgName.substring(0, 2).toUpperCase())}
                            </div>
                            <div class="slot-player-info">
                                <strong>${escapeHTML(pubgName)}</strong>
                                <span>${escapeHTML(username)}</span>
                                <small>UID: ${escapeHTML(uid)}</small>
                            </div>
                            <span class="slot-player-status">
                                ${escapeHTML(String(player.entry_status || "approved").toUpperCase())}
                            </span>
                        </div>
                    `;
                })
                .join("");
            return `
                <div class="slot-group">
                    <div class="slot-group-header">
                        <div class="slot-group-title">
                            <span class="material-symbols-rounded">groups</span>
                            <div>
                                <strong>${escapeHTML(slot.slot_name)}</strong>
                                <small>SLOT ${escapeHTML(slot.slot_number)}</small>
                            </div>
                        </div>
                        <span class="slot-group-count">
                            ${slot.players.length} PLAYER${slot.players.length === 1 ? "" : "S"}
                        </span>
                    </div>
                    <div class="slot-group-players">
                        ${playerCards}
                    </div>
                </div>
            `;
        })
        .join("");
}
async function assignPlayer(event) {
    event.preventDefault();
    if (!currentTournament) {
        showMessage("กรุณาเลือก Tournament ก่อน", "error");
        return;
    }
    const userID = memberSelect.value;
    const slotNumber = Number(slotNumberInput.value);
    const slotName = slotNameInput.value.trim();
    if (!userID) {
        showMessage("กรุณาเลือกสมาชิก", "error");
        return;
    }
    if (!Number.isInteger(slotNumber) || slotNumber < 1) {
        showMessage("Slot Number ไม่ถูกต้อง", "error");
        return;
    }
    if (slotNumber > Number(currentTournament.max_teams || 100)) {
        showMessage("Slot Number เกินจำนวนสล็อตของ Tournament", "error");
        return;
    }
    if (!slotName) {
        showMessage("กรุณาระบุ Slot Name", "error");
        return;
    }
    setLoading(
        assignButton,
        true,
        "จัดผู้เล่นเข้าสล็อต"
    );
    const {
        data,
        error
    } = await supabase.rpc(
        "s2n_admin_assign_player",
        {
            p_tournament_id: currentTournament.id,
            p_user_id: userID,
            p_slot_number: slotNumber,
            p_slot_name: slotName
        }
    );
    setLoading(
        assignButton,
        false,
        "จัดผู้เล่นเข้าสล็อต"
    );
    if (error) {
        console.error(error);
        showMessage(error.message || "จัดสล็อตไม่สำเร็จ", "error");
        return;
    }
    showMessage("จัดผู้เล่นเข้าสล็อตสำเร็จ", "success");
    await loadSlotRoster();
}
function clearForm() {
    memberSelect.value = "";
    slotNumberInput.value = "1";
    slotNameInput.value = "Slot 1";
    showMessage("");
}
tournamentSelect.addEventListener(
    "change",
    updateTournamentInfo
);
assignForm.addEventListener(
    "submit",
    assignPlayer
);
$("#refresh-btn").addEventListener("click", async () => {
    await loadTournaments();
    await loadMembers();
    updateTournamentInfo();
    showMessage("รีเฟรชข้อมูลสำเร็จ", "success");
});
$("#clear-form-btn").addEventListener(
    "click",
    clearForm
);
$("#logout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.replace("../login.html");
});
const isAdmin = await checkAdmin();
if (!isAdmin) return;
await loadTournaments();
await loadMembers();

});