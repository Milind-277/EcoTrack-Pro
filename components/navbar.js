class NavbarComponent extends HTMLElement {
  connectedCallback() {
    const root = window.location.pathname.includes("/pages/") ? "../" : "./";

    const skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#main";
    skip.textContent = "Skip to main content";
    this.appendChild(skip);

    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Primary navigation");

    const brand = document.createElement("a");
    brand.className = "brand";
    brand.href = `${root}index.html`;
    brand.setAttribute("aria-label", "EcoTrack Pro dashboard");
    const mark = document.createElement("span");
    mark.className = "brand-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "E";
    brand.appendChild(mark);
    brand.appendChild(document.createElement("span")).textContent = "EcoTrack Pro";
    nav.appendChild(brand);

    const links = document.createElement("ul");
    links.className = "nav-links";
    const items = [
      ["Dashboard", `${root}index.html`],
      ["Tracker", `${root}pages/tracker.html`],
      ["Insights", `${root}pages/insights.html`],
      ["Reports", `${root}pages/reports.html`],
      ["Simulator", `${root}pages/simulator.html`],
      ["Leaderboard", `${root}pages/leaderboard.html`]
    ];
    items.forEach(([label, href]) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = href;
      a.textContent = label;
      li.appendChild(a);
      links.appendChild(li);
    });
    nav.appendChild(links);

    const actions = document.createElement("div");
    actions.className = "nav-actions";

    const themeBtn = document.createElement("button");
    themeBtn.className = "theme-toggle";
    themeBtn.type = "button";
    themeBtn.setAttribute("aria-label", "Toggle color theme");
    themeBtn.textContent = "Light";
    actions.appendChild(themeBtn);

    const profileLink = document.createElement("a");
    profileLink.className = "avatar-mini auth-only profile-link";
    profileLink.href = `${root}pages/profile.html`;
    profileLink.setAttribute("aria-label", "Open profile");
    profileLink.textContent = "U";
    actions.appendChild(profileLink);

    const logout = document.createElement("button");
    logout.className = "logout-btn auth-only";
    logout.type = "button";
    logout.setAttribute("aria-label", "Sign out");
    logout.textContent = "Out";
    actions.appendChild(logout);

    const signIn = document.createElement("a");
    signIn.className = "btn guest-only";
    signIn.href = `${root}auth.html`;
    signIn.textContent = "Sign in";
    actions.appendChild(signIn);

    const menu = document.createElement("button");
    menu.className = "menu-toggle";
    menu.type = "button";
    menu.setAttribute("aria-label", "Open menu");
    menu.setAttribute("aria-controls", "mobileNav");
    menu.setAttribute("aria-expanded", "false");
    menu.textContent = "Menu";
    actions.appendChild(menu);

    nav.appendChild(actions);
    this.appendChild(nav);

    const mobile = document.createElement("div");
    mobile.className = "mobile-nav";
    mobile.id = "mobileNav";
    mobile.setAttribute("aria-label", "Mobile navigation");
    items.forEach(([label, href]) => {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = label;
      mobile.appendChild(a);
    });
    const prof = document.createElement("a");
    prof.className = "auth-only profile-link";
    prof.href = `${root}pages/profile.html`;
    prof.textContent = "Profile";
    mobile.appendChild(prof);
    this.appendChild(mobile);

    document.dispatchEvent(new CustomEvent("navbar-ready"));
  }
}

customElements.define("app-navbar", NavbarComponent);
