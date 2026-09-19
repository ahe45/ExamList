const { getTemplateGenerationUnitFields } = require("../pdf-generations/generation-unit-fields");
const { getGenerationTargetStrategy } = require("../pdf-generations/targets");

const kyungheeCoverTagKey = "document.kyungheeCover";
const naturalOrder = new Intl.Collator("ko", { numeric: true, sensitivity: "variant" });

function text(value) {
  return String(value ?? "").trim();
}

function buildKyungheeCoverText(candidates = []) {
  const orderedCandidates = [...candidates].sort((left, right) => {
    const a = text(left.designatedSort);
    const b = text(right.designatedSort);
    if (!a || !b) return a ? -1 : b ? 1 : 0;
    return naturalOrder.compare(a, b);
  });
  const units = new Map();

  for (const candidate of orderedCandidates) {
    const code = text(candidate.unitCode || candidate.departmentCode);
    const name = text(candidate.unit || candidate.departmentName);
    const key = JSON.stringify(code ? ["code", code] : ["name", name]);
    if (!units.has(key)) units.set(key, { name: name || code || "미분류", first: "", last: "" });
    const unit = units.get(key);
    const number = text(candidate.examineeNo || candidate.examNo);
    if (!number) continue;
    if (!unit.first || naturalOrder.compare(number, unit.first) < 0) unit.first = number;
    if (!unit.last || naturalOrder.compare(number, unit.last) > 0) unit.last = number;
  }

  return [...units.values()]
    .map((unit) => `${unit.name}\n: ${unit.first ? `${unit.first} ~ ${unit.last}` : "수험번호 없음"}`)
    .join("\n\n");
}

function hasKyungheeCoverTag(template = {}) {
  return (template.layout?.pages || []).some((page) =>
    page.enabled !== false && JSON.stringify(page).includes(kyungheeCoverTagKey),
  );
}

function getScopeValue(candidate, field) {
  const aliases = {
    admission: ["admission", "admissionTypeName"],
    admissionCode: ["admissionCode", "admissionTypeCode"],
    building: ["building", "buildingName"],
    date: ["date", "examDate"],
    examDate: ["examDate", "date"],
    endTime: ["endTime", "examEndTime"],
    group: ["group", "groupName"],
    major: ["major", "majorName"],
    period: ["period", "periodName"],
    room: ["room", "roomName"],
    series: ["series", "seriesName"],
    time: ["time", "examStartTime"],
    track: ["track", "admissionRoundName", "examName"],
    unit: ["unit", "departmentName"],
    unitCode: ["unitCode", "departmentCode"],
  }[field] || [field];
  return aliases.map((key) => text(candidate[key])).find(Boolean) || "";
}

async function resolveKyungheeCoverText({ candidateService, template, filters, schoolId, candidatePayload, samplePage }) {
  const firstCandidate = candidatePayload.items?.[0];
  if (!firstCandidate || !hasKyungheeCoverTag(template)) return "";

  const strategy = getGenerationTargetStrategy(template.generationUnit, getTemplateGenerationUnitFields(template, []));
  const fields = strategy ? (Array.isArray(strategy.groupBy) ? strategy.groupBy : [strategy.groupBy]) : [];
  const scope = Object.fromEntries(fields.map((field) => [field, getScopeValue(firstCandidate, field)]));
  // Empty grouping values still define a group, even though the repository omits empty filters.
  const inScope = (candidate) => fields.every((field) => getScopeValue(candidate, field) === scope[field]);
  if (samplePage === 1 && candidatePayload.total <= candidatePayload.items.length) {
    return buildKyungheeCoverText(candidatePayload.items.filter(inScope));
  }

  const scopedFilters = {
    ...filters,
    ...Object.fromEntries(Object.entries(scope).filter(([, value]) => value)),
    schoolId,
    sortKey: "designatedSort",
    sortDirection: "asc",
    limit: 5000,
  };
  const firstPage = await candidateService.findCandidates({ ...scopedFilters, page: 1 });
  const candidates = [...firstPage.items.filter(inScope)];
  const pageSize = Number(firstPage.limit) || scopedFilters.limit;
  const pageCount = Math.ceil((Number(firstPage.total) || 0) / pageSize);
  for (let page = 2; page <= pageCount; page += 1) {
    const result = await candidateService.findCandidates({ ...scopedFilters, limit: pageSize, page });
    candidates.push(...result.items.filter(inScope));
  }
  return buildKyungheeCoverText(candidates);
}

module.exports = { buildKyungheeCoverText, hasKyungheeCoverTag, kyungheeCoverTagKey, resolveKyungheeCoverText };
