import { describe, expect, it } from 'vitest';
import { toVideoEmbedUrl } from '../videoEmbed';

describe('video embed links', () => {
  it('turns Loom, Google Drive and YouTube share links into their players', () => {
    expect(toVideoEmbedUrl('https://www.loom.com/share/abc123?sid=1')).toBe('https://www.loom.com/embed/abc123');
    expect(toVideoEmbedUrl('https://drive.google.com/file/d/1AbC-x/view?usp=sharing')).toBe('https://drive.google.com/file/d/1AbC-x/preview');
    expect(toVideoEmbedUrl('https://drive.google.com/open?id=XYZ')).toBe('https://drive.google.com/file/d/XYZ/preview');
    expect(toVideoEmbedUrl('https://www.youtube.com/watch?v=q1w2')).toBe('https://www.youtube.com/embed/q1w2');
    expect(toVideoEmbedUrl('https://youtu.be/q1w2')).toBe('https://www.youtube.com/embed/q1w2');
  });

  it('has no player for other or broken links', () => {
    expect(toVideoEmbedUrl('https://example.com/video.mp4')).toBeNull();
    expect(toVideoEmbedUrl('not a link')).toBeNull();
    expect(toVideoEmbedUrl('')).toBeNull();
  });
});
