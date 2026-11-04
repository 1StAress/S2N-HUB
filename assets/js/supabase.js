// =========================================
// S2N HUB - Supabase Client
// =========================================

const SUPABASE_URL =
  "https://qdasblezklaffynknvaa.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_3v3B5W-zDUzL2P5fF5Pigw_PmCn2Hxc";

// ตรวจสอบ Supabase Library
if (!window.supabase) {
  console.error(
    "S2N HUB: Supabase Library not loaded."
  );
} else {
  // สร้าง Supabase Client
  window.supabaseClient =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );
  
  console.log(
    "S2N HUB: Supabase Client initialized."
  );
}

// ตรวจสอบว่า Supabase SDK โหลดแล้ว
if (!window.supabase) {
  console.error("Supabase SDK not loaded");
} else {
  // สร้าง Client กลาง
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
  
  console.log("S2N HUB Supabase connected");
}

