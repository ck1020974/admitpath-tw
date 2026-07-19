const state = {
  rows: [],
  filtered: [],
  selectedIndex: 0,
  corrections: {},
};

const els = {};
const storageKey = "apply114MixedPublicFundReviewCorrections";
const dataVersion = "20260712-01";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindElements();
  bindEvents();
  state.corrections = loadCorrections();
  await loadRows();
  hydrateSchoolFilter();
  applyQuerySchoolFilter();
  applyFilters();
}

function bindElements() {
  [
    "keywordInput",
    "schoolFilter",
    "doneFilter",
    "reviewCounts",
    "reviewList",
    "detailMeta",
    "detailTitle",
    "prevButton",
    "nextButton",
    "exportJsonButton",
    "exportCsvButton",
    "officialImageLink",
    "detailUrl",
    "detailStatus",
    "schoolSummary",
    "blankProgram",
    "peerPrograms",
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
  els.schoolFilter.addEventListener("change", applyFilters);
  els.doneFilter.addEventListener("change", applyFilters);
  els.prevButton.addEventListener("click", () => selectRelative(-1));
  els.nextButton.addEventListener("click", () => selectRelative(1));
  els.saveButton.addEventListener("click", saveCurrent);
  els.clearButton.addEventListener("click", clearCurrent);
  els.exportJsonButton.addEventListener("click", exportJson);
  els.exportCsvButton.addEventListener("click", exportCsv);
}

async function loadRows() {
  const [report, records] = await Promise.all([
    fetchJson(`./data/apply114_quality_report.json?v=${dataVersion}`),
    fetchJson(`./data/admissions_records.json?v=${dataVersion}`),
  ]);
  const recordMap = new Map(records.map((record) => [record.id, record]));
  state.rows = (report.mixedPublicFundSchools || []).flatMap((school) => {
    const peerPrograms = (school.withDataRows || []).map((row) => {
      const match = recordMap.get(row.recordId);
      return {
        recordId: row.recordId,
        programCode: row.programCode,
        departmentName: row.departmentName,
        highlight: row.highlight || match?.applySieveResult?.sieveResultStandard || "",
      };
    });
    return (school.blankRows || []).map((row, index) => {
      const match = recordMap.get(row.recordId);
      return {
        index: index + 1,
        recordId: row.recordId,
        year: 114,
        schoolCode: school.schoolCode,
        schoolName: school.schoolName,
        programCode: row.programCode,
        departmentName: row.departmentName,
        label: "公費生混合",
        officialImageUrl: `https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/${school.schoolCode}.png`,
        detailUrl: match?.detailUrl || "",
        peerPrograms,
        schoolSummary: `空白 ${school.blankCount} 筆 / 已有資料 ${school.withDataCount} 筆`,
      };
    });
  });
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Cannot load ${path}`);
  return response.json();
}

function hydrateSchoolFilter() {
  const schools = [...new Map(state.rows.map((row) => [row.schoolCode, row.schoolName])).entries()];
  schools
    .sort((a, b) => a[0].localeCompare(b[0], "en"))
    .forEach(([schoolCode, schoolName]) => {
      const option = document.createElement("option");
      option.value = schoolCode;
      option.textContent = `${schoolCode} ${schoolName}`;
      els.schoolFilter.appendChild(option);
    });
}

function applyQuerySchoolFilter() {
  const schoolCode = new URLSearchParams(window.location.search).get("school");
  if (schoolCode && [...els.schoolFilter.options].some((option) => option.value === schoolCode)) {
    els.schoolFilter.value = schoolCode;
  }
}

function applyFilters() {
  const keyword = normalize(els.keywordInput.value);
  const schoolCode = els.schoolFilter.value;
  const done = els.doneFilter.value;
  state.filtered = state.rows.filter((row) => {
    const correction = state.corrections[row.recordId];
    if (schoolCode !== "all" && row.schoolCode !== schoolCode) return false;
    if (done === "done" && !correction) return false;
    if (done === "pending" && correction) return false;
    if (keyword && !normalize(`${row.programCode}${row.schoolName}${row.departmentName}${peerSummary(row.peerPrograms)}`).includes(keyword)) return false;
    return true;
  });
  state.selectedIndex = Math.min(state.selectedIndex, Math.max(0, state.filtered.length - 1));
  renderCounts();
  renderList();
  renderDetail();
}

function renderCounts() {
  const doneCount = Object.keys(state.corrections).length;
  const schoolCounts = countBy(state.rows, "schoolCode");
  els.reviewCounts.innerHTML = [
    `<span class="count-pill">總數 ${state.rows.length}</span>`,
    `<span class="count-pill">目前 ${state.filtered.length}</span>`,
    `<span class="count-pill">已填 ${doneCount}</span>`,
    ...Object.entries(schoolCounts).map(([schoolCode, count]) => `<span class="count-pill">${escapeHtml(schoolCode)} ${count}</span>`),
  ].join("");
}

function renderList() {
  if (!state.filtered.length) {
    els.reviewList.innerHTML = `<div class="review-item">沒有符合條件的資料</div>`;
    return;
  }
  els.reviewList.innerHTML = state.filtered.map((row, index) => {
    const correction = state.corrections[row.recordId];
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
    els.detailTitle.textContent = "請選擇一筆資料";
    return;
  }
  const correction = state.corrections[row.recordId] || {};
  els.detailMeta.textContent = `${row.schoolCode} / ${row.programCode}`;
  els.detailTitle.textContent = `${row.schoolName} ${row.departmentName}`;
  els.detailStatus.textContent = row.label;
  els.schoolSummary.textContent = row.schoolSummary;
  els.blankProgram.textContent = `${row.departmentName} ${row.programCode}`;
  els.peerPrograms.textContent = peerSummary(row.peerPrograms);
  els.officialImageLink.href = row.officialImageUrl || "#";
  els.detailUrl.href = row.detailUrl || "#";
  els.correctedStandard.value = correction.correctedStandard || "";
  els.correctionType.value = correction.correctionType || "";
  els.correctionNote.value = correction.note || "";
}

function peerSummary(rows) {
  if (!rows?.length) return "--";
  return rows.map((row) => `${row.departmentName} ${row.programCode}${row.highlight ? ` ${row.highlight}` : ""}`).join("、");
}

function selectRelative(delta) {
  if (!state.filtered.length) return;
  state.selectedIndex = Math.max(0, Math.min(state.filtered.length - 1, state.selectedIndex + delta));
  renderList();
  renderDetail();
}

function saveCurrent() {
  const row = state.filtered[state.selectedIndex];
  if (!row) return;
  state.corrections[row.recordId] = {
    recordId: row.recordId,
    schoolCode: row.schoolCode,
    schoolName: row.schoolName,
    programCode: row.programCode,
    departmentName: row.departmentName,
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
  delete state.corrections[row.recordId];
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
  download("114_apply_public_fund_mixed_review.json", JSON.stringify(rows, null, 2), "application/json");
}

function exportCsv() {
  const fields = ["recordId", "schoolCode", "schoolName", "programCode", "departmentName", "correctionType", "correctedStandard", "note", "savedAt"];
  const lines = [fields.join(",")];
  Object.values(state.corrections).forEach((row) => {
    lines.push(fields.map((field) => csvCell(row[field] || "")).join(","));
  });
  download("114_apply_public_fund_mixed_review.csv", lines.join("\n"), "text/csv;charset=utf-8");
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
