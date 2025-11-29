// frontend/js/logout.js

(function () {
  function goToLogin() {
    try {
      // DEV: localhost / 127.0.0.1 / file-based
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        const path = window.location.pathname || "";

        // If we're inside /frontend/ (e.g. /frontend/chat.html)
        if (path.includes("/frontend/")) {
          window.location.href = "../index.html";
        } else {
          window.location.href = "index.html";
        }
        return;
      }

      // PROD / ANY OTHER HOST:
      // send them to the root, which serves index.html
      window.location.href = window.location.origin + "/";
    } catch (err) {
      console.error("Error during redirect to login:", err);
      // Fallback
      window.location.href = "/";
    }
  }

  function doLogout() {
    try {
      localStorage.removeItem("tb_token");
      localStorage.removeItem("tb_user");
    } catch (err) {
      console.error("Error clearing auth data:", err);
    }

    goToLogin();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const logoutLink = document.getElementById("navLogout");
    if (!logoutLink) return;

    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      doLogout();
    });
  });
})();
