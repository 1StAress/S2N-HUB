// ==========================================
// S2N HUB - MEMBER MANAGEMENT
// V1.2 / ADMIN SECURITY + MODERN UI
// ==========================================

window.isResettingPassword = false;

document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const supabase = window.supabaseClient;

  if (!supabase) {
    console.error("S2N HUB: Supabase Client not found.");
    return;
  }

  const $ = (selector) => document.querySelector(selector);

  const tableBody = $("#members-table-body");
  const searchInput = $("#member-search");
  const refreshBtn = $("#refresh-members");
  const messageBox = $("#members-message");

  const totalMembers = $("#total-members");
  const totalAdmins = $("#total-admins");
  const totalRegular = $("#total-regular");
  const resultCount = $("#members-result-count");

  const logoutBtn = $("#logout-btn");

  // EDIT MODAL
  const editModal = $("#edit-modal");
  const editForm = $("#edit-member-form");

  const editUserId = $("#edit-user-id");
  const editUsername = $("#edit-username");
  const editPubgName = $("#edit-pubg-name");

  const closeEditModal = $("#close-edit-modal");
  const cancelEdit = $("#cancel-edit");
  const saveMemberBtn = $("#save-member-btn");

  // RESET PASSWORD MODAL
  const resetModal = $("#reset-password-modal");
  const resetForm = $("#reset-password-form");

  const resetUsername = $("#reset-password-username");
  const resetTargetUsername = $("#reset-password-target-username");

  const resetNewPassword = $("#reset-new-password");
  const resetConfirmPassword = $("#reset-confirm-password");

  const resetPasswordMessage = $("#reset-password-message");

  const closeResetModal = $("#close-reset-password-modal");
  const cancelResetPassword = $("#cancel-reset-password");
  const submitResetPassword = $("#submit-reset-password");

  // ==========================================
  // STATE
  // ==========================================

  let members = [];
  let currentAdmin = null;

  let isSaving = false;
  let isLoading = false;

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

  function showMessage(message, type = "success") {
    if (!messageBox) return;

    messageBox.textContent = message;
    messageBox.className = `members-message show ${type}`;

    if (type === "success") {
      setTimeout(() => {
        messageBox.classList.remove("show");
      }, 4000);
    }
  }

  function hideMessage() {
    if (!messageBox) return;

    messageBox.textContent = "";
    messageBox.className = "members-message";
  }

  function setButtonLoading(button, loading, normalText, loadingText) {
    if (!button) return;

    button.disabled = loading;
    button.textContent = loading ? loadingText : normalText;
  }

  function normalizeRole(role) {
    return String(role || "")
      .trim()
      .toLowerCase();
  }

  function showModal(modal) {
    if (!modal) return;

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");
  }

  function hideModal(modal) {
    if (!modal) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  try {
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();

    if (authError || !user) {
      window.location.replace("../login.html");
      return;
    }

    // ==========================================
    // ADMIN SECURITY CHECK
    // ==========================================

    const {
      data: adminProfile,
      error: adminError
    } = await supabase
      .from("s2n_members")
      .select("user_id, username, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      adminError ||
      !adminProfile ||
      normalizeRole(adminProfile.role) !== "admin"
    ) {
      console.warn("S2N HUB: Unauthorized access.");

      window.location.replace("../dashboard.html");
      return;
    }

    currentAdmin = adminProfile;

    console.log(
      "S2N HUB: Admin verified.",
      currentAdmin.username
    );

    // ==========================================
    // LOAD MEMBERS
    // ==========================================

    async function loadMembers() {
      if (isLoading) return;

      isLoading = true;
      hideMessage();

      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" class="members-loading">
              <span class="members-loading-indicator"></span>
              LOADING MEMBER DATABASE...
            </td>
          </tr>
        `;
      }

      try {
        const {
          data,
          error
        } = await supabase
          .from("s2n_members")
          .select("user_id, username, display_name, role, created_at")
          .order("created_at", {
            ascending: true
          });

        if (error) {
          console.error(
            "S2N HUB: Load members error.",
            error
          );

          if (tableBody) {
            tableBody.innerHTML = `
              <tr>
                <td colspan="6" class="members-loading">
                  DATABASE ACCESS ERROR
                </td>
              </tr>
            `;
          }

          showMessage(
            "ไม่สามารถโหลดข้อมูลสมาชิกได้ กรุณาตรวจสอบ RLS Policy",
            "error"
          );

          return;
        }

        members = data || [];

        updateStats();
        renderMembers();

        console.log(
          "S2N HUB: Members loaded.",
          members.length
        );

      } finally {
        isLoading = false;
      }
    }

    // ==========================================
    // UPDATE STATISTICS
    // ==========================================

    function updateStats() {
      const adminCount = members.filter(
        member => normalizeRole(member.role) === "admin"
      ).length;

      const regularCount = members.filter(
        member => normalizeRole(member.role) === "member"
      ).length;

      if (totalMembers) {
        totalMembers.textContent =
          String(members.length).padStart(2, "0");
      }

      if (totalAdmins) {
        totalAdmins.textContent =
          String(adminCount).padStart(2, "0");
      }

      if (totalRegular) {
        totalRegular.textContent =
          String(regularCount).padStart(2, "0");
      }
    }

    // ==========================================
    // RENDER MEMBERS
    // ==========================================

    function renderMembers() {
      if (!tableBody) return;

      const keyword = (
        searchInput?.value || ""
      ).trim().toLowerCase();

      const filteredMembers = members.filter(member => {
        const username = String(
          member.username || ""
        ).toLowerCase();

        const pubgName = String(
          member.display_name || ""
        ).toLowerCase();

        return (
          username.includes(keyword) ||
          pubgName.includes(keyword)
        );
      });

      if (resultCount) {
        resultCount.textContent =
          `${filteredMembers.length} RECORDS`;
      }

      if (!filteredMembers.length) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" class="members-loading">
              NO MEMBERS FOUND
            </td>
          </tr>
        `;

        return;
      }

      tableBody.innerHTML = filteredMembers.map(
        (member, index) => {

          const username =
            member.username || "UNKNOWN";

          const pubgName =
            member.display_name || username;

          const role =
            normalizeRole(member.role) === "admin"
              ? "ADMIN"
              : "MEMBER";

          const avatar =
            username.charAt(0).toUpperCase();

          const accountId =
            member.user_id
              ? member.user_id.slice(0, 8).toUpperCase()
              : "UNKNOWN";

          return `
            <tr>

              <td class="members-row-number">
                ${String(index + 1).padStart(2, "0")}
              </td>

              <td>
                <div class="members-player">

                  <div class="members-avatar">
                    ${escapeHTML(avatar)}
                  </div>

                  <span class="members-username">
                    ${escapeHTML(username.toUpperCase())}
                  </span>

                </div>
              </td>

              <td class="members-pubg-name">
                ${escapeHTML(pubgName)}
              </td>

              <td>
                <span class="members-role ${
                  role === "ADMIN" ? "admin" : "member"
                }">
                  ${escapeHTML(role)}
                </span>
              </td>

              <td class="members-account-id">
                ${escapeHTML(accountId)}
              </td>

              <td>
                <div class="members-admin-actions">

                  <button
                    type="button"
                    class="members-edit-btn"
                    data-edit-id="${escapeHTML(member.user_id)}"
                    title="Edit Member"
                  >
                    <span class="material-symbols-rounded">
                      edit
                    </span>
                    EDIT
                  </button>

                  <button
                    type="button"
                    class="members-reset-btn"
                    data-reset-username="${escapeHTML(member.username)}"
                    title="Reset Password"
                  >
                    <span class="material-symbols-rounded">
                      lock_reset
                    </span>
                    RESET
                  </button>

                </div>
              </td>

            </tr>
          `;
        }
      ).join("");
    }

    // ==========================================
    // SEARCH
    // ==========================================

    searchInput?.addEventListener("input", renderMembers);

    // ==========================================
    // EDIT MEMBER MODAL
    // ==========================================

    function openEditModal(member) {
      if (!editModal) return;

      editUserId.value = member.user_id;

      editUsername.value =
        member.username || "";

      editPubgName.value =
        member.display_name || member.username || "";

      showModal(editModal);

      editPubgName.focus();
    }

    function closeEdit() {
      hideModal(editModal);
      editForm?.reset();
    }

    closeEditModal?.addEventListener("click", closeEdit);
    cancelEdit?.addEventListener("click", closeEdit);

    editModal?.querySelector(
      ".members-modal-backdrop"
    )?.addEventListener("click", closeEdit);

    // ==========================================
    // RESET PASSWORD MODAL
    // ==========================================

    function openResetModal(username) {
      if (!resetModal) {
        showMessage(
          "ไม่พบ Reset Password Modal",
          "error"
        );

        return;
      }

      resetTargetUsername.value = username;
      resetUsername.textContent = username;

      resetForm?.reset();

      if (resetPasswordMessage) {
        resetPasswordMessage.textContent = "";
      }

      showModal(resetModal);

      resetNewPassword?.focus();
    }

    function closeResetModalHandler() {
      if (window.isResettingPassword) return;

      hideModal(resetModal);

      resetForm?.reset();

      if (resetPasswordMessage) {
        resetPasswordMessage.textContent = "";
      }
    }

    closeResetModal?.addEventListener(
      "click",
      closeResetModalHandler
    );

    cancelResetPassword?.addEventListener(
      "click",
      closeResetModalHandler
    );

    $("#reset-password-backdrop")?.addEventListener(
      "click",
      closeResetModalHandler
    );

    // ==========================================
    // PASSWORD VISIBILITY
    // ==========================================

    document.querySelectorAll(
      "[data-toggle-password]"
    ).forEach(button => {

      button.addEventListener("click", () => {

        const inputId =
          button.dataset.togglePassword;

        const input =
          document.getElementById(inputId);

        if (!input) return;

        const isPassword =
          input.type === "password";

        input.type =
          isPassword ? "text" : "password";

        button.textContent =
          isPassword ? "HIDE" : "SHOW";

      });

    });

    // ==========================================
    // MEMBER ACTIONS
    // ==========================================

    tableBody?.addEventListener("click", async event => {

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const editButton = target.closest(
        ".members-edit-btn"
      );

      const resetButton = target.closest(
        ".members-reset-btn"
      );

      // EDIT
      if (editButton) {

        const memberId =
          editButton.dataset.editId;

        const member = members.find(
          item => item.user_id === memberId
        );

        if (!member) {
          showMessage(
            "ไม่พบข้อมูลสมาชิกที่เลือก",
            "error"
          );

          return;
        }

        openEditModal(member);

        return;
      }

      // RESET PASSWORD
      if (resetButton) {

        const username =
          resetButton.dataset.resetUsername;

        if (!username) {
          showMessage(
            "ไม่พบ Username สมาชิก",
            "error"
          );

          return;
        }

        openResetModal(username);
      }

    });

    // ==========================================
    // SAVE PUBG NAME
    // ==========================================

    editForm?.addEventListener("submit", async event => {

      event.preventDefault();

      if (isSaving) return;

      const memberId = editUserId.value;

      const newPubgName =
        editPubgName.value.trim();

      if (!memberId || !newPubgName) {
        showMessage(
          "กรุณากรอก PUBG Name",
          "error"
        );

        return;
      }

      if (newPubgName.length > 40) {
        showMessage(
          "PUBG Name ต้องไม่เกิน 40 ตัวอักษร",
          "error"
        );

        return;
      }

      isSaving = true;

      setButtonLoading(
        saveMemberBtn,
        true,
        "SAVE CHANGES",
        "SAVING..."
      );

      try {
        const {
          data: updatedMember,
          error
        } = await supabase
          .from("s2n_members")
          .update({
            display_name: newPubgName,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", memberId)
          .select("user_id, username, display_name, role")
          .maybeSingle();

        if (error) {
          console.error(
            "S2N HUB: Update member error.",
            error
          );

          showMessage(
            "บันทึกไม่สำเร็จ กรุณาตรวจสอบ UPDATE Policy",
            "error"
          );

          return;
        }

        if (!updatedMember) {
          showMessage(
            "ไม่มีสิทธิ์แก้ไขข้อมูลสมาชิก หรือไม่พบสมาชิก",
            "error"
          );

          return;
        }

        members = members.map(member =>
          member.user_id === memberId
            ? { ...member, ...updatedMember }
            : member
        );

        updateStats();
        renderMembers();

        closeEdit();

        showMessage(
          "อัปเดต PUBG Name สำเร็จ",
          "success"
        );

      } catch (error) {
        console.error(error);

        showMessage(
          "เกิดข้อผิดพลาดขณะบันทึกข้อมูล",
          "error"
        );

      } finally {
        isSaving = false;

        setButtonLoading(
          saveMemberBtn,
          false,
          "SAVE CHANGES",
          "SAVING..."
        );
      }

    });

    // ==========================================
    // RESET PASSWORD
    // SUPABASE EDGE FUNCTION
    // ==========================================

    resetForm?.addEventListener("submit", async event => {

      event.preventDefault();

      if (window.isResettingPassword) return;

      const username =
        String(resetTargetUsername.value || "")
          .trim()
          .toLowerCase();

      const newPassword =
        resetNewPassword.value;

      const confirmPassword =
        resetConfirmPassword.value;

      if (!username) {
        showMessage(
          "ไม่พบ Username สมาชิก",
          "error"
        );

        return;
      }

      if (newPassword.length < 8) {
        showMessage(
          "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
          "error"
        );

        return;
      }

      if (newPassword !== confirmPassword) {
        if (resetPasswordMessage) {
          resetPasswordMessage.textContent =
            "รหัสผ่านไม่ตรงกัน";
        }

        return;
      }

      const confirmed = confirm(
        `ยืนยันเปลี่ยนรหัสผ่านของ ${username} ?`
      );

      if (!confirmed) return;

      window.isResettingPassword = true;

      setButtonLoading(
        submitResetPassword,
        true,
        "RESET PASSWORD",
        "RESETTING..."
      );

      if (resetPasswordMessage) {
        resetPasswordMessage.textContent =
          "กำลังดำเนินการ...";
      }

      try {
        const {
          data,
          error
        } = await supabase.functions.invoke(
          "admin-reset-password",
          {
            body: {
              username,
              newPassword
            }
          }
        );

        if (error) {
          console.error(
            "S2N HUB: Reset password error.",
            error
          );

          let errorMessage =
            error.message || "Reset Password ไม่สำเร็จ";

          if (error.context) {
            try {
              const responseText =
                await error.context.text();

              if (responseText) {
                try {
                  const responseData =
                    JSON.parse(responseText);

                  errorMessage =
                    responseData.error ||
                    responseData.message ||
                    errorMessage;

                } catch {
                  errorMessage = responseText;
                }
              }

            } catch (readError) {
              console.error(readError);
            }
          }

          if (resetPasswordMessage) {
            resetPasswordMessage.textContent =
              errorMessage;
          }

          return;
        }

        if (!data || data.success !== true) {
          const errorMessage =
            data?.error ||
            data?.message ||
            "Reset Password ไม่สำเร็จ";

          if (resetPasswordMessage) {
            resetPasswordMessage.textContent =
              errorMessage;
          }

          return;
        }

        hideModal(resetModal);

        resetForm.reset();

        showMessage(
          `เปลี่ยนรหัสผ่าน ${username} สำเร็จ`,
          "success"
        );

        console.log(
          "S2N HUB: Password reset successful.",
          username
        );

      } catch (error) {
        console.error(
          "S2N HUB: Reset password exception.",
          error
        );

        if (resetPasswordMessage) {
          resetPasswordMessage.textContent =
            "เกิดข้อผิดพลาดในการเชื่อมต่อ";
        }

      } finally {
        window.isResettingPassword = false;

        setButtonLoading(
          submitResetPassword,
          false,
          "RESET PASSWORD",
          "RESETTING..."
        );
      }

    });

    // ==========================================
    // REFRESH
    // ==========================================

    refreshBtn?.addEventListener("click", async () => {

      setButtonLoading(
        refreshBtn,
        true,
        "↻ REFRESH",
        "LOADING..."
      );

      try {
        await loadMembers();

      } finally {
        setButtonLoading(
          refreshBtn,
          false,
          "↻ REFRESH",
          "LOADING..."
        );
      }

    });

    // ==========================================
    // LOGOUT
    // ==========================================

    logoutBtn?.addEventListener("click", async () => {

      setButtonLoading(
        logoutBtn,
        true,
        "LOGOUT ↗",
        "LOGGING OUT..."
      );

      const {
        error
      } = await supabase.auth.signOut();

      if (error) {
        console.error(
          "S2N HUB: Logout error.",
          error
        );

        setButtonLoading(
          logoutBtn,
          false,
          "LOGOUT ↗",
          "LOGGING OUT..."
        );

        showMessage(
          "Logout ไม่สำเร็จ กรุณาลองใหม่",
          "error"
        );

        return;
      }

      window.location.replace("../login.html");
    });

    // ==========================================
    // ESCAPE KEY
    // ==========================================

    document.addEventListener("keydown", event => {

      if (event.key !== "Escape") return;

      if (editModal?.classList.contains("active")) {
        closeEdit();
      }

      if (
        resetModal?.classList.contains("active") &&
        !window.isResettingPassword
      ) {
        closeResetModalHandler();
      }

    });

    // ==========================================
    // INITIALIZE
    // ==========================================

    await loadMembers();

    console.log(
      "S2N HUB: Member Management V1.2 initialized.",
      currentAdmin.username
    );

  } catch (error) {

    console.error(
      "S2N HUB: Initialization error.",
      error
    );

    showMessage(
      "เกิดข้อผิดพลาดในการเริ่มต้นระบบ Member Management",
      "error"
    );

  }

});