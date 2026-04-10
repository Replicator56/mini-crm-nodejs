export function extractCsrfToken(html) {
  const match = html.match(/name="_csrf"\s+value="([^"]+)"/);
  if (!match) throw new Error("CSRF token introuvable");
  return match[1];
}
