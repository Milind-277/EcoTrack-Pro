(() => {
  function rootPrefix() {
    return window.location.pathname.includes("/pages/") ? "../" : "./";
  }

  window.EcoAuth = {
    requireAuth() {
      if (!window.EcoData.getCurrentUserSync()) {
        window.location.replace(`${rootPrefix()}auth.html`);
        return false;
      }
      return true;
    },
    redirectIfAuthenticated() {
      if (window.EcoData.getCurrentUserSync()) {
        window.location.replace(`${rootPrefix()}index.html`);
      }
    },
    async login(form) {
      const rawEmail = String(form.querySelector("#loginEmail")?.value || "").trim();
      const rawPassword = String(form.querySelector("#loginPassword")?.value || "");
      const email = window.EcoData.sanitizeText(rawEmail, 120).toLowerCase();
      const password = rawPassword;
      if (!email || !password) throw new Error("Please provide email and password.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error("Enter a valid email address.");
      return window.EcoData.login(email, password);
    },
    async signup(form) {
      const rawName = String(form.querySelector("#signupName")?.value || "").trim();
      const rawEmail = String(form.querySelector("#signupEmail")?.value || "").trim();
      const rawPassword = String(form.querySelector("#signupPassword")?.value || "");
      const rawConfirm = String(form.querySelector("#signupConfirm")?.value || "");
      const name = window.EcoData.sanitizeText(rawName, 80);
      const email = window.EcoData.sanitizeText(rawEmail, 120).toLowerCase();
      const password = rawPassword;
      const confirm = rawConfirm;
      if (password !== confirm) throw new Error("Passwords do not match.");
      if (name.length < 2) throw new Error("Enter your full name (min 2 characters).");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error("Enter a valid email address.");
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      return window.EcoData.signup(name, email, password);
    },
    logout() {
      window.EcoData.logout();
      window.location.href = `${rootPrefix()}auth.html`;
    }
  };
})();
