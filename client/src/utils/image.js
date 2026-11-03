const AVATAR_SIZE = 256;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

async function decode(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error('Could not read that image. Try a JPEG or PNG.');
  }
}

export async function toAvatarBlob(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Choose an image under 10 MB.');
  }

  const bitmap = await decode(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not read that image.'))),
      'image/jpeg',
      0.85,
    );
  });
}
