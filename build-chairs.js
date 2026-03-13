const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const ROOT = __dirname;
const CSV_PATH = path.join(ROOT, "chairs.csv");
const TEMPLATE_PATH = path.join(ROOT, "chair-template.html");

const FULL_JSON_PATH = path.join(ROOT, "chair-data.json");
const INDEX_JSON_PATH = path.join(ROOT, "index.json");
const CONTEXT_JSON_PATH = path.join(ROOT, "context.json");
const FEATURED_JSON_PATH = path.join(ROOT, "featured.json");

const csvText = fs.readFileSync(CSV_PATH, "utf8");
const template = fs.readFileSync(TEMPLATE_PATH, "utf8");

const rows = parse(csvText, {
  columns: true,
  skip_empty_lines: true
});

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function splitList(value) {
  const raw = clean(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map(part => part.trim())
    .filter(Boolean);
}

function firstNonEmpty(row, keys) {
  for (const key of keys) {
    if (clean(row[key])) return clean(row[key]);
  }
  return "";
}

function toNum(value) {
  const n = Number(clean(value));
  return Number.isFinite(n) ? n : null;
}

function displayIdNumber(displayId) {
  const match = clean(displayId).match(/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function joinParts(parts) {
  return parts.map(clean).filter(Boolean).join(", ");
}

function makeMetaBlock(label, value, secondary = false) {
  const v = clean(value);
  if (!v) return "";
  return `
    <div class="meta-group${secondary ? " secondary" : ""}">
      <p class="meta-label">${escapeHtml(label)}</p>
      <p class="meta-value">${escapeHtml(v)}</p>
    </div>
  `;
}

function paragraphize(text) {
  const raw = clean(text);
  if (!raw) return "";

  const paragraphs = raw
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return `<div class="notes"><p>${escapeHtml(raw)}</p></div>`;
  }

  return `<div class="notes">${paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("")}</div>`;
}

function imageBlock(imageFile, pageTitle) {
  if (!imageFile) {
    return `<div class="empty-image" aria-hidden="true"></div>`;
  }

  return `
    <div class="image-wrap">
      <img
        class="main-image"
        src="../images/${escapeHtml(imageFile)}"
        alt="${escapeHtml(pageTitle)}"
        loading="eager"
        onload="postSize()"
        onerror="console.error('IMAGE FAILED:', this.src); this.closest('.image-wrap').innerHTML=''; postSize();"
      />
    </div>
  `;
}

function titleFromMapLabelFallback(mapLabel, displayId) {
  const raw = clean(mapLabel);
  if (!raw) return "";
  if (displayId && raw.startsWith(displayId)) {
    return raw.replace(
      new RegExp("^" + displayId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+[—-]\\s+"),
      ""
    ).trim();
  }
  return raw;
}

function objectNav(previousChair, nextChair) {
  if (!previousChair && !nextChair) return "";

  const prevHref = previousChair
    ? `https://sittingsystems.org/${previousChair.Slug}/`
    : "";

  const nextHref = nextChair
    ? `https://sittingsystems.org/${nextChair.Slug}/`
    : "";

  const prevHtml = previousChair
    ? `
      <a class="nav-link prev" href="${escapeHtml(prevHref)}" target="_top" rel="noopener">
        <span class="nav-kicker">Previous object</span>
        <span class="nav-title">← ${escapeHtml(previousChair.Display_ID)} — ${escapeHtml(previousChair.Title)}</span>
      </a>
    `
    : `<div></div>`;

  const nextHtml = nextChair
    ? `
      <a class="nav-link next" href="${escapeHtml(nextHref)}" target="_top" rel="noopener">
        <span class="nav-kicker">Next object</span>
        <span class="nav-title">${escapeHtml(nextChair.Display_ID)} — ${escapeHtml(nextChair.Title)} →</span>
      </a>
    `
    : "";

  return `<nav class="nav-row">${prevHtml}${nextHtml}</nav>`;
}

const chairs = rows
  .filter(row => {
    const displayId = clean(row["Display_ID"]);
    const webStatus = clean(row["Web Status"]).toLowerCase();

    if (!displayId) return false;
    if (webStatus && webStatus !== "public") return false;

    return true;
  })
  .map(row => {
    const displayId = clean(row["Display_ID"]);
    const title =
      firstNonEmpty(row, ["Title"]) ||
      titleFromMapLabelFallback(row["Map_Label"], displayId);

    const imageFile = `${displayId}.jpeg`;

    const city = firstNonEmpty(row, ["City"]);
    const state = firstNonEmpty(row, ["State"]);
    const country = firstNonEmpty(row, ["Country"]);
    const location = joinParts([city, state, country]);

    const contextPrimary = firstNonEmpty(row, ["Context (Primary)"]);
    const contextSecondaryList = splitList(firstNonEmpty(row, ["Context - Secondary"]));
    const contextCombined = [contextPrimary, ...contextSecondaryList]
      .filter(Boolean)
      .join(", ");

    const originSystem = splitList(firstNonEmpty(row, ["Origin System"])).join(", ");
    const currentSystem = splitList(
      firstNonEmpty(row, ["Current System (multi-select)", "Current System"])
    ).join(", ");
    const materials = splitList(firstNonEmpty(row, ["Materials"])).join(", ");
    const bodyState = splitList(firstNonEmpty(row, ["Body State"])).join(", ");

    const subtitle = title
      ? `${displayId} — ${title}`
      : "An archive of chairs, seats, and the context in which the body rests.";

    return {
      Record_Number: toNum(row["Record Number"] ?? row["Record_Number"]),
      Sort_Number: displayIdNumber(displayId),
      Display_ID: displayId,
      Title: title,
      Slug: displayId.toLowerCase(),
      Seating_Type: firstNonEmpty(row, ["Seating Type", "Seating_Type"]),
      Context_Primary: contextPrimary,
      Context_Secondary: contextSecondaryList,
      Origin_System: originSystem,
      Current_System: currentSystem,
      Environment: firstNonEmpty(row, ["Environment"]),
      Country: country,
      State: state,
      City: city,
      Site_Type: firstNonEmpty(row, ["Site Type"]),
      Materials: materials,
      Visibility: firstNonEmpty(row, ["Visibility"]),
      Duration: firstNonEmpty(row, ["Duration"]),
      Posture: firstNonEmpty(row, ["Posture"]),
      Body_State: bodyState,
      Observations: firstNonEmpty(row, ["Observations"]),
      Caption: firstNonEmpty(row, ["Caption", "Captions"]),
      Thumbnail: imageFile,
      Latitude: toNum(row["Latitude"]),
      Longitude: toNum(row["Longitude"]),
      Readymag_URL:
        firstNonEmpty(row, ["Readymag_URL"]) ||
        `https://sittingsystems.org/${displayId.toLowerCase()}/`,
      Map_Label: firstNonEmpty(row, ["Map_Label"]),
      Featured: firstNonEmpty(row, ["Featured"]),
      Web_Status: firstNonEmpty(row, ["Web Status"]),
      Location: location,
      Context_Combined: contextCombined,
      Header_Subtitle: subtitle
    };
  })
  .sort((a, b) => {
    if (a.Sort_Number != null && b.Sort_Number != null) {
      return a.Sort_Number - b.Sort_Number;
    }
    return a.Display_ID.localeCompare(b.Display_ID);
  });

const chairsAsc = chairs;
const chairsDesc = [...chairsAsc].reverse();

// chair-data.json stays ascending for object navigation
fs.writeFileSync(FULL_JSON_PATH, JSON.stringify(chairsAsc, null, 2), "utf8");

// index.json becomes newest first by reversing the asc array
fs.writeFileSync(INDEX_JSON_PATH, JSON.stringify(chairsDesc, null, 2), "utf8");

// context.json groups from newest-first order
const contextMap = {};
for (const chair of chairsDesc) {
  const key = clean(chair.Context_Primary);
  if (!key) continue;
  if (!contextMap[key]) contextMap[key] = [];
  contextMap[key].push(chair);
}
fs.writeFileSync(CONTEXT_JSON_PATH, JSON.stringify(contextMap, null, 2), "utf8");

// featured.json also respects newest-first order
const featuredChairs = chairsDesc.filter(chair => {
  const val = clean(chair.Featured).toLowerCase();
  return val === "yes" || val === "true";
});
fs.writeFileSync(FEATURED_JSON_PATH, JSON.stringify(featuredChairs, null, 2), "utf8");

chairsAsc.forEach((chair, index) => {
  const slug = chair.Slug;
  const outDir = path.join(ROOT, slug);
  fs.mkdirSync(outDir, { recursive: true });

  const previousChair = index > 0 ? chairsAsc[index - 1] : null;
  const nextChair = index < chairsAsc.length - 1 ? chairsAsc[index + 1] : null;

  const pageTitle = chair.Title
    ? `${chair.Display_ID} — ${chair.Title}`
    : chair.Display_ID;

  const primaryMetaBlocks = [
    makeMetaBlock("Object ID", chair.Display_ID),
    makeMetaBlock("Seating Type", chair.Seating_Type),
    makeMetaBlock("Context", chair.Context_Combined),
    makeMetaBlock("Location", chair.Location)
  ].join("");

  const secondaryMetaBlocks = [
    makeMetaBlock("Environment", chair.Environment, true),
    makeMetaBlock("Site Type", chair.Site_Type, true),
    makeMetaBlock("Materials", chair.Materials, true),
    makeMetaBlock("Visibility", chair.Visibility, true),
    makeMetaBlock("Duration", chair.Duration, true),
    makeMetaBlock("Posture", chair.Posture, true),
    makeMetaBlock("Body State", chair.Body_State, true),
    makeMetaBlock("Origin System", chair.Origin_System, true),
    makeMetaBlock("Current System", chair.Current_System, true)
  ].join("");

  const captionBlock = clean(chair.Caption)
    ? `<p class="caption">${escapeHtml(chair.Caption)}</p>`
    : "";

  const locationBlock = clean(chair.Location)
    ? `<p class="location-line">${escapeHtml(chair.Location)}</p>`
    : "";

  const observationsBlock = paragraphize(chair.Observations);
  const objectNavBlock = objectNav(previousChair, nextChair);

  const html = template
    .replaceAll("{{PAGE_TITLE}}", escapeHtml(pageTitle))
    .replaceAll("{{HEADER_SUBTITLE}}", escapeHtml(chair.Header_Subtitle))
    .replaceAll("{{PRIMARY_META_BLOCKS}}", primaryMetaBlocks)
    .replaceAll("{{SECONDARY_META_BLOCKS}}", secondaryMetaBlocks)
    .replaceAll("{{IMAGE_BLOCK}}", imageBlock(chair.Thumbnail, pageTitle))
    .replaceAll("{{CAPTION_BLOCK}}", captionBlock)
    .replaceAll("{{LOCATION_BLOCK}}", locationBlock)
    .replaceAll("{{OBSERVATIONS_BLOCK}}", observationsBlock)
    .replaceAll("{{OBJECT_NAV}}", objectNavBlock);

  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
});

console.log(
  `Built ${chairsAsc.length} chair pages plus chair-data.json, index.json, context.json, and featured.json`
);
