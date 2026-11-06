/* ==========================================
   S2N HUB - ADMIN MEMBER DIRECTORY
   Real Supabase Data
   FIX: ROLE MEMBER
========================================== */

document.addEventListener("DOMContentLoaded", loadAdminMembers);

async function loadAdminMembers() {
  const supabase = window.supabaseClient;
  
  const userList = document.getElementById("user-list");
  const adminList = document.getElementById("admin-list");
  const userCount = document.getElementById("user-count");
  const adminCount = document.getElementById("admin-count");
  const pageMessage = document.getElementById("page-message");
  
  if (!supabase) {
    showError("ไม่พบ Supabase Client กรุณาตรวจสอบ supabase.js");
    return;
  }
  
  try {
    // 1. ตรวจสอบ Session
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
      data: currentProfile,
      error: roleError
    } = await supabase
      .from("s2n_members")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (roleError) throw roleError;
    
    if (!currentProfile || currentProfile.role !== "admin") {
      window.location.replace("../dashboard.html");
      return;
    }
    
    // 3. ดึงข้อมูลสมาชิกจาก Supabase
    const {
      data: members,
      error: membersError
    } = await supabase
      .from("s2n_members")
      .select("user_id, username, display_name, role")
      .order("username", { ascending: true });
    
    if (membersError) throw membersError;
    
    // 4. แยก User และ Admin
    // FIX: ฐานข้อมูลใช้ role = member
    const users = members.filter(
      member => member.role === "member"
    );
    
    const admins = members.filter(
      member => member.role === "admin"
    );
    
    // 5. แสดงผล
    renderTable(userList, users, "member");
    renderTable(adminList, admins, "admin");
    
    userCount.textContent = `${users.length} คน`;
    adminCount.textContent = `${admins.length} คน`;
    
    pageMessage.textContent = "";
    
  } catch (error) {
    console.error("S2N Admin Error:", error);
    
    showError(
      error.message ||
      "ไม่สามารถโหลดข้อมูลจาก Supabase ได้"
    );
  }
  
  function showError(message) {
    pageMessage.textContent = message;
    
    userList.innerHTML = `
      <tr>
        <td colspan="4" class="empty-message">
          โหลดข้อมูลไม่สำเร็จ
        </td>
      </tr>
    `;
    
    adminList.innerHTML = `
      <tr>
        <td colspan="4" class="empty-message">
          โหลดข้อมูลไม่สำเร็จ
        </td>
      </tr>
    `;
  }
}

/* ==========================================
   RENDER TABLE
========================================== */

function renderTable(container, members, role) {
  if (!members || members.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="4" class="empty-message">
          ไม่พบสมาชิก
        </td>
      </tr>
    `;
    return;
  }
  
  container.innerHTML = members.map((member, index) => {
    const username = escapeHTML(member.username || "-");
    const displayName = escapeHTML(member.display_name || "-");
    
    const roleText = role === "admin" ? "ADMIN" : "MEMBER";
    const roleClass = role === "admin" ? "role-admin" : "role-user";
    
    return `
      <tr>
        <td>${index + 1}</td>

        <td class="username-cell">
          ${username}
        </td>

        <td>
          ${displayName}
        </td>

        <td>
          <span class="role-badge ${roleClass}">
            ${roleText}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

/* ==========================================
   ESCAPE HTML
========================================== */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}