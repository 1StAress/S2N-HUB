
/* ==========================================
   S2N HUB - TOURNAMENT REGISTRATIONS
   Admin Approved Team Directory
========================================== */

document.addEventListener("DOMContentLoaded", initTournamentRegistrations);

async function initTournamentRegistrations() {
  const supabase = window.supabaseClient;

  const tournamentSelect =
    document.getElementById("tournament-select");

  const registrationList =
    document.getElementById("registration-list");

  const registrationCount =
    document.getElementById("registration-count");

  const registrationMessage =
    document.getElementById("registration-message");

  if (!supabase) {
    showMessage("ไม่พบ Supabase Client");
    return;
  }

  try {
    // 1. ตรวจสอบ Login
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      window.location.replace("../index.html");
      return;
    }

    // 2. ตรวจสอบสิทธิ์ Admin
    const {
      data: profile,
      error: profileError
    } = await supabase
      .from("s2n_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!profile || profile.role !== "admin") {
      window.location.replace("../dashboard.html");
      return;
    }

    // 3. โหลด Tournament
    const {
      data: tournaments,
      error: tournamentError
    } = await supabase
      .from("s2n_tournaments")
      .select("id, tournament_name, status, created_at")
      .order("created_at", { ascending: false });

    if (tournamentError) throw tournamentError;

    if (!tournaments || tournaments.length === 0) {
      tournamentSelect.innerHTML =
        '<option value="">ไม่พบ Tournament</option>';

      registrationList.innerHTML = `
        <div class="registration-empty">
          ยังไม่มีรายการ Tournament
        </div>
      `;

      registrationCount.textContent = "0 ทีม";
      return;
    }

    tournamentSelect.innerHTML = `
      <option value="">เลือก Tournament</option>
      ${tournaments.map(tournament => `
        <option value="${escapeHTML(tournament.id)}">
          ${escapeHTML(tournament.tournament_name)}
        </option>
      `).join("")}
    `;

    tournamentSelect.addEventListener("change", () => {
      loadTournamentEntries(tournamentSelect.value);
    });

    registrationMessage.textContent =
      "เลือก Tournament เพื่อดูรายชื่อทีมที่ได้รับอนุมัติ";

  } catch (error) {
    console.error("Tournament Registration Error:", error);
    showMessage(error.message || "โหลดข้อมูลไม่สำเร็จ");
  }

  // ==========================================
  // LOAD APPROVED ENTRIES
  // ==========================================

  async function loadTournamentEntries(tournamentId) {
    if (!tournamentId) {
      registrationList.innerHTML = `
        <div class="registration-empty">
          กรุณาเลือก Tournament
        </div>
      `;

      registrationCount.textContent = "0 ทีม";
      return;
    }

    registrationList.innerHTML = `
      <div class="registration-empty">
        กำลังโหลดรายชื่อทีม...
      </div>
    `;

    registrationMessage.textContent = "";

    try {
      const {
        data: entries,
        error
      } = await supabase
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

      if (error) throw error;

      if (!entries || entries.length === 0) {
        registrationList.innerHTML = `
          <div class="registration-empty">
            ยังไม่มีทีมที่ได้รับอนุมัติใน Tournament นี้
          </div>
        `;

        registrationCount.textContent = "0 ทีม";
        return;
      }

      registrationCount.textContent =
        `${entries.length} ทีม`;

      registrationList.innerHTML = entries
        .map(entry => renderRegistration(entry))
        .join("");

      // Copy buttons
      registrationList
        .querySelectorAll(".copy-registration-btn")
        .forEach(button => {
          button.addEventListener("click", async () => {
            const entryIndex = Number(
              button.dataset.index
            );

            const entry = entries[entryIndex];

            const text = createAnnouncement(entry);

            try {
              await navigator.clipboard.writeText(text);

              button.textContent = "COPIED!";

              setTimeout(() => {
                button.textContent = "COPY TEAM INFO";
              }, 1500);

            } catch (copyError) {
              console.error("Copy Error:", copyError);

              showMessage(
                "คัดลอกไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ Clipboard"
              );
            }
          });
        });

    } catch (error) {
      console.error("Load Entries Error:", error);

      registrationList.innerHTML = `
        <div class="registration-empty">
          โหลดข้อมูลไม่สำเร็จ
        </div>
      `;

      showMessage(
        error.message || "ไม่สามารถโหลดรายชื่อทีมได้"
      );
    }
  }

  // ==========================================
  // RENDER REGISTRATION
  // ==========================================

  function renderRegistration(entry) {
    const members = Array.isArray(entry.members)
      ? [...entry.members].sort(
          (a, b) => Number(a.position) - Number(b.position)
        )
      : [];

    const mainPlayers = members.filter(member =>
      member.role === "leader" ||
      member.role === "main"
    );

    const substitute = members.find(member =>
      member.role === "substitute"
    );

    const playerRows = mainPlayers.map(
      (member, index) => `
        <div class="registration-player">
          <span class="registration-player-label">
            P${index + 1}
          </span>

          <span>
            ${escapeHTML(member.pubg_name || "-")}
          </span>
        </div>
      `
    ).join("");

    const substituteRow = substitute
      ? `
        <div class="registration-player">
          <span class="registration-player-label">
            SUB
          </span>

          <span>
            ${escapeHTML(substitute.pubg_name || "-")}
          </span>
        </div>
      `
      : "";

    return `
      <article class="registration-card">

        <div class="registration-card-header">
          <div>
            <div class="registration-team-name">
              ${escapeHTML(entry.team_name || "Unknown Team")}
            </div>

            <div class="registration-team-tag">
              TAG: ${escapeHTML(entry.team_tag || "-")}
            </div>
          </div>

          <span class="registration-status">
            APPROVED
          </span>
        </div>

        <div class="registration-roster">
          ${playerRows}
          ${substituteRow}
        </div>

        <div class="registration-date">
          Date created:
          ${formatDate(entry.registered_at)}
        </div>

        <button
          type="button"
          class="copy-registration-btn"
          data-index="${entriesIndexPlaceholder}"
        >
          COPY TEAM INFO
        </button>

      </article>
    `;
  }

  // ==========================================
  // ANNOUNCEMENT TEXT
  // ==========================================

  function createAnnouncement(entry) {
    const members = Array.isArray(entry.members)
      ? [...entry.members].sort(
          (a, b) => Number(a.position) - Number(b.position)
        )
      : [];

    const mainPlayers = members.filter(member =>
      member.role === "leader" ||
      member.role === "main"
    );

    const lines = [
      `Tournament ${entry.tournament_name}`,
      "",
      `TEAM : ${entry.team_name || "-"}`,
      ...mainPlayers.map(
        (member, index) =>
          `P${index + 1} : ${member.pubg_name || "-"}`
      )
    ];

    const substitute = members.find(member =>
      member.role === "substitute"
    );

    if (substitute) {
      lines.push(
        `SUB : ${substitute.pubg_name || "-"}`
      );
    }

    lines.push(
      "",
      `Date created : ${formatDate(entry.registered_at)}`
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
      hourCycle: "h23"
    }).formatToParts(date);

    const get = type =>
      parts.find(part => part.type === type)?.value || "";

    return `${get("day")}/${get("month")}/${get("year")} | ${get("hour")}:${get("minute")} PM`;
  }

  // ==========================================
  // MESSAGE
  // ==========================================

  function showMessage(message) {
    registrationMessage.textContent = message;
  }

  // ==========================================
  // ESCAPE HTML
  // ==========================================

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}


document.addEventListener("DOMContentLoaded", async () => {
  const supabase = window.supabaseClient;

  const tournamentSelect = document.getElementById("tournament-select");
  const registrationCount = document.getElementById("registration-count");
  const registrationMessage = document.getElementById("registration-message");
  const registrationList = document.getElementById("registration-list");

  if (!supabase) {
    registrationMessage.textContent = "ไม่พบการเชื่อมต่อ Supabase";
    return;
  }

  // ตรวจสอบสิทธิ์ Admin
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    window.location.href = "../index.html";
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("s2n_members")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
    window.location.href = "../index.html";
    return;
  }

  let entries = [];

  // โหลดรายการ Tournament
  async function loadTournaments() {
    tournamentSelect.innerHTML =
      '<option value="">กำลังโหลดรายการแข่งขัน...</option>';

    const { data, error } = await supabase
      .from("s2n_tournaments")
      .select("id, tournament_name, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      tournamentSelect.innerHTML =
        '<option value="">โหลดรายการไม่สำเร็จ</option>';
      registrationMessage.textContent = error.message;
      return;
    }

    if (!data || data.length === 0) {
      tournamentSelect.innerHTML =
        '<option value="">ยังไม่มีรายการแข่งขัน</option>';
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
  }

  // แปลงวันที่เป็นรูปแบบ 13/11/26 : 07:39 PM
  function formatDate(dateString) {
    if (!dateString) return "-";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return "-";

    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h12"
    }).formatToParts(date);

    const get = (type) =>
      parts.find((part) => part.type === type)?.value || "";

    return `${get("day")}/${get("month")}/${get("year")} : ${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()}`;
  }

  // ป้องกัน HTML Injection
  function escapeHTML(value) {
    return String(value ?? "-").replace(/[&<>"']/g, (char) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[char];
    });
  }

  // เรียงผู้เล่นตามตำแหน่ง
  function getRoster(entry) {
    const members = Array.isArray(entry.members)
      ? [...entry.members]
      : [];

    members.sort((a, b) => {
      return Number(a.position ?? 99) - Number(b.position ?? 99);
    });

    const mainPlayers = members.filter((member) => {
      const position = Number(member.position);
      return position >= 0 && position <= 3;
    });

    const substitute = members.find((member) => {
      return Number(member.position) === 4;
    });

    return {
      mainPlayers,
      substitute
    };
  }

  // สร้างข้อความสำหรับ Copy
  function buildCopyText(entry) {
    const { mainPlayers, substitute } = getRoster(entry);

    const playerLines = [];

    for (let i = 0; i < 4; i++) {
      const player = mainPlayers[i];
      const name = player?.pubg_name || "ว่าง";

      playerLines.push(`P${i + 1} : ${name}`);
    }

    if (substitute) {
      playerLines.push(`SUB : ${substitute.pubg_name || "ว่าง"}`);
    }

    return [
      `Tournament ${entry.tournament_name || "-"}`,
      "",
      `TEAM : ${entry.team_name || "-"}`,
      ...playerLines,
      "",
      `Date created ${formatDate(entry.registered_at)}`
    ].join("\n");
  }

  // แสดงการสมัครของทีม
  function renderRegistration(entry, index) {
    const { mainPlayers, substitute } = getRoster(entry);

    const playerHTML = [0, 1, 2, 3]
      .map((i) => {
        const player = mainPlayers[i];
        const playerName = player?.pubg_name || "ว่าง";

        return `
          <div class="registration-player">
            <span class="player-position">P${i + 1}</span>
            <span class="player-name">
              ${escapeHTML(playerName)}
            </span>
          </div>
        `;
      })
      .join("");

    const substituteHTML = substitute
      ? `
        <div class="registration-player substitute-player">
          <span class="player-position">SUB</span>
          <span class="player-name">
            ${escapeHTML(substitute.pubg_name || "ว่าง")}
          </span>
        </div>
      `
      : "";

    return `
      <div class="registration-card">
        <div class="registration-card-header">
          <div>
            <h3>${escapeHTML(entry.team_name || "ไม่ระบุทีม")}</h3>
            <p>TAG : ${escapeHTML(entry.team_tag || "-")}</p>
          </div>

          <button
            class="copy-registration-btn"
            data-index="${index}"
            type="button"
          >
            คัดลอกรายชื่อ
          </button>
        </div>

        <div class="registration-players">
          ${playerHTML}
          ${substituteHTML}
        </div>

        <div class="registration-card-footer">
          <span>สมัครเมื่อ ${escapeHTML(formatDate(entry.registered_at))}</span>
          <span>สมาชิก ${Number(entry.member_count || 0)} คน</span>
        </div>
      </div>
    `;
  }

  // โหลดรายชื่อทีมของ Tournament ที่เลือก
  async function loadRegistrations(tournamentId) {
    registrationList.innerHTML = "";
    registrationMessage.textContent = "กำลังโหลดรายชื่อทีม...";
    registrationCount.textContent = "0 ทีม";

    if (!tournamentId) {
      registrationMessage.textContent =
        "กรุณาเลือกรายการแข่งขัน";
      return;
    }

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
      registrationMessage.textContent =
        "โหลดรายชื่อไม่สำเร็จ: " + error.message;
      return;
    }

    entries = data || [];

    registrationCount.textContent = `${entries.length} ทีม`;

    if (entries.length === 0) {
      registrationMessage.textContent =
        "รายการนี้ยังไม่มีทีมที่ได้รับอนุมัติ";
      return;
    }

    registrationMessage.textContent =
      `พบทีมที่ได้รับอนุมัติ ${entries.length} ทีม`;

    registrationList.innerHTML = entries
      .map((entry, index) => renderRegistration(entry, index))
      .join("");
  }

  // เปลี่ยน Tournament
  tournamentSelect.addEventListener("change", (event) => {
    loadRegistrations(event.target.value);
  });

  // Copy รายชื่อทีม
  registrationList.addEventListener("click", async (event) => {
    const button = event.target.closest(".copy-registration-btn");

    if (!button) return;

    const index = Number(button.dataset.index);
    const entry = entries[index];

    if (!entry) return;

    const copyText = buildCopyText(entry);

    try {
      await navigator.clipboard.writeText(copyText);

      const originalText = button.textContent;
      button.textContent = "คัดลอกแล้ว ✓";

      setTimeout(() => {
        button.textContent = originalText;
      }, 1500);
    } catch (error) {
      alert("คัดลอกไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ Clipboard");
    }
  });

  await loadTournaments();
});
