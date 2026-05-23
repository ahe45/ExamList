const csvHeaderMap = Object.freeze({
  admission: "admission",
  designated_sort: "designatedSort",
  designatedsort: "designatedSort",
  admission_year: "admissionYear",
  admissionyear: "admissionYear",
  admission_code: "admissionCode",
  admissioncode: "admissionCode",
  application_no: "admissionCode",
  applicationno: "admissionCode",
  birth_date: "birthDate",
  birthdate: "birthDate",
  building: "building",
  building_code: "buildingCode",
  buildingcode: "buildingCode",
  campus: "campus",
  campus_code: "campusCode",
  campuscode: "campusCode",
  exam_date: "examDate",
  examdate: "examDate",
  exam_end_time: "endTime",
  examendtime: "endTime",
  end_time: "endTime",
  endtime: "endTime",
  examinee_no: "examineeNo",
  examineeno: "examineeNo",
  temporary_no: "temporaryNo",
  temporaryno: "temporaryNo",
  group: "groupName",
  group_name: "groupName",
  groupname: "groupName",
  major: "major",
  major_code: "majorCode",
  majorcode: "majorCode",
  name: "name",
  opt1: "opt1",
  opt2: "opt2",
  opt3: "opt3",
  opt4: "opt4",
  opt5: "opt5",
  period: "period",
  period_code: "periodCode",
  periodcode: "periodCode",
  photo_name: "photoName",
  photoname: "photoName",
  room: "room",
  room_code: "roomCode",
  roomcode: "roomCode",
  series: "series",
  series_code: "seriesCode",
  seriescode: "seriesCode",
  time: "time",
  track: "track",
  unit: "unit",
  unit_code: "unitCode",
  unitcode: "unitCode",
  opt_1: "opt1",
  opt_2: "opt2",
  opt_3: "opt3",
  opt_4: "opt4",
  opt_5: "opt5",
  건물: "building",
  고사건물: "building",
  고사건물명: "building",
  고사건물코드: "buildingCode",
  교시: "period",
  교시명: "period",
  교시코드: "periodCode",
  계열: "series",
  계열명: "series",
  계열코드: "seriesCode",
  고사실: "room",
  고사실명: "room",
  고사실코드: "roomCode",
  지정정렬: "designatedSort",
  모집년도: "admissionYear",
  모집연도: "admissionYear",
  캠퍼스: "campus",
  캠퍼스명: "campus",
  캠퍼스코드: "campusCode",
  사진: "photoName",
  사진파일: "photoName",
  생년월일: "birthDate",
  성명: "name",
  수험번호: "examineeNo",
  가번호: "temporaryNo",
  시험: "track",
  시험명: "track",
  시험일: "examDate",
  시험일자: "examDate",
  시험날짜: "examDate",
  시험시간: "time",
  시작시간: "time",
  종료시간: "endTime",
  끝시간: "endTime",
  시간: "time",
  전공: "major",
  전공명: "major",
  전공코드: "majorCode",
  전형: "admission",
  전형명: "admission",
  전형코드: "admissionCode",
  접수번호: "admissionCode",
  조: "groupName",
  모집단위: "unit",
  모집단위명: "unit",
  모집단위코드: "unitCode",
});

function parseCsvRows(csvText = "") {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(field);
      field = "";

      if (row.some((cell) => String(cell || "").trim())) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);

  if (row.some((cell) => String(cell || "").trim())) {
    rows.push(row);
  }

  return rows;
}

function normalizeCsvHeader(value) {
  return String(value || "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/\s+/g, "")
    .replace(/[().-]/g, "")
    .toLowerCase();
}

function parseCandidateCsv(csvText = "") {
  const rows = parseCsvRows(csvText);
  const [headerRow, ...dataRows] = rows;

  if (!headerRow?.length) {
    return [];
  }

  const mappedHeaders = headerRow.map((header) => csvHeaderMap[normalizeCsvHeader(header)] || "");

  return dataRows
    .map((row) => {
      const item = {};

      mappedHeaders.forEach((fieldName, index) => {
        if (fieldName) {
          item[fieldName] = String(row[index] || "").trim();
        }
      });

      return item;
    })
    .filter((item) => item.examineeNo || item.name || item.admissionCode);
}

module.exports = {
  csvHeaderMap,
  normalizeCsvHeader,
  parseCandidateCsv,
  parseCsvRows,
};
