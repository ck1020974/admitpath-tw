const state = {
  records: [],
  filtered: [],
  results: {},
  groups: [],
  gsatStandards: {},
  recordIndexByFullName: new Map(),
  recordIndexBySchoolDept: new Map(),
  manifest: null,
  view: "overview",
  selectedExplorerStage: "overview",
  selectedGroup: "",
  selectedCategory: "",
  explorerKeyword: "",
  linkedGroup: "",
  linkedCategory: "",
  explorerChannelSelection: {},
  categoryInsights: {},
  categoryRepresentatives: {},
  qualityReport: null,
  compare: [],
  placement: null,
  filters: {
    year: "all",
    channel: "all",
    school: "all",
    keyword: "",
    advanced: {
      excludedSubjects: [],
      specialAdmissionMode: "exclude",
      groups: [],
      schools: [],
    },
  },
};

const els = {};

const fmt = new Intl.NumberFormat("zh-Hant-TW");
const DATA_VERSION = "20260902-01";

const APPLY_SIEVE_SCORE_OVERRIDES = {
  "115-personal_application-008342-115_apply": {
    scores: {
      1: "11",
      2: "21",
    },
  },
  "114-personal_application-001062-114_apply": {
    scores: {
      1: "40",
      2: "14",
    },
  },
  "114-personal_application-001082-114_apply": {
    scores: {
      1: "10",
      4: "12",
    },
  },
  "114-personal_application-001022-114_apply": {
    additions: [
      { rank: 1, multiplier: "2.5", subjects: ["英文"], score: "15", label: "英文15" },
    ],
  },
  "114-personal_application-001112-114_apply": {
    additions: [
      { rank: 1, multiplier: "5.5", subjects: ["英文", "數A"], score: "11", label: "英文+數A11" },
      { rank: 2, multiplier: "4", subjects: ["自然"], score: "14", label: "自然14" },
      { rank: 3, multiplier: "3", subjects: ["英文"], score: "14", label: "英文14" },
    ],
  },
  "114-personal_application-001132-114_apply": {
    additions: [
      { rank: 1, multiplier: "2.5", subjects: ["英文", "數A", "自然"], score: "41", label: "英文+數A+自然41" },
    ],
  },
  "114-personal_application-001122-114_apply": {
    scores: {
      1: "47",
      3: "13",
    },
  },
  "114-personal_application-006032-114_apply": {
    scores: {
      1: "46",
    },
  },
  "114-personal_application-006132-114_apply": {
    scores: {
      1: "40",
    },
  },
  "114-personal_application-006152-114_apply": {
    scores: {
      1: "43",
    },
  },
  "114-personal_application-006182-114_apply": {
    scores: {
      1: "9",
    },
  },
  "114-personal_application-001142-114_apply": {
    scores: {
      1: "33",
    },
  },
  "114-personal_application-001222-114_apply": {
    additions: [
      { rank: 1, multiplier: "5", subjects: ["數B"], score: "10", label: "數B10" },
      { rank: 2, multiplier: "3", subjects: ["國文", "英文", "社會"], score: "42", label: "國文+英文+社會42" },
    ],
  },
  "114-personal_application-001242-114_apply": {
    additions: [
      { rank: 1, multiplier: "4", subjects: ["國文"], score: "14", label: "國文14" },
      { rank: 2, multiplier: "3", subjects: ["國文", "英文", "數A", "自然"], score: "58", label: "國文+英文+數A+自然58" },
      { rank: 3, multiplier: "2", subjects: ["英文", "數A", "自然"], score: "44", label: "英文+數A+自然44" },
    ],
  },
  "114-personal_application-001262-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "數A", "自然"], score: "59", label: "國文+英文+數A+自然59" },
      { rank: 2, multiplier: "2.5", subjects: ["英文", "數A", "自然"], score: "45", label: "英文+數A+自然45" },
    ],
  },
  "114-personal_application-001272-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["數A", "自然"], score: "28", label: "數A+自然28" },
      { rank: 2, multiplier: "2.5", subjects: ["國文", "英文"], score: "27", label: "國文+英文27" },
    ],
  },
  "114-personal_application-001282-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["自然"], score: "14", label: "自然14" },
    ],
  },
  "114-personal_application-001292-114_apply": {
    additions: [
      { rank: 1, multiplier: "6", subjects: ["英文"], score: "12", label: "英文12" },
      { rank: 2, multiplier: "3", subjects: ["自然"], score: "13", label: "自然13" },
    ],
  },
  "114-personal_application-001302-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["英文", "數A", "自然"], score: "41", label: "英文+數A+自然41" },
    ],
  },
  "114-personal_application-001322-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "數A", "自然"], score: "51", label: "國文+英文+數A+自然51" },
    ],
  },
  "114-personal_application-001332-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["英文", "數A", "自然"], score: "41", label: "英文+數A+自然41" },
    ],
  },
  "114-personal_application-001372-114_apply": {
    additions: [
      { rank: 1, multiplier: "4", subjects: ["英文", "數A", "自然"], score: "41", label: "英文+數A+自然41" },
      { rank: 2, multiplier: "3", subjects: ["國文"], score: "14", label: "國文14" },
    ],
  },
  "114-personal_application-001402-114_apply": {
    scores: {
      1: "40",
      3: "14",
    },
  },
  "114-personal_application-001412-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["自然"], score: "14", label: "自然14" },
    ],
  },
  "114-personal_application-001422-114_apply": {
    additions: [
      { rank: 1, multiplier: "6", subjects: ["國文", "英文", "數A"], score: "33", label: "國文+英文+數A33" },
      { rank: 2, multiplier: "3", subjects: ["自然"], score: "14", label: "自然14" },
    ],
  },
  "114-personal_application-001442-114_apply": {
    additions: [
      { rank: 1, multiplier: "5", subjects: ["英文"], score: "13", label: "英文13" },
      { rank: 2, multiplier: "2.5", subjects: ["自然"], score: "13", label: "自然13" },
    ],
  },
  "114-personal_application-001462-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "數A", "社會"], score: "44", label: "國文+英文+數A+社會44" },
    ],
  },
  "114-personal_application-001482-114_apply": {
    additions: [
      { rank: 1, multiplier: "4.5", subjects: ["英文", "數A", "自然"], score: "32", label: "英文+數A+自然32" },
      { rank: 2, multiplier: "3", subjects: ["自然"], score: "13", label: "自然13" },
    ],
  },
  "114-personal_application-001492-114_apply": {
    additions: [
      { rank: 1, multiplier: "6", subjects: ["英文"], score: "14", label: "英文14" },
      { rank: 2, multiplier: "3", subjects: ["自然"], score: "13", label: "自然13" },
    ],
  },
  "114-personal_application-001532-114_apply": {
    scores: {
      1: "43",
    },
  },
  "114-personal_application-001572-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["英文", "數A", "自然"], score: "38", label: "英文+數A+自然38" },
    ],
  },
  "114-personal_application-001582-114_apply": {
    additions: [
      { rank: 1, multiplier: "2.5", subjects: ["英文", "數A", "自然"], score: "44", label: "英文+數A+自然44" },
    ],
  },
  "114-personal_application-001602-114_apply": {
    additions: [
      { rank: 1, multiplier: "10", subjects: ["數A"], score: "12", label: "數A12" },
      { rank: 2, multiplier: "5", subjects: ["APCS實作題"], score: "5", label: "APCS實作題5" },
    ],
  },
  "114-personal_application-001622-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文"], score: "30", label: "國文+英文30" },
    ],
  },
  "114-personal_application-001632-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文"], score: "30", label: "國文+英文30" },
    ],
  },
  "114-personal_application-001642-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文"], score: "30", label: "國文+英文30" },
    ],
  },
  "114-personal_application-001682-114_apply": {
    additions: [
      { rank: 1, multiplier: "6", subjects: ["國文", "英文", "數B", "社會"], score: "43", label: "國文+英文+數B+社會43" },
      { rank: 2, multiplier: "3.5", subjects: ["國文", "英文", "社會"], score: "35", label: "國文+英文+社會35" },
    ],
  },
  "114-personal_application-001692-114_apply": {
    additions: [
      { rank: 1, multiplier: "4", subjects: ["英文", "數A", "社會"], score: "34", label: "英文+數A+社會34" },
    ],
  },
  "114-personal_application-001702-114_apply": {
    additions: [
      { rank: 1, multiplier: "6", subjects: ["國文", "英文", "數A", "自然"], score: "41", label: "國文+英文+數A+自然41" },
      { rank: 2, multiplier: "4", subjects: ["英文", "數A", "自然"], score: "31", label: "英文+數A+自然31" },
    ],
  },
  "114-personal_application-001712-114_apply": {
    additions: [
      { rank: 1, multiplier: "6", subjects: ["國文", "英文", "數A", "自然"], score: "45", label: "國文+英文+數A+自然45" },
      { rank: 2, multiplier: "4", subjects: ["英文", "數A", "自然"], score: "32", label: "英文+數A+自然32" },
    ],
  },
  "114-personal_application-001722-114_apply": {
    additions: [
      { rank: 1, multiplier: "6", subjects: ["國文", "英文", "數A", "自然"], score: "45", label: "國文+英文+數A+自然45" },
      { rank: 2, multiplier: "3.5", subjects: ["英文", "數A", "自然"], score: "33", label: "英文+數A+自然33" },
    ],
  },
  "114-personal_application-001742-114_apply": {
    additions: [
      { rank: 1, multiplier: "6", subjects: ["國文", "英文", "數A", "自然"], score: "38", label: "國文+英文+數A+自然38" },
      { rank: 2, multiplier: "4", subjects: ["英文", "數A", "自然"], score: "30", label: "英文+數A+自然30" },
    ],
  },
  "114-personal_application-001752-114_apply": {
    additions: [
      { rank: 1, multiplier: "4", subjects: ["國文"], score: "13", label: "國文13" },
      { rank: 2, multiplier: "3", subjects: ["國文", "英文", "數A", "自然"], score: "56", label: "國文+英文+數A+自然56" },
      { rank: 3, multiplier: "2", subjects: ["英文", "數A", "自然"], score: "42", label: "英文+數A+自然42" },
    ],
  },
  "114-personal_application-002102-114_apply": {
    scores: {
      1: "25",
      2: "12",
      3: "13",
    },
  },
  "114-personal_application-002112-114_apply": {
    scores: {
      1: "19",
      2: "9",
      3: "10",
    },
  },
  "114-personal_application-002172-114_apply": {
    scores: {
      1: "36",
      2: "12",
      3: "11",
      4: "14",
    },
  },
  "114-personal_application-041302-114_apply": {
    scores: {
      1: "12",
      2: "26",
      3: "49",
    },
  },
  "114-personal_application-041362-114_apply": {
    scores: {
      1: "4",
      2: "19",
      3: "35",
    },
  },
  "114-personal_application-041402-114_apply": {
    scores: {
      1: "9",
      2: "19",
      3: "36",
    },
  },
  "114-personal_application-004022-114_apply": {
    scores: {
      1: "39",
    },
  },
  "114-personal_application-004012-114_apply": {
    additions: [
      { rank: 1, multiplier: "10", subjects: ["英文", "社會"], score: "22", label: "英文+社會22" },
      { rank: 2, multiplier: "6", subjects: ["國文"], score: "14", label: "國文14" },
    ],
  },
  "114-personal_application-004072-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["自然"], score: "14", label: "自然14" },
    ],
  },
  "114-personal_application-004092-114_apply": {
    additions: [
      { rank: 1, multiplier: "15", subjects: ["國文", "英文", "數A", "自然"], score: "43", label: "國文+英文+數A+自然43" },
      { rank: 2, multiplier: "3", subjects: ["數A", "自然"], score: "28", label: "數A+自然28" },
    ],
  },
  "114-personal_application-004102-114_apply": {
    additions: [
      { rank: 1, multiplier: "5", subjects: ["英文", "數A", "自然"], score: "36", label: "英文+數A+自然36" },
      { rank: 2, multiplier: "3", subjects: ["國文", "英文", "數A", "自然"], score: "50", label: "國文+英文+數A+自然50" },
    ],
  },
  "114-personal_application-004112-114_apply": {
    additions: [
      { rank: 1, multiplier: "5", subjects: ["英文", "數A", "自然"], score: "38", label: "英文+數A+自然38" },
      { rank: 2, multiplier: "4.5", subjects: ["國文", "英文", "數A", "自然"], score: "51", label: "國文+英文+數A+自然51" },
    ],
  },
  "114-personal_application-004122-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["英文", "數A", "自然"], score: "39", label: "英文+數A+自然39" },
    ],
  },
  "114-personal_application-004132-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["英文", "數A", "自然"], score: "40", label: "英文+數A+自然40" },
    ],
  },
  "114-personal_application-004162-114_apply": {
    additions: [
      { rank: 1, multiplier: "8", subjects: ["英文"], score: "8", label: "英文8" },
      { rank: 2, multiplier: "6", subjects: ["國文"], score: "11", label: "國文11" },
      { rank: 3, multiplier: "4", subjects: ["自然"], score: "12", label: "自然12" },
      { rank: 4, multiplier: "3", subjects: ["數A"], score: "11", label: "數A11" },
    ],
  },
  "114-personal_application-004182-114_apply": {
    additions: [
      { rank: 1, multiplier: "5", subjects: ["數A"], score: "10", label: "數A10" },
      { rank: 2, multiplier: "4", subjects: ["自然"], score: "13", label: "自然13" },
      { rank: 3, multiplier: "3", subjects: ["國文", "英文", "自然"], score: "38", label: "國文+英文+自然38" },
    ],
  },
  "114-personal_application-004212-114_apply": {
    additions: [
      { rank: 1, multiplier: "6", subjects: ["國文", "英文", "數A", "自然"], score: "47", label: "國文+英文+數A+自然47" },
      { rank: 2, multiplier: "3", subjects: ["英文", "數A", "自然"], score: "36", label: "英文+數A+自然36" },
    ],
  },
  "114-personal_application-004222-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "數A", "自然"], score: "48", label: "國文+英文+數A+自然48" },
    ],
  },
  "114-personal_application-004232-114_apply": {
    additions: [
      { rank: 1, multiplier: "3.5", subjects: ["英文", "數A", "自然"], score: "39", label: "英文+數A+自然39" },
    ],
  },
  "114-personal_application-004172-114_apply": {
    scores: {
      1: "43",
      3: "14",
    },
  },
  "114-personal_application-004262-114_apply": {
    scores: {
      1: "22",
    },
  },
  "114-personal_application-004292-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["英文", "數B"], score: "27", label: "英文+數B27" },
    ],
  },
  "114-personal_application-004252-114_apply": {
    additions: [
      { rank: 1, multiplier: "10", subjects: ["英文", "數A"], score: "21", label: "英文+數A21" },
      { rank: 2, multiplier: "10", subjects: ["APCS觀念題", "APCS實作題"], score: "8", label: "APCS觀念題+APCS實作題8" },
    ],
  },
  "114-personal_application-004282-114_apply": {
    scores: {
      1: "45",
    },
  },
  "114-personal_application-004302-114_apply": {
    scores: {
      4: "58",
    },
  },
  "114-personal_application-004332-114_apply": {
    scores: {
      1: "46",
      3: "13",
    },
  },
  "114-personal_application-004362-114_apply": {
    scores: {
      1: "49",
      2: "13",
    },
  },
  "114-personal_application-004352-114_apply": {
    additions: [
      { rank: 1, multiplier: "7", subjects: ["英文"], score: "14", label: "英文14" },
      { rank: 2, multiplier: "3.5", subjects: ["國文", "英文", "數A", "自然"], score: "52", label: "國文+英文+數A+自然52" },
    ],
  },
  "114-personal_application-004412-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["英文", "數A", "自然"], score: "39", label: "英文+數A+自然39" },
    ],
  },
  "114-personal_application-004422-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["英文", "數A", "自然"], score: "42", label: "英文+數A+自然42" },
    ],
  },
  "114-personal_application-004432-114_apply": {
    additions: [
      { rank: 1, multiplier: "8", subjects: ["英文", "數A", "自然"], score: "42", label: "英文+數A+自然42" },
    ],
  },
  "114-personal_application-004442-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["英文", "數A", "自然"], score: "42", label: "英文+數A+自然42" },
    ],
  },
  "114-personal_application-004452-114_apply": {
    additions: [
      { rank: 1, multiplier: "5", subjects: ["英文", "數A"], score: "27", label: "英文+數A27" },
    ],
  },
  "114-personal_application-004462-114_apply": {
    additions: [
      { rank: 1, multiplier: "8", subjects: ["英文", "數A", "自然"], score: "40", label: "英文+數A+自然40" },
    ],
  },
  "114-personal_application-004472-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "數A", "自然"], score: "50", label: "國文+英文+數A+自然50" },
    ],
  },
  "114-personal_application-004482-114_apply": {
    additions: [
      { rank: 1, multiplier: "5", subjects: ["國文", "英文"], score: "23", label: "國文+英文23" },
      { rank: 2, multiplier: "3", subjects: ["數A"], score: "11", label: "數A11" },
    ],
  },
  "114-personal_application-004492-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "數A", "自然"], score: "49", label: "國文+英文+數A+自然49" },
    ],
  },
  "114-personal_application-006032-114_apply": {
    scores: {
      1: "46",
    },
  },
  "114-personal_application-006042-114_apply": {
    scores: {
      1: "50",
    },
  },
  "114-personal_application-006052-114_apply": {
    scores: {
      1: "25",
    },
  },
  "114-personal_application-006062-114_apply": {
    scores: {
      1: "9",
    },
  },
  "114-personal_application-006132-114_apply": {
    scores: {
      1: "40",
    },
  },
  "114-personal_application-006152-114_apply": {
    scores: {
      1: "43",
    },
  },
  "114-personal_application-006072-114_apply": {
    scores: {
      1: "32",
    },
  },
  "114-personal_application-006092-114_apply": {
    additions: [
      { rank: 1, multiplier: "4", subjects: ["國文"], score: "12", label: "國文12" },
      { rank: 2, multiplier: "3.5", subjects: ["英文", "數A"], score: "20", label: "英文+數A20" },
      { rank: 3, multiplier: "3", subjects: ["國文", "英文", "數A", "社會"], score: "47", label: "國文+英文+數A+社會47" },
    ],
  },
  "114-personal_application-006142-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "社會"], score: "43", label: "國文+英文+社會43" },
    ],
  },
  "114-personal_application-006182-114_apply": {
    scores: {
      1: "9",
    },
  },
  "114-personal_application-006252-114_apply": {
    additions: [
      { rank: 1, multiplier: "4", subjects: ["英文", "數A"], score: "23", label: "英文+數A23" },
      { rank: 2, multiplier: "3.5", subjects: ["國文", "英文", "數A", "自然"], score: "47", label: "國文+英文+數A+自然47" },
    ],
  },
  "114-personal_application-006382-114_apply": {
    additions: [
      { rank: 1, multiplier: "5", subjects: ["國文"], score: "14", label: "國文14" },
      { rank: 2, multiplier: "3.5", subjects: ["英文", "社會"], score: "28", label: "英文+社會28" },
      { rank: 3, multiplier: "3", subjects: ["國文", "英文", "數B", "社會"], score: "54", label: "國文+英文+數B+社會54" },
    ],
  },
  "114-personal_application-006392-114_apply": {
    additions: [
      { rank: 1, multiplier: "8", subjects: ["數A"], score: "11", label: "數A11" },
      { rank: 2, multiplier: "3", subjects: ["數A", "自然"], score: "25", label: "數A+自然25" },
    ],
  },
  "114-personal_application-006412-114_apply": {
    additions: [
      { rank: 1, multiplier: "10", subjects: ["數A"], score: "11", label: "數A11" },
      { rank: 2, multiplier: "4", subjects: ["國文", "英文", "數A", "自然"], score: "50", label: "國文+英文+數A+自然50" },
    ],
  },
  "114-personal_application-006422-114_apply": {
    additions: [
      { rank: 1, multiplier: "10", subjects: ["數A", "自然"], score: "20", label: "數A+自然20" },
      { rank: 2, multiplier: "10", subjects: ["APCS實作題"], score: "3", label: "APCS實作題3" },
    ],
  },
  "114-personal_application-006442-114_apply": {
    additions: [
      { rank: 1, multiplier: "4.5", subjects: ["數B", "社會"], score: "24", label: "數B+社會24" },
    ],
  },
  "114-personal_application-006452-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "社會"], score: "30", label: "國文+英文+社會30" },
    ],
  },
  "114-personal_application-006462-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "數A"], score: "26", label: "國文+英文+數A26" },
    ],
  },
  "114-personal_application-023202-114_apply": {
    scores: {
      1: "32",
      2: "11",
      3: "12",
    },
  },
  "114-personal_application-023212-114_apply": {
    scores: {
      1: "30",
      2: "9",
      3: "11",
    },
  },
  "114-personal_application-023222-114_apply": {
    scores: {
      1: "32",
      2: "9",
      3: "13",
    },
  },
  "114-personal_application-023272-114_apply": {
    scores: {
      1: "22",
      2: "9",
      3: "6",
    },
  },
  "114-personal_application-023282-114_apply": {
    scores: {
      1: "19",
      2: "8",
      3: "6",
    },
  },
  "114-personal_application-003052-114_apply": {
    scores: {
      1: "45",
      2: "8",
      3: "14",
    },
  },
  "114-personal_application-003092-114_apply": {
    scores: {
      1: "43",
      2: "13",
      3: "12",
    },
  },
  "114-personal_application-003112-114_apply": {
    scores: {
      1: "31",
      2: "9",
      3: "12",
    },
  },
  "114-personal_application-003272-114_apply": {
    scores: {
      1: "7",
      2: "25",
      3: "34",
    },
    additions: [
      { rank: 4, multiplier: "3", subjects: ["APCS觀念題", "APCS實作題"], score: "7", label: "APCS觀念題+APCS實作題7" },
    ],
  },
  "114-personal_application-003332-114_apply": {
    scores: {
      1: "28",
      2: "11",
      3: "12",
    },
  },
  "114-personal_application-099012-114_apply": {
    scores: {
      1: "49",
      2: "10",
      3: "12",
      4: "13",
    },
  },
  "114-personal_application-099022-114_apply": {
    scores: {
      1: "46",
      2: "7",
      3: "11",
      4: "13",
    },
  },
  "114-personal_application-099032-114_apply": {
    scores: {
      1: "51",
      2: "10",
      3: "12",
      4: "13",
    },
  },
  "114-personal_application-099042-114_apply": {
    scores: {
      1: "47",
      2: "7",
      3: "12",
      4: "13",
    },
  },
  "114-personal_application-099052-114_apply": {
    scores: {
      1: "52",
      2: "11",
      3: "13",
      4: "13",
    },
  },
  "114-personal_application-099062-114_apply": {
    scores: {
      1: "44",
      2: "6",
      3: "11",
      4: "14",
    },
  },
  "114-personal_application-099072-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "數A", "社會"], score: "47", label: "國文+英文+數A+社會47" },
    ],
  },
  "114-personal_application-099082-114_apply": {
    additions: [
      { rank: 1, multiplier: "10", subjects: ["英文"], score: "8", label: "英文8" },
      { rank: 2, multiplier: "5", subjects: ["國文", "英文", "數A"], score: "26", label: "國文+英文+數A26" },
    ],
  },
  "114-personal_application-099092-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "數A", "社會"], score: "49", label: "國文+英文+數A+社會49" },
    ],
  },
  "114-personal_application-099102-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "數A", "社會"], score: "41", label: "國文+英文+數A+社會41" },
    ],
  },
  "114-personal_application-099112-114_apply": {
    scores: {
      1: "43",
      2: "8",
      3: "12",
    },
  },
  "114-personal_application-099132-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "數A"], score: "34", label: "國文+英文+數A34" },
    ],
  },
  "114-personal_application-099122-114_apply": {
    scores: {
      1: "40",
      2: "6",
      3: "10",
    },
  },
  "114-personal_application-099192-114_apply": {
    scores: {
      1: "42",
      2: "8",
      3: "12",
    },
  },
  "114-personal_application-099202-114_apply": {
    scores: {
      1: "42",
      2: "6",
      3: "12",
    },
  },
  "114-personal_application-099212-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文", "數A"], score: "32", label: "國文+英文+數A32" },
    ],
  },
  "114-personal_application-099222-114_apply": {
    additions: [
      { rank: 1, multiplier: "2.5", subjects: ["英文", "數B", "社會"], score: "36", label: "英文+數B+社會36" },
    ],
  },
  "114-personal_application-099282-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "英文"], score: "23", label: "國文+英文23" },
    ],
  },
  "114-personal_application-099292-114_apply": {
    additions: [
      { rank: 1, multiplier: "6", subjects: ["國文", "英文", "數B"], score: "27", label: "國文+英文+數B27" },
    ],
  },
  "114-personal_application-099302-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["國文", "社會"], score: "37", label: "國文+社會37" },
    ],
  },
  "114-personal_application-099342-114_apply": {
    additions: [
      { rank: 1, multiplier: "3.5", subjects: ["國文", "社會"], score: "27", label: "國文+社會27" },
    ],
  },
  "114-personal_application-099322-114_apply": {
    scores: {
      1: "42",
      2: "13",
      3: "13",
    },
  },
  "114-personal_application-099372-114_apply": {
    additions: [
      { rank: 1, multiplier: "10", subjects: ["英文", "數A"], score: "17", label: "英文+數A17" },
      { rank: 2, multiplier: "6", subjects: ["APCS觀念題", "APCS實作題"], score: "7", label: "APCS觀念題+APCS實作題7" },
    ],
  },
  "114-personal_application-099382-114_apply": {
    additions: [
      { rank: 1, multiplier: "6", subjects: ["英文", "數A"], score: "19", label: "英文+數A19" },
    ],
  },
  "114-personal_application-099412-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["英文", "數A", "自然"], score: "37", label: "英文+數A+自然37" },
    ],
  },
  "114-personal_application-099422-114_apply": {
    additions: [
      { rank: 1, multiplier: "3", subjects: ["英文", "數A", "自然"], score: "30", label: "英文+數A+自然30" },
    ],
  },
};

const CATEGORY_NAME_ALIASES = {
  "一般跨學類": "不分系跨域學類",
  "外語跨學類": "外語應用學類",
  "工業管理學類": "工業工程管理學類",
  "工程跨學類": "工程跨域學類",
  "數理化跨學類": "理學跨域學類",
  "文史哲跨學類": "人文跨域學類",
  "營建安全學類": "營建與消防安全學類",
  "管理跨學類": "管理跨域學類",
  "藝術跨學類": "藝術跨域學類",
  "電機資訊學類": "電機資訊整合學類",
};

const ADVANCED_SUBJECT_GROUPS = {
  personal_application: {
    label: "個申",
    subjects: ["國文", "英文", "數A", "數B", "社會", "自然", "英聽", "術科"],
  },
  star_recommendation: {
    label: "繁星",
    subjects: ["國文", "英文", "數A", "數B", "社會", "自然", "英聽", "術科", "在校"],
  },
  exam_distribution: {
    label: "分發",
    subjects: ["國文", "英文", "數甲", "數乙", "歷史", "地理", "公民", "物理", "化學", "生物", "術科"],
  },
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  state.placement = defaultPlacementState();
  bindElements();
  bindEvents();
  await loadData();
  hydrateSchoolFilter();
  hydratePlacementFilters();
  applyFilters();
  renderPlacementAnalysis();
  renderExplorer();
  renderQualityReport();
  renderSources();
}

function bindElements() {
  [
    "sideRecordCount",
    "yearFilter",
    "channelFilter",
    "schoolFilter",
    "keywordInput",
    "recordTableBody",
    "resultCount",
    "explorerRoot",
    "compareGrid",
    "sourceList",
    "qualityReportRoot",
    "detailDrawer",
    "detailMeta",
    "detailTitle",
    "detailBody",
    "advancedFilterDrawer",
    "advancedFilterBody",
    "advancedFilterSummary",
    "placementResultCount",
    "placementResultCountLabel",
    "placementResults",
    "placementYearFilter",
    "placementChannelFilter",
    "placementKeywordInput",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.view === "explorer") resetExplorerState("overview");
      setView(button.dataset.view);
    });
  });
  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewJump));
  });
  document.querySelectorAll("[data-home-entry]").forEach((button) => {
    button.addEventListener("click", () => activateHomeEntry(button.dataset.homeEntry));
  });
  document.querySelectorAll("[data-channel-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      els.channelFilter.value = button.dataset.channelPick;
      state.filters.channel = button.dataset.channelPick;
      setView("workbench");
      applyFilters();
    });
  });

  els.yearFilter.addEventListener("change", updateFilter);
  els.channelFilter.addEventListener("change", updateFilter);
  els.schoolFilter.addEventListener("change", updateFilter);
  els.keywordInput.addEventListener("input", debounce(updateFilter, 120));

  document.getElementById("resetFiltersButton").addEventListener("click", resetFilters);
  document.getElementById("openAdvancedFiltersButton").addEventListener("click", openAdvancedFilters);
  document.getElementById("clearCompareButton").addEventListener("click", () => {
    state.compare = [];
    renderCompare();
    renderTable();
  });
  document.getElementById("closeDrawerButton").addEventListener("click", closeDrawer);
  document.getElementById("closeAdvancedFiltersButton").addEventListener("click", closeAdvancedFilters);
  document.addEventListener("pointerdown", (event) => {
    const advancedDrawer = els.advancedFilterDrawer;
    if (advancedDrawer?.classList.contains("open") && !advancedDrawer.contains(event.target)) closeAdvancedFilters();
    const detailDrawer = els.detailDrawer;
    if (detailDrawer?.classList.contains("open") && !detailDrawer.contains(event.target)) closeDrawer();
  });
  bindPlacementEvents();
}

function activateHomeEntry(entry) {
  if (!entry) return;
  if (entry === "group-explorer") {
    resetExplorerState("overview");
    setView("explorer");
    renderExplorer();
    return;
  }
  if (entry === "compare-list") {
    setView("compare");
    return;
  }
  if (entry === "sources-view") {
    setView("sources");
    return;
  }
  if (entry === "quality-review") {
    setView("quality");
    return;
  }
  if (entry === "all-query") {
    state.filters.channel = "all";
    state.filters.keyword = "";
    state.linkedGroup = "";
    state.linkedCategory = "";
    els.channelFilter.value = "all";
    els.keywordInput.value = "";
    setView("workbench");
    applyFilters();
    return;
  }
  const channelMap = {
    "personal-apply": "personal_application",
    "star-entry": "star_recommendation",
    "distribution-entry": "exam_distribution",
    "placement-entry": "placement",
  };
  const channel = channelMap[entry];
  if (entry === "placement-entry") {
    setView("placement");
    return;
  }
  if (!channel) return;
  state.filters.channel = channel;
  state.filters.keyword = "";
  state.linkedGroup = "";
  state.linkedCategory = "";
  els.channelFilter.value = channel;
  els.keywordInput.value = "";
  setView("workbench");
  applyFilters();
}

async function loadData() {
  const [records, results, groups, manifest, gsatStandards, categoryInsights, categoryRepresentatives, qualityReport] = await Promise.all([
    fetchJson("./data/admissions_records.json"),
    fetchJson("./data/distribution_results.json"),
    fetchJson("./data/group_departments.json"),
    fetchJson("./data/site_manifest.json"),
    fetchJson("./data/ceec_gsat_five_standard_scores.json"),
    fetchJson("./data/category_insights.json"),
    fetchJson("./data/category_representatives.json"),
    fetchJson("./data/apply114_quality_report.json"),
  ]);
  state.records = records;
  state.results = results;
  state.groups = groups;
  state.manifest = manifest;
  state.gsatStandards = gsatStandards;
  state.categoryInsights = categoryInsights;
  state.categoryRepresentatives = categoryRepresentatives;
  state.qualityReport = qualityReport;
  buildRecordIndexes();
  els.sideRecordCount.textContent = `${fmt.format(records.length)} 筆資料`;
}

function resetExplorerState(stage = "overview") {
  state.selectedExplorerStage = stage;
  state.selectedGroup = "";
  state.selectedCategory = "";
  state.explorerKeyword = "";
  state.linkedGroup = "";
  state.linkedCategory = "";
  state.explorerChannelSelection = {};
}

function buildRecordIndexes() {
  state.recordIndexByFullName = new Map();
  state.recordIndexBySchoolDept = new Map();
  state.records.forEach((record) => {
    const fullKey = normalize(`${record.schoolName}${record.departmentName}`);
    const schoolDeptKey = `${normalize(record.schoolName)}|${normalize(record.departmentName)}`;
    if (fullKey) {
      if (!state.recordIndexByFullName.has(fullKey)) state.recordIndexByFullName.set(fullKey, []);
      state.recordIndexByFullName.get(fullKey).push(record);
    }
    if (schoolDeptKey !== "|") {
      if (!state.recordIndexBySchoolDept.has(schoolDeptKey)) state.recordIndexBySchoolDept.set(schoolDeptKey, []);
      state.recordIndexBySchoolDept.get(schoolDeptKey).push(record);
    }
  });
}

async function fetchJson(path) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${path}${separator}v=${DATA_VERSION}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Cannot load ${path}`);
  return response.json();
}

function updateFilter() {
  state.filters.year = els.yearFilter.value;
  state.filters.channel = els.channelFilter.value;
  state.filters.school = els.schoolFilter.value;
  state.filters.keyword = els.keywordInput.value.trim();
  renderAdvancedFilterDrawer();
  applyFilters();
}

function resetFilters() {
  state.filters = { year: "all", channel: "all", school: "all", keyword: "", advanced: defaultAdvancedFilters() };
  resetExplorerState("overview");
  els.yearFilter.value = "all";
  els.channelFilter.value = "all";
  els.schoolFilter.value = "all";
  els.keywordInput.value = "";
  renderExplorer();
  renderAdvancedFilterDrawer();
  applyFilters();
}

function updateExplorerKeyword() {
  const input = document.getElementById("explorerKeywordInput");
  state.explorerKeyword = input?.value.trim() || "";
  renderExplorer();
}

function defaultAdvancedFilters() {
  return {
    excludedSubjects: [],
    subjectGroupsOpen: {},
    specialAdmissionMode: "exclude",
    groups: [],
    schools: [],
  };
}

function currentAdvancedFilters() {
  if (!state.filters.advanced) state.filters.advanced = defaultAdvancedFilters();
  state.filters.advanced.excludedSubjects ||= [];
  state.filters.advanced.subjectGroupsOpen ||= {};
  state.filters.advanced.specialAdmissionMode ||= "exclude";
  state.filters.advanced.groups ||= [];
  state.filters.advanced.schools ||= [];
  return state.filters.advanced;
}

function openAdvancedFilters() {
  renderAdvancedFilterDrawer();
  els.advancedFilterDrawer?.classList.add("open");
  els.advancedFilterDrawer?.setAttribute("aria-hidden", "false");
}

function closeAdvancedFilters() {
  els.advancedFilterDrawer?.classList.remove("open");
  els.advancedFilterDrawer?.setAttribute("aria-hidden", "true");
}

function renderAdvancedFilterSummary() {
  if (!els.advancedFilterSummary) return;
  const text = advancedFilterSummaryText();
  if (!text) {
    els.advancedFilterSummary.innerHTML = "";
    els.advancedFilterSummary.classList.remove("active");
    return;
  }
  els.advancedFilterSummary.classList.add("active");
  els.advancedFilterSummary.innerHTML = `
    <span>精準篩選</span>
    <strong>${escapeHtml(text)}</strong>
  `;
}

function advancedFilterSummaryText() {
  const advanced = currentAdvancedFilters();
  const parts = [];
  if (advanced.excludedSubjects.length) parts.push(`不看 ${advanced.excludedSubjects.join("、")}`);
  if (advanced.specialAdmissionMode === "include") parts.push("含特殊組");
  if (advanced.specialAdmissionMode === "only") parts.push("只看特殊組");
  if (advanced.groups.length) parts.push(...advanced.groups);
  if (advanced.schools.length) parts.push(...advanced.schools);
  return parts.join("｜");
}

function renderAdvancedFilterDrawer() {
  if (!els.advancedFilterBody) return;
  const advanced = currentAdvancedFilters();
  const groupNames = advancedGroupNames();
  const schools = advancedSchoolOptions();
  els.advancedFilterBody.innerHTML = `
    <section class="advanced-section">
      <div class="advanced-section-head">
        <h3>排除科目</h3>
        <span>${escapeHtml(advancedSubjectHint())}</span>
      </div>
      <div class="advanced-subject-groups">
        ${advancedSubjectGroupsHtml(advanced)}
      </div>
    </section>
    <section class="advanced-section">
      <div class="advanced-section-head">
        <h3>招生類型</h3>
        <span>預設排除希望、旭日、成星等特殊組</span>
      </div>
      <div class="advanced-chip-row">
        ${[
          ["exclude", "一般校系"],
          ["include", "含特殊組"],
          ["only", "只看特殊組"],
        ].map(([value, label]) => `
          <button class="advanced-chip ${advanced.specialAdmissionMode === value ? "active" : ""}" data-special-admission-filter="${value}">
            ${escapeHtml(label)}
          </button>
        `).join("")}
      </div>
    </section>
    <section class="advanced-section">
      <div class="advanced-section-head">
        <h3>學群</h3>
        <span>可複選</span>
      </div>
      <div class="advanced-chip-row">
        ${groupNames.map((name) => `
          <button class="advanced-chip ${advanced.groups.includes(name) ? "active" : ""}" data-advanced-group="${escapeAttr(name)}">
            ${escapeHtml(name)}
          </button>
        `).join("")}
      </div>
    </section>
    <section class="advanced-section">
      <div class="advanced-section-head">
        <h3>學校</h3>
        <span>至多 5 間</span>
      </div>
      <label class="advanced-select-single">
        <select id="advancedSchoolPicker" ${advanced.schools.length >= 5 ? "disabled" : ""}>
          <option value="">選擇學校</option>
          ${schools.filter((school) => !advanced.schools.includes(school.name)).map((school) => `<option value="${escapeAttr(school.name)}">${escapeHtml(`${school.code} ${school.name}`)}</option>`).join("")}
        </select>
      </label>
      <div class="advanced-current advanced-school-selection">
        ${advanced.schools.length ? advanced.schools.map((name) => `<button class="advanced-current-chip" data-remove-advanced-school="${escapeAttr(name)}">${escapeHtml(name)} ×</button>`).join("") : `<span class="advanced-empty">尚未選擇學校</span>`}
      </div>
    </section>
    <section class="advanced-section advanced-current-section">
      <div class="advanced-section-head">
        <h3>已套用條件</h3>
      </div>
      <div class="advanced-current">
        ${advancedFilterChipsHtml() || `<span class="advanced-empty">尚未套用精準條件</span>`}
      </div>
    </section>
    <div class="advanced-drawer-actions">
      <button class="ghost-button" id="clearAdvancedFiltersButton">清除精準條件</button>
      <button class="solid-button" id="applyAdvancedFiltersButton">套用</button>
    </div>
  `;
  bindAdvancedFilterEvents();
}

function advancedSubjectHint() {
  const channel = state.filters.channel;
  if (channel === "personal_application") return "個申科目";
  if (channel === "star_recommendation") return "繁星科目含在校";
  if (channel === "exam_distribution") return "分發科目含數甲、數乙";
  return "依三種管道分組";
}

function advancedSubjectGroupsHtml(advanced) {
  const keys = ["personal_application", "star_recommendation", "exam_distribution"];
  const groupCards = keys.map((key) => {
    const group = ADVANCED_SUBJECT_GROUPS[key];
    if (!group) return "";
    const open = Boolean(advanced.subjectGroupsOpen?.[key]);
    const selectedCount = group.subjects.filter((subject) => advanced.excludedSubjects.includes(subject)).length;
    return `
      <div class="advanced-subject-group">
        <button class="advanced-subject-toggle" data-toggle-advanced-subject-group="${escapeAttr(key)}" aria-expanded="${open}">
          <span>${escapeHtml(group.label)}</span>
          <small>${selectedCount ? `已排除 ${selectedCount} 科` : "展開科目"}</small>
        </button>
      </div>
    `;
  }).join("");
  const expandedGroups = keys.filter((key) => advanced.subjectGroupsOpen?.[key]).map((key) => {
    const group = ADVANCED_SUBJECT_GROUPS[key];
    if (!group) return "";
    return `
      <div class="advanced-subject-expanded">
        <strong>${escapeHtml(group.label)}：選擇不看的科目</strong>
        <div class="advanced-chip-row">
          ${group.subjects.map((subject) => `
            <button class="advanced-chip ${advanced.excludedSubjects.includes(subject) ? "active" : ""}" data-advanced-subject="${escapeAttr(subject)}">
              不看 ${escapeHtml(subject)}
            </button>
          `).join("")}
        </div>
        </div>
      </div>
    `;
  }).join("");
  return `${groupCards}${expandedGroups}`;
}

function advancedSchoolOptions() {
  const schoolMap = new Map();
  state.records.forEach((record) => {
    if (!record.schoolName) return;
    const code = record.schoolCode || "999";
    const current = schoolMap.get(record.schoolName);
    if (!current || code < current.code) schoolMap.set(record.schoolName, { name: record.schoolName, code });
  });
  return [...schoolMap.values()].sort((a, b) => a.code.localeCompare(b.code, "en"));
}

function advancedFilterChipsHtml() {
  const advanced = currentAdvancedFilters();
  const chips = [
    ...advanced.excludedSubjects.map((subject) => `不看 ${subject}`),
    advanced.specialAdmissionMode === "include" ? "含特殊組" : "",
    advanced.specialAdmissionMode === "only" ? "只看特殊組" : "",
    ...advanced.groups,
    ...advanced.schools,
  ].filter(Boolean);
  return chips.map((chip) => `<span class="advanced-current-chip">${escapeHtml(chip)}</span>`).join("");
}

function bindAdvancedFilterEvents() {
  els.advancedFilterBody.querySelectorAll("[data-toggle-advanced-subject-group]").forEach((button) => {
    button.addEventListener("click", () => {
      const advanced = currentAdvancedFilters();
      const key = button.dataset.toggleAdvancedSubjectGroup;
      const opening = !advanced.subjectGroupsOpen[key];
      advanced.subjectGroupsOpen = opening ? { [key]: true } : {};
      renderAdvancedFilterDrawer();
    });
  });
  els.advancedFilterBody.querySelectorAll("[data-advanced-subject]").forEach((button) => {
    button.addEventListener("click", () => {
      const advanced = currentAdvancedFilters();
      const subject = button.dataset.advancedSubject;
      advanced.excludedSubjects = advanced.excludedSubjects.includes(subject)
        ? advanced.excludedSubjects.filter((item) => item !== subject)
        : [...advanced.excludedSubjects, subject];
      renderAdvancedFilterDrawer();
      applyFilters();
    });
  });
  els.advancedFilterBody.querySelectorAll("[data-advanced-group]").forEach((button) => {
    button.addEventListener("click", () => {
      const advanced = currentAdvancedFilters();
      const group = button.dataset.advancedGroup;
      advanced.groups = advanced.groups.includes(group)
        ? advanced.groups.filter((item) => item !== group)
        : [...advanced.groups, group];
      renderAdvancedFilterDrawer();
      applyFilters();
    });
  });
  els.advancedFilterBody.querySelector("#advancedSchoolPicker")?.addEventListener("change", (event) => {
    const advanced = currentAdvancedFilters();
    const school = event.target.value;
    if (school && !advanced.schools.includes(school) && advanced.schools.length < 5) advanced.schools = [...advanced.schools, school];
    renderAdvancedFilterDrawer();
    applyFilters();
  });
  els.advancedFilterBody.querySelectorAll("[data-remove-advanced-school]").forEach((button) => {
    button.addEventListener("click", () => {
      const advanced = currentAdvancedFilters();
      advanced.schools = advanced.schools.filter((school) => school !== button.dataset.removeAdvancedSchool);
      renderAdvancedFilterDrawer();
      applyFilters();
    });
  });
  els.advancedFilterBody.querySelectorAll("[data-special-admission-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      currentAdvancedFilters().specialAdmissionMode = button.dataset.specialAdmissionFilter || "exclude";
      renderAdvancedFilterDrawer();
      applyFilters();
    });
  });
  els.advancedFilterBody.querySelector("#clearAdvancedFiltersButton")?.addEventListener("click", () => {
    state.filters.advanced = defaultAdvancedFilters();
    renderAdvancedFilterDrawer();
    applyFilters();
  });
  els.advancedFilterBody.querySelector("#applyAdvancedFiltersButton")?.addEventListener("click", closeAdvancedFilters);
}

function advancedGroupNames() {
  return [...new Set(state.groups.map((row) => row.groupName).filter((name) => name && name !== "跨領域"))]
    .sort((a, b) => a.localeCompare(b, "zh-Hant"));
}

function advancedCategoryNames(groupName = "") {
  return [...new Set(state.groups
    .filter((row) => !groupName || row.groupName === groupName)
    .map((row) => row.categoryName)
    .filter(Boolean))]
    .sort((a, b) => displayCategoryName(a).localeCompare(displayCategoryName(b), "zh-Hant"));
}

function recordMatchesAdvancedFilters(record) {
  const advanced = state.filters.advanced || {
    excludedSubjects: [],
    specialAdmissionMode: "exclude",
    groups: [],
    schools: [],
  };
  if (advanced.schools?.length && !advanced.schools.includes(record.schoolName)) return false;
  if (!specialAdmissionModeAllows(record, advanced.specialAdmissionMode || "exclude")) return false;
  const excluded = new Set((advanced.excludedSubjects || []).map(advancedSubjectKey).filter(Boolean));
  if (excluded.size) {
    const subjects = recordSubjectKeys(record);
    for (const subject of excluded) {
      if (subjects.has(subject)) return false;
    }
  }
  const needles = groupRowsToNeedles(state.groups.filter((row) => advanced.groups?.includes(row.groupName)));
  if (needles.size && !matchesGroup(record, needles)) return false;
  return true;
}

function recordSubjectKeys(record) {
  const subjects = new Set();
  const add = (value) => {
    const subject = advancedSubjectKey(value);
    if (subject) subjects.add(subject);
  };
  const addText = (value) => {
    advancedSubjectKeysFromText(value).forEach((subject) => subjects.add(subject));
  };
  (record.cacDetail?.screeningSubjects || []).forEach((item) => add(item.subject));
  (record.cacDetail?.testRequirements || []).forEach((item) => add(item.subject));
  (record.starAdmissionResult?.testRequirements || []).forEach((item) => add(item.subject));
  (record.starAdmissionResult?.distributionStandards || []).forEach((item) => addText(item.item));
  (record.cacDetail?.distributionOrder || []).forEach(addText);
  (record.weightedSubjects || []).forEach((item) => add(item.subject || item.raw));
  (record.applySieveResult?.rankedItems || []).forEach((item) => (item.subjects || []).forEach(add));
  (record.applySieveResult?.sieveResultItems || []).forEach((item) => (item.subjects || []).forEach(add));
  addText(record.applySieveResult?.sieveResultStandard);
  addText(record.applySieveResult?.sieveResultRaw);
  addText(record.weightedSubjectsText);
  addText(record.testRequirementStandard);
  if (record.examRequired === "是") subjects.add("術科");
  if (record.starRankStandard?.academicRankPercentileStandard) subjects.add("在校");
  return subjects;
}

function advancedSubjectKeysFromText(value) {
  const text = String(value || "").replace(/\s+/g, "");
  if (!text) return [];
  const subjects = [];
  [
    "國文", "英文", "數學A", "數A", "數學B", "數B", "數學甲", "數甲", "數學乙", "數乙",
    "社會", "自然", "英聽", "歷史", "地理", "公民與社會", "公民", "物理", "化學", "生物",
    "術科", "在校學業", "在校", "國語文學業", "英語文學業", "數學學業", "歷史學業",
    "地理學業", "公民與社會學業", "物理學業", "化學學業", "生物學業",
  ].forEach((subject) => {
    if (text.includes(subject)) {
      const key = advancedSubjectKey(subject);
      if (key && !subjects.includes(key)) subjects.push(key);
    }
  });
  return subjects;
}

function advancedSubjectKey(subject) {
  const text = String(subject || "").replace(/\s+/g, "");
  if (!text || text === "--" || text === "---") return "";
  if (/國文|國語文/.test(text)) return text.includes("學業") ? "在校" : "國文";
  if (/英文|英語文/.test(text)) return text.includes("學業") ? "在校" : "英文";
  if (/數學A|數A/.test(text)) return text.includes("學業") ? "在校" : "數A";
  if (/數學B|數B/.test(text)) return text.includes("學業") ? "在校" : "數B";
  if (/數學甲|數甲/.test(text)) return "數甲";
  if (/數學乙|數乙/.test(text)) return "數乙";
  if (/公民與社會|公民|公社/.test(text)) return text.includes("學業") ? "在校" : "公民";
  if (/社會/.test(text)) return "社會";
  if (/自然/.test(text)) return "自然";
  if (/英聽/.test(text)) return "英聽";
  if (/歷史/.test(text)) return text.includes("學業") ? "在校" : "歷史";
  if (/地理/.test(text)) return text.includes("學業") ? "在校" : "地理";
  if (/物理/.test(text)) return text.includes("學業") ? "在校" : "物理";
  if (/化學/.test(text)) return text.includes("學業") ? "在校" : "化學";
  if (/生物/.test(text)) return text.includes("學業") ? "在校" : "生物";
  if (/在校|學業|全校排名百分比/.test(text)) return "在校";
  if (/術科|音樂|美術|體育/.test(text)) return "術科";
  return "";
}

function schoolOwnership(record) {
  const school = String(record?.schoolName || "");
  return /^(國立|市立)/.test(school) ? "public" : "private";
}

function isTopUniversity(record) {
  const school = String(record?.schoolName || "").replace(/\s+/g, "");
  return [
    "國立臺灣大學",
    "國立政治大學",
    "國立清華大學",
    "國立陽明交通大學",
    "國立成功大學",
  ].some((name) => school === name || school.includes(name.replace("國立", "")));
}

function specialAdmissionInfo(record) {
  const text = `${record?.departmentName || ""} ${record?.category || ""}`.replace(/\s+/g, "");
  const patterns = [
    { pattern: /希望組/, label: "希望組" },
    { pattern: /晨光招生|晨光組|晨光/, label: "晨光" },
    { pattern: /旭日招生/, label: "旭日" },
    { pattern: /成星招生/, label: "成星" },
    { pattern: /興翼招生|興翼/, label: "興翼" },
    { pattern: /向日葵聯合招生|向日葵/, label: "向日葵" },
    { pattern: /嘉星招生|嘉星/, label: "嘉星" },
    { pattern: /西灣南星/, label: "西灣南星" },
    { pattern: /薪火招生|薪火組/, label: "薪火" },
    { pattern: /政星招生|政星/, label: "政星" },
    { pattern: /屯蒙/, label: "屯蒙" },
    { pattern: /柳川招生組/, label: "柳川" },
    { pattern: /青年儲蓄帳戶組|青年儲蓄/, label: "青年儲蓄" },
  ];
  const match = patterns.find((item) => item.pattern.test(text));
  return match ? { special: true, label: match.label } : { special: false, label: "" };
}

function specialAdmissionModeAllows(record, mode = "exclude") {
  const special = specialAdmissionInfo(record).special;
  if (mode === "include") return true;
  if (mode === "only") return special;
  return !special;
}

function specialAdmissionBadgeHtml(record) {
  const info = specialAdmissionInfo(record);
  return info.special ? `<span class="special-admission-badge">${escapeHtml(info.label)}</span>` : "";
}

function advancedCategoryNeedles(groupName = "", categoryName = "") {
  if (categoryName) {
    return groupRowsToNeedles(state.groups.filter((row) => (
      row.categoryName === categoryName && (!groupName || row.groupName === groupName)
    )));
  }
  if (groupName) return getGroupNeedles(groupName);
  return new Set();
}

function applyFilters() {
  const groupNeedles = getGroupNeedles(state.linkedGroup);
  const categoryNeedles = getCategoryNeedles(state.linkedGroup, state.linkedCategory);
  const keyword = normalize(state.filters.keyword);
  state.filtered = state.records.filter((record) => {
    if (state.filters.year !== "all" && String(record.year) !== state.filters.year) return false;
    if (state.filters.channel !== "all" && record.channelKey !== state.filters.channel) return false;
    if (state.filters.school !== "all" && record.schoolName !== state.filters.school) return false;
    if (groupNeedles.size && !matchesGroup(record, groupNeedles)) return false;
    if (categoryNeedles.size && !matchesGroup(record, categoryNeedles)) return false;
    if (!recordMatchesAdvancedFilters(record)) return false;
    if (keyword && !recordSearchText(record).includes(keyword)) return false;
    return true;
  });
  renderAdvancedFilterSummary();
  renderTable();
  if (state.placement?.stage === "results") renderPlacementAnalysis();
}

function hydrateSchoolFilter() {
  const schoolMap = new Map();
  state.records.forEach((record) => {
    if (!record.schoolName) return;
    const current = schoolMap.get(record.schoolName);
    const code = record.schoolCode || "999";
    if (!current || code < current.code) schoolMap.set(record.schoolName, { name: record.schoolName, code });
  });
  const schools = [...schoolMap.values()].sort((a, b) => a.code.localeCompare(b.code, "en"));
  const frag = document.createDocumentFragment();
  schools.forEach((school) => {
    const option = document.createElement("option");
    option.value = school.name;
    option.textContent = `${school.code} ${school.name}`;
    frag.appendChild(option);
  });
  els.schoolFilter.appendChild(frag);
}

function setView(view) {
  state.view = view;
  document.body.dataset.activeView = view;
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.remove("active"));
  document.getElementById(`${view}View`).classList.add("active");
  if (view === "compare") renderCompare();
  if (view === "explorer") renderExplorer();
  if (view === "placement") renderPlacementAnalysis();
  if (view === "quality") renderQualityReport();
}

function defaultPlacementState() {
  return {
    stage: "setup",
    resultTab: "match",
    scores: {
      國文: "",
      英文: "",
      數A: "",
      數B: "",
      社會: "",
      自然: "",
      英聽: "",
      在校: "",
      數甲: "",
      數乙: "",
      歷史: "",
      地理: "",
      公民: "",
      物理: "",
      化學: "",
      生物: "",
    },
    channels: ["personal_application", "star_recommendation"],
    schoolOwnership: "all",
    topUniversityOnly: false,
    specialAdmissionMode: "exclude",
    groups: [],
    categories: [],
    year: "all",
    channel: "all",
    schoolScope: "all",
    keyword: "",
  };
}

function bindPlacementEvents() {
  document.querySelectorAll("[data-placement-score]").forEach((input) => {
    input.addEventListener("input", debounce(() => {
      state.placement.scores[input.dataset.placementScore] = input.value.trim();
      renderPlacementAnalysis();
    }, 120));
  });
  document.querySelectorAll("[data-placement-channel]").forEach((button) => {
    button.addEventListener("click", () => {
      const channel = button.dataset.placementChannel;
      const channels = new Set(state.placement.channels);
      if (channels.has(channel)) channels.delete(channel);
      else channels.add(channel);
      state.placement.channels = [...channels];
      renderPlacementControls();
      renderPlacementAnalysis();
    });
  });
  document.querySelectorAll("[data-placement-ownership]").forEach((button) => {
    button.addEventListener("click", () => {
      state.placement.schoolOwnership = button.dataset.placementOwnership || "all";
      renderPlacementControls();
      renderPlacementAnalysis();
    });
  });
  document.querySelector("[data-placement-top]")?.addEventListener("click", () => {
    state.placement.topUniversityOnly = !state.placement.topUniversityOnly;
    renderPlacementControls();
    renderPlacementAnalysis();
  });
  document.querySelectorAll("[data-placement-special]").forEach((button) => {
    button.addEventListener("click", () => {
      state.placement.specialAdmissionMode = button.dataset.placementSpecial || "exclude";
      renderPlacementControls();
      renderPlacementAnalysis();
    });
  });
  document.getElementById("runPlacementAnalysis")?.addEventListener("click", showPlacementResults);
  document.getElementById("editPlacementCriteria")?.addEventListener("click", showPlacementSetup);
  document.getElementById("placementOpenAdvancedFiltersButton")?.addEventListener("click", openAdvancedFilters);
  els.placementYearFilter?.addEventListener("change", updatePlacementResultFilters);
  els.placementChannelFilter?.addEventListener("change", updatePlacementResultFilters);
  els.placementKeywordInput?.addEventListener("input", debounce(updatePlacementResultFilters, 120));
  document.querySelectorAll("[data-placement-school-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      state.placement.schoolScope = button.dataset.placementSchoolScope || "all";
      renderPlacementControls();
      renderPlacementAnalysis();
    });
  });
  document.querySelectorAll("[data-placement-result-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.placement.resultTab = button.dataset.placementResultTab || "all";
      renderPlacementAnalysis();
    });
  });
}

function showPlacementResults() {
  const profile = placementProfile();
  if (!placementHasAnyInput(profile)) return;
  state.placement.stage = "results";
  state.placement.resultTab = "match";
  renderPlacementStage();
  renderPlacementAnalysis();
}

function showPlacementSetup() {
  state.placement.stage = "setup";
  renderPlacementStage();
}

function renderPlacementStage() {
  const setupStage = document.getElementById("placementSetupStage");
  const resultStage = document.getElementById("placementResultStage");
  const resultActions = document.getElementById("placementResultActions");
  const showingResults = state.placement?.stage === "results";
  if (setupStage) setupStage.hidden = showingResults;
  if (resultStage) resultStage.hidden = !showingResults;
  if (resultActions) resultActions.hidden = !showingResults;
}

function hydratePlacementFilters() {
  hydratePlacementResultFilters();
}

function hydratePlacementCategoryFilter() {
  hydratePlacementResultFilters();
}

function placementFilterOptions(select, items, allLabel, value, label = (item) => item) {
  if (!select) return;
  select.replaceChildren();
  const all = document.createElement("option");
  all.value = "all";
  all.textContent = allLabel;
  select.appendChild(all);
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = label(item);
    select.appendChild(option);
  });
  select.value = value;
}

function hydratePlacementResultFilters() {
  const years = [...new Set(state.records.map((record) => String(record.year)).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a, "en"));
  placementFilterOptions(els.placementYearFilter, years, "年度", state.placement.year);
  placementFilterOptions(els.placementChannelFilter, ["personal_application", "star_recommendation", "exam_distribution"], "入學管道", state.placement.channel, (channel) => ({
    personal_application: "個人申請",
    star_recommendation: "繁星推薦",
    exam_distribution: "分發入學",
  })[channel]);
  if (els.placementKeywordInput) els.placementKeywordInput.value = state.placement.keyword;
}

function updatePlacementResultFilters() {
  state.placement.year = els.placementYearFilter?.value || "all";
  state.placement.channel = els.placementChannelFilter?.value || "all";
  state.placement.keyword = els.placementKeywordInput?.value.trim() || "";
  hydratePlacementResultFilters();
  renderPlacementAnalysis();
}

function renderPlacementControls() {
  document.querySelectorAll("[data-placement-channel]").forEach((button) => {
    button.classList.toggle("active", state.placement.channels.includes(button.dataset.placementChannel));
  });
  document.querySelectorAll("[data-placement-ownership]").forEach((button) => {
    button.classList.toggle("active", state.placement.schoolOwnership === button.dataset.placementOwnership);
  });
  document.querySelector("[data-placement-top]")?.classList.toggle("active", state.placement.topUniversityOnly);
  document.querySelectorAll("[data-placement-special]").forEach((button) => {
    button.classList.toggle("active", state.placement.specialAdmissionMode === button.dataset.placementSpecial);
  });
  document.querySelectorAll("[data-placement-school-scope]").forEach((button) => {
    button.classList.toggle("active", state.placement.schoolScope === button.dataset.placementSchoolScope);
  });
  const runButton = document.getElementById("runPlacementAnalysis");
  if (runButton) runButton.disabled = !placementHasAnyInput(placementProfile());
}

function renderPlacementDirectionOptions() {
  if (!els.placementGroupChips || !els.placementCategoryChips) return;
  els.placementGroupChips.innerHTML = advancedGroupNames().map(placementGroupChipHtml).join("");
  const categoryNames = placementVisibleCategoryNames();
  els.placementCategoryChips.innerHTML = categoryNames.length
    ? categoryNames.map(placementCategoryChipHtml).join("")
    : `<span class="placement-direction-hint">先選一個學群，再挑選學類</span>`;

  els.placementGroupChips.querySelectorAll("[data-placement-group-chip]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.placementGroupChip;
      if (!value) return;
      if (state.placement.groups.includes(value)) {
        state.placement.groups = state.placement.groups.filter((item) => item !== value);
        state.placement.categories = state.placement.categories.filter((category) => placementCategoryBelongsToSelection(category));
      } else {
        state.placement.groups = [...state.placement.groups, value];
      }
      renderPlacementControls();
      renderPlacementAnalysis();
    });
  });

  els.placementCategoryChips.querySelectorAll("[data-placement-category-chip]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.placementCategoryChip;
      if (!value) return;
      if (state.placement.categories.includes(value)) {
        state.placement.categories = state.placement.categories.filter((item) => item !== value);
      } else {
        state.placement.categories = [...state.placement.categories, value];
      }
      renderPlacementControls();
      renderPlacementAnalysis();
    });
  });
}

function placementGroupChipHtml(name) {
  const active = state.placement.groups.includes(name) ? " active" : "";
  return `
    <button class="placement-direction-chip${active}" data-placement-group-chip="${escapeAttr(name)}">
      ${escapeHtml(name)}
    </button>
  `;
}

function placementCategoryChipHtml(name) {
  const active = state.placement.categories.includes(name) ? " active" : "";
  return `
    <button class="placement-direction-chip${active}" data-placement-category-chip="${escapeAttr(name)}">
      ${escapeHtml(displayCategoryName(name))}
    </button>
  `;
}

function placementVisibleCategoryNames() {
  if (!state.placement.groups.length) {
    return advancedCategoryNames("").slice(0, 28);
  }
  const selectedGroups = new Set(state.placement.groups);
  return [...new Set(state.groups
    .filter((row) => selectedGroups.has(row.groupName) && row.categoryName)
    .map((row) => row.categoryName))]
    .sort((a, b) => displayCategoryName(a).localeCompare(displayCategoryName(b), "zh-Hant"));
}

function placementCategoryBelongsToSelection(categoryName) {
  if (!state.placement.groups.length) return true;
  return state.groups.some((row) => row.categoryName === categoryName && state.placement.groups.includes(row.groupName));
}

function placementProfile() {
  return {
    scores: { ...state.placement.scores },
    channels: state.placement.channel !== "all"
      ? [state.placement.channel]
      : ["personal_application", "star_recommendation", "exam_distribution"],
    schoolOwnership: state.placement.schoolOwnership,
    topUniversityOnly: state.placement.topUniversityOnly,
    specialAdmissionMode: state.placement.specialAdmissionMode || "exclude",
    groups: [...state.placement.groups],
    categories: [...state.placement.categories],
  };
}

function renderPlacementAnalysis() {
  if (!els.placementResults) return;
  renderPlacementControls();
  const profile = placementProfile();
  const criteriaSummary = document.getElementById("placementCriteriaSummary");
  if (criteriaSummary) criteriaSummary.innerHTML = placementCriteriaSummaryHtml(profile);
  document.querySelectorAll("[data-placement-result-tab]").forEach((button) => {
    button.classList.toggle("active", (button.dataset.placementResultTab || "all") === state.placement.resultTab);
  });
  if (!placementHasAnyInput(profile)) {
    els.placementResultCount.textContent = "0";
    if (els.placementResultCountLabel) els.placementResultCountLabel.textContent = "筆符合";
    els.placementResults.innerHTML = `<div class="empty-state">先輸入至少一科成績，系統會依門檻與篩選標準整理可能校系。</div>`;
    return;
  }
  const allRows = state.records
    .filter((record) => placementMatchesFilters(record, profile))
    .map((record) => ({ record, evaluation: evaluatePlacementRecord(record, profile) }))
    .sort((a, b) => placementStatusWeight(a.evaluation.status) - placementStatusWeight(b.evaluation.status)
      || a.evaluation.gapTotal - b.evaluation.gapTotal
      || `${a.record.schoolCode}${a.record.departmentName}`.localeCompare(`${b.record.schoolCode}${b.record.departmentName}`, "zh-Hant"));
  const visibleRows = allRows.filter((row) => row.evaluation.status === state.placement.resultTab);
  const rows = visibleRows.slice(0, 120);
  const countLabel = { match: "筆符合", near: "筆接近", miss: "筆未達" }[state.placement.resultTab] || "筆結果";
  els.placementResultCount.textContent = fmt.format(visibleRows.length);
  if (els.placementResultCountLabel) els.placementResultCountLabel.textContent = countLabel;
  if (!rows.length) {
    els.placementResults.innerHTML = `<div class="empty-state">目前沒有符合條件的校系，可放寬學類或補上更多科目成績。</div>`;
    return;
  }
  els.placementResults.innerHTML = rows.map(({ record, evaluation }) => placementResultCardHtml(record, evaluation)).join("");
  els.placementResults.querySelectorAll("[data-placement-detail]").forEach((button) => {
    button.addEventListener("click", () => openDetail(button.dataset.placementDetail));
  });
}

function placementCriteriaSummaryHtml(profile) {
  const scoreTags = Object.entries(profile.scores)
    .filter(([, value]) => String(value || "").trim())
    .map(([subject, value]) => `${shortSubject(subject)} ${value}`);
  const directionTags = [
    ...profile.groups,
    ...profile.categories.map(displayCategoryName),
  ];
  const tags = [...scoreTags, ...directionTags].slice(0, 8);
  return tags.length
    ? tags.map((label) => `<span>${escapeHtml(label)}</span>`).join("")
    : "";
}

function placementSummaryCardsHtml(rows) {
  const counts = rows.reduce((acc, row) => {
    const status = row.evaluation?.status || "missing";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, { match: 0, near: 0, missing: 0, miss: 0 });
  const cards = [
    { key: "match", label: "符合", value: counts.match, note: "目前成績達標" },
    { key: "near", label: "接近", value: counts.near, note: "差距較小可參考" },
    { key: "missing", label: "資料不足", value: counts.missing, note: "需補填科目" },
    { key: "miss", label: "未達", value: counts.miss, note: "門檻仍有差距" },
  ];
  return cards.map((card) => `
    <article class="placement-summary-card ${escapeAttr(card.key)}">
      <span>${escapeHtml(card.label)}</span>
      <strong>${fmt.format(card.value)}</strong>
      <small>${escapeHtml(card.note)}</small>
    </article>
  `).join("");
}

function placementHasAnyInput(profile) {
  return Object.values(profile.scores || {}).some((value) => String(value ?? "").trim() !== "")
    || profile.groups.length
    || profile.categories.length
    || profile.schoolOwnership !== "all"
    || profile.topUniversityOnly
    || profile.specialAdmissionMode !== "exclude";
}

function placementStatusWeight(status) {
  return { match: 0, near: 1, missing: 2, miss: 3 }[status] ?? 4;
}

function placementResultCardHtml(record, evaluation) {
  const statusLabel = {
    match: "符合",
    near: "接近",
    missing: "資料不足",
    miss: "未達",
  }[evaluation.status] || "未判斷";
  return `
    <article class="placement-result-card ${escapeAttr(evaluation.status)} is-clickable" data-placement-detail="${escapeAttr(record.id)}">
      <div class="placement-result-main">
        <div>
          <strong>${escapeHtml(record.schoolName)}</strong>
          <h3>${escapeHtml(record.departmentName)}${specialAdmissionBadgeHtml(record)}</h3>
          <p class="placement-result-meta">
            <span>${escapeHtml(record.year)} ${escapeHtml(channelShort(record.channelKey))}</span>
            <span class="placement-status ${escapeAttr(evaluation.status)}">${escapeHtml(statusLabel)}</span>
            <span class="placement-result-summary">${escapeHtml(placementResultSummary(evaluation))}</span>
          </p>
        </div>
      </div>
      <div class="placement-result-side">
        <div class="placement-requirements">
          ${evaluation.requirements.slice(0, 6).map((item) => `
            <span class="placement-req ${escapeAttr(item.status)}">${escapeHtml(placementRequirementLabel(item))}</span>
          `).join("")}
        </div>
      </div>
    </article>
  `;
}

function placementMatchesFilters(record, profile) {
  if (state.placement.year !== "all" && String(record.year) !== state.placement.year) return false;
  if (!placementSchoolScopeAllows(record, state.placement.schoolScope)) return false;
  if (state.placement.keyword && !recordSearchText(record).includes(normalize(state.placement.keyword))) return false;
  if (typeof recordMatchesAdvancedFilters === "function" && !recordMatchesAdvancedFilters(record)) return false;
  if (!profile.channels.includes(record.channelKey)) return false;
  if (profile.schoolOwnership !== "all" && schoolOwnership(record) !== profile.schoolOwnership) return false;
  if (profile.topUniversityOnly && !isTopUniversity(record)) return false;
  const needles = placementSelectedNeedles(profile);
  if (needles.size && !matchesGroup(record, needles)) return false;
  return true;
}

function placementSelectedNeedles(profile) {
  const rows = state.groups.filter((row) => (
    (profile.groups.length && profile.groups.includes(row.groupName))
    || (profile.categories.length && profile.categories.includes(row.categoryName))
  ));
  return groupRowsToNeedles(rows);
}

function evaluatePlacementRecord(record, profile) {
  const requirements = placementRecordRequirements(record);
  if (!requirements.length) {
    return { status: "missing", requirements: [], gapTotal: 99, missingCount: 1, missCount: 0 };
  }
  const checked = requirements.map((requirement) => placementRequirementResult(requirement, profile));
  const missingCount = checked.filter((item) => item.status === "missing").length;
  const missCount = checked.filter((item) => item.status === "miss").length;
  const gapTotal = checked.reduce((sum, item) => sum + Math.max(0, item.gap || 0), 0);
  let status = "match";
  if (missingCount) status = "missing";
  else if (missCount && gapTotal <= 3) status = "near";
  else if (missCount) status = "miss";
  return { status, requirements: checked, gapTotal, missingCount, missCount };
}

function placementRecordRequirements(record) {
  if (record.channelKey === "personal_application") return placementApplyRequirements(record);
  if (record.channelKey === "star_recommendation") return placementStarRequirements(record);
  if (record.channelKey === "exam_distribution") return placementDistributionRequirements(record);
  return [];
}

function placementApplyRequirements(record) {
  const requirements = [];
  applySieveRankedItems(record).forEach((item) => {
    const threshold = Number(item.score);
    const isSingleSubject = item.subjects?.length === 1;
    if (Number.isFinite(threshold) && threshold > 0 && item.subjects?.length && (!isSingleSubject || threshold <= 15)) {
      requirements.push({ kind: isSingleSubject ? "score" : "sum", subjects: item.subjects.map(shortSubject), threshold, source: "篩選" });
    }
  });
  if (!requirements.length) {
    (record.applySieveResult?.sieveResultItems || []).forEach((item) => {
      const threshold = Number(item.score);
      const isSingleSubject = item.subjects?.length === 1;
      if (Number.isFinite(threshold) && threshold > 0 && item.subjects?.length && (!isSingleSubject || threshold <= 15)) {
        requirements.push({ kind: isSingleSubject ? "score" : "sum", subjects: item.subjects.map(shortSubject), threshold, source: "篩選" });
      }
    });
  }
  (record.cacDetail?.screeningSubjects || []).forEach((item) => {
    const subject = shortSubject(item.subject);
    const score = state.gsatStandards?.[String(record.year)]?.[normalizeSubject(item.subject)]?.[item.standard];
    if (subject && score != null) {
      requirements.push({ kind: "score", subjects: [subject], threshold: Number(score), source: "申請" });
    }
  });
  if (record.examRequired === "是") {
    requirements.push({ kind: "note", subjects: ["術科"], threshold: null, source: "術科" });
  }
  return uniquePlacementRequirements(requirements);
}

function placementStarRequirements(record) {
  const requirements = [];
  const testItems = record.starAdmissionResult?.testRequirements?.length
    ? record.starAdmissionResult.testRequirements
    : record.cacDetail?.testRequirements || [];
  testItems.forEach((item) => {
    const subject = shortSubject(item.subject);
    const score = item.score || state.gsatStandards?.[String(record.year)]?.[normalizeSubject(item.subject)]?.[item.standard];
    if (subject && score) requirements.push({ kind: "score", subjects: [subject], threshold: Number(score), source: "學測" });
  });
  const rankText = record.starAdmissionResult?.distributionStandards?.[0]?.firstRoundStandard
    || record.starAdmissionResult?.distributionStandards?.[0]?.secondRoundStandard
    || record.starRankStandard?.academicRankPercentileStandard
    || "";
  const rank = Number(String(rankText).match(/(\d+(?:\.\d+)?)/)?.[1]);
  if (Number.isFinite(rank)) requirements.push({ kind: "percent", subjects: ["在校"], threshold: rank, source: "校排" });
  return uniquePlacementRequirements(requirements);
}

function placementDistributionRequirements(record) {
  const weighted = (record.weightedSubjects || [])
    .filter((item) => item?.raw && item.raw !== "--" && item.raw !== "---")
    .map((item) => ({
      subject: distributionSubjectLabel(item.subject),
      weight: Number(distributionWeightLabel(item.weight)),
    }))
    .filter((item) => item.subject && Number.isFinite(item.weight));
  const result = distributionResult(record);
  const total = Number(result?.regularTotalScore);
  if (!weighted.length) return [];
  return [{
    kind: "weightedTotal",
    subjects: weighted.map((item) => item.subject),
    weighted,
    threshold: Number.isFinite(total) ? total : null,
    source: "分發",
  }];
}

function uniquePlacementRequirements(requirements) {
  const merged = [];
  const seen = new Set();
  const strictestIndex = new Map();
  requirements.forEach((item) => {
    // 個申可能同時提供「篩選」與「申請」兩個來源；同一科目只顯示較高的門檻。
    if (["score", "sum"].includes(item.kind)) {
      const strictestKey = `${item.kind}|${item.subjects.join("+")}`;
      const existingIndex = strictestIndex.get(strictestKey);
      if (existingIndex == null) {
        strictestIndex.set(strictestKey, merged.length);
        merged.push(item);
      } else if (Number(item.threshold) > Number(merged[existingIndex].threshold)) {
        merged[existingIndex] = item;
      }
      return;
    }
    const key = `${item.kind}|${item.subjects.join("+")}|${item.threshold}|${item.source}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged;
}

function placementRequirementResult(requirement, profile) {
  if (requirement.kind === "note") return { ...requirement, status: "missing", actual: "", gap: 0 };
  if (requirement.kind === "weightedTotal") {
    let missing = false;
    const actual = requirement.weighted.reduce((sum, item) => {
      const score = placementScoreValue(profile, item.subject);
      if (score == null) missing = true;
      return sum + (Number(score || 0) * item.weight);
    }, 0);
    if (missing || requirement.threshold == null) return { ...requirement, status: "missing", actual, gap: 0 };
    const gap = requirement.threshold - actual;
    return { ...requirement, status: gap <= 0 ? "match" : "miss", actual, gap };
  }
  if (requirement.kind === "percent") {
    const actual = placementScoreValue(profile, "在校");
    if (actual == null) return { ...requirement, status: "missing", actual: "", gap: 0 };
    const gap = actual - requirement.threshold;
    return { ...requirement, status: gap <= 0 ? "match" : "miss", actual, gap };
  }
  const scores = requirement.subjects.map((subject) => placementScoreValue(profile, subject));
  if (scores.some((score) => score == null)) return { ...requirement, status: "missing", actual: "", gap: 0 };
  const actual = requirement.kind === "sum" ? scores.reduce((sum, score) => sum + score, 0) : scores[0];
  const gap = requirement.threshold - actual;
  return { ...requirement, status: gap <= 0 ? "match" : "miss", actual, gap };
}

function placementScoreValue(profile, subject) {
  const key = advancedSubjectKey(subject) || shortSubject(subject);
  const raw = profile.scores?.[key] ?? profile.scores?.[shortSubject(subject)] ?? "";
  if (raw === "" || raw == null) return null;
  const value = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(value) ? value : null;
}

function placementRequirementLabel(item) {
  const subject = item.subjects.join("+");
  if (item.kind === "weightedTotal") {
    const actual = Number(item.actual || 0).toFixed(1).replace(/\.0$/, "");
    return item.threshold == null ? `估算 ${actual}` : `總分 ${actual}/${item.threshold}`;
  }
  if (item.kind === "percent") return `在校 ${item.actual || "--"}/${item.threshold}%`;
  if (item.kind === "note") return item.source || subject;
  return `${subject} ${item.actual || "--"}／${item.threshold}`;
}

function placementResultSummary(evaluation) {
  if (evaluation.status === "match") return "達標";
  if (evaluation.status === "near") return `約差 ${Number(evaluation.gapTotal.toFixed(1))}`;
  if (evaluation.status === "missing") return "需補填必要科目";
  return `約差 ${Number(evaluation.gapTotal.toFixed(1))}`;
}

function placementSchoolScopeAllows(record, scope = "all") {
  if (scope === "public" || scope === "private") return schoolOwnership(record) === scope;
  if (scope === "top") return isTopUniversity(record);
  if (scope === "central") return ["國立中央大學", "國立中興大學", "國立中山大學", "國立中正大學"].includes(record.schoolName);
  return true;
}

function renderTable() {
  els.resultCount.textContent = fmt.format(state.filtered.length);
  const rows = state.filtered.slice(0, 350);
  if (!rows.length) {
    els.recordTableBody.innerHTML = `<tr><td colspan="4"><div class="empty-state">目前沒有符合條件的資料</div></td></tr>`;
    return;
  }
  els.recordTableBody.innerHTML = rows.map((record) => {
    const highlight = highlightHtml(record);
    const compareText = state.compare.some((item) => item.id === record.id) ? "已加入" : "比較";
    return `
      <tr>
        <td>
          <div class="channel-stack">
            <span class="year-number">${record.year}</span>
            ${channelBadge(record)}
          </div>
        </td>
        <td>
          <div class="cell-main">${escapeHtml(record.schoolName)}</div>
          <div class="cell-sub program-name">${escapeHtml(record.departmentName)}${specialAdmissionBadgeHtml(record)}</div>
        </td>
        <td>${highlight || "--"}</td>
        <td>
          <div class="row-actions">
            <button class="small-button" data-detail="${escapeAttr(record.id)}">詳情</button>
            <button class="small-button" data-compare="${escapeAttr(record.id)}">${compareText}</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  els.recordTableBody.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => openDetail(button.dataset.detail));
  });
  els.recordTableBody.querySelectorAll("[data-compare]").forEach((button) => {
    button.addEventListener("click", () => toggleCompare(button.dataset.compare));
  });
}

function getHighlight(record) {
  if (record.channelKey === "exam_distribution") {
    const result = distributionResult(record);
    return [
      result?.regularTotalScore ? `總分 ${result.regularTotalScore}` : "",
      record.weightedSubjectsText ? `採計 ${record.weightedSubjectsText}` : "",
    ].filter(Boolean).join("｜") || record.weightedSubjectsText || "";
  }
  if (record.channelKey === "personal_application") {
    const parts = personalApplicationStandardParts(record);
    if (parts.length) return parts.map((part) => part.text).join("、");
    const detail = record.cacDetail;
    if (detail?.screeningSubjects?.length) return "篩選結果待複核";
    return [
      record.expectedSecondStageCount ? `甄試 ${record.expectedSecondStageCount}` : "",
      record.screeningDate ? `日期 ${record.screeningDate}` : "",
      record.examRequired ? `術科 ${record.examRequired}` : "",
    ].filter(Boolean).join("｜");
  }
  if (record.channelKey === "star_recommendation") {
    const thresholds = starThresholdParts(record).join("、");
    const rounds = starRoundRows(record).map((row) => `${row.label}：${row.items.join("、")}`).join("｜");
    return [thresholds, rounds].filter(Boolean).join("｜") || record.starGroup || record.category;
  }
  return "";
}

function highlightHtml(record) {
  if (record.channelKey === "personal_application") {
    const parts = personalApplicationStandardParts(record);
    if (parts.length) {
      return `<div class="standard-list">${parts.map((part) => (
        `<span class="standard-chip ${escapeAttr(part.type)}">${escapeHtml(part.text)}</span>`
      )).join("")}</div>`;
    }
  }
  if (record.channelKey === "star_recommendation") {
    return starStandardHtml(record) || escapeHtml(getHighlight(record) || "");
  }
  if (record.channelKey === "exam_distribution") {
    return distributionHighlightHtml(record);
  }
  return escapeHtml(getHighlight(record) || "");
}

function distributionResult(record) {
  return record?.programCode ? state.results[`${record.year}-${record.programCode}`] : null;
}

function distributionHighlightHtml(record) {
  const result = distributionResult(record);
  const parts = [];
  if (result?.regularTotalScore) {
    parts.push(`<span class="standard-chip distribution-total">總分 ${escapeHtml(result.regularTotalScore)}</span>`);
  }
  if (result?.regularTieBreak && result.regularTieBreak !== "-----") {
    parts.push(`<span class="standard-chip distribution-tie">同分 ${escapeHtml(result.regularTieBreak)}</span>`);
  }
  const subjectLine = distributionWeightsHtml(record);
  return `
    <div class="distribution-standard">
      ${parts.length ? `<div class="standard-list">${parts.join("")}</div>` : ""}
      ${subjectLine}
    </div>
  `;
}

function distributionWeightsHtml(record) {
  const items = (record.weightedSubjects || [])
    .filter((item) => item?.raw && item.raw !== "--" && item.raw !== "---")
    .map((item) => {
      const subject = distributionSubjectLabel(item.subject);
      const weight = distributionWeightLabel(item.weight);
      if (!subject || !weight) return "";
      const kind = item.exam_type === "學測" ? "gsat" : item.exam_type === "分科" ? "ast" : "other";
      return `<span class="distribution-weight-chip ${kind}">${escapeHtml(`${subject} x ${weight}`)}</span>`;
    })
    .filter(Boolean);
  return items.length ? `<div class="distribution-weights">${items.join("")}</div>` : "";
}

function distributionSubjectLabel(subject) {
  const normalized = String(subject || "").replace(/\s+/g, "");
  return {
    "國文": "國文",
    "英文": "英文",
    "數學A": "數A",
    "數A": "數A",
    "數學B": "數B",
    "數B": "數B",
    "數學甲": "數甲",
    "數甲": "數甲",
    "數學乙": "數乙",
    "數乙": "數乙",
    "歷史": "歷史",
    "地理": "地理",
    "公民與社會": "公民",
    "公民": "公民",
    "物理": "物理",
    "化學": "化學",
    "生物": "生物",
  }[normalized] || normalized;
}

function distributionWeightLabel(weight) {
  const value = String(weight || "").trim();
  if (!value) return "";
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : value;
}

function starStandardHtml(record) {
  const thresholds = starThresholdParts(record);
  const rows = starRoundRows(record);
  if (!thresholds.length && !rows.length) return "";
  return `
    <div class="star-standard">
      ${thresholds.length ? `
        <div class="star-thresholds">
          ${thresholds.map((text) => `<span class="standard-chip threshold">${escapeHtml(text)}</span>`).join("")}
        </div>
      ` : ""}
      ${rows.length ? `
        <div class="star-rounds">
          ${rows.map((row) => `
            <div class="star-round-row">
              <span class="star-round-label">${escapeHtml(row.label)}</span>
              <span class="star-round-items">${escapeHtml(row.items.join("、") || "從缺")}</span>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function starThresholdParts(record) {
  const pdfRequirements = record.starAdmissionResult?.testRequirements || [];
  const source = pdfRequirements.length ? pdfRequirements : (record.cacDetail?.testRequirements || []);
  return source
    .filter((item) => item.standard || item.score)
    .map((item) => formatStarRequirement(record.year, item))
    .filter(Boolean);
}

function formatStarRequirement(year, item) {
  const subject = shortSubject(item.subject);
  const score = String(item.score || "").trim();
  if (score) return formatSubjectScore(subject, score);
  const standard = String(item.standard || "").trim();
  if (!standard || standard === "--") return "";
  if (subject === "英聽") return `${subject}${standard.replace(/級$/, "")}`;
  const converted = state.gsatStandards?.[String(year)]?.[normalizeSubject(item.subject)]?.[standard];
  if (converted != null) return formatSubjectScore(subject, converted);
  return `${subject} ${standard}`;
}

function starRoundRows(record) {
  const result = record.starAdmissionResult;
  if (!result?.distributionStandards?.length) return [];
  const first = [];
  const second = [];
  result.distributionStandards.forEach((item) => {
    const label = compactStarDistributionItem(item.item);
    if (hasDisplayValue(item.firstRoundStandard)) first.push(`${label} ${item.firstRoundStandard}`);
    if (hasDisplayValue(item.secondRoundStandard)) second.push(`${label} ${item.secondRoundStandard}`);
  });
  return [
    { label: "一階：", items: first },
    { label: "二階：", items: second },
  ];
}

function compactStarDistributionItem(value) {
  const text = String(value || "")
    .replace(/^學測/, "")
    .replace(/在校學業/g, "在校")
    .replace(/國語文學業/g, "在校國文")
    .replace(/英語文學業/g, "在校英文")
    .replace(/數學學業/g, "在校數學")
    .replace(/歷史學業/g, "在校歷史")
    .replace(/地理學業/g, "在校地理")
    .replace(/公民與社會學業/g, "在校公民")
    .replace(/公社學業/g, "在校公民")
    .replace(/物理學業/g, "在校物理")
    .replace(/化學學業/g, "在校化學")
    .replace(/生物學業/g, "在校生物")
    .replace(/地球科學學業/g, "在校地科")
    .replace(/國英數A社自/g, "國+英+數A+社+自")
    .replace(/國數A社自/g, "國+數A+社+自")
    .replace(/國英數A自/g, "國+英+數A+自")
    .replace(/國英數B社/g, "國+英+數B+社")
    .replace(/國英社/g, "國+英+社")
    .replace(/英數A社自/g, "英+數A+社+自")
    .replace(/英數A社/g, "英+數A+社")
    .trim();
  return text || "其他";
}

function personalApplicationStandardParts(record) {
  if (record.channelKey !== "personal_application") return [];
  const parts = [];
  const result = record.applySieveResult;
  const rankedItems = applySieveRankedItems(record);
  const sieveResultItems = (result?.sieveResultItems || []).filter((item) => !((item.subjects || []).length === 1 && Number(item.score) > 15));
  const sieveResultStandard = String(result?.sieveResultStandard || "")
    .split("、")
    .filter((item) => !/^(國文|英文|數學A|數學B|數A|數B|社會|自然|英聽)\s*\d{2,}$/.test(item.trim()))
    .join("、");
  const coveredSubjects = coveredSubjectsFromResult(result, record);
  if (rankedItems.length) {
    rankedItems.forEach((item) => {
      const label = rankedSieveLabel(item);
      if (label && item.score) parts.push({ type: "screening", text: label });
    });
  } else if (sieveResultItems.length) {
    sieveResultItems.forEach((item) => {
      const label = normalizeSieveLabel(item.label || sieveItemLabel(item));
      splitSieveLabelParts(label).forEach((text) => parts.push({ type: "screening", text }));
    });
  } else if (sieveResultStandard) {
    normalizeSieveLabel(sieveResultStandard).split("、").forEach((label) => {
      splitSieveLabelParts(label).forEach((text) => parts.push({ type: "screening", text }));
    });
  }
  if (!sieveResultStandard && !rankedItems.length) {
    parts.push({ type: "status", text: personalApplicationNoResultLabel(record) });
  }
  parts.push(...applicationThresholdParts(record, coveredSubjects));
  return parts;
}

function rankedSieveLabel(item) {
  const subjects = (item.subjects || []).map(shortSubject).join("+");
  if (!subjects) return "";
  return formatSubjectScore(subjects, item.score);
}

function personalApplicationNoResultLabel(record) {
  const review = record.applySieveReview;
  if (review?.status === "special_result" || review?.status === "manual_special") return "術科考試";
  if (record.examRequired === "是") return "術科考試";
  if (hasUnresolvedSingleSubjectScore(record)) return "篩選分數待覆核";
  if (officialEmptyResult(record)) return "官方從缺";
  return "官方結果待補";
}

function officialEmptyResult(record) {
  return (state.qualityReport?.confirmedOfficialEmptyResults || []).find((item) => item.recordId === record.id);
}

function applicationThresholdParts(record, coveredSubjects = new Set()) {
  const items = record.cacDetail?.screeningSubjects || [];
  return items
    .filter((item) => item.standard && item.standard !== "--")
    .filter((item) => !coveredSubjects.has(subjectKey(item.subject)))
    .map((item) => ({ type: "threshold", text: formatApplicationThreshold(record.year, item.subject, item.standard) }))
    .filter((part) => part.text);
}

function coveredSubjectsFromSieve(result) {
  const subjects = new Set();
  (result?.sieveResultItems || []).forEach((item) => {
    if ((item.subjects || []).length === 1) {
      subjects.add(subjectKey(item.subjects[0]));
    }
  });
  return subjects;
}

function coveredSubjectsFromResult(result, record = null) {
  const subjects = new Set();
  const rankedItems = record ? applySieveRankedItems(record) : (result?.rankedItems || []);
  rankedItems.forEach((item) => {
    if (!item.score) return;
    if ((item.subjects || []).length === 1) {
      subjects.add(subjectKey(item.subjects[0]));
    }
  });
  if (!subjects.size) {
    (result?.sieveResultItems || []).forEach((item) => {
      if (!item.score) return;
      if ((item.subjects || []).length === 1) {
        subjects.add(subjectKey(item.subjects[0]));
      }
    });
  }
  return subjects;
}

function applySieveOverrideConfig(record) {
  const override = APPLY_SIEVE_SCORE_OVERRIDES[record?.id];
  if (!override) return { scores: {}, additions: [] };
  if (override.scores || override.additions) {
    return {
      scores: override.scores || {},
      additions: override.additions || [],
    };
  }
  return { scores: override, additions: [] };
}

function applySieveRankedItems(record) {
  const items = record?.applySieveResult?.rankedItems || [];
  const { scores, additions } = applySieveOverrideConfig(record);
  const correctedItems = items.map((item) => {
    const overrideScore = scores[item.rank];
    if (!overrideScore) return { ...item };
    const subjects = (item.subjects || []).join("+");
    return {
      ...item,
      score: overrideScore,
      label: subjects ? `${subjects}${overrideScore}` : item.label,
    };
  });
  additions.forEach((item) => {
    if (correctedItems.some((existing) => existing.rank === item.rank)) return;
    correctedItems.push({
      rank: item.rank,
      multiplier: item.multiplier || "",
      subjects: [...(item.subjects || [])],
      score: item.score || "",
      label: item.label || ((item.subjects || []).length ? `${item.subjects.join("+")}${item.score || ""}` : ""),
    });
  });
  return correctedItems
    .filter((item) => !((item.subjects || []).length === 1 && Number(item.score) > 15))
    .sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0));
}

function hasUnresolvedSingleSubjectScore(record) {
  const overrideScores = applySieveOverrideConfig(record).scores;
  return (record?.applySieveResult?.rankedItems || []).some((item) => (
    (item.subjects || []).length === 1 && Number(item.score) > 15
    && !(Number(overrideScores[item.rank]) >= 0 && Number(overrideScores[item.rank]) <= 15)
  ));
}

function dataQualityStatusInfo(record) {
  const report = state.qualityReport || {};
  const anomaly = (report.anomalies || []).find((item) => item.recordId === record.id && item.risk === "high");
  const officialEmpty = officialEmptyResult(record);
  if (anomaly?.manualCorrectionApplied) {
    return { label: "人工修正", tone: "corrected", summary: "已套用人工確認修正" };
  }
  if (anomaly) {
    return { label: "覆核中", tone: "review", summary: anomaly.reviewAction || "高風險 OCR 待覆核" };
  }
  if (record.channelKey === "personal_application") {
    if (hasUnresolvedSingleSubjectScore(record)) {
      return { label: "分數待覆核", tone: "review", summary: "已隱藏不可能的單科分數，等待官方表格覆核" };
    }
    if (officialEmpty) {
      return { label: "官方從缺", tone: "official", summary: officialEmpty.reason || "官方結果空白，已確認從缺" };
    }
    if (applySieveRankedItems(record).length) {
      return { label: "官方完整", tone: "official", summary: "已接入正式篩選順位" };
    }
    if (record.applySieveResult?.sieveResultStandard || record.applySieveReview?.label) {
      return { label: "待補正式結果", tone: "missing", summary: "目前只有部分結果或 OCR 文字" };
    }
    return { label: "從缺待補", tone: "missing", summary: "官方未顯示或尚未接入" };
  }
  if (record.channelKey === "star_recommendation") {
    if (record.starAdmissionResult || record.starRankStandard) {
      return { label: "官方完整", tone: "official", summary: "繁星門檻與分發標準已接入" };
    }
  }
  if (record.channelKey === "exam_distribution") {
    if (distributionResult(record)) {
      return { label: "官方完整", tone: "official", summary: "分發結果與總分已接入" };
    }
  }
  return { label: "基礎資料", tone: "basic", summary: "目前僅提供校系與分則資料" };
}

function dataQualityStatusSummary(record) {
  return dataQualityStatusInfo(record).summary;
}

function dataQualityStatusPillHtml(record) {
  const status = dataQualityStatusInfo(record);
  return `<span class="data-status-pill ${escapeAttr(status.tone)}">${escapeHtml(status.label)}</span>`;
}

function subjectKey(subject) {
  return shortSubject(normalizeSubject(subject)).replace(/\s+/g, "");
}

function formatApplicationThreshold(year, subject, standard) {
  const cleanSubject = normalizeSubject(subject);
  const cleanStandard = String(standard || "").trim();
  if (!cleanSubject || !cleanStandard || cleanStandard === "--") return "";
  const score = state.gsatStandards?.[String(year)]?.[cleanSubject]?.[cleanStandard];
  if (score != null) return formatSubjectScore(shortSubject(cleanSubject), score);
  if (cleanSubject === "英聽") return `${cleanSubject}${cleanStandard.replace(/級$/, "")}`;
  return `${shortSubject(cleanSubject)}${cleanStandard}`;
}

function formatSubjectScore(subjects, score) {
  const cleanSubjects = String(subjects || "").trim();
  const cleanScore = String(score || "").trim();
  if (!cleanSubjects) return "";
  return cleanScore ? `${cleanSubjects} ${cleanScore}` : cleanSubjects;
}

function normalizeSieveLabel(label) {
  return String(label || "")
    .replace(/\s+/g, "")
    .replace(/數學A/g, "數A")
    .replace(/數學B/g, "數B")
    .replace(/＋|／|\//g, "+")
    .replace(/\(([^)]*\+[^)]*)\)(\d+(?:\.\d+)?)/g, "$1$2")
    .replace(/、+/g, "、")
    .trim();
}

function displaySieveLabel(label) {
  const value = normalizeSieveLabel(label);
  const match = value.match(/^(.+?)(\d+(?:\.\d+)?)$/);
  if (!match) return value;
  return formatSubjectScore(match[1], match[2]);
}

function splitSieveLabelParts(label) {
  const value = normalizeSieveLabel(label);
  if (!value) return [];
  if (value.includes("、")) return value.split("、").map(displaySieveLabel).filter(Boolean);
  if (value.includes("+")) return [displaySieveLabel(value)];
  const subjectPattern = "(國文|英文|數A|數B|社會|自然|英聽|APCS實作)";
  const matches = [...value.matchAll(new RegExp(`${subjectPattern}(\\d+(?:\\.\\d+)?)`, "g"))];
  if (matches.length <= 1) return [value];
  const rebuilt = matches.map((match) => match[0]).join("");
  return rebuilt === value ? matches.map((match) => displaySieveLabel(match[0])) : [displaySieveLabel(value)];
}

function sieveItemLabel(item) {
  if (!item) return "";
  if (item.type === "combined" && item.subjects?.length && item.score) {
    return formatSubjectScore(item.subjects.map(shortSubject).join("+"), item.score);
  }
  if (item.type === "single" && item.subjects?.length && item.score) {
    return formatSubjectScore(shortSubject(item.subjects[0]), item.score);
  }
  return item.label || "";
}

function formatRequirementList(year, items) {
  return (items || [])
    .filter((item) => item.standard && item.standard !== "--")
    .map((item) => formatRequirement(year, item.subject, item.standard))
    .filter(Boolean);
}

function summarizeCombinedScreening(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  return value
    .replace(/^一、/, "超額 ")
    .replace(/^二、/, "超額 ")
    .replace(/學科能力測驗/g, "學測")
    .replace(/之級分總和/g, "級分和")
    .replace(/學測/g, "")
    .replace(/[，。]$/g, "")
    .trim();
}

function formatRequirement(year, subject, standard) {
  const cleanSubject = normalizeSubject(subject);
  const cleanStandard = String(standard || "").trim();
  if (!cleanSubject || !cleanStandard || cleanStandard === "--") return "";
  const score = state.gsatStandards?.[String(year)]?.[cleanSubject]?.[cleanStandard];
  if (score != null) return formatSubjectScore(shortSubject(cleanSubject), score);
  if (cleanSubject === "英聽") return `${cleanSubject}${cleanStandard.replace(/級$/, "")}`;
  return `${shortSubject(cleanSubject)} ${cleanStandard}`;
}

function formatRequirementWithStandard(year, subject, standard) {
  const cleanSubject = normalizeSubject(subject);
  const cleanStandard = String(standard || "").trim();
  if (!cleanSubject || !cleanStandard || cleanStandard === "--") return "";
  const score = state.gsatStandards?.[String(year)]?.[cleanSubject]?.[cleanStandard];
  if (score != null) return `${formatSubjectScore(shortSubject(cleanSubject), score)}級（${cleanStandard}）`;
  if (cleanSubject === "英聽") return `${cleanSubject}${cleanStandard.replace(/級$/, "")}`;
  return `${shortSubject(cleanSubject)} ${cleanStandard}`;
}

function formatApplicationThresholdWithStandard(year, subject, standard) {
  const cleanSubject = normalizeSubject(subject);
  const cleanStandard = String(standard || "").trim();
  if (!cleanSubject || !cleanStandard || cleanStandard === "--") return "";
  const score = state.gsatStandards?.[String(year)]?.[cleanSubject]?.[cleanStandard];
  if (score != null) return `${shortSubject(cleanSubject)} ${score}級（${cleanStandard}）`;
  if (cleanSubject === "英聽") return `${cleanSubject}${cleanStandard.replace(/級$/, "")}`;
  return `${shortSubject(cleanSubject)}${cleanStandard}`;
}

function normalizeSubject(subject) {
  const text = String(subject || "").replace(/\s+/g, "");
  const map = {
    國文: "國文",
    英文: "英文",
    數學A: "數學A",
    數A: "數學A",
    數學B: "數學B",
    數B: "數學B",
    社會: "社會",
    自然: "自然",
    英聽: "英聽",
  };
  return map[text] || text;
}

function shortSubject(subject) {
  const cleanSubject = normalizeSubject(subject);
  return {
    國文: "國文",
    英文: "英文",
    數學A: "數A",
    數學B: "數B",
    社會: "社會",
    自然: "自然",
    英聽: "英聽",
  }[cleanSubject] || cleanSubject;
}

function channelPill(record) {
  const className = record.channelKey === "star_recommendation" ? "star" : record.channelKey === "exam_distribution" ? "distribution" : "";
  return `<span class="channel-pill ${className}">${record.year} ${escapeHtml(record.channel)}</span>`;
}

function channelBadge(record) {
  const className = record.channelKey === "star_recommendation" ? "star" : record.channelKey === "exam_distribution" ? "distribution" : "apply";
  return `<span class="channel-mini ${className}">${escapeHtml(channelShort(record.channelKey))}</span>`;
}

function channelShort(channelKey) {
  return {
    personal_application: "個申",
    star_recommendation: "繁星",
    exam_distribution: "分科",
  }[channelKey] || "";
}

function displayCategoryName(name) {
  return CATEGORY_NAME_ALIASES[name] || name;
}

function displayCategoryKeyword(name) {
  return displayCategoryName(name).replace(/學類$/, "");
}

function renderExplorer() {
  if (!els.explorerRoot) return;
  if (state.selectedExplorerStage === "overview" || !state.selectedGroup) {
    els.explorerRoot.innerHTML = explorerOverviewHtml();
  } else if (state.selectedExplorerStage === "group" || !state.selectedCategory) {
    els.explorerRoot.innerHTML = explorerGroupIntroHtml();
  } else if (state.selectedExplorerStage === "category") {
    els.explorerRoot.innerHTML = explorerCategoryIntroHtml();
  } else {
    els.explorerRoot.innerHTML = explorerDepartmentListHtml();
  }
  bindExplorerEvents();
}

function rollupCategories() {
  const map = new Map();
  visibleGroupRows().forEach((row) => map.set(row.categoryName, (map.get(row.categoryName) || 0) + 1));
  return map;
}

function visibleGroupRows() {
  return state.groups.filter((row) => row.groupName !== "跨領域");
}

function groupSummaries() {
  const groupMap = new Map();
  visibleGroupRows().forEach((row) => {
    if (!groupMap.has(row.groupName)) {
      groupMap.set(row.groupName, {
        name: row.groupName,
        count: 0,
        categories: new Map(),
        keywords: new Set(),
        departments: new Set(),
      });
    }
    const group = groupMap.get(row.groupName);
    group.count += 1;
    group.categories.set(row.categoryName, (group.categories.get(row.categoryName) || 0) + 1);
    group.keywords.add(displayCategoryKeyword(row.categoryName));
    group.departments.add(row.schoolDepartmentName);
  });
  return [...groupMap.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
}

function explorerCategoriesForGroup(groupName) {
  return [...new Map(
    visibleGroupRows()
      .filter((row) => row.groupName === groupName)
      .map((row) => [row.categoryName, row.categoryName])
  ).values()].sort((a, b) => a.localeCompare(b, "zh-Hant")).map((name) => {
    const rows = visibleGroupRows().filter((row) => row.groupName === groupName && row.categoryName === name);
    const representative = rows
      .slice(0, 4)
      .map((row) => splitSchoolDepartmentName(row.schoolDepartmentName).departmentName)
      .filter(Boolean);
    return {
      name,
      rows,
      count: rows.length,
      representative,
      insight: getCategoryInsight(name, groupName, rows),
    };
  });
}

function explorerRowKey(row) {
  return `${row.sourceDepartmentId || ""}|${row.schoolDepartmentName}|${row.categoryName}`;
}

function getGroupNeedles(groupName) {
  if (!groupName) return new Set();
  return groupRowsToNeedles(state.groups.filter((row) => row.groupName === groupName));
}

function getCategoryNeedles(groupName, categoryName) {
  if (!categoryName) return new Set();
  return groupRowsToNeedles(state.groups.filter((row) => (
    row.categoryName === categoryName && (!groupName || row.groupName === groupName)
  )));
}

function groupRowsToNeedles(rows) {
  const needles = new Set();
  rows.forEach((row) => {
    needles.add(normalize(row.schoolDepartmentName));
    const dept = row.schoolDepartmentName.replace(/^.*?(大學|學院)/, "");
    if (dept) needles.add(normalize(dept));
  });
  return needles;
}

function matchesGroup(record, needles) {
  const full = normalize(`${record.schoolName}${record.departmentName}`);
  const dept = normalize(record.departmentName);
  for (const needle of needles) {
    if (!needle) continue;
    if (full.includes(needle) || needle.includes(full) || dept.includes(needle) || needle.includes(dept)) return true;
  }
  return false;
}

function getExplorerDepartmentRows() {
  if (!state.selectedGroup && !state.selectedCategory) return [];
  const rows = visibleGroupRows().filter((row) => (
    (!state.selectedGroup || row.groupName === state.selectedGroup)
    && (!state.selectedCategory || row.categoryName === state.selectedCategory)
  ));
  const map = new Map();
  rows.forEach((row) => {
    const key = explorerRowKey(row);
    if (!map.has(key)) {
      const records = findRecordsForGroupRow(row);
      const selectedChannelKey = state.explorerChannelSelection[key];
      map.set(key, {
        ...row,
        key,
        records,
        representative: chooseExplorerRepresentative(records, selectedChannelKey),
      });
    }
  });
  const keyword = normalize(state.explorerKeyword);
  return [...map.values()].filter((row) => {
    if (!keyword) return true;
    const representative = row.representative;
    const haystack = normalize([
      row.categoryName,
      row.schoolDepartmentName,
      representative?.schoolName,
      representative?.departmentName,
    ].filter(Boolean).join(" "));
    return haystack.includes(keyword);
  }).sort((a, b) => {
    const ar = a.representative;
    const br = b.representative;
    const as = ar ? `${ar.schoolCode}${ar.departmentName}` : a.schoolDepartmentName;
    const bs = br ? `${br.schoolCode}${br.departmentName}` : b.schoolDepartmentName;
    return as.localeCompare(bs, "zh-Hant");
  }).slice(0, state.selectedCategory ? 120 : 72);
}

function findRecordsForGroupRow(groupRow) {
  const parsed = splitSchoolDepartmentName(groupRow.schoolDepartmentName);
  const school = normalize(parsed.schoolName);
  const dept = normalize(parsed.departmentName);
  const full = normalize(`${parsed.schoolName}${parsed.departmentName}`);
  if (full && state.recordIndexByFullName.has(full)) {
    return state.recordIndexByFullName.get(full);
  }
  const schoolDeptKey = `${school}|${dept}`;
  if (school && dept && state.recordIndexBySchoolDept.has(schoolDeptKey)) {
    return state.recordIndexBySchoolDept.get(schoolDeptKey);
  }
  return state.records.filter((record) => {
    if (school && normalize(record.schoolName) !== school) return false;
    const recordDept = normalize(record.departmentName);
    if (dept && recordDept === dept) return true;
    if (dept && (recordDept.includes(dept) || dept.includes(recordDept))) return true;
    const recordFull = normalize(`${record.schoolName}${record.departmentName}`);
    return full && (recordFull.includes(full) || full.includes(recordFull));
  });
}

function explorerRecordKey(record) {
  return `${record.year}-${record.channelKey}`;
}

function chooseExplorerRepresentative(records, preferredRecordKey = "") {
  const order = {
    "115-personal_application": 1,
    "115-star_recommendation": 2,
    "114-exam_distribution": 3,
    "114-personal_application": 4,
    "114-star_recommendation": 5,
  };
  const pool = preferredRecordKey
    ? records.filter((item) => explorerRecordKey(item) === preferredRecordKey)
    : records;
  return [...(pool.length ? pool : records)].sort((a, b) => {
    const ak = `${a.year}-${a.channelKey}`;
    const bk = `${b.year}-${b.channelKey}`;
    return (order[ak] || 99) - (order[bk] || 99);
  })[0] || null;
}

function explorerChannelRecords(records) {
  const uniqueRecords = new Map();
  records.forEach((record) => {
    const key = explorerRecordKey(record);
    if (!uniqueRecords.has(key)) uniqueRecords.set(key, record);
  });
  return [...uniqueRecords.values()]
    .sort((a, b) => {
      const order = {
        "115-personal_application": 1,
        "115-star_recommendation": 2,
        "114-exam_distribution": 3,
        "114-personal_application": 4,
        "114-star_recommendation": 5,
      };
      return (order[explorerRecordKey(a)] || 99) - (order[explorerRecordKey(b)] || 99);
    })
    .map((record) => ({ channelKey: record.channelKey, record, key: explorerRecordKey(record) }));
}

function explorerResultTitle() {
  if (state.selectedCategory && state.selectedGroup) return `${state.selectedGroup} / ${displayCategoryName(state.selectedCategory)}`;
  if (state.selectedCategory) return `${displayCategoryName(state.selectedCategory)} 相關校系`;
  if (state.selectedGroup) return `${state.selectedGroup} 相關校系`;
  return "請先選擇學群";
}

function explorerDepartmentCard(row) {
  const record = row.representative;
  const school = record?.schoolName || row.schoolDepartmentName.replace(row.schoolDepartmentName.replace(/^.*?(大學|學院)/, ""), "");
  const department = record?.departmentName || row.schoolDepartmentName.replace(/^.*?(大學|學院)/, "");
  const channelRecords = explorerChannelRecords(row.records);
  const activeRecordKey = record ? explorerRecordKey(record) : channelRecords[0]?.key || "";
  const activeChannelKey = record?.channelKey || channelRecords[0]?.channelKey || "";
  const accentClass = activeChannelKey === "star_recommendation"
    ? "accent-star"
    : activeChannelKey === "exam_distribution"
      ? "accent-distribution"
      : "accent-apply";
  const channels = channelRecords.map(({ channelKey, record: channelRecord, key }) => `
    <button
      class="channel-switch ${key === activeRecordKey ? "active" : ""} ${channelKey === "star_recommendation" ? "star" : channelKey === "exam_distribution" ? "distribution" : "apply"}"
      data-explorer-channel="${escapeAttr(row.key)}"
      data-channel-key="${escapeAttr(key)}"
    >${escapeHtml(channelRecord.year)} ${escapeHtml(channelShort(channelKey))}</button>
  `).join("");
  const compactHighlight = record ? highlightHtml(record) : "";
  const crossGroups = Array.isArray(row.crossGroupNames) ? row.crossGroupNames.filter(Boolean) : [];
  return `
    <article class="explorer-dept-card ${accentClass} ${record ? "is-clickable" : ""}" ${record ? `data-detail-card="${escapeAttr(record.id)}"` : ""}>
      <header>
        <div>
          <strong class="explorer-school-name">${escapeHtml(school || row.schoolDepartmentName)}</strong>
          <span class="explorer-dept-name">${escapeHtml(department || row.schoolDepartmentName)}</span>
        </div>
        <span class="explorer-card-category">${escapeHtml(displayCategoryName(row.categoryName))}</span>
      </header>
      <div class="explorer-channels">${channels || "<span>暫無管道資料</span>"}</div>
      ${crossGroups.length ? `<p class="explorer-cross-groups">可跨學群：${escapeHtml(crossGroups.join("、"))}</p>` : ""}
      ${compactHighlight ? `<div class="explorer-highlight">${compactHighlight}</div>` : ""}
    </article>
  `;
}

function explorerOverviewHtml() {
  const groups = groupSummaries();
  return `
    <div class="explorer-overview">
      <div class="explorer-intro">
        <p class="eyebrow">18 Groups</p>
        <h3>先從學群理解方向，再一路看到學類與相關校系</h3>
        <p>這一頁先幫學生看見有哪些可能，再從單一學群往下探索相關學類與學校科系。</p>
      </div>
      <div class="explorer-group-grid">
        ${groups.map((group) => `
          <button class="explorer-group-card" data-open-group="${escapeAttr(group.name)}">
            <strong>${escapeHtml(group.name)}</strong>
            <p>${escapeHtml([...group.keywords].slice(0, 4).join("、"))}</p>
            <div class="explorer-group-meta">
              <span>${fmt.format(group.categories.size)} 學類</span>
              <span>${fmt.format(group.departments.size)} 校系</span>
            </div>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function explorerGroupIntroHtml() {
  const categories = explorerCategoriesForGroup(state.selectedGroup);
  return `
    <div class="explorer-stage explorer-group-stage">
      <div class="explorer-stage-head">
        <div class="explorer-stage-copy">
          <p class="eyebrow">Group Overview</p>
          <h3>${escapeHtml(state.selectedGroup)}</h3>
          <p>${fmt.format(categories.length)} 個學類｜先理解學類差別，再往下看相關校系。</p>
        </div>
        <div class="explorer-stage-actions">
          <button class="explorer-back-link" data-explorer-back-overview>返回學群</button>
        </div>
      </div>
      <section class="explorer-group-brief">
        <div class="explorer-brief-card">
          <strong>這個學群可以怎麼看</strong>
          <p>${escapeHtml(groupSummaryLine(state.selectedGroup, categories))}</p>
        </div>
      </section>
      <div class="explorer-category-grid">
        ${categories.map((category) => `
          <button class="explorer-category-card" data-open-category="${escapeAttr(category.name)}">
            <div class="explorer-category-top">
              <span class="section-tag">${fmt.format(category.count)} 校系</span>
              <strong>${escapeHtml(displayCategoryName(category.name))}</strong>
              <p>${escapeHtml(category.insight.summary)}</p>
            </div>
            <div class="explorer-course-cluster compact">
              ${category.insight.coreCourses.slice(0, 5).map((course) => `<span class="course-chip">${escapeHtml(course)}</span>`).join("")}
            </div>
            ${category.representative.length ? `<div class="explorer-category-foot">${escapeHtml(category.representative.slice(0, 3).join("、"))}</div>` : ""}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function explorerCategoryIntroHtml() {
  const rows = visibleGroupRows().filter((row) => (
    row.groupName === state.selectedGroup && row.categoryName === state.selectedCategory
  ));
  const insight = getCategoryInsight(state.selectedCategory, state.selectedGroup, rows);
  const representativeSchools = categoryRepresentativeSchools(state.selectedCategory, rows);
  const categorySummary = categorySummaryProfile(state.selectedCategory, insight, state.selectedGroup);
  const representativeCount = representativeSchools.length ? Math.min(representativeSchools.length, 6) : 0;
  return `
    <div class="explorer-stage explorer-category-stage">
      <section class="explorer-category-hero">
        <div class="explorer-category-hero-copy">
          <p class="eyebrow">Category Overview</p>
          <h3>${escapeHtml(displayCategoryName(state.selectedCategory))}</h3>
          <p>${escapeHtml(insight.summary)}</p>
        </div>
        <aside class="explorer-category-statpack">
          <div class="explorer-stat-card is-clickable" data-open-category-results>
            <button class="explorer-back-link stat-back-link" data-explorer-back-group>返回學類</button>
            <span>相關校系</span>
            <strong>${fmt.format(rows.length)}</strong>
            <p>先掌握學類輪廓，再往下看課程與學校整理。</p>
          </div>
        </aside>
      </section>
      <section class="explorer-category-brief">
        <article class="explorer-brief-main">
          <strong>${escapeHtml(insight.focusTitle)}</strong>
          <p>${escapeHtml(insight.focusDescription)}</p>
          <div class="explorer-brief-courses">
            ${renderCategoryCourseHighlights(insight)}
          </div>
        </article>
        <aside class="explorer-brief-side">
          <div class="explorer-brief-combined">
            <div class="explorer-brief-block is-mint">
              <h5 class="explorer-brief-title">適合特質</h5>
              <div class="explorer-profile-grid">
                ${categorySummary.traits.map((item) => `<span class="profile-chip trait" title="${escapeAttr(item)}">${escapeHtml(compactProfileLabel(item))}</span>`).join("")}
              </div>
            </div>
            <div class="explorer-brief-divider"></div>
            <div class="explorer-brief-block is-indigo">
              <h5 class="explorer-brief-title">常見能力</h5>
              <div class="explorer-profile-grid">
                ${categorySummary.abilities.map((item) => `<span class="profile-chip ability" title="${escapeAttr(item)}">${escapeHtml(compactProfileLabel(item))}</span>`).join("")}
              </div>
            </div>
          </div>
        </aside>
      </section>
      <section class="explorer-category-academics explorer-category-academics-single">
        <aside class="explorer-reference-panel featured is-clickable" data-open-category-results>
          <div class="explorer-panel-head">
            <div>
              <h4>代表校系</h4>
            </div>
            <span class="explorer-panel-count">${fmt.format(representativeCount)}</span>
          </div>
          ${representativeSchools.length ? `
            <div class="explorer-representative-grid">
              ${representativeSchools.slice(0, 6).map((item) => `
                <article class="representative-school-card">
                  <strong class="representative-school-name">${escapeHtml(item.school)}</strong>
                  <p class="representative-departments" title="${escapeAttr(item.departments.join("、") || "此校在本學類有相關校系")}">${escapeHtml(item.departments.join("、") || "此校在本學類有相關校系")}</p>
                </article>
              `).join("")}
            </div>
          ` : `<p class="explorer-panel-empty">目前沒有整理到相關校系。</p>`}
        </aside>
      </section>
    </div>
  `;
}

function categoryRepresentativeSchools(categoryName, rows) {
  const schoolMap = new Map();
  rows.forEach((row) => {
    const { schoolName, departmentName } = splitSchoolDepartmentName(row.schoolDepartmentName);
    if (!schoolName) return;
    if (!schoolMap.has(schoolName)) {
      schoolMap.set(schoolName, []);
    }
    if (departmentName && !schoolMap.get(schoolName).includes(departmentName)) {
      schoolMap.get(schoolName).push(departmentName);
    }
  });
  const priorities = state.categoryRepresentatives?.[categoryName]?.prioritySchools || [];
  const ranked = priorities
    .filter((school) => schoolMap.has(school))
    .map((school) => ({ school, departments: schoolMap.get(school).slice(0, 2) }));
  const fallback = [...schoolMap.entries()]
    .filter(([school]) => !priorities.includes(school))
    .map(([school, departments]) => ({ school, departments: departments.slice(0, 2) }));
  return [...ranked, ...fallback];
}

function categorySummaryProfile(categoryName, insight, groupName = "") {
  const curated = state.categoryInsights?.[categoryName] || {};
  const generalAbilityPool = ["閱讀整理", "問題分析", "資料判讀", "口語表達", "企劃發想", "跨域整合", "專題統整", "現場應變"];
  const generalTraitPool = ["願意持續練習", "樂於討論", "能接受修正", "對議題有好奇心", "願意整理脈絡", "喜歡動手嘗試", "重視細節", "能穩定投入"];
  const contextText = [
    categoryName,
    groupName,
    insight.summary,
    insight.focusDescription,
    ...(insight.foundationCourses || []),
    ...(insight.coreCourses || []),
    ...(insight.appliedCourses || []),
  ].join(" ");
  const profiles = [
    {
      test: /(大眾傳播|新聞|廣告公關|廣電電影|資訊傳播|圖文傳播|媒體設計|文化產業)/,
      abilities: ["寫作採編", "內容企劃", "受眾分析", "媒體敘事", "社群經營", "影像製作", "品牌溝通", "議題包裝"],
      traits: ["對媒體敏感", "關心公共議題", "喜歡團隊討論", "願意快速迭代", "能接受回饋修稿", "喜歡觀察受眾"],
    },
    {
      test: /(資訊工程|資訊管理|資訊傳播|數位學習|生物資訊|電機資訊|數據統計|人工智慧|數學|物理|化學|自然科學)/,
      abilities: ["邏輯分析", "系統拆解", "程式設計", "資料處理", "模型思考", "介面規劃", "除錯排查", "抽象推理"],
      traits: ["耐心除錯", "喜歡規則", "願意持續練習", "享受拆解問題", "對新工具有好奇心", "能長時間專注"],
    },
    {
      test: /(電機工程|電子工程|通訊工程|光電工程|機械工程|航空工程|工程科學|材料工程|化學工程|土木工程|水利工程|生醫工程|營建安全|職業安全)/,
      abilities: ["數理分析", "系統整合", "結構拆解", "實驗量測", "工程設計", "工具操作", "專題實作", "流程驗證"],
      traits: ["喜歡動手驗證", "願意反覆測試", "重視精度", "能面對複雜流程", "樂於修正模型", "對機制有興趣"],
    },
    {
      test: /(建築|景觀|都市計畫|空間設計|室內設計)/,
      abilities: ["空間想像", "圖面表達", "設計提案", "材料判讀", "使用者觀察", "模型製作", "場域分析"],
      traits: ["對空間敏感", "喜歡反覆推敲", "在意細節", "能兼顧美感與實用", "願意長時間修圖改圖"],
    },
    {
      test: /(財務金融|會計|經濟|企業管理|國際企業|財稅|行銷|保險)/,
      abilities: ["數字判讀", "決策分析", "商業簡報", "資料整理", "市場觀察", "策略規劃", "風險評估", "商業溝通"],
      traits: ["對市場敏感", "重視邏輯", "願意反覆比對資料", "能兼顧效率與細節", "喜歡從案例找規律"],
    },
    {
      test: /(法律|政治|行政|社會工作|心理|教育|諮商|社會學)/,
      abilities: ["論證分析", "資料閱讀", "人際理解", "文字表達", "訪談引導", "制度判讀", "案例整理", "議題討論"],
      traits: ["重視脈絡", "對制度敏感", "願意聆聽", "能同理他人", "願意長時間陪伴議題", "對社會現象有感"],
    },
    {
      test: /(外語|英語|日語|歐語|中國語文|台灣語文|文史哲|翻譯)/,
      abilities: ["文本分析", "語言表達", "閱讀整理", "跨文化理解", "口筆譯轉換", "論述書寫", "觀點整理"],
      traits: ["喜歡閱讀", "對文化差異敏感", "願意反覆修稿", "在意文字細節", "喜歡梳理觀點"],
    },
    {
      test: /(醫學|護理|物理治療|職能治療|生命科學|生物科技|食品營養|公共衛生|藥學)/,
      abilities: ["實驗操作", "照護判斷", "資料紀錄", "科學分析", "臨床觀察", "流程執行", "健康評估"],
      traits: ["重視責任感", "能穩定執行步驟", "對生命議題敏感", "願意長時間練習", "在意安全細節"],
    },
    {
      test: /(農業|園藝|森林|獸醫|動物|水產|環境|地球科學)/,
      abilities: ["生態觀察", "田野紀錄", "實驗管理", "資料判讀", "環境分析", "問題追蹤", "現地調查"],
      traits: ["喜歡接近自然", "願意長期觀察", "能接受戶外工作", "在意環境變化", "對生物有耐心"],
    },
    {
      test: /(藝術|音樂|美術|設計|戲劇|舞蹈|工藝)/,
      abilities: ["創意發想", "視覺表達", "作品整合", "風格分析", "媒材操作", "展演規劃", "概念提案"],
      traits: ["樂於表達自我", "能接受作品被修正", "對美感敏感", "願意反覆練習", "喜歡探索風格"],
    },
    {
      test: /(體育|運動|休閒|觀光|餐旅)/,
      abilities: ["活動帶領", "現場應變", "流程規劃", "服務溝通", "團隊協作", "實務執行", "接待安排"],
      traits: ["喜歡與人互動", "有行動力", "能適應現場變化", "願意長時間站場", "重視團隊默契"],
    },
    {
      test: /(數學|數據統計|統計)/,
      abilities: ["數據建模", "抽樣分析", "邏輯推演", "公式推導", "資料解釋", "量化分析"],
      traits: ["喜歡精確推理", "願意反覆驗算", "對模式敏感", "能沉浸抽象思考", "重視一致性"],
    },
    {
      test: /(物理|光電|電子|電機|通訊)/,
      abilities: ["訊號分析", "電路理解", "量測驗證", "系統調校", "模組整合", "原理推導"],
      traits: ["喜歡從原理解題", "對誤差敏感", "願意長時間調校", "樂於拆解機制", "重視測試結果"],
    },
    {
      test: /(機械|航空|車輛|動力)/,
      abilities: ["機構設計", "運動分析", "結構判讀", "製圖建模", "機件整合", "製程理解"],
      traits: ["喜歡看機構如何運作", "能耐心調整零件細節", "對動力系統有興趣", "願意把圖面做準"],
    },
    {
      test: /(土木|水利|營建|運輸物流)/,
      abilities: ["結構規劃", "工程估算", "施工管理", "場域判讀", "流程協調", "安全檢核"],
      traits: ["對大型系統有耐心", "重視穩定與安全", "能處理多工協調", "願意看圖說與規範"],
    },
    {
      test: /(材料|化學工程|化學|生化|化妝品)/,
      abilities: ["配方理解", "物性分析", "實驗設計", "反應觀察", "製程控制", "檢測紀錄"],
      traits: ["喜歡比較材料差異", "對配方與變因敏感", "願意細看實驗結果", "重視操作條件"],
    },
    {
      test: /(建築|空間設計|景觀|都市計畫)/,
      abilities: ["空間構想", "場景分析", "草圖發展", "模型推敲", "空間敘事", "環境整合"],
      traits: ["會在意動線與尺度", "喜歡從使用者角度思考", "能接受多輪改圖", "對場域感受敏銳"],
    },
    {
      test: /(企業管理|國際企業|工業管理|行銷經營|休閒管理|管理跨學類)/,
      abilities: ["流程管理", "溝通協調", "簡報提案", "資源整合", "策略整理", "團隊分工"],
      traits: ["喜歡統整多方資訊", "願意協調不同角色", "重視執行節奏", "會主動推進任務"],
    },
    {
      test: /(財務金融|會計|財稅|保險|經濟)/,
      abilities: ["財報閱讀", "投資判讀", "成本估算", "風險試算", "制度理解", "數字比較"],
      traits: ["看到數字會想驗證", "喜歡比對制度差異", "重視風險與細節", "能長時間檢核資料"],
    },
    {
      test: /(法律|財經法律|犯罪防治)/,
      abilities: ["法條閱讀", "案例分析", "論證組織", "爭點整理", "制度比較", "文字攻防"],
      traits: ["重視證據脈絡", "願意反覆推敲用詞", "對規範界線敏感", "喜歡從案例拆解觀點"],
    },
    {
      test: /(政治|行政|勞工關係|土地資產)/,
      abilities: ["政策分析", "制度比較", "協商討論", "法規整理", "公共溝通", "議題追蹤"],
      traits: ["對公共事務有感", "會留意制度如何影響人", "願意讀規範文本", "喜歡整理立場差異"],
    },
    {
      test: /(心理|輔導諮商|社會工作|兒童家庭)/,
      abilities: ["傾聽引導", "需求判讀", "個案整理", "關係建立", "情境觀察", "紀錄分析"],
      traits: ["能同理不同處境", "願意穩定陪伴", "對情緒變化敏感", "尊重個別差異"],
    },
    {
      test: /(教育|幼兒教育|特殊教育|成人教育|華語文教育|英語教育|科技教育|數學教育|社科教育)/,
      abilities: ["教學設計", "引導說明", "課程安排", "學習診斷", "互動帶領", "教材轉化"],
      traits: ["喜歡陪人理解", "願意拆解抽象概念", "能觀察學習反應", "重視節奏與回饋"],
    },
    {
      test: /(中國語文|台灣語文|歷史|哲學|宗教|史地|文史哲|圖書資訊)/,
      abilities: ["文本爬梳", "史料閱讀", "觀點比較", "論述建構", "文獻整理", "脈絡分析"],
      traits: ["喜歡追問背景原因", "願意慢慢讀材料", "重視概念精準", "對觀點差異有耐心"],
    },
    {
      test: /(日語|英語|歐語|東方語文|外語跨學類|翻譯)/,
      abilities: ["聽說讀寫", "跨文化判讀", "語境轉換", "詞義比較", "口筆譯表達", "外文閱讀"],
      traits: ["喜歡語言細節", "對文化差異敏感", "願意反覆修正文句", "樂於與不同語境互動"],
    },
    {
      test: /(醫學|牙醫|藥學|公共衛生|健康照護|護理|呼吸治療|物理治療|職能治療|影像放射|語療聽力|視光)/,
      abilities: ["評估判斷", "臨床紀錄", "照護執行", "專業溝通", "流程遵循", "健康解讀"],
      traits: ["重視安全與責任", "面對人時能保持穩定", "願意精準執行步驟", "能接受長時間實作訓練"],
    },
    {
      test: /(生命科學|生物科技|生物資訊|生態|海洋科學|海洋資源|地球科學|大氣科學)/,
      abilities: ["研究觀察", "資料建檔", "樣本分析", "系統理解", "變因控制", "模型解讀"],
      traits: ["對自然系統好奇", "願意長期追蹤現象", "喜歡從資料找線索", "對變化敏感"],
    },
    {
      test: /(農藝|園藝|森林|植物保護|動物科學|獸醫|水產)/,
      abilities: ["田野觀察", "生長管理", "照護判讀", "農場紀錄", "生物監測", "實地操作"],
      traits: ["願意接觸戶外與現場", "對生物照護有耐心", "能接受季節與環境變化", "重視長期累積"],
    },
    {
      test: /(工業設計|商業設計|服裝設計|媒體設計|藝術設計|工藝|美術)/,
      abilities: ["造型發想", "版面編排", "視覺溝通", "作品提案", "媒材操作", "風格整合"],
      traits: ["對畫面與比例敏感", "願意多輪修整作品", "喜歡把概念做成成品", "能接受作品被討論"],
    },
    {
      test: /(表演藝術|音樂|舞蹈|戲劇)/,
      abilities: ["舞台表達", "節奏掌握", "排練整合", "角色詮釋", "展演執行", "觀眾感知"],
      traits: ["樂於在眾人前表達", "願意長時間排練", "對節奏和氛圍敏感", "能接受現場即時調整"],
    },
    {
      test: /(觀光|餐旅|休閒|運動管理|運動保健|體育)/,
      abilities: ["接待互動", "活動規劃", "現場帶領", "服務調度", "流程控場", "健康促進"],
      traits: ["喜歡高互動情境", "有現場應變力", "願意維持服務品質", "重視團隊默契與節奏"],
    },
  ];
  const matched = profiles.filter((item) => item.test.test(contextText));
  const seed = stableProfileHash(`${groupName}|${categoryName}`);
  const abilityPool = [...new Set([
    ...matched.flatMap((item) => item.abilities || []),
    ...generalAbilityPool,
  ])];
  const traitPool = [...new Set([
    ...matched.flatMap((item) => item.traits || []),
    ...generalTraitPool,
  ])];
  const abilityCount = curated.abilities?.length ? 2 : 4;
  const traitCount = curated.traits?.length ? 2 : 4;
  return {
    abilities: mergeProfileItems(curated.abilities, seededProfileItems(abilityPool, abilityCount + 2, seed), 4),
    traits: mergeProfileItems(curated.traits, seededProfileItems(traitPool, traitCount + 2, seed + 17), 4),
    sceneSummary: insight.coreCourses.slice(0, 3).join("、"),
  };
}

function stableProfileHash(value) {
  return [...String(value || "")].reduce((acc, char) => ((acc * 33) + char.charCodeAt(0)) % 2147483647, 7);
}

function compactProfileLabel(label) {
  const text = String(label || "").trim();
  if (!text) return "";
  const aliases = {
    "願意持續練習": "持續練習",
    "能接受修正": "接受修正",
    "對議題有好奇心": "關注議題",
    "願意整理脈絡": "整理脈絡",
    "喜歡動手嘗試": "動手嘗試",
    "能穩定投入": "穩定投入",
    "關心公共議題": "關注公共議題",
    "喜歡團隊討論": "團隊討論",
    "願意快速迭代": "快速迭代",
    "能接受回饋修稿": "接受修稿",
    "喜歡觀察受眾": "觀察受眾",
    "對新工具有好奇心": "熟悉新工具",
    "能長時間專注": "長時專注",
    "喜歡動手驗證": "動手驗證",
    "願意反覆測試": "反覆測試",
    "能面對複雜流程": "面對流程",
    "樂於修正模型": "修正模型",
    "對機制有興趣": "理解機制",
    "對空間敏感": "空間敏感",
    "喜歡反覆推敲": "反覆推敲",
    "在意細節": "在意細節",
    "能兼顧美感與實用": "兼顧美感",
    "願意長時間修圖改圖": "長時修圖",
    "對市場敏感": "市場敏感",
    "願意反覆比對資料": "比對資料",
    "能兼顧效率與細節": "兼顧效率",
    "喜歡從案例找規律": "案例找規律",
    "重視脈絡": "重視脈絡",
    "對制度敏感": "制度敏感",
    "願意聆聽": "願意聆聽",
    "能同理他人": "同理他人",
    "願意長時間陪伴議題": "陪伴議題",
    "對社會現象有感": "關注社會",
    "喜歡閱讀": "喜歡閱讀",
    "對文化差異敏感": "文化敏感",
    "願意反覆修稿": "反覆修稿",
    "在意文字細節": "文字細節",
    "喜歡梳理觀點": "梳理觀點",
    "重視責任感": "重視責任",
    "能穩定執行步驟": "穩定執行",
    "對生命議題敏感": "生命敏感",
    "願意長時間練習": "長時練習",
    "在意安全細節": "安全細節",
    "喜歡接近自然": "親近自然",
    "願意長期觀察": "長期觀察",
    "能接受戶外工作": "接受戶外",
    "在意環境變化": "在意環境",
    "對生物有耐心": "對生物耐心",
    "樂於表達自我": "表達自我",
    "能接受作品被修正": "接受修作",
    "對美感敏感": "美感敏感",
    "喜歡探索風格": "探索風格",
    "喜歡與人互動": "喜歡互動",
    "有行動力": "有行動力",
    "能適應現場變化": "適應現場",
    "願意長時間站場": "長時站場",
    "重視團隊默契": "團隊默契",
    "喜歡精確推理": "精確推理",
    "願意反覆驗算": "反覆驗算",
    "對模式敏感": "模式敏感",
    "能沉浸抽象思考": "抽象思考",
    "重視一致性": "重視一致",
    "喜歡從原理解題": "原理解題",
    "對誤差敏感": "誤差敏感",
    "願意長時間調校": "長時調校",
    "樂於拆解機制": "拆解機制",
    "重視測試結果": "重視測試",
    "喜歡看機構如何運作": "理解機構",
    "能耐心調整零件細節": "調整零件",
    "對動力系統有興趣": "動力興趣",
    "願意把圖面做準": "圖面做準",
    "對大型系統有耐心": "系統耐心",
    "重視穩定與安全": "穩定安全",
    "能處理多工協調": "多工協調",
    "願意看圖說與規範": "看圖規範",
    "喜歡比較材料差異": "比較材料",
    "對配方與變因敏感": "配方敏感",
    "願意細看實驗結果": "細看實驗",
    "重視操作條件": "重視操作",
    "會在意動線與尺度": "在意動線",
    "喜歡從使用者角度思考": "使用者思考",
    "能接受多輪改圖": "接受改圖",
    "對場域感受敏銳": "場域敏銳",
    "喜歡統整多方資訊": "統整資訊",
    "願意協調不同角色": "協調角色",
    "重視執行節奏": "執行節奏",
    "會主動推進任務": "主動推進",
    "看到數字會想驗證": "驗證數字",
    "喜歡比對制度差異": "制度比對",
    "重視風險與細節": "重視風險",
    "能長時間檢核資料": "檢核資料",
    "重視證據脈絡": "證據脈絡",
    "願意反覆推敲用詞": "推敲用詞",
    "對規範界線敏感": "規範敏感",
    "喜歡從案例拆解觀點": "拆解案例",
    "對公共事務有感": "關注公共",
    "會留意制度如何影響人": "制度影響",
    "願意讀規範文本": "閱讀規範",
    "喜歡整理立場差異": "整理立場",
    "能同理不同處境": "同理處境",
    "願意穩定陪伴": "穩定陪伴",
    "對情緒變化敏感": "情緒敏感",
    "尊重個別差異": "尊重差異",
    "喜歡陪人理解": "陪人理解",
    "願意拆解抽象概念": "拆解概念",
    "能觀察學習反應": "觀察學習",
    "重視節奏與回饋": "節奏回饋",
    "喜歡追問背景原因": "追問背景",
    "願意慢慢讀材料": "細讀材料",
    "重視概念精準": "概念精準",
    "對觀點差異有耐心": "觀點耐心",
    "喜歡語言細節": "語言細節",
    "樂於與不同語境互動": "語境互動",
    "重視安全與責任": "安全責任",
    "面對人時能保持穩定": "面對人穩定",
    "願意精準執行步驟": "精準執行",
    "能接受長時間實作訓練": "長時實作",
    "對自然系統好奇": "好奇自然",
    "願意長期追蹤現象": "追蹤現象",
    "喜歡從資料找線索": "資料找線索",
    "對變化敏感": "變化敏感",
    "願意接觸戶外與現場": "接觸現場",
    "對生物照護有耐心": "照護耐心",
    "能接受季節與環境變化": "接受變化",
    "重視長期累積": "長期累積",
    "對畫面與比例敏感": "畫面敏感",
    "願意多輪修整作品": "修整作品",
    "喜歡把概念做成成品": "概念成品",
    "能接受作品被討論": "接受討論",
    "樂於在眾人前表達": "眾前表達",
    "願意長時間排練": "長時排練",
    "對節奏和氛圍敏感": "節奏敏感",
    "能接受現場即時調整": "即時調整",
    "喜歡高互動情境": "高互動",
    "有現場應變力": "現場應變",
    "願意維持服務品質": "維持品質",
    "重視團隊默契與節奏": "團隊節奏",
    "跨域整合": "跨域整合",
    "問題分析": "問題分析",
    "資料判讀": "資料判讀",
    "口語表達": "口語表達",
    "企劃發想": "企劃發想",
    "閱讀整理": "閱讀整理",
    "專題統整": "專題統整",
    "現場應變": "現場應變",
    "寫作採編": "寫作採編",
    "內容企劃": "內容企劃",
    "受眾分析": "受眾分析",
    "媒體敘事": "媒體敘事",
    "社群經營": "社群經營",
    "影像製作": "影像製作",
    "品牌溝通": "品牌溝通",
    "議題包裝": "議題包裝",
    "邏輯分析": "邏輯分析",
    "系統拆解": "系統拆解",
    "程式設計": "程式設計",
    "資料處理": "資料處理",
    "模型思考": "模型思考",
    "介面規劃": "介面規劃",
    "除錯排查": "除錯排查",
    "抽象推理": "抽象推理",
    "數理分析": "數理分析",
    "系統整合": "系統整合",
    "結構拆解": "結構拆解",
    "實驗量測": "實驗量測",
    "工程設計": "工程設計",
    "工具操作": "工具操作",
    "專題實作": "專題實作",
    "流程驗證": "流程驗證",
    "空間想像": "空間想像",
    "圖面表達": "圖面表達",
    "設計提案": "設計提案",
    "材料判讀": "材料判讀",
    "使用者觀察": "使用者觀察",
    "模型製作": "模型製作",
    "場域分析": "場域分析",
    "數字判讀": "數字判讀",
    "決策分析": "決策分析",
    "商業簡報": "商業簡報",
    "資料整理": "資料整理",
    "市場觀察": "市場觀察",
    "策略規劃": "策略規劃",
    "風險評估": "風險評估",
    "商業溝通": "商業溝通",
    "論證分析": "論證分析",
    "資料閱讀": "資料閱讀",
    "人際理解": "人際理解",
    "文字表達": "文字表達",
    "訪談引導": "訪談引導",
    "制度判讀": "制度判讀",
    "案例整理": "案例整理",
    "議題討論": "議題討論",
    "文本分析": "文本分析",
    "語言表達": "語言表達",
    "跨文化理解": "跨文化理解",
    "口筆譯轉換": "口筆譯",
    "論述書寫": "論述書寫",
    "觀點整理": "觀點整理",
    "實驗操作": "實驗操作",
    "照護判斷": "照護判斷",
    "資料紀錄": "資料紀錄",
    "科學分析": "科學分析",
    "臨床觀察": "臨床觀察",
    "流程執行": "流程執行",
    "健康評估": "健康評估",
    "生態觀察": "生態觀察",
    "田野紀錄": "田野紀錄",
    "實驗管理": "實驗管理",
    "環境分析": "環境分析",
    "問題追蹤": "問題追蹤",
    "現地調查": "現地調查",
    "創意發想": "創意發想",
    "視覺表達": "視覺表達",
    "作品整合": "作品整合",
    "風格分析": "風格分析",
    "媒材操作": "媒材操作",
    "展演規劃": "展演規劃",
    "概念提案": "概念提案",
    "活動帶領": "活動帶領",
    "流程規劃": "流程規劃",
    "服務溝通": "服務溝通",
    "團隊協作": "團隊協作",
    "實務執行": "實務執行",
    "接待安排": "接待安排",
    "數據建模": "數據建模",
    "抽樣分析": "抽樣分析",
    "邏輯推演": "邏輯推演",
    "公式推導": "公式推導",
    "資料解釋": "資料解釋",
    "量化分析": "量化分析",
    "訊號分析": "訊號分析",
    "電路理解": "電路理解",
    "量測驗證": "量測驗證",
    "系統調校": "系統調校",
    "模組整合": "模組整合",
    "原理推導": "原理推導",
    "機構設計": "機構設計",
    "運動分析": "運動分析",
    "結構判讀": "結構判讀",
    "製圖建模": "製圖建模",
    "機件整合": "機件整合",
    "製程理解": "製程理解",
    "結構規劃": "結構規劃",
    "工程估算": "工程估算",
    "施工管理": "施工管理",
    "場域判讀": "場域判讀",
    "流程協調": "流程協調",
    "安全檢核": "安全檢核",
    "配方理解": "配方理解",
    "物性分析": "物性分析",
    "實驗設計": "實驗設計",
    "反應觀察": "反應觀察",
    "製程控制": "製程控制",
    "檢測紀錄": "檢測紀錄",
    "空間構想": "空間構想",
    "場景分析": "場景分析",
    "草圖發展": "草圖發展",
    "模型推敲": "模型推敲",
    "空間敘事": "空間敘事",
    "環境整合": "環境整合",
    "流程管理": "流程管理",
    "溝通協調": "溝通協調",
    "簡報提案": "簡報提案",
    "資源整合": "資源整合",
    "策略整理": "策略整理",
    "團隊分工": "團隊分工",
    "財報閱讀": "財報閱讀",
    "投資判讀": "投資判讀",
    "成本估算": "成本估算",
    "風險試算": "風險試算",
    "制度理解": "制度理解",
    "數字比較": "數字比較",
    "法條閱讀": "法條閱讀",
    "案例分析": "案例分析",
    "論證組織": "論證組織",
    "爭點整理": "爭點整理",
    "制度比較": "制度比較",
    "文字攻防": "文字攻防",
    "政策分析": "政策分析",
    "協商討論": "協商討論",
    "法規整理": "法規整理",
    "公共溝通": "公共溝通",
    "議題追蹤": "議題追蹤",
    "傾聽引導": "傾聽引導",
    "需求判讀": "需求判讀",
    "個案整理": "個案整理",
    "關係建立": "關係建立",
    "情境觀察": "情境觀察",
    "紀錄分析": "紀錄分析",
    "教學設計": "教學設計",
    "引導說明": "引導說明",
    "課程安排": "課程安排",
    "學習診斷": "學習診斷",
    "互動帶領": "互動帶領",
    "教材轉化": "教材轉化",
    "文本爬梳": "文本爬梳",
    "史料閱讀": "史料閱讀",
    "觀點比較": "觀點比較",
    "論述建構": "論述建構",
    "文獻整理": "文獻整理",
    "脈絡分析": "脈絡分析",
    "聽說讀寫": "聽說讀寫",
    "跨文化判讀": "文化判讀",
    "語境轉換": "語境轉換",
    "詞義比較": "詞義比較",
    "外文閱讀": "外文閱讀",
    "評估判斷": "評估判斷",
    "臨床紀錄": "臨床紀錄",
    "照護執行": "照護執行",
    "專業溝通": "專業溝通",
    "流程遵循": "流程遵循",
    "健康解讀": "健康解讀",
    "研究觀察": "研究觀察",
    "資料建檔": "資料建檔",
    "樣本分析": "樣本分析",
    "系統理解": "系統理解",
    "變因控制": "變因控制",
    "模型解讀": "模型解讀",
    "田野觀察": "田野觀察",
    "生長管理": "生長管理",
    "農場紀錄": "農場紀錄",
    "生物監測": "生物監測",
    "實地操作": "實地操作",
    "造型發想": "造型發想",
    "版面編排": "版面編排",
    "視覺溝通": "視覺溝通",
    "作品提案": "作品提案",
    "風格整合": "風格整合",
    "舞台表達": "舞台表達",
    "節奏掌握": "節奏掌握",
    "排練整合": "排練整合",
    "角色詮釋": "角色詮釋",
    "展演執行": "展演執行",
    "觀眾感知": "觀眾感知",
    "接待互動": "接待互動",
    "活動規劃": "活動規劃",
    "現場帶領": "現場帶領",
    "服務調度": "服務調度",
    "流程控場": "流程控場",
    "健康促進": "健康促進",
  };
  const compact = aliases[text] || text;
  const glyphs = [...compact];
  return glyphs.length <= 8 ? compact : glyphs.slice(0, 8).join("");
}

function seededProfileItems(pool, count, seed) {
  const items = [...new Set(pool || [])];
  if (!items.length) return [];
  const results = [];
  const start = Math.abs(seed) % items.length;
  for (let index = 0; index < items.length && results.length < count; index += 1) {
    results.push(items[(start + index) % items.length]);
  }
  return results;
}

function mergeProfileItems(primary, fallback, count) {
  return [...new Set([...(primary || []), ...(fallback || [])])].slice(0, count);
}

function renderCategoryCourseHighlights(insight) {
  const allCourses = [
    ...(insight.foundationCourses || []),
    ...(insight.coreCourses || []),
    ...(insight.appliedCourses || []),
  ];
  const uniqueCourses = [...new Set(allCourses)].slice(0, 10);
  return `
    <div class="explorer-course-cluster">
      ${uniqueCourses.map((item) => `<span class="course-chip">${escapeHtml(item)}</span>`).join("")}
    </div>
  `;
}

function explorerDepartmentListHtml() {
  const rows = getExplorerDepartmentRows();
  return `
    <div class="explorer-stage explorer-department-stage">
      <div class="explorer-detail-head">
        <div class="explorer-detail-copy">
          <p class="eyebrow">Department Explorer</p>
          <h3>${escapeHtml(explorerResultTitle())}</h3>
          <div class="explorer-detail-meta-row">
            <p>${fmt.format(rows.length)} 個相關校系｜點卡片可直接看詳細資料</p>
          </div>
        </div>
        <div class="explorer-head-actions">
          <button class="explorer-back-link" data-explorer-back-category>返回介紹</button>
          <button class="ghost-button" id="applyGroupToSearchButton">查詢工作台</button>
        </div>
      </div>
      <section class="explorer-toolbar">
        <label class="explorer-search compact wide">
          <span>校系搜尋</span>
          <input id="explorerKeywordInput" type="search" placeholder="學校、科系、學類" value="${escapeAttr(state.explorerKeyword)}">
        </label>
        <div class="explorer-toolbar-actions">
          <button class="ghost-button" id="clearExplorerKeywordButton">清除</button>
        </div>
      </section>
      ${rows.length ? `
        <div class="explorer-dept-grid">
          ${rows.map((row) => explorerDepartmentCard(row)).join("")}
        </div>
      ` : `<div class="empty-state">目前沒有可對應的校系資料。</div>`}
    </div>
  `;
}

function renderCourseGroup(title, courses) {
  return `
    <section class="course-group-card">
      <span class="section-tag">${escapeHtml(title)}</span>
      <div class="explorer-course-cluster">
        ${(courses || []).map((course) => `<span class="course-chip">${escapeHtml(course)}</span>`).join("")}
      </div>
    </section>
  `;
}

function groupSummaryLine(groupName, categories) {
  const names = categories.map((item) => displayCategoryName(item.name)).slice(0, 4).join("、");
  return `${groupName}常見的學類包含${names}，雖然同屬一個學群，但實際在學的課程與訓練方向仍有差異。`;
}

function getCategoryInsight(categoryName, groupName, rows = []) {
  const curated = state.categoryInsights?.[categoryName] || null;
  return curated ? normalizeInsight(curated) : inferCategoryInsight(categoryName, groupName, rows);
}

function normalizeInsight(source) {
  return {
    summary: source.summary || "這個學類整理中，會先用常見課程與代表校系協助辨識方向。",
    focusTitle: source.focusTitle || "這個學類在學什麼",
    focusDescription: source.focusDescription || source.summary || "",
    compareTitle: source.compareTitle || "和相近學類的差別",
    compareDescription: source.compareDescription || "可先透過核心課程與代表校系理解學類差異。",
    foundationCourses: source.foundationCourses || [],
    coreCourses: source.coreCourses || [],
    appliedCourses: source.appliedCourses || [],
  };
}

function inferCategoryInsight(categoryName, groupName, rows = []) {
  const name = displayCategoryName(categoryName);
  const base = {
    summary: `${name}通常會從基礎知識、核心方法與應用實作三個面向，帶學生理解這個領域的訓練方式。`,
    focusTitle: "這個學類在學什麼",
    focusDescription: `${name}會先建立基礎，再透過專業課程和實作訓練，讓學生知道這個領域如何解決問題。`,
    compareTitle: "和相近學類的差別",
    compareDescription: `可先看${name}常見課程，再和相近學類比較課名與訓練方向。`,
    foundationCourses: ["導論", "研究方法", "資料閱讀"],
    coreCourses: ["專題研討", "核心理論", "實務應用"],
    appliedCourses: ["專題製作", "實習", "跨域應用"],
  };
  const recipes = [
    {
      test: /(傳播|新聞|廣告|廣電|電影)/,
      data: {
        summary: `${name}重點在內容表達、媒體理解與實作訓練，常會結合寫作、企劃、影音或數位內容製作。`,
        focusDescription: `${name}不只是在看媒體，也會實際學採訪、企劃、影像敘事與受眾分析。`,
        compareDescription: "可先比較寫作導向、企劃導向或影音製作導向的課程差異。",
        foundationCourses: ["傳播學概論", "媒體識讀", "基礎寫作"],
        coreCourses: ["採訪寫作", "傳播理論", "影音製作", "廣告企劃", "新聞編採"],
        appliedCourses: ["專題報導", "社群內容製作", "品牌傳播", "影像敘事"],
      },
    },
    {
      test: /(資訊工程|資訊管理|資訊傳播|數據|統計|電機資訊)/,
      data: {
        summary: `${name}通常會結合程式、資料處理、系統設計或數位內容，重點在用科技方法解決問題。`,
        focusDescription: `${name}常見課程會讓學生同時接觸邏輯訓練、工具操作與實作專題。`,
        compareDescription: "可比較偏程式系統、偏管理應用，或偏媒體設計與互動內容的差別。",
        foundationCourses: ["程式設計", "微積分", "離散數學"],
        coreCourses: ["資料結構", "資料庫系統", "演算法", "系統分析", "使用者體驗設計"],
        appliedCourses: ["專題實作", "資料分析", "網頁與互動設計", "資訊系統開發"],
      },
    },
    {
      test: /(工程|機械|土木|材料|化學工程|生醫工程|建築)/,
      data: {
        summary: `${name}會把數理基礎轉成設計、分析與實作能力，重點在如何把理論應用到工程問題。`,
        focusDescription: `${name}常會從數學、物理與專業工具出發，再延伸到設計與專題。`,
        compareDescription: "可比較它偏向結構、設備、材料、空間設計或跨域整合哪一種訓練。",
        foundationCourses: ["微積分", "普通物理", "工程圖學"],
        coreCourses: ["工程力學", "材料學", "熱力學", "結構分析", "設計實作"],
        appliedCourses: ["工程專題", "電腦輔助設計", "系統整合", "實驗與量測"],
      },
    },
    {
      test: /(財務金融|會計|經濟|企業管理|國際企業|財稅)/,
      data: {
        summary: `${name}多半會從商業基礎、數據判讀與管理決策切入，幫學生理解企業或市場怎麼運作。`,
        focusDescription: `${name}會讓學生同時接觸商業理論、數量分析與實務案例。`,
        compareDescription: "可比較它偏財務分析、企業經營、國際市場或制度規範的差別。",
        foundationCourses: ["經濟學", "會計學", "統計學"],
        coreCourses: ["財務管理", "管理學", "投資學", "成本會計", "行銷管理"],
        appliedCourses: ["個案分析", "金融市場", "企業策略", "商業專題"],
      },
    },
    {
      test: /(法律|政治|行政|社會工作|心理)/,
      data: {
        summary: `${name}多半會從制度、行為與社會議題切入，讓學生理解人、組織與公共規則的關係。`,
        focusDescription: `${name}不只讀理論，也會透過案例、討論或田野實作理解真實情境。`,
        compareDescription: "可比較它偏制度分析、助人工作、心理理解或公共治理哪一種訓練。",
        foundationCourses: ["社會學", "心理學", "法學緒論"],
        coreCourses: ["行政學", "人格心理學", "諮商理論", "憲法", "社會政策"],
        appliedCourses: ["個案研討", "田野調查", "模擬法庭", "公共議題分析"],
      },
    },
    {
      test: /(醫學|護理|生命科學|生物科技|食品營養)/,
      data: {
        summary: `${name}通常會先建立生物與化學基礎，再延伸到人體、健康、生命系統或實驗操作。`,
        focusDescription: `${name}常見課程會把科學基礎和實驗、照護或應用能力結合在一起。`,
        compareDescription: "可比較它偏臨床照護、基礎研究、生命技術或健康應用的差別。",
        foundationCourses: ["普通生物", "普通化學", "人體解剖學"],
        coreCourses: ["生理學", "生物化學", "微生物學", "病理學", "營養學"],
        appliedCourses: ["實驗技術", "臨床技能", "照護實務", "專題研究"],
      },
    },
    {
      test: /(語文|中國語文|日語文|歐語文|英語文)/,
      data: {
        summary: `${name}會從語言能力、文本閱讀與文化理解切入，幫學生建立表達與分析能力。`,
        focusDescription: `${name}常見課程不只學語言本身，也會讀文學、文化與跨文化溝通。`,
        compareDescription: "可比較它偏文學研究、語言應用、翻譯或文化傳播哪一種方向。",
        foundationCourses: ["語言學概論", "閱讀與寫作", "文化導論"],
        coreCourses: ["文學概論", "翻譯", "語法分析", "跨文化溝通"],
        appliedCourses: ["口譯筆譯", "文本分析", "語言教學應用", "專題寫作"],
      },
    },
  ];
  const recipe = recipes.find((item) => item.test.test(categoryName));
  const merged = recipe ? { ...base, ...recipe.data } : base;
  if (rows.length && !merged.compareDescription.includes("校系")) {
    merged.compareDescription = `${merged.compareDescription} 目前這個學類整理到 ${fmt.format(rows.length)} 個相關校系，可再往下看實際科系差異。`;
  }
  return normalizeInsight(merged);
}

function bindExplorerEvents() {
  document.querySelectorAll("[data-open-group]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedGroup = button.dataset.openGroup;
      state.selectedExplorerStage = "group";
      state.selectedCategory = "";
      state.explorerKeyword = "";
      renderExplorer();
    });
  });
  document.querySelector("[data-explorer-back-overview]")?.addEventListener("click", () => {
    resetExplorerState("overview");
    renderExplorer();
  });
  document.querySelectorAll("[data-explorer-back-group]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedExplorerStage = "group";
      state.selectedCategory = "";
      state.explorerKeyword = "";
      renderExplorer();
    });
  });
  document.querySelector("[data-explorer-back-category]")?.addEventListener("click", () => {
    state.selectedExplorerStage = "category";
    state.explorerKeyword = "";
    renderExplorer();
  });
  document.querySelectorAll("[data-open-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedExplorerStage = "category";
      state.selectedCategory = button.dataset.openCategory || "";
      state.explorerKeyword = "";
      renderExplorer();
    });
  });
  document.querySelectorAll("[data-open-category-results]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedExplorerStage = "departments";
      state.explorerKeyword = "";
      renderExplorer();
    });
  });
  document.querySelectorAll("[data-explorer-channel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.explorerChannelSelection[button.dataset.explorerChannel] = button.dataset.channelKey || "";
      renderExplorer();
    });
  });
  document.getElementById("explorerKeywordInput")?.addEventListener("input", debounce(updateExplorerKeyword, 100));
  document.getElementById("clearExplorerKeywordButton")?.addEventListener("click", () => {
    state.explorerKeyword = "";
    renderExplorer();
  });
  document.getElementById("applyGroupToSearchButton")?.addEventListener("click", () => {
    state.linkedGroup = state.selectedGroup;
    state.linkedCategory = state.selectedCategory;
    setView("workbench");
    applyFilters();
  });
  document.querySelectorAll("[data-detail-card]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openDetail(card.dataset.detailCard);
    });
  });
}

function openDetail(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;
  const result = record.channelKey === "exam_distribution" ? distributionResult(record) : null;
  els.detailMeta.textContent = `${record.year} ${record.channel}`;
  els.detailTitle.textContent = `${record.schoolName} ${record.departmentName}`;
  els.detailBody.innerHTML = detailHtml(record, result);
  els.detailDrawer.classList.add("open");
  els.detailDrawer.setAttribute("aria-hidden", "false");
  els.detailBody.querySelector("[data-drawer-compare]")?.addEventListener("click", () => toggleCompare(record.id));
}

function closeDrawer() {
  els.detailDrawer.classList.remove("open");
  els.detailDrawer.setAttribute("aria-hidden", "true");
}

function detailHtml(record, result) {
  const weighted = record.weightedSubjects?.filter((item) => item.raw && item.raw !== "--" && item.raw !== "---") || [];
  const cac = record.cacDetail;
  return `
    <section class="detail-section">
      <button class="solid-button" data-drawer-compare>加入比較</button>
    </section>
    <section class="detail-section">
      <h3>基本資料</h3>
      <div class="detail-list">
        ${kv("年度", record.year)}
        ${kv("入學管道", record.channel)}
        ${kv("資料狀態", dataQualityStatusSummary(record))}
        ${kv("學校", record.schoolName)}
        ${kv("學系", record.departmentName)}
        ${kv("招生名額", record.quota || record.approvedQuota || "--")}
      </div>
      <div class="detail-status-row">${dataQualityStatusPillHtml(record)}</div>
    </section>
    ${summaryDetailHtml(record)}
    ${starAdmissionResultHtml(record)}
    ${record.channelKey === "personal_application" && cac ? personalApplicationThresholdHtml(record, cac) : ""}
    ${applySieveResultHtml(record)}
    ${applySieveReviewHtml(record)}
    ${cac ? cacDetailHtml(record, cac) : ""}
    ${weighted.length && record.channelKey !== "exam_distribution" ? `
      <section class="detail-section">
        <h3>採計與同分參酌</h3>
        <div class="detail-list">
          ${weighted.map((item) => kv(item.tie_break_order ? `順序 ${item.tie_break_order}` : "採計", item.raw)).join("")}
        </div>
      </section>
    ` : ""}
    ${result ? `
      <section class="detail-section">
        <h3>114 分發結果</h3>
        <div class="detail-list">
          ${kv("錄取人數", result.admittedCount || "--")}
          ${kv("普通生最低錄取總分", result.regularTotalScore || result.regularMinScore || "--")}
          ${kv("同分參酌", result.regularTieBreak || "--")}
        </div>
        ${distributionWeightsHtml(record)}
      </section>
    ` : ""}
    ${record.selectionNotes ? `
      <section class="detail-section">
        <h3>選系說明</h3>
        <p>${escapeHtml(record.selectionNotes)}</p>
      </section>
    ` : ""}
    <section class="detail-section">
      <h3>來源</h3>
      <a href="${escapeAttr(record.sourceUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(record.sourceOrganization || record.sourceUrl)}</a>
    </section>
  `;
}

function starAdmissionResultHtml(record) {
  const result = record.starAdmissionResult;
  if (record.channelKey !== "star_recommendation" || !result) return "";
  const isEight = result.standardType === "eight";
  const title = isEight ? "繁星第八類篩選標準" : "繁星錄取標準";
  const totalLabel = isEight ? "通過篩選人數" : "錄取人數";
  const standardLabel = isEight ? "比序篩選標準" : "分發比序標準";
  return `
    <section class="detail-section">
      <h3>${title}</h3>
      <div class="detail-list">
        ${kv(totalLabel, result.totalCount || "--")}
        ${hasDisplayValue(result.firstRoundCount) ? kv("第一輪人數", result.firstRoundCount) : ""}
        ${hasDisplayValue(result.secondRoundCount) ? kv("第二輪人數", result.secondRoundCount) : ""}
        ${result.testRequirements?.length ? kv("五標門檻", formatStarPdfRequirements(record.year, result.testRequirements)) : ""}
        ${result.distributionStandards?.length ? kv(standardLabel, formatStarDistributionStandards(result.distributionStandards)) : ""}
        ${result.artExamRequirements?.length ? kv("術科檢定", formatStarPdfRequirements(record.year, result.artExamRequirements)) : ""}
      </div>
    </section>
  `;
}

function hasDisplayValue(value) {
  const text = String(value || "").trim();
  return Boolean(text && text !== "--");
}

function formatStarDistributionStandards(items) {
  const first = [];
  const second = [];
  (items || []).forEach((item) => {
    const label = compactStarDistributionItem(item.item);
    if (hasDisplayValue(item.firstRoundStandard)) first.push(`${label} ${item.firstRoundStandard}`);
    if (hasDisplayValue(item.secondRoundStandard)) second.push(`${label} ${item.secondRoundStandard}`);
  });
  return [
    `一階：${first.join("、") || "從缺"}`,
    `二階：${second.join("、") || "從缺"}`,
  ].join("\n");
}

function formatStarPdfRequirements(year, items) {
  return (items || [])
    .filter((item) => item.standard || item.score)
    .map((item) => {
      return formatStarRequirement(year, item);
    })
    .join("、");
}

function summaryDetailHtml(record) {
  const rows = [];
  if (record.channelKey === "exam_distribution") {
    if (record.testRequirementStandard) rows.push(kv("學測/英聽門檻", record.testRequirementStandard));
    if (record.weightedSubjectsText) rows.push(kv("採計科目", record.weightedSubjectsText));
  } else {
    if (record.expectedSecondStageCount) rows.push(kv("甄試人數", record.expectedSecondStageCount));
    if (record.screeningDate) rows.push(kv("甄試日期", record.screeningDate));
    if (record.examRequired) rows.push(kv("術科", record.examRequired));
    const category = record.starGroup || record.category;
    if (category && category !== "一般") rows.push(kv("學群/類別", category));
  }
  if (!rows.length) return "";
  return `
    <section class="detail-section">
      <h3>管道摘要</h3>
      <div class="detail-list">
        ${rows.join("")}
      </div>
    </section>
  `;
}

function applySieveResultHtml(record) {
  const result = record.applySieveResult;
  const correctedRankedItems = applySieveRankedItems(record);
  const sieveResultStandard = String(result?.sieveResultStandard || "")
    .split("、")
    .filter((item) => !/^(國文|英文|數學A|數學B|數A|數B|社會|自然|英聽)\s*\d{2,}$/.test(item.trim()))
    .join("、");
  const sieveResultItems = (result?.sieveResultItems || []).filter((item) => !((item.subjects || []).length === 1 && Number(item.score) > 15));
  if (record.channelKey !== "personal_application" || (!sieveResultStandard && !correctedRankedItems.length)) return "";
  const rankedItems = formatRankedSieveItems(correctedRankedItems);
  const missingRankedItems = formatMissingRankedSieveItems(correctedRankedItems);
  const parsedItems = correctedRankedItems.length ? "" : formatSieveResultItems(sieveResultItems);
  const thresholds = applicationThresholdParts(record, coveredSubjectsFromResult(result, record)).map((part) => part.text).join("、");
  return `
    <section class="detail-section">
      <h3>第一階段篩選結果</h3>
      <div class="detail-list">
        ${rankedItems ? kv("篩選順位", rankedItems) : kv("通過篩選最低級分", sieveResultStandard)}
        ${missingRankedItems ? kv("官方未列分數", missingRankedItems) : ""}
        ${parsedItems ? kv("系統解讀", parsedItems) : ""}
        ${thresholds ? kv("檢定標準", thresholds) : ""}
      </div>
    </section>
  `;
}

function applySieveReviewHtml(record) {
  const review = record.applySieveReview;
  if (record.channelKey !== "personal_application" || applySieveRankedItems(record).length || !review?.label) return "";
  const thresholds = applicationThresholdParts(record).map((part) => part.text).join("、");
  const status = personalApplicationNoResultLabel(record);
  return `
    <section class="detail-section">
      <h3>第一階段篩選結果</h3>
      <div class="detail-list">
        ${kv("資料狀態", status)}
        ${thresholds ? kv("檢定標準", thresholds) : ""}
        ${review.raw ? kv("OCR 原文", review.raw) : ""}
      </div>
    </section>
  `;
}

function formatRankedSieveItems(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return items.filter((item) => item.score).map((item) => {
    const subjects = (item.subjects || []).map(shortSubject).join("+");
    if (!subjects) return "";
    return formatSubjectScore(subjects, item.score);
  }).filter(Boolean).join("；");
}

function formatMissingRankedSieveItems(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return items.filter((item) => !item.score).map((item) => {
    const subjects = (item.subjects || []).map(shortSubject).join("+");
    return subjects || "";
  }).filter(Boolean).join("；");
}

function formatSieveResultItems(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return items.map((item) => {
    if (item.type === "combined" && item.subjects?.length) {
      return `${item.subjects.join("+")} 合計 ${item.score}`;
    }
    if (item.type === "single" && item.subjects?.length) {
      return `${item.subjects[0]} ${item.score}`;
    }
    return item.label || "";
  }).filter(Boolean).join("；");
}

function cacDetailHtml(record, cac) {
  if (record.channelKey === "star_recommendation") {
    const rank = record.starRankStandard?.academicRankPercentileStandard;
    return `
      <section class="detail-section">
        <h3>繁星檢定與比序</h3>
        <div class="detail-list">
          ${rank ? kv("在校學業成績全校排名百分比標準", rank) : kv("在校排名百分比標準", "目前未取得此年度附件資料")}
          ${cac.testRequirements?.length ? kv("學測/英聽檢定", cac.testRequirements.map((item) => formatRequirementWithStandard(record.year, item.subject, item.standard)).filter(Boolean).join("、")) : ""}
          ${cac.distributionOrder?.length ? kv("分發比序項目", cac.distributionOrder.join("\n")) : ""}
        </div>
      </section>
      ${cac.notes ? `
        <section class="detail-section">
          <h3>備註</h3>
          <p>${escapeHtml(cac.notes)}</p>
        </section>
      ` : ""}
    `;
  }

  if (record.channelKey === "personal_application") {
    return `
      <section class="detail-section">
        <h3>第二階段採計</h3>
        <div class="detail-list">
          ${cac.secondStageItems?.length ? cac.secondStageItems.map((item) => (
            kv(item.item, [
              item.standard && item.standard !== "--" ? item.standard : "",
              item.percentage ? `佔比 ${item.percentage}` : "",
            ].filter(Boolean).join("，") || "--")
          )).join("") : kv("資料", "--")}
          ${cac.sameScoreOrder?.length ? kv("同分參酌", cac.sameScoreOrder.join("\n")) : ""}
        </div>
      </section>
      ${(cac.reviewItems || cac.reviewDescription || cac.interviewOrTestDescription || cac.overEnrollmentScreening) ? `
        <section class="detail-section">
          <h3>甄試與審查說明</h3>
          <div class="detail-list">
            ${cac.reviewItems ? kv("審查項目", cac.reviewItems) : ""}
            ${cac.reviewDescription ? kv("審查說明", cac.reviewDescription) : ""}
            ${cac.interviewOrTestDescription ? kv("甄試說明", cac.interviewOrTestDescription) : ""}
            ${cac.overEnrollmentScreening ? kv("超額篩選", cac.overEnrollmentScreening) : ""}
          </div>
        </section>
      ` : ""}
    `;
  }
  return "";
}

function personalApplicationThresholdHtml(record, cac) {
  if (!cac?.screeningSubjects?.length) return "";
  return `
    <section class="detail-section">
      <h3>學測申請門檻</h3>
      <div class="detail-list compact-list">
        ${cac.screeningSubjects.map((item) => (
          singleLine([
            item.standard ? formatApplicationThresholdWithStandard(record.year, item.subject, item.standard) : "",
            item.screening_multiplier ? `篩選倍率 ${item.screening_multiplier}倍` : "",
            item.score_weight ? `採計 ${item.score_weight}` : "",
          ].filter(Boolean).join("，") || "--")
        )).join("")}
      </div>
    </section>
  `;
}

function kv(label, value) {
  return `<div class="kv"><span>${escapeHtml(label)}</span><span>${escapeHtml(value ?? "")}</span></div>`;
}

function singleLine(value) {
  return `<div class="kv single"><span>${escapeHtml(value ?? "")}</span></div>`;
}

function toggleCompare(id) {
  const exists = state.compare.some((item) => item.id === id);
  if (exists) {
    state.compare = state.compare.filter((item) => item.id !== id);
  } else {
    const record = state.records.find((item) => item.id === id);
    if (record && state.compare.length < 8) state.compare.push(record);
  }
  renderCompare();
  renderTable();
}

function renderCompare() {
  const clearButton = document.getElementById("clearCompareButton");
  if (clearButton) clearButton.hidden = !state.compare.length;
  if (!state.compare.length) {
    els.compareGrid.innerHTML = `
      <div class="empty-state compare-empty-state">
        <h3>尚未加入校系</h3>
        <p>先選一種入學管道開始查詢，將想比較的校系加入清單。</p>
        <div class="compare-empty-actions">
          <button class="ghost-button" data-compare-channel="personal_application">個人申請</button>
          <button class="ghost-button" data-compare-channel="star_recommendation">繁星推薦</button>
          <button class="ghost-button" data-compare-channel="exam_distribution">分發入學</button>
        </div>
        <div class="compare-empty-actions">
          <button class="solid-button" data-compare-empty-action="placement">進行落點分析</button>
          <button class="ghost-button" data-compare-empty-action="explorer">探索十八學群</button>
        </div>
      </div>`;
    els.compareGrid.querySelectorAll("[data-compare-channel]").forEach((button) => {
      button.addEventListener("click", () => {
        state.filters.channel = button.dataset.compareChannel;
        state.filters.keyword = "";
        state.linkedGroup = "";
        state.linkedCategory = "";
        els.channelFilter.value = state.filters.channel;
        els.keywordInput.value = "";
        setView("workbench");
        applyFilters();
      });
    });
    els.compareGrid.querySelectorAll("[data-compare-empty-action]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.compareEmptyAction === "explorer") {
          resetExplorerState("overview");
          setView("explorer");
          renderExplorer();
          return;
        }
        setView("placement");
        renderPlacementAnalysis();
      });
    });
    return;
  }
  els.compareGrid.innerHTML = state.compare.map((record) => {
    const result = record.channelKey === "exam_distribution" ? distributionResult(record) : null;
    return `
      <article class="compare-card">
        <header>
          <div>
            ${channelPill(record)}
            <h3>${escapeHtml(record.schoolName)}</h3>
            <p>${escapeHtml(record.departmentName)}</p>
          </div>
          <button class="icon-button" data-remove-compare="${escapeAttr(record.id)}" aria-label="移除">×</button>
        </header>
        ${kv("招生名額", record.quota || "--")}
        ${kv("篩選標準", getHighlight(record) || "--")}
        ${kv("採計科目", record.weightedSubjectsText || "--")}
        ${kv("甄試日期", record.screeningDate || "--")}
        ${kv("最低錄取總分", result?.regularTotalScore || result?.regularMinScore || "--")}
      </article>
    `;
  }).join("");
  els.compareGrid.querySelectorAll("[data-remove-compare]").forEach((button) => {
    button.addEventListener("click", () => toggleCompare(button.dataset.removeCompare));
  });
}

function renderQualityReport() {
  if (!els.qualityReportRoot) return;
  const report = state.qualityReport;
  if (!report) {
    els.qualityReportRoot.innerHTML = `<div class="empty-state">資料檢查報告尚未載入</div>`;
    return;
  }
  const anomalies = report.anomalies || [];
  const highRisk = anomalies.filter((item) => item.risk === "high").slice(0, 12);
  const missing = (report.missingOfficialResults || []).slice(0, 24);
  const reviewQueue = (report.reviewQueue || []).slice(0, 18);
  const coverage = (report.coverageBySchool || []).slice(0, 12);
  const mixedPublicFundSchools = (report.mixedPublicFundSchools || []).slice(0, 8);
  els.qualityReportRoot.innerHTML = `
    <section class="quality-hero">
      <div>
        <span class="section-tag">Data Quality</span>
        <h3>114 個申補強狀態</h3>
      </div>
      <div class="quality-hero-note">
        OCR 異常採同校、同層級與同科目數比較，不使用「低於某分就是錯」的單一規則。
      </div>
    </section>
    ${qualityReportSummaryHtml(report)}
    <section class="quality-panel quality-rules-panel">
      <div class="quality-panel-head">
        <div>
          <h3>判讀規則</h3>
          <p>先看資料結構，再用學校脈絡判斷分數是否合理。</p>
        </div>
      </div>
      <div class="quality-rule-list">
        ${(report.qualityRules || []).map((rule) => `<span>${escapeHtml(rule)}</span>`).join("")}
      </div>
    </section>
    <section class="quality-panel">
      <div class="quality-panel-head">
        <div>
          <h3>優先覆核隊列</h3>
          <p>把高風險 OCR 與待補正式結果排成同一條處理順序。</p>
        </div>
      </div>
      <div class="quality-review-queue">
        ${reviewQueue.map(qualityReviewQueueHtml).join("")}
      </div>
    </section>
    <section class="quality-panel">
      <div class="quality-panel-head">
        <div>
          <h3>混合型公費生學校</h3>
          <p>同校公費生同時出現「有分數」與「官方空白」，最適合優先看圖釐清。</p>
        </div>
        <strong>${fmt.format(report.mixedPublicFundSchools?.length || 0)}</strong>
      </div>
      <div class="quality-anomaly-list">
        ${mixedPublicFundSchools.map(qualityMixedPublicFundSchoolHtml).join("") || `<div class="empty-state">目前沒有混合型公費生學校</div>`}
      </div>
    </section>
    <section class="quality-layout">
      <div class="quality-panel">
        <div class="quality-panel-head">
          <div>
            <h3>高風險 OCR 異常</h3>
            <p>優先處理合計分數錯位、同校落差過大的紀錄。</p>
          </div>
          <strong>${fmt.format(highRisk.length)} / ${fmt.format(anomalies.length)}</strong>
        </div>
        <div class="quality-anomaly-list">
          ${highRisk.map(qualityAnomalyCardHtml).join("") || `<div class="empty-state">目前沒有高風險異常</div>`}
        </div>
      </div>
      <div class="quality-panel">
        <div class="quality-panel-head">
          <div>
            <h3>待補官方結果</h3>
            <p>未接入正式篩選順位，暫不應拿來做錄取分數判讀。</p>
          </div>
          <strong>${fmt.format(report.summary?.missingOfficialResultCount || 0)}</strong>
        </div>
        <div class="quality-missing-list">
          ${missing.map(qualityMissingRowHtml).join("")}
        </div>
      </div>
    </section>
    <section class="quality-panel">
      <div class="quality-panel-head">
        <div>
          <h3>校別接入率最低</h3>
          <p>適合安排下一批官方圖檔 OCR 或人工覆核。</p>
        </div>
      </div>
      <div class="quality-coverage-table">
        ${coverage.map(qualityCoverageRowHtml).join("")}
      </div>
    </section>
  `;
}

function qualityReportSummaryHtml(report) {
  const summary = report.summary || {};
  const rate = Math.round((summary.officialResultCoverageRate || 0) * 1000) / 10;
  const cards = [
    ["資料總數", `${fmt.format(summary.totalRecords || 0)} 筆`, "114 個人申請"],
    ["官方順位接入", `${fmt.format(summary.officialResultCount || 0)} 筆`, `${rate}%`],
    ["待補官方結果", `${fmt.format(summary.missingOfficialResultCount || 0)} 筆`, "需再補正式篩選結果"],
    ["高風險 OCR", `${fmt.format(summary.highRiskCount || 0)} 筆`, "優先覆核"],
  ];
  return `
    <section class="quality-summary-grid">
      ${cards.map(([label, value, note]) => `
        <article class="quality-summary-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
          <em>${escapeHtml(note)}</em>
        </article>
      `).join("")}
    </section>
  `;
}

function qualityAnomalyCardHtml(item) {
  const correction = item.manualCorrectionApplied ? `<span class="quality-correction">已套用人工修正</span>` : "";
  const contextLabel = item.context?.basis === "same_school" ? "同校比較" : item.context?.basis === "tier" ? "同層級比較" : "人工確認";
  const context = item.context?.median
    ? `${contextLabel}中位數 ${item.context.median}，目前 ${item.rawScore}`
    : contextLabel;
  return `
    <article class="quality-anomaly-card ${item.risk === "high" ? "is-high" : ""}">
      <div class="quality-card-title">
        <div>
          <strong>${escapeHtml(item.schoolName)}</strong>
          <span>${escapeHtml(item.departmentName)}</span>
        </div>
        <em>${escapeHtml(item.programCode || "")}</em>
      </div>
      <div class="quality-score-line">
        <span>${escapeHtml((item.subjects || []).join("+"))} ${escapeHtml(item.rawScore)}</span>
        ${correction}
        <span class="quality-action-tag">${escapeHtml(item.reviewAction || "先看官方圖")}</span>
      </div>
      <p>${escapeHtml(item.reason)}</p>
      <small>${escapeHtml(context)}</small>
      <div class="quality-card-links">
        ${item.sourceImageUrl ? `<a href="${escapeAttr(item.sourceImageUrl)}" target="_blank" rel="noreferrer">官方圖</a>` : ""}
        ${item.sourceUrl ? `<a href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noreferrer">校系列表</a>` : ""}
        ${item.detailUrl ? `<a href="${escapeAttr(item.detailUrl)}" target="_blank" rel="noreferrer">分則頁</a>` : ""}
      </div>
    </article>
  `;
}

function qualityMissingRowHtml(item) {
  return `
    <article class="quality-missing-row">
      <div>
        <strong>${escapeHtml(item.schoolName)}</strong>
        <span>${escapeHtml(item.departmentName)}</span>
      </div>
      <div class="quality-missing-meta">
        <em>${escapeHtml(item.programCode || "")}</em>
        <span class="quality-action-tag neutral">${escapeHtml(item.reviewAction || "補正式結果")}</span>
      </div>
    </article>
  `;
}

function qualityCoverageRowHtml(item) {
  const rate = Math.round((item.officialResultCoverageRate || 0) * 1000) / 10;
  return `
    <article class="quality-coverage-row">
      <div>
        <strong>${escapeHtml(item.schoolName)}</strong>
        <span>${fmt.format(item.officialResultCount)} / ${fmt.format(item.total)} 筆</span>
      </div>
      <div class="quality-rate-bar" aria-label="接入率 ${rate}%">
        <span style="width:${Math.max(4, rate)}%"></span>
      </div>
      <em>${rate}%</em>
    </article>
  `;
}

function qualityReviewQueueHtml(item) {
  const kindLabel = item.kind === "anomaly" ? "OCR" : "缺漏";
  const links = [
    item.sourceImageUrl ? `<a href="${escapeAttr(item.sourceImageUrl)}" target="_blank" rel="noreferrer">官方圖</a>` : "",
    item.sourceUrl ? `<a href="${escapeAttr(item.sourceUrl)}" target="_blank" rel="noreferrer">來源</a>` : "",
  ].filter(Boolean).join("");
  return `
    <article class="quality-queue-item ${item.kind === "anomaly" ? "is-anomaly" : "is-missing"}">
      <div class="quality-queue-top">
        <div>
          <strong>${escapeHtml(item.schoolName)}</strong>
          <span>${escapeHtml(item.departmentName)}</span>
        </div>
        <em>${escapeHtml(kindLabel)} ${escapeHtml(item.programCode || "")}</em>
      </div>
      <p>${escapeHtml(item.summary || item.reason || item.reviewAction || "")}</p>
      <div class="quality-queue-foot">
        <span class="quality-action-tag ${item.kind === "anomaly" ? "" : "neutral"}">${escapeHtml(item.reviewAction || "")}</span>
        <div class="quality-inline-links">${links}</div>
      </div>
    </article>
  `;
}

function qualityMixedPublicFundSchoolHtml(item) {
  const blankRows = (item.blankRows || []).map((row) => `${row.departmentName} ${row.programCode}`).join("、");
  const withDataRows = (item.withDataRows || []).map((row) => {
    const detail = row.highlight ? ` ${row.highlight}` : "";
    return `${row.departmentName} ${row.programCode}${detail}`;
  }).join("、");
  return `
    <article class="quality-anomaly-card">
      <div class="quality-card-title">
        <div>
          <strong>${escapeHtml(item.schoolName)}</strong>
          <span>公費生混合狀態</span>
        </div>
        <em>${escapeHtml(item.schoolCode || "")}</em>
      </div>
      <div class="quality-score-line">
        <span>空白 ${fmt.format(item.blankCount)} 筆</span>
        <span class="quality-action-tag neutral">有資料 ${fmt.format(item.withDataCount)} 筆</span>
      </div>
      <p><strong>待確認：</strong>${escapeHtml(blankRows || "--")}</p>
      <small><strong>已有資料：</strong>${escapeHtml(withDataRows || "--")}</small>
      <div class="quality-card-links">
        <a href="./public-fund-review.html?school=${escapeAttr(item.schoolCode || "")}" target="_blank" rel="noreferrer">進入覆核</a>
        <a href="https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/${escapeAttr(item.schoolCode || "")}.png" target="_blank" rel="noreferrer">官方圖</a>
      </div>
    </article>
  `;
}

function renderSources() {
  const datasets = state.manifest?.datasets || [];
  els.sourceList.innerHTML = datasets.map((item) => `
    <article class="source-card">
      <h3>${item.year} ${escapeHtml(item.channel)}</h3>
      <div class="kv"><span>筆數</span><span>${fmt.format(item.count)}</span></div>
      <div class="kv"><span>資料層級</span><span>招生規則與校系索引</span></div>
    </article>
  `).join("") + `
    <article class="source-card">
      <h3>114、115 分發結果</h3>
      <div class="kv"><span>筆數</span><span>${fmt.format(Object.keys(state.results).length)}</span></div>
      <div class="kv"><span>資料層級</span><span>最低錄取標準與錄取人數</span></div>
    </article>
  `;
}

function recordSearchText(record) {
  return normalize([
    record.year,
    record.channel,
    record.programCode,
    record.schoolName,
    record.departmentName,
    record.quota,
    record.category,
    record.starGroup,
    record.testRequirementStandard,
    record.applySieveResult?.sieveResultStandard,
    record.applySieveResult?.sieveResultRaw,
    record.weightedSubjectsText,
    record.selectionNotes,
    Object.values(record.rawFields || {}).join(" "),
  ].join(" "));
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[（）]/g, (char) => (char === "（" ? "(" : ")"));
}

function splitSchoolDepartmentName(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(.+?(?:大學|學院))(.*)$/);
  if (!match) return { schoolName: "", departmentName: text };
  return {
    schoolName: match[1].trim(),
    departmentName: match[2].trim(),
  };
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] || 0) + 1;
    return acc;
  }, {});
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
