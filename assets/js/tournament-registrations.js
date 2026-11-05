
/* ==========================================
   S2N HUB - TOURNAMENT REGISTRATIONS
   ADMIN TEAM ROSTER
========================================== */

document.addEventListener("DOMContentLoaded", initTournamentRegistrations);

async function initTournamentRegistrations() {
  const supabase = window.supabaseClient;

  const tournamentSelect = document.getElementById("tournament-select");
  const registrationList = document.getElementById("registration-list");
  const registrationCount = document.getElementById("registration-count");
  const registrationMessage = document.getElementById("registration-message");

  if (!supabase) {
    showMessage("ไม่พบ Supabase Client");
    return;
  }

  // =========================
  // CHECK AUTH
  // =========================

  try {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      window.location.replace("../index.html");
      return;
    }

    // ใช้ user_id ตามระบบ Admin เดิม
    const { data: profile, error: profileError } = await supabase
      .from("s2n_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile || profile.role !== "admin") {
      window.location.replace("../dashboard.html");
      return;
    }

    await loadTournaments();

  } catch (error) {
    console.error("Admin Auth Error:", error);
    showMessage("ตรวจสอบสิทธิ์ไม่สำเร็จ: " + error.message);
  }

  // =========================
  // LOAD TOURNAMENTS
  // =========================

  async function loadTournaments() {
    tournamentSelect.innerHTML =
      '<option value="">กำลังโหลดรายการ...</option>';

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

      registrationCount.textContent = "0 ทีม";
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

    tournamentSelect.addEventListener("change", function () {
      loadRegistrations(this.value);
    });

    showMessage("เลือกรายการแข่งขันเพื่อดูรายชื่อทีม");
  }

  // =========================
  // LOAD APPROVED ENTRIES
  // =========================

  async function loadRegistrations(tournamentId) {
    registrationList.innerHTML = "";
    registrationCount.textContent = "0 ทีม";

    if (!tournamentId) {
      registrationList.innerHTML =
        '<div class="registration-empty">กรุณาเลือกรายการแข่งขัน</div>';

      showMessage("");
      return;
    }

    showMessage("กำลังโหลดรายชื่อทีม...");

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
      .eq("entry_status", "approved")
      .order("registered_at", { ascending: true });

    if (error) {
      console.error("Load Registration Error:", error);

      registrationList.innerHTML =
        '<div class="registration-empty">โหลดข้อมูลไม่สำเร็จ</div>';

      showMessage("เกิดข้อผิดพลาด: " + error.message);
      return;
    }

    const entries = data || [];

    registrationCount.textContent = `${entries.length} ทีม`;

    if (entries.length === 0) {
      registrationList.innerHTML =
        '<div class="registration-empty">ยังไม่มีทีมที่ได้รับอนุมัติ</div>';

      showMessage("ไม่พบทีมที่ได้รับอนุมัติในรายการนี้");
      return;
    }

    registrationList.innerHTML = entries
      .map((entry, index) => renderRegistration(entry, index))
      .join("");

    // =========================
    // COPY BUTTON
    // =========================

    registrationList
      .querySelectorAll(".copy-registration-btn")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const index = Number(button.dataset.index);
          const entry = entries[index];

          if (!entry) return;

          const text = createAnnouncement(entry);

          try {
            await navigator.clipboard.writeText(text);

            const originalText = button.textContent;

            button.textContent = "คัดลอกแล้ว ✓";

            setTimeout(() => {
              button.textContent = originalText;
            }, 1500);

          } catch (error) {
            console.error("Clipboard Error:", error);

            showMessage(
              "คัดลอกไม่สำเร็จ กรุณาเปิดผ่าน HTTPS"
            );
          }
        });
      });

    showMessage(`พบทีมที่ได้รับอนุมัติ ${entries.length} ทีม`);
  }

  // =========================
  // GET TEAM ROSTER
  // =========================

  function getRoster(entry) {
    const members = Array.isArray(entry.members)
      ? [...entry.members]
      : [];

    members.sort((a, b) => {
      return Number(a.position ?? 99) - Number(b.position ?? 99);
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

  // =========================
  // RENDER TEAM CARD
  // =========================

  function renderRegistration(entry, index) {
    const { mainPlayers, substitute } = getRoster(entry);

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

          <span class="registration-status">
            APPROVED
          </span>
        </div>

        <div class="registration-roster">
          ${playerHTML}
          ${substituteHTML}
        </div>

        <div class="registration-date">
          Date created : ${escapeHTML(formatDate(entry.registered_at))}
        </div>

        <button
          type="button"
          class="copy-registration-btn"
          data-index="${index}"
        >
          COPY TEAM INFO
        </button>

      </article>
    `;
  }

  // =========================
  // CREATE ANNOUNCEMENT
  // =========================

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

  // =========================
  // DATE FORMAT
  // =========================

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

  // =========================
  // HTML ESCAPE
  // =========================

  function escapeHTML(value) {
    return String(value ?? "-").replace(/[&<>"']/g, (char) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[char];
    });
  }

  // =========================
  // MESSAGE
  // =========================

  function showMessage(message) {
    registrationMessage.textContent = message;
  }
}
