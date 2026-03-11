const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const ROOT = __dirname;
const CSV_PATH = path.join(ROOT, "chairs.csv");
const TEMPLATE_PATH = path.join(ROOT, "chair-template.html");
const FULL_JSON_PATH = path.join(ROOT, "chair-data.json");

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

function firstImageName(raw) {
  const value = clean(raw);
  if (!value) return "";

  const match = value.match(/([^,(]+?\.(?:jpg|jpeg|png|webp))/i);
  if (match) return match[1].trim();

  return value.split(",")[0].trim();
}

function toNum(value) {
  const n = Number(clean(value));
  return Number.isFinite(n) ? n : null;
}

function joinParts(parts) {
  return parts.map(clean).filter(Boolean).join(", ");
}

function makeMetaBlock(label, value) {
  const v = clean(value);
  if (!v) return "";
  return `
    <div class="meta-group">
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
        src="/images/${escapeHtml(imageFile)}"
        alt="${escapeHtml(pageTitle)}"
        loading="eager"
        onload="postSize()"
        onerror="this.closest('.image-wrap').innerHTML=''; postSize();"
      />
    </div>
  `;
}

function titleFromMapLabelFallback(mapLabel, displayId) {
  const raw = clean(mapLabel);
  if (!raw) return "";
  if (displayId && raw.startsWith(displayId)) {
    return raw.replace(new RegExp("^" + displayId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s+[—-]\\s+"), "").trim();
  }
  return raw;
}

const chairs = rows
  .filter(row => clean(row["Display_ID"]))
  .map(row => {
    const displayId = clean(row["Display_ID"]);
    const title = firstNonEmpty(row, ["Title"]) || titleFromMapLabelFallback(row["Map_Label"], displayId);
    const imageFile = firstImageName(firstNonEmpty(row, ["Thumbnail", "Image_File", "Image"]));

    const city = firstNonEmpty(row, ["City"]);
    const state = firstNonEmpty(row, ["State"]);
    const country = firstNonEmpty(row, ["Country"]);
    const location = joinParts([city, state, country]);

    const contextPrimary = firstNonEmpty(row, ["Context (Primary)"]);
    const contextSecondaryList = splitList(firstNonEmpty(row, ["Context - Secondary"]));
    const contextCombined = [contextPrimary, ...contextSecondaryList].filter(Boolean).join(", ");

    const originSystem = splitList(firstNonEmpty(row, ["Origin System"])).join(", ");
    const currentSystem = splitList(firstNonEmpty(row, ["Current System"])).join(", ");
    const materials = splitList(firstNonEmpty(row, ["Materials"])).join(", ");
    const bodyState = splitList(firstNonEmpty(row, ["Body State"])).join(", ");

    const subtitle = title
      ? `${displayId} — ${title}`
      : "An archive of chairs, seats, and the context in which the body rests.";

    return {
      Record_Number: toNum(row["Record Number"] ?? row["Record_Number"]),
      Display_ID: displayId,
      Title: title,
      Slug: displayId.toLowerCase(),
      "Seating Type": firstNonEmpty(row, ["Seating Type", "Seating_Type"]),
      "Context (Primary)": contextPrimary,
      "Context - Secondary": contextSecondaryList,
      "Origin System": originSystem,
      "Current System": currentSystem,
      Environment: firstNonEmpty(row, ["Environment"]),
      Country: country,
      State: state,
      City: city,
      "Site Type": firstNonEmpty(row, ["Site Type"]),
      Materials: materials,
      Visibility: firstNonEmpty(row, ["Visibility"]),
      Duration: firstNonEmpty(row, ["Duration"]),
      Posture: firstNonEmpty(row, ["Posture"]),
      "Body State": bodyState,
      Observations: firstNonEmpty(row, ["Observations"]),
      Captions: firstNonEmpty(row, ["Captions", "Caption"]),
      Thumbnail: imageFile,
      Latitude: toNum(row["Latitude"]),
      Longitude: toNum(row["Longitude"]),
      Readymag_URL: firstNonEmpty(row, ["Readymag_URL"]) || `https://sittingsystems.org/${displayId.toLowerCase()}/`,
      Map_Label: firstNonEmpty(row, ["Map_Label"]),
      Featured: firstNonEmpty(row, ["Featured"]),
      "Web Status": firstNonEmpty(row, ["Web Status"]),
      Location: location,
      Context_Combined: contextCombined,
      Header_Subtitle: subtitle
    };
  });

fs.writeFileSync(FULL_JSON_PATH, JSON.stringify(chairs, null, 2));

chairs.forEach(chair => {
  const slug = chair.Slug;
  const outDir = path.join(ROOT, slug);
  fs.mkdirSync(outDir, { recursive: true });

  const pageTitle = chair.Title
    ? `${chair.Display_ID} — ${chair.Title}`
    : chair.Display_ID;

  const metaBlocks = [
    makeMetaBlock("Object ID", chair.Display_ID),
    makeMetaBlock("Seating Type", chair["Seating Type"]),
    makeMetaBlock("Context", chair.Context_Combined),
    makeMetaBlock("Location", chair.Location),
    makeMetaBlock("Environment", chair.Environment),
    makeMetaBlock("Site Type", chair["Site Type"]),
    makeMetaBlock("Materials", chair.Materials),
    makeMetaBlock("Visibility", chair.Visibility),
    makeMetaBlock("Duration", chair.Duration),
    makeMetaBlock("Posture", chair.Posture),
    makeMetaBlock("Body State", chair["Body State"]),
    makeMetaBlock("Origin System", chair["Origin System"]),
    makeMetaBlock("Current System", chair["Current System"])
  ].join("");

  const captionBlock = clean(chair.Captions)
    ? `<p class="caption">${escapeHtml(chair.Captions)}</p>`
    : "";

  const locationBlock = clean(chair.Location)
    ? `<p class="location-line">${escapeHtml(chair.Location)}</p>`
    : "";

  const observationsBlock = paragraphize(chair.Observations);

  const html = template
    .replaceAll("{{PAGE_TITLE}}", escapeHtml(pageTitle))
    .replaceAll("{{HEADER_SUBTITLE}}", escapeHtml(chair.Header_Subtitle))
    .replaceAll("{{META_BLOCKS}}", metaBlocks)
    .replaceAll("{{IMAGE_BLOCK}}", imageBlock(chair.Thumbnail, pageTitle))
    .replaceAll("{{CAPTION_BLOCK}}", captionBlock)
    .replaceAll("{{LOCATION_BLOCK}}", locationBlock)
    .replaceAll("{{OBSERVATIONS_BLOCK}}", observationsBlock);

  fs.writeFileSync(path.join(outDir, "index.html"), html);
});

console.log(`Built ${chairs.length} chair pages and chair-data.json`);
