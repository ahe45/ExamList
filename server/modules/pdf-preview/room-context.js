function normalizeText(value) {
  return String(value ?? "").trim();
}

function isCandidateRecord(candidate) {
  return Boolean(candidate && typeof candidate === "object");
}

function getCandidateRoomName(candidate = {}) {
  return normalizeText(candidate.roomName || candidate.room);
}

function getCandidateRoomCode(candidate = {}) {
  return normalizeText(candidate.roomCode || candidate.roomId);
}

function buildRoomTokenMap(candidate = {}) {
  if (!isCandidateRecord(candidate)) {
    return {
    buildingCode: "",
    buildingName: "",
    code: "",
    name: "",
    roomCode: "",
    roomName: "",
  };
  }

  const roomCode = getCandidateRoomCode(candidate);
  const roomName = getCandidateRoomName(candidate);

  return {
    buildingCode: normalizeText(candidate.buildingCode),
    buildingName: normalizeText(candidate.buildingName || candidate.building),
    code: roomCode,
    name: roomName,
    roomCode,
    roomName,
  };
}

module.exports = {
  buildRoomTokenMap,
};
