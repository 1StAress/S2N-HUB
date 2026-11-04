/* ==========================================
   S2N HUB | PLAYER PROFILE
   Complete Profile System
========================================== */

(() => {
    "use strict";

    /* ==========================================
       CONFIG
    ========================================== */

    const $ = (selector) =>
        document.querySelector(selector);

    const supabase = window.supabaseClient || window.supabase;

    let currentUser = null;
    let currentProfile = null;
    let currentRegistrations = [];
    let toastTimer = null;

    /* ==========================================
       FIELD HELPERS
    ========================================== */

    function fieldKey(object, candidates) {
        if (!object) return null;

        return candidates.find((key) =>
            Object.prototype.hasOwnProperty.call(object, key)
        ) || null;
    }

    function field(object, candidates, fallback = "") {
        const key = fieldKey(object, candidates);

        if (!key) return fallback;

        return object[key] ?? fallback;
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleDateString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    /* ==========================================
       TOAST
    ========================================== */

    function showToast(message, type = "info") {
        const toast = $("#profile-toast");

        if (!toast) return;

        clearTimeout(toastTimer);

        toast.textContent = message;
        toast.className = `profile-toast ${type}`;
        toast.classList.add("show");

        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 3500);
    }

    /* ==========================================
       MODAL
    ========================================== */

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

        const visibleModal = document.querySelector(
            ".modal:not(.hidden)"
        );

        if (!visibleModal) {
            document.body.classList.remove("modal-open");
        }
    }

    /* ==========================================
       AVATAR
    ========================================== */

    function renderAvatar() {
        const avatar = $("#profile-avatar");

        if (!avatar || !currentProfile) return;

        const avatarURL = field(currentProfile, [
            "avatar_url",
            "profile_image",
            "photo_url",
            "image_url"
        ]);

        const fullName = field(currentProfile, [
            "full_name",
            "fullname",
            "name",
            "real_name"
        ], "");

        const username = field(currentProfile, [
            "username",
            "member_name"
        ], "M");

        const initials = String(fullName || username)
            .trim()
            .charAt(0)
            .toUpperCase();

        if (avatarURL) {
            avatar.innerHTML = `
                <img
                    src="${escapeHTML(avatarURL)}"
                    alt="Profile Avatar"
                    loading="lazy"
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                        border-radius:inherit;
                    "
                >
            `;
        } else {
            avatar.innerHTML = `
                <span class="avatar-initials">
                    ${escapeHTML(initials || "M")}
                </span>
            `;
        }
    }

    /* ==========================================
       LOAD PROFILE
    ========================================== */

    async function loadProfile() {
        const {
            data: {
                user
            },
            error: authError
        } = await supabase.auth.getUser();

        if (authError || !user) {
            showToast(
                "กรุณาเข้าสู่ระบบก่อนใช้งาน",
                "error"
            );

            window.location.href = "index.html";
            return;
        }

        currentUser = user;

        const {
            data,
            error
        } = await supabase
            .from("s2n_members")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) {
            console.error(
                "[S2N Profile] Profile load error:",
                error
            );

            showToast(
                "โหลดข้อมูลสมาชิกไม่สำเร็จ",
                "error"
            );

            return;
        }

        if (!data) {
            showToast(
                "ไม่พบข้อมูลสมาชิก",
                "error"
            );

            return;
        }

        currentProfile = data;

        renderProfile();
        renderAvatar();

        await loadRegistrations();
    }

    /* ==========================================
       RENDER PROFILE
    ========================================== */

    function renderProfile() {
        if (!currentProfile || !currentUser) return;

        const profile = currentProfile;

        const username = field(profile, [
            "username",
            "member_name"
        ], "member");

        const fullName = field(profile, [
            "full_name",
            "fullname",
            "name",
            "real_name"
        ], username);

        const role = field(profile, [
            "role",
            "member_role"
        ], "member");

        const memberID = field(profile, [
            "member_id",
            "id"
        ], currentUser.id);

        const pubgName = field(profile, [
            "pubg_name",
            "game_name",
            "ign"
        ], "ยังไม่ระบุ");

        const pubgUID = field(profile, [
            "pubg_uid",
            "game_uid"
        ], "-");

        const clanTag = field(profile, [
            "clan_tag",
            "clan"
        ], "S2N");

        $("#profile-name").textContent = fullName;
        $("#profile-username").textContent =
            `@${username}`;

        $("#profile-role").textContent =
            String(role).toUpperCase();

        $("#profile-member-id").textContent =
            String(memberID).slice(0, 8).toUpperCase();

        $("#info-username").textContent = username;
        $("#info-fullname").textContent = fullName;
        $("#info-email").textContent =
            currentUser.email || "-";

        $("#info-role").textContent =
            String(role).toUpperCase();

        $("#info-pubg-name").textContent = pubgName;
        $("#info-pubg-uid").textContent =
            `UID: ${pubgUID}`;

        $("#info-clan-tag").textContent = clanTag;
    }

    /* ==========================================
       LOAD REGISTRATIONS
    ========================================== */

    async function loadRegistrations() {
        const list = $("#profile-registration-list");

        if (!list || !currentUser) return;

        list.innerHTML = `
            <div class="empty-state">
                กำลังโหลดข้อมูลการแข่งขัน...
            </div>
        `;

        let result = await supabase
            .from("s2n_tournament_entries")
            .select("*")
            .eq("user_id", currentUser.id);

        // รองรับกรณีข้อมูลใช้ member_id แทน user_id
        if (result.error) {
            result = await supabase
                .from("s2n_tournament_entries")
                .select("*")
                .eq("member_id", currentUser.id);
        }

        if (result.error) {
            console.error(
                "[S2N Profile] Registration error:",
                result.error
            );

            list.innerHTML = `
                <div class="empty-state">
                    ไม่สามารถโหลดข้อมูลการแข่งขันได้
                </div>
            `;

            return;
        }

        currentRegistrations = result.data || [];

        renderRegistrations();
        renderStats();
    }

    /* ==========================================
       RENDER REGISTRATIONS
    ========================================== */

    function renderRegistrations() {
        const list = $("#profile-registration-list");

        if (!list) return;

        if (!currentRegistrations.length) {
            list.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-rounded">
                        emoji_events
                    </span>

                    <p>ยังไม่มีประวัติสมัครการแข่งขัน</p>
                </div>
            `;

            return;
        }

        list.innerHTML = currentRegistrations
            .map((entry) => {
                const tournamentName = field(entry, [
                    "tournament_name",
                    "event_name",
                    "title"
                ], "Tournament");

                const status = field(entry, [
                    "status",
                    "approval_status"
                ], "pending");

                const createdAt = field(entry, [
                    "created_at",
                    "registered_at"
                ], "");

                const teamName = field(entry, [
                    "team_name"
                ], "");

                return `
                    <article class="registration-item">

                        <div class="registration-info">

                            <h3>
                                ${escapeHTML(tournamentName)}
                            </h3>

                            ${
                                teamName
                                ? `<p>ทีม: ${escapeHTML(teamName)}</p>`
                                : ""
                            }

                            <small>
                                สมัครเมื่อ ${escapeHTML(formatDate(createdAt))}
                            </small>

                        </div>

                        <span class="registration-status">
                            ${escapeHTML(String(status).toUpperCase())}
                        </span>

                    </article>
                `;
            })
            .join("");
    }

    /* ==========================================
       STATS
    ========================================== */

    function renderStats() {
        const total = currentRegistrations.length;

        const approved = currentRegistrations.filter(
            (entry) => {
                const status = String(
                    field(entry, [
                        "status",
                        "approval_status"
                    ], "")
                ).toLowerCase();

                return [
                    "approved",
                    "accepted",
                    "อนุมัติ"
                ].includes(status);
            }
        ).length;

        const pending = currentRegistrations.filter(
            (entry) => {
                const status = String(
                    field(entry, [
                        "status",
                        "approval_status"
                    ], "")
                ).toLowerCase();

                return [
                    "pending",
                    "waiting",
                    "รออนุมัติ"
                ].includes(status);
            }
        ).length;

        $("#stat-tournaments").textContent = total;
        $("#stat-approved").textContent = approved;
        $("#stat-pending").textContent = pending;
    }

    /* ==========================================
       EDIT PROFILE
    ========================================== */

    function openEditProfile() {
        if (!currentProfile) return;

        $("#edit-username").value = field(
            currentProfile,
            ["username", "member_name"],
            ""
        );

        $("#edit-fullname").value = field(
            currentProfile,
            ["full_name", "fullname", "name", "real_name"],
            ""
        );

        $("#edit-pubg-name").value = field(
            currentProfile,
            ["pubg_name", "game_name", "ign"],
            ""
        );

        $("#edit-pubg-uid").value = field(
            currentProfile,
            ["pubg_uid", "game_uid"],
            ""
        );

        $("#edit-clan-tag").value = field(
            currentProfile,
            ["clan_tag", "clan"],
            "S2N"
        );

        openModal("profile-edit-modal");
    }

    async function saveProfile(event) {
        event.preventDefault();

        if (!currentProfile || !currentUser) return;

        const button = $("#save-profile-btn");

        const username = $("#edit-username").value.trim();
        const fullName = $("#edit-fullname").value.trim();
        const pubgName = $("#edit-pubg-name").value.trim();
        const pubgUID = $("#edit-pubg-uid").value.trim();
        const clanTag = $("#edit-clan-tag").value.trim();

        if (!username) {
            showToast(
                "กรุณากรอกชื่อสมาชิก",
                "error"
            );
            return;
        }

        const updateData = {};

        const mappings = [
            {
                candidates: ["username", "member_name"],
                value: username
            },
            {
                candidates: ["full_name", "fullname", "name", "real_name"],
                value: fullName
            },
            {
                candidates: ["pubg_name", "game_name", "ign"],
                value: pubgName
            },
            {
                candidates: ["pubg_uid", "game_uid"],
                value: pubgUID
            },
            {
                candidates: ["clan_tag", "clan"],
                value: clanTag
            }
        ];

        mappings.forEach((item) => {
            const key = fieldKey(
                currentProfile,
                item.candidates
            );

            if (key) {
                updateData[key] = item.value;
            }
        });

        if (!Object.keys(updateData).length) {
            showToast(
                "ไม่พบคอลัมน์ที่รองรับการแก้ไข",
                "error"
            );
            return;
        }

        button.disabled = true;

        try {
            const {
                data,
                error
            } = await supabase
                .from("s2n_members")
                .update(updateData)
                .eq("user_id", currentUser.id)
                .select()
                .single();

            if (error) throw error;

            currentProfile = data;

            renderProfile();
            renderAvatar();

            closeModal("profile-edit-modal");

            showToast(
                "บันทึกโปรไฟล์สำเร็จ",
                "success"
            );

        } catch (error) {
            console.error(
                "[S2N Profile] Save error:",
                error
            );

            showToast(
                error.message || "บันทึกข้อมูลไม่สำเร็จ",
                "error"
            );

        } finally {
            button.disabled = false;
        }
    }

    /* ==========================================
       CHANGE PASSWORD
    ========================================== */

    async function changePassword(event) {
        event.preventDefault();

        const newPassword =
            $("#new-password")?.value || "";

        const confirmPassword =
            $("#confirm-password")?.value || "";

        const button = $("#save-password-btn");

        if (!button) {
            showToast(
                "ไม่พบปุ่มบันทึกรหัสผ่าน",
                "error"
            );
            return;
        }

        if (newPassword.length < 8) {
            showToast(
                "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
                "error"
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast(
                "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
                "error"
            );
            return;
        }

        button.disabled = true;

        try {
            const {
                error
            } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            $("#password-form")?.reset();

            closeModal("password-modal");

            showToast(
                "เปลี่ยนรหัสผ่านสำเร็จ",
                "success"
            );

        } catch (error) {
            console.error(
                "[S2N Profile] Password error:",
                error
            );

            showToast(
                error.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ",
                "error"
            );

        } finally {
            button.disabled = false;
        }
    }

    /* ==========================================
       AVATAR UPLOAD
    ========================================== */

    async function uploadAvatar(event) {
        const input = event.target;
        const file = input.files?.[0];

        if (!file || !currentUser || !currentProfile) {
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.type)) {
            showToast(
                "รองรับเฉพาะ JPG, PNG และ WEBP",
                "error"
            );

            input.value = "";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast(
                "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 2 MB",
                "error"
            );

            input.value = "";
            return;
        }

        const avatarKey = fieldKey(currentProfile, [
            "avatar_url",
            "profile_image",
            "photo_url",
            "image_url"
        ]);

        if (!avatarKey) {
            showToast(
                "ไม่พบคอลัมน์รูปโปรไฟล์ใน s2n_members",
                "error"
            );

            input.value = "";
            return;
        }

        const extensionMap = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };

        const extension = extensionMap[file.type];

        const filePath =
            `${currentUser.id}/avatar.${extension}`;

        try {
            showToast(
                "กำลังอัปโหลดรูป...",
                "info"
            );

            const {
                error: uploadError
            } = await supabase.storage
                .from("profile-avatars")
                .upload(filePath, file, {
                    upsert: true,
                    contentType: file.type
                });

            if (uploadError) {
                throw uploadError;
            }

            const {
                data: { publicUrl }
            } = supabase.storage
                .from("profile-avatars")
                .getPublicUrl(filePath);

            const {
                data,
                error: updateError
            } = await supabase
                .from("s2n_members")
                .update({
                    [avatarKey]: publicUrl
                })
                .eq("user_id", currentUser.id)
                .select()
                .single();

            if (updateError) {
                throw updateError;
            }

            currentProfile = data;

            renderAvatar();

            showToast(
                "เปลี่ยนรูปโปรไฟล์สำเร็จ",
                "success"
            );

        } catch (error) {
            console.error(
                "[S2N Profile] Avatar upload error:",
                error
            );

            showToast(
                error.message || "อัปโหลดรูปไม่สำเร็จ",
                "error"
            );

        } finally {
            input.value = "";
        }
    }

    /* ==========================================
       EVENT HANDLERS
    ========================================== */

    function bindEvents() {
        $("#edit-profile-btn")?.addEventListener(
            "click",
            openEditProfile
        );

        $("#profile-edit-form")?.addEventListener(
            "submit",
            saveProfile
        );

        $("#password-form")?.addEventListener(
            "submit",
            changePassword
        );

        $("#avatar-upload")?.addEventListener(
            "change",
            uploadAvatar
        );

        $("#change-password-btn")?.addEventListener(
            "click",
            () => openModal("password-modal")
        );

        document.querySelectorAll("[data-close]").forEach(
            (element) => {
                element.addEventListener("click", () => {
                    closeModal(
                        element.getAttribute("data-close")
                    );
                });
            }
        );

        document.addEventListener(
            "keydown",
            (event) => {
                if (event.key !== "Escape") return;

                document.querySelectorAll(
                    ".modal:not(.hidden)"
                ).forEach((modal) => {
                    closeModal(modal.id);
                });
            }
        );
    }

    /* ==========================================
       INIT
    ========================================== */

    async function init() {
        if (!supabase || !supabase.auth) {
            console.error(
                "[S2N Profile] Supabase client not found"
            );

            showToast(
                "ไม่พบ Supabase Client",
                "error"
            );

            return;
        }

        bindEvents();

        try {
            await loadProfile();

        } catch (error) {
            console.error(
                "[S2N Profile] Initialization error:",
                error
            );

            showToast(
                "เกิดข้อผิดพลาดในการโหลดโปรไฟล์",
                "error"
            );
        }
    }

    document.addEventListener(
        "DOMContentLoaded",
        init
    );

})();