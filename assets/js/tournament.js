
document.addEventListener("DOMContentLoaded", async () => {
  const db = window.supabaseClient;

  const el = {
    createButton: document.getElementById("create-tournament-btn"),
    refreshButton: document.getElementById("refresh-btn"),
    tournamentList: document.getElementById("tournament-list"),
    modal: document.getElementById("create-modal"),
    form: document.getElementById("create-tournament-form"),
    saveButton: document.getElementById("save-tournament-btn"),
    roleBadge: document.getElementById("user-role-badge"),
    statTournaments: document.getElementById("stat-tournaments"),
    statTeams: document.getElementById("stat-teams"),
    statPrize: document.getElementById("stat-prize")
  };

  const state = {
    user: null,
    member: null,
    isAdmin: false,
    tournaments: [],
    filter: "all",
    loading: false
  };

  if (!db) {
    console.error("S2N HUB: Supabase Client not found.");
    showMessage("ไม่พบ Supabase Client");
    return;
  }

  function showMessage(message, type = "error") {
    let box = document.getElementById("tournament-message");

    if (!box) {
      box = document.createElement("div");
      box.id = "tournament-message";

      Object.assign(box.style, {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "999999",
        padding: "14px 20px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: "600",
        maxWidth: "90%",
        textAlign: "center",
        boxShadow: "0 8px 30px rgba(0,0,0,0.4)"
      });

      document.body.appendChild(box);
    }

    box.textContent = message;
    box.style.background = type === "success" ? "#16a34a" : "#b91c1c";
    box.style.color = "#ffffff";
    box.style.display = "block";

    clearTimeout(box.hideTimer);

    box.hideTimer = setTimeout(() => {
      box.style.display = "none";
    }, 3500);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function openModal() {
    if (!el.modal) {
      showMessage("ไม่พบ Create Tournament Modal");
      return;
    }

    el.modal.classList.add("active");
    el.modal.style.setProperty("display", "flex", "important");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!el.modal) return;

    el.modal.classList.remove("active");
    el.modal.style.removeProperty("display");
    document.body.style.overflow = "";
  }

  function formatDate(value) {
    if (!value) return "ไม่ระบุวันแข่งขัน";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "ไม่ระบุวันแข่งขัน";
    }

    return date.toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function formatPrize(value) {
    return Number(value || 0).toLocaleString("th-TH") + " RP";
  }

  function getMatchType(value) {
    const types = {
      solo: "SOLO",
      duo: "DUO",
      squad: "SQUAD"
    };

    return types[String(value || "").toLowerCase()] || "PUBG";
  }

  function getStatus(value) {
    const statuses = {
      upcoming: "กำลังจะเริ่ม",
      registration: "เปิดรับสมัคร",
      ongoing: "กำลังแข่งขัน",
      completed: "สิ้นสุดกิจกรรม"
    };

    return statuses[String(value || "").toLowerCase()] || value;
  }

  function updateStats() {
    if (el.statTournaments) {
      el.statTournaments.textContent = state.tournaments.length;
    }

    if (el.statTeams) {
      const totalSlots = state.tournaments.reduce((total, item) => {
        return total + Number(item.random_slots || 0);
      }, 0);

      el.statTeams.textContent = totalSlots;
    }

    if (el.statPrize) {
      const totalPrize = state.tournaments.reduce((total, item) => {
        return total + Number(item.prize_pool || 0);
      }, 0);

      el.statPrize.textContent =
        totalPrize.toLocaleString("th-TH") + " RP";
    }
  }

  function renderTournaments() {
    if (!el.tournamentList) return;

    const filtered = state.tournaments.filter((item) => {
      if (state.filter === "all") return true;

      return String(item.status || "").toLowerCase() === state.filter;
    });

    if (filtered.length === 0) {
      el.tournamentList.innerHTML = `
        <div class="empty-state">
          <h3>ไม่พบกิจกรรม</h3>
          <p>ยังไม่มีรายการกิจกรรมในหมวดนี้</p>
        </div>
      `;
      return;
    }

    el.tournamentList.innerHTML = filtered.map((item) => {
      const name = escapeHTML(item.tournament_name);
      const description = escapeHTML(
        item.description || "ไม่มีรายละเอียดกิจกรรม"
      );
      const rules = escapeHTML(item.rules || "ไม่มีข้อมูลกติกา");
      const map = escapeHTML(item.map_name || "Erangel");
      const status = String(item.status || "upcoming").toLowerCase();

      return `
        <article class="tournament-card">
          <div class="tournament-card-header">
            <div class="tournament-card-title">
              <span class="tournament-game-label">PUBG MOBILE</span>
              <h3>${name}</h3>
            </div>

            <span class="tournament-status ${escapeHTML(status)}">
              ${escapeHTML(getStatus(status))}
            </span>
          </div>

          <div class="tournament-card-info">
            <div class="tournament-info-item">
              <span class="info-label">รูปแบบ</span>
              <span class="info-value">
                ${getMatchType(item.match_type)}
              </span>
            </div>

            <div class="tournament-info-item">
              <span class="info-label">แผนที่</span>
              <span class="info-value">${map}</span>
            </div>

            <div class="tournament-info-item">
              <span class="info-label">เงินรางวัล</span>
              <span class="info-value">
                ${escapeHTML(formatPrize(item.prize_pool))}
              </span>
            </div>

            <div class="tournament-info-item">
              <span class="info-label">จำนวนสล็อต</span>
              <span class="info-value">
                ${Number(item.random_slots || 0)} สล็อต
              </span>
            </div>

            <div class="tournament-info-item">
              <span class="info-label">ผู้เล่นต่อสล็อต</span>
              <span class="info-value">
                ${Number(item.random_players_per_slot || 0)} คน
              </span>
            </div>

            <div class="tournament-info-item">
              <span class="info-label">จำนวนทีมสูงสุด</span>
              <span class="info-value">
                ${Number(item.max_teams || 0)} ทีม
              </span>
            </div>
          </div>

          <div class="tournament-card-description">
            <p>${description}</p>
          </div>

          <details class="tournament-rules">
            <summary>ดูรายละเอียดกติกา</summary>
            <p>${rules}</p>
          </details>

          <div class="tournament-card-footer">
            <span class="tournament-date">
              ${escapeHTML(formatDate(item.tournament_start))}
            </span>
          </div>
        </article>
      `;
    }).join("");
  }

  async function checkUserRole() {
    const { data: authData, error: authError } =
      await db.auth.getUser();

    if (authError) throw authError;

    const user = authData.user;

    if (!user) {
      window.location.href = "login.html";
      return false;
    }

    state.user = user;

    const { data: member, error: memberError } = await db
      .from("s2n_members")
      .select("id, user_id, username, display_name, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberError) throw memberError;

    if (!member) {
      showMessage("ไม่พบข้อมูลสมาชิก S2N");
      return false;
    }

    state.member = member;

    state.isAdmin =
      String(member.role || "").trim().toLowerCase() === "admin";

    if (el.roleBadge) {
      el.roleBadge.textContent = state.isAdmin ? "ADMIN" : "MEMBER";
    }

    if (el.createButton) {
      if (state.isAdmin) {
        el.createButton.classList.remove("admin-only");
        el.createButton.removeAttribute("hidden");
        el.createButton.style.setProperty(
          "display",
          "inline-flex",
          "important"
        );
      } else {
        el.createButton.style.setProperty(
          "display",
          "none",
          "important"
        );
      }
    }

    console.log("S2N Tournament Role:", {
      username: member.username,
      role: member.role,
      isAdmin: state.isAdmin
    });

    return true;
  }

  async function loadTournaments() {
    if (state.loading) return;

    state.loading = true;

    if (el.tournamentList) {
      el.tournamentList.innerHTML = `
        <div class="loading-state">
          <p>กำลังโหลดกิจกรรม...</p>
        </div>
      `;
    }

    try {
      const { data, error } = await db
        .from("s2n_tournaments")
        .select(`
          id,
          tournament_name,
          game,
          description,
          rules,
          max_teams,
          prize_pool,
          registration_start,
          registration_end,
          tournament_start,
          status,
          created_by,
          created_at,
          match_type,
          map_name,
          random_slots,
          random_players_per_slot,
          mode
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      state.tournaments = data || [];

      updateStats();
      renderTournaments();
    } catch (error) {
      console.error("Tournament Load Error:", error);

      if (el.tournamentList) {
        el.tournamentList.innerHTML = `
          <div class="error-state">
            <h3>โหลดกิจกรรมไม่สำเร็จ</h3>
            <p>${escapeHTML(error.message)}</p>
          </div>
        `;
      }

      showMessage("โหลดกิจกรรมไม่สำเร็จ");
    } finally {
      state.loading = false;
    }
  }

  async function createTournament(event) {
    event.preventDefault();

    if (!state.isAdmin) {
      showMessage("บัญชีนี้ไม่มีสิทธิ์สร้างกิจกรรม");
      return;
    }

    if (state.loading) return;

    const tournamentName =
      document.getElementById("tournament-name")?.value.trim();

    const matchType =
      document.getElementById("tournament-match-type")?.value;

    const maxTeams = Number(
      document.getElementById("tournament-max-teams")?.value || 16
    );

    const mapName =
      document.getElementById("tournament-map")?.value || "Erangel";

    const mode =
      document.getElementById("tournament-mode")?.value || "normal";

    const description =
      document.getElementById("tournament-description")?.value.trim() || "";

    const rules =
      document.getElementById("tournament-rules")?.value.trim() || "";

    const prizePool = Number(
      document.getElementById("tournament-prize")?.value || 0
    );

    const tournamentStart =
      document.getElementById("tournament-start")?.value;

    if (!tournamentName) {
      showMessage("กรุณากรอกชื่อกิจกรรม");
      return;
    }

    if (!["solo", "duo", "squad"].includes(matchType)) {
      showMessage("กรุณาเลือกรูปแบบการแข่งขัน");
      return;
    }

    if (!Number.isInteger(maxTeams) || maxTeams < 1 || maxTeams > 100) {
      showMessage("จำนวนสล็อตต้องอยู่ระหว่าง 1 ถึง 100");
      return;
    }

    if (!Number.isFinite(prizePool) || prizePool < 0) {
      showMessage("เงินรางวัลไม่ถูกต้อง");
      return;
    }

    if (!tournamentStart) {
      showMessage("กรุณากำหนดวันและเวลาแข่งขัน");
      return;
    }

    const playersPerSlot = {
      solo: 1,
      duo: 2,
      squad: 4
    }[matchType];

    const tournamentData = {
      tournament_name: tournamentName,
      game: "PUBG Mobile",
      description: description,
      rules: rules,
      max_teams: maxTeams,
      prize_pool: prizePool,
      tournament_start: new Date(tournamentStart).toISOString(),
      status: "upcoming",
      created_by: state.user.id,
      match_type: matchType,
      map_name: mapName,
      random_slots: maxTeams,
      random_players_per_slot: playersPerSlot,
      mode: mode
    };

    const originalText = el.saveButton
      ? el.saveButton.textContent
      : "สร้างกิจกรรม";

    try {
      if (el.saveButton) {
        el.saveButton.disabled = true;
        el.saveButton.textContent = "กำลังสร้าง...";
      }

      const { error } = await db
        .from("s2n_tournaments")
        .insert([tournamentData]);

      if (error) throw error;

      showMessage("สร้างกิจกรรมสำเร็จ", "success");

      if (el.form) el.form.reset();

      closeModal();

      await loadTournaments();
    } catch (error) {
      console.error("Tournament Create Error:", error);
      showMessage(error.message || "สร้างกิจกรรมไม่สำเร็จ");
    } finally {
      if (el.saveButton) {
        el.saveButton.disabled = false;
        el.saveButton.textContent = originalText;
      }
    }
  }

  function setupFilters() {
    document.querySelectorAll(".filter-btn").forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter || "all";

        document.querySelectorAll(".filter-btn").forEach((item) => {
          item.classList.toggle("active", item === button);
        });

        renderTournaments();
      });
    });
  }

  function setupModal() {
    if (el.createButton) {
      el.createButton.addEventListener("click", () => {
        if (!state.isAdmin) {
          showMessage("เฉพาะ Admin เท่านั้น");
          return;
        }

        openModal();
      });
    }

    if (el.modal) {
      el.modal.querySelectorAll("[data-close]").forEach((button) => {
        button.addEventListener("click", closeModal);
      });

      el.modal.addEventListener("click", (event) => {
        if (event.target === el.modal) {
          closeModal();
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    });
  }

  function setupRefresh() {
    if (!el.refreshButton) return;

    el.refreshButton.addEventListener("click", loadTournaments);
  }

  if (el.form) {
    el.form.addEventListener("submit", createTournament);
  }

  setupFilters();
  setupModal();
  setupRefresh();

  try {
    const authorized = await checkUserRole();

    if (!authorized) return;

    await loadTournaments();
  } catch (error) {
    console.error("Tournament Initialization Error:", error);
    showMessage("ตรวจสอบสิทธิ์ไม่สำเร็จ: " + error.message);
  }
});
