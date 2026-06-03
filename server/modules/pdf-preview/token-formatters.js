function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateValue(value, separator = ".") {
  if (!value) {
    return "";
  }

  const sourceValue =
    value instanceof Date ? value.toISOString().slice(0, 10) : String(value).trim();
  const matchedDate = sourceValue.match(/^(\d{4})[-./](\d{2})[-./](\d{2})$/);

  if (matchedDate) {
    return `${matchedDate[1]}${separator}${matchedDate[2]}${separator}${matchedDate[3]}`;
  }

  return sourceValue;
}

function formatDateTimeValue(value) {
  if (!value) {
    return "";
  }

  const dateValue = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return String(value);
  }

  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  const hours = String(dateValue.getHours()).padStart(2, "0");
  const minutes = String(dateValue.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function parseDateLikeValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const sourceValue = String(value).trim();
  const matchedDateTime = sourceValue.match(
    /^(\d{4})[-./](\d{2})[-./](\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  if (!matchedDateTime) {
    const parsedDate = new Date(sourceValue);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  return new Date(
    Number(matchedDateTime[1]),
    Number(matchedDateTime[2]) - 1,
    Number(matchedDateTime[3]),
    Number(matchedDateTime[4]) || 0,
    Number(matchedDateTime[5]) || 0,
    Number(matchedDateTime[6]) || 0,
  );
}

function formatDatePattern(value, pattern = "YYYY.MM.DD") {
  const dateValue = parseDateLikeValue(value);

  if (!dateValue) {
    return normalizeDisplayValue(value);
  }

  const replacements = {
    DD: String(dateValue.getDate()).padStart(2, "0"),
    HH: String(dateValue.getHours()).padStart(2, "0"),
    MM: String(dateValue.getMonth() + 1).padStart(2, "0"),
    YYYY: String(dateValue.getFullYear()),
    mm: String(dateValue.getMinutes()).padStart(2, "0"),
  };

  return String(pattern || "YYYY.MM.DD").replace(/YYYY|MM|DD|HH|mm/g, (token) => replacements[token] || token);
}

function formatPhoneValue(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("02")) {
    if (digits.length === 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }

    if (digits.length === 10) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  return String(value || "");
}

function formatNumberValue(value) {
  const numericValue = Number(String(value ?? "").replaceAll(",", ""));

  if (!Number.isFinite(numericValue)) {
    return normalizeDisplayValue(value);
  }

  return numericValue.toLocaleString("ko-KR");
}

function maskGenericValue(value) {
  const sourceValue = String(value ?? "").trim();

  if (!sourceValue) {
    return "";
  }

  if (sourceValue.length === 1) {
    return "*";
  }

  if (sourceValue.length === 2) {
    return `${sourceValue.slice(0, 1)}*`;
  }

  return `${sourceValue.slice(0, 1)}${"*".repeat(sourceValue.length - 2)}${sourceValue.slice(-1)}`;
}

function maskNameValue(value) {
  return String(value ?? "")
    .split(/(\s+)/)
    .map((part) => (part.trim() ? maskGenericValue(part) : part))
    .join("");
}

function maskPhoneValue(value) {
  const formattedPhone = formatPhoneValue(value);

  if (!formattedPhone) {
    return "";
  }

  return formattedPhone.replace(/\d(?=(?:\D*\d){4})/g, "*");
}

function maskBirthDateValue(value) {
  const formattedDate = formatDateValue(value, ".");
  const matchedDate = formattedDate.match(/^(\d{4})[-./](\d{2})[-./](\d{2})$/);

  return matchedDate ? `${matchedDate[1]}.**.**` : maskGenericValue(formattedDate);
}

function maskEmailValue(value) {
  const sourceValue = String(value ?? "").trim();
  const separatorIndex = sourceValue.indexOf("@");

  if (separatorIndex === -1) {
    return maskGenericValue(sourceValue);
  }

  const localPart = sourceValue.slice(0, separatorIndex);
  const domainPart = sourceValue.slice(separatorIndex + 1);

  return `${maskGenericValue(localPart)}@${maskGenericValue(domainPart)}`;
}

function maskTemplateValue(value, type = "") {
  switch (String(type || "").trim().toLowerCase()) {
    case "birth":
    case "birthdate":
    case "date":
      return maskBirthDateValue(value);
    case "email":
      return maskEmailValue(value);
    case "examno":
    case "exam-no":
    case "number":
      return maskGenericValue(value);
    case "name":
      return maskNameValue(value);
    case "phone":
      return maskPhoneValue(value);
    default:
      return maskGenericValue(value);
  }
}

function normalizeDisplayValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "Y" : "";
  }

  return String(value);
}

module.exports = {
  escapeHtml,
  formatDatePattern,
  formatDateTimeValue,
  formatDateValue,
  formatNumberValue,
  formatPhoneValue,
  maskTemplateValue,
  normalizeDisplayValue,
  parseDateLikeValue,
};
