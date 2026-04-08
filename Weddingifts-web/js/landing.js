import { clearAuthSession, getAuthSession, getUserMenuMarkup, initUserDropdown } from "./common.js";

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

  initUserDropdown({
    session,
    onLogout: () => {
      clearAuthSession();
      window.location.href = "./login.html";
    }
  });
}

