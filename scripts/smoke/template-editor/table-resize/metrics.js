const { getEditorTableMetrics, waitForCondition } = require("../../../smoke-browser-cdp");

async function expectCapturedTableMetrics(client, beforeMetrics, conditionExpression, description) {
  const currentMetrics = await getEditorTableMetrics(client);

  await waitForCondition(
    client,
    `
      (() => {
        const current = ${JSON.stringify(currentMetrics)};
        const before = ${JSON.stringify(beforeMetrics)};

        return Boolean(${conditionExpression});
      })()
    `,
    description,
  );
}

module.exports = {
  expectCapturedTableMetrics,
};
