const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const recordsPath = path.join(root, "site", "data", "admissions_records.json");
const outputPath = path.join(root, "site", "data", "apply114_quality_report.json");

const TOP_SCHOOL_NAMES = [
  "\u570b\u7acb\u81fa\u7063\u5927\u5b78",
  "\u570b\u7acb\u653f\u6cbb\u5927\u5b78",
  "\u570b\u7acb\u6e05\u83ef\u5927\u5b78",
  "\u570b\u7acb\u967d\u660e\u4ea4\u901a\u5927\u5b78",
  "\u570b\u7acb\u6210\u529f\u5927\u5b78",
];

const SPECIAL_SCHOOL_ORDER = new Map(TOP_SCHOOL_NAMES.map((name, index) => [name, index]));

const MANUAL_CORRECTIONS = [
  {
    recordId: "114-personal_application-099012-114_apply",
    programCode: "099012",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u6cd5\u5f8b\u5b78\u7cfb\u6cd5\u5b78\u7d44",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578B\u793e 49\uff0c\u539f\u59cb\u8cc7\u6599\u8aa4\u8b80\u70ba 12\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "49", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 49" },
      { rank: 2, subjects: ["\u6578B"], score: "10", label: "\u6578B 10" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "12", label: "\u82f1\u6587 12" },
      { rank: 4, subjects: ["\u570b\u6587"], score: "13", label: "\u570b\u6587 13" },
    ],
  },
  {
    recordId: "114-personal_application-099022-114_apply",
    programCode: "099022",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u6cd5\u5f8b\u5b78\u7cfb\u6cd5\u5b78\u7d44(\u98db\u9cf6\u7d44)",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578B\u793e 46\uff0c\u7b2c\u56db\u9806\u4f4d\u61c9\u88dc\u4e0a\u570b\u6587 13\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "46", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 46" },
      { rank: 2, subjects: ["\u6578B"], score: "7", label: "\u6578B 7" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "11", label: "\u82f1\u6587 11" },
      { rank: 4, subjects: ["\u570b\u6587"], score: "13", label: "\u570b\u6587 13" },
    ],
  },
  {
    recordId: "114-personal_application-099032-114_apply",
    programCode: "099032",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u6cd5\u5f8b\u5b78\u7cfb\u53f8\u6cd5\u7d44",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578B\u793e 51\uff0c\u7b2c\u56db\u9806\u4f4d\u61c9\u88dc\u4e0a\u570b\u6587 13\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "51", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 51" },
      { rank: 2, subjects: ["\u6578B"], score: "10", label: "\u6578B 10" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "12", label: "\u82f1\u6587 12" },
      { rank: 4, subjects: ["\u570b\u6587"], score: "13", label: "\u570b\u6587 13" },
    ],
  },
  {
    recordId: "114-personal_application-099042-114_apply",
    programCode: "099042",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u6cd5\u5f8b\u5b78\u7cfb\u53f8\u6cd5\u7d44(\u98db\u9cf6\u7d44)",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578B\u793e 47\uff0c\u7b2c\u56db\u9806\u4f4d\u61c9\u88dc\u4e0a\u570b\u6587 13\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "47", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 47" },
      { rank: 2, subjects: ["\u6578B"], score: "7", label: "\u6578B 7" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "12", label: "\u82f1\u6587 12" },
      { rank: 4, subjects: ["\u570b\u6587"], score: "13", label: "\u570b\u6587 13" },
    ],
  },
  {
    recordId: "114-personal_application-099052-114_apply",
    programCode: "099052",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u6cd5\u5f8b\u5b78\u7cfb\u8ca1\u7d93\u6cd5\u7d44",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578B\u793e 52\uff0c\u7b2c\u4e8c\u9806\u4f4d\u61c9\u70ba\u6578B 11\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "52", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 52" },
      { rank: 2, subjects: ["\u6578B"], score: "11", label: "\u6578B 11" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "13", label: "\u82f1\u6587 13" },
      { rank: 4, subjects: ["\u570b\u6587"], score: "13", label: "\u570b\u6587 13" },
    ],
  },
  {
    recordId: "114-personal_application-099062-114_apply",
    programCode: "099062",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u6cd5\u5f8b\u5b78\u7cfb\u8ca1\u7d93\u6cd5\u7d44(\u98db\u9cf6\u7d44)",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578B\u793e 44\uff0c\u7b2c\u56db\u9806\u4f4d\u61c9\u88dc\u4e0a\u570b\u6587 14\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "44", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 44" },
      { rank: 2, subjects: ["\u6578B"], score: "6", label: "\u6578B 6" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "11", label: "\u82f1\u6587 11" },
      { rank: 4, subjects: ["\u570b\u6587"], score: "14", label: "\u570b\u6587 14" },
    ],
  },
  {
    recordId: "114-personal_application-099112-114_apply",
    programCode: "099112",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u6703\u8a08\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578A\u793e 43\uff0c\u7b2c\u4e8c\u9806\u4f4d\u61c9\u88dc\u4e0a\u6578A 8\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u793e\u6703"], score: "43", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u793e\u6703 43" },
      { rank: 2, subjects: ["\u6578A"], score: "8", label: "\u6578A 8" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "12", label: "\u82f1\u6587 12" },
    ],
  },
  {
    recordId: "114-personal_application-099122-114_apply",
    programCode: "099122",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u6703\u8a08\u5b78\u7cfb(\u98db\u9cf6\u7d44)",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578A\u793e 40\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u793e\u6703"], score: "40", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u793e\u6703 40" },
      { rank: 2, subjects: ["\u6578A"], score: "6", label: "\u6578A 6" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "10", label: "\u82f1\u6587 10" },
    ],
  },
  {
    recordId: "114-personal_application-099192-114_apply",
    programCode: "099192",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u8ca1\u653f\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578A\u793e 42\uff0c\u7b2c\u4e8c\u9806\u4f4d\u61c9\u88dc\u4e0a\u6578A 8\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u793e\u6703"], score: "42", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u793e\u6703 42" },
      { rank: 2, subjects: ["\u6578A"], score: "8", label: "\u6578A 8" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "12", label: "\u82f1\u6587 12" },
    ],
  },
  {
    recordId: "114-personal_application-099202-114_apply",
    programCode: "099202",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u8ca1\u653f\u5b78\u7cfb(\u98db\u9cf6\u7d44)",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578A\u793e 42\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u793e\u6703"], score: "42", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u793e\u6703 42" },
      { rank: 2, subjects: ["\u6578A"], score: "6", label: "\u6578A 6" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "12", label: "\u82f1\u6587 12" },
    ],
  },
  {
    recordId: "114-personal_application-099322-114_apply",
    programCode: "099322",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u61c9\u7528\u5916\u8a9e\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578B\u793e 42\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "42", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 42" },
      { rank: 2, subjects: ["\u82f1\u6587"], score: "13", label: "\u82f1\u6587 13" },
      { rank: 3, subjects: ["\u570b\u6587"], score: "13", label: "\u570b\u6587 13" },
    ],
  },
  {
    recordId: "114-personal_application-099072-114_apply",
    programCode: "099072",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u4f01\u696d\u7ba1\u7406\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u793e 47\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u793e\u6703"], score: "47", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u793e\u6703 47" },
    ],
  },
  {
    recordId: "114-personal_application-099082-114_apply",
    programCode: "099082",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u4f01\u696d\u7ba1\u7406\u5b78\u7cfb(\u98db\u9cf6\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587 8\u8207\u570b\u82f1\u6578A 26\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587"], score: "8", label: "\u82f1\u6587 8" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A"], score: "26", label: "\u570b\u6587+\u82f1\u6587+\u6578A 26" },
    ],
  },
  {
    recordId: "114-personal_application-099092-114_apply",
    programCode: "099092",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u91d1\u878d\u8207\u5408\u4f5c\u7d93\u71df\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u793e 49\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u793e\u6703"], score: "49", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u793e\u6703 49" },
    ],
  },
  {
    recordId: "114-personal_application-099102-114_apply",
    programCode: "099102",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u91d1\u878d\u8207\u5408\u4f5c\u7d93\u71df\u5b78\u7cfb(\u98db\u9cf6\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u793e 41\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u793e\u6703"], score: "41", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u793e\u6703 41" },
    ],
  },
  {
    recordId: "114-personal_application-099132-114_apply",
    programCode: "099132",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u7d71\u8a08\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A 34\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A"], score: "34", label: "\u570b\u6587+\u82f1\u6587+\u6578A 34" },
    ],
  },
  {
    recordId: "114-personal_application-099212-114_apply",
    programCode: "099212",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u4e0d\u52d5\u7522\u8207\u57ce\u9109\u74b0\u5883\u5b78\u7cfb\u7532\u7d44",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A 32\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A"], score: "32", label: "\u570b\u6587+\u82f1\u6587+\u6578A 32" },
    ],
  },
  {
    recordId: "114-personal_application-099222-114_apply",
    programCode: "099222",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u4e0d\u52d5\u7522\u8207\u57ce\u9109\u74b0\u5883\u5b78\u7cfb\u4e59\u7d44",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6578B\u793e 36\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "36", label: "\u82f1\u6587+\u6578B+\u793e\u6703 36" },
    ],
  },
  {
    recordId: "114-personal_application-099282-114_apply",
    programCode: "099282",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u793e\u6703\u5de5\u4f5c\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1 23\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587"], score: "23", label: "\u570b\u6587+\u82f1\u6587 23" },
    ],
  },
  {
    recordId: "114-personal_application-099292-114_apply",
    programCode: "099292",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u793e\u6703\u5de5\u4f5c\u5b78\u7cfb(\u98db\u9cf6\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578B 27\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B"], score: "27", label: "\u570b\u6587+\u82f1\u6587+\u6578B 27" },
    ],
  },
  {
    recordId: "114-personal_application-099302-114_apply",
    programCode: "099302",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u4e2d\u570b\u6587\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u6587+\u793e\u6703 37\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u793e\u6703"], score: "37", label: "\u570b\u6587+\u793e\u6703 37" },
    ],
  },
  {
    recordId: "114-personal_application-099342-114_apply",
    programCode: "099342",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u6b77\u53f2\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u6587+\u793e\u6703 27\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u793e\u6703"], score: "27", label: "\u570b\u6587+\u793e\u6703 27" },
    ],
  },
  {
    recordId: "114-personal_application-099372-114_apply",
    programCode: "099372",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u5de5\u7a0b\u5b78\u7cfb(APCS\u7d44)",
    issue: "\u5b98\u65b9\u5716 APCS \u5c08\u5340\u5217\u6709\u82f1\u6587+\u6578A 17\uff0c\u8207 APCS\u89c0\u5ff5\u984c+APCS\u5be6\u4f5c\u984c 7\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A"], score: "17", label: "\u82f1\u6587+\u6578A 17" },
      { rank: 2, subjects: ["APCS\u89c0\u5ff5\u984c", "APCS\u5be6\u4f5c\u984c"], score: "7", label: "APCS\u89c0\u5ff5\u984c+APCS\u5be6\u4f5c\u984c 7" },
    ],
  },
  {
    recordId: "114-personal_application-099382-114_apply",
    programCode: "099382",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u5de5\u7a0b\u5b78\u7cfb(\u98db\u9cf6\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587+\u6578A 19\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A"], score: "19", label: "\u82f1\u6587+\u6578A 19" },
    ],
  },
  {
    recordId: "114-personal_application-099412-114_apply",
    programCode: "099412",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u96fb\u6a5f\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587+\u6578A+\u81ea\u7136 37\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "37", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 37" },
    ],
  },
  {
    recordId: "114-personal_application-099422-114_apply",
    programCode: "099422",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u96fb\u6a5f\u5de5\u7a0b\u5b78\u7cfb(\u98db\u9cf6\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587+\u6578A+\u81ea\u7136 30\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 099.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "30", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 30" },
    ],
  },
  {
    recordId: "114-personal_application-001022-114_apply", programCode: "001022", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u5916\u570b\u8a9e\u6587\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587 15\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u82f1\u6587"], score: "15", label: "\u82f1\u6587 15" }],
  },
  {
    recordId: "114-personal_application-001112-114_apply", programCode: "001112", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u5316\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u4e09\u500b\u7be9\u9078\u9806\u4f4d\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A"], score: "11", label: "\u82f1\u6587+\u6578A 11" },
      { rank: 2, subjects: ["\u81ea\u7136"], score: "14", label: "\u81ea\u7136 14" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "14", label: "\u82f1\u6587 14" },
    ],
  },
  {
    recordId: "114-personal_application-001132-114_apply", programCode: "001132", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u5fc3\u7406\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6578A\u81ea 41\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "41", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 41" }],
  },
  {
    recordId: "114-personal_application-001222-114_apply", programCode: "001222", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u793e\u6703\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u6578B 10 \u8207\u570b\u82f1\u793e 42\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u6578B"], score: "10", label: "\u6578B 10" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u793e\u6703"], score: "42", label: "\u570b\u6587+\u82f1\u6587+\u793e\u6703 42" },
    ],
  },
  {
    recordId: "114-personal_application-001242-114_apply", programCode: "001242", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u91ab\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u4e09\u500b\u7be9\u9078\u9806\u4f4d\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587"], score: "14", label: "\u570b\u6587 14" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "58", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 58" },
      { rank: 3, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "44", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 44" },
    ],
  },
  {
    recordId: "114-personal_application-001262-114_apply", programCode: "001262", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u7259\u91ab\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u81ea 59 \u8207\u82f1\u6578A\u81ea 45\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "59", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 59" },
      { rank: 2, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "45", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 45" },
    ],
  },
  {
    recordId: "114-personal_application-001272-114_apply", programCode: "001272", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u85e5\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u6578A+\u81ea\u7136 28 \u8207\u570b\u82f1 27\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u6578A", "\u81ea\u7136"], score: "28", label: "\u6578A+\u81ea\u7136 28" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587"], score: "27", label: "\u570b\u6587+\u82f1\u6587 27" },
    ],
  },
  {
    recordId: "114-personal_application-001282-114_apply", programCode: "001282", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u91ab\u5b78\u6aa2\u9a57\u66a8\u751f\u7269\u6280\u8853\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u81ea\u7136 14\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u81ea\u7136"], score: "14", label: "\u81ea\u7136 14" }],
  },
  {
    recordId: "114-personal_application-001292-114_apply", programCode: "001292", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u8b77\u7406\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587 12 \u8207\u81ea\u7136 13\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587"], score: "12", label: "\u82f1\u6587 12" },
      { rank: 2, subjects: ["\u81ea\u7136"], score: "13", label: "\u81ea\u7136 13" },
    ],
  },
  {
    recordId: "114-personal_application-001302-114_apply", programCode: "001302", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u7269\u7406\u6cbb\u7642\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6578A\u81ea 41\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "41", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 41" }],
  },
  {
    recordId: "114-personal_application-001322-114_apply", programCode: "001322", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u571f\u6728\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u81ea 51\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "51", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 51" }],
  },
  {
    recordId: "114-personal_application-001332-114_apply", programCode: "001332", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u6a5f\u68b0\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6578A\u81ea 41\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "41", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 41" }],
  },
  {
    recordId: "114-personal_application-001372-114_apply", programCode: "001372", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u91ab\u5b78\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6578A\u81ea 41 \u8207\u570b\u6587 14\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "41", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 41" },
      { rank: 2, subjects: ["\u570b\u6587"], score: "14", label: "\u570b\u6587 14" },
    ],
  },
  {
    recordId: "114-personal_application-001412-114_apply", programCode: "001412", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u68ee\u6797\u74b0\u5883\u66a8\u8cc7\u6e90\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u81ea\u7136 14\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u81ea\u7136"], score: "14", label: "\u81ea\u7136 14" }],
  },
  {
    recordId: "114-personal_application-001422-114_apply", programCode: "001422", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u52d5\u7269\u79d1\u5b78\u6280\u8853\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A 33 \u8207\u81ea\u7136 14\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A"], score: "33", label: "\u570b\u6587+\u82f1\u6587+\u6578A 33" },
      { rank: 2, subjects: ["\u81ea\u7136"], score: "14", label: "\u81ea\u7136 14" },
    ],
  },
  {
    recordId: "114-personal_application-001442-114_apply", programCode: "001442", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u5712\u85dd\u66a8\u666f\u89c0\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587 13 \u8207\u81ea\u7136 13\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587"], score: "13", label: "\u82f1\u6587 13" },
      { rank: 2, subjects: ["\u81ea\u7136"], score: "13", label: "\u81ea\u7136 13" },
    ],
  },
  {
    recordId: "114-personal_application-001462-114_apply", programCode: "001462", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u751f\u7269\u7522\u696d\u50b3\u64ad\u66a8\u767c\u5c55\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u793e 44\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u793e\u6703"], score: "44", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u793e\u6703 44" }],
  },
  {
    recordId: "114-personal_application-001482-114_apply", programCode: "001482", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u6606\u87f2\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6578A\u81ea 32 \u8207\u81ea\u7136 13\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "32", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 32" },
      { rank: 2, subjects: ["\u81ea\u7136"], score: "13", label: "\u81ea\u7136 13" },
    ],
  },
  {
    recordId: "114-personal_application-001492-114_apply", programCode: "001492", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u690d\u7269\u75c5\u7406\u8207\u5fae\u751f\u7269\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587 14 \u8207\u81ea\u7136 13\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587"], score: "14", label: "\u82f1\u6587 14" },
      { rank: 2, subjects: ["\u81ea\u7136"], score: "13", label: "\u81ea\u7136 13" },
    ],
  },
  {
    recordId: "114-personal_application-001572-114_apply", programCode: "001572", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u516c\u5171\u885b\u751f\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6578A\u81ea 38\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "38", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 38" }],
  },
  {
    recordId: "114-personal_application-001582-114_apply", programCode: "001582", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u96fb\u6a5f\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6578A\u81ea 44\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "44", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 44" }],
  },
  {
    recordId: "114-personal_application-001602-114_apply", programCode: "001602", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u8cc7\u8a0a\u5de5\u7a0b\u5b78\u7cfb(APCS\u7d44)",
    issue: "\u5b98\u65b9\u5716 APCS \u5c08\u5340\u5217\u6709\u6578A 12 \u8207 APCS\u5be6\u4f5c\u984c 5\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u6578A"], score: "12", label: "\u6578A 12" },
      { rank: 2, subjects: ["APCS\u5be6\u4f5c\u984c"], score: "5", label: "APCS\u5be6\u4f5c\u984c 5" },
    ],
  },
  {
    recordId: "114-personal_application-001622-114_apply", programCode: "001622", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u6cd5\u5f8b\u5b78\u7cfb\u6cd5\u5b78\u7d44",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1 30\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587"], score: "30", label: "\u570b\u6587+\u82f1\u6587 30" }],
  },
  {
    recordId: "114-personal_application-001632-114_apply", programCode: "001632", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u6cd5\u5f8b\u5b78\u7cfb\u53f8\u6cd5\u7d44",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1 30\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587"], score: "30", label: "\u570b\u6587+\u82f1\u6587 30" }],
  },
  {
    recordId: "114-personal_application-001642-114_apply", programCode: "001642", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u6cd5\u5f8b\u5b78\u7cfb\u8ca1\u7d93\u6cd5\u5b78\u7d44",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1 30\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587"], score: "30", label: "\u570b\u6587+\u82f1\u6587 30" }],
  },
  {
    recordId: "114-personal_application-001682-114_apply", programCode: "001682", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u5e0c\u671b\u7d44\u7532\u7d44(\u6587\u793e\u6cd5)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578B\u793e 43 \u8207\u570b\u82f1\u793e 35\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "43", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 43" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u793e\u6703"], score: "35", label: "\u570b\u6587+\u82f1\u6587+\u793e\u6703 35" },
    ],
  },
  {
    recordId: "114-personal_application-001692-114_apply", programCode: "001692", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u5e0c\u671b\u7d44\u4e59\u7d44(\u5730\u7406\u53ca\u751f\u50b3)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6578A\u793e 34\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [{ rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u793e\u6703"], score: "34", label: "\u82f1\u6587+\u6578A+\u793e\u6703 34" }],
  },
  {
    recordId: "114-personal_application-001702-114_apply", programCode: "001702", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u5e0c\u671b\u7d44\u4e19\u7d44(\u7406)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u81ea 41 \u8207\u82f1\u6578A\u81ea 31\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "41", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 41" },
      { rank: 2, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "31", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 31" },
    ],
  },
  {
    recordId: "114-personal_application-001712-114_apply", programCode: "001712", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u5e0c\u671b\u7d44\u4e01\u7d44(\u751f\u91ab)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u81ea 45 \u8207\u82f1\u6578A\u81ea 32\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "45", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 45" },
      { rank: 2, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "32", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 32" },
    ],
  },
  {
    recordId: "114-personal_application-001722-114_apply", programCode: "001722", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u5e0c\u671b\u7d44\u620a\u7d44(\u5de5\u96fb\u8cc7)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u81ea 45 \u8207\u82f1\u6578A\u81ea 33\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "45", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 45" },
      { rank: 2, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "33", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 33" },
    ],
  },
  {
    recordId: "114-personal_application-001742-114_apply", programCode: "001742", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u5e0c\u671b\u7d44\u5e9a\u7d44(\u751f\u8fb2)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u81ea 38 \u8207\u82f1\u6578A\u81ea 30\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "38", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 38" },
      { rank: 2, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "30", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 30" },
    ],
  },
  {
    recordId: "114-personal_application-001752-114_apply", programCode: "001752", schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78", departmentName: "\u5e0c\u671b\u7d44\u8f9b\u7d44(\u91ab\u7259)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u6587 13\u3001\u570b\u82f1\u6578A\u81ea 56 \u8207\u82f1\u6578A\u81ea 42\u3002", evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587"], score: "13", label: "\u570b\u6587 13" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "56", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 56" },
      { rank: 3, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "42", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 42" },
    ],
  },
  {
    recordId: "114-personal_application-001062-114_apply",
    programCode: "001062",
    schoolName: "國立臺灣大學",
    departmentName: "圖書資訊學系",
    issue: "第一順位應為國文+英文+社會 40，第二順位應補國文 14",
    evidence: "官方 114 個申篩選結果圖 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["國文", "英文", "社會"], score: "40", label: "國文+英文+社會 40" },
      { rank: 2, subjects: ["國文"], score: "14", label: "國文 14" },
    ],
  },
  {
    recordId: "114-personal_application-001082-114_apply",
    programCode: "001082",
    schoolName: "國立臺灣大學",
    departmentName: "戲劇學系",
    issue: "第一順位應為社會 10，第四順位應補國文 12，OCR 把第三順位四科合計 41 誤覆蓋到第一順位",
    evidence: "官方 114 個申篩選結果圖 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["社會"], score: "10", label: "社會 10" },
      { rank: 4, subjects: ["國文"], score: "12", label: "國文 12" },
    ],
  },
  {
    recordId: "114-personal_application-001122-114_apply",
    programCode: "001122",
    schoolName: "國立臺灣大學",
    departmentName: "地質科學系",
    issue: "第一順位應為國文+英文+數A+自然 47，第三順位自然 13 遺失",
    evidence: "官方 114 個申篩選結果圖 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["國文", "英文", "數A", "自然"], score: "47", label: "國文+英文+數A+自然 47" },
      { rank: 3, subjects: ["自然"], score: "13", label: "自然 13" },
    ],
  },
  {
    recordId: "114-personal_application-001142-114_apply",
    programCode: "001142",
    schoolName: "國立臺灣大學",
    departmentName: "地理環境資源學系",
    issue: "第一順位應為英文+數A+社會 33，OCR 誤讀為數A 9",
    evidence: "官方 114 個申篩選結果圖 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["英文", "數A", "社會"], score: "33", label: "英文+數A+社會 33" },
    ],
  },
  {
    recordId: "114-personal_application-001402-114_apply",
    programCode: "001402",
    schoolName: "\u570b\u7acb\u81fa\u7063\u5927\u5b78",
    departmentName: "\u8fb2\u696d\u5316\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578A\u81ea 40\uff0c\u7b2c\u4e09\u9806\u4f4d\u61c9\u88dc\u4e0a\u81ea\u7136 14\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "40", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 40" },
      { rank: 3, subjects: ["\u81ea\u7136"], score: "14", label: "\u81ea\u7136 14" },
    ],
  },
  {
    recordId: "114-personal_application-001532-114_apply",
    programCode: "001532",
    schoolName: "國立臺灣大學",
    departmentName: "財務金融學系",
    issue: "第一順位應為國文+英文+數A 43，OCR 誤讀為英文 14",
    evidence: "官方 114 個申篩選結果圖 001.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/001.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["國文", "英文", "數A"], score: "43", label: "國文+英文+數A 43" },
    ],
  },
  {
    recordId: "114-personal_application-004172-114_apply",
    programCode: "004172",
    schoolName: "國立成功大學",
    departmentName: "工程科學系",
    issue: "第一順位應為國文+英文+數A+自然 43，第三順位自然 14 遺失",
    evidence: "官方 114 個申篩選結果圖 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["國文", "英文", "數A", "自然"], score: "43", label: "國文+英文+數A+自然 43" },
      { rank: 3, subjects: ["自然"], score: "14", label: "自然 14" },
    ],
  },
  {
    recordId: "114-personal_application-004022-114_apply",
    programCode: "004022",
    schoolName: "國立成功大學",
    departmentName: "外國語文學系",
    issue: "第一順位應為國文+英文+社會 39，OCR 誤讀為國文 13",
    evidence: "官方 114 個申篩選結果圖 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["國文", "英文", "社會"], score: "39", label: "國文+英文+社會 39" },
    ],
  },
  {
    recordId: "114-personal_application-004282-114_apply",
    programCode: "004282",
    schoolName: "國立成功大學",
    departmentName: "會計學系",
    issue: "第一順位應為國文+英文+數B+社會 45，OCR 誤讀為英文 13",
    evidence: "官方 114 個申篩選結果圖 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["國文", "英文", "數B", "社會"], score: "45", label: "國文+英文+數B+社會 45" },
    ],
  },
  {
    recordId: "114-personal_application-004332-114_apply",
    programCode: "004332",
    schoolName: "國立成功大學",
    departmentName: "醫學檢驗生物技術學系",
    issue: "第一順位應為國文+英文+數A+自然 46，第三順位應補自然 13",
    evidence: "官方 114 個申篩選結果圖 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["國文", "英文", "數A", "自然"], score: "46", label: "國文+英文+數A+自然 46" },
      { rank: 3, subjects: ["自然"], score: "13", label: "自然 13" },
    ],
  },
  {
    recordId: "114-personal_application-004362-114_apply",
    programCode: "004362",
    schoolName: "國立成功大學",
    departmentName: "職能治療學系",
    issue: "第一順位應為國文+英文+數A+自然 49，第二順位應補自然 13",
    evidence: "官方 114 個申篩選結果圖 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["國文", "英文", "數A", "自然"], score: "49", label: "國文+英文+數A+自然 49" },
      { rank: 2, subjects: ["自然"], score: "13", label: "自然 13" },
    ],
  },
  {
    recordId: "114-personal_application-006032-114_apply",
    programCode: "006032",
    schoolName: "國立政治大學",
    departmentName: "哲學系",
    issue: "第一順位應為國文+英文+數B+社會 46，OCR 誤讀為英文 12",
    evidence: "官方 114 個申篩選結果圖 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["國文", "英文", "數B", "社會"], score: "46", label: "國文+英文+數B+社會 46" },
    ],
  },
  {
    recordId: "114-personal_application-006052-114_apply",
    programCode: "006052",
    schoolName: "國立政治大學",
    departmentName: "政治學系",
    issue: "第一順位應為英文+社會 25，OCR 誤讀為社會 15",
    evidence: "官方 114 個申篩選結果圖 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["英文", "社會"], score: "25", label: "英文+社會 25" },
    ],
  },
  {
    recordId: "114-personal_application-006062-114_apply",
    programCode: "006062",
    schoolName: "國立政治大學",
    departmentName: "社會學系",
    issue: "第一順位應為英文 9，OCR 把第三順位英文+社會 27 誤覆蓋到第一順位",
    evidence: "官方 114 個申篩選結果圖 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["英文"], score: "9", label: "英文 9" },
    ],
  },
  {
    recordId: "114-personal_application-006132-114_apply",
    programCode: "006132",
    schoolName: "國立政治大學",
    departmentName: "民族學系",
    issue: "第一順位四科合計被 OCR 錯讀成第三順位社會單科分數",
    evidence: "官方 114 個申篩選結果圖 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      {
        rank: 1,
        subjects: ["國文", "英文", "數B", "社會"],
        score: "40",
        label: "國文+英文+數B+社會 40",
      },
    ],
  },
  {
    recordId: "114-personal_application-006072-114_apply",
    programCode: "006072",
    schoolName: "國立政治大學",
    departmentName: "財政學系",
    issue: "第一順位應為國文+英文+數A 32，OCR 誤讀為國文 13",
    evidence: "官方 114 個申篩選結果圖 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["國文", "英文", "數A"], score: "32", label: "國文+英文+數A 32" },
    ],
  },
  {
    recordId: "114-personal_application-006152-114_apply",
    programCode: "006152",
    schoolName: "國立政治大學",
    departmentName: "國際經營與貿易學系",
    issue: "第一順位應為國文+英文+數A+社會 43，OCR 誤讀為英文 14",
    evidence: "官方 114 個申篩選結果圖 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["國文", "英文", "數A", "社會"], score: "43", label: "國文+英文+數A+社會 43" },
    ],
  },
  {
    recordId: "114-personal_application-006182-114_apply",
    programCode: "006182",
    schoolName: "國立政治大學",
    departmentName: "統計學系(甲組)",
    issue: "第一順位應為數A 9，OCR 把第三順位四科合計 49 誤覆蓋到第一順位",
    evidence: "官方 114 個申篩選結果圖 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["數A"], score: "9", label: "數A 9" },
    ],
  },
  {
    recordId: "114-personal_application-004262-114_apply",
    programCode: "004262",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u4ea4\u901a\u7ba1\u7406\u79d1\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u6587+\u81ea\u7136 22\uff0c\u539f\u59cb OCR \u5c07\u6578\u503c\u8b80\u6210 13\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u81ea\u7136"], score: "22", label: "\u570b\u6587+\u81ea\u7136 22" },
    ],
  },
  {
    recordId: "114-personal_application-004292-114_apply",
    programCode: "004292",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u4f01\u696d\u7ba1\u7406\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u6709\u5217\u7b2c\u4e00\u9806\u4f4d\u82f1\u6587+\u6578B 27\uff0c\u539f\u59cb\u8cc7\u6599\u6f0f\u63a5\u6b63\u5f0f\u7be9\u9078\u9806\u4f4d\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578B"], score: "27", label: "\u82f1\u6587+\u6578B 27" },
    ],
  },
  {
    recordId: "114-personal_application-004302-114_apply",
    programCode: "004302",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u91ab\u5b78\u7cfb",
    issue: "\u7b2c\u56db\u9806\u4f4d\u61c9\u88dc\u4e0a\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 58\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 4, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "58", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 58" },
    ],
  },
  {
    recordId: "114-personal_application-004012-114_apply",
    programCode: "004012",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u4e2d\u570b\u6587\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u5169\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u793e\u6703"], score: "22", label: "\u82f1\u6587+\u793e\u6703 22" },
      { rank: 2, subjects: ["\u570b\u6587"], score: "14", label: "\u570b\u6587 14" },
    ],
  },
  {
    recordId: "114-personal_application-004072-114_apply",
    programCode: "004072",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u5316\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u81ea\u7136 14\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u81ea\u7136"], score: "14", label: "\u81ea\u7136 14" },
    ],
  },
  {
    recordId: "114-personal_application-004092-114_apply",
    programCode: "004092",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u5149\u96fb\u79d1\u5b78\u8207\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u5169\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "43", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 43" },
      { rank: 2, subjects: ["\u6578A", "\u81ea\u7136"], score: "28", label: "\u6578A+\u81ea\u7136 28" },
    ],
  },
  {
    recordId: "114-personal_application-004102-114_apply",
    programCode: "004102",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u6a5f\u68b0\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u5169\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "36", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 36" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "50", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 50" },
    ],
  },
  {
    recordId: "114-personal_application-004112-114_apply",
    programCode: "004112",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u6a5f\u68b0\u5de5\u7a0b\u5b78\u7cfb(\u666e\u6e21\u96d9\u806f\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u5169\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "38", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 38" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "51", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 51" },
    ],
  },
  {
    recordId: "114-personal_application-004122-114_apply",
    programCode: "004122",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u5316\u5b78\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587+\u6578A+\u81ea\u7136 39\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "39", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 39" },
    ],
  },
  {
    recordId: "114-personal_application-004132-114_apply",
    programCode: "004132",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u6750\u6599\u79d1\u5b78\u53ca\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587+\u6578A+\u81ea\u7136 40\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "40", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 40" },
    ],
  },
  {
    recordId: "114-personal_application-004162-114_apply",
    programCode: "004162",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u6c34\u5229\u53ca\u6d77\u6d0b\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u56db\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587"], score: "8", label: "\u82f1\u6587 8" },
      { rank: 2, subjects: ["\u570b\u6587"], score: "11", label: "\u570b\u6587 11" },
      { rank: 3, subjects: ["\u81ea\u7136"], score: "12", label: "\u81ea\u7136 12" },
      { rank: 4, subjects: ["\u6578A"], score: "11", label: "\u6578A 11" },
    ],
  },
  {
    recordId: "114-personal_application-004182-114_apply",
    programCode: "004182",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u7cfb\u7d71\u53ca\u8239\u8236\u6a5f\u96fb\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u4e09\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u6578A"], score: "10", label: "\u6578A 10" },
      { rank: 2, subjects: ["\u81ea\u7136"], score: "13", label: "\u81ea\u7136 13" },
      { rank: 3, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u81ea\u7136"], score: "38", label: "\u570b\u6587+\u82f1\u6587+\u81ea\u7136 38" },
    ],
  },
  {
    recordId: "114-personal_application-004212-114_apply",
    programCode: "004212",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u74b0\u5883\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u5169\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "47", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 47" },
      { rank: 2, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "36", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 36" },
    ],
  },
  {
    recordId: "114-personal_application-004222-114_apply",
    programCode: "004222",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u6e2c\u91cf\u53ca\u7a7a\u9593\u8cc7\u8a0a\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u81ea 48\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "48", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 48" },
    ],
  },
  {
    recordId: "114-personal_application-004232-114_apply",
    programCode: "004232",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u751f\u7269\u91ab\u5b78\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587+\u6578A+\u81ea\u7136 39\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "39", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 39" },
    ],
  },
  {
    recordId: "114-personal_application-004252-114_apply",
    programCode: "004252",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u5de5\u696d\u8207\u8cc7\u8a0a\u7ba1\u7406\u5b78\u7cfb(APCS\u7d44)",
    issue: "\u5b98\u65b9\u5716 APCS \u5c08\u5340\u5217\u6709\u5169\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A"], score: "21", label: "\u82f1\u6587+\u6578A 21" },
      { rank: 2, subjects: ["APCS\u89c0\u5ff5\u984c", "APCS\u5be6\u4f5c\u984c"], score: "8", label: "APCS\u89c0\u5ff5\u984c+APCS\u5be6\u4f5c\u984c 8" },
    ],
  },
  {
    recordId: "114-personal_application-004352-114_apply",
    programCode: "004352",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u7269\u7406\u6cbb\u7642\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u5169\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587"], score: "14", label: "\u82f1\u6587 14" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "52", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 52" },
    ],
  },
  {
    recordId: "114-personal_application-004412-114_apply",
    programCode: "004412",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u5fc3\u7406\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587+\u6578A+\u81ea\u7136 39\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "39", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 39" },
    ],
  },
  {
    recordId: "114-personal_application-004422-114_apply",
    programCode: "004422",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u96fb\u6a5f\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587+\u6578A+\u81ea\u7136 42\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "42", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 42" },
    ],
  },
  {
    recordId: "114-personal_application-004432-114_apply",
    programCode: "004432",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u96fb\u6a5f\u5de5\u7a0b\u5b78\u7cfb(\u666e\u6e21\u96d9\u806f\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587+\u6578A+\u81ea\u7136 42\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "42", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 42" },
    ],
  },
  {
    recordId: "114-personal_application-004442-114_apply",
    programCode: "004442",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587+\u6578A+\u81ea\u7136 42\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "42", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 42" },
    ],
  },
  {
    recordId: "114-personal_application-004452-114_apply",
    programCode: "004452",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u5de5\u7a0b\u5b78\u7cfb(\u667a\u6167\u7cfb\u7d71\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587+\u6578A 27\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A"], score: "27", label: "\u82f1\u6587+\u6578A 27" },
    ],
  },
  {
    recordId: "114-personal_application-004462-114_apply",
    programCode: "004462",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u5de5\u7a0b\u5b78\u7cfb(\u666e\u6e21\u96d9\u806f\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u82f1\u6587+\u6578A+\u81ea\u7136 40\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "40", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 40" },
    ],
  },
  {
    recordId: "114-personal_application-004472-114_apply",
    programCode: "004472",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u5efa\u7bc9\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u81ea 50\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "50", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 50" },
    ],
  },
  {
    recordId: "114-personal_application-004482-114_apply",
    programCode: "004482",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u90fd\u5e02\u8a08\u5283\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u5169\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587"], score: "23", label: "\u570b\u6587+\u82f1\u6587 23" },
      { rank: 2, subjects: ["\u6578A"], score: "11", label: "\u6578A 11" },
    ],
  },
  {
    recordId: "114-personal_application-004492-114_apply",
    programCode: "004492",
    schoolName: "\u570b\u7acb\u6210\u529f\u5927\u5b78",
    departmentName: "\u5de5\u696d\u8a2d\u8a08\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u82f1\u6578A\u81ea 49\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 004.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/004.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "49", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 49" },
    ],
  },
  {
    recordId: "114-personal_application-006042-114_apply",
    programCode: "006042",
    schoolName: "\u570b\u7acb\u653f\u6cbb\u5927\u5b78",
    departmentName: "\u6559\u80b2\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 50\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "50", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 50" },
    ],
  },
  {
    recordId: "114-personal_application-006092-114_apply",
    programCode: "006092",
    schoolName: "\u570b\u7acb\u653f\u6cbb\u5927\u5b78",
    departmentName: "\u5730\u653f\u5b78\u7cfb\u571f\u5730\u8cc7\u6e90\u898f\u5283\u7d44",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u4e09\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u6b63\u5f0f\u7d50\u679c\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587"], score: "12", label: "\u570b\u6587 12" },
      { rank: 2, subjects: ["\u82f1\u6587", "\u6578A"], score: "20", label: "\u82f1\u6587+\u6578A 20" },
      { rank: 3, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u793e\u6703"], score: "47", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u793e\u6703 47" },
    ],
  },
  {
    recordId: "114-personal_application-006142-114_apply",
    programCode: "006142",
    schoolName: "\u570b\u7acb\u653f\u6cbb\u5927\u5b78",
    departmentName: "\u5916\u4ea4\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u6709\u5217\u51fa\u7b2c\u4e00\u9806\u4f4d\u570b\u6587+\u82f1\u6587+\u793e\u6703 43\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u793e\u6703"], score: "43", label: "\u570b\u6587+\u82f1\u6587+\u793e\u6703 43" },
    ],
  },
  {
    recordId: "114-personal_application-006252-114_apply",
    programCode: "006252",
    schoolName: "\u570b\u7acb\u653f\u6cbb\u5927\u5b78",
    departmentName: "\u50b3\u64ad\u5b78\u9662\u5927\u4e00\u5927\u4e8c\u4e0d\u5206\u7cfb(\u81ea\u7136\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u5169\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u6b63\u5f0f\u7d50\u679c\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A"], score: "23", label: "\u82f1\u6587+\u6578A 23" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "47", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 47" },
    ],
  },
  {
    recordId: "114-personal_application-006382-114_apply",
    programCode: "006382",
    schoolName: "\u570b\u7acb\u653f\u6cbb\u5927\u5b78",
    departmentName: "\u6cd5\u5f8b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u4e09\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u6b63\u5f0f\u7d50\u679c\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587"], score: "14", label: "\u570b\u6587 14" },
      { rank: 2, subjects: ["\u82f1\u6587", "\u793e\u6703"], score: "28", label: "\u82f1\u6587+\u793e\u6703 28" },
      { rank: 3, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "54", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 54" },
    ],
  },
  {
    recordId: "114-personal_application-006392-114_apply",
    programCode: "006392",
    schoolName: "\u570b\u7acb\u653f\u6cbb\u5927\u5b78",
    departmentName: "\u61c9\u7528\u6578\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u5169\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u6b63\u5f0f\u7d50\u679c\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u6578A"], score: "11", label: "\u6578A 11" },
      { rank: 2, subjects: ["\u6578A", "\u81ea\u7136"], score: "25", label: "\u6578A+\u81ea\u7136 25" },
    ],
  },
  {
    recordId: "114-personal_application-006412-114_apply",
    programCode: "006412",
    schoolName: "\u570b\u7acb\u653f\u6cbb\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u79d1\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u5169\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u6b63\u5f0f\u7d50\u679c\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u6578A"], score: "11", label: "\u6578A 11" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "50", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 50" },
    ],
  },
  {
    recordId: "114-personal_application-006422-114_apply",
    programCode: "006422",
    schoolName: "\u570b\u7acb\u653f\u6cbb\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u79d1\u5b78\u7cfb(APCS\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709 APCS \u6821\u7cfb\u5c08\u5340\u7be9\u9078\u9806\u4f4d\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u6578A", "\u81ea\u7136"], score: "20", label: "\u6578A+\u81ea\u7136 20" },
      { rank: 2, subjects: ["APCS\u5be6\u4f5c\u984c"], score: "3", label: "APCS\u5be6\u4f5c\u984c 3" },
    ],
  },
  {
    recordId: "114-personal_application-006442-114_apply",
    programCode: "006442",
    schoolName: "\u570b\u7acb\u653f\u6cbb\u5927\u5b78",
    departmentName: "\u5275\u65b0\u570b\u969b\u5b78\u9662\u5b78\u58eb\u73ed",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u6578B+\u793e\u6703 24\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u6578B", "\u793e\u6703"], score: "24", label: "\u6578B+\u793e\u6703 24" },
    ],
  },
  {
    recordId: "114-personal_application-006452-114_apply",
    programCode: "006452",
    schoolName: "\u570b\u7acb\u653f\u6cbb\u5927\u5b78",
    departmentName: "\u653f\u661f\u62db\u751f(\u7532\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u6587+\u82f1\u6587+\u793e\u6703 30\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u793e\u6703"], score: "30", label: "\u570b\u6587+\u82f1\u6587+\u793e\u6703 30" },
    ],
  },
  {
    recordId: "114-personal_application-006462-114_apply",
    programCode: "006462",
    schoolName: "\u570b\u7acb\u653f\u6cbb\u5927\u5b78",
    departmentName: "\u653f\u661f\u62db\u751f(\u4e59\u7d44)",
    issue: "\u5b98\u65b9\u5716\u5217\u6709\u570b\u6587+\u82f1\u6587+\u6578A 26\uff0c\u539f\u59cb\u8cc7\u6599\u672a\u63a5\u5165\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 006.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/006.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A"], score: "26", label: "\u570b\u6587+\u82f1\u6587+\u6578A 26" },
    ],
  },
  {
    recordId: "114-personal_application-023202-114_apply",
    programCode: "023202",
    schoolName: "\u570b\u7acb\u5f70\u5316\u5e2b\u7bc4\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u7ba1\u7406\u5b78\u7cfb\u8cc7\u8a0a\u7ba1\u7406\u7d44",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578B 32\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 023.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/023.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B"], score: "32", label: "\u570b\u6587+\u82f1\u6587+\u6578B 32" },
      { rank: 2, subjects: ["\u6578B"], score: "11", label: "\u6578B 11" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "12", label: "\u82f1\u6587 12" },
    ],
  },
  {
    recordId: "114-personal_application-023212-114_apply",
    programCode: "023212",
    schoolName: "\u570b\u7acb\u5f70\u5316\u5e2b\u7bc4\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u7ba1\u7406\u5b78\u7cfb\u6578\u4f4d\u5167\u5bb9\u79d1\u6280\u8207\u7ba1\u7406\u7d44",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578A 30\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 023.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/023.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A"], score: "30", label: "\u570b\u6587+\u82f1\u6587+\u6578A 30" },
      { rank: 2, subjects: ["\u6578A"], score: "9", label: "\u6578A 9" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "11", label: "\u82f1\u6587 11" },
    ],
  },
  {
    recordId: "114-personal_application-023222-114_apply",
    programCode: "023222",
    schoolName: "\u570b\u7acb\u5f70\u5316\u5e2b\u7bc4\u5927\u5b78",
    departmentName: "\u516c\u5171\u4e8b\u52d9\u8207\u516c\u6c11\u6559\u80b2\u5b78\u7cfb\u516c\u6c11\u6559\u80b2\u7d44",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u793e 32\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 023.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/023.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u793e\u6703"], score: "32", label: "\u570b\u6587+\u82f1\u6587+\u793e\u6703 32" },
      { rank: 2, subjects: ["\u82f1\u6587"], score: "9", label: "\u82f1\u6587 9" },
      { rank: 3, subjects: ["\u793e\u6703"], score: "13", label: "\u793e\u6703 13" },
    ],
  },
  {
    recordId: "114-personal_application-023272-114_apply",
    programCode: "023272",
    schoolName: "\u570b\u7acb\u5f70\u5316\u5e2b\u7bc4\u5927\u5b78",
    departmentName: "\u63da\u9df9\u62db\u751fD\u7d44(\u7406)",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u82f1\u6578A\u81ea 22\uff0c\u7b2c\u4e8c\u9806\u4f4d\u61c9\u88dc\u4e0a\u81ea\u7136 9\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 023.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/023.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "22", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 22" },
      { rank: 2, subjects: ["\u81ea\u7136"], score: "9", label: "\u81ea\u7136 9" },
      { rank: 3, subjects: ["\u6578A"], score: "6", label: "\u6578A 6" },
    ],
  },
  {
    recordId: "114-personal_application-023282-114_apply",
    programCode: "023282",
    schoolName: "\u570b\u7acb\u5f70\u5316\u5e2b\u7bc4\u5927\u5b78",
    departmentName: "\u63da\u9df9\u62db\u751fE\u7d44(\u5de5)",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u82f1\u6578A\u81ea 19\uff0c\u7b2c\u4e8c\u9806\u4f4d\u61c9\u88dc\u4e0a\u81ea\u7136 8\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 023.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/023.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "19", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 19" },
      { rank: 2, subjects: ["\u81ea\u7136"], score: "8", label: "\u81ea\u7136 8" },
      { rank: 3, subjects: ["\u6578A"], score: "6", label: "\u6578A 6" },
    ],
  },
  {
    recordId: "114-personal_application-003052-114_apply",
    programCode: "003052",
    schoolName: "\u570b\u7acb\u4e2d\u8208\u5927\u5b78",
    departmentName: "\u8ca1\u52d9\u91d1\u878d\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578A\u793e 45\uff0c\u7b2c\u4e8c\u9806\u4f4d\u61c9\u88dc\u4e0a\u6578A 8\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 003.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/003.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u793e\u6703"], score: "45", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u793e\u6703 45" },
      { rank: 2, subjects: ["\u6578A"], score: "8", label: "\u6578A 8" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "14", label: "\u82f1\u6587 14" },
    ],
  },
  {
    recordId: "114-personal_application-003092-114_apply",
    programCode: "003092",
    schoolName: "\u570b\u7acb\u4e2d\u8208\u5927\u5b78",
    departmentName: "\u6703\u8a08\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578A\u793e 43\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 003.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/003.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u793e\u6703"], score: "43", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u793e\u6703 43" },
      { rank: 2, subjects: ["\u793e\u6703"], score: "13", label: "\u793e\u6703 13" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "12", label: "\u82f1\u6587 12" },
    ],
  },
  {
    recordId: "114-personal_application-003112-114_apply",
    programCode: "003112",
    schoolName: "\u570b\u7acb\u4e2d\u8208\u5927\u5b78",
    departmentName: "\u61c9\u7528\u7d93\u6fdf\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u6578A 31\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 003.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/003.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A"], score: "31", label: "\u570b\u6587+\u82f1\u6587+\u6578A 31" },
      { rank: 2, subjects: ["\u6578A"], score: "9", label: "\u6578A 9" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "12", label: "\u82f1\u6587 12" },
    ],
  },
  {
    recordId: "114-personal_application-003272-114_apply",
    programCode: "003272",
    schoolName: "\u570b\u7acb\u4e2d\u8208\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u5de5\u7a0b\u5b78\u7cfb(APCS\u7d44)",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u6578A 7\uff0c\u7b2c\u4e8c\u9806\u4f4d\u61c9\u70ba\u82f1\u6587+\u81ea\u7136 25\uff0c\u7b2c\u56db\u9806\u4f4d\u61c9\u88dc\u4e0a APCS\u89c0\u5ff5\u984c+APCS\u5be6\u4f5c\u984c 7\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 003.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/003.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u6578A"], score: "7", label: "\u6578A 7" },
      { rank: 2, subjects: ["\u82f1\u6587", "\u81ea\u7136"], score: "25", label: "\u82f1\u6587+\u81ea\u7136 25" },
      { rank: 3, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "34", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 34" },
      { rank: 4, subjects: ["APCS\u89c0\u5ff5\u984c", "APCS\u5be6\u4f5c\u984c"], score: "7", label: "APCS\u89c0\u5ff5\u984c+APCS\u5be6\u4f5c\u984c 7" },
    ],
  },
  {
    recordId: "114-personal_application-003332-114_apply",
    programCode: "003332",
    schoolName: "\u570b\u7acb\u4e2d\u8208\u5927\u5b78",
    departmentName: "\u8fb2\u85dd\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u81ea 28\uff0c\u7b2c\u4e09\u9806\u4f4d\u61c9\u88dc\u4e0a\u81ea\u7136 12\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 003.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/003.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u81ea\u7136"], score: "28", label: "\u570b\u6587+\u82f1\u6587+\u81ea\u7136 28" },
      { rank: 2, subjects: ["\u570b\u6587"], score: "11", label: "\u570b\u6587 11" },
      { rank: 3, subjects: ["\u81ea\u7136"], score: "12", label: "\u81ea\u7136 12" },
    ],
  },
  {
    recordId: "114-personal_application-002102-114_apply",
    programCode: "002102",
    schoolName: "\u570b\u7acb\u81fa\u7063\u5e2b\u7bc4\u5927\u5b78",
    departmentName: "\u7279\u6b8a\u6559\u80b2\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1 25\uff0c\u7b2c\u4e09\u9806\u4f4d\u61c9\u88dc\u4e0a\u570b\u6587 13\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 002.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/002.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587"], score: "25", label: "\u570b\u6587+\u82f1\u6587 25" },
      { rank: 2, subjects: ["\u82f1\u6587"], score: "12", label: "\u82f1\u6587 12" },
      { rank: 3, subjects: ["\u570b\u6587"], score: "13", label: "\u570b\u6587 13" },
    ],
  },
  {
    recordId: "114-personal_application-002112-114_apply",
    programCode: "002112",
    schoolName: "\u570b\u7acb\u81fa\u7063\u5e2b\u7bc4\u5927\u5b78",
    departmentName: "\u7279\u6b8a\u6559\u80b2\u5b78\u7cfb(\u516c\u8cbb\u751f)",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1 19\uff0c\u4e0d\u662f 10\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 002.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/002.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587"], score: "19", label: "\u570b\u6587+\u82f1\u6587 19" },
      { rank: 2, subjects: ["\u82f1\u6587"], score: "9", label: "\u82f1\u6587 9" },
      { rank: 3, subjects: ["\u570b\u6587"], score: "10", label: "\u570b\u6587 10" },
    ],
  },
  {
    recordId: "114-personal_application-002172-114_apply",
    programCode: "002172",
    schoolName: "\u570b\u7acb\u81fa\u7063\u5e2b\u7bc4\u5927\u5b78",
    departmentName: "\u6b77\u53f2\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u570b\u82f1\u793e 36\uff0c\u7b2c\u4e09\u9806\u4f4d\u61c9\u88dc\u4e0a\u82f1\u6587 11\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 002.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/002.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u793e\u6703"], score: "36", label: "\u570b\u6587+\u82f1\u6587+\u793e\u6703 36" },
      { rank: 2, subjects: ["\u570b\u6587"], score: "12", label: "\u570b\u6587 12" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "11", label: "\u82f1\u6587 11" },
      { rank: 4, subjects: ["\u793e\u6703"], score: "14", label: "\u793e\u6703 14" },
    ],
  },
  {
    recordId: "114-personal_application-041302-114_apply",
    programCode: "041302",
    schoolName: "\u570b\u7acb\u4e2d\u6b63\u5927\u5b78",
    departmentName: "\u8ca1\u7d93\u6cd5\u5f8b\u5b78\u7cfb",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u793e\u6703 12\uff0c\u539f\u59cb\u8cc7\u6599\u8aa4\u5c07\u7b2c\u4e09\u9806\u4f4d 49 \u586b\u5230\u7b2c\u4e00\u9806\u4f4d\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 041.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/041.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u793e\u6703"], score: "12", label: "\u793e\u6703 12" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587"], score: "26", label: "\u570b\u6587+\u82f1\u6587 26" },
      { rank: 3, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "49", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 49" },
    ],
  },
  {
    recordId: "114-personal_application-041362-114_apply",
    programCode: "041362",
    schoolName: "\u570b\u7acb\u4e2d\u6b63\u5927\u5b78",
    departmentName: "\u5609\u661f\u62db\u751f\u4e19\u7d44(\u6cd5)",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u6578B 4\uff0c\u7b2c\u4e8c\u9806\u4f4d\u61c9\u88dc\u4e0a\u570b\u82f1 19\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 041.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/041.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u6578B"], score: "4", label: "\u6578B 4" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587"], score: "19", label: "\u570b\u6587+\u82f1\u6587 19" },
      { rank: 3, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "35", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 35" },
    ],
  },
  {
    recordId: "114-personal_application-041402-114_apply",
    programCode: "041402",
    schoolName: "\u570b\u7acb\u4e2d\u6b63\u5927\u5b78",
    departmentName: "\u5609\u661f\u62db\u751f\u5e9a\u7d44(\u6559)",
    issue: "\u7b2c\u4e00\u9806\u4f4d\u61c9\u70ba\u793e\u6703 9\uff0c\u7b2c\u4e8c\u9806\u4f4d\u61c9\u88dc\u4e0a\u570b\u82f1 19\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 041.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/041.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u793e\u6703"], score: "9", label: "\u793e\u6703 9" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587"], score: "19", label: "\u570b\u6587+\u82f1\u6587 19" },
      { rank: 3, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "36", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 36" },
    ],
  },
  {
    recordId: "114-personal_application-013042-114_apply",
    programCode: "013042",
    schoolName: "\u570b\u7acb\u967d\u660e\u4ea4\u901a\u5927\u5b78",
    departmentName: "\u5149\u96fb\u5de5\u7a0b\u5b78\u7cfb\u7532\u7d44(\u667a\u6167\u7cfb\u7d71\u7d44)",
    issue: "\u5b98\u65b9\u5716\u986f\u793a\u70ba\u570b\u82f1\u81ea 41\uff0c\u4e26\u6709\u81ea\u7136 14\u3001\u82f1\u6587 14\uff0c\u539f\u59cb\u8cc7\u6599\u8aa4\u8b80\u6210\u570b\u82f1\u81ea 14\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 013.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/013.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u81ea\u7136"], score: "41", label: "\u570b\u6587+\u82f1\u6587+\u81ea\u7136 41" },
      { rank: 2, subjects: ["\u81ea\u7136"], score: "14", label: "\u81ea\u7136 14" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "14", label: "\u82f1\u6587 14" },
    ],
  },
  {
    recordId: "114-personal_application-016042-114_apply",
    programCode: "016042",
    schoolName: "\u570b\u7acb\u4e2d\u592e\u5927\u5b78",
    departmentName: "\u6587\u5b78\u9662\u5b78\u58eb\u73ed",
    issue: "\u5b98\u65b9\u5716\u7b2c\u4e00\u9806\u4f4d\u70ba\u82f1\u6578B\u793e 39\uff0c\u4e26\u6709\u570b\u6587 12\u3001\u82f1\u6587 12\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 016.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/016.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "39", label: "\u82f1\u6587+\u6578B+\u793e\u6703 39" },
      { rank: 2, subjects: ["\u570b\u6587"], score: "12", label: "\u570b\u6587 12" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "12", label: "\u82f1\u6587 12" },
    ],
  },
  {
    recordId: "114-personal_application-016242-114_apply",
    programCode: "016242",
    schoolName: "\u570b\u7acb\u4e2d\u592e\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u5de5\u7a0b\u5b78\u7cfb(APCS\u7d44)",
    issue: "\u5b98\u65b9\u5716\u6709 APCS \u6821\u7cfb\u5c08\u5340\u7be9\u9078\u9806\u4f4d\uff0c\u61c9\u70ba APCS \u89c0\u5ff5\u984c+\u5be6\u4f5c\u984c 8\uff0c\u82f1\u6578A\u81ea 35\uff0c\u81ea\u7136 12\uff0c\u82f1\u6587 11\uff0c\u6578A 10\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 016.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/016.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["APCS\u89c0\u5ff5\u984c", "APCS\u5be6\u4f5c\u984c"], score: "8", label: "APCS\u89c0\u5ff5\u984c+APCS\u5be6\u4f5c\u984c 8" },
      { rank: 2, subjects: ["\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "35", label: "\u82f1\u6587+\u6578A+\u81ea\u7136 35" },
      { rank: 3, subjects: ["\u81ea\u7136"], score: "12", label: "\u81ea\u7136 12" },
      { rank: 4, subjects: ["\u82f1\u6587"], score: "11", label: "\u82f1\u6587 11" },
      { rank: 5, subjects: ["\u6578A"], score: "10", label: "\u6578A 10" },
    ],
  },
  {
    recordId: "114-personal_application-021022-114_apply",
    programCode: "021022",
    schoolName: "\u570b\u7acb\u81fa\u7063\u6d77\u6d0b\u5927\u5b78",
    departmentName: "\u822a\u904b\u7ba1\u7406\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u7b2c\u4e00\u9806\u4f4d\u70ba\u570b\u82f1\u6578B\u793e 32\uff0c\u4e26\u6709\u6578B 7\u3001\u82f1\u6587 10\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 021.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/021.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "32", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 32" },
      { rank: 2, subjects: ["\u6578B"], score: "7", label: "\u6578B 7" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "10", label: "\u82f1\u6587 10" },
    ],
  },
  {
    recordId: "114-personal_application-021272-114_apply",
    programCode: "021272",
    schoolName: "\u570b\u7acb\u81fa\u7063\u6d77\u6d0b\u5927\u5b78",
    departmentName: "\u6d77\u6d0b\u5de5\u7a0b\u79d1\u6280\u5b78\u58eb\u5b78\u4f4d\u5b78\u7a0b",
    issue: "\u5b98\u65b9\u5716\u7b2c\u4e00\u9806\u4f4d\u70ba\u6578A\u81ea 18\uff0c\u4e26\u6709\u81ea\u7136 11\u3001\u6578A 7\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 021.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/021.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u6578A", "\u81ea\u7136"], score: "18", label: "\u6578A+\u81ea\u7136 18" },
      { rank: 2, subjects: ["\u81ea\u7136"], score: "11", label: "\u81ea\u7136 11" },
      { rank: 3, subjects: ["\u6578A"], score: "7", label: "\u6578A 7" },
    ],
  },
  {
    recordId: "114-personal_application-031182-114_apply",
    programCode: "031182",
    schoolName: "\u570b\u7acb\u81fa\u4e2d\u6559\u80b2\u5927\u5b78",
    departmentName: "\u570b\u969b\u4f01\u696d\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u7b2c\u4e00\u9806\u4f4d\u70ba\u570b\u82f1\u6578A 30\uff0c\u539f\u59cb\u8cc7\u6599\u8aa4\u8b80\u6210 12\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 031.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/031.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A"], score: "30", label: "\u570b\u6587+\u82f1\u6587+\u6578A 30" },
    ],
  },
  {
    recordId: "114-personal_application-032152-114_apply",
    programCode: "032152",
    schoolName: "\u570b\u7acb\u81fa\u5317\u6559\u80b2\u5927\u5b78",
    departmentName: "\u8a9e\u6587\u8207\u5275\u4f5c\u5b78\u7cfb\u8a9e\u6587\u5e2b\u8cc7\u7d44",
    issue: "\u5b98\u65b9\u5716\u7b2c\u4e00\u9806\u4f4d\u70ba\u570b\u82f1\u6578B\u793e 37\uff0c\u4e26\u6709\u82f1\u6587 8\u3001\u570b\u6587 13\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 032.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/032.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B", "\u793e\u6703"], score: "37", label: "\u570b\u6587+\u82f1\u6587+\u6578B+\u793e\u6703 37" },
      { rank: 2, subjects: ["\u82f1\u6587"], score: "8", label: "\u82f1\u6587 8" },
      { rank: 3, subjects: ["\u570b\u6587"], score: "13", label: "\u570b\u6587 13" },
    ],
  },
  {
    recordId: "114-personal_application-032162-114_apply",
    programCode: "032162",
    schoolName: "\u570b\u7acb\u81fa\u5317\u6559\u80b2\u5927\u5b78",
    departmentName: "\u8a9e\u6587\u8207\u5275\u4f5c\u5b78\u7cfb\u6587\u5b78\u5275\u4f5c\u7d44",
    issue: "\u5b98\u65b9\u5716\u7b2c\u4e00\u9806\u4f4d\u70ba\u570b\u82f1\u793e 33\uff0c\u4e26\u6709\u82f1\u6587 9\u3001\u570b\u6587 13\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 032.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/032.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u793e\u6703"], score: "33", label: "\u570b\u6587+\u82f1\u6587+\u793e\u6703 33" },
      { rank: 2, subjects: ["\u82f1\u6587"], score: "9", label: "\u82f1\u6587 9" },
      { rank: 3, subjects: ["\u570b\u6587"], score: "13", label: "\u570b\u6587 13" },
    ],
  },
  {
    recordId: "114-personal_application-033012-114_apply",
    programCode: "033012",
    schoolName: "\u570b\u7acb\u81fa\u5357\u5927\u5b78",
    departmentName: "\u6559\u80b2\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u6709\u4e09\u500b\u7be9\u9078\u9806\u4f4d\uff0c\u61c9\u70ba\u82f1\u6587 4\uff0c\u570b\u6587+\u6578B 14\uff0c\u570b\u82f1\u6578B 29\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 033.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/033.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587"], score: "4", label: "\u82f1\u6587 4" },
      { rank: 2, subjects: ["\u570b\u6587", "\u6578B"], score: "14", label: "\u570b\u6587+\u6578B 14" },
      { rank: 3, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578B"], score: "29", label: "\u570b\u6587+\u82f1\u6587+\u6578B 29" },
    ],
  },
  {
    recordId: "114-personal_application-035152-114_apply",
    programCode: "035152",
    schoolName: "\u81fa\u5317\u5e02\u7acb\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u79d1\u5b78\u7cfb(APCS\u7d44)",
    issue: "\u5b98\u65b9\u5716\u6709 APCS \u6821\u7cfb\u5c08\u5340\u7be9\u9078\u9806\u4f4d\uff0c\u61c9\u70ba\u82f1\u6578A 15\uff0c\u6578A 6\uff0cAPCS \u89c0\u5ff5\u984c+\u5be6\u4f5c\u984c 5\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 035.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/035.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u82f1\u6587", "\u6578A"], score: "15", label: "\u82f1\u6587+\u6578A 15" },
      { rank: 2, subjects: ["\u6578A"], score: "6", label: "\u6578A 6" },
      { rank: 3, subjects: ["APCS\u89c0\u5ff5\u984c", "APCS\u5be6\u4f5c\u984c"], score: "5", label: "APCS\u89c0\u5ff5\u984c+APCS\u5be6\u4f5c\u984c 5" },
    ],
  },
  {
    recordId: "114-personal_application-036282-114_apply",
    programCode: "036282",
    schoolName: "\u570b\u7acb\u5c4f\u6771\u5927\u5b78",
    departmentName: "\u8cc7\u8a0a\u5de5\u7a0b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u7b2c\u4e00\u9806\u4f4d\u70ba\u570b\u82f1\u6578A 11\uff0c\u4e26\u6709\u82f1\u6587+\u6578A 13\u3001\u570b\u6587 12\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 036.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/036.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A"], score: "11", label: "\u570b\u6587+\u82f1\u6587+\u6578A 11" },
      { rank: 2, subjects: ["\u82f1\u6587", "\u6578A"], score: "13", label: "\u82f1\u6587+\u6578A 13" },
      { rank: 3, subjects: ["\u570b\u6587"], score: "12", label: "\u570b\u6587 12" },
    ],
  },
  {
    recordId: "114-personal_application-036292-114_apply",
    programCode: "036292",
    schoolName: "\u570b\u7acb\u5c4f\u6771\u5927\u5b78",
    departmentName: "\u96fb\u8166\u8207\u901a\u8a0a\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u7b2c\u4e00\u9806\u4f4d\u70ba\u570b\u82f1\u6578A 10\uff0c\u4e26\u6709\u82f1\u6587+\u6578A 7\u3001\u570b\u6587 10\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 036.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/036.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A"], score: "10", label: "\u570b\u6587+\u82f1\u6587+\u6578A 10" },
      { rank: 2, subjects: ["\u82f1\u6587", "\u6578A"], score: "7", label: "\u82f1\u6587+\u6578A 7" },
      { rank: 3, subjects: ["\u570b\u6587"], score: "10", label: "\u570b\u6587 10" },
    ],
  },
  {
    recordId: "114-personal_application-100072-114_apply",
    programCode: "100072",
    schoolName: "\u570b\u7acb\u5609\u7fa9\u5927\u5b78",
    departmentName: "\u61c9\u7528\u6b77\u53f2\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u7b2c\u4e00\u9806\u4f4d\u70ba\u570b\u793e 20\uff0c\u4e26\u6709\u570b\u6587 10\u3001\u793e\u6703 13\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 100.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/100.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u793e\u6703"], score: "20", label: "\u570b\u6587+\u793e\u6703 20" },
      { rank: 2, subjects: ["\u570b\u6587"], score: "10", label: "\u570b\u6587 10" },
      { rank: 3, subjects: ["\u793e\u6703"], score: "13", label: "\u793e\u6703 13" },
    ],
  },
  {
    recordId: "114-personal_application-100402-114_apply",
    programCode: "100402",
    schoolName: "\u570b\u7acb\u5609\u7fa9\u5927\u5b78",
    departmentName: "\u7378\u91ab\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u7b2c\u4e00\u9806\u4f4d\u70ba\u570b\u82f1\u6578A\u81ea 50\uff0c\u4e26\u6709\u82f1\u6587 13\u3001\u81ea\u7136 13\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 100.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/100.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "50", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 50" },
      { rank: 2, subjects: ["\u82f1\u6587"], score: "13", label: "\u82f1\u6587 13" },
      { rank: 3, subjects: ["\u81ea\u7136"], score: "13", label: "\u81ea\u7136 13" },
    ],
  },
  {
    recordId: "114-personal_application-101072-114_apply",
    programCode: "101072",
    schoolName: "\u570b\u7acb\u9ad8\u96c4\u5927\u5b78",
    departmentName: "\u653f\u6cbb\u6cd5\u5f8b\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u7b2c\u4e00\u9806\u4f4d\u70ba\u570b\u82f1\u793e 32\uff0c\u4e26\u6709\u570b\u6587+\u793e\u6703 23\u3001\u82f1\u6587 10\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 101.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/101.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u793e\u6703"], score: "32", label: "\u570b\u6587+\u82f1\u6587+\u793e\u6703 32" },
      { rank: 2, subjects: ["\u570b\u6587", "\u793e\u6703"], score: "23", label: "\u570b\u6587+\u793e\u6703 23" },
      { rank: 3, subjects: ["\u82f1\u6587"], score: "10", label: "\u82f1\u6587 10" },
    ],
  },
  {
    recordId: "114-personal_application-108032-114_apply",
    programCode: "108032",
    schoolName: "\u6148\u6fdf\u5927\u5b78",
    departmentName: "\u85e5\u5b78\u7cfb",
    issue: "\u5b98\u65b9\u5716\u7b2c\u4e00\u9806\u4f4d\u70ba\u6578A 11\uff0c\u7b2c\u4e8c\u9806\u4f4d\u70ba\u570b\u82f1\u6578A\u81ea 51\uff0c\u7b2c\u4e09\u9806\u4f4d\u70ba\u81ea\u7136 13\u3002",
    evidence: "\u622a\u5716 114 \u500b\u7533\u7be9\u9078\u7d50\u679c 108.png",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/108.png",
    correctedRankedItems: [
      { rank: 1, subjects: ["\u6578A"], score: "11", label: "\u6578A 11" },
      { rank: 2, subjects: ["\u570b\u6587", "\u82f1\u6587", "\u6578A", "\u81ea\u7136"], score: "51", label: "\u570b\u6587+\u82f1\u6587+\u6578A+\u81ea\u7136 51" },
      { rank: 3, subjects: ["\u81ea\u7136"], score: "13", label: "\u81ea\u7136 13" },
    ],
  },
];

const MANUAL_CORRECTION_MAP = new Map(MANUAL_CORRECTIONS.map((item) => [item.recordId, item]));
const APPLY114_SIEVE_IMAGE_BASE_URL = "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict";
const AUTO_CONFIRMED_OFFICIAL_EMPTY_MARKERS = [
  "\u5e0c\u671b\u7d44",
  "\u98db\u9cf6\u7d44",
  "\u6668\u5149\u62db\u751f",
  "\u8208\u7ffc\u62db\u751f",
  "\u65ed\u65e5\u62db\u751f",
  "\u653f\u661f\u62db\u751f",
  "\u5c6f\u8499-",
  "\u5c55\u7fc5",
];
const YOUTH_ACCOUNT_MARKER = "\u9752\u5e74\u5132\u84c4\u5e33\u6236\u7d44";
const PUBLIC_FUND_MARKER = "\u516c\u8cbb\u751f";
const CONFIRMED_OFFICIAL_EMPTY_RESULTS = [
  {
    recordId: "114-personal_application-099142-114_apply",
    programCode: "099142",
    schoolCode: "099",
    schoolName: "\u570b\u7acb\u81fa\u5317\u5927\u5b78",
    departmentName: "\u7d71\u8a08\u5b78\u7cfb(\u98db\u9cf6\u7d44)",
    reason: "\u5b98\u65b9 114 \u500b\u7533\u7be9\u9078\u7d50\u679c\u5716\u8a72\u5217\u7be9\u9078\u9806\u4f4d\u5168\u7a7a\u767d\uff0c\u8996\u70ba\u5f9e\u7f3a\u3002",
    sourceImageUrl: "https://www.cac.edu.tw/CacLink/apply114/114appLy_3Hd_SieVe_QueRy_9dS4cqa1g_Kp3z/html_sieve_114_Ja9z51F/Standard/report/pict/099.png",
  },
];

function officialApply114ImageUrl(schoolCode) {
  return `${APPLY114_SIEVE_IMAGE_BASE_URL}/${schoolCode}.png`;
}

function isAutoConfirmedOfficialEmptyCandidate(record) {
  if (!record || record.year !== 114 || record.channelKey !== "personal_application") return false;
  if (MANUAL_CORRECTION_MAP.has(record.id)) return false;
  if ((record.applySieveResult?.rankedItems || []).length > 0) return false;
  if (record.applySieveResult?.sieveResultStandard || record.applySieveResult?.sieveResultRaw) return false;
  return AUTO_CONFIRMED_OFFICIAL_EMPTY_MARKERS.some((marker) => String(record.departmentName || "").includes(marker));
}

function buildConfirmedOfficialEmptyLookup(records) {
  const explicit = CONFIRMED_OFFICIAL_EMPTY_RESULTS.map((item) => ({
    ...item,
    sourceImageUrl: item.sourceImageUrl || officialApply114ImageUrl(item.schoolCode),
  }));
  const explicitIds = new Set(explicit.map((item) => item.recordId));
  const publicFundBySchool = new Map();
  records
    .filter((record) => record.year === 114 && record.channelKey === "personal_application" && String(record.departmentName || "").includes(PUBLIC_FUND_MARKER))
    .forEach((record) => {
      const current = publicFundBySchool.get(record.schoolCode) || { total: 0, blank: 0 };
      current.total += 1;
      if ((record.applySieveResult?.rankedItems || []).length === 0 && !record.applySieveResult?.sieveResultStandard && !record.applySieveResult?.sieveResultRaw) current.blank += 1;
      publicFundBySchool.set(record.schoolCode, current);
    });
  const auto = records
    .filter((record) => {
      if (explicitIds.has(record.id)) return false;
      if (isAutoConfirmedOfficialEmptyCandidate(record)) return true;
      if (!record || record.year !== 114 || record.channelKey !== "personal_application") return false;
      if (MANUAL_CORRECTION_MAP.has(record.id)) return false;
      if ((record.applySieveResult?.rankedItems || []).length > 0) return false;
      if (record.applySieveResult?.sieveResultStandard || record.applySieveResult?.sieveResultRaw) return false;
      const departmentName = String(record.departmentName || "");
      if (departmentName.includes(YOUTH_ACCOUNT_MARKER)) return true;
      if (departmentName.includes(PUBLIC_FUND_MARKER)) {
        const stats = publicFundBySchool.get(record.schoolCode);
        return Boolean(stats && stats.total > 0 && stats.total === stats.blank);
      }
      return false;
    })
    .map((record) => ({
      recordId: record.id,
      programCode: record.programCode,
      schoolCode: record.schoolCode,
      schoolName: record.schoolName,
      departmentName: record.departmentName,
      reason: String(record.departmentName || "").includes(YOUTH_ACCOUNT_MARKER)
        ? "官方 114 個申篩選結果該青年儲蓄帳戶組列全空白，且沒有任何 OCR 讀值，視為從缺。"
        : String(record.departmentName || "").includes(PUBLIC_FUND_MARKER)
          ? "官方 114 個申篩選結果該校公費生列全空白，且沒有任何 OCR 讀值，視為從缺。"
          : "官方 114 個申篩選結果該特殊招生列全空白，且沒有任何 OCR 讀值，視為從缺。",
      sourceImageUrl: officialApply114ImageUrl(record.schoolCode),
    }));
  return new Map([...explicit, ...auto].map((item) => [item.recordId, item]));
}

function numericScore(value) {
  const match = String(value?.score ?? value ?? "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index];
}

function schoolTier(record) {
  if (TOP_SCHOOL_NAMES.includes(record.schoolName)) return "top";
  if (/^(國立|臺北市立|台北市立|高雄市立)/.test(record.schoolName || "")) return "public";
  return "private";
}

function tierWeight(tier) {
  return tier === "top" ? 18 : tier === "public" ? 10 : 0;
}

function subjectCountWeight(subjectCount) {
  return Math.max(0, subjectCount - 1) * 6;
}

function sameSchoolPriority(record) {
  if (SPECIAL_SCHOOL_ORDER.has(record.schoolName)) return 24 - SPECIAL_SCHOOL_ORDER.get(record.schoolName);
  return 0;
}

function hasOfficialRankedResult(record) {
  return (Array.isArray(record.applySieveResult?.rankedItems) && record.applySieveResult.rankedItems.length > 0)
    || (Array.isArray(MANUAL_CORRECTION_MAP.get(record.id)?.correctedRankedItems)
      && MANUAL_CORRECTION_MAP.get(record.id).correctedRankedItems.length > 0);
}

function hasConfirmedOfficialEmptyResult(record, confirmedOfficialEmptyLookup) {
  return confirmedOfficialEmptyLookup.has(record.id);
}

function hasAnyOfficialResult(record, confirmedOfficialEmptyLookup) {
  return hasOfficialRankedResult(record)
    || hasConfirmedOfficialEmptyResult(record, confirmedOfficialEmptyLookup)
    || Boolean(record.applySieveResult?.sieveResultStandard)
    || (Array.isArray(record.applySieveResult?.sieveResultItems) && record.applySieveResult.sieveResultItems.length > 0);
}

function buildComparableStats(records) {
  const sameSchool = new Map();
  const sameTier = new Map();
  records.forEach((record) => {
    (record.applySieveResult?.rankedItems || []).forEach((item) => {
      const score = numericScore(item);
      const subjectCount = item.subjects?.length || 0;
      if (!score || subjectCount < 2) return;
      const schoolKey = `${record.schoolName}|${subjectCount}`;
      const tierKey = `${schoolTier(record)}|${subjectCount}`;
      if (!sameSchool.has(schoolKey)) sameSchool.set(schoolKey, []);
      if (!sameTier.has(tierKey)) sameTier.set(tierKey, []);
      sameSchool.get(schoolKey).push(score);
      sameTier.get(tierKey).push(score);
    });
  });
  return { sameSchool, sameTier };
}

function analyzeCombinedItem(record, item, stats) {
  const score = numericScore(item);
  const subjectCount = item.subjects?.length || 0;
  if (!score || subjectCount < 2) return null;

  const tier = schoolTier(record);
  const singles = (record.applySieveResult?.rankedItems || []).filter((candidate) => (candidate.subjects?.length || 0) === 1);
  const itemSubjects = new Set(item.subjects || []);
  const overlappingSingles = singles
    .filter((single) => itemSubjects.has(single.subjects?.[0]))
    .map((single) => ({ subject: single.subjects?.[0], score: numericScore(single) }))
    .filter((single) => single.score !== null);
  const maxSingle = overlappingSingles.reduce((max, current) => Math.max(max, current.score), -Infinity);

  const schoolValues = stats.sameSchool.get(`${record.schoolName}|${subjectCount}`) || [];
  const tierValues = stats.sameTier.get(`${tier}|${subjectCount}`) || [];
  const basis = schoolValues.length >= 4 ? "same_school" : "tier";
  const basisValues = basis === "same_school" ? schoolValues : tierValues;
  const basisMedian = median(basisValues);
  const basisP25 = percentile(basisValues, 0.25);
  const ratio = basisMedian ? Number((score / basisMedian).toFixed(2)) : null;

  const reasons = [];
  let anomalyScore = 0;

  const overlapTolerance = subjectCount >= 4 ? 3 : subjectCount === 3 ? 2 : 1;
  if (Number.isFinite(maxSingle) && score <= maxSingle + overlapTolerance) {
    const singleLabel = overlappingSingles.find((single) => single.score === maxSingle);
    reasons.push(`多科合計 ${score} 幾乎貼近單科 ${singleLabel?.subject || ""} ${maxSingle}，疑似把單科分數讀成合計`);
    anomalyScore += 42 + subjectCountWeight(subjectCount);
  }

  if (basisMedian && ratio !== null && ratio <= 0.58) {
    reasons.push(`${basis === "same_school" ? "同校" : "同層級"} ${subjectCount} 科合計中位數約 ${basisMedian}，目前 ${score} 明顯偏低`);
    anomalyScore += ratio <= 0.45 ? 28 : 18;
  }

  if (basisP25 && score < basisP25 * 0.62) {
    reasons.push(`${basis === "same_school" ? "同校" : "同層級"}第 25 百分位約 ${basisP25}，目前值落差過大`);
    anomalyScore += 12;
  }

  if (!reasons.length) return null;

  anomalyScore += tierWeight(tier) + sameSchoolPriority(record);
  const risk = anomalyScore >= 58 ? "high" : "medium";

  return {
    recordId: record.id,
    year: record.year,
    programCode: record.programCode,
    schoolCode: record.schoolCode,
    schoolName: record.schoolName,
    departmentName: record.departmentName,
    tier,
    risk,
    rank: item.rank,
    subjects: item.subjects || [],
    subjectCount,
    rawScore: String(item.score),
    rawLabel: item.label || `${(item.subjects || []).join("+")} ${item.score}`,
    reason: reasons.join("；"),
    anomalyScore,
    reviewAction: "先看官方圖",
    context: {
      basis,
      sampleSize: basisValues.length,
      median: basisMedian,
      p25: basisP25,
      ratio,
    },
    sourceImageUrl: record.applySieveResult?.sourceImageUrl || "",
    sourceUrl: record.sourceUrl || "",
    detailUrl: record.detailUrl || "",
  };
}

function buildAnomalies(records) {
  const stats = buildComparableStats(records);
  const anomalies = [];

  records.forEach((record) => {
    (record.applySieveResult?.rankedItems || []).forEach((item) => {
      const anomaly = analyzeCombinedItem(record, item, stats);
      if (anomaly) anomalies.push(anomaly);
    });
  });

  const correctionIds = new Set(MANUAL_CORRECTIONS.map((item) => item.recordId));
  MANUAL_CORRECTIONS.forEach((correction) => {
    if (anomalies.some((item) => item.recordId === correction.recordId && item.rank === 1)) return;
    anomalies.push({
      recordId: correction.recordId,
      year: 114,
      programCode: correction.programCode,
      schoolCode: "006",
      schoolName: correction.schoolName,
      departmentName: correction.departmentName,
      tier: "top",
      risk: "high",
      rank: 1,
      subjects: correction.correctedRankedItems[0].subjects,
      subjectCount: correction.correctedRankedItems[0].subjects.length,
      rawScore: "12",
      rawLabel: "國文+英文+數B+社會 12",
      reason: correction.issue,
      anomalyScore: 100,
      reviewAction: "已人工修正",
      context: {
        basis: "manual_verified",
        sampleSize: 1,
        median: null,
        p25: null,
        ratio: null,
      },
      sourceImageUrl: correction.sourceImageUrl,
      sourceUrl: "",
      detailUrl: "",
      manualCorrectionApplied: true,
    });
  });

  return anomalies
    .map((item) => ({
      ...item,
      manualCorrectionApplied: item.manualCorrectionApplied || correctionIds.has(item.recordId),
    }))
    .sort((a, b) => {
      const riskOrder = { high: 0, medium: 1 };
      return (riskOrder[a.risk] ?? 9) - (riskOrder[b.risk] ?? 9)
        || (b.anomalyScore || 0) - (a.anomalyScore || 0)
        || String(a.schoolCode || "").localeCompare(String(b.schoolCode || ""), "en")
        || String(a.programCode || "").localeCompare(String(b.programCode || ""), "en");
    });
}

function buildCoverageBySchool(records, confirmedOfficialEmptyLookup) {
  const map = new Map();
  records.forEach((record) => {
    const current = map.get(record.schoolName) || {
      schoolCode: record.schoolCode,
      schoolName: record.schoolName,
      total: 0,
      officialResultCount: 0,
      missingOfficialResultCount: 0,
      tier: schoolTier(record),
    };
    current.total += 1;
    if (hasOfficialRankedResult(record) || hasConfirmedOfficialEmptyResult(record, confirmedOfficialEmptyLookup)) current.officialResultCount += 1;
    else current.missingOfficialResultCount += 1;
    map.set(record.schoolName, current);
  });

  return [...map.values()]
    .map((item) => ({
      ...item,
      officialResultCoverageRate: Number((item.officialResultCount / item.total).toFixed(3)),
    }))
    .sort((a, b) => a.officialResultCoverageRate - b.officialResultCoverageRate || tierWeight(b.tier) - tierWeight(a.tier) || b.total - a.total);
}

function buildMissingOfficialResults(records, confirmedOfficialEmptyLookup) {
  return records
    .filter((record) => !hasOfficialRankedResult(record) && !hasConfirmedOfficialEmptyResult(record, confirmedOfficialEmptyLookup))
    .map((record) => ({
      kind: "missing_official",
      recordId: record.id,
      programCode: record.programCode,
      schoolCode: record.schoolCode,
      schoolName: record.schoolName,
      departmentName: record.departmentName,
      category: record.category || "",
      tier: schoolTier(record),
      hasPartialResultText: hasAnyOfficialResult(record, confirmedOfficialEmptyLookup),
      reviewAction: hasAnyOfficialResult(record, confirmedOfficialEmptyLookup) ? "補正式結果" : "從缺待補",
      priorityScore: 40 + tierWeight(schoolTier(record)) + sameSchoolPriority(record),
      detailUrl: record.detailUrl || "",
      sourceUrl: record.sourceUrl || "",
    }))
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)
      || String(a.schoolCode || "").localeCompare(String(b.schoolCode || ""), "en")
      || String(a.programCode || "").localeCompare(String(b.programCode || ""), "en"));
}

function buildConfirmedOfficialEmptyResults(records, confirmedOfficialEmptyLookup) {
  return records
    .filter((record) => hasConfirmedOfficialEmptyResult(record, confirmedOfficialEmptyLookup))
    .map((record) => {
      const matched = confirmedOfficialEmptyLookup.get(record.id);
      return {
        kind: "official_empty",
        recordId: record.id,
        programCode: record.programCode,
        schoolCode: record.schoolCode,
        schoolName: record.schoolName,
        departmentName: record.departmentName,
        category: record.category || "",
        tier: schoolTier(record),
        reviewAction: "\u5b98\u65b9\u5f9e\u7f3a",
        reason: matched?.reason || "\u5b98\u65b9\u5716\u8a72\u5217\u7a7a\u767d\uff0c\u5df2\u78ba\u8a8d\u70ba\u5f9e\u7f3a\u3002",
        sourceImageUrl: matched?.sourceImageUrl || officialApply114ImageUrl(record.schoolCode),
      };
    })
    .sort((a, b) => String(a.schoolCode || "").localeCompare(String(b.schoolCode || ""), "en")
      || String(a.programCode || "").localeCompare(String(b.programCode || ""), "en"));
}

function buildMixedPublicFundSchools(records, confirmedOfficialEmptyLookup) {
  const publicFundRecords = records.filter((record) => String(record.departmentName || "").includes(PUBLIC_FUND_MARKER));
  const grouped = new Map();
  publicFundRecords.forEach((record) => {
    const current = grouped.get(record.schoolCode) || {
      schoolCode: record.schoolCode,
      schoolName: record.schoolName,
      total: 0,
      blankCount: 0,
      withDataCount: 0,
      blankRows: [],
      withDataRows: [],
    };
    current.total += 1;
    const isBlank = (record.applySieveResult?.rankedItems || []).length === 0
      && !record.applySieveResult?.sieveResultStandard
      && !record.applySieveResult?.sieveResultRaw;
    if (isBlank) {
      current.blankCount += 1;
      current.blankRows.push({
        recordId: record.id,
        programCode: record.programCode,
        departmentName: record.departmentName,
        confirmedOfficialEmpty: hasConfirmedOfficialEmptyResult(record, confirmedOfficialEmptyLookup),
      });
    } else {
      current.withDataCount += 1;
      current.withDataRows.push({
        recordId: record.id,
        programCode: record.programCode,
        departmentName: record.departmentName,
        rankedCount: (record.applySieveResult?.rankedItems || []).length,
        highlight: record.applySieveResult?.sieveResultStandard || "",
      });
    }
    grouped.set(record.schoolCode, current);
  });

  return [...grouped.values()]
    .filter((item) => item.blankCount > 0 && item.withDataCount > 0)
    .sort((a, b) => b.blankCount - a.blankCount
      || b.withDataCount - a.withDataCount
      || String(a.schoolCode || "").localeCompare(String(b.schoolCode || ""), "en"));
}

function buildReviewQueue(anomalies, missingOfficialResults) {
  const anomalyItems = anomalies
    .filter((item) => item.risk === "high")
    .map((item) => ({
      kind: "anomaly",
      recordId: item.recordId,
      programCode: item.programCode,
      schoolName: item.schoolName,
      departmentName: item.departmentName,
      priorityScore: item.anomalyScore,
      reviewAction: item.reviewAction,
      summary: item.rawLabel,
      reason: item.reason,
      sourceImageUrl: item.sourceImageUrl,
      sourceUrl: item.sourceUrl,
    }));

  const sortedAnomalies = anomalyItems
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)
      || String(a.programCode || "").localeCompare(String(b.programCode || ""), "en"));
  const sortedMissing = [...missingOfficialResults]
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)
      || String(a.programCode || "").localeCompare(String(b.programCode || ""), "en"));
  const reservedMissingCount = Math.min(8, sortedMissing.length);
  const anomalyCount = Math.min(30 - reservedMissingCount, sortedAnomalies.length);
  return [
    ...sortedAnomalies.slice(0, anomalyCount),
    ...sortedMissing.slice(0, reservedMissingCount),
  ].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0)
    || String(a.programCode || "").localeCompare(String(b.programCode || ""), "en"));
}

function main() {
  const allRecords = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
  const records = allRecords.filter((record) => record.year === 114 && record.channelKey === "personal_application");
  const confirmedOfficialEmptyLookup = buildConfirmedOfficialEmptyLookup(records);
  const officialResultCount = records.filter((record) => hasOfficialRankedResult(record) || hasConfirmedOfficialEmptyResult(record, confirmedOfficialEmptyLookup)).length;
  const anomalies = buildAnomalies(records);
  const missingOfficialResults = buildMissingOfficialResults(records, confirmedOfficialEmptyLookup);
  const confirmedOfficialEmptyResults = buildConfirmedOfficialEmptyResults(records, confirmedOfficialEmptyLookup);
  const mixedPublicFundSchools = buildMixedPublicFundSchools(records, confirmedOfficialEmptyLookup);
  const reviewQueue = buildReviewQueue(anomalies, missingOfficialResults);

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      year: 114,
      channelKey: "personal_application",
      channelLabel: "個人申請",
      totalRecords: records.length,
      officialResultCount,
      missingOfficialResultCount: records.length - officialResultCount,
      officialResultCoverageRate: Number((officialResultCount / records.length).toFixed(3)),
      anomalyCount: anomalies.length,
      highRiskCount: anomalies.filter((item) => item.risk === "high").length,
      manualCorrectionCount: MANUAL_CORRECTIONS.length,
      confirmedOfficialEmptyCount: confirmedOfficialEmptyResults.length,
    },
    qualityRules: [
      "多科合計不使用固定絕對門檻，先與同校、同科目數的合計分數比較。",
      "同校樣本不足時，改用學校層級（頂大、公立、私立）與同科目數比較。",
      "若多科合計幾乎貼近同筆資料中的單科分數，優先視為 OCR 錯位高風險。",
      "政大、台大等校的異常容忍度應更嚴格，私校則回到同校與同層級脈絡判讀。",
    ],
    manualCorrections: MANUAL_CORRECTIONS,
    anomalies,
    missingOfficialResults,
    confirmedOfficialEmptyResults,
    mixedPublicFundSchools,
    reviewQueue,
    coverageBySchool: buildCoverageBySchool(records, confirmedOfficialEmptyLookup),
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Wrote ${path.relative(root, outputPath)}`);
  console.log(report.summary);
}

main();
