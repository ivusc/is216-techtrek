import { afterEach, describe, expect, it, vi } from 'vitest';
import { toAvatarBlob } from '@/utils/image';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function fileOf(type, size) {
  const file = new File(['x'], 'upload', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('toAvatarBlob', () => {
  it.each([
    ['a non-image file', fileOf('text/plain', 100)],
    ['an image over 10 MB', fileOf('image/png', 11 * 1024 * 1024)],
  ])('rejects %s before decoding it', async (label, file) => {
    const createImageBitmap = vi.fn();
    vi.stubGlobal('createImageBitmap', createImageBitmap);

    await expect(toAvatarBlob(file)).rejects.toThrow('Choose an image');

    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it('explains when the browser cannot decode the image', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new DOMException('decode')));

    await expect(toAvatarBlob(fileOf('image/heic', 2048))).rejects.toThrow(
      'Could not read that image. Try a JPEG or PNG.',
    );
  });

  it('crops the centre square and draws it at 256 px as a JPEG', async () => {
    const bitmap = { width: 400, height: 300, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const context = { drawImage: vi.fn(), fillRect: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (done, type) {
      done(new Blob([`${this.width}x${this.height}`], { type }));
    });

    const blob = await toAvatarBlob(fileOf('image/png', 2048));

    expect(context.fillStyle).toBe('#fff');
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 256, 256);
    expect(context.imageSmoothingQuality).toBe('high');
    expect(context.drawImage).toHaveBeenCalledWith(bitmap, 50, 0, 300, 300, 0, 0, 256, 256);
    expect(blob.type).toBe('image/jpeg');
    expect(await blob.text()).toBe('256x256');
  });
});
