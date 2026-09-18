// Wait for active work to settle before propagating an error (e.g. before rollback).
async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let failure = null;
  async function run() {
    while (!failure && nextIndex < items.length) {
      const index = nextIndex++;
      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        failure = error;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, run));
  if (failure) throw failure;
  return results;
}
module.exports = { mapWithConcurrency };
