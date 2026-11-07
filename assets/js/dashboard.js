// ==========================================
// S2N HUB - DASHBOARD SYSTEM
// Supabase Connected / V1.4
// Role-Based Navigation
// Admin Control + Member Privacy
// Tournament Announcement
// PUBG Avatar Initials + Profile Avatar Image
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const s2nClient = window.supabaseClient;

  if (!s2nClient) {
    console.error("S2N HUB: Supabase Client not found.");
    return;
  }

  const $ = (selector) => document.querySelector(selector);

  const profileUsername = $("#profile-username");
  const profilePubgName = $("#profile-pubg-name");
  const profileRole = $("#profile-role");
  const profileAvatarInitials = $("#profile-avatar-initials");

  const rosterSection =
    $("#admin-roster") || $(".roster-section");

  const rosterBody = $("#roster-body");
  const rosterCount = $("#roster-count");

  const dashClock = $("#dash-clock");
  const dashDate = $("#dash-date");

  const logoutBtn = $("#logout-btn");

  const announcementTitle = $("#announcement-title");
  const announcementDescription = $("#announcement-description");
  const announcementStatus = $("#announcement-status");
  const announcementDate = $("#announcement-date");

  const adminCreateTournament = $("#admin-create-tournament");

  // ==========================================
  // HELPERS
  // ==========================================

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getInitials(id) {
    const name = String(id || "").trim();

    if (!name) return "??";

    const words = name
      .split(/[\s._\-•]+/)
      .filter(Boolean);

    if (words.length >= 2) {
      return words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
    }

    return name.substring(0, 2).toUpperCase();
  }

  function formatDate(value) {
    if (!value) return "ยังไม่กำหนด";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "ยังไม่กำหนด";
    }

    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Bangkok"
    });
  }

  function showMessage(element, message) {
    if (element) {
      element.textContent = message;
    }
  }

  // ==========================================
  // PROFILE AVATAR IMAGE
  // ==========================================

  function getAvatarURL(member) {
    const avatarColumns = [
      "avatar_url",
      "profile_image",
      "photo_url",
      "image_url"
    ];

    for (const column of avatarColumns) {
      const value = member?.[column];

      if (
        typeof value === "string" &&
        value.trim() !== ""
      ) {
        return value.trim();
      }
    }

    return "";
  }

  function renderProfileAvatar(avatarURL, initials) {
    if (!profileAvatarInitials) return;

    const avatarContainer =
      profileAvatarInitials.closest(".profile-avatar") ||
      profileAvatarInitials.parentElement;

    if (!avatarContainer) return;

    let avatarImage =
      avatarContainer.querySelector(".profile-avatar-image");

    if (avatarURL) {
      if (!avatarImage) {
        avatarImage = document.createElement("img");

        avatarImage.className = "profile-avatar-image";
        avatarImage.alt = "Profile Avatar";

        avatarImage.style.width = "100%";
        avatarImage.style.height = "100%";
        avatarImage.style.objectFit = "cover";
        avatarImage.style.display = "block";
        avatarImage.style.borderRadius = "inherit";

        avatarContainer.insertBefore(
          avatarImage,
          profileAvatarInitials
        );
      }

      avatarImage.src = avatarURL;

      avatarImage.onerror = () => {
        avatarImage.remove();

        profileAvatarInitials.textContent =
          initials || "??";

        profileAvatarInitials.style.display = "";
      };

      profileAvatarInitials.style.display = "none";

      return;
    }

    if (avatarImage) {
      avatarImage.remove();
    }

    profileAvatarInitials.textContent =
      initials || "??";

    profileAvatarInitials.style.display = "";
  }

  // ==========================================
  // ROLE-BASED VISIBILITY
  // ==========================================

  function hideAdminElements() {
    document.querySelectorAll(".admin-only")
      .forEach((element) => {
        element.classList.add("hidden");
        element.setAttribute("hidden", "");

        element.style.setProperty(
          "display",
          "none",
          "important"
        );
      });
  }

  function showAdminElements() {
    document.querySelectorAll(".admin-only")
      .forEach((element) => {
        element.classList.remove("hidden");
        element.removeAttribute("hidden");
        element.style.removeProperty("display");
      });
  }

  function setRosterVisibility(isAdmin) {
    if (!rosterSection) return;

    if (isAdmin) {
      rosterSection.classList.remove("hidden");
      rosterSection.removeAttribute("hidden");
      rosterSection.style.removeProperty("display");
    } else {
      rosterSection.classList.add("hidden");
      rosterSection.setAttribute("hidden", "");

      rosterSection.style.setProperty(
        "display",
        "none",
        "important"
      );
    }
  }

  hideAdminElements();
  setRosterVisibility(false);

  // ==========================================
  // CLOCK SYSTEM
  // ==========================================

  function updateClock() {
    const now = new Date();

    if (dashClock) {
      dashClock.textContent =
        now.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Bangkok"
        });
    }

    if (dashDate) {
      dashDate.textContent =
        now.toLocaleDateString("th-TH", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Bangkok"
        });
    }
  }

  updateClock();
  setInterval(updateClock, 1000);

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  try {
    const {
      data: { user },
      error: authError
    } = await s2nClient.auth.getUser();

    if (authError || !user) {
      window.location.replace("login.html");
      return;
    }

    // ==========================================
    // LOAD MEMBER PROFILE
    // ==========================================

    const {
      data: currentMember,
      error: profileError
    } = await s2nClient
      .from("s2n_members")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "S2N HUB: Profile loading error.",
        profileError
      );

      showMessage(profileUsername, "PROFILE ERROR");
      return;
    }

    if (!currentMember) {
      console.error(
        "S2N HUB: Member profile not found."
      );

      showMessage(profileUsername, "PROFILE NOT FOUND");
      return;
    }

    // ==========================================
    // ROLE VALIDATION
    // ==========================================

    const userRole =
      String(currentMember.role || "")
        .trim()
        .toLowerCase();

    const isAdmin = userRole === "admin";

    console.log("S2N HUB USER:", currentMember.username);
    console.log("S2N HUB ROLE:", userRole);
    console.log("S2N HUB IS ADMIN:", isAdmin);

    // ==========================================
    // APPLY PERMISSIONS
    // ==========================================

    if (isAdmin) {
      showAdminElements();
    } else {
      hideAdminElements();
    }

    setRosterVisibility(isAdmin);

    // ==========================================
    // PROFILE DISPLAY
    // ==========================================

    const username =
      currentMember.username ||
      user.user_metadata?.username ||
      user.email?.split("@")[0] ||
      "PLAYER";

    const pubgName =
      currentMember.pubg_name ||
      currentMember.game_name ||
      currentMember.ign ||
      currentMember.display_name ||
      user.user_metadata?.pubg_name ||
      username;

    showMessage(
      profileUsername,
      username.toUpperCase()
    );

    showMessage(
      profilePubgName,
      pubgName
    );

    showMessage(
      profileRole,
      isAdmin ? "ADMIN" : "MEMBER"
    );

    // ==========================================
    // PROFILE AVATAR
    // LOAD IMAGE FROM SUPABASE MEMBER PROFILE
    // ==========================================

    const avatarURL = getAvatarURL(currentMember);
    const avatarInitials = getInitials(pubgName);

    renderProfileAvatar(
      avatarURL,
      avatarInitials
    );

    console.log(
      "S2N HUB AVATAR:",
      avatarURL ? "IMAGE LOADED" : "INITIALS"
    );

    // ==========================================
    // NAVIGATION ACTIVE STATE
    // ==========================================

    const currentPage =
      window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    document.querySelectorAll(".dash-nav-link")
      .forEach((link) => {
        const linkPage =
          link.getAttribute("href")
            ?.split("/")
            .pop()
            .toLowerCase();

        link.classList.toggle(
          "active",
          linkPage === currentPage
        );
      });

    // ==========================================
    // LOAD CLAN ROSTER
    // ADMIN ONLY
    // ==========================================

    async function loadRoster() {
      if (!isAdmin || !rosterBody) {
        return;
      }

      rosterBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center;">
            LOADING ROSTER...
          </td>
        </tr>
      `;

      const {
        data: members,
        error
      } = await s2nClient
        .from("s2n_members")
        .select(
          "user_id, username, display_name, role, created_at"
        );

      if (error) {
        console.error(
          "S2N HUB: Roster loading error.",
          error
        );

        rosterBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center;">
              UNABLE TO LOAD ROSTER
            </td>
          </tr>
        `;

        return;
      }

      if (!members || members.length === 0) {
        rosterBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center;">
              NO MEMBERS FOUND
            </td>
          </tr>
        `;

        if (rosterCount) {
          rosterCount.textContent = "00";
        }

        return;
      }

      const roleOrder = {
        admin: 1,
        member: 2
      };

      members.sort((a, b) => {
        const roleA =
          String(a.role || "").trim().toLowerCase();

        const roleB =
          String(b.role || "").trim().toLowerCase();

        const orderA = roleOrder[roleA] ?? 99;
        const orderB = roleOrder[roleB] ?? 99;

        if (orderA !== orderB) {
          return orderA - orderB;
        }

        return String(a.username || "")
          .localeCompare(
            String(b.username || ""),
            "en",
            {
              sensitivity: "base",
              numeric: true
            }
          );
      });

      if (rosterCount) {
        rosterCount.textContent =
          String(members.length).padStart(2, "0");
      }

      rosterBody.innerHTML =
        members.map((member, index) => {
          const memberUsername =
            member.username || "UNKNOWN PLAYER";

          const memberPubgName =
            member.display_name || memberUsername;

          const memberRole =
            String(member.role || "")
              .trim()
              .toLowerCase();

          const role =
            memberRole === "admin" ? "ADMIN" : "MEMBER";

          const avatarText =
            getInitials(memberPubgName);

          return `
            <tr>
              <td class="roster-number">
                ${String(index + 1).padStart(2, "0")}
              </td>
              <td>
                <div class="roster-player">
                  <div class="roster-avatar">
                    ${escapeHTML(avatarText)}
                  </div>
                  ${escapeHTML(memberUsername.toUpperCase())}
                </div>
              </td>
              <td class="pubg-cell">
                ${escapeHTML(memberPubgName)}
              </td>
              <td>
                <span class="roster-role ${
                  role === "ADMIN" ? "leader" : ""
                }">
                  ${escapeHTML(role)}
                </span>
              </td>
              <td>
                <span class="member-status">
                  ACTIVE
                </span>
              </td>
            </tr>
          `;
        }).join("");

      console.log(
        "S2N HUB: Admin roster sorted and loaded.",
        members.length
      );
    }

    // ==========================================
    // TOURNAMENT ANNOUNCEMENT
    // ==========================================

    async function loadTournamentAnnouncement() {
      if (
        !announcementTitle ||
        !announcementDescription
      ) {
        return;
      }

      announcementTitle.textContent =
        "S2N TOURNAMENT";

      announcementDescription.textContent =
        "กำลังโหลดประกาศการแข่งขัน...";

      const {
        data: tournaments,
        error
      } = await s2nClient
        .from("s2n_tournaments")
        .select(`
          id,
          tournament_name,
          game,
          description,
          prize_pool,
          max_teams,
          registration_start,
          registration_end,
          tournament_start,
          status,
          created_at
        `)
        .order("created_at", {
          ascending: false
        })
        .limit(20);

      if (error) {
        console.error(
          "S2N HUB: Tournament announcement loading error.",
          error
        );

        announcementTitle.textContent =
          "TOURNAMENT UNAVAILABLE";

        announcementDescription.textContent =
          "ไม่สามารถโหลดประกาศการแข่งขันได้ กรุณาลองใหม่อีกครั้ง";

        showMessage(announcementStatus, "SYSTEM ERROR");
        showMessage(announcementDate, "");

        return;
      }

      if (!tournaments || tournaments.length === 0) {
        announcementTitle.textContent =
          "NO TOURNAMENT ANNOUNCEMENTS";

        announcementDescription.textContent =
          "ขณะนี้ยังไม่มีรายการแข่งขัน รอติดตามประกาศจาก S2N HUB";

        showMessage(announcementStatus, "NO EVENTS");
        showMessage(announcementDate, "");

        return;
      }

      const now = new Date();

      const activeTournament =
        tournaments.find((tournament) => {
          const status =
            String(tournament.status || "")
              .trim()
              .toLowerCase();

          if (
            status === "completed" ||
            status === "cancelled"
          ) {
            return false;
          }

          if (tournament.registration_end) {
            const registrationEnd =
              new Date(tournament.registration_end);

            return registrationEnd >= now;
          }

          return true;
        });

      const tournament =
        activeTournament || tournaments[0];

      announcementTitle.textContent =
        tournament.tournament_name ||
        "S2N TOURNAMENT";

      announcementDescription.textContent =
        tournament.description ||
        "ติดตามรายละเอียดการแข่งขันได้ที่หน้า Tournament";

      if (announcementStatus) {
        const statusLabels = {
          upcoming: "UPCOMING",
          ongoing: "ONGOING",
          completed: "COMPLETED",
          registration: "REGISTRATION",
          cancelled: "CANCELLED"
        };

        const status =
          String(tournament.status || "")
            .trim()
            .toLowerCase();

        announcementStatus.textContent =
          statusLabels[status] ||
          status.toUpperCase() ||
          "ANNOUNCED";
      }

      if (announcementDate) {
        announcementDate.textContent =
          tournament.registration_start
            ? `เปิดรับสมัคร: ${formatDate(
                tournament.registration_start
              )}`
            : `ประกาศเมื่อ: ${formatDate(
                tournament.created_at
              )}`;
      }

      console.log(
        "S2N HUB: Tournament announcement loaded.",
        tournament.tournament_name
      );
    }

    // ==========================================
    // ADMIN CREATE TOURNAMENT
    // ==========================================

    if (adminCreateTournament && isAdmin) {
      adminCreateTournament.href = "tournament.html";
    }

    // ==========================================
    // LOAD DASHBOARD DATA
    // ==========================================

    const dashboardTasks = [
      loadTournamentAnnouncement()
    ];

    if (isAdmin) {
      dashboardTasks.push(loadRoster());
    }

    await Promise.all(dashboardTasks);

    // ==========================================
    // LOGOUT
    // ==========================================

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        logoutBtn.disabled = true;
        logoutBtn.textContent = "LOGGING OUT...";

        const {
          error: logoutError
        } = await s2nClient.auth.signOut();

        if (logoutError) {
          console.error(
            "S2N HUB: Logout failed.",
            logoutError
          );

          logoutBtn.disabled = false;
          logoutBtn.textContent = "LOGOUT ↗";

          alert(
            "Logout failed. Please try again."
          );

          return;
        }

        window.location.replace("login.html");
      });
    }

    console.log(
      "S2N HUB: Dashboard V1.4 initialized.",
      isAdmin ? "ADMIN" : "MEMBER"
    );

  } catch (error) {
    console.error(
      "S2N HUB: Dashboard initialization error.",
      error
    );

    alert(
      "เกิดข้อผิดพลาดในการโหลด Dashboard กรุณาลองเข้าสู่ระบบใหม่"
    );
  }
});