const ExcelJS = require("exceljs");

const accountWorkbookColumns = Object.freeze([
  Object.freeze({
    aliases: ["아이디", "계정ID", "계정 ID", "계정아이디", "userId", "username", "id"],
    header: "아이디",
    key: "userId",
    required: true,
    width: 22,
  }),
  Object.freeze({
    aliases: ["이름", "사용자명", "계정명", "userName", "name", "displayName"],
    header: "이름",
    key: "userName",
    required: true,
    width: 22,
  }),
  Object.freeze({
    aliases: ["비밀번호", "password", "passwd"],
    header: "비밀번호",
    key: "password",
    required: false,
    width: 22,
  }),
  Object.freeze({
    aliases: ["권한", "역할", "role"],
    header: "권한",
    key: "role",
    required: false,
    width: 18,
  }),
]);

const roleAliasMap = Object.freeze({
  admin: "admin",
  "관리자": "admin",
  super_admin: "super_admin",
  superadmin: "super_admin",
  "슈퍼 관리자": "super_admin",
  "슈퍼관리자": "super_admin",
  "최고 관리자": "super_admin",
  "최고관리자": "super_admin",
  user: "user",
  "사용자": "user",
});

function normalizeHeader(value = "") {
  return String(value || "").trim().replace(/\s+/g, "").toLowerCase();
}

function extractExcelCellValue(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "object") {
    if (typeof value.text === "string") {
      return value.text;
    }

    if (Array.isArray(value.richText)) {
      return value.richText.map((segment) => segment?.text || "").join("");
    }

    if (value.result != null) {
      return extractExcelCellValue(value.result);
    }

    if (value.hyperlink) {
      return String(value.text || value.hyperlink || "");
    }
  }

  return "";
}

function getExcelCellText(cell) {
  return extractExcelCellValue(cell?.value).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function normalizeRole(value = "") {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "admin";
  }

  const normalizedValue = normalizeHeader(rawValue);

  return roleAliasMap[rawValue] || roleAliasMap[normalizedValue] || "";
}

function createAccountWorkbookService({ createHttpError }) {
  function createServiceError(statusCode, message, errorCode) {
    if (typeof createHttpError === "function") {
      return createHttpError(statusCode, message, errorCode);
    }

    return Object.assign(new Error(message), { errorCode, statusCode });
  }

  function resolveHeaderMap(headerRow) {
    const headerMap = new Map();

    headerRow.eachCell((cell, columnIndex) => {
      const normalizedHeader = normalizeHeader(getExcelCellText(cell));

      if (normalizedHeader) {
        headerMap.set(normalizedHeader, columnIndex);
      }
    });

    return Object.fromEntries(
      accountWorkbookColumns.map((column) => {
        const columnIndex = column.aliases
          .map(normalizeHeader)
          .map((alias) => headerMap.get(alias))
          .find((index) => Number(index) > 0) || -1;

        if (column.required && columnIndex < 1) {
          throw createServiceError(400, `${column.header} 컬럼을 찾을 수 없습니다.`, "ACCOUNT_WORKBOOK_HEADER_REQUIRED");
        }

        return [column.key, columnIndex];
      }),
    );
  }

  function normalizeWorkbookRow(rawRow = {}, rowNumber) {
    const userId = String(rawRow.userId || "").trim();
    const userName = String(rawRow.userName || "").trim();
    const role = normalizeRole(rawRow.role);

    if (!userId && !userName && !String(rawRow.password || "").trim() && !String(rawRow.role || "").trim()) {
      return null;
    }

    if (!userId) {
      throw createServiceError(400, `아이디 값을 입력하세요. (${rowNumber}행)`, "ACCOUNT_WORKBOOK_USER_ID_REQUIRED");
    }

    if (!userName) {
      throw createServiceError(400, `이름 값을 입력하세요. (${rowNumber}행)`, "ACCOUNT_WORKBOOK_USER_NAME_REQUIRED");
    }

    if (!role) {
      throw createServiceError(400, `권한 값이 올바르지 않습니다. (${rowNumber}행)`, "ACCOUNT_WORKBOOK_ROLE_INVALID");
    }

    return {
      password: String(rawRow.password || ""),
      role,
      rowNumber,
      userId,
      userName,
    };
  }

  async function buildAccountTemplateBuffer() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("계정등록", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = accountWorkbookColumns.map((column) => ({
      header: column.header,
      key: column.key,
      style: { numFmt: "@" },
      width: column.width,
    }));
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      fgColor: { argb: "FFF4F7FB" },
      pattern: "solid",
      type: "pattern",
    };

    const guideSheet = workbook.addWorksheet("작성방법");
    guideSheet.columns = [
      { header: "항목", key: "field", width: 18 },
      { header: "설명", key: "description", width: 70 },
    ];
    guideSheet.addRows([
      { field: "아이디", description: "로그인에 사용할 계정 ID입니다. 필수입니다." },
      { field: "이름", description: "계정 목록과 로그인 상태에 표시할 이름입니다. 필수입니다." },
      { field: "비밀번호", description: "신규 계정은 필수입니다. 기존 계정은 비워두면 기존 비밀번호를 유지합니다." },
      { field: "권한", description: "슈퍼 관리자, 관리자, 사용자 중 하나를 입력합니다. 비워두면 관리자로 등록합니다." },
    ]);
    guideSheet.getRow(1).font = { bold: true };

    return workbook.xlsx.writeBuffer();
  }

  async function parseAccountWorkbook(fileContentBase64) {
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.load(Buffer.from(String(fileContentBase64 || ""), "base64"));

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw createServiceError(400, "엑셀 파일에서 시트를 찾을 수 없습니다.", "ACCOUNT_WORKBOOK_EMPTY");
    }

    const headerMap = resolveHeaderMap(worksheet.getRow(1));
    const rows = [];
    const seenUserIds = new Set();

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      const normalizedRow = normalizeWorkbookRow(
        Object.fromEntries(
          accountWorkbookColumns.map((column) => [
            column.key,
            headerMap[column.key] > 0 ? getExcelCellText(row.getCell(headerMap[column.key])) : "",
          ]),
        ),
        rowNumber,
      );

      if (!normalizedRow) {
        return;
      }

      const userIdKey = normalizedRow.userId.toLowerCase();

      if (seenUserIds.has(userIdKey)) {
        throw createServiceError(400, `아이디가 중복되었습니다. (${rowNumber}행)`, "ACCOUNT_WORKBOOK_DUPLICATE_USER_ID");
      }

      seenUserIds.add(userIdKey);
      rows.push(normalizedRow);
    });

    if (!rows.length) {
      throw createServiceError(400, "업로드할 계정 데이터가 없습니다.", "ACCOUNT_WORKBOOK_NO_ROWS");
    }

    return rows;
  }

  return Object.freeze({
    buildAccountTemplateBuffer,
    parseAccountWorkbook,
  });
}

module.exports = {
  createAccountWorkbookService,
};
