/* ==========================================
   S2N HUB - MY TEAMS V2.0
   Supabase Connected
   Leader + Member Support
========================================== */

(() => {
    "use strict";

    const supabase = window.supabaseClient;

    const teamList = document.getElementById("my-team-list");
    const teamSearch = document.getElementById("team-search");
    const emptyState = document.getElementById("my-team-empty");

    let myTeams = [];
    let currentUser = null;

    console.log("[S2N My Teams] Initialized.");

    // ======================================
    // DOM HELPERS
    // ======================================

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const setText = (id, value) => {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = String(value);
        }
    };

    // ======================================
    // EMPTY STATE
    // Preserve original HTML structure
    // ======================================

    function showEmptyState(title, description, showCTA = false) {
        if (!emptyState) return;

        const heading = $("h3", emptyState);
        const paragraph = $("p", emptyState);

        const cta = $("a", emptyState);

        if (heading) {
            heading.textContent = title;
        }

        if (paragraph) {
            paragraph.textContent = description;
        }

        if (cta) {
            cta.classList.toggle("hidden", !showCTA);
        }

        emptyState.classList.remove("hidden");
    }

    function hideEmptyState() {
        if (!emptyState) return;

        emptyState.classList.add("hidden");
    }

    // ======================================
    // PLAYER ROW
    // ======================================

    function createPlayerRow(name, role, isReserve = false) {
        const row = document.createElement("div");
        row.className = "my-team-player";

        const playerName = document.createElement("span");
        playerName.className = "my-team-player-name";
        playerName.textContent = name || "UNKNOWN";

        const playerRole = document.createElement("span");

        playerRole.className =
            `my-team-player-role${isReserve ? " reserve" : ""}`;

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

        const mainHeading = document.createElement("div");
        mainHeading.className = "my-team-roster-heading";
        mainHeading.textContent = "MAIN ROSTER";

        roster.appendChild(mainHeading);

        const members = [...(team.members || [])];

        const mainMembers = members
            .filter(member =>
                member.role === "leader" ||
                member.role === "main"
            )
            .sort((a, b) => {
                return (a.position || 0) - (b.position || 0);
            });

        mainMembers.forEach(member => {
            const role =
                member.role === "leader"
                    ? "LEADER"
                    : "MAIN";

            roster.appendChild(
                createPlayerRow(member.pubg_name, role)
            );
        });

        // Substitute roster
        const substitutes = members
            .filter(member => member.role === "substitute")
            .sort((a, b) => {
                return (a.position || 0) - (b.position || 0);
            });

        if (substitutes.length > 0) {
            const subHeading = document.createElement("div");

            subHeading.className = "my-team-roster-heading";
            subHeading.textContent = "SUBSTITUTE";

            roster.appendChild(subHeading);

            substitutes.forEach(member => {
                roster.appendChild(
                    createPlayerRow(
                        member.pubg_name,
                        "RESERVE",
                        true
                    )
                );
            });
        }

        // Footer
        const footer = document.createElement("div");
        footer.className = "my-team-card-footer";

        const teamId = document.createElement("span");
        teamId.textContent = team.id || "";

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
        const teamCount = teams.length;

        let mainCount = 0;
        let subCount = 0;

        teams.forEach(team => {
            const members = team.members || [];

            mainCount += members.filter(member =>
                member.role === "leader" ||
                member.role === "main"
            ).length;

            subCount += members.filter(
                member => member.role === "substitute"
            ).length;
        });

        setText("my-team-count", teamCount);
        setText("main-roster-count", mainCount);
        setText("sub-roster-count", subCount);
    }

    // ======================================
    // SEARCH + RENDER
    // ======================================

    function renderMyTeams() {
        if (!teamList || !teamSearch || !emptyState) {
            return;
        }

        const keyword = teamSearch.value
            .trim()
            .toLowerCase();

        const filteredTeams = myTeams.filter(team => {
            const teamName = (team.team_name || "").toLowerCase();
            const teamTag = (team.team_tag || "").toLowerCase();
            const leaderName = (team.leader_name || "").toLowerCase();

            return (
                teamName.includes(keyword) ||
                teamTag.includes(keyword) ||
                leaderName.includes(keyword)
            );
        });

        teamList.innerHTML = "";

        if (filteredTeams.length === 0) {
            if (myTeams.length === 0) {
                showEmptyState(
                    "ยังไม่มีทีมของคุณ",
                    "คุณยังไม่ได้เป็นหัวหน้าทีมหรือสมาชิกของทีมใด",
                    true
                );
            } else {
                showEmptyState(
                    "ไม่พบทีมที่ตรงกับคำค้นหา",
                    "ลองค้นหาด้วยชื่อทีม หรือ TAG ใหม่อีกครั้ง",
                    false
                );
            }

            return;
        }

        hideEmptyState();

        filteredTeams.forEach(team => {
            teamList.appendChild(createTeamCard(team));
        });
    }

    // ======================================
    // LOAD USER
    // ======================================

    async function getCurrentUser() {
        const {
            data: { user },
            error
        } = await supabase.auth.getUser();

        if (error) {
            throw error;
        }

        if (!user) {
            window.location.href = "../login.html";
            return null;
        }

        return user;
    }

    // ======================================
    // LOAD TEAM IDS
    // ======================================

    async function loadTeamIds(userId) {
        // Teams where user is leader
        const {
            data: leaderTeams,
            error: leaderError
        } = await supabase
            .from("s2n_teams")
            .select("id")
            .eq("leader_id", userId);

        if (leaderError) {
            throw leaderError;
        }

        // Teams where user is a member
        const {
            data: memberTeams,
            error: memberError
        } = await supabase
            .from("s2n_team_members")
            .select("team_id")
            .eq("user_id", userId);

        if (memberError) {
            throw memberError;
        }

        const leaderIds = (leaderTeams || [])
            .map(team => team.id);

        const memberIds = (memberTeams || [])
            .map(member => member.team_id);

        // Merge and remove duplicates
        const uniqueTeamIds = [
            ...new Set([
                ...leaderIds,
                ...memberIds
            ])
        ];

        console.log("[S2N My Teams] Leader teams:", leaderIds);
        console.log("[S2N My Teams] Member teams:", memberIds);
        console.log("[S2N My Teams] Unique team IDs:", uniqueTeamIds);

        return uniqueTeamIds;
    }

    // ======================================
    // LOAD TEAM DETAILS
    // ======================================

    async function loadTeamDetails(teamIds) {
        if (!teamIds.length) {
            return [];
        }

        const {
            data,
            error
        } = await supabase
            .from("s2n_teams")
            .select(`
                id,
                team_name,
                team_tag,
                game,
                description,
                leader_id,
                status,
                created_at,
                s2n_team_members (
                    id,
                    user_id,
                    pubg_name,
                    role,
                    position,
                    created_at
                )
            `)
            .in("id", teamIds)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        return (data || []).map(team => {
            const members = team.s2n_team_members || [];

            const leader = members.find(member =>
                member.role === "leader"
            );

            return {
                ...team,
                members,

                leader_name: leader
                    ? leader.pubg_name
                    : "UNKNOWN"
            };
        });
    }

    // ======================================
    // LOAD MY TEAMS
    // ======================================

    async function loadMyTeams() {
        console.log("[S2N My Teams] Loading...");

        if (!supabase || typeof supabase.from !== "function") {
            console.error("[S2N My Teams] Supabase client unavailable.");

            showEmptyState(
                "Supabase ไม่พร้อมใช้งาน",
                "ไม่สามารถเชื่อมต่อระบบฐานข้อมูลได้",
                false
            );

            return;
        }

        try {
            currentUser = await getCurrentUser();

            if (!currentUser) {
                return;
            }

            const teamIds = await loadTeamIds(currentUser.id);

            myTeams = await loadTeamDetails(teamIds);

            console.log(
                "[S2N My Teams] Loaded teams:",
                myTeams
            );

            updateOverview(myTeams);

            renderMyTeams();

        } catch (error) {
            console.error(
                "[S2N My Teams] Load error:",
                error
            );

            showEmptyState(
                "ไม่สามารถโหลดข้อมูลทีมได้",
                error.message || "กรุณาลองใหม่อีกครั้ง",
                false
            );
        }
    }

    // ======================================
    // SEARCH EVENT
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

})();