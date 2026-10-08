jest.mock('../../repositories/student.repository', () => ({ findVideos: jest.fn(), saveVideos: jest.fn() }));
const repository = require('../../repositories/student.repository');
const service = require('../student.service');

describe('student before/after videos', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts https Loom, Google Drive and YouTube links and clears empty ones', () => {
    expect(service.normalizeVideoUrl('https://www.loom.com/share/abc123')).toBe('https://www.loom.com/share/abc123');
    expect(service.normalizeVideoUrl(' https://drive.google.com/file/d/xyz/view ')).toBe('https://drive.google.com/file/d/xyz/view');
    expect(service.normalizeVideoUrl('https://youtu.be/q1')).toBe('https://youtu.be/q1');
    expect(service.normalizeVideoUrl('')).toBeNull();
    expect(service.normalizeVideoUrl(null)).toBeNull();
  });

  it('refuses other sites, plain http and non-links', () => {
    expect(service.normalizeVideoUrl('http://www.loom.com/share/abc')).toBe('invalid');
    expect(service.normalizeVideoUrl('https://evil.example/loom.com')).toBe('invalid');
    expect(service.normalizeVideoUrl('https://loom.com.evil.example/x')).toBe('invalid');
    expect(service.normalizeVideoUrl('not a link')).toBe('invalid');
  });

  it('saves both links on the record, or refuses a bad one without saving', async () => {
    repository.saveVideos.mockResolvedValue({ student_id: 5 });
    await service.saveVideos(7, { before_video_url: 'https://www.loom.com/share/a', after_video_url: '' }, 2);
    expect(repository.saveVideos).toHaveBeenCalledWith(7, { before_video_url: 'https://www.loom.com/share/a', after_video_url: null }, 2);

    repository.saveVideos.mockClear();
    expect(await service.saveVideos(7, { before_video_url: 'https://example.com/v' }, 2)).toEqual({ error: 'invalid_url' });
    expect(repository.saveVideos).not.toHaveBeenCalled();
  });
});
