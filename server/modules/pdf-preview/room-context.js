const EMPTY_ROOM_IDENTITY = "__examlist_empty_room__";

function normalizeText(value) {
  return String(value ?? "").trim();
}

function isCandidateRecord(candidate) {
  return Boolean(candidate && typeof candidate === "object");
}

function getCandidateBuildingIdentity(candidate = {}) {
  return normalizeText(candidate.buildingCode || candidate.buildingName || candidate.building);
}

function getCandidateRoomName(candidate = {}) {
  return normalizeText(candidate.roomName || candidate.room);
}

function getCandidateRoomCode(candidate = {}) {
  return normalizeText(candidate.roomCode || candidate.roomId);
}

function getCandidateRoomIdentity(candidate = {}) {
  const roomIdentity = getCandidateRoomCode(candidate) || getCandidateRoomName(candidate) || EMPTY_ROOM_IDENTITY;
  const buildingIdentity = getCandidateBuildingIdentity(candidate);

  return `${buildingIdentity}\u0000${roomIdentity}`;
}

function createRoomAssignmentCountMap(candidates = []) {
  const countMap = new Map();

  (Array.isArray(candidates) ? candidates : []).forEach((candidate) => {
    if (!isCandidateRecord(candidate)) {
      return;
    }

    const roomIdentity = getCandidateRoomIdentity(candidate);

    countMap.set(roomIdentity, (countMap.get(roomIdentity) || 0) + 1);
  });

  return countMap;
}

function getRoomAssignmentCount(candidate = {}, roomAssignmentCountMap) {
  if (!isCandidateRecord(candidate)) {
    return 0;
  }

  const countMap =
    roomAssignmentCountMap instanceof Map ? roomAssignmentCountMap : createRoomAssignmentCountMap([candidate]);

  return Number(countMap.get(getCandidateRoomIdentity(candidate)) || 0);
}

function buildRoomTokenMap(candidate = {}, roomAssignmentCountMap) {
  if (!isCandidateRecord(candidate)) {
    return {
    assignedCount: 0,
    buildingCode: "",
    buildingName: "",
    code: "",
    name: "",
    otherRoom: "",
    roomCode: "",
    roomName: "",
  };
  }

  const roomCode = getCandidateRoomCode(candidate);
  const roomName = getCandidateRoomName(candidate);

  return {
    assignedCount: getRoomAssignmentCount(candidate, roomAssignmentCountMap),
    buildingCode: normalizeText(candidate.buildingCode),
    buildingName: normalizeText(candidate.buildingName || candidate.building),
    code: roomCode,
    name: roomName,
    otherRoom: "",
    roomCode,
    roomName,
  };
}

module.exports = {
  buildRoomTokenMap,
  createRoomAssignmentCountMap,
  getCandidateRoomIdentity,
};
