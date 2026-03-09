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
}
