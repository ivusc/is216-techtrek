const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const IMAGE_TYPES = [
  {
    type: 'image/jpeg',
    extension: 'jpg',
    matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    type: 'image/png',
    extension: 'png',
    matches: (bytes) => bytes.subarray(0, 8).equals(PNG_SIGNATURE),
  },
  {
    type: 'image/webp',
    extension: 'webp',
    matches: (bytes) =>
      bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
      bytes.subarray(8, 12).toString('latin1') === 'WEBP',
  },
];

function sniffImageType(bytes) {
  return IMAGE_TYPES.find((image) => image.matches(bytes))?.type ?? null;
}

function extensionOf(type) {
  return IMAGE_TYPES.find((image) => image.type === type).extension;
}

module.exports = { sniffImageType, extensionOf };
