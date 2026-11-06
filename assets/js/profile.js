/* ==========================================
   S2N HUB | PLAYER PROFILE
   Profile + Admin Member Manager
========================================== */

(() => {
    "use strict";

    const $ = (selector) => document.querySelector(selector);
    const supabase = window.supabaseClient || window.supabase;

    let currentUser = null;
    let currentProfile = null;
    let currentRegistrations = [];
    let adminMembers = [];
    let selectedMemberID = null;
    let isAdmin = false;
    let toastTimer = null;

    /* ==========================================
       HELPERS
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

    function displayValue(value, fallback = "ยังไม่ได้ระบุ") {
        const text = String(value ?? "").trim();
        return text || fallback;
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

    function getUsername(profile) {
        return field(profile, ["username", "member_name"], "member");
    }

   function getFullName(profile) {
    return field(
        profile,
        [
            "display_name",
            "full_name",
            "fullname",
            "name",
            "real_name"
        ],
        ""
    );
}

    function getNickname(profile) {
        return field(profile, ["nickname", "nick_name"], "");
    }

    function getAge(profile) {
        return field(profile, ["age"], "");
    }

    function getGender(profile) {
        const gender = String(field(profile, ["gender"], "")).toLowerCase();

        const labels = {
            male: "ชาย",
            female: "หญิง",
            other: "อื่น ๆ"
        };

        return labels[gender] || gender;
    }

    function getPubgName(profile) {
        return field(profile, ["pubg_name", "game_name", "ign"], "");
    }

    function getPubgUID(profile) {
        return field(profile, ["pubg_uid", "game_uid"], "");
    }

    function getClanTag(profile) {
        return field(profile, ["clan_tag", "clan", "name_tag"], "");
    }

    function getAvatarURL(profile) {
        return field(
            profile,
            ["avatar_url", "profile_image", "photo_url", "image_url"],
            ""
        );
    }

    function isProfileAdmin(profile) {
        const role = String(
            field(profile, ["role", "member_role"], "")
        ).toLowerCase();

        return role === "admin";
    }

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

        if (!document.querySelector(".modal:not(.hidden)")) {
            document.body.classList.remove("modal-open");
        }
    }

    /* ==========================================
       PROFILE DISPLAY
    ========================================== */

    function ensureInfoRow(container, id, label) {
        if (!container) return null;

        let valueElement = document.getElementById(id);
        if (valueElement) return valueElement;

        const row = document.createElement("div");
        row.className = "profile-info-item";

        const labelElement = document.createElement("span");
        labelElement.textContent = label;

        valueElement = document.createElement("strong");
        valueElement.id = id;
        valueElement.textContent = "ยังไม่ได้ระบุ";

        row.append(labelElement, valueElement);
        container.appendChild(row);

        return valueElement;
    }

    function renderProfile() {
        if (!currentProfile || !currentUser) return;

        const profile = currentProfile;

        const username = getUsername(profile);
        const fullName = displayValue(getFullName(profile), username);

        const role = String(
            field(profile, ["role", "member_role"], "member")
        ).toUpperCase();

        const memberID = field(
            profile,
            ["member_id", "id"],
            currentUser.id
        );

        const pubgName = displayValue(getPubgName(profile));
        const pubgUID = displayValue(getPubgUID(profile));
        const clanTag = displayValue(getClanTag(profile));

        $("#profile-name").textContent = fullName;
        $("#profile-username").textContent = `@${username}`;
        $("#profile-role").textContent = role;

        $("#profile-member-id").textContent =
            String(memberID).slice(0, 8).toUpperCase();

        /* PERSONAL DATA */

        $("#info-username").textContent =
            displayValue(username);

        $("#info-fullname").textContent =
            displayValue(getFullName(profile));

        $("#info-email").textContent =
            currentUser.email || "-";

        $("#info-role").textContent = role;

        const personalList = document.querySelector(
            ".profile-content-grid .profile-panel .profile-info-list"
        );

        ensureInfoRow(
            personalList,
            "info-nickname",
            "ชื่อเล่น"
        ).textContent = displayValue(getNickname(profile));

        ensureInfoRow(
            personalList,
            "info-age",
            "อายุ"
        ).textContent = getAge(profile)
            ? `${getAge(profile)} ปี`
            : "ยังไม่ได้ระบุ";

        ensureInfoRow(
            personalList,
            "info-gender",
            "เพศ"
        ).textContent = displayValue(getGender(profile));

        /* PLAYER ACCOUNT */

        $("#info-pubg-name").textContent = pubgName;
        $("#info-pubg-uid").textContent = `UID: ${pubgUID}`;
        $("#info-clan-tag").textContent = clanTag;
    }

    /* ==========================================
       AVATAR DISPLAY
    ========================================== */

    function renderAvatar() {
        const avatar = $("#profile-avatar");
        if (!avatar || !currentProfile) return;

        const avatarURL = getAvatarURL(currentProfile);
        const fullName = getFullName(currentProfile);
        const username = getUsername(currentProfile);

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
       LOAD CURRENT USER PROFILE
    ========================================== */

    async function loadProfile() {
        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser();

        if (authError || !user) {
            showToast("กรุณาเข้าสู่ระบบก่อนใช้งาน", "error");
            window.location.href = "index.html";
            return;
        }

        currentUser = user;

        const { data, error } = await supabase
            .from("s2n_members")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) {
            console.error("[S2N Profile] Load error:", error);
            showToast("โหลดข้อมูลสมาชิกไม่สำเร็จ", "error");
            return;
        }

        if (!data) {
            showToast("ไม่พบข้อมูลสมาชิก", "error");
            return;
        }

        currentProfile = data;
        isAdmin = isProfileAdmin(data);
        selectedMemberID = user.id;

        renderProfile();
        renderAvatar();

        if (isAdmin) {
            await loadAdminMembers();
        }

        await loadRegistrations();
    }
    
    
        /* ==========================================
       TOURNAMENT REGISTRATION HISTORY
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

        if (result.error) {
            result = await supabase
                .from("s2n_tournament_entries")
                .select("*")
                .eq("member_id", currentUser.id);
        }

        if (result.error) {
            console.error("[S2N Profile] Registration error:", result.error);

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

        list.innerHTML = currentRegistrations.map((entry) => {
            const tournamentName = field(
                entry,
                ["tournament_name", "event_name", "title"],
                "Tournament"
            );

            const status = field(
                entry,
                ["status", "approval_status"],
                "pending"
            );

            const createdAt = field(
                entry,
                ["created_at", "registered_at"],
                ""
            );

            const teamName = field(entry, ["team_name"], "");

            return `
                <article class="registration-item">
                    <div class="registration-info">
                        <h3>${escapeHTML(tournamentName)}</h3>

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
        }).join("");
    }

    function renderStats() {
        const total = currentRegistrations.length;

        const approved = currentRegistrations.filter((entry) => {
            const status = String(
                field(entry, ["status", "approval_status"], "")
            ).toLowerCase();

            return ["approved", "accepted", "อนุมัติ"].includes(status);
        }).length;

        const pending = currentRegistrations.filter((entry) => {
            const status = String(
                field(entry, ["status", "approval_status"], "")
            ).toLowerCase();

            return ["pending", "waiting", "รออนุมัติ"].includes(status);
        }).length;

        $("#stat-tournaments").textContent = total;
        $("#stat-approved").textContent = approved;
        $("#stat-pending").textContent = pending;
    }

    /* ==========================================
       ADMIN MEMBER MANAGER
    ========================================== */

    async function loadAdminMembers() {
        const panel = $("#admin-member-panel");
        const select = $("#admin-member-select");

        if (!isAdmin || !panel || !select) return;

        panel.classList.remove("hidden");

        const { data, error } = await supabase
            .from("s2n_members")
            .select("*")
            .order("username", { ascending: true });

        if (error) {
            console.error("[S2N Profile] Admin list error:", error);
            showToast("โหลดรายชื่อสมาชิกไม่สำเร็จ", "error");
            return;
        }

        adminMembers = data || [];

        renderAdminMemberOptions(adminMembers);

        select.value = currentUser.id;
    }

    function renderAdminMemberOptions(members) {
        const select = $("#admin-member-select");
        if (!select) return;

        const currentValue = select.value || currentUser.id;

        select.innerHTML = `
            <option value="">-- เลือกสมาชิก --</option>
        `;

        members.forEach((member) => {
            const userID = member.user_id;
            if (!userID) return;

            const username = getUsername(member);
            const fullName = getFullName(member);
            const pubgName = getPubgName(member);

            const label = [
                username,
                fullName,
                pubgName
            ].filter(Boolean).join(" | ");

            const option = document.createElement("option");
            option.value = userID;
            option.textContent = label || userID;

            select.appendChild(option);
        });

        if (members.some((member) => member.user_id === currentValue)) {
            select.value = currentValue;
        }
    }

    function filterAdminMembers() {
        const search = $("#admin-member-search");
        if (!search) return;

        const query = search.value.trim().toLowerCase();

        const filtered = adminMembers.filter((member) => {
            const values = [
                getUsername(member),
                getFullName(member),
                getNickname(member),
                getPubgName(member),
                getPubgUID(member)
            ];

            return values.some((value) =>
                String(value ?? "").toLowerCase().includes(query)
            );
        });

        renderAdminMemberOptions(filtered);
    }

    async function selectAdminMember() {
        const select = $("#admin-member-select");
        const userID = select?.value;

        if (!isAdmin || !userID) return;

        const member = adminMembers.find(
            (item) => item.user_id === userID
        );

        if (!member) {
            showToast("ไม่พบสมาชิกที่เลือก", "error");
            return;
        }

        selectedMemberID = userID;
        currentProfile = member;

        renderProfile();
        renderAvatar();

        showToast(
            `กำลังจัดการข้อมูล: ${getUsername(member)}`,
            "info"
        );
    }

    /* ==========================================
       EDIT PROFILE MODAL
    ========================================== */

    function openEditProfile() {
        if (!currentProfile) return;

        $("#edit-username").value = getUsername(currentProfile);
        $("#edit-fullname").value = getFullName(currentProfile);

        if ($("#edit-nickname")) {
            $("#edit-nickname").value = getNickname(currentProfile);
        }

        if ($("#edit-age")) {
            $("#edit-age").value = getAge(currentProfile);
        }

        if ($("#edit-gender")) {
            $("#edit-gender").value = field(
                currentProfile,
                ["gender"],
                ""
            );
        }

        $("#edit-pubg-name").value = getPubgName(currentProfile);
        $("#edit-pubg-uid").value = getPubgUID(currentProfile);
        $("#edit-clan-tag").value = getClanTag(currentProfile);

        openModal("profile-edit-modal");
    }

    function makeUpdateData(profile, values) {
        const updateData = {};

        const mappings = [
            {
                candidates: ["username", "member_name"],
                fallback: "username",
                value: values.username
            },
          {
    candidates: [
        "display_name",
        "full_name",
        "fullname",
        "name",
        "real_name"
    ],
    fallback: "display_name",
    value: values.fullName
},
            {
                candidates: ["nickname", "nick_name"],
                fallback: "nickname",
                value: values.nickname
            },
            {
                candidates: ["age"],
                fallback: "age",
                value: values.age
            },
            {
                candidates: ["gender"],
                fallback: "gender",
                value: values.gender
            },
            {
                candidates: ["pubg_name", "game_name", "ign"],
                fallback: "pubg_name",
                value: values.pubgName
            },
            {
                candidates: ["pubg_uid", "game_uid"],
                fallback: "pubg_uid",
                value: values.pubgUID
            },
            {
                candidates: ["clan_tag", "clan", "name_tag"],
                fallback: "clan_tag",
                value: values.clanTag
            }
        ];

        mappings.forEach((item) => {
            const key = fieldKey(profile, item.candidates)
                || item.fallback;

            updateData[key] = item.value;
        });

        if (values.age === "") {
            updateData.age = null;
        } else {
            updateData.age = Number(values.age);
        }

        return updateData;
    }

    async function saveProfile(event) {
        event.preventDefault();

        if (!currentProfile || !currentUser) return;

        const button = $("#save-profile-btn");

        const values = {
            username: $("#edit-username").value.trim(),
            fullName: $("#edit-fullname").value.trim(),
            nickname: $("#edit-nickname")?.value.trim() || "",
            age: $("#edit-age")?.value.trim() || "",
            gender: $("#edit-gender")?.value || "",
            pubgName: $("#edit-pubg-name").value.trim(),
            pubgUID: $("#edit-pubg-uid").value.trim(),
            clanTag: $("#edit-clan-tag").value.trim()
        };

        if (!values.username) {
            showToast("กรุณากรอกชื่อสมาชิก", "error");
            return;
        }

        if (
            values.age &&
            (!Number.isInteger(Number(values.age)) ||
                Number(values.age) < 1 ||
                Number(values.age) > 100)
        ) {
            showToast("กรุณากรอกอายุระหว่าง 1–100 ปี", "error");
            return;
        }

        const targetUserID = isAdmin
            ? selectedMemberID
            : currentUser.id;

        if (!targetUserID) {
            showToast("ไม่พบสมาชิกเป้าหมาย", "error");
            return;
        }

        const updateData = makeUpdateData(currentProfile, values);

        button.disabled = true;

        try {
            const { data, error } = await supabase
                .from("s2n_members")
                .update(updateData)
                .eq("user_id", targetUserID)
                .select()
                .single();

            if (error) throw error;

            currentProfile = data;

            if (isAdmin) {
                const index = adminMembers.findIndex(
                    (member) => member.user_id === targetUserID
                );

                if (index !== -1) {
                    adminMembers[index] = data;
                }
            }

            renderProfile();
            renderAvatar();

            closeModal("profile-edit-modal");

            showToast("บันทึกโปรไฟล์สำเร็จ", "success");

        } catch (error) {
            console.error("[S2N Profile] Save error:", error);

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
        
        const newPassword = $("#new-password")?.value || "";
        const confirmPassword = $("#confirm-password")?.value || "";
        const button = $("#save-password-btn");
        
        if (!button) {
            showToast("ไม่พบปุ่มบันทึกรหัสผ่าน", "error");
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
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            
            if (error) throw error;
            
            $("#password-form")?.reset();
            
            closeModal("password-modal");
            
            showToast("เปลี่ยนรหัสผ่านสำเร็จ", "success");
            
        } catch (error) {
            console.error("[S2N Profile] Password error:", error);
            
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
        
        if (!file || !currentUser || !currentProfile) return;
        
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
        
        const targetUserID = isAdmin ?
            selectedMemberID :
            currentUser.id;
        
        if (!targetUserID) {
            showToast("ไม่พบสมาชิกเป้าหมาย", "error");
            input.value = "";
            return;
        }
        
        const avatarKey = fieldKey(currentProfile, [
            "avatar_url",
            "profile_image",
            "photo_url",
            "image_url"
        ]) || "avatar_url";
        
        const extensionMap = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };
        
        const extension = extensionMap[file.type];
        const filePath = `${targetUserID}/avatar.${extension}`;
        
        try {
            showToast("กำลังอัปโหลดรูป...", "info");
            
            const { error: uploadError } = await supabase.storage
                .from("profile-avatars")
                .upload(filePath, file, {
                    upsert: true,
                    contentType: file.type
                });
            
            if (uploadError) throw uploadError;
            
            const {
                data: { publicUrl }
            } = supabase.storage
                .from("profile-avatars")
                .getPublicUrl(filePath);
            
            const { data, error: updateError } = await supabase
                .from("s2n_members")
                .update({
                    [avatarKey]: publicUrl
                })
                .eq("user_id", targetUserID)
                .select()
                .single();
            
            if (updateError) throw updateError;
            
            currentProfile = data;
            
            if (isAdmin) {
                const index = adminMembers.findIndex(
                    (member) => member.user_id === targetUserID
                );
                
                if (index !== -1) {
                    adminMembers[index] = data;
                }
            }
            
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
        
        $("#admin-member-search")?.addEventListener(
            "input",
            filterAdminMembers
        );
        
        $("#admin-member-select")?.addEventListener(
            "change",
            selectAdminMember
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
        
        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") return;
            
            document.querySelectorAll(".modal:not(.hidden)").forEach(
                (modal) => closeModal(modal.id)
            );
        });
    }
    
    /* ==========================================
       INITIALIZATION
    ========================================== */
    
    async function init() {
        if (!supabase || !supabase.auth) {
            console.error(
                "[S2N Profile] Supabase client not found"
            );
            
            showToast("ไม่พบ Supabase Client", "error");
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
    
    document.addEventListener("DOMContentLoaded", init);
    
    })();