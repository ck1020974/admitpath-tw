const state = {
  rows: [],
  filtered: [],
  selectedIndex: 0,
  corrections: {},
  zoom: 1,
};

const els = {};
const storageKey = "admissionReviewCorrections115Apply";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindElements();
  bindEvents();
  state.corrections = loadCorrections();
  state.rows = await fetchJson("./data/review_pending_115_apply.json");
  hydrateStatusFilter();
  applyFilters();
}

function bindElements() {
  [
    "keywordInput",
    "statusFilter",
    "doneFilter",
    "reviewCounts",
    "reviewList",
    "detailMeta",
    "detailTitle",
    "prevButton",
    "nextButton",
    "exportJsonButton",
    "exportCsvButton",
    "zoomOutButton",
    "zoomInButton",
    "officialImageLink",
    "cropImage",
    "noCrop",
    "detailStatus",
    "ocrRaw",
    "normalizedText",
    "detailUrl",
    "correctedStandard",
    "correctionType",
    "correctionNote",
    "saveButton",
    "clearButton",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  els.keywordInput.addEventListener("input", applyFilters);
  els.statusFilter.addEventListener("change", applyFilters);
  els.doneFilter.addEventListener("change", applyFilters);
  els.prevButton.addEventListener("click", () => selectRelative(-1));
  els.nextButton.addEventListener("click", () => selectRelative(1));
  els.zoomOutButton.addEventListener("click", () => setZoom(state.zoom - .15));
  els.zoomInButton.addEventListener("click", () => setZoom(state.zoom + .15));
  els.saveButton.addEventListener("click", saveCurrent);
  els.clearButton.addEventListener("click", clearCurrent);
  els.exportJsonButton.addEventListener("click", exportJson);
  els.exportCsvButton.addEventListener("click", exportCsv);
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Cannot load ${path}`);
  return response.json();
}

function hydrateStatusFilter() {
  const labels = [...new Set(state.rows.map((row) => row.label).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
  labels.forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    option.textContent = label;
    els.statusFilter.appendChild(option);
  });
}

function applyFilters() {
  const keyword = normalize(els.keywordInput.value);
  const status = els.statusFilter.value;
  const done = els.doneFilter.value;
  state.filtered = state.rows.filter((row) => {
    const correction = state.corrections[row.programCode];
    if (status !== "all" && row.label !== status) return false;
    if (done === "done" && !correction) return false;
    if (done === "pending" && correction) return false;
    if (keyword && !normalize(`${row.programCode}${row.schoolName}${row.departmentName}${row.label}${row.ocrRaw}`).includes(keyword)) return false;
    return true;
  });
  state.selectedIndex = Math.min(state.selectedIndex, Math.max(0, state.filtered.length - 1));
  renderCounts();
  renderList();
  renderDetail();
}

function renderCounts() {
  const doneCount = Object.keys(state.corrections).length;
  const statusCounts = countBy(state.rows, "label");
  els.reviewCounts.innerHTML = [
    `<span class="count-pill">總計 ${state.rows.length}</span>`,
    `<span class="count-pill">目前 ${state.filtered.length}</span>`,
    `<span class="count-pill">已填 ${doneCount}</span>`,
    ...Object.entries(statusCounts).map(([label, count]) => `<span class="count-pill">${escapeHtml(label)} ${count}</span>`),
  ].join("");
}

function renderList() {
  if (!state.filtered.length) {
    els.reviewList.innerHTML = `<div class="review-item">沒有符合條件的資料</div>`;
    return;
  }
  els.reviewList.innerHTML = state.filtered.map((row, index) => {
    const correction = state.corrections[row.programCode];
    return `
      <button class="review-item ${index === state.selectedIndex ? "active" : ""} ${correction ? "done" : ""}" data-index="${index}" type="button">
        <strong>${escapeHtml(row.programCode)} ${escapeHtml(row.schoolName)}</strong>
        <span>${escapeHtml(row.departmentName)}</span>
        <small>${escapeHtml(row.label)}${correction ? " / 已填寫" : ""}</small>
      </button>
    `;
  }).join("");
  els.reviewList.querySelectorAll("[data-index]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedIndex = Number(button.dataset.index);
      renderList();
      renderDetail();
    });
  });
}

function renderDetail() {
  const row = state.filtered[state.selectedIndex];
  if (!row) {
    els.detailMeta.textContent = "--";
    els.detailTitle.textContent = "沒有資料";
    return;
  }
  const correction = state.corrections[row.programCode] || {};
  els.detailMeta.textContent = `${row.index} / ${state.rows.length} · ${row.programCode} · ${row.label}`;
  els.detailTitle.textContent = `${row.schoolName} ${row.departmentName}`;
  els.detailStatus.textContent = row.label || "--";
  els.ocrRaw.textContent = row.ocrRaw || "--";
  els.normalizedText.textContent = row.normalized || "--";
  els.detailUrl.href = row.detailUrl || "#";
  els.officialImageLink.href = row.officialImageUrl || "#";
  els.correctedStandard.value = correction.correctedStandard || "";
  els.correctionType.value = correction.correctionType || "";
  els.correctionNote.value = correction.note || "";

  state.zoom = 1;
  if (row.cropImage) {
    els.cropImage.style.display = "block";
    els.noCrop.style.display = "none";
    els.cropImage.src = `${row.cropImage}?v=${Date.now()}`;
    setZoom(1);
  } else {
    els.cropImage.style.display = "none";
    els.noCrop.style.display = "block";
  }
}

function selectRelative(delta) {
  if (!state.filtered.length) return;
  state.selectedIndex = Math.max(0, Math.min(state.filtered.length - 1, state.selectedIndex + delta));
  renderList();
  renderDetail();
}

function setZoom(value) {
  state.zoom = Math.max(.45, Math.min(2.5, value));
  els.cropImage.style.transform = `scale(${state.zoom})`;
  els.cropImage.style.marginBottom = `${Math.max(0, (state.zoom - 1) * 180)}px`;
}

function saveCurrent() {
  const row = state.filtered[state.selectedIndex];
  if (!row) return;
  state.corrections[row.programCode] = {
    programCode: row.programCode,
    schoolName: row.schoolName,
    departmentName: row.departmentName,
    originalLabel: row.label,
    correctedStandard: els.correctedStandard.value.trim(),
    correctionType: els.correctionType.value,
    note: els.correctionNote.value.trim(),
    savedAt: new Date().toISOString(),
  };
  saveCorrections();
  renderCounts();
  renderList();
}

function clearCurrent() {
  const row = state.filtered[state.selectedIndex];
  if (!row) return;
  delete state.corrections[row.programCode];
  saveCorrections();
  renderCounts();
  renderList();
  renderDetail();
}

function loadCorrections() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    return {};
  }
}

function saveCorrections() {
  localStorage.setItem(storageKey, JSON.stringify(state.corrections));
}

function exportJson() {
  const rows = Object.values(state.corrections);
  download("115_apply_review_corrections.json", JSON.stringify(rows, null, 2), "application/json");
}

function exportCsv() {
  const fields = ["programCode", "schoolName", "departmentName", "originalLabel", "correctionType", "correctedStandard", "note", "savedAt"];
  const lines = [fields.join(",")];
  Object.values(state.corrections).forEach((row) => {
    lines.push(fields.map((field) => csvCell(row[field] || "")).join(","));
  });
  download("115_apply_review_corrections.csv", lines.join("\n"), "text/csv;charset=utf-8");
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "未分類";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
