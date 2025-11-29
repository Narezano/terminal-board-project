// frontend/js/auth-guard.js

(function () {
  function isLoggedIn() {
    try {
      const token = localStorage.getItem("tb_token");
      const user = localStorage.getItem("tb_user");
      return !!token && !!user;
    } catch (err) {
      console.error("Error checking auth:", err);
      return false;
    }
  }

  function redirectToLogin() {
    try {
      // DEV: localhost / 127.0.0.1
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
      // send them to the site root (where index.html lives)
      window.location.href = window.location.origin + "/";
    } catch (err) {
      console.error("Error during redirect to login:", err);
      // Fallback
      window.location.href = "/";
    }
  }

  // Run immediately on load – protect this page
  if (!isLoggedIn()) {
    redirectToLogin();
  }
})();
