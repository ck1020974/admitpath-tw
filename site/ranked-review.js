const state = {
  rows: [],
  filtered: [],
  selectedIndex: 0,
  corrections: {},
  zoom: 1,
};

const els = {};
const storageKey = "rankedSieveReviewCorrectionsApply";
const dataVersion = "20260628-1";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindElements();
  bindEvents();
  state.corrections = loadCorrections();
  state.rows = await fetchJson(`./data/review_ranked_sieve_missing.json?v=${dataVersion}`);
  applyFilters();
}

function bindElements() {
  [
    "keywordInput",
    "yearFilter",
    "doneFilter",
    "externalFilter",
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
    "rankedKnown",
    "missingRanks",
    "officialResult",
    "ocrRaw",
    "detailUrl",
    "externalStatus",
    "universityTwResult",
    "suggestedFill",
    "externalConflicts",
    "universityTwUrl",
    "correctedRankedResult",
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
  els.yearFilter.addEventListener("change", applyFilters);
  els.doneFilter.addEventListener("change", applyFilters);
  els.externalFilter.addEventListener("change", applyFilters);
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
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Cannot load ${path}`);
  return response.json();
}

function applyFilters() {
  const keyword = normalize(els.keywordInput.value);
  const year = els.yearFilter.value;
  const done = els.doneFilter.value;
  const external = els.externalFilter.value;
  state.filtered = state.rows.filter((row) => {
    const key = correctionKey(row);
    const correction = state.corrections[key];
    if (year !== "all" && String(row.year) !== year) return false;
    if (done === "done" && !correction) return false;
    if (done === "pending" && correction) return false;
    if (external !== "all" && row.externalStatus !== external) return false;
    if (keyword && !normalize(`${row.year}${row.programCode}${row.schoolName}${row.departmentName}${row.officialResult}${row.missingRanks}${row.ocrRaw}`).includes(keyword)) return false;
    return true;
  });
  state.selectedIndex = Math.min(state.selectedIndex, Math.max(0, state.filtered.length - 1));
  renderCounts();
  renderList();
  renderDetail();
}

function renderCounts() {
  const doneCount = Object.keys(state.corrections).length;
  const byYear = countBy(state.rows, "year");
  const byExternal = countBy(state.rows, "externalStatus");
  els.reviewCounts.innerHTML = [
    `<span class="count-pill">總計 ${state.rows.length}</span>`,
    `<span class="count-pill">目前 ${state.filtered.length}</span>`,
    `<span class="count-pill">已填 ${doneCount}</span>`,
    ...Object.entries(byYear).map(([year, count]) => `<span class="count-pill">${escapeHtml(year)} 年 ${count}</span>`),
    ...Object.entries(byExternal).map(([status, count]) => `<span class="count-pill">${escapeHtml(statusLabel(status))} ${count}</span>`),
  ].join("");
}

function renderList() {
  if (!state.filtered.length) {
    els.reviewList.innerHTML = `<div class="review-item">沒有符合條件的資料</div>`;
    return;
  }
  els.reviewList.innerHTML = state.filtered.map((row, index) => {
    const correction = state.corrections[correctionKey(row)];
    return `
      <button class="review-item ${index === state.selectedIndex ? "active" : ""} ${correction ? "done" : ""}" data-index="${index}" type="button">
        <strong>${escapeHtml(row.year)} ${escapeHtml(row.programCode)} ${escapeHtml(row.schoolName)}</strong>
        <span>${escapeHtml(row.departmentName)}</span>
        <small>${escapeHtml(statusLabel(row.externalStatus))} · 缺漏：${escapeHtml(row.missingRanks || "--")}${correction ? " / 已填寫" : ""}</small>
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
  const correction = state.corrections[correctionKey(row)] || {};
  els.detailMeta.textContent = `${row.index} / ${state.rows.length} · ${row.year} · ${row.programCode}`;
  els.detailTitle.textContent = `${row.schoolName} ${row.departmentName}`;
  els.rankedKnown.textContent = row.rankedKnown || "--";
  els.missingRanks.textContent = row.missingRanks || "--";
  els.officialResult.textContent = row.officialResult || "--";
  els.ocrRaw.textContent = row.ocrRaw || "--";
  els.detailUrl.href = row.detailUrl || "#";
  els.officialImageLink.href = row.officialImageUrl || "#";
  els.externalStatus.textContent = statusLabel(row.externalStatus);
  els.universityTwResult.textContent = row.universityTwResult || "--";
  els.suggestedFill.textContent = row.suggestedFill || "--";
  els.externalConflicts.textContent = row.externalConflicts || "--";
  els.universityTwUrl.href = row.universityTwUrl || "#";
  els.correctedRankedResult.value = correction.correctedRankedResult || suggestedCompleteResult(row) || row.officialResult || "";
  els.correctionType.value = correction.correctionType || "";
  els.correctionNote.value = correction.note || "";

  state.zoom = 1;
  if (row.cropImage) {
    els.cropImage.style.display = "block";
    els.noCrop.style.display = "none";
    els.cropImage.src = `${row.cropImage}?v=${dataVersion}`;
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
  state.corrections[correctionKey(row)] = {
    year: row.year,
    programCode: row.programCode,
    schoolName: row.schoolName,
    departmentName: row.departmentName,
    originalResult: row.officialResult,
    missingRanks: row.missingRanks,
    externalStatus: row.externalStatus,
    suggestedFill: row.suggestedFill,
    correctedRankedResult: els.correctedRankedResult.value.trim(),
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
  delete state.corrections[correctionKey(row)];
  saveCorrections();
  renderCounts();
  renderList();
  renderDetail();
}

function correctionKey(row) {
  return `${row.year}-${row.programCode}`;
}

function suggestedCompleteResult(row) {
  if (!row.suggestedFill || !["auto_fill_candidate", "partial_fill_candidate"].includes(row.externalStatus)) return "";
  return [row.rankedKnown, row.suggestedFill].filter(Boolean).join("、");
}

function statusLabel(status) {
  return {
    auto_fill_candidate: "可自動補齊",
    partial_fill_candidate: "可部分補齊",
    source_conflict: "來源衝突",
    no_university_tw_record: "外部無校系",
    no_university_tw_result: "外部無結果",
    no_matching_fill: "無對應補值",
  }[status] || "未比對";
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
  download("apply_ranked_sieve_review_corrections.json", JSON.stringify(rows, null, 2), "application/json");
}

function exportCsv() {
  const fields = ["year", "programCode", "schoolName", "departmentName", "originalResult", "missingRanks", "externalStatus", "suggestedFill", "correctionType", "correctedRankedResult", "note", "savedAt"];
  const lines = [fields.join(",")];
  Object.values(state.corrections).forEach((row) => {
    lines.push(fields.map((field) => csvCell(row[field] || "")).join(","));
  });
  download("apply_ranked_sieve_review_corrections.csv", lines.join("\n"), "text/csv;charset=utf-8");
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
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}
