(() => {
    "use strict";
    /* ======================================
       INITIALIZATION
    ====================================== */
    const $ = (selector) => document.querySelector(selector);
    const supabase =
        window.supabaseClient ||
        window.supabase;
    if (!supabase) {
        console.error("S2N HUB: Supabase client not found.");
        return;
    }
    const state = {
        user: null,
        profile: null,
        isAdmin: false,
        tournaments: [],
        entries: [],
        filter: "all",
        loading: false,
        saving: false
    };
    /* ======================================
       HELPERS
    ====================================== */
    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    function formatCurrency(value) {
        const amount = Number(value || 0);
        return amount.toLocaleString("th-TH", {
            style: "currency",
            currency: "THB",
            maximumFractionDigits: 2
        });
    }
    function formatDate(value) {
        if (!value) return "ยังไม่กำหนด";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "ยังไม่กำหนด";
        }
        return date.toLocaleString("th-TH", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    }
    function showToast(message, type = "success") {
        if (typeof window.showToast === "function") {
            window.showToast(message, type);
            return;
        }
        if (typeof window.showNotification === "function") {
            window.showNotification(message, type);
            return;
        }
        console.log(`[S2N ${type}] ${message}`);
    }
    function getTournamentID(tournament) {
        return tournament.id ||
            tournament.tournament_id ||
            tournament.tournament_uuid ||
            "";
    }
    function getTournamentName(tournament) {
        return tournament.tournament_name ||
            tournament.name ||
            tournament.title ||
            "Untitled Tournament";
    }
    function getMatchType(tournament) {
        return String(
            tournament.match_type ||
            tournament.team_type ||
            tournament.type ||
            "squad"
        ).toLowerCase();
    }
    function getMaxSlots(tournament) {
        return Number(
            tournament.max_teams ||
            tournament.max_slots ||
            tournament.max_entries ||
            0
        );
    }
    function getTournamentDate(tournament) {
        return tournament.start_at ||
            tournament.tournament_start ||
            tournament.start_date ||
            tournament.starts_at ||
            null;
    }
    function getPrize(tournament) {
        return Number(
            tournament.prize_pool ||
            tournament.prize ||
            tournament.prize_money ||
            0
        );
    }
    function getTournamentStatus(tournament) {
        const rawStatus = String(
            tournament.status || ""
        ).toLowerCase();
        const startDate = getTournamentDate(tournament);
        const now = new Date();
        if (
            rawStatus === "completed" ||
            rawStatus === "finished"
        ) {
            return "completed";
        }
        if (
            rawStatus === "ongoing" ||
            rawStatus === "live"
        ) {
            return "ongoing";
        }
        if (
            rawStatus === "cancelled" ||
            rawStatus === "canceled"
        ) {
            return "cancelled";
        }
        if (
            rawStatus === "registration" ||
            rawStatus === "open" ||
            rawStatus === "registering"
        ) {
            return "registration";
        }
        if (startDate) {
            const date = new Date(startDate);
            if (!Number.isNaN(date.getTime())) {
                if (date <= now) {
                    return "ongoing";
                }
            }
        }
        if (
            rawStatus === "upcoming" ||
            rawStatus === "pending" ||
            rawStatus === ""
        ) {
            return "upcoming";
        }
        return rawStatus;
    }
    function getStatusLabel(status) {
        const labels = {
            upcoming: "UPCOMING",
            registration: "REGISTRATION",
            ongoing: "ONGOING",
            completed: "COMPLETED",
            cancelled: "CANCELLED"
        };
        return labels[status] || status.toUpperCase();
    }
    function getStatusClass(status) {
        const classes = {
            upcoming: "status-upcoming",
            registration: "status-registration",
            ongoing: "status-ongoing",
            completed: "status-completed",
            cancelled: "status-cancelled"
        };
        return classes[status] || "status-default";
    }
    /* ======================================
       AUTH + ADMIN
    ====================================== */
    async function loadCurrentUser() {
        const {
            data: { user },
            error
        } = await supabase.auth.getUser();
        if (error) {
            console.error("Auth error:", error);
        }
        state.user = user || null;
        if (!state.user) {
            state.profile = null;
            state.isAdmin = false;
            updateAdminUI();
            return;
        }
        await loadProfile();
    }
    async function loadProfile() {
        if (!state.user) return;
        const { data, error } = await supabase
            .from("s2n_members")
            .select("*")
            .eq("user_id", state.user.id)
            .maybeSingle();
        if (error) {
            console.error("Profile error:", error);
            state.profile = null;
            state.isAdmin = false;
            updateAdminUI();
            return;
        }
        state.profile = data || null;
        const role = String(
            data?.role ||
            data?.member_role ||
            data?.user_role ||
            ""
        ).toLowerCase();
        state.isAdmin =
            data?.is_admin === true ||
            data?.admin === true ||
            role === "admin" ||
            role === "administrator" ||
            role === "super_admin";
        updateAdminUI();
    }
    function updateAdminUI() {
        const createButton = $("#create-tournament-btn");
        const roleBadge = $("#user-role-badge");
        if (createButton) {
            createButton.classList.toggle(
                "hidden",
                !state.isAdmin
            );
        }
        if (roleBadge) {
            roleBadge.textContent =
                state.isAdmin ? "ADMIN" : "MEMBER";
            roleBadge.classList.toggle(
                "admin",
                state.isAdmin
            );
        }
    }
    /* ======================================
       LOAD TOURNAMENTS
    ====================================== */
    async function loadData() {
        if (state.loading) return;
        state.loading = true;
        renderLoading();
        try {
            const { data, error } = await supabase
                .from("s2n_tournaments")
                .select("*")
                .order("created_at", {
                    ascending: false
                });
            if (error) {
                throw error;
            }
            state.tournaments = data || [];
            await loadEntries();
            renderTournaments();
            renderStats();
        } catch (error) {
            console.error(
                "Tournament loading error:",
                error
            );
            renderError(
                "ไม่สามารถโหลดรายการแข่งขันได้"
            );
            showToast(
                "โหลดรายการแข่งขันไม่สำเร็จ",
                "error"
            );
        } finally {
            state.loading = false;
        }
    }
    async function loadEntries() {
        const { data, error } = await supabase
            .from("s2n_tournament_entries")
            .select("*");
        if (error) {
            console.warn(
                "Tournament entries unavailable:",
                error.message
            );
            state.entries = [];
            return;
        }
        state.entries = data || [];
    }
    /* ======================================
       STATISTICS
    ====================================== */
    function renderStats() {
        const tournamentStat = $("#stat-tournaments");
        const teamsStat = $("#stat-teams");
        const prizeStat = $("#stat-prize");
        if (tournamentStat) {
            tournamentStat.textContent =
                state.tournaments.length.toLocaleString("th-TH");
        }
        if (teamsStat) {
            teamsStat.textContent =
                state.entries.length.toLocaleString("th-TH");
        }
        const latestTournament =
            state.tournaments.length > 0
                ? state.tournaments[0]
                : null;
        if (prizeStat) {
            prizeStat.textContent = latestTournament
                ? formatCurrency(getPrize(latestTournament))
                : "฿0";
        }
    }
    /* ======================================
       RENDER TOURNAMENTS
    ====================================== */
    function renderLoading() {
        const list = $("#tournament-list");
        if (!list) return;
        list.innerHTML = `
            <div class="empty-state">
                กำลังโหลดรายการแข่งขัน...
            </div>
        `;
    }
    function renderError(message) {
        const list = $("#tournament-list");
        if (!list) return;
        list.innerHTML = `
            <div class="empty-state">
                ${escapeHTML(message)}
            </div>
        `;
    }
    function renderTournaments() {
        const list = $("#tournament-list");
        if (!list) return;
        let tournaments = [...state.tournaments];
        if (state.filter !== "all") {
            tournaments = tournaments.filter(
                tournament =>
                    getTournamentStatus(tournament) ===
                    state.filter
            );
        }
        if (tournaments.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    ไม่พบรายการแข่งขัน
                </div>
            `;
            return;
        }
        list.innerHTML = tournaments
            .map(renderTournamentCard)
            .join("");
    }
    function renderTournamentCard(tournament) {
        const id = getTournamentID(tournament);
        const name = getTournamentName(tournament);
        const matchType = getMatchType(tournament);
        const status = getTournamentStatus(tournament);
        const maxSlots = getMaxSlots(tournament);
        const map = tournament.map ||
            tournament.map_name ||
            "ไม่ระบุแผนที่";
        const mode = tournament.mode ||
            tournament.game_mode ||
            "normal";
        const startDate = getTournamentDate(tournament);
        const prize = getPrize(tournament);
        const description =
            tournament.description ||
            "ไม่มีรายละเอียดการแข่งขัน";
        const adminButton = state.isAdmin
            ? `
                <button
                    type="button"
                    class="btn-primary tournament-manage-btn"
                    data-action="manage"
                    data-id="${escapeHTML(id)}"
                >
                    <span class="material-symbols-rounded">
                        settings
                    </span>
                    Manage
                </button>
            `
            : "";
        return `
            <article class="tournament-card">
                <div class="tournament-card-top">
                    <span class="tournament-status
                        ${getStatusClass(status)}">
                        ${getStatusLabel(status)}
                    </span>
                    <span class="tournament-match-type">
                        ${escapeHTML(matchType.toUpperCase())}
                    </span>
                </div>
                <div class="tournament-card-body">
                    <h3 class="tournament-card-title">
                        ${escapeHTML(name)}
                    </h3>
                    <p class="tournament-card-description">
                        ${escapeHTML(description)}
                    </p>
                    <div class="tournament-card-info">
                        <div class="tournament-info-item">
                            <span class="material-symbols-rounded">
                                map
                            </span>
                            <span>
                                ${escapeHTML(map)}
                            </span>
                        </div>
                        <div class="tournament-info-item">
                            <span class="material-symbols-rounded">
                                groups
                            </span>
                            <span>
                                ${maxSlots > 0
                                    ? `${maxSlots} สล็อต`
                                    : "ไม่ระบุสล็อต"}
                            </span>
                        </div>
                        <div class="tournament-info-item">
                            <span class="material-symbols-rounded">
                                calendar_month
                            </span>
                            <span>
                                ${escapeHTML(formatDate(startDate))}
                            </span>
                        </div>
                        <div class="tournament-info-item">
                            <span class="material-symbols-rounded">
                                sports_esports
                            </span>
                            <span>
                                ${escapeHTML(
                                    mode === "wow"
                                        ? "WOW"
                                        : "NORMAL"
                                )}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="tournament-card-footer">
                    <div class="tournament-prize">
                        <small>PRIZE POOL</small>
                        <strong>
                            ${escapeHTML(formatCurrency(prize))}
                        </strong>
                    </div>
                    ${adminButton}
                </div>
            </article>
        `;
    }
    /* ======================================
       CREATE TOURNAMENT
    ====================================== */
    function openModal(modalID) {
        const modal = document.getElementById(modalID);
        if (!modal) return;
        modal.classList.remove("hidden");
        document.body.classList.add("modal-open");
    }
    function closeModal(modalID) {
        const modal = document.getElementById(modalID);
        if (!modal) return;
        modal.classList.add("hidden");
        const openedModal =
            document.querySelector(".modal:not(.hidden)");
        if (!openedModal) {
            document.body.classList.remove("modal-open");
        }
    }
    async function createTournament(event) {
        event.preventDefault();
        if (!state.isAdmin) {
            showToast(
                "Admin เท่านั้นที่สร้างรายการได้",
                "error"
            );
            return;
        }
        if (state.saving) return;
        const name = $("#tournament-name")?.value.trim();
        const matchType =
            $("#tournament-match-type")?.value;
        const maxSlots =
            Number($("#tournament-max-teams")?.value);
        const map =
            $("#tournament-map")?.value;
        const mode =
            $("#tournament-mode")?.value;
        const description =
            $("#tournament-description")?.value.trim();
        const rules =
            $("#tournament-rules")?.value.trim();
        const prize =
            Number($("#tournament-prize")?.value);
        const startDate =
            $("#tournament-start")?.value;
        if (!name) {
            showToast(
                "กรุณากรอกชื่อรายการแข่งขัน",
                "error"
            );
            return;
        }
        if (
            !["solo", "duo", "squad"].includes(matchType)
        ) {
            showToast(
                "รูปแบบการแข่งขันไม่ถูกต้อง",
                "error"
            );
            return;
        }
        if (
            !Number.isInteger(maxSlots) ||
            maxSlots < 1 ||
            maxSlots > 100
        ) {
            showToast(
                "จำนวนสล็อตต้องอยู่ระหว่าง 1–100",
                "error"
            );
            return;
        }
        if (!Number.isFinite(prize) || prize < 0) {
            showToast(
                "เงินรางวัลไม่ถูกต้อง",
                "error"
            );
            return;
        }
        const saveButton =
            $("#save-tournament-btn");
        state.saving = true;
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.classList.add("loading");
        }
        try {
            /*
              NOTE:
              ตรวจสอบชื่อ Column ให้ตรงกับ
              Table s2n_tournaments ใน Supabase
            */
            const tournamentData = {
                tournament_name: name,
                match_type: matchType,
                max_teams: maxSlots,
                map: map,
                mode: mode,
                description: description,
                rules: rules,
                prize_pool: prize,
                status: "upcoming",
                created_by: state.user?.id || null
            };
            if (startDate) {
                tournamentData.start_at =
                    new Date(startDate).toISOString();
            }
            const { data, error } = await supabase
                .from("s2n_tournaments")
                .insert(tournamentData)
                .select()
                .single();
            if (error) {
                throw error;
            }
            console.log(
                "Tournament created:",
                data
            );
            $("#create-tournament-form")?.reset();
            closeModal("create-modal");
            showToast(
                "สร้างรายการแข่งขันสำเร็จ",
                "success"
            );
            await loadData();
        } catch (error) {
            console.error(
                "Create tournament error:",
                error
            );
            showToast(
                error.message ||
                "สร้างรายการแข่งขันไม่สำเร็จ",
                "error"
            );
        } finally {
            state.saving = false;
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.classList.remove("loading");
            }
        }
    }
    /* ======================================
       EVENTS
    ====================================== */
    function bindEvents() {
        /* Refresh */
        $("#refresh-btn")?.addEventListener(
            "click",
            async () => {
                const button = $("#refresh-btn");
                if (state.loading) return;
                button?.classList.add("loading");
                if (button) {
                    button.disabled = true;
                }
                try {
                    await loadData();
                } finally {
                    button?.classList.remove("loading");
                    if (button) {
                        button.disabled = false;
                    }
                }
            }
        );
        /* Create Button */
        $("#create-tournament-btn")?.addEventListener(
            "click",
            () => {
                if (!state.isAdmin) {
                    showToast(
                        "Admin เท่านั้น",
                        "error"
                    );
                    return;
                }
                openModal("create-modal");
            }
        );
        /* Create Form */
        $("#create-tournament-form")?.addEventListener(
            "submit",
            createTournament
        );
        /* Filters */
        document.querySelectorAll(".filter-btn")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        document.querySelectorAll(".filter-btn")
                            .forEach(item => {
                                item.classList.remove("active");
                            });
                        button.classList.add("active");
                        state.filter =
                            button.dataset.filter || "all";
                        renderTournaments();
                    }
                );
            });
        /* Modal Close + Admin Manage */
        document.addEventListener(
            "click",
            event => {
                const closeButton =
                    event.target.closest("[data-close]");
                if (closeButton) {
                    closeModal(
                        closeButton.dataset.close
                    );
                    return;
                }
                const actionButton =
                    event.target.closest("[data-action]");
                if (!actionButton) return;
                if (
                    actionButton.dataset.action === "manage"
                ) {
                    if (!state.isAdmin) {
                        showToast(
                            "Admin เท่านั้น",
                            "error"
                        );
                        return;
                    }
                    const tournamentID =
                        actionButton.dataset.id;
                    if (!tournamentID) {
                        showToast(
                            "ไม่พบ ID รายการแข่งขัน",
                            "error"
                        );
                        return;
                    }
                    window.location.href =
                        "admin/tournament-control.html?tournament_id=" +
                        encodeURIComponent(tournamentID);
                }
            }
        );
        /* Escape Key */
        document.addEventListener(
            "keydown",
            event => {
                if (event.key !== "Escape") return;
                document.querySelectorAll(
                    ".modal:not(.hidden)"
                ).forEach(modal => {
                    closeModal(modal.id);
                });
            }
        );
    }
    /* ======================================
       INITIALIZE
    ====================================== */
    async function initialize() {
        bindEvents();
        await loadCurrentUser();
        await loadData();
        console.log(
            "S2N HUB Tournament initialized."
        );
    }
    initialize();
})();