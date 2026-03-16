import { clearAuthSession, getAuthSession, initUserDropdown } from "./common.js";

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
    <div class="user-menu-wrap">
      <button id="user-menu-button" class="user-chip" type="button" aria-expanded="false" aria-haspopup="menu">Minha conta</button>
      <div id="user-menu" class="user-menu" hidden>
        <a href="./create-event.html">Criar evento</a>
        <a href="./my-events.html">Gerenciar meus eventos</a>
        <span class="menu-group">Gerenciar eventos</span>
        <a class="menu-subitem" href="./my-guests.html">Gerenciar convidados</a>
        <a class="menu-subitem" href="./my-event.html">Gerenciar presentes</a>
        <a href="./account.html">Minha conta</a>
        <button id="logout-action" type="button">Sair</button>
      </div>
    </div>
  `;

  initUserDropdown({
    session,
    onLogout: () => {
      clearAuthSession();
      window.location.href = "./login.html";
    }
  });
}
