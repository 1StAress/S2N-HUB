/* S2N HUB TOURNAMENT V3 */
(() => {
    "use strict";
    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("[S2N Tournament] Supabase client not found.");
        return;
    }
    const $ = selector => document.querySelector(selector);
    const state = {
        user: null,
        profile: null,
        isAdmin: false,
        tournaments: [],
        filter: "all",
        loading: false
    };
    const statusLabels = {
        upcoming: "UPCOMING",
        registration: "REGISTRATION",
        ongoing: "ONGOING",
        completed: "COMPLETED"
    };
    const matchTypeLabels = {
        solo: "SOLO",
        duo: "DUO",
        squad: "SQUAD"
    };
    const playersPerSlot = {
        solo: 1,
        duo: 2,
        squad: 4
    };
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
        if (Number.isNaN(date.getTime())) {
            return "ยังไม่กำหนด";
        }
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
        toast._timer = setTimeout(() => {
            toast.classList.remove("show");
        }, 3500);
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
        const modalBox = modal.querySelector(".modal-box");
        if (modalBox) {
            modalBox.scrollTop = 0;
        }
    }
    function closeModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.add("hidden");
        if (!document.querySelector(".modal:not(.hidden)")) {
            document.body.classList.remove("modal-open");
        }
    }
    function getTournamentStatus(tournament) {
        if (tournament.status === "completed") {
            return "completed";
        }
        if (tournament.status === "ongoing") {
            return "ongoing";
        }
        const start = tournament.tournament_start;
        if (start && new Date(start) < new Date()) {
            return "ongoing";
        }
        return "upcoming";
    }
    function getSlotCount(tournament) {
        return Number(
            tournament.max_teams ||
            tournament.random_slots ||
            0
        );
    }
    function getTotalPlayers(tournament) {
        const type = tournament.match_type || "squad";
        return getSlotCount(tournament) *
            (playersPerSlot[type] || 1);
    }
    /* AUTH */
    async function initialize() {
        try {
            const {
                data: { user },
                error
            } = await supabase.auth.getUser();
            if (error || !user) {
                showToast("กรุณาเข้าสู่ระบบก่อน", "error");
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1200);
                return;
            }
            state.user = user;
            const {
                data: profile,
                error: profileError
            } = await supabase
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
            if (window.APP) {
                window.APP.profile = profile;
            }
            const roleBadge = $("#user-role-badge");
            const createButton = $("#create-tournament-btn");
            if (roleBadge) {
                roleBadge.textContent = state.isAdmin
                    ? "ADMIN"
                    : "MEMBER";
            }
            if (createButton) {
                createButton.classList.toggle(
                    "hidden",
                    !state.isAdmin
                );
            }
            await loadData();
        } catch (error) {
            console.error("[Tournament] Initialize error:", error);
            showToast("ไม่สามารถเริ่มระบบแข่งขันได้", "error");
        }
    }
    /* LOAD DATA */
    async function loadData() {
        if (state.loading) return;
        state.loading = true;
        const container = $("#tournament-list");
        try {
            const { data, error } = await supabase
                .from("s2n_tournaments")
                .select("*")
                .order("created_at", {
                    ascending: false
                });
            if (error) throw error;
            state.tournaments = data || [];
            renderStats();
            renderTournaments();
        } catch (error) {
            console.error("[Tournament] Load error:", error);
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        โหลดรายการแข่งขันไม่สำเร็จ
                        <p>${escapeHTML(error.message)}</p>
                    </div>
                `;
            }
            showToast("โหลดข้อมูลไม่สำเร็จ", "error");
        } finally {
            state.loading = false;
        }
    }
    /* STATS */
    function renderStats() {
        const tournamentStat = $("#stat-tournaments");
        const playersStat = $("#stat-teams");
        const prizeStat = $("#stat-prize");
        if (tournamentStat) {
            tournamentStat.textContent =
                state.tournaments.length.toLocaleString("th-TH");
        }
        const totalPlayers = state.tournaments.reduce(
            (total, tournament) => {
                return total + getTotalPlayers(tournament);
            },
            0
        );
        if (playersStat) {
            playersStat.textContent =
                totalPlayers.toLocaleString("th-TH");
        }
        const latestTournament = state.tournaments[0];
        if (prizeStat) {
            prizeStat.textContent =
                `฿${formatMoney(latestTournament?.prize_pool)}`;
        }
    }
    /* TOURNAMENT LIST */
    function renderTournaments() {
        const container = $("#tournament-list");
        if (!container) return;
        let tournaments = [...state.tournaments];
        if (state.filter !== "all") {
            tournaments = tournaments.filter(tournament => {
                return getTournamentStatus(tournament) === state.filter;
            });
        }
        if (!tournaments.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-rounded">
                        emoji_events
                    </span>
                    <p>ไม่มีรายการแข่งขันในหมวดนี้</p>
                </div>
            `;
            return;
        }
        container.innerHTML = tournaments.map(tournament => {
            const status = getTournamentStatus(tournament);
            const matchType = tournament.match_type || "squad";
            const slots = getSlotCount(tournament);
            const totalPlayers = getTotalPlayers(tournament);
            const actionHTML = state.isAdmin
                ? `
                    <button
                        class="btn-admin"
                        data-action="manage"
                        data-id="${tournament.id}"
                        type="button"
                    >
                        <span class="material-symbols-rounded">
                            groups
                        </span>
                        จัดการสล็อต
                    </button>
                `
                : `
                    <span class="member-event-note">
                        <span class="material-symbols-rounded">
                            info
                        </span>
                        ผู้เล่นจะถูกจัดโดย Admin
                    </span>
                `;
            return `
                <article
                    class="tournament-card"
                    data-id="${tournament.id}"
                >
                    <div class="tournament-card-header">
                        <div class="tournament-game-icon">
                            <span class="material-symbols-rounded">
                                sports_esports
                            </span>
                        </div>
                        <div class="tournament-card-title">
                            <h4>
                                ${escapeHTML(tournament.tournament_name)}
                            </h4>
                            <p>PUBG MOBILE</p>
                        </div>
                        <span class="status-badge status-${status}">
                            ${escapeHTML(statusLabels[status] || status)}
                        </span>
                    </div>
                    <div class="tournament-card-info">
                        <div class="info-item">
                            <span class="material-symbols-rounded">
                                groups
                            </span>
                            <span>
                                ${escapeHTML(
                                    matchTypeLabels[matchType] || matchType
                                )}
                            </span>
                        </div>
                        <div class="info-item">
                            <span class="material-symbols-rounded">
                                grid_view
                            </span>
                            <span>
                                ${slots} SLOT
                            </span>
                        </div>
                        <div class="info-item">
                            <span class="material-symbols-rounded">
                                map
                            </span>
                            <span>
                                ${escapeHTML(tournament.map_name || "Erangel")}
                            </span>
                        </div>
                        <div class="info-item">
                            <span class="material-symbols-rounded">
                                event
                            </span>
                            <span>
                                ${formatDate(tournament.tournament_start)}
                            </span>
                        </div>
                    </div>
                    <div class="tournament-card-prize">
                        <div>
                            <small>เงินรางวัลรวม</small>
                            <strong>
                                ฿${formatMoney(tournament.prize_pool)}
                            </strong>
                        </div>
                        <div>
                            <small>จำนวนผู้เล่นสูงสุด</small>
                            <strong>
                                ${totalPlayers} PLAYERS
                            </strong>
                        </div>
                    </div>
                    <div class="tournament-card-footer">
                        ${actionHTML}
                    </div>
                </article>
            `;
        }).join("");
    }
    /* CREATE TOURNAMENT */
    async function createTournament(event) {
        event.preventDefault();
        if (!state.isAdmin) {
            showToast("Admin เท่านั้น", "error");
            return;
        }
        const button = $("#save-tournament-btn");
        const name = $("#tournament-name")?.value.trim();
        const matchType =
            $("#tournament-match-type")?.value || "squad";
        const mapName =
            $("#tournament-map")?.value || "Erangel";
        const tournamentMode =
            $("#tournament-mode")?.value || "normal";
        const description =
            $("#tournament-description")?.value.trim() || "";
        const rules =
            $("#tournament-rules")?.value.trim() || "";
        const prizePool =
            Number($("#tournament-prize")?.value || 0);
        const slotCount =
            Number($("#tournament-max-teams")?.value || 0);
        const startValue =
            $("#tournament-start")?.value || "";
        const startDate = startValue
            ? new Date(startValue).toISOString()
            : null;
        if (!name) {
            showToast("กรุณากรอกชื่อการแข่งขัน", "error");
            return;
        }
        if (!["solo", "duo", "squad"].includes(matchType)) {
            showToast("รูปแบบการแข่งขันไม่ถูกต้อง", "error");
            return;
        }
        if (
            !Number.isInteger(slotCount) ||
            slotCount < 1 ||
            slotCount > 100
        ) {
            showToast("จำนวนสล็อตต้องอยู่ระหว่าง 1–100", "error");
            return;
        }
        if (prizePool < 0 || !Number.isFinite(prizePool)) {
            showToast("เงินรางวัลไม่ถูกต้อง", "error");
            return;
        }
        const payload = {
            tournament_name: name,
            game: "PUBG Mobile",
            match_type: matchType,
            map_name: mapName,
            description,
            rules,
            prize_pool: prizePool,
            tournament_start: startDate,
            max_teams: slotCount,
            random_slots: slotCount,
            random_players_per_slot: playersPerSlot[matchType],
            mode: tournamentMode,
            status: "upcoming",
            created_by: state.user.id
        };
        setButtonLoading(button, true);
        try {
            const { error } = await supabase
                .from("s2n_tournaments")
                .insert(payload);
            if (error) throw error;
            closeModal("create-modal");
            $("#create-tournament-form")?.reset();
            if ($("#tournament-max-teams")) {
                $("#tournament-max-teams").value = "16";
            }
            if ($("#tournament-match-type")) {
                $("#tournament-match-type").value = "squad";
            }
            showToast("สร้างรายการแข่งขันสำเร็จ!", "success");
            await loadData();
        } catch (error) {
            console.error("[Tournament] Create error:", error);
            showToast(
                error.message || "สร้างรายการแข่งขันไม่สำเร็จ",
                "error"
            );
        } finally {
            setButtonLoading(button, false);
        }
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
        $("#create-tournament-btn")?.addEventListener(
            "click",
            () => {
                if (state.isAdmin) {
                    openModal("create-modal");
                }
            }
        );
        $("#create-tournament-form")?.addEventListener(
            "submit",
            createTournament
        );
        document.querySelectorAll(".filter-btn").forEach(button => {
            button.addEventListener("click", () => {
                document.querySelectorAll(".filter-btn").forEach(item => {
                    item.classList.remove("active");
                });
                button.classList.add("active");
                state.filter = button.dataset.filter || "all";
                renderTournaments();
            });
        });
        document.addEventListener("click", event => {
            const closeButton = event.target.closest("[data-close]");
            if (closeButton) {
                closeModal(closeButton.dataset.close);
                return;
            }
            const actionButton = event.target.closest("[data-action]");
            if (!actionButton) return;
            const action = actionButton.dataset.action;
            if (action === "manage") {
                if (!state.isAdmin) {
                    showToast("Admin เท่านั้น", "error");
                    return;
                }
                showToast(
                    "ขั้นตอนถัดไปจะเปิดหน้าจัดการสล็อต",
                    "info"
                );
            }
        });
        document.addEventListener("keydown", event => {
            if (event.key !== "Escape") return;
            document.querySelectorAll(".modal:not(.hidden)").forEach(modal => {
                closeModal(modal.id);
            });
        });
    }
    bindEvents();
    initialize();
})();