/* ==========================================
   S2N HUB TOURNAMENT V1
   Supabase Integration + Random Mode
========================================== */

(() => {
        "use strict";
        
        const supabase = window.supabaseClient;
        
        if (!supabase) {
            console.error("[S2N Tournament] Supabase client not found.");
            return;
        }
        
        const $ = (selector) => document.querySelector(selector);
        
        const state = {
            user: null,
            profile: null,
            isAdmin: false,
            tournaments: [],
            entries: [],
            teams: [],
            filter: "all",
            loading: false
        };
        
        const statusLabels = {
            upcoming: "Upcoming",
            registration: "Registration",
            ongoing: "Ongoing",
            completed: "Completed",
            pending: "Pending",
            approved: "Approved",
            rejected: "Rejected"
        };
        
        const matchTypeLabels = {
            team: "Team",
            random: "Random"
        };
        
        /* HELPERS */
        
        function escapeHTML(value) {
            return String(value ?? "").replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            })[char]);
        }
        
        function formatDate(value) {
            if (!value) return "ยังไม่กำหนด";
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return "ยังไม่กำหนด";
            return date.toLocaleString("th-TH", {
                dateStyle: "medium",
                timeStyle: "short"
            });
        }
        
        function formatMoney(value) {
            return Number(value || 0).toLocaleString("th-TH", {
                maximumFractionDigits: 2
            });
        }
        
        function showToast(message, type = "info") {
            let toast = $("#tournament-toast");
            if (!toast) {
                toast = document.createElement("div");
                toast.id = "tournament-toast";
                document.body.appendChild(toast);
            }
            toast.className = `tournament-toast toast-${type}`;
            toast.textContent = message;
            toast.classList.add("show");
            clearTimeout(toast._timer);
            toast._timer = setTimeout(() => toast.classList.remove("show"), 3500);
        }
        
        function setButtonLoading(button, loading, text = "กำลังดำเนินการ...") {
            if (!button) return;
            if (loading) {
                button.dataset.originalText = button.innerHTML;
                button.disabled = true;
                button.textContent = text;
            } else {
                button.disabled = false;
                if (button.dataset.originalText) {
                    button.innerHTML = button.dataset.originalText;
                    delete button.dataset.originalText;
                }
            }
        }
        
        function openModal(id) {
    const modal = document.getElementById(id);
    
    if (!modal) return;
    
    modal.classList.remove("hidden");
    
    document.body.classList.add("modal-open");
    
    // Reset scroll position when opening
    const modalBox = modal.querySelector(".modal-box");
    
    if (modalBox) {
        modalBox.scrollTop = 0;
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    
    if (!modal) return;
    
    modal.classList.add("hidden");
    
    // Unlock background only when all modals are closed
    const visibleModals = document.querySelectorAll(
        ".modal:not(.hidden)"
    );
    
    if (visibleModals.length === 0) {
        document.body.classList.remove("modal-open");
    }
}
        
        function tournamentCapacity(tournament) {
            return tournament.match_type === "random" ?
                Number(tournament.random_slots || 4) *
                Number(tournament.random_players_per_slot || 4) :
                Number(tournament.max_teams || 0);
        }
        
        function getTournamentStatus(tournament) {
            if (tournament.status === "completed") return "completed";
            if (tournament.status === "ongoing") return "ongoing";
            
            const now = new Date();
            
            if (tournament.registration_start &&
                now < new Date(tournament.registration_start)) {
                return "upcoming";
            }
            
            if (tournament.registration_end &&
                now > new Date(tournament.registration_end)) {
                return "upcoming";
            }
            
            if (!tournament.registration_start &&
                !tournament.registration_end &&
                tournament.status === "upcoming") {
                return "upcoming";
            }
            
            return "registration";
        }
        
        function approvedEntries(tournamentId) {
            return state.entries.filter(entry =>
                entry.tournament_id === tournamentId &&
                entry.status === "approved"
            );
        }
        
        function activeEntries(tournamentId) {
            return state.entries.filter(entry =>
                entry.tournament_id === tournamentId &&
                (entry.status === "pending" || entry.status === "approved")
            );
        }
        
        function canRegister(tournament) {
            return getTournamentStatus(tournament) === "registration" &&
                activeEntries(tournament.id).length <
                tournamentCapacity(tournament);
        }
        
        function getEntryCount(tournamentId) {
            return approvedEntries(tournamentId).length;
        }
        
        function getUserEntry(tournamentId) {
            return state.entries.find(entry =>
                entry.tournament_id === tournamentId &&
                entry.applicant_id === state.user.id
            );
        }
        
        /* AUTH */
        
        async function initialize() {
                try {
                    const { data: { user }, error } = await supabase.auth.getUser();
                    
                    if (error || !user) {
                        showToast("กรุณาเข้าสู่ระบบก่อน", "error");
                        setTimeout(() => window.location.href = "index.html", 1200);
                        return;
                    }
                    
                                state.user = user;

            const { data: profile, error: profileError } = await supabase
                .from("s2n_members")
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle();

            if (profileError) throw profileError;
            if (!profile) {
                showToast("ไม่พบข้อมูลสมาชิก", "error");
                return;
            }

            state.profile = profile;
            state.isAdmin = profile.role === "admin";

            if (window.APP) window.APP.profile = profile;

            $("#user-role-badge").textContent = state.isAdmin ? "ADMIN" : "MEMBER";
            $("#create-tournament-btn").classList.toggle("hidden", !state.isAdmin);

            await loadData();
        } catch (error) {
            console.error("[Tournament] Initialize error:", error);
            showToast("ไม่สามารถเริ่มระบบแข่งขันได้", "error");
        }
    }

    /* LOAD */

    async function loadData() {
        if (state.loading) return;
        state.loading = true;

        try {
            const [tournamentsResult, entriesResult, teamsResult] = await Promise.all([
                supabase.from("s2n_tournaments")
                    .select("*")
                    .order("created_at", { ascending: false }),

                supabase.from("s2n_tournament_entries")
                    .select(`
                        id,
                        tournament_id,
                        team_id,
                        applicant_id,
                        status,
                        registered_at,
                        team:s2n_teams (
                            id,
                            team_name,
                            team_tag,
                            leader_id
                        )
                    `)
                    .order("registered_at", { ascending: false }),

                supabase.from("s2n_teams")
                    .select("*")
                    .eq("leader_id", state.user.id)
                    .eq("status", "active")
                    .order("created_at", { ascending: false })
            ]);

            if (tournamentsResult.error) throw tournamentsResult.error;
            if (entriesResult.error) throw entriesResult.error;
            if (teamsResult.error) throw teamsResult.error;

            state.tournaments = tournamentsResult.data || [];
state.entries = entriesResult.data || [];
state.teams = teamsResult.data || [];

renderStats();
renderTournaments();
renderMyRegistrations();
        } catch (error) {
            console.error("[Tournament] Load error:", error);
            $("#tournament-list").innerHTML = `
                <div class="empty-state">
                    ไม่สามารถโหลดข้อมูลการแข่งขันได้<br>
                    ${escapeHTML(error.message)}
                </div>`;
            showToast("โหลดข้อมูลไม่สำเร็จ", "error");
        } finally {
            state.loading = false;
        }
    }

    /* STATS */

    function renderStats() {
        $("#stat-tournaments").textContent =
            state.tournaments.length.toLocaleString("th-TH");

        $("#stat-teams").textContent =
            state.entries.filter(entry => entry.status === "approved")
                .length.toLocaleString("th-TH");

        const totalPrize = state.tournaments.reduce(
            (sum, tournament) => sum + Number(tournament.prize_pool || 0), 0
        );

        $("#stat-prize").textContent = `฿${formatMoney(totalPrize)}`;
    }

    /* TOURNAMENT LIST */

function renderTournaments() {
    const container = $("#tournament-list");
    
    if (!container) return;
    
    let tournaments = [...state.tournaments];
    
    if (state.filter !== "all") {
        tournaments = tournaments.filter(t =>
            getTournamentStatus(t) === state.filter
        );
    }
    
    if (!tournaments.length) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-rounded">emoji_events</span>
                <p>ไม่มีรายการแข่งขันในหมวดนี้</p>
            </div>`;
        return;
    }
    
    container.innerHTML = tournaments.map(tournament => {
        const status = getTournamentStatus(tournament);
        const registered = activeEntries(tournament.id).length;
        const capacity = tournamentCapacity(tournament);
        const userEntry = getUserEntry(tournament.id);
        const matchType = tournament.match_type || "team";
        
        let actionHTML = "";
        
        if (state.isAdmin) {
            actionHTML = `
                <button class="btn-admin"
                    data-action="manage"
                    data-id="${tournament.id}">
                    <span class="material-symbols-rounded">settings</span>
                    จัดการผู้สมัคร
                </button>`;
        } else if (userEntry) {
            actionHTML = `
                <button class="btn-registered" disabled>
                    <span class="material-symbols-rounded">check_circle</span>
                    ${escapeHTML(statusLabels[userEntry.status] || userEntry.status)}
                </button>`;
        } else if (canRegister(tournament)) {
            actionHTML = `
                <button class="btn-register"
                    data-action="register"
                    data-id="${tournament.id}">
                    <span class="material-symbols-rounded">how_to_reg</span>
                    สมัครแข่งขัน
                </button>`;
        } else {
            actionHTML = `
                <button class="btn-disabled" disabled>
                    ปิดรับสมัคร
                </button>`;
        }
        
        const capacityLabel = matchType === "random" ?
            `${registered}/${capacity} ผู้เล่น` :
            `${registered}/${capacity} ทีม`;
        
        const progress = capacity > 0 ?
            Math.min(100, (registered / capacity) * 100) :
            0;
        
        return `
            <article class="tournament-card" data-id="${tournament.id}">

                <div class="tournament-card-header">

                    <div class="tournament-game-icon">
                        <span class="material-symbols-rounded">
                            sports_esports
                        </span>
                    </div>

                    <div class="tournament-card-title">
             <h4>${escapeHTML(tournament.tournament_name)}</h4>
                        <p>${escapeHTML(tournament.game || "PUBG Mobile")}</p>
                    </div>

                    <span class="status-badge status-${status}">
                        ${escapeHTML(statusLabels[status] || status)}
                    </span>

                </div>

                <div class="tournament-card-info">

                    <div class="info-item">
                        <span class="material-symbols-rounded">groups</span>
                        <span>${escapeHTML(matchTypeLabels[matchType] || matchType)}</span>
                    </div>

                    <div class="info-item">
                        <span class="material-symbols-rounded">map</span>
                        <span>${escapeHTML(tournament.map_name || "Erangel")}</span>
                    </div>

                    <div class="info-item">
                        <span class="material-symbols-rounded">event</span>
                        <span>${formatDate(tournament.tournament_start)}</span>
                    </div>

                </div>

                <div class="tournament-card-prize">

                    <div>
                        <small>เงินรางวัลรวม</small>
                        <strong>฿${formatMoney(tournament.prize_pool)}</strong>
                    </div>

                    <div>
                        <small>จำนวนที่สมัคร</small>
                        <strong>${capacityLabel}</strong>
                    </div>

                </div>

                <div class="tournament-progress">
                    <div class="progress-track">
                        <div class="progress-fill"
                            style="width:${progress}%">
                        </div>
                    </div>
                </div>

               <div class="tournament-card-footer">

    ${actionHTML}

    <button class="btn-tournament-details"
        data-action="details"
        data-id="${tournament.id}">

        <span class="material-symbols-rounded">
            visibility
        </span>

        DETAILS

    </button>

</div>

            </article>
        `;
    }).join("");
}
           /* MY REGISTRATIONS */

function renderMyRegistrations() {
    const container =
        $("#my-registrations") ||
        $("#my-registration-list") ||
        $("#my-entries-list");
    
    if (!container) {
        console.warn(
            "[Tournament] My registrations container not found."
        );
        return;
    }
    
    if (!state.user) {
        container.innerHTML = `
            <div class="empty-state">
                กรุณาเข้าสู่ระบบ
            </div>
        `;
        return;
    }
    
    // รายการสมัครของสมาชิกที่เข้าสู่ระบบ
    const myEntries = state.entries.filter(entry =>
        entry.applicant_id === state.user.id
    );
    
    if (!myEntries.length) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-rounded">
                    emoji_events
                </span>
                <p>คุณยังไม่ได้สมัครการแข่งขัน</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = myEntries.map(entry => {
        const tournament = state.tournaments.find(item =>
            item.id === entry.tournament_id
        );
        
        const tournamentName =
            tournament?.tournament_name || "การแข่งขัน";
        
        const status = entry.status || "pending";
        
        const statusLabel =
            statusLabels[status] || status;
        
        const teamName = entry.team ?
            `${entry.team.team_tag || "TEAM"} - ${
                entry.team.team_name || "Unknown Team"
            }` :
            "สมัครรายบุคคล";
        
        return `
            <article class="registration-item">

                <div class="registration-item-info">
                    <h3>
                        ${escapeHTML(tournamentName)}
                    </h3>

                    <p>
                        ${escapeHTML(teamName)}
                    </p>

                    <small>
                        สมัครเมื่อ:
                        ${formatDate(entry.registered_at)}
                    </small>
                </div>

                <div class="registration-item-right">
                    <span class="status-badge status-${escapeHTML(status)}">
                        ${escapeHTML(statusLabel)}
                    </span>
                </div>

            </article>
        `;
    }).join("");
} 
                /* REGISTER MODAL */
    
    async function openRegisterModal(tournamentId) {
        const tournament = state.tournaments.find(item => item.id === tournamentId);
        
        if (!tournament) {
            showToast("ไม่พบรายการแข่งขัน", "error");
            return;
        }
        
        if (!canRegister(tournament)) {
            showToast("รายการนี้ไม่เปิดรับสมัครแล้ว", "error");
            return;
        }
        
        if (getUserEntry(tournament.id)) {
            showToast("คุณสมัครรายการนี้แล้ว", "error");
            return;
        }
        
        $("#register-tournament-id").value = tournament.id;
        
        $("#register-tournament-info").innerHTML = `
            <strong>${escapeHTML(tournament.tournament_name)}</strong><br>
            รูปแบบ: ${escapeHTML(matchTypeLabels[tournament.match_type] || "Team")}<br>
            แผนที่: ${escapeHTML(tournament.map_name || "Erangel")}<br>
            เงินรางวัล: ฿${formatMoney(tournament.prize_pool)}<br>
            ${tournament.match_type === "random"
                ? `จำนวน Slot: ${Number(tournament.random_slots || 4)} × ผู้เล่น ${Number(tournament.random_players_per_slot || 4)} คน`
                : `จำนวนทีมสูงสุด: ${Number(tournament.max_teams)}`}
        `;
        
        const select = $("#register-team-select");
        const teamSelectContainer = select?.closest(".form-group") ||
            select?.parentElement;
        const randomNote = $("#register-random-note");
        
        if (tournament.match_type === "random") {
            if (teamSelectContainer) teamSelectContainer.classList.add("hidden");
            if (select) select.required = false;
            
            if (randomNote) {
                randomNote.classList.remove("hidden");
            } else {
                const note = document.createElement("p");
                note.id = "register-random-note";
                note.className = "form-note";
                note.textContent =
                    "สมัครรายบุคคล ระบบจะสุ่มทีมหลัง Admin อนุมัติ ไม่มีตัวสำรอง";
                
                $("#register-team-form-content")?.appendChild(note);
                
                if (!$("#register-team-form-content")) {
                    $("#register-tournament-info").insertAdjacentHTML(
                        "beforeend",
                        `<p class="form-note">
                            สมัครรายบุคคล ระบบจะสุ่มทีมหลัง Admin อนุมัติ ไม่มีตัวสำรอง
                        </p>`
                    );
                }
            }
        } else {
            if (teamSelectContainer) teamSelectContainer.classList.remove("hidden");
            if (select) select.required = true;
            if (randomNote) randomNote.classList.add("hidden");
            
            if (!state.teams.length) {
                showToast("คุณยังไม่มีทีมที่เป็นหัวหน้าทีม", "error");
                return;
            }
            
            select.innerHTML = `
                <option value="">เลือกทีม</option>
                ${state.teams.map(team => {
                    const alreadyRegistered = state.entries.some(entry =>
                        entry.tournament_id === tournament.id &&
                        entry.team_id === team.id
                    );

                    return `
                        <option value="${team.id}"
                            ${alreadyRegistered ? "disabled" : ""}>
                            ${escapeHTML(team.team_tag)} -
                            ${escapeHTML(team.team_name)}
                            ${alreadyRegistered ? "(สมัครแล้ว)" : ""}
                        </option>`;
                }).join("")}`;
        }
        
        openModal("register-modal");
    }
    
    async function registerTeam(event) {
        event.preventDefault();
        
        const button = event.submitter;
        const tournamentId = $("#register-tournament-id").value;
        const tournament = state.tournaments.find(item => item.id === tournamentId);
        
        if (!tournament || !canRegister(tournament)) {
            showToast("รายการนี้ปิดรับสมัครแล้ว", "error");
            return;
        }
        
        if (getUserEntry(tournamentId)) {
            showToast("คุณสมัครรายการนี้แล้ว", "error");
            return;
        }
        
        let teamId = null;
        
        if (tournament.match_type !== "random") {
            teamId = $("#register-team-select").value;
            
            if (!teamId) {
                showToast("กรุณาเลือกทีม", "error");
                return;
            }
            
            const team = state.teams.find(item => item.id === teamId);
            
            if (!team || team.leader_id !== state.user.id) {
                showToast("คุณไม่มีสิทธิ์สมัครทีมนี้", "error");
                return;
            }
            
            const duplicateTeam = state.entries.some(entry =>
                entry.tournament_id === tournamentId &&
                entry.team_id === teamId
            );
            
            if (duplicateTeam) {
                showToast("ทีมนี้สมัครรายการดังกล่าวแล้ว", "error");
                return;
            }
        }
        
        const payload = {
            tournament_id: tournamentId,
            team_id: teamId,
            applicant_id: state.user.id,
            status: "pending"
        };
        
        setButtonLoading(button, true);
        
        try {
            const { error } = await supabase
                .from("s2n_tournament_entries")
                .insert(payload);
            
            if (error) throw error;
            
            closeModal("register-modal");
            
            showToast(
                tournament.match_type === "random" ?
                "สมัครรายบุคคลสำเร็จ รอ Admin อนุมัติ" :
                "สมัครแข่งขันสำเร็จ รอ Admin อนุมัติ",
                "success"
            );
            
            await loadData();
        } catch (error) {
            console.error("[Tournament] Registration error:", error);
            
            showToast(
                error.code === "23505" ?
                "คุณหรือทีมสมัครรายการนี้แล้ว" :
                (error.message || "สมัครแข่งขันไม่สำเร็จ"),
                "error"
            );
        } finally {
            setButtonLoading(button, false);
        }
    }
    
    
        /* ADMIN ENTRY MANAGEMENT */
    
    async function manageEntries(tournamentId) {
        if (!state.isAdmin) {
            showToast("Admin เท่านั้น", "error");
            return;
        }
        
        const entries = state.entries.filter(entry =>
            entry.tournament_id === tournamentId
        );
        
        if (!entries.length) {
            showToast("ไม่มีผู้สมัครรายการนี้", "info");
            return;
        }
        
        openEntryManagementModal(tournamentId);
    }
    
    function openEntryManagementModal(tournamentId) {
        const tournament = state.tournaments.find(item =>
            item.id === tournamentId
        );
        
        const entries = state.entries.filter(entry =>
            entry.tournament_id === tournamentId
        );
        
        let modal = $("#entry-management-modal");
        
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "entry-management-modal";
            modal.className = "modal hidden";
            
            modal.innerHTML = `
                <div class="modal-overlay"
                    data-close="entry-management-modal"></div>

                <div class="modal-box">
                    <div class="modal-header">
                        <div>
                            <span class="section-label">ADMIN CONTROL</span>
                            <h2>จัดการผู้สมัคร</h2>
                        </div>

                        <button class="modal-close"
                            data-close="entry-management-modal">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>

                    <div id="entry-management-content"></div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
        
        const content = $("#entry-management-content");
        const isRandom = tournament?.match_type === "random";
        
        const approvedCount = entries.filter(entry =>
            entry.status === "approved"
        ).length;
        
        const capacity = tournamentCapacity(tournament || {});
        
        content.innerHTML = `
            <p class="form-note">
                ${escapeHTML(tournament?.tournament_name || "")}
            </p>

            ${isRandom ? `
                <p class="form-note">
                    Approved: ${approvedCount}/${capacity} คน ·
                    ${Number(tournament.random_slots || 4)} Slot ×
                    ${Number(tournament.random_players_per_slot || 4)} คน
                </p>
            ` : ""}

            <div class="entry-admin-list">
                ${entries.map(entry => {
                    const team = entry.team;

                    const entryName = entry.team_id
                        ? `${team?.team_tag || "TEAM"} - ${team?.team_name || "Unknown team"}`
                        : `ผู้สมัครรายบุคคล · ${entry.applicant_id.slice(0, 8)}`;

                    return `
                        <div class="registration-item">
                            <div>
                                <h3>${escapeHTML(entryName)}</h3>
                                <p>${formatDate(entry.registered_at)}</p>
                            </div>

                            <div class="registration-item-right">
                                <span class="status-badge status-${escapeHTML(entry.status)}">
                                    ${escapeHTML(statusLabels[entry.status] || entry.status)}
                                </span>

                                ${entry.status === "pending" ? `
                                    <button class="btn-small success"
                                        data-action="approve"
                                        data-entry-id="${entry.id}">
                                        อนุมัติ
                                    </button>

                                    <button class="btn-small danger"
                                        data-action="reject"
                                        data-entry-id="${entry.id}">
                                        ปฏิเสธ
                                    </button>
                                ` : ""}
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>

            ${isRandom ? `
                <div class="random-admin-actions">
                    <button class="btn-small"
                        data-action="randomize"
                        data-tournament-id="${tournamentId}"
                        ${approvedCount !== capacity ? "disabled" : ""}>
                        สุ่มจัดทีม (${approvedCount}/${capacity})
                    </button>

                    <p class="form-note">
                        ต้องอนุมัติผู้เล่นให้ครบทุก Slot ก่อนสุ่ม · ไม่มีตัวสำรอง
                    </p>
                </div>
            ` : ""}
        `;
        
        openModal("entry-management-modal");
    }
    
    async function updateEntryStatus(entryId, status) {
        if (!state.isAdmin) {
            showToast("Admin เท่านั้น", "error");
            return;
        }
        
        const entry = state.entries.find(item =>
            item.id === entryId
        );
        
        if (!entry) {
            showToast("ไม่พบข้อมูลผู้สมัคร", "error");
            return;
        }
        
        if (entry.status !== "pending") {
            showToast("รายการนี้ได้รับการจัดการแล้ว", "error");
            return;
        }
        
        const tournament = state.tournaments.find(item =>
            item.id === entry.tournament_id
        );
        
        if (!tournament) {
            showToast("ไม่พบรายการแข่งขัน", "error");
            return;
        }
        
        if (status === "approved") {
            const approvedCount = getEntryCount(tournament.id);
            const capacity = tournamentCapacity(tournament);
            
            if (approvedCount >= capacity) {
                showToast(
                    tournament.match_type === "random" ?
                    "ผู้เล่นครบจำนวนแล้ว" :
                    "จำนวนทีมเต็มแล้ว",
                    "error"
                );
                return;
            }
        }
        
        try {
            const { error } = await supabase
                .from("s2n_tournament_entries")
                .update({ status })
                .eq("id", entryId)
                .eq("status", "pending");
            
            if (error) throw error;
            
            showToast(
                status === "approved" ?
                "อนุมัติสำเร็จ" :
                "ปฏิเสธสำเร็จ",
                "success"
            );
            
            await loadData();
            openEntryManagementModal(tournament.id);
            
        } catch (error) {
            console.error("[Tournament] Update entry error:", error);
            showToast(error.message || "อัปเดตสถานะไม่สำเร็จ", "error");
        }
    }
    
        /* RANDOM TEAM DRAW */

    async function randomizeTournament(tournamentId) {
        if (!state.isAdmin) {
            showToast("Admin เท่านั้น", "error");
            return;
        }

        const tournament = state.tournaments.find(item =>
            item.id === tournamentId
        );

        if (!tournament || tournament.match_type !== "random") {
            showToast("รายการนี้ไม่ใช่ Random Mode", "error");
            return;
        }

        const slots = Number(tournament.random_slots || 4);
        const playersPerSlot = Number(
            tournament.random_players_per_slot || 4
        );

        const capacity = slots * playersPerSlot;
        const approved = approvedEntries(tournamentId);

        if (approved.length !== capacity) {
            showToast(
                `ต้องอนุมัติให้ครบ ${capacity} คนก่อนสุ่ม`,
                "error"
            );
            return;
        }

        const { data: existing, error: existingError } = await supabase
            .from("s2n_tournament_random_assignments")
            .select("id")
            .eq("tournament_id", tournamentId)
            .limit(1);

        if (existingError) {
            showToast(existingError.message, "error");
            return;
        }

        if (existing?.length) {
            showToast(
                "รายการนี้สุ่มทีมไปแล้ว ไม่สามารถสุ่มซ้ำได้",
                "error"
            );
            return;
        }

        // Fisher-Yates Shuffle
        const shuffled = [...approved];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [shuffled[i], shuffled[j]] =
                [shuffled[j], shuffled[i]];
        }

        const assignments = shuffled.map((entry, index) => {
            const slotNumber =
                Math.floor(index / playersPerSlot) + 1;

            return {
                tournament_id: tournamentId,
                entry_id: entry.id,
                slot_number: slotNumber,
                slot_name: `TEAM ${String.fromCharCode(64 + slotNumber)}`
            };
        });

        try {
            const { error } = await supabase
                .from("s2n_tournament_random_assignments")
                .insert(assignments);

            if (error) throw error;

            showToast("สุ่มจัดทีมสำเร็จ!", "success");

            await loadRandomResults(tournamentId);

        } catch (error) {
            console.error("[Tournament] Random draw error:", error);

            showToast(
                error.message || "สุ่มจัดทีมไม่สำเร็จ",
                "error"
            );
        }
    }

    /* LOAD RANDOM RESULTS */

    async function loadRandomResults(tournamentId) {
        const { data, error } = await supabase
            .from("s2n_tournament_random_assignments")
            .select(`
                id,
                tournament_id,
                entry_id,
                slot_number,
                slot_name,
                assigned_at,
                entry:s2n_tournament_entries (
                    id,
                    applicant_id,
                    status,
                    registered_at
                )
            `)
            .eq("tournament_id", tournamentId)
            .order("slot_number", { ascending: true });

        if (error) {
            showToast(
                error.message || "โหลดผลสุ่มไม่สำเร็จ",
                "error"
            );
            return;
        }

        const grouped = {};

        (data || []).forEach(item => {
            if (!grouped[item.slot_name]) {
                grouped[item.slot_name] = [];
            }

            grouped[item.slot_name].push(item);
        });

        let modal = $("#random-results-modal");

        if (!modal) {
            modal = document.createElement("div");
            modal.id = "random-results-modal";
            modal.className = "modal hidden";

            modal.innerHTML = `
                <div class="modal-overlay"
                    data-close="random-results-modal"></div>

                <div class="modal-box">
                    <div class="modal-header">
                        <div>
                            <span class="section-label">
                                S2N RANDOM DRAW
                            </span>
                            <h2>ผลการสุ่มทีม</h2>
                        </div>

                        <button class="modal-close"
                            data-close="random-results-modal">
                            <span class="material-symbols-rounded">
                                close
                            </span>
                        </button>
                    </div>

                    <div id="random-results-content"></div>
                </div>
            `;

            document.body.appendChild(modal);
        }

        $("#random-results-content").innerHTML =
            Object.entries(grouped).map(([slotName, players]) => `
                <section class="random-team-card">
                    <h3>${escapeHTML(slotName)}</h3>

                    <ol>
                        ${players.map((player, index) => `
                            <li>
                                PLAYER ${index + 1}

                                <small>
                                    ${escapeHTML(
                                        player.entry?.applicant_id?.slice(0, 8)
                                        || "Member"
                                    )}
                                </small>
                            </li>
                        `).join("")}
                    </ol>
                </section>
            `).join("");

        openModal("random-results-modal");
    }
    
    /* ==========================================
   TOURNAMENT DETAILS
========================================== */

async function openTournamentDetails(tournamentId) {
    const tournament = state.tournaments.find(item =>
        item.id === tournamentId
    );

    if (!tournament) {
        showToast("ไม่พบรายการแข่งขัน", "error");
        return;
    }

    const modalId = "tournament-details-modal";

    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement("div");
        modal.id = modalId;
        modal.className = "modal hidden";

        modal.innerHTML = `
            <div class="modal-overlay"
                data-close="${modalId}"></div>

            <div class="modal-box tournament-details-box">
                <div class="modal-header">
                    <div>
                        <span class="section-label">
                            S2N HUB / TOURNAMENT
                        </span>
                        <h2>การแข่งขัน</h2>
                    </div>

                    <button class="modal-close"
                        data-close="${modalId}">
                        <span class="material-symbols-rounded">
                            close
                        </span>
                    </button>
                </div>

                <div id="tournament-details-content">
                    <div class="empty-state">
                        กำลังโหลดรายละเอียด...
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    openModal(modalId);

    const content = $("#tournament-details-content");

    content.innerHTML = `
        <div class="empty-state">
            <span class="material-symbols-rounded">
                progress_activity
            </span>
            <p>กำลังโหลดรายละเอียดการแข่งขัน...</p>
        </div>
    `;

    try {
        const entries = state.entries.filter(entry =>
            entry.tournament_id === tournamentId &&
            entry.status === "approved"
        );

        const isRandom = tournament.match_type === "random";

        let teamsHTML = "";

        if (isRandom) {
            teamsHTML = await loadRandomTournamentRoster(
                tournament,
                entries
            );
        } else {
            teamsHTML = await loadTournamentTeamRoster(entries);
        }

        const totalApproved = entries.length;

        const capacity = tournamentCapacity(tournament);

        content.innerHTML = `
            <div class="tournament-details-hero">
                <div class="tournament-game-icon">
                    <span class="material-symbols-rounded">
                        emoji_events
                    </span>
                </div>

                <div>
                    <span class="section-label">
                        ${escapeHTML(
                            matchTypeLabels[tournament.match_type]
                            || "TEAM"
                        )}
                        TOURNAMENT
                    </span>

                    <h2>
                        ${escapeHTML(tournament.tournament_name)}
                    </h2>

                    <p>
                        ${escapeHTML(
                            tournament.game || "PUBG Mobile"
                        )}
                    </p>
                </div>
            </div>

            <div class="tournament-details-stats">
                <div class="details-stat">
                    <span>ทีม / ผู้สมัครอนุมัติ</span>
                    <strong>
                        ${totalApproved.toLocaleString("th-TH")}
                    </strong>
                </div>

                <div class="details-stat">
                    <span>ความจุสูงสุด</span>
                    <strong>
                        ${capacity.toLocaleString("th-TH")}
                    </strong>
                </div>

                <div class="details-stat">
                    <span>เงินรางวัลรวม</span>
                    <strong>
                        ฿${formatMoney(tournament.prize_pool)}
                    </strong>
                </div>
            </div>

            <div class="tournament-details-section">
                <h3>
                    <span class="material-symbols-rounded">
                        info
                    </span>
                    ข้อมูลการแข่งขัน
                </h3>

                <div class="details-info-grid">
                    <div>
                        <small>รูปแบบ</small>
                        <p>
                            ${escapeHTML(
                                matchTypeLabels[tournament.match_type]
                                || tournament.match_type
                                || "Team"
                            )}
                        </p>
                    </div>

                    <div>
                        <small>แผนที่</small>
                        <p>
                            ${escapeHTML(
                                tournament.map_name || "Erangel"
                            )}
                        </p>
                    </div>

                    <div>
                        <small>วันแข่งขัน</small>
                        <p>${formatDate(tournament.tournament_start)}</p>
                    </div>

                    <div>
                        <small>เริ่มรับสมัคร</small>
                        <p>${formatDate(tournament.registration_start)}</p>
                    </div>

                    <div>
                        <small>ปิดรับสมัคร</small>
                        <p>${formatDate(tournament.registration_end)}</p>
                    </div>
                </div>
            </div>

            <div class="tournament-details-section">
                <h3>
                    <span class="material-symbols-rounded">
                        description
                    </span>
                    รายละเอียด
                </h3>

                <p class="details-description">
                    ${escapeHTML(
                        tournament.description
                        || "ไม่มีรายละเอียดเพิ่มเติม"
                    )}
                </p>
            </div>

            <div class="tournament-details-section">
                <h3>
                    <span class="material-symbols-rounded">
                        gavel
                    </span>
                    กติกาการแข่งขัน
                </h3>

                <p class="details-description">
                    ${escapeHTML(
                        tournament.rules
                        || "ยังไม่ได้ระบุกติกาการแข่งขัน"
                    )}
                </p>
            </div>

            <div class="tournament-details-section">
                <h3>
                    <span class="material-symbols-rounded">
                        groups
                    </span>
                    ทีมที่ผ่านการอนุมัติ
                </h3>

                <div class="tournament-details-rosters">
                    ${teamsHTML}
                </div>
            </div>
        `;

    } catch (error) {
        console.error(
            "[Tournament] Details error:",
            error
        );

        content.innerHTML = `
            <div class="empty-state">
                <p>โหลดรายละเอียดไม่สำเร็จ</p>
                <small>${escapeHTML(error.message)}</small>
            </div>
        `;

        showToast(
            "โหลดรายละเอียดการแข่งขันไม่สำเร็จ",
            "error"
        );
    }
}


/* TEAM MODE ROSTER */

async function loadTournamentTeamRoster(entries) {
    if (!entries.length) {
        return `
            <div class="empty-state">
                ยังไม่มีทีมที่ผ่านการอนุมัติ
            </div>
        `;
    }

    const teamEntries = entries.filter(entry =>
        entry.team_id && entry.team
    );

    if (!teamEntries.length) {
        return `
            <div class="empty-state">
                ไม่พบข้อมูลทีม
            </div>
        `;
    }

    const teamResults = await Promise.all(
        teamEntries.map(async entry => {
            const team = entry.team;

            const { data: members, error } = await supabase
                .from("s2n_team_members")
                .select(`
                    id,
                    user_id,
                    pubg_name,
                    role,
                    position
                `)
                .eq("team_id", team.id)
                .order("position", { ascending: true });

            if (error) throw error;

            return {
                team,
                members: members || []
            };
        })
    );

    return teamResults.map(({ team, members }) => `
        <article class="tournament-roster-card">

            <div class="tournament-roster-header">
                <div>
                    <span class="section-label">
                        ${escapeHTML(team.team_tag || "TEAM")}
                    </span>

                    <h4>
                        ${escapeHTML(team.team_name || "Unknown Team")}
                    </h4>
                </div>

                <span class="roster-member-count">
                    ${members.length} PLAYERS
                </span>
            </div>

            <div class="tournament-roster-members">
                ${
                    members.length
                    ? members.map(member => `
                        <div class="tournament-roster-member">

                            <div class="roster-position">
                                ${Number(member.position)}
                            </div>

                            <div class="roster-player-info">
                                <strong>
                                    ${escapeHTML(member.pubg_name)}
                                </strong>

                                <small>
                                    ${escapeHTML(member.role)}
                                </small>
                            </div>

                        </div>
                    `).join("")
                    : `
                        <div class="empty-state">
                            ทีมนี้ยังไม่มีสมาชิก
                        </div>
                    `
                }
            </div>

        </article>
    `).join("");
}


/* RANDOM MODE ROSTER */

async function loadRandomTournamentRoster(
    tournament,
    entries
) {
    const { data: assignments, error } = await supabase
        .from("s2n_tournament_random_assignments")
        .select(`
            id,
            tournament_id,
            entry_id,
            slot_number,
            slot_name,
            entry:s2n_tournament_entries (
                id,
                applicant_id,
                status
            )
        `)
        .eq("tournament_id", tournament.id)
        .order("slot_number", { ascending: true });

    if (error) throw error;

    if (!assignments || !assignments.length) {
        return `
            <div class="empty-state">
                ยังไม่มีผลการสุ่มทีม
            </div>
        `;
    }

    const approvedIds = new Set(
        entries.map(entry => entry.id)
    );

    const validAssignments = assignments.filter(item =>
        item.entry &&
        item.entry.status === "approved" &&
        approvedIds.has(item.entry_id)
    );

    const userIds = [
        ...new Set(
            validAssignments.map(item =>
                item.entry.applicant_id
            )
        )
    ];

    let members = [];

    if (userIds.length) {
        const { data, error: memberError } = await supabase
            .from("s2n_team_members")
            .select(`
                id,
                user_id,
                pubg_name,
                role,
                position
            `)
            .in("user_id", userIds);

        if (memberError) throw memberError;

        members = data || [];
    }

    const grouped = {};

    validAssignments.forEach(item => {
        const slotName = item.slot_name || "TEAM";

        if (!grouped[slotName]) {
            grouped[slotName] = [];
        }

        const member = members.find(m =>
            m.user_id === item.entry.applicant_id
        );

        grouped[slotName].push({
            applicantId: item.entry.applicant_id,
            member
        });
    });

    return Object.entries(grouped).map(
        ([slotName, players]) => `
            <article class="tournament-roster-card">

                <div class="tournament-roster-header">
                    <div>
                        <span class="section-label">
                            RANDOM TEAM
                        </span>

                        <h4>${escapeHTML(slotName)}</h4>
                    </div>

                    <span class="roster-member-count">
                        ${players.length} PLAYERS
                    </span>
                </div>

                <div class="tournament-roster-members">
                    ${players.map((player, index) => `
                        <div class="tournament-roster-member">

                            <div class="roster-position">
                                ${index + 1}
                            </div>

                            <div class="roster-player-info">
                                <strong>
                                    ${escapeHTML(
                                        player.member?.pubg_name
                                        || `PLAYER ${player.applicantId.slice(0, 8)}`
                                    )}
                                </strong>

                                <small>
                                    ${escapeHTML(
                                        player.member?.role
                                        || "Player"
                                    )}
                                </small>
                            </div>

                        </div>
                    `).join("")}
                </div>

            </article>
        `
    ).join("");
}
    
       /* EVENTS */

function bindEvents() {
    
    $("#refresh-btn")?.addEventListener("click", async () => {
        const button = $("#refresh-btn");
        
        if (state.loading) return;
        
        button.classList.add("loading");
        button.disabled = true;
        
        try {
            await loadData();
        } finally {
            button.classList.remove("loading");
            button.disabled = false;
        }
    });
    
    $("#create-tournament-btn")?.addEventListener("click", () => {
        if (state.isAdmin) {
            openModal("create-modal");
        }
    });
    
    $("#create-tournament-form")?.addEventListener(
        "submit",
        createTournament
    );
    
    $("#register-team-form")?.addEventListener(
        "submit",
        registerTeam
    );
    
    $("#tournament-match-type")?.addEventListener(
        "change",
        toggleRandomSettings
    );
    
    toggleRandomSettings();
    
    document.querySelectorAll(".filter-btn").forEach(button => {
        button.addEventListener("click", () => {
            
            document.querySelectorAll(".filter-btn").forEach(item =>
                item.classList.remove("active")
            );
            
            button.classList.add("active");
            
            state.filter = button.dataset.filter;
            
            renderTournaments();
        });
    });
    
    document.addEventListener("click", async event => {
        
        const closeButton = event.target.closest("[data-close]");
        
        if (closeButton) {
            closeModal(closeButton.dataset.close);
            return;
        }
        
        const actionButton = event.target.closest("[data-action]");
        
        if (!actionButton) return;
        
        const action = actionButton.dataset.action;
        const tournamentId = actionButton.dataset.id;
        
        if (action === "details") {
            
            await openTournamentDetails(tournamentId);
            
        } else if (action === "register") {
            
            await openRegisterModal(tournamentId);
            
        } else if (action === "manage") {
            
            await manageEntries(tournamentId);
            
        } else if (action === "approve") {
            
            await updateEntryStatus(
                actionButton.dataset.entryId,
                "approved"
            );
            
        } else if (action === "reject") {
            
            await updateEntryStatus(
                actionButton.dataset.entryId,
                "rejected"
            );
            
        } else if (action === "randomize") {
            
            await randomizeTournament(
                actionButton.dataset.tournamentId
            );
            
        }
    });
    
    document.addEventListener("keydown", event => {
        
        if (event.key === "Escape") {
            
            document.querySelectorAll(".modal:not(.hidden)")
                .forEach(modal => {
                    closeModal(modal.id);
                });
            
        }
        
    });
    
}
    
        /* RANDOM SETTINGS */

    function toggleRandomSettings() {
        const matchType = $("#tournament-match-type")?.value || "team";

        const randomSettings = $("#random-team-settings");
        const teamLimit = $("#tournament-max-teams");

        if (randomSettings) {
            randomSettings.classList.toggle(
                "hidden",
                matchType !== "random"
            );
        }

        if (teamLimit) {
            teamLimit.closest(".form-group")?.classList.toggle(
                "hidden",
                matchType === "random"
            );
        }
    }

    /* CREATE TOURNAMENT */

    async function createTournament(event) {
        event.preventDefault();

        if (!state.isAdmin) {
            showToast("Admin เท่านั้น", "error");
            return;
        }

        const button = event.submitter;

        const name = $("#tournament-name")?.value.trim();
        const gameName = $("#tournament-game")?.value.trim();
        const matchType = $("#tournament-match-type")?.value || "team";
        const mapName = $("#tournament-map")?.value || "Erangel";
        const description = $("#tournament-description")?.value.trim() || "";
        const rules = $("#tournament-rules")?.value.trim() || "";
        const prizePool = Number($("#tournament-prize")?.value || 0);
        const startDate = $("#tournament-start-date")?.value || null;
        const registrationStart =
            $("#tournament-registration-start")?.value || null;
        const registrationEnd =
            $("#tournament-registration-end")?.value || null;

        const maxTeams = Number($("#tournament-max-teams")?.value || 16);
        const randomSlots = Number($("#random-slots")?.value || 4);
        const playersPerSlot =
            Number($("#random-players-per-slot")?.value || 4);

        if (!name || !gameName) {
            showToast("กรุณากรอกชื่อการแข่งขันและเกม", "error");
            return;
        }

        if (matchType === "random" &&
            (randomSlots < 1 || playersPerSlot < 1)) {
            showToast("จำนวน Slot และผู้เล่นต้องมากกว่า 0", "error");
            return;
        }

        if (matchType === "team" && maxTeams < 1) {
            showToast("จำนวนทีมต้องมากกว่า 0", "error");
            return;
        }

        const payload = {
    tournament_name: name,
    game: gameName,
    match_type: matchType,
    map_name: mapName,
    description,
    rules,
    prize_pool: prizePool,
    tournament_start: startDate,
    registration_start: registrationStart,
    registration_end: registrationEnd,
    max_teams: matchType === "team" ? maxTeams : randomSlots,
    random_slots: matchType === "random" ? randomSlots : null,
    random_players_per_slot:
        matchType === "random" ? playersPerSlot : null,
    status: "upcoming",
    created_by: state.user.id
};

        setButtonLoading(button, true);

        try {
            const { data, error } = await supabase
                .from("s2n_tournaments")
                .insert(payload)
                .select()
                .single();

            if (error) throw error;

            closeModal("create-modal");

            $("#create-tournament-form").reset();

            toggleRandomSettings();

            showToast("สร้างการแข่งขันสำเร็จ!", "success");

            await loadData();

        } catch (error) {
            console.error("[Tournament] Create error:", error);

            showToast(
                error.message || "สร้างการแข่งขันไม่สำเร็จ",
                "error"
            );
        } finally {
            setButtonLoading(button, false);
        }
    }
    
    
    
        /* START */
    
    bindEvents();
    initialize();
    
    })();