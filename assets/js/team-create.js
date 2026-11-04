// S2N HUB - Create Team V1.3
// Supabase Connected + Full Debug

(() => {
  "use strict";

  // ======================================
  // SUPABASE CLIENT
  // ======================================

  const s2nClient = window.supabaseClient;

  const teamForm = document.getElementById("create-team-form");
  const teamMessage = document.getElementById("team-message");

  const submitButton = teamForm
    ? teamForm.querySelector('button[type="submit"]')
    : null;

  console.log("S2N HUB: Create Team V1.3 initialized.");

  console.log("S2N DEBUG: Client exists:", !!s2nClient);
  console.log("S2N DEBUG: Auth type:", typeof s2nClient?.auth);
  console.log("S2N DEBUG: RPC type:", typeof s2nClient?.rpc);

  // ======================================
  // ERROR DETAIL
  // ======================================

  function getErrorDetails(error) {
    if (!error) {
      return "Unknown error";
    }

    const details = [];

    try {
      details.push(`Name: ${error.name || "Unknown"}`);
      details.push(`Message: ${error.message || "No message"}`);
      details.push(`Code: ${error.code || "N/A"}`);
      details.push(`Details: ${error.details || "N/A"}`);
      details.push(`Hint: ${error.hint || "N/A"}`);
      details.push(`String: ${String(error)}`);

      if (error.stack) {
        details.push(`Stack: ${error.stack}`);
      }

      const properties = Object.getOwnPropertyNames(error);

      properties.forEach(property => {
        try {
          details.push(
            `${property}: ${String(error[property])}`
          );
        } catch (_) {
          details.push(`${property}: [unreadable]`);
        }
      });

    } catch (debugError) {
      details.push(`Debug error: ${String(debugError)}`);
    }

    return details.join("\n");
  }

  // ======================================
  // MESSAGE
  // ======================================

  function showTeamMessage(message, type) {
    if (!teamMessage) {
      console.error("S2N MESSAGE:", message);
      return;
    }

    teamMessage.textContent = message;

    teamMessage.className =
      `team-message show ${type}`;
  }

  // ======================================
  // HELPERS
  // ======================================

  function getValue(id) {
    const element = document.getElementById(id);

    if (!element) {
      throw new Error(
        `Missing HTML element: ${id}`
      );
    }

    return element.value.trim();
  }

  function normalizeName(name) {
    return name.trim().toLowerCase();
  }

  function setLoading(isLoading) {
    if (!submitButton) return;

    submitButton.disabled = isLoading;

    submitButton.textContent = isLoading
      ? "CREATING TEAM..."
      : "CREATE TEAM";
  }

  // ======================================
  // INITIAL CHECK
  // ======================================

  if (!teamForm) {
    console.error(
      "S2N DEBUG: create-team-form not found."
    );

    return;
  }

  if (!s2nClient) {
    console.error(
      "S2N DEBUG: window.supabaseClient is missing."
    );

    showTeamMessage(
      "Supabase Client ไม่พร้อมใช้งาน",
      "error"
    );

    return;
  }

  if (typeof s2nClient.rpc !== "function") {
    console.error(
      "S2N DEBUG: Supabase Client RPC is unavailable.",
      s2nClient
    );

    showTeamMessage(
      "Supabase Client ไม่มี RPC Function",
      "error"
    );

    return;
  }

  if (!submitButton) {
    console.error(
      "S2N DEBUG: Submit button not found."
    );

    showTeamMessage(
      "ไม่พบปุ่มสร้างทีม",
      "error"
    );

    return;
  }

  // ======================================
  // SUBMIT
  // ======================================

  teamForm.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      console.log(
        "S2N DEBUG: Submit event fired."
      );

      if (submitButton.disabled) {
        console.warn(
          "S2N DEBUG: Submit already in progress."
        );

        return;
      }

      setLoading(true);

      try {
        // ======================================
        // GET FORM DATA
        // ======================================

        const teamName = getValue("team-name");

        const teamTag = getValue("team-tag")
          .toUpperCase();

        const description =
          getValue("team-description");

        const leader = getValue("leader-name");

        const player1 = getValue("player-1");
        const player2 = getValue("player-2");
        const player3 = getValue("player-3");

        const substitute =
          getValue("substitute");

        const confirmTeam =
          document.getElementById("confirm-team");

        console.log(
          "S2N DEBUG: Form data collected."
        );

        // ======================================
        // VALIDATION
        // ======================================

        if (
          !teamName ||
          !teamTag ||
          !leader ||
          !player1 ||
          !player2 ||
          !player3
        ) {
          showTeamMessage(
            "กรุณากรอกข้อมูลทีมและผู้เล่นหลักให้ครบ",
            "error"
          );

          return;
        }

        if (!/^[A-Z0-9]{2,6}$/.test(teamTag)) {
          showTeamMessage(
            "Team Tag ต้องเป็นภาษาอังกฤษตัวพิมพ์ใหญ่หรือตัวเลข 2-6 ตัว",
            "error"
          );

          return;
        }

        const players = [
          leader,
          player1,
          player2,
          player3
        ];

        if (substitute) {
          players.push(substitute);
        }

        const normalizedPlayers =
          players.map(normalizeName);

        if (
          new Set(normalizedPlayers).size !==
          normalizedPlayers.length
        ) {
          showTeamMessage(
            "พบ PUBG Name ซ้ำ กรุณาตรวจสอบรายชื่อ",
            "error"
          );

          return;
        }

        if (
          !confirmTeam ||
          !confirmTeam.checked
        ) {
          showTeamMessage(
            "กรุณายืนยันข้อมูลทีมก่อนสร้างทีม",
            "error"
          );

          return;
        }

        // ======================================
        // AUTHENTICATION
        // ======================================

        console.log(
          "S2N DEBUG: Checking user authentication..."
        );

        if (
          !s2nClient.auth ||
          typeof s2nClient.auth.getUser !== "function"
        ) {
          throw new Error(
            "Supabase auth.getUser() is unavailable."
          );
        }

        const authResult =
          await s2nClient.auth.getUser();

        console.log(
          "S2N DEBUG: Auth result:",
          authResult
        );

        const user = authResult?.data?.user;
        const authError = authResult?.error;

        if (authError) {
          console.error(
            "S2N DEBUG: Authentication error:",
            getErrorDetails(authError)
          );

          throw authError;
        }

        if (!user) {
          showTeamMessage(
            "กรุณาเข้าสู่ระบบก่อนสร้างทีม",
            "error"
          );

          window.location.href =
            "../login.html";

          return;
        }

        console.log(
          "S2N DEBUG: Authenticated user:",
          user.id
        );

        // ======================================
        // RPC
        // ======================================

        const rpcParams = {
          p_team_name: teamName,
          p_team_tag: teamTag,
          p_description: description,
          p_leader_name: leader,
          p_player_1: player1,
          p_player_2: player2,
          p_player_3: player3,
          p_substitute: substitute || null
        };

        console.log(
          "S2N DEBUG: Calling s2n_create_team."
        );

        console.log(
          "S2N DEBUG: RPC parameters:",
          rpcParams
        );

        const rpcResult = await s2nClient.rpc(
          "s2n_create_team",
          rpcParams
        );

        console.log(
          "S2N DEBUG: RPC result:",
          rpcResult
        );

        const teamId = rpcResult?.data;
        const rpcError = rpcResult?.error;

        // ======================================
        // RPC ERROR
        // ======================================

        if (rpcError) {
          console.error(
            "S2N DEBUG: RPC ERROR DETAILS:",
            getErrorDetails(rpcError)
          );

          if (rpcError.code === "23505") {
            showTeamMessage(
              "Team Tag นี้ถูกใช้งานแล้ว",
              "error"
            );

          } else {
            showTeamMessage(
              rpcError.message ||
              getErrorDetails(rpcError),
              "error"
            );
          }

          return;
        }

        // ======================================
        // TEAM ID CHECK
        // ======================================

        if (!teamId) {
          console.error(
            "S2N DEBUG: RPC returned no Team ID."
          );

          showTeamMessage(
            "ระบบไม่ได้รับ Team ID จากฐานข้อมูล",
            "error"
          );

          return;
        }

        // ======================================
        // SUCCESS
        // ======================================

        console.log(
          "S2N DEBUG: TEAM CREATED SUCCESSFULLY:",
          teamId
        );

        showTeamMessage(
          "สร้างทีมสำเร็จ! กำลังเปิดหน้า Team Profile",
          "success"
        );

        window.location.href =
          `team-detail.html?id=${encodeURIComponent(teamId)}`;

      } catch (error) {
        console.error(
          "========== S2N CREATE TEAM ERROR =========="
        );

        console.error(
          "S2N DEBUG: Unexpected error:",
          error
        );

        console.error(
          "S2N DEBUG: Error details:\n" +
          getErrorDetails(error)
        );

        console.error(
          "S2N DEBUG: Client:",
          s2nClient
        );

        console.error(
          "S2N DEBUG: Auth type:",
          typeof s2nClient?.auth
        );

        console.error(
          "S2N DEBUG: RPC type:",
          typeof s2nClient?.rpc
        );

        console.error(
          "==========================================="
        );

        showTeamMessage(
          error?.message ||
          `${error?.name || "Error"}: ${String(error)}`,
          "error"
        );

      } finally {
        setLoading(false);
      }
    }
  );

})();