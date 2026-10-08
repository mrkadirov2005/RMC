// Turns a Loom, Google Drive or YouTube share link into the address its player embeds from.
export const toVideoEmbedUrl = (link: string | null | undefined): string | null => {
  if (!link) return null;
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host.endsWith('loom.com')) {
    const id = url.pathname.match(/\/(?:share|embed)\/([\w-]+)/)?.[1];
    return id ? `https://www.loom.com/embed/${id}` : null;
  }
  if (host === 'drive.google.com') {
    const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] || url.searchParams.get('id');
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host.endsWith('youtube.com')) {
    const id = url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts)\/([\w-]+)/)?.[1];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  return null;
};
