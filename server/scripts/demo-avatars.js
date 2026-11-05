// Draws a simple illustrated portrait (head and shoulders) for each demo user and returns it as a PNG,
// so the demo accounts have profile pictures without using photos of real people.
//
// It paints shapes (circles, ellipses, rectangles) into a big pixel grid, shrinks it down for smooth
// edges, and saves it as a PNG with Node's built-in zlib. No image libraries needed.
const zlib = require('zlib');

const SIZE = 256; // the finished picture, in pixels
const SCALE = 3; // drawn 3x bigger, then shrunk, so the edges are smooth
const BIG = SIZE * SCALE;

function hex(color) {
  const n = parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// --- drawing ---------------------------------------------------------------------------------
// every shape is a function (x, y) => true when the point is inside it, in a 0-100 coordinate space
const ellipse = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const circle = (cx, cy, r) => ellipse(cx, cy, r, r);
const rect = (x1, y1, x2, y2) => (x, y) => x >= x1 && x <= x2 && y >= y1 && y <= y2;
const and = (...shapes) => (x, y) => shapes.every((shape) => shape(x, y));
const or = (...shapes) => (x, y) => shapes.some((shape) => shape(x, y));
const not = (shape) => (x, y) => !shape(x, y);
const ring = (cx, cy, r, width) => and(circle(cx, cy, r), not(circle(cx, cy, r - width)));

function makeCanvas(background) {
  const pixels = new Uint8Array(BIG * BIG * 3);
  const [r, g, b] = hex(background);
  for (let i = 0; i < BIG * BIG; i++) {
    pixels[i * 3] = r;
    pixels[i * 3 + 1] = g;
    pixels[i * 3 + 2] = b;
  }
  return {
    pixels,
    fill(shape, color) {
      const [cr, cg, cb] = hex(color);
      for (let py = 0; py < BIG; py++) {
        const y = ((py + 0.5) / BIG) * 100;
        for (let px = 0; px < BIG; px++) {
          if (!shape(((px + 0.5) / BIG) * 100, y)) continue;
          const i = (py * BIG + px) * 3;
          pixels[i] = cr;
          pixels[i + 1] = cg;
          pixels[i + 2] = cb;
        }
      }
    },
  };
}

// shrink by averaging each SCALE x SCALE block into one pixel
function shrink(big) {
  const small = Buffer.alloc(SIZE * SIZE * 3);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let dy = 0; dy < SCALE; dy++) {
          for (let dx = 0; dx < SCALE; dx++) {
            sum += big[((y * SCALE + dy) * BIG + (x * SCALE + dx)) * 3 + c];
          }
        }
        small[(y * SIZE + x) * 3 + c] = Math.round(sum / (SCALE * SCALE));
      }
    }
  }
  return small;
}

// --- PNG -------------------------------------------------------------------------------------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function toPng(rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8; // 8 bits per colour
  header[9] = 2; // RGB
  // each row starts with filter type 0 (none)
  const rows = Buffer.alloc((SIZE * 3 + 1) * SIZE);
  for (let y = 0; y < SIZE; y++) rgb.copy(rows, y * (SIZE * 3 + 1) + 1, y * SIZE * 3, (y + 1) * SIZE * 3);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- the portrait ----------------------------------------------------------------------------
// look: { background, skin, hair, hairStyle, shirt, glasses?, scarf? }
//   hairStyle: 'short' | 'fringe' | 'curly' | 'long' | 'bob' | 'bun' | 'ponytail' | 'hijab'
function drawAvatar(look) {
  const canvas = makeCanvas(look.background);
  const { skin, hair, shirt } = look;
  const head = ellipse(50, 44, 17, 20);

  // long hair falls behind the shoulders
  if (look.hairStyle === 'long') canvas.fill(or(ellipse(50, 50, 22, 30), rect(28, 50, 72, 78)), hair);
  if (look.hairStyle === 'ponytail') canvas.fill(ellipse(68, 50, 7, 16), hair);
  if (look.hairStyle === 'bun') canvas.fill(circle(50, 20, 9), hair);

  // a headscarf wraps the head and drapes over the shoulders
  if (look.hairStyle === 'hijab') {
    canvas.fill(
      or(ellipse(50, 46, 23, 27), and(rect(0, 50, 100, 80), (x, y) => Math.abs(x - 50) < 20 + (y - 50) * 0.3), ellipse(50, 100, 37, 27)),
      look.scarf,
    );
  }

  // shoulders and neck
  if (look.hairStyle !== 'hijab') canvas.fill(ellipse(50, 100, 38, 28), shirt);
  if (look.hairStyle !== 'hijab') {
    canvas.fill(rect(43, 56, 57, 76), skin);
    canvas.fill(and(rect(43, 60, 57, 66), ellipse(50, 60, 7, 6)), darken(skin));
    // collar
    canvas.fill(and(ellipse(50, 74, 10, 5), not(ellipse(50, 71, 7, 4))), lighten(shirt));
  }

  // ears, head
  if (look.hairStyle !== 'hijab') {
    canvas.fill(ellipse(33, 46, 3.5, 5), skin);
    canvas.fill(ellipse(67, 46, 3.5, 5), skin);
  }
  canvas.fill(look.hairStyle === 'hijab' ? ellipse(50, 47, 15, 18) : head, skin);

  // hair on top: a cap a little bigger than the head, with the face cut out of it (the hairline)
  const cap = ellipse(50, 41.5, 19.5, 21.5);
  const face = (top, tilt = 0) => and(ellipse(50, 53, 15.2, 19), (x, y) => y > top + (x - 50) * tilt);
  if (look.hairStyle === 'short') canvas.fill(and(cap, rect(0, 0, 100, 47), not(face(33))), hair);
  if (look.hairStyle === 'fringe') canvas.fill(and(cap, rect(0, 0, 100, 47), not(face(37, 0.22))), hair);
  if (look.hairStyle === 'curly') {
    canvas.fill(and(cap, rect(0, 0, 100, 46), not(face(34))), hair);
    for (const [x, y] of [[34, 34], [38, 27], [45, 23], [52, 22], [59, 24], [65, 29], [67, 36], [42, 29], [56, 28]]) {
      canvas.fill(circle(x, y, 5.5), hair);
    }
  }
  if (['long', 'bun', 'ponytail'].includes(look.hairStyle)) {
    // a side part, sweeping across the forehead
    canvas.fill(and(cap, rect(0, 0, 100, 50), not(face(31, -0.35))), hair);
    if (look.hairStyle === 'long') {
      canvas.fill(and(ellipse(50, 48, 20, 24), not(ellipse(50, 51, 15.4, 21)), rect(0, 36, 100, 68)), hair);
    }
  }
  if (look.hairStyle === 'bob') {
    canvas.fill(and(ellipse(50, 45, 21, 23), rect(0, 0, 100, 60), not(face(34, 0.15))), hair);
  }

  // face: blush, eyes, eyebrows, smile
  canvas.fill(circle(39, 52, 3.2), mix(skin, '#f08a8a', 0.35));
  canvas.fill(circle(61, 52, 3.2), mix(skin, '#f08a8a', 0.35));
  canvas.fill(ellipse(43, 46, 1.8, 2.3), '#2b2340');
  canvas.fill(ellipse(57, 46, 1.8, 2.3), '#2b2340');
  canvas.fill(circle(43.6, 45.3, 0.6), '#ffffff');
  canvas.fill(circle(57.6, 45.3, 0.6), '#ffffff');
  const brow = look.hairStyle === 'hijab' ? '#3a2a22' : hair;
  canvas.fill(and(ellipse(43, 41.5, 4, 1.6), not(ellipse(43, 42.6, 4, 1.4))), brow);
  canvas.fill(and(ellipse(57, 41.5, 4, 1.6), not(ellipse(57, 42.6, 4, 1.4))), brow);
  canvas.fill(and(ellipse(50, 53.5, 6, 4.2), not(ellipse(50, 51.6, 6.4, 4.2))), '#8a3b4a');
  canvas.fill(ellipse(50, 49.5, 1.4, 1), darken(skin));

  if (look.glasses) {
    const frame = look.glasses;
    canvas.fill(ring(43, 46, 5.2, 1), frame);
    canvas.fill(ring(57, 46, 5.2, 1), frame);
    canvas.fill(rect(47.8, 45.4, 52.2, 46.4), frame);
  }

  return toPng(shrink(canvas.pixels));
}

function mix(a, b, amount) {
  const ca = hex(a);
  const cb = hex(b.slice(0, 7));
  return '#' + ca.map((v, i) => Math.round(v + (cb[i] - v) * amount).toString(16).padStart(2, '0')).join('');
}
const darken = (color) => mix(color, '#000000', 0.12);
const lighten = (color) => mix(color, '#ffffff', 0.35);

module.exports = { drawAvatar };
