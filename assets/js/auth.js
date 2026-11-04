// =========================================
// S2N HUB AUTH
// SUPABASE LOGIN
// =========================================

document.addEventListener("DOMContentLoaded", () => {
  
  const passwordInput =
    document.getElementById("password");
  
  const usernameInput =
    document.getElementById("username");
  
  const togglePassword =
    document.getElementById("toggle-password");
  
  const loginForm =
    document.getElementById("login-form");
  
  const loginMessage =
    document.getElementById("login-message");
  
  const supabaseClient =
    window.supabaseClient;
  
  // =========================================
  // CHECK ELEMENTS
  // =========================================
  
  if (
    !passwordInput ||
    !usernameInput ||
    !togglePassword ||
    !loginForm ||
    !loginMessage
  ) {
    console.error(
      "S2N HUB: Login elements not found."
    );
    return;
  }
  
  if (!supabaseClient) {
    loginMessage.textContent =
      "ไม่สามารถเชื่อมต่อ Supabase ได้";
    
    console.error(
      "S2N HUB: Supabase Client missing."
    );
    
    return;
  }
  
  // =========================================
  // SHOW / HIDE PASSWORD
  // =========================================
  
  togglePassword.addEventListener(
    "click",
    () => {
      
      const isPassword =
        passwordInput.type === "password";
      
      passwordInput.type =
        isPassword ? "text" : "password";
      
      togglePassword.textContent =
        isPassword ? "HIDE" : "SHOW";
      
    }
  );
  
  // =========================================
  // LOGIN
  // =========================================
  
  loginForm.addEventListener(
    "submit",
    async (event) => {
      
      event.preventDefault();
      
      const username =
        usernameInput.value
        .trim()
        .toLowerCase();
      
      const password =
        passwordInput.value;
      
      if (!username || !password) {
        
        loginMessage.textContent =
          "กรุณากรอก Username และ Password";
        
        return;
      }
      
      loginMessage.textContent =
        "กำลังเข้าสู่ระบบ...";
      
      const loginButton =
        loginForm.querySelector(
          'button[type="submit"]'
        );
      
      if (loginButton) {
        loginButton.disabled = true;
      }
      
      try {
        
        // Username -> Email
        const email = username.includes("@") ?
  username :
  `${username}@s2nhub.local`;
        
        const {
          data,
          error
        } = await supabaseClient.auth
          .signInWithPassword({
            email,
            password
          });
        
        if (error) {
          throw error;
        }
        
        if (!data.user) {
          throw new Error(
            "ไม่พบข้อมูลผู้ใช้"
          );
        }
        
        loginMessage.textContent =
          "เข้าสู่ระบบสำเร็จ";
        
        // Redirect Dashboard
        window.location.href =
          "dashboard.html";
        
      } catch (error) {
        
        console.error(
          "S2N HUB Login Error:",
          error
        );
        
        loginMessage.textContent =
          "Username หรือ Password ไม่ถูกต้อง";
        
      } finally {
        
        if (loginButton) {
          loginButton.disabled = false;
        }
        
      }
      
    }
  );
  
});