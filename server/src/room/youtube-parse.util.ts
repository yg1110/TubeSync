export function parseYoutubeVideoId(input: string): string | null {
  const urlStr = (input ?? '').trim();
  if (!urlStr) return null;

  let u: URL;
  try {
    u = new URL(urlStr);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, '');
  let id: string | null = null;

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (u.pathname === '/watch') {
      id = u.searchParams.get('v');
    } else if (u.pathname.startsWith('/shorts/')) {
      id = u.pathname.split('/shorts/')[1]?.split('/')[0] ?? null;
    }
  } else if (host === 'youtu.be') {
    id = u.pathname.slice(1).split('/')[0] ?? null;
  }

  if (!id) return null;
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;

  return id;
}
