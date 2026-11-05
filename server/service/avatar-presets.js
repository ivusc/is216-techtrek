// The illustrated characters students can pick instead of uploading a photo.
// Each one is a small SVG built from the same parts (background, shoulders, head, hair, face),
// with its own skin tone, hairstyle and colours, so the set looks like one family.
// Drawn on a 128 x 128 grid; UserAvatar crops it to a circle.

const INK = '#1c1a3d'; // eyes, brows and mouth: the site's text colour

// --- hair (back = behind the head, front = over the forehead) ---------------------------------
const HAIR = {
  // long, falls past the shoulders, side-swept fringe
  long: {
    back: (c) =>
      `<path d="M34 60 C30 30 46 20 64 20 C84 20 98 32 94 62 L98 104 C88 110 40 110 30 104 Z" fill="${c}"/>`,
    front: (c) =>
      `<path d="M40 58 C38 34 52 26 66 27 C82 28 91 40 88 56 C80 44 66 38 52 44 C46 47 42 52 40 58 Z" fill="${c}"/>`,
  },
  // high bun on top
  bun: {
    back: (c) => `<circle cx="64" cy="25" r="12" fill="${c}"/>`,
    front: (c) =>
      `<path d="M40 58 C38 36 50 29 64 29 C80 29 90 38 88 58 C84 46 76 40 64 40 C52 40 44 46 40 58 Z" fill="${c}"/>`,
  },
  // chin-length bob with a straight fringe
  bob: {
    back: (c) =>
      `<path d="M36 58 C34 32 48 24 64 24 C82 24 94 34 92 58 L94 82 C86 88 42 88 34 82 Z" fill="${c}"/>`,
    front: (c) =>
      `<path d="M40 56 C40 36 50 30 64 30 C80 30 88 38 88 56 L84 50 L40 50 Z" fill="${c}"/>`,
  },
  // short and neat, side parting
  short: {
    back: () => '',
    front: (c) =>
      `<path d="M40 56 C37 34 50 25 66 26 C82 27 92 37 88 56 C86 46 82 42 76 40 C66 44 52 44 42 48 Z" fill="${c}"/>`,
  },
  // spiky on top
  spiky: {
    back: () => '',
    front: (c) =>
      `<path d="M40 56 C38 40 42 32 46 30 L48 20 L55 28 L60 17 L66 27 L73 18 L76 29 L84 24 L84 33 C90 38 90 48 88 56 C82 44 72 40 62 41 C52 42 45 47 40 56 Z" fill="${c}"/>`,
  },
  // swept up and back at the front
  quiff: {
    back: () => '',
    front: (c) =>
      `<path d="M40 58 C37 38 44 28 54 24 C60 16 76 14 84 22 C80 22 78 24 78 26 C88 30 92 42 88 58 C86 46 80 40 70 39 C58 38 46 44 40 58 Z" fill="${c}"/>`,
  },
  // short tight curls
  curls: {
    back: () => '',
    front: (c) =>
      `<g fill="${c}">${[
        [44, 46],
        [48, 36],
        [56, 30],
        [64, 28],
        [72, 30],
        [80, 36],
        [84, 46],
        [52, 40],
        [62, 37],
        [72, 39],
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`)
        .join('')}</g>`,
  },
  // big curly hair framing the face
  afro: {
    back: (c) =>
      `<g fill="${c}">${[
        [64, 34, 30],
        [40, 50, 16],
        [88, 50, 16],
        [44, 72, 13],
        [84, 72, 13],
      ]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`)
        .join('')}</g>`,
    front: (c) =>
      `<path d="M42 54 C44 40 54 34 64 34 C76 34 85 40 86 54 C78 46 52 46 42 54 Z" fill="${c}"/>`,
  },
  // headscarf covering the hair, ears and neck
  hijab: {
    back: (c) =>
      `<path d="M30 64 C28 34 44 22 64 22 C84 22 100 34 98 64 C98 84 92 96 84 102 L44 102 C36 96 30 84 30 64 Z" fill="${c}"/>`,
    front: (c) =>
      `<path d="M40 60 C40 40 50 32 64 32 C78 32 88 40 88 60 C88 48 78 40 64 40 C50 40 40 48 40 60 Z" fill="${c}"/>`,
  },
};

function glassesSvg() {
  return `<g fill="none" stroke="${INK}" stroke-width="2"><circle cx="55" cy="61" r="7"/><circle cx="73" cy="61" r="7"/><path d="M62 61 H66"/></g>`;
}

// one character as SVG text
function drawCharacter({
  background,
  skin,
  skinShade,
  hair,
  hairColor,
  top,
  glasses = false,
  hijab = false,
}) {
  const style = HAIR[hair];
  const ears = hijab
    ? ''
    : `<circle cx="41" cy="62" r="5" fill="${skin}"/><circle cx="87" cy="62" r="5" fill="${skin}"/>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">`,
    `<rect width="128" height="128" fill="${background}"/>`,
    style.back(hairColor),
    // shoulders and neck
    `<path d="M18 128 C18 104 38 94 64 94 C90 94 110 104 110 128 Z" fill="${top}"/>`,
    `<path d="M55 78 H73 V96 C68 100 60 100 55 96 Z" fill="${skinShade}"/>`,
    ears,
    // head
    `<ellipse cx="64" cy="60" rx="23" ry="26" fill="${skin}"/>`,
    style.front(hairColor),
    // face: brows, eyes, cheeks, smile
    `<path d="M50 52 Q55 49 60 52 M68 52 Q73 49 78 52" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`,
    `<circle cx="55" cy="61" r="2.6" fill="${INK}"/><circle cx="73" cy="61" r="2.6" fill="${INK}"/>`,
    `<circle cx="49" cy="69" r="3.5" fill="#ef5d7a" opacity="0.25"/><circle cx="79" cy="69" r="3.5" fill="#ef5d7a" opacity="0.25"/>`,
    `<path d="M57 72 Q64 78 71 72" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`,
    glasses ? glassesSvg() : '',
    `</svg>`,
  ].join('');
}

// skin tones: [skin, neck shade]
const SKIN = {
  light: ['#f6d5c0', '#e8bfa6'],
  lightMedium: ['#eebf9a', '#dba985'],
  medium: ['#d39a6d', '#bd855a'],
  deep: ['#8d5a3c', '#774a30'],
};

// background tints from the site's palette
const BG = {
  lavender: '#e6e1fb',
  sky: '#d4eefa',
  peach: '#fde3d3',
  rose: '#fbdbe3',
  mint: '#d6f2e4',
};

const CHARACTERS = [
  {
    key: 'f1',
    label: 'Long dark hair',
    group: 'female',
    background: BG.lavender,
    skin: 'light',
    hair: 'long',
    hairColor: '#2b2238',
    top: '#ef5d7a',
  },
  {
    key: 'f2',
    label: 'Bun and glasses',
    group: 'female',
    background: BG.sky,
    skin: 'medium',
    hair: 'bun',
    hairColor: '#3b2a24',
    top: '#5540bf',
    glasses: true,
  },
  {
    key: 'f3',
    label: 'Hijab',
    group: 'female',
    background: BG.peach,
    skin: 'lightMedium',
    hair: 'hijab',
    hairColor: '#5540bf',
    top: '#4736a1',
    hijab: true,
  },
  {
    key: 'f4',
    label: 'Curly hair',
    group: 'female',
    background: BG.mint,
    skin: 'deep',
    hair: 'afro',
    hairColor: '#231a1a',
    top: '#38b2e8',
  },
  {
    key: 'm1',
    label: 'Short neat hair',
    group: 'male',
    background: BG.sky,
    skin: 'light',
    hair: 'short',
    hairColor: '#2b2238',
    top: '#1c1a3d',
  },
  {
    key: 'm2',
    label: 'Spiky hair and glasses',
    group: 'male',
    background: BG.peach,
    skin: 'medium',
    hair: 'spiky',
    hairColor: '#4a3326',
    top: '#2f9e6a',
    glasses: true,
  },
  {
    key: 'm3',
    label: 'Short curls',
    group: 'male',
    background: BG.lavender,
    skin: 'deep',
    hair: 'curls',
    hairColor: '#1d1616',
    top: '#ef5d7a',
  },
  {
    key: 'm4',
    label: 'Swept-up hair',
    group: 'male',
    background: BG.rose,
    skin: 'lightMedium',
    hair: 'quiff',
    hairColor: '#6b4a2e',
    top: '#5540bf',
  },
];

const PRESETS = Object.fromEntries(
  CHARACTERS.map((character) => {
    const [skin, skinShade] = SKIN[character.skin];
    return [character.key, { ...character, svg: drawCharacter({ ...character, skin, skinShade }) }];
  }),
);

const PRESET_KEYS = CHARACTERS.map((character) => character.key);

// the list the picker shows (no SVG text: the picker loads each picture from /avatars/:key)
function presetList() {
  return CHARACTERS.map(({ key, label, group }) => ({ key, label, group }));
}

module.exports = { PRESETS, PRESET_KEYS, presetList };
