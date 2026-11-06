/* ==========================================
S2N HUB | TOURNAMENT CONTROL
Admin Slot Management
========================================== */

(() => {
"use strict";

const supabase = window.supabaseClient || window.supabase;
const $ = (selector) => document.querySelector(selector);
const tournamentSelect = $("#control-tournament-select");
const tournamentSummary = $("#control-tournament-summary");
const slotGrid = $("#control-slot-grid");
const slotCount = $("#control-slot-count");
const refreshBtn = $("#control-refresh-btn");
const playerModal = $("#control-player-modal");
const modalTitle = $("#control-modal-title");
const modalSubtitle = $("#control-modal-subtitle");
const currentPlayerList = $("#control-current-player-list");
const memberSearch = $("#control-member-search");
const memberList = $("#control-member-list");
const toast = $("#control-toast");
let currentUser = null;
let currentTournament = null;
let currentSlotNumber = null;
let currentSlotName = null;
let tournaments = [];
let members = [];
let assignments = [];
let slotFilter = "all";
let loading = false;
const escapeHTML = (value) => {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};
const showToast = (message, type = "success") => {
    if (!toast) return;
    toast.textContent = message;
    toast.className = `control-toast show ${type}`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => {
        toast.className = "control-toast";
    }, 3000);
};
const getMatchType = (tournament) => {
    const type = String(tournament?.match_type || "solo").toLowerCase();
    if (type === "duo") return "DUO";
    if (type === "squad") return "SQUAD";
    return "SOLO";
};
const getPlayersPerSlot = (tournament) => {
    const type = getMatchType(tournament);
    if (type === "DUO") return 2;
    if (type === "SQUAD") return 4;
    return 1;
};
const getSlotTotal = (tournament) => {
    return Math.max(
        1,
        Number(tournament?.random_slots || tournament?.max_teams || 1)
    );
};
const getMemberDisplayName = (member) => {
    return member?.display_name ||
        member?.nickname ||
        member?.username ||
        member?.pubg_name ||
        "Unknown Player";
};
const getMemberGameName = (member) => {
    return member?.pubg_name || "ยังไม่ได้ตั้งชื่อในเกม";
};
const getSlotAssignments = (slotNumber) => {
    return assignments.filter((item) =>
        Number(item.slot_number) === Number(slotNumber)
    );
};
const getSlotCapacity = () => {
    return getPlayersPerSlot(currentTournament);
};
const getSlotName = (slotNumber) => {
    return `Slot ${String(slotNumber).padStart(2, "0")}`;
};
const isSlotFull = (slotNumber) => {
    return getSlotAssignments(slotNumber).length >= getSlotCapacity();
};
const renderTournamentSummary = () => {
    if (!currentTournament) {
        tournamentSummary.innerHTML = `
            <div class="control-summary-empty">
                กรุณาเลือกรายการแข่งขัน
            </div>
        `;
        return;
    }
    const matchType = getMatchType(currentTournament);
    const totalSlots = getSlotTotal(currentTournament);
    const totalPlayers = assignments.length;
    tournamentSummary.innerHTML = `
        <div class="control-summary-grid">
            <div class="control-summary-item">
                <span>TOURNAMENT</span>
                <strong>
                    ${escapeHTML(currentTournament.tournament_name)}
                </strong>
            </div>
            <div class="control-summary-item">
                <span>GAME</span>
                <strong>PUBG MOBILE</strong>
            </div>
            <div class="control-summary-item">
                <span>FORMAT</span>
                <strong>${matchType}</strong>
            </div>
            <div class="control-summary-item">
                <span>TOTAL SLOTS</span>
                <strong>${totalSlots}</strong>
            </div>
            <div class="control-summary-item">
                <span>ASSIGNED PLAYERS</span>
                <strong>${totalPlayers}</strong>
            </div>
        </div>
    `;
};
const renderSlots = () => {
    if (!currentTournament) {
        slotGrid.innerHTML = `
            <div class="control-empty-state">
                <span class="material-symbols-rounded">sports_esports</span>
                <p>เลือกรายการแข่งขันเพื่อแสดงสล็อต</p>
            </div>
        `;
        slotCount.textContent = "0 SLOTS";
        return;
    }
    const totalSlots = getSlotTotal(currentTournament);
    const capacity = getSlotCapacity();
    slotCount.textContent = `${totalSlots} SLOTS`;
    let html = "";
    for (let slotNumber = 1; slotNumber <= totalSlots; slotNumber++) {
        const players = getSlotAssignments(slotNumber);
        const full = players.length >= capacity;
        if (slotFilter === "available" && full) continue;
        if (slotFilter === "full" && !full) continue;
        const playerNames = players.length
            ? players.map((player) => `
                <div class="control-slot-player">
                    <span class="material-symbols-rounded">person</span>
                    <span>${escapeHTML(
                        player.pubg_name ||
                        player.display_name ||
                        player.username ||
                        "Unknown Player"
                    )}</span>
                </div>
            `).join("")
            : `
                <div class="control-slot-empty">
                    ยังไม่มีผู้เล่น
                </div>
            `;
        html += `
            <article class="control-slot-card ${full ? "full" : "available"}">
                <div class="control-slot-card-header">
                    <div>
                        <span class="control-slot-label">YOUR SLOT</span>
                        <h3>${escapeHTML(getSlotName(slotNumber))}</h3>
                    </div>
                    <span class="control-slot-status">
                        ${players.length}/${capacity}
                    </span>
                </div>
                <div class="control-slot-player-list">
                    ${playerNames}
                </div>
                <button
                    type="button"
                    class="control-slot-manage-btn"
                    data-slot-number="${slotNumber}"
                    data-slot-name="${escapeHTML(getSlotName(slotNumber))}"
                >
                    <span class="material-symbols-rounded">
                        manage_accounts
                    </span>
                    จัดการสล็อต
                </button>
            </article>
        `;
    }
    if (!html) {
        html = `
            <div class="control-empty-state">
                <span class="material-symbols-rounded">filter_list_off</span>
                <p>ไม่พบสล็อตตามตัวกรอง</p>
            </div>
        `;
    }
    slotGrid.innerHTML = html;
};
const loadAssignments = async () => {
    if (!currentTournament) {
        assignments = [];
        return;
    }
    const { data, error } = await supabase
        .from("s2n_tournament_player_slots")
        .select("*")
        .eq("tournament_id", currentTournament.id)
        .order("slot_number", { ascending: true });
    if (error) {
        console.error("Load assignments error:", error);
        showToast("โหลดข้อมูลสล็อตไม่สำเร็จ", "error");
        assignments = [];
        return;
    }
    assignments = data || [];
};
const loadMembers = async () => {
    const { data, error } = await supabase
        .from("s2n_members")
        .select("id,user_id,username,display_name,nickname,pubg_name,pubg_uid,role")
        .order("username", { ascending: true });
    if (error) {
        console.error("Load members error:", error);
        showToast("โหลดรายชื่อสมาชิกไม่สำเร็จ", "error");
        members = [];
        return;
    }
    members = data || [];
};
const loadTournaments = async () => {
    tournamentSelect.innerHTML = `
        <option value="">กำลังโหลดรายการ...</option>
    `;
    const { data, error } = await supabase
        .from("s2n_tournaments")
        .select("*")
        .order("created_at", { ascending: false });
    if (error) {
        console.error("Load tournaments error:", error);
        tournamentSelect.innerHTML = `
            <option value="">โหลดรายการไม่สำเร็จ</option>
        `;
        showToast("โหลด Tournament ไม่สำเร็จ", "error");
        return;
    }
    tournaments = data || [];
    if (!tournaments.length) {
        tournamentSelect.innerHTML = `
            <option value="">ยังไม่มี Tournament</option>
        `;
        return;
    }
    tournamentSelect.innerHTML = `
        <option value="">เลือก Tournament</option>
        ${tournaments.map((tournament) => `
            <option value="${escapeHTML(tournament.id)}">
                ${escapeHTML(tournament.tournament_name)}
            </option>
        `).join("")}
    `;
};
const loadSelectedTournament = async (tournamentID) => {
    currentTournament = tournaments.find((item) =>
        String(item.id) === String(tournamentID)
    ) || null;
    await loadAssignments();
    renderTournamentSummary();
    renderSlots();
};
const renderCurrentPlayers = () => {
    if (!currentSlotNumber) return;
    const players = getSlotAssignments(currentSlotNumber);
    if (!players.length) {
        currentPlayerList.innerHTML = `
            <p class="control-empty-text">
                ยังไม่มีสมาชิกในสล็อต
            </p>
        `;
        return;
    }
    currentPlayerList.innerHTML = players.map((player) => `
        <div class="control-current-player">
            <div class="control-player-info">
                <strong>
                    ${escapeHTML(
                        player.pubg_name ||
                        player.display_name ||
                        player.username ||
                        "Unknown Player"
                    )}
                </strong>
                <span>
                    ${escapeHTML(player.username || "")}
                </span>
            </div>
            <span class="control-player-assigned">
                ASSIGNED
            </span>
        </div>
    `).join("");
};
const renderMemberList = () => {
    if (!currentTournament) return;
    const searchText = String(memberSearch.value || "")
        .trim()
        .toLowerCase();
    const currentSlotPlayers = getSlotAssignments(currentSlotNumber);
    const currentUserIDs = currentSlotPlayers.map((player) =>
        String(player.user_id)
    );
    const filteredMembers = members.filter((member) => {
        const displayName = getMemberDisplayName(member).toLowerCase();
        const username = String(member.username || "").toLowerCase();
        const pubgName = String(member.pubg_name || "").toLowerCase();
        const pubgUID = String(member.pubg_uid || "").toLowerCase();
        const matchesSearch =
            displayName.includes(searchText) ||
            username.includes(searchText) ||
            pubgName.includes(searchText) ||
            pubgUID.includes(searchText);
        const alreadyInCurrentSlot =
            currentUserIDs.includes(String(member.user_id));
        return matchesSearch && !alreadyInCurrentSlot;
    });
    if (!filteredMembers.length) {
        memberList.innerHTML = `
            <p class="control-empty-text">
                ไม่พบสมาชิกที่ค้นหา
            </p>
        `;
        return;
    }
    memberList.innerHTML = filteredMembers.map((member) => {
        const assigned = assignments.find((item) =>
            String(item.user_id) === String(member.user_id)
        );
        const assignedSlot = assigned
            ? `อยู่ใน ${escapeHTML(assigned.slot_name || getSlotName(assigned.slot_number))}`
            : "ยังไม่มีสล็อต";
        return `
            <div class="control-member-item">
                <div class="control-member-info">
                    <strong>
                        ${escapeHTML(getMemberDisplayName(member))}
                    </strong>
                    <span>
                        ${escapeHTML(getMemberGameName(member))}
                    </span>
                    <small>
                        ${escapeHTML(assignedSlot)}
                    </small>
                </div>
                <button
                    type="button"
                    class="control-member-add-btn"
                    data-user-id="${escapeHTML(member.user_id)}"
                    data-member-name="${escapeHTML(getMemberDisplayName(member))}"
                >
                    ${assigned ? "ย้ายสล็อต" : "เพิ่ม"}
                </button>
            </div>
        `;
    }).join("");
};
const openSlotModal = (slotNumber, slotName) => {
    if (!currentTournament) return;
    currentSlotNumber = Number(slotNumber);
    currentSlotName = slotName || getSlotName(slotNumber);
    modalTitle.textContent = `จัดการ ${currentSlotName}`;
    modalSubtitle.textContent =
        `${getMatchType(currentTournament)} · ` +
        `${getSlotAssignments(currentSlotNumber).length}/${getSlotCapacity()} ผู้เล่น`;
    memberSearch.value = "";
    renderCurrentPlayers();
    renderMemberList();
    playerModal.classList.remove("hidden");
    document.body.classList.add("control-modal-open");
};
const closeSlotModal = () => {
    playerModal.classList.add("hidden");
    document.body.classList.remove("control-modal-open");
    currentSlotNumber = null;
    currentSlotName = null;
};
const assignPlayer = async (userID, memberName) => {
    console.log("[S2N SLOT] assignPlayer เริ่มทำงาน", {
        userID,
        memberName,
        tournamentID: currentTournament?.id,
        slotNumber: currentSlotNumber,
        slotName: currentSlotName
    });
    
    if (!currentTournament || !currentSlotNumber) {
        console.warn("[S2N SLOT] ไม่มี Tournament หรือ Slot");
        showToast("กรุณาเลือก Tournament และ Slot", "error");
        return;
    }
    
    if (isSlotFull(currentSlotNumber)) {
        showToast("สล็อตนี้เต็มแล้ว", "error");
        return;
    }
    
    const existingAssignment = assignments.find((item) =>
        String(item.user_id) === String(userID)
    );
    
 console.log("[S2N SLOT] ข้ามหน้าต่างยืนยัน กำลังดำเนินการ");
    
    try {
        console.log("[S2N SLOT] กำลังเรียก RPC");
        
        const { data, error } = await supabase.rpc(
            "s2n_admin_assign_player",
            {
                p_tournament_id: currentTournament.id,
                p_user_id: userID,
                p_slot_number: currentSlotNumber,
                p_slot_name: currentSlotName
            }
        );
        
        console.log("[S2N SLOT] RPC Response", { data, error });
        
        if (error) {
            console.error("[S2N SLOT] RPC Error:", error);
            showToast(error.message || "จัดสล็อตไม่สำเร็จ", "error");
            return;
        }
        
        showToast("จัดสล็อตผู้เล่นสำเร็จ");
        
        await loadAssignments();
        renderTournamentSummary();
        renderSlots();
        renderCurrentPlayers();
        renderMemberList();
        
    } catch (error) {
        console.error("[S2N SLOT] Unexpected Error:", error);
        showToast(error.message || "เกิดข้อผิดพลาด", "error");
    }
};
const checkAdmin = async () => {
    const { data: authData, error: authError } =
        await supabase.auth.getUser();
    if (authError || !authData?.user) {
        window.location.href = "../index.html";
        return false;
    }
    currentUser = authData.user;
    const { data: profile, error: profileError } = await supabase
        .from("s2n_members")
        .select("role")
        .eq("user_id", currentUser.id)
        .maybeSingle();
    if (profileError || profile?.role !== "admin") {
        showToast("คุณไม่มีสิทธิ์เข้าถึง Admin Control", "error");
        setTimeout(() => {
            window.location.href = "../dashboard.html";
        }, 1500);
        return false;
    }
    return true;
};
const refreshAll = async () => {
    if (loading) return;
    loading = true;
    refreshBtn.disabled = true;
    await loadTournaments();
    await loadMembers();
    if (tournamentSelect.value) {
        await loadSelectedTournament(tournamentSelect.value);
    }
    refreshBtn.disabled = false;
    loading = false;
    showToast("รีเฟรชข้อมูลสำเร็จ");
};
const bindEvents = () => {
    tournamentSelect.addEventListener("change", async () => {
        await loadSelectedTournament(tournamentSelect.value);
    });
    refreshBtn.addEventListener("click", refreshAll);
    slotGrid.addEventListener("click", (event) => {
        const button = event.target.closest("[data-slot-number]");
        if (!button) return;
        openSlotModal(
            button.dataset.slotNumber,
            button.dataset.slotName
        );
    });
    memberSearch.addEventListener("input", renderMemberList);
    memberList.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-user-id]");
        if (!button) return;
        await assignPlayer(
            button.dataset.userId,
            button.dataset.memberName
        );
    });
    document.querySelectorAll("[data-slot-filter]").forEach((button) => {
        button.addEventListener("click", () => {
            slotFilter = button.dataset.slotFilter;
            document.querySelectorAll("[data-slot-filter]")
                .forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
            renderSlots();
        });
    });
    document.querySelectorAll("[data-close]").forEach((button) => {
        button.addEventListener("click", () => {
            closeSlotModal();
        });
    });
    $("#logout-btn")?.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "../index.html";
    });
};
const init = async () => {
    if (!supabase) {
        console.error("Supabase client not found.");
        showToast("ไม่พบ Supabase Client", "error");
        return;
    }
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;
    bindEvents();
    await loadTournaments();
    await loadMembers();
    renderTournamentSummary();
    renderSlots();
};
document.addEventListener("DOMContentLoaded", init);

})();