// =========================================
// S2N HUB - REGISTER
// USERNAME + PUBG NAME + PASSWORD
// =========================================

document.addEventListener("DOMContentLoaded", () => {
  
  const usernameInput =
    document.getElementById("username");
  
  const pubgNameInput =
    document.getElementById("pubg-name");
  
  const passwordInput =
    document.getElementById("password");
  
  const confirmPasswordInput =
    document.getElementById("confirm-password");
  
  const registerForm =
    document.getElementById("register-form");
  
  const registerMessage =
    document.getElementById("register-message");
  
  const supabaseClient =
    window.supabaseClient;
  
  if (!supabaseClient) {
    registerMessage.textContent =
      "Supabase ยังไม่พร้อมใช้งาน";
    return;
  }
  
  // SHOW / HIDE PASSWORD
  document.querySelectorAll(
    ".toggle-password"
  ).forEach(button => {
    
    button.addEventListener("click", () => {
      
      const input = document.getElementById(
        button.dataset.target
      );
      
      if (!input) return;
      
      const isPassword =
        input.type === "password";
      
      input.type =
        isPassword ? "text" : "password";
      
      button.textContent =
        isPassword ? "HIDE" : "SHOW";
    });
  });
  
  // REGISTER
  registerForm.addEventListener(
    "submit",
    async (event) => {
      
      event.preventDefault();
      
      const username =
        usernameInput.value
        .trim()
        .toLowerCase();
      
      const pubgName =
        pubgNameInput.value.trim();
      
      const password =
        passwordInput.value;
      
      const confirmPassword =
        confirmPasswordInput.value;
      
      if (
        !/^[a-z0-9_]{3,20}$/.test(username)
      ) {
        registerMessage.textContent =
          "Username ใช้ a-z, 0-9 และ _";
        return;
      }
      
      if (password.length < 8) {
        registerMessage.textContent =
          "Password ต้องมีอย่างน้อย 8 ตัว";
        return;
      }
      
      if (password !== confirmPassword) {
        registerMessage.textContent =
          "Password ไม่ตรงกัน";
        return;
      }
      
      if (!pubgName) {
        registerMessage.textContent =
          "กรุณากรอก PUBG Name";
        return;
      }
      
      const registerButton =
        registerForm.querySelector(
          'button[type="submit"]'
        );
      
      registerMessage.textContent =
        "กำลังสมัครสมาชิก...";
      
      if (registerButton) {
        registerButton.disabled = true;
      }
      
      try {
        
        // สร้าง Email ภายในอัตโนมัติ
        const internalEmail =
          `${username}@s2nhub.local`;
        
        const {
          data,
          error
        } = await supabaseClient.auth.signUp({
          
          email: internalEmail,
          
          password: password,
          
          options: {
            data: {
              username: username,
              display_name: pubgName,
              pubg_name: pubgName
            }
          }
        });
        
        if (error) {
          throw error;
        }
        
        if (!data.user) {
          throw new Error(
            "สร้างบัญชีไม่สำเร็จ"
          );
        }
        
        if (!data.session) {
          registerMessage.textContent =
            "บัญชีถูกสร้างแล้ว แต่ระบบต้องยืนยัน Email ภายใน กรุณาตรวจสอบการตั้งค่า Auth";
          return;
        }
        
        registerMessage.textContent =
          "สมัครสมาชิกสำเร็จ!";
        
        window.location.href =
          "dashboard.html";
        
      } catch (error) {
        
        console.error(
          "S2N Register Error:",
          error
        );
        
        if (
          error.code === "23505" ||
          error.message?.toLowerCase()
          .includes("already registered")
        ) {
          registerMessage.textContent =
            "Username นี้ถูกใช้งานแล้ว";
        } else {
          registerMessage.textContent =
            error.message ||
            "สมัครสมาชิกไม่สำเร็จ";
        }
        
      } finally {
        
        if (registerButton) {
          registerButton.disabled = false;
        }
      }
    }
  );
});