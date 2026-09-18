const measurements = new Map();
export function measureClientWork(name, work) {
  const start = performance.now();
  try { return work(); }
  finally {
    const duration = performance.now() - start;
    const metric = measurements.get(name) || { count: 0, totalMs: 0, maxMs: 0, lastMs: 0 };
    metric.count++; metric.totalMs += duration; metric.lastMs = duration; metric.maxMs = Math.max(metric.maxMs, duration);
    measurements.set(name, metric);
  }
}
export function getClientPerformanceMetrics() {
  return Object.fromEntries([...measurements].map(([name, metric]) => [name, { ...metric, averageMs: metric.totalMs / metric.count }]));
}
if (typeof window !== "undefined") window.getExamListPerformanceMetrics = getClientPerformanceMetrics;
