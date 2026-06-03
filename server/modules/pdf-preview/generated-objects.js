const {
  evaluateTokenExpression,
  isEmptyTemplateValue,
  resolveDataPathWithoutSampleData,
  splitTokenPipeline,
} = require("./token-expressions");
const { buildCode128Svg } = require("./code128");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createDocumentSvgDataUrl(svgMarkup) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(String(svgMarkup || ""))}`;
}

function buildDocumentGeneratedObjectSvg(objectType, objectValue) {
  const normalizedValue = String(objectValue || "").trim() || "123100001";

  if (objectType === "qrcode") {
    const gridSize = 21;
    const cellSize = 4;
    const svgSize = gridSize * cellSize;
    const finderCells = new Set();

    [[0, 0], [gridSize - 7, 0], [0, gridSize - 7]].forEach(([startX, startY]) => {
      for (let y = startY; y < startY + 7; y += 1) {
        for (let x = startX; x < startX + 7; x += 1) {
          const isOuter = x === startX || x === startX + 6 || y === startY || y === startY + 6;
          const isInner = x >= startX + 2 && x <= startX + 4 && y >= startY + 2 && y <= startY + 4;

          if (isOuter || isInner) {
            finderCells.add(`${x}:${y}`);
          }
        }
      }
    });

    const contentCells = [];

    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        if (finderCells.has(`${x}:${y}`)) {
          continue;
        }

        const seed = normalizedValue.charCodeAt((x * 7 + y * 11) % normalizedValue.length) || 0;

        if ((seed + x * 3 + y * 5) % 7 < 3) {
          contentCells.push(
            `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#111827" />`,
          );
        }
      }
    }

    const finderMarkup = Array.from(finderCells)
      .map((cellKey) => {
        const [x, y] = cellKey.split(":").map(Number);

        return `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="#111827" />`;
      })
      .join("");

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" fill="none">
        <rect width="${svgSize}" height="${svgSize}" fill="#ffffff"/>
        ${finderMarkup}
        ${contentCells.join("")}
      </svg>
    `;
  }

  return buildCode128Svg(normalizedValue);
}

function replaceOrAppendHtmlAttribute(markup, attributeName, attributeValue) {
  const attributePattern = new RegExp(`\\s${attributeName}=(['"]).*?\\1`, "i");

  if (attributePattern.test(markup)) {
    return markup.replace(attributePattern, ` ${attributeName}="${attributeValue}"`);
  }

  return markup.replace(/<img\b/i, `<img ${attributeName}="${attributeValue}"`);
}

const generatedObjectSourceLabelMap = Object.freeze({
  "candidate.admissionRoundName": "모집시기",
  "candidate.applicationNo": "전형코드",
  "candidate.admissionTypeCode": "전형코드",
  "candidate.admissionTypeName": "전형명",
  "candidate.admissionYear": "학년도",
  "candidate.birthDate": "생년월일",
  "candidate.buildingCode": "고사건물코드",
  "candidate.buildingName": "고사건물명",
  "candidate.campusCode": "캠퍼스코드",
  "candidate.campusName": "캠퍼스명",
  "candidate.departmentCode": "모집단위코드",
  "candidate.departmentName": "모집단위명",
  "candidate.designatedSort": "지정정렬",
  "candidate.examDate": "시험날짜",
  "candidate.examName": "모집시기",
  "candidate.examEndTime": "종료시간",
  "candidate.examNo": "수험번호",
  "candidate.examStartTime": "시작시간",
  "candidate.groupName": "조",
  "candidate.majorCode": "전공코드",
  "candidate.majorName": "전공명",
  "candidate.name": "이름",
  "candidate.opt1": "OPT1",
  "candidate.opt2": "OPT2",
  "candidate.opt3": "OPT3",
  "candidate.opt4": "OPT4",
  "candidate.opt5": "OPT5",
  "candidate.periodCode": "교시코드",
  "candidate.periodName": "교시명",
  "candidate.photo": "수험생 사진",
  "candidate.roomCode": "고사실코드",
  "candidate.roomId": "고사실코드",
  "candidate.roomName": "고사실명",
  "room.assignedCount": "배정인원",
  "room.otherRoom": "타고사실",
  "candidate.seriesCode": "계열코드",
  "candidate.seriesName": "계열명",
  "candidate.temporaryNo": "가번호",
  "school.academicYear": "학년도",
  "school.code": "학교코드",
  "school.name": "학교명",
});

const generatedObjectSourceAliasMap = Object.freeze({
  admissionYear: "candidate.admissionYear",
  designatedSort: "candidate.designatedSort",
  examNo: "candidate.examNo",
  examineeNo: "candidate.examNo",
  temporaryNo: "candidate.temporaryNo",
  name: "candidate.name",
  birth: "candidate.birthDate",
  time: "candidate.examStartTime",
  session: "candidate.examStartTime",
  endTime: "candidate.examEndTime",
  examEndTime: "candidate.examEndTime",
  exam: "candidate.examName",
  track: "candidate.examName",
  campus: "candidate.campusName",
  campusCode: "candidate.campusCode",
  admission: "candidate.admissionTypeName",
  admissionCode: "candidate.admissionTypeCode",
  series: "candidate.seriesName",
  seriesCode: "candidate.seriesCode",
  unit: "candidate.departmentName",
  unitCode: "candidate.departmentCode",
  major: "candidate.majorName",
  majorCode: "candidate.majorCode",
  building: "candidate.buildingName",
  buildingCode: "candidate.buildingCode",
  room: "candidate.roomName",
  roomCode: "candidate.roomCode",
  assignedCount: "room.assignedCount",
  "room.count": "room.assignedCount",
  otherRoom: "room.otherRoom",
  period: "candidate.periodName",
  periodCode: "candidate.periodCode",
  photo: "candidate.photo",
  photoUrl: "candidate.photo",
  photoFileId: "candidate.photo",
  opt1: "candidate.opt1",
  opt2: "candidate.opt2",
  opt3: "candidate.opt3",
  opt4: "candidate.opt4",
  opt5: "candidate.opt5",
  group: "candidate.groupName",
});

function normalizeGeneratedObjectSourcePath(sourcePath) {
  const normalizedSourcePath = String(sourcePath || "").trim();

  return generatedObjectSourceAliasMap[normalizedSourcePath] || normalizedSourcePath || "candidate.examNo";
}

function normalizeGeneratedObjectSourceExpression(sourceExpression) {
  const pipelineParts = splitTokenPipeline(sourceExpression);
  const sourcePath = normalizeGeneratedObjectSourcePath(pipelineParts[0]);

  return [sourcePath, ...pipelineParts.slice(1)].join(" | ");
}

function getGeneratedObjectSourceLabel(sourceKey) {
  const [sourcePath] = splitTokenPipeline(sourceKey);
  const normalizedSourceKey = normalizeGeneratedObjectSourcePath(sourcePath);

  return generatedObjectSourceLabelMap[normalizedSourceKey] || normalizedSourceKey || "데이터";
}

function shouldSuppressGeneratedObjectForEmptySource(objectSource, context, options = {}) {
  if (options.suppressEmptyGeneratedObjects !== true) {
    return false;
  }

  const [sourcePath] = splitTokenPipeline(objectSource);

  return isEmptyTemplateValue(resolveDataPathWithoutSampleData(context, sourcePath));
}

function replaceTemplateGeneratedObjectImagesInHtml(text, context, options = {}) {
  return String(text || "").replace(
    /<img\b[^>]*data-template-object-type=(['"])(.*?)\1[^>]*>/gi,
    (matchedMarkup, _quote, objectTypeValue) => {
      const matchedSource = matchedMarkup.match(/\sdata-template-object-source=(['"])(.*?)\1/i);
      const normalizedType = String(objectTypeValue || "").trim().toLowerCase() === "qrcode" ? "qrcode" : "barcode";
      const objectSource = normalizeGeneratedObjectSourceExpression(matchedSource?.[2] || "candidate.examNo");

      if (shouldSuppressGeneratedObjectForEmptySource(objectSource, context, options)) {
        return "";
      }

      const objectValue = String(evaluateTokenExpression(objectSource, context) || "").trim();

      if (options.suppressEmptyGeneratedObjects === true && !objectValue) {
        return "";
      }

      const normalizedObjectValue = objectValue || "123100001";
      const objectLabel = `${getGeneratedObjectSourceLabel(objectSource)} ${normalizedType === "qrcode" ? "QR코드" : "바코드"}`;
      const sourceUrl = createDocumentSvgDataUrl(buildDocumentGeneratedObjectSvg(normalizedType, normalizedObjectValue));

      return replaceOrAppendHtmlAttribute(
        replaceOrAppendHtmlAttribute(
          replaceOrAppendHtmlAttribute(matchedMarkup, "alt", escapeHtml(objectLabel)),
          "title",
          escapeHtml(objectLabel),
        ),
        "src",
        escapeHtml(sourceUrl),
      );
    },
  );
}

module.exports = {
  buildDocumentGeneratedObjectSvg,
  replaceTemplateGeneratedObjectImagesInHtml,
};
