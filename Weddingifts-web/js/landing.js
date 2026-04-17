import {
  getAuthSession,
  getUserMenuMarkup,
  initUserDropdown,
  logoutAndRedirectToLogin,
  refreshMobileHeader
} from "./common.js";

const params = new URLSearchParams(window.location.search);
const slug = params.get("slug");

if (slug) {
  const api = params.get("api");
  const target = new URL("./event.html", window.location.href);
  target.searchParams.set("slug", slug);

  if (api) {
    target.searchParams.set("api", api);
  }

  window.location.replace(target.toString());
} else {
  enhanceHeaderForLoggedUser();
}

function enhanceHeaderForLoggedUser() {
  const session = getAuthSession();
  if (!session?.token) return;

  const navRight = document.querySelector(".shell-nav-right");
  if (!navRight) return;

  navRight.innerHTML = `
    <div class="shell-links">
      <a href="./event.html">Evento público</a>
    </div>
    ${getUserMenuMarkup()}
  `;

  updateHeroCtasForLoggedUser();
  refreshMobileHeader();

  initUserDropdown({
    session,
    onLogout: () => {
      logoutAndRedirectToLogin();
    }
  });
}

function updateHeroCtasForLoggedUser() {
  const primaryHeroAction = document.querySelector(".home-hero-actions .btn-primary");
  if (!primaryHeroAction) return;

  primaryHeroAction.setAttribute("href", "./create-event.html");
  primaryHeroAction.innerHTML = `<span class="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z" fill="currentColor"/></svg></span>Criar meu evento`;
}
