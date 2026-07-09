export function feedbackGraphIngestUrl(baseUrl: string): string {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  return `${clean}/api/ingest`;
}