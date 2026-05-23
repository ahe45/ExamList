const { createUniqueValueList } = require("./utils");

async function deleteFiles(fileSystem, filePaths = []) {
  let deletedCount = 0;
  let missingCount = 0;
  const uniqueFilePaths = createUniqueValueList(filePaths);

  for (const filePath of uniqueFilePaths) {
    const existed = typeof fileSystem.existsSync === "function" ? fileSystem.existsSync(filePath) : false;

    await fileSystem.promises.rm(filePath, { force: true }).catch(() => {});

    if (existed) {
      deletedCount += 1;
    } else {
      missingCount += 1;
    }
  }

  return {
    deletedCount,
    missingCount,
  };
}

module.exports = {
  deleteFiles,
};
