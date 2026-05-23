const { createCandidateReadRepository } = require("./repository-read");
const { createCandidateWriteRepository } = require("./repository-write");

function createCandidateRepository({ createHttpError, query, resolveSchoolId }) {
  return Object.freeze({
    ...createCandidateReadRepository({
      createHttpError,
      query,
    }),
    ...createCandidateWriteRepository({
      query,
      resolveSchoolId,
    }),
  });
}

module.exports = {
  createCandidateRepository,
};
