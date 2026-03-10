(function () {
  function getCurrentSection() {
    const path = window.location.pathname.toLowerCase();

    if (path.includes("/context")) return "context";
    if (path.includes("/location") || path.includes("/map")) return "location";
    if (path.includes("/notes")) return "notes";
    if (path.includes("/sources")) return "sources";
    return "index";
  }

  const current = getCurrentSection();

  const items = [
    { key: "index", label: "Index", url: "https://sittingsystems.org/index/" },
    { key: "context", label: "By Context", url: "https://sittingsystems.org/context/" },
    { key: "location", label: "By Location", url: "https://sittingsystems.org/location/" },
    { key: "notes", label: "Notes", url: "https://sittingsystems.org/notes/" },
    { key: "sources", label: "Sources", url: "https://sittingsystems.org/sources/" }
  ];

  const navHtml = `
    <nav class="nav" aria-label="Section navigation">
      ${items.map((item, i) => `
        <a
          href="${item.url}"
          target="_top"
          ${item.key === current ? 'class="active"' : ""}
        >${item.label}</a>${i < items.length - 1 ? '<span class="sep">·</span>' : ''}
      `).join("")}
    </nav>
  `;

  document.querySelectorAll('[data-site-nav]').forEach((el) => {
    el.innerHTML = navHtml;
  });
})();
