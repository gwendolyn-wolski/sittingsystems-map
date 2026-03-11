(function () {
  const NAV_ITEMS = [
    { label: "Index", href: "https://sittingsystems.org/index/" },
    { label: "By Context", href: "https://sittingsystems.org/context/" },
    { label: "By Location", href: "https://sittingsystems.org/location/" },
    { label: "Notes", href: "https://sittingsystems.org/notes/" },
    { label: "Sources", href: "https://sittingsystems.org/sources/" }
  ];

  function getCurrentKey() {
    const href = window.location.href;
    if (href.includes("/context")) return "context";
    if (href.includes("/location") || href.includes("/map")) return "location";
    if (href.includes("/notes")) return "notes";
    if (href.includes("/sources")) return "sources";
    return "index";
  }

  function getItemKey(href) {
    if (href.includes("/context/")) return "context";
    if (href.includes("/location/")) return "location";
    if (href.includes("/notes/")) return "notes";
    if (href.includes("/sources/")) return "sources";
    return "index";
  }

  function buildNav() {
    const activeKey = getCurrentKey();

    return `
      <nav class="ss-nav" aria-label="Section navigation">
        ${NAV_ITEMS.map((item, i) => {
          const active = getItemKey(item.href) === activeKey ? "active" : "";
          return `
            <a class="ss-nav-link ${active}" href="${item.href}" target="_top">${item.label}</a>
            ${i < NAV_ITEMS.length - 1 ? `<span class="ss-nav-sep">·</span>` : ``}
          `;
        }).join("")}
      </nav>
    `;
  }

  function injectStyles() {
    if (document.getElementById("ss-nav-styles")) return;

    const style = document.createElement("style");
    style.id = "ss-nav-styles";
    style.textContent = `
      [data-site-nav] {
        position: fixed !important;
        top: 28px !important;
        right: 34px !important;
        left: auto !important;
        z-index: 9999 !important;
        display: flex !important;
        justify-content: flex-end !important;
        align-items: flex-start !important;
        width: auto !important;
        pointer-events: none;
      }

      [data-site-nav] .ss-nav {
        pointer-events: auto;
        display: inline-flex;
        align-items: center;
        margin: 0;
        padding: 0;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 10.5px;
        line-height: 1;
        font-weight: 500;
        letter-spacing: -0.01em;
        color: rgba(17,17,17,.82);
        white-space: nowrap;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
      }

      [data-site-nav] .ss-nav-link {
        color: inherit;
        text-decoration: none;
        opacity: .74;
        transition: opacity .16s ease;
      }

      [data-site-nav] .ss-nav-link:hover {
        opacity: 1;
      }

      [data-site-nav] .ss-nav-link.active {
        opacity: 1;
        font-weight: 600;
        border-bottom: 1px solid rgba(17,17,17,.78);
        padding-bottom: 2px;
      }

      [data-site-nav] .ss-nav-sep {
        margin: 0 11px;
        opacity: .34;
      }

      @media (max-width: 900px) {
        [data-site-nav] {
          top: 20px !important;
          right: 20px !important;
          left: auto !important;
          justify-content: flex-end !important;
          max-width: calc(100vw - 40px);
        }

        [data-site-nav] .ss-nav {
          font-size: 10.5px;
          line-height: 1.3;
          white-space: normal;
          flex-wrap: wrap;
          justify-content: flex-end;
          row-gap: 6px;
        }

        [data-site-nav] .ss-nav-sep {
          margin: 0 7px;
        }
      }

      @media (max-width: 680px) {
        [data-site-nav] {
          top: 16px !important;
          right: 16px !important;
          left: auto !important;
          max-width: calc(100vw - 32px);
        }

        [data-site-nav] .ss-nav {
          font-size: 10px;
          line-height: 1.35;
        }

        [data-site-nav] .ss-nav-sep {
          margin: 0 6px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function mountNav() {
    injectStyles();
    document.querySelectorAll("[data-site-nav]").forEach((el) => {
      el.innerHTML = buildNav();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountNav);
  } else {
    mountNav();
  }
})();
