// frontend/js/logout.js
// Handles client-side logout for TerminalBoard.
// Responsibilities:
// - Clear auth data from localStorage
// - Redirect the user back to the login page (index.html)
// - Works correctly for:
//   - Local dev (localhost / 127.0.0.1)
//   - Live Server paths (/frontend/*)
//   - Deployed production builds

(function () {
  /**
   * Redirect the user back to the login page.
   * This function handles both local dev paths and deployed environments.
   */
  function goToLogin() {
    try {
      // Local development environments
      // (Live Server often uses 127.0.0.1 instead of localhost)
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        const path = window.location.pathname || "";

        // If the current page lives inside /frontend/
        // (e.g. /frontend/chat.html or /frontend/admin.html),
        // navigate back up to the root index.html
        if (path.includes("/frontend/")) {
          window.location.href = "../index.html";
        } else {
          // Otherwise assume we're already at root level
          window.location.href = "index.html";
        }
        return;
      }

      // Production or other hosts:
      // Redirect to site root, which serves index.html
      window.location.href = window.location.origin + "/";
    } catch (err) {
      console.error("Error during redirect to login:", err);

      // Final fallback if anything goes wrong
      window.location.href = "/";
    }
  }

  /**
   * Perform logout:
   * - Remove JWT token
   * - Remove cached user object
   * - Redirect to login
   */
  function doLogout() {
    try {
      localStorage.removeItem("tb_token");
      localStorage.removeItem("tb_user");
    } catch (err) {
      console.error("Error clearing auth data:", err);
    }

    goToLogin();
  }

  /**
   * Wire logout handler once DOM is ready.
   * Expects a logout link with id="navLogout".
   */
  document.addEventListener("DOMContentLoaded", () => {
    const logoutLink = document.getElementById("navLogout");
    if (!logoutLink) return;

    logoutLink.addEventListener("click", (e) => {
      e.preventDefault();
      doLogout();
    });
  });
})();
