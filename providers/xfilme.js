// src/lib/sitefilme.js
function decodeHtml(value) {
  if (typeof value !== "string") return "";
  const named = {
    amp: "&",
    apos: "'",
    quot: '"',
    lt: "<",
    gt: ">",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    hellip: "…",
    ș: "ș",
    ţ: "ţ"
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const hexadecimal = entity[1]?.toLowerCase() === "x";
      const code = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      if (Number.isFinite(code) && code > 0 && code <= 1114111) {
        try {
          return String.fromCodePoint(code);
        } catch {
        }
      }
      return match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}
function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function normalizeTitle(value) {
  return decodeHtml(String(value || "")).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function splitTitleAndYear(value) {
  const clean = decodeHtml(String(value || "")).replace(/\s+/g, " ").trim();
  const match = /^(.*?)\s*\((?:TV\s+Series\s+)?(\d{4})\)\s*$/i.exec(clean);
  return match ? { title: match[1].trim(), year: Number(match[2]) } : { title: clean, year: null };
}
function extractTmdbMetadata(html) {
  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html || "")?.[1];
  const pageTitle = stripTags(titleTag || "");
  const suffixRemoved = pageTitle.replace(/\s+[—–-]\s+The Movie Database\s*\(TMDB\)\s*$/i, "").trim();
  const parsed = splitTitleAndYear(suffixRemoved);
  if (!parsed.title) return null;
  return parsed;
}
function resolvePlaylistUrl(baseUrl, reference) {
  const value = decodeHtml(String(reference || "")).trim();
  if (!value || value.startsWith("data:") || value.startsWith("javascript:")) return null;
  try {
    const resolved = new URL(value, baseUrl);
    return resolved.protocol === "https:" && resolved.pathname.toLowerCase().endsWith(".m3u8") ? resolved.href : null;
  } catch {
    return null;
  }
}
function extractHlsVariants(playlist, masterUrl) {
  if (typeof playlist !== "string" || !playlist.includes("#EXTM3U")) return [];
  const lines = playlist.replace(/\r/g, "").split("\n").map((line) => line.trim());
  const byResolution = /* @__PURE__ */ new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;
    const resolution = /(?:^|,)RESOLUTION=(\d+)x(\d+)(?:,|$)/i.exec(line.slice(line.indexOf(":") + 1));
    if (!resolution) continue;
    const width = Number(resolution[1]);
    const height = Number(resolution[2]);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) continue;
    const bandwidth = Number(/(?:^|,)(?:AVERAGE-)?BANDWIDTH=(\d+)(?:,|$)/i.exec(line.slice(line.indexOf(":") + 1))?.[1] || 0);
    let reference = null;
    for (let next = index + 1; next < lines.length; next += 1) {
      if (!lines[next] || lines[next].startsWith("#")) continue;
      reference = lines[next];
      index = next;
      break;
    }
    const url = resolvePlaylistUrl(masterUrl, reference);
    if (!url || url === masterUrl) continue;
    const candidate = { url, quality: `${height}p`, width, height, bandwidth };
    const existing = byResolution.get(height);
    if (!existing || candidate.bandwidth > existing.bandwidth) byResolution.set(height, candidate);
  }
  return [...byResolution.values()].sort((left, right) => right.height - left.height);
}
function normalizeMediaType(value) {
  const type = String(value || "").toLowerCase();
  return type === "series" || type === "show" ? "tv" : type;
}

// src/lib/desenefaine.js
var AES_SBOX = new Uint8Array([
  99,
  124,
  119,
  123,
  242,
  107,
  111,
  197,
  48,
  1,
  103,
  43,
  254,
  215,
  171,
  118,
  202,
  130,
  201,
  125,
  250,
  89,
  71,
  240,
  173,
  212,
  162,
  175,
  156,
  164,
  114,
  192,
  183,
  253,
  147,
  38,
  54,
  63,
  247,
  204,
  52,
  165,
  229,
  241,
  113,
  216,
  49,
  21,
  4,
  199,
  35,
  195,
  24,
  150,
  5,
  154,
  7,
  18,
  128,
  226,
  235,
  39,
  178,
  117,
  9,
  131,
  44,
  26,
  27,
  110,
  90,
  160,
  82,
  59,
  214,
  179,
  41,
  227,
  47,
  132,
  83,
  209,
  0,
  237,
  32,
  252,
  177,
  91,
  106,
  203,
  190,
  57,
  74,
  76,
  88,
  207,
  208,
  239,
  170,
  251,
  67,
  77,
  51,
  133,
  69,
  249,
  2,
  127,
  80,
  60,
  159,
  168,
  81,
  163,
  64,
  143,
  146,
  157,
  56,
  245,
  188,
  182,
  218,
  33,
  16,
  255,
  243,
  210,
  205,
  12,
  19,
  236,
  95,
  151,
  68,
  23,
  196,
  167,
  126,
  61,
  100,
  93,
  25,
  115,
  96,
  129,
  79,
  220,
  34,
  42,
  144,
  136,
  70,
  238,
  184,
  20,
  222,
  94,
  11,
  219,
  224,
  50,
  58,
  10,
  73,
  6,
  36,
  92,
  194,
  211,
  172,
  98,
  145,
  149,
  228,
  121,
  231,
  200,
  55,
  109,
  141,
  213,
  78,
  169,
  108,
  86,
  244,
  234,
  101,
  122,
  174,
  8,
  186,
  120,
  37,
  46,
  28,
  166,
  180,
  198,
  232,
  221,
  116,
  31,
  75,
  189,
  139,
  138,
  112,
  62,
  181,
  102,
  72,
  3,
  246,
  14,
  97,
  53,
  87,
  185,
  134,
  193,
  29,
  158,
  225,
  248,
  152,
  17,
  105,
  217,
  142,
  148,
  155,
  30,
  135,
  233,
  206,
  85,
  40,
  223,
  140,
  161,
  137,
  13,
  191,
  230,
  66,
  104,
  65,
  153,
  45,
  15,
  176,
  84,
  187,
  22
]);
function expandAes256Key(key) {
  if (!(key instanceof Uint8Array) || key.length !== 32) return null;
  const expanded = new Uint8Array(240);
  expanded.set(key);
  let generated = 32;
  let rcon = 1;
  const word = new Uint8Array(4);
  while (generated < expanded.length) {
    word.set(expanded.slice(generated - 4, generated));
    if (generated % 32 === 0) {
      const first = word[0];
      word[0] = AES_SBOX[word[1]] ^ rcon;
      word[1] = AES_SBOX[word[2]];
      word[2] = AES_SBOX[word[3]];
      word[3] = AES_SBOX[first];
      rcon = (rcon << 1 ^ (rcon & 128 ? 283 : 0)) & 255;
    } else if (generated % 32 === 16) {
      for (let index = 0; index < 4; index += 1) word[index] = AES_SBOX[word[index]];
    }
    for (let index = 0; index < 4; index += 1) {
      expanded[generated] = expanded[generated - 32] ^ word[index];
      generated += 1;
    }
  }
  return expanded;
}
function aesEncryptBlock(input, expanded) {
  const state = new Uint8Array(input);
  for (let index = 0; index < 16; index += 1) state[index] ^= expanded[index];
  for (let round = 1; round <= 14; round += 1) {
    for (let index = 0; index < 16; index += 1) state[index] = AES_SBOX[state[index]];
    const shifted = new Uint8Array(16);
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) shifted[row + 4 * column] = state[row + 4 * (column + row & 3)];
    }
    state.set(shifted);
    if (round !== 14) {
      for (let column = 0; column < 4; column += 1) {
        const offset = column * 4;
        const a0 = state[offset];
        const a1 = state[offset + 1];
        const a2 = state[offset + 2];
        const a3 = state[offset + 3];
        const twice = (value) => (value << 1 ^ (value & 128 ? 283 : 0)) & 255;
        state[offset] = twice(a0) ^ (twice(a1) ^ a1) ^ a2 ^ a3;
        state[offset + 1] = a0 ^ twice(a1) ^ (twice(a2) ^ a2) ^ a3;
        state[offset + 2] = a0 ^ a1 ^ twice(a2) ^ (twice(a3) ^ a3);
        state[offset + 3] = twice(a0) ^ a0 ^ a1 ^ a2 ^ twice(a3);
      }
    }
    const roundOffset = round * 16;
    for (let index = 0; index < 16; index += 1) state[index] ^= expanded[roundOffset + index];
  }
  return state;
}
function galoisMultiply(left, right) {
  const result = new Uint8Array(16);
  const value = new Uint8Array(right);
  for (let bit = 0; bit < 128; bit += 1) {
    if (left[bit >> 3] >> 7 - (bit & 7) & 1) {
      for (let index = 0; index < 16; index += 1) result[index] ^= value[index];
    }
    const lsb = value[15] & 1;
    let carry = 0;
    for (let index = 0; index < 16; index += 1) {
      const nextCarry = value[index] & 1;
      value[index] = value[index] >>> 1 | carry << 7;
      carry = nextCarry;
    }
    if (lsb) value[0] ^= 225;
  }
  return result;
}
function ghash(hashKey, ciphertext) {
  let state = new Uint8Array(16);
  const update = (block) => {
    for (let index = 0; index < 16; index += 1) state[index] ^= block[index] || 0;
    state = galoisMultiply(state, hashKey);
  };
  for (let offset = 0; offset < ciphertext.length; offset += 16) update(ciphertext.slice(offset, offset + 16));
  const lengths = new Uint8Array(16);
  const bits = ciphertext.length * 8;
  const high = Math.floor(bits / 4294967296);
  const low = bits >>> 0;
  lengths[8] = high >>> 24 & 255;
  lengths[9] = high >>> 16 & 255;
  lengths[10] = high >>> 8 & 255;
  lengths[11] = high & 255;
  lengths[12] = low >>> 24 & 255;
  lengths[13] = low >>> 16 & 255;
  lengths[14] = low >>> 8 & 255;
  lengths[15] = low & 255;
  update(lengths);
  return state;
}
function incrementCounter(counter) {
  for (let index = 15; index >= 12; index -= 1) {
    counter[index] = counter[index] + 1 & 255;
    if (counter[index]) break;
  }
}
function decryptAes256Gcm(key, iv, encrypted) {
  if (!(key instanceof Uint8Array) || key.length !== 32 || !(iv instanceof Uint8Array) || iv.length !== 12 || !(encrypted instanceof Uint8Array) || encrypted.length < 16) return null;
  const expanded = expandAes256Key(key);
  const ciphertext = encrypted.slice(0, encrypted.length - 16);
  const suppliedTag = encrypted.slice(encrypted.length - 16);
  const zero = new Uint8Array(16);
  const hashKey = aesEncryptBlock(zero, expanded);
  const initialCounter = new Uint8Array(16);
  initialCounter.set(iv);
  initialCounter[15] = 1;
  const authentication = ghash(hashKey, ciphertext);
  const encryptedCounter = aesEncryptBlock(initialCounter, expanded);
  let difference = 0;
  for (let index = 0; index < 16; index += 1) difference |= suppliedTag[index] ^ authentication[index] ^ encryptedCounter[index];
  if (difference !== 0) return null;
  const plaintext = new Uint8Array(ciphertext.length);
  const counter = new Uint8Array(initialCounter);
  for (let offset = 0; offset < ciphertext.length; offset += 16) {
    incrementCounter(counter);
    const mask = aesEncryptBlock(counter, expanded);
    for (let index = 0; index < 16 && offset + index < ciphertext.length; index += 1) plaintext[offset + index] = ciphertext[offset + index] ^ mask[index];
  }
  return plaintext;
}

// src/lib/desenflix.js
var DESENFLIX_ORIGIN = "https://desenflix.online";
var BYSE_FINGERPRINT = {
  token: "nuvio-provider",
  viewer_id: "nuvio",
  device_id: "nuvio",
  confidence: 0
};
function utf8Decode(bytes) {
  if (!(bytes instanceof Uint8Array)) return "";
  let output = "";
  for (let index = 0; index < bytes.length; ) {
    const first = bytes[index++];
    if (first < 128) output += String.fromCharCode(first);
    else if (first < 224) output += String.fromCharCode((first & 31) << 6 | bytes[index++] & 63);
    else if (first < 240) output += String.fromCharCode((first & 15) << 12 | (bytes[index++] & 63) << 6 | bytes[index++] & 63);
    else {
      const code = (first & 7) << 18 | (bytes[index++] & 63) << 12 | (bytes[index++] & 63) << 6 | bytes[index++] & 63;
      const adjusted = code - 65536;
      output += String.fromCharCode(55296 + (adjusted >> 10), 56320 + (adjusted & 1023));
    }
  }
  return output;
}
function concatBytes(...parts) {
  const flat = [];
  for (const part of parts) {
    if (part instanceof Uint8Array) for (const byte of part) flat.push(byte);
    else if (typeof part === "number") flat.push(part & 255);
  }
  return new Uint8Array(flat);
}
function base64UrlBytes(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const input = String(value || "").replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "").replace(/=+$/, "");
  const bytes = [];
  let buffer = 0;
  let bits = 0;
  for (const character of input) {
    const index = alphabet.indexOf(character);
    if (index < 0) return null;
    buffer = buffer << 6 | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push(buffer >> bits & 255);
    }
  }
  return new Uint8Array(bytes);
}
var POW_INPUT = new Uint8Array(160);
var POW_DIGITS = new Uint8Array(12);
var POW_TABLE = new Uint32Array(512);
var POW_OUT = new Uint32Array(8);
var POW_SEED = new Uint32Array(4);
function powAbsorb(from, to) {
  const input = POW_INPUT;
  let s0 = POW_SEED[0];
  let s1 = POW_SEED[1];
  let s2 = POW_SEED[2];
  let s3 = POW_SEED[3];
  for (let index = from; index < to; index += 1) {
    s0 = s0 + input[index];
    s0 = s0 << 7 | s0 >>> 25;
    s0 = s0 + s1;
    let mixed = s3 ^ s0;
    s3 = mixed << 16 | mixed >>> 16;
    s2 = s2 + s3;
    mixed = s1 ^ s2;
    s1 = mixed << 12 | mixed >>> 20;
    s0 = s0 + s1;
    mixed = s3 ^ s0;
    s3 = mixed << 8 | mixed >>> 24;
    s2 = s2 + s3;
    mixed = s1 ^ s2;
    s1 = mixed << 7 | mixed >>> 25;
  }
  POW_SEED[0] = s0;
  POW_SEED[1] = s1;
  POW_SEED[2] = s2;
  POW_SEED[3] = s3;
}
function powFinish(outWords) {
  const table = POW_TABLE;
  const imulA = Math.imul;
  let s0 = POW_SEED[0];
  let s1 = POW_SEED[1];
  let s2 = POW_SEED[2];
  let s3 = POW_SEED[3];
  for (let index = 0; index < 8; index += 1) {
    s0 = s0 + s1;
    let mixedState = s3 ^ s0;
    s3 = mixedState << 16 | mixedState >>> 16;
    s2 = s2 + s3;
    mixedState = s1 ^ s2;
    s1 = mixedState << 12 | mixedState >>> 20;
    s0 = s0 + s1;
    mixedState = s3 ^ s0;
    s3 = mixedState << 8 | mixedState >>> 24;
    s2 = s2 + s3;
    mixedState = s1 ^ s2;
    s1 = mixedState << 7 | mixedState >>> 25;
  }
  for (let index = 0; index < 512; index += 1) {
    s0 = s0 + s1;
    let mixedState = s3 ^ s0;
    s3 = mixedState << 16 | mixedState >>> 16;
    s2 = s2 + s3;
    mixedState = s1 ^ s2;
    s1 = mixedState << 12 | mixedState >>> 20;
    s0 = s0 + s1;
    mixedState = s3 ^ s0;
    s3 = mixedState << 8 | mixedState >>> 24;
    s2 = s2 + s3;
    mixedState = s1 ^ s2;
    s1 = mixedState << 7 | mixedState >>> 25;
    table[index] = s0 ^ s2;
  }
  const A_H = 40503;
  const A_L = 31153;
  for (let round = 0; round < 2; round += 1) {
    for (let index = 0; index < 512; index += 1) {
      const current = table[index];
      const target = current & 511;
      const next = index + 1;
      const tail = table[next & 511];
      const rotated = current + table[target];
      let mixed = (rotated << 13 | rotated >>> 19) ^ ((tail * A_H & 65535) << 16) + tail * A_L;
      table[index] = mixed;
      s0 = s0 ^ mixed;
      s0 = s0 + s1;
      let mixedState = s3 ^ s0;
      s3 = mixedState << 16 | mixedState >>> 16;
      s2 = s2 + s3;
      mixedState = s1 ^ s2;
      s1 = mixedState << 12 | mixedState >>> 20;
      s0 = s0 + s1;
      mixedState = s3 ^ s0;
      s3 = mixedState << 8 | mixedState >>> 24;
      s2 = s2 + s3;
      mixedState = s1 ^ s2;
      s1 = mixedState << 7 | mixedState >>> 25;
    }
  }
  const B_H = 34283;
  const B_L = 51831;
  const out = POW_OUT;
  for (let block = 0; block < outWords; block += 1) {
    s0 = s0 + s1;
    let mixedState = s3 ^ s0;
    s3 = mixedState << 16 | mixedState >>> 16;
    s2 = s2 + s3;
    mixedState = s1 ^ s2;
    s1 = mixedState << 12 | mixedState >>> 20;
    s0 = s0 + s1;
    mixedState = s3 ^ s0;
    s3 = mixedState << 8 | mixedState >>> 24;
    s2 = s2 + s3;
    mixedState = s1 ^ s2;
    s1 = mixedState << 7 | mixedState >>> 25;
    let accumulator = s0;
    const base = block * 64;
    for (let position = 0; position < 64; position += 1) {
      const value = table[base + position];
      accumulator = accumulator + value;
      accumulator = accumulator << 5 | accumulator >>> 27;
      accumulator = accumulator ^ ((value * B_H & 65535) << 16) + value * B_L;
    }
    out[block] = accumulator ^ s2;
  }
}
function leadingZeroBits(words) {
  let bits = 0;
  for (let index = 0; index < words.length; index += 1) {
    if (words[index] === 0) {
      bits += 32;
      continue;
    }
    return bits + Math.clz32(words[index]);
  }
  return bits;
}
function solvePow(nonce, difficulty, timeoutMs = 2e4) {
  const level = Number(difficulty);
  if (!Number.isInteger(level) || level <= 0) return "0";
  if (level > 64) return null;
  const prefix = `${nonce}:`;
  const prefixLength = Math.min(prefix.length, POW_INPUT.length - 12);
  for (let index = 0; index < prefixLength; index += 1) POW_INPUT[index] = prefix.charCodeAt(index) & 255;
  POW_SEED[0] = 1779033703;
  POW_SEED[1] = 3144134277;
  POW_SEED[2] = 1013904242;
  POW_SEED[3] = 2773480762;
  powAbsorb(0, prefixLength);
  const baseSeed0 = POW_SEED[0];
  const baseSeed1 = POW_SEED[1];
  const baseSeed2 = POW_SEED[2];
  const baseSeed3 = POW_SEED[3];
  const threshold = level === 32 ? 0 : 4294967296 / Math.pow(2, level) >>> 0;
  const startedAt = Date.now();
  let counter = 0;
  for (; ; ) {
    for (let batch = 0; batch < 2048; batch += 1) {
      let remaining = counter;
      let digitCount = 0;
      do {
        POW_DIGITS[digitCount] = 48 + remaining % 10;
        remaining = remaining / 10 | 0;
        digitCount += 1;
      } while (remaining > 0 && digitCount < POW_DIGITS.length);
      let position = prefixLength;
      for (let index = digitCount - 1; index >= 0; index -= 1) {
        POW_INPUT[position] = POW_DIGITS[index];
        position += 1;
      }
      POW_SEED[0] = baseSeed0;
      POW_SEED[1] = baseSeed1;
      POW_SEED[2] = baseSeed2;
      POW_SEED[3] = baseSeed3;
      powAbsorb(prefixLength, position);
      let matched = false;
      if (level <= 32) {
        powFinish(1);
        matched = POW_OUT[0] < threshold;
      } else {
        powFinish(8);
        matched = POW_OUT[0] === 0 && leadingZeroBits(POW_OUT) >= level;
      }
      if (matched) {
        if (level <= 32) {
          POW_SEED[0] = baseSeed0;
          POW_SEED[1] = baseSeed1;
          POW_SEED[2] = baseSeed2;
          POW_SEED[3] = baseSeed3;
          powAbsorb(prefixLength, position);
          powFinish(8);
          if (!(POW_OUT[0] < threshold && leadingZeroBits(POW_OUT) >= level)) {
            counter += 1;
            continue;
          }
        }
        return String(counter);
      }
      counter += 1;
    }
    if (Date.now() - startedAt > timeoutMs) return null;
  }
}
function safeUrl(value, base = DESENFLIX_ORIGIN) {
  try {
    const url = new URL(decodeHtml(String(value || "")).trim(), base);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
function byseEmbedCode(embedUrl) {
  const url = safeUrl(embedUrl);
  if (!url) return null;
  return /^\/(?:e|nlo|iosy)\/([A-Za-z0-9]+)/.exec(url.pathname)?.[1] || null;
}
function decryptBysePlayback(playback) {
  try {
    const version = Number.parseInt(playback?.version ?? "1", 10);
    const parts = Array.isArray(playback?.key_parts) ? playback.key_parts : [];
    const first = base64UrlBytes(parts[version - 1]);
    const second = base64UrlBytes(parts[30 - version]);
    const iv = base64UrlBytes(playback?.iv);
    const encrypted = base64UrlBytes(playback?.payload);
    if (!first || !second || !iv || !encrypted) return null;
    const key = concatBytes(first, second);
    const plaintext = decryptAes256Gcm(key, iv, encrypted);
    if (!plaintext) return null;
    const config = JSON.parse(utf8Decode(plaintext));
    const sources = Array.isArray(config?.sources) ? config.sources : [];
    const results = [];
    const seen = /* @__PURE__ */ new Set();
    for (const source of sources) {
      const url = safeUrl(typeof source?.url === "string" ? source.url : "");
      if (!url || seen.has(url.href)) continue;
      seen.add(url.href);
      const isHls = /mpegurl/i.test(String(source?.mime_type || "")) || /\.m3u8/i.test(url.pathname);
      const quality = Number.isInteger(source?.height) && source.height > 0 ? `${source.height}p` : String(source?.label || source?.quality || "").match(/(\d{3,4})p/i)?.[1] ? `${String(source?.label || source?.quality).match(/(\d{3,4})p/i)[1]}p` : "HD";
      results.push({ url: url.href, type: isHls ? "hls" : "mp4", quality });
    }
    return results;
  } catch {
    return null;
  }
}

// src/lib/xfilme.js
var XFILME_ORIGIN = "https://xfilme.ro";
var GENERIC_MEDIA_LIMIT = 3;
var GATED_HOSTS = [
  "listeamed",
  "5filme",
  "strp2p",
  "vidfast",
  "filemoon",
  "vidguard",
  "streamtape",
  "waaw",
  "netu",
  "hqq",
  "dood",
  "myvidplay",
  "voe",
  "mp4upload",
  "cybervynx",
  "veev"
];
function safeUrl2(value, base = XFILME_ORIGIN) {
  const raw = decodeHtml(String(value || "")).replace(/\\(.)/g, "$1").replace(/\s+/g, " ").trim();
  if (!raw || /^(?:data|javascript):/i.test(raw)) return null;
  try {
    const url = new URL(raw, base);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
function parseTitleAndYear(value) {
  const clean = decodeHtml(String(value || "")).replace(/\s+/g, " ").trim();
  const withoutSuffix = clean.replace(/\s*[-–—]?\s*(?:online\s+)?(?:subtitrat|tradus)[\s\S]*$/i, "").replace(/\s+[-–—]\s*$/, "").trim();
  const parenthesized = /^(.*?)\s*\((\d{4})\)\s*$/.exec(withoutSuffix);
  if (parenthesized) return { title: parenthesized[1].trim(), year: Number(parenthesized[2]) };
  const bare = /^(.*?)\s+((?:19|20)\d{2})$/.exec(withoutSuffix);
  if (bare) return { title: bare[1].trim(), year: Number(bare[2]) };
  return { title: withoutSuffix, year: null };
}
function extractXfilmeCandidates(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<div\b[^>]*class\s*=\s*(["'])[^"']*result-item[^"']*\1[^>]*>/gi)];
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < openings.length; index += 1) {
    const card = source.slice(openings[index].index + openings[index][0].length, openings[index + 1]?.index ?? source.length);
    const anchor = /<a\b[^>]*href\s*=\s*(["'])(.*?)\1/i.exec(card);
    if (!anchor) continue;
    const url = safeUrl2(anchor[2]);
    if (!url || url.origin !== XFILME_ORIGIN || !/^\/(?:filme|seriale)\/[a-z0-9-]+\/?$/i.test(url.pathname) || seen.has(url.href)) continue;
    const title = stripTags(/class=["']title["']>\s*<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(card)?.[1] || "");
    if (!title) continue;
    seen.add(url.href);
    const parsed = parseTitleAndYear(title);
    const metaYear = Number(stripTags(/class=["']year["']>([\s\S]*?)<\/span>/i.exec(card)?.[1] || "")) || null;
    const slugYear = Number(/\/(?:filme|seriale)\/[a-z0-9-]+-(19\d{2}|20\d{2})-\b/i.exec(url.pathname)?.[1] || 0) || null;
    candidates.push({
      url: url.href,
      title,
      titleWithoutYear: parsed.title,
      year: parsed.year || metaYear || slugYear,
      isSeries: /<span\s+class=["']tvshows["']/i.test(card) || /^\/seriale\//i.test(url.pathname)
    });
  }
  return candidates;
}
function tokenSimilarity(left, right) {
  const a = new Set(normalizeTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizeTitle(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(a.size, b.size);
}
function scoreXfilmeCandidate(candidate, metadata, mediaType) {
  const wanted = normalizeTitle(metadata.title);
  const full = normalizeTitle(candidate.titleWithoutYear);
  let score = 0;
  if (full === wanted) score += 100;
  else if (full.startsWith(`${wanted} `) || wanted.startsWith(`${full} `)) score += 80;
  else if (full.includes(wanted) || wanted.includes(full)) score += 65;
  score += Math.round(tokenSimilarity(full, wanted) * 35);
  if (metadata.year && candidate.year) score += metadata.year === candidate.year ? 30 : -30;
  const wantsSeries = mediaType === "tv";
  score += candidate.isSeries === wantsSeries ? 20 : -20;
  return score;
}
function selectXfilmeCandidate(candidates, metadata, mediaType) {
  const wantsSeries = mediaType === "tv";
  const eligible = candidates.filter((candidate) => candidate.isSeries === wantsSeries);
  const ranked = eligible.map((candidate) => ({ candidate, score: scoreXfilmeCandidate(candidate, metadata, mediaType) })).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 100 ? ranked[0].candidate : null;
}
function attributeValue(tag, name) {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i");
  return decodeHtml(pattern.exec(tag)?.[2] || "").trim();
}
function extractXfilmePlayers(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<li\b[^>]*>/gi)].filter((match) => attributeValue(match[0], "class").split(/\s+/).includes("dooplay_player_option"));
  const players = [];
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < openings.length; index += 1) {
    const tag = openings[index][0];
    const nume = attributeValue(tag, "data-nume").toLowerCase();
    const post = attributeValue(tag, "data-post");
    const type = attributeValue(tag, "data-type").toLowerCase() || "movie";
    if (!nume || nume === "trailer" || !post) continue;
    const end = openings[index + 1]?.index ?? Math.min(source.length, openings[index].index + 4e3);
    const chunk = source.slice(openings[index].index, end);
    const name = stripTags(/<span\s+class=["']title["']\s*>([\s\S]*?)<\/span>/i.exec(chunk)?.[1] || "");
    const key = `${post}:${nume}`;
    if (seen.has(key)) continue;
    seen.add(key);
    players.push({ post, nume, type, name });
  }
  return players;
}
function extractEpisodeUrl(html, season, episode) {
  if (!Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 1) return null;
  const expected = new RegExp(`/episoade/[a-z0-9-]+-${season}x${episode}/?(?:[?#]|$)`, "i");
  for (const match of String(html || "").matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1/gi)) {
    const raw = decodeHtml(match[2]);
    if (!expected.test(raw)) continue;
    const url = safeUrl2(raw);
    if (url && url.origin === XFILME_ORIGIN && expected.test(url.pathname)) return url.href;
  }
  return null;
}
function playerHostKind(playerUrl) {
  const url = safeUrl2(playerUrl);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (host === "xfilme.ro" || host.endsWith(".xfilme.ro")) return null;
  if (/^streamflash\.[a-z.]+$/.test(host.replace(/^www\./, ""))) return "streamflash";
  if (host.includes("vidmoly")) return "vidmoly";
  const labels = host.split(".");
  if (labels[0].startsWith("byse") || labels.includes("byselapuix")) return "byse";
  if (GATED_HOSTS.some((gated) => labels[0].startsWith(gated) || labels.includes(gated))) return null;
  return "generic";
}
function extractStreamFlashSources(html, playerUrl) {
  const video = /<video\b[^>]*>([\s\S]*?)<\/video>/i.exec(String(html || ""))?.[1] || "";
  if (!video) return null;
  const sourceTag = /<source\b[^>]*>/i.exec(video)?.[0] || "";
  const trackTag = [...video.matchAll(/<track\b[^>]*>/gi)].map((match) => match[0]).find((tag) => /\bkind\s*=\s*(["'])?(?:subtitles|captions)\1?/i.test(tag));
  const media = safeUrl2(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i.exec(sourceTag)?.[2], playerUrl);
  if (!media) return null;
  const subtitle = safeUrl2(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i.exec(trackTag || "")?.[2], playerUrl);
  const quality = /(\d{3,4})p/i.exec(stripTags(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || ""))?.[1];
  return {
    url: media.href,
    type: /\.m3u8(?:\?|$)/i.test(media.pathname) ? "hls" : "mp4",
    quality: quality ? `${quality}p` : "HD",
    subtitle: subtitle ? { url: subtitle.href, language: /\bsrclang\s*=\s*(["'])([\s\S]*?)\1/i.exec(trackTag)?.[2] || "ro", label: /\blabel\s*=\s*(["'])([\s\S]*?)\1/i.exec(trackTag)?.[2] || "Subtitrare" } : null
  };
}
function extractVidmolySources(html) {
  const source = String(html || "");
  const sourcesBlock = /sources\s*:\s*\[([\s\S]*?)\]/i.exec(source)?.[1] || "";
  const hls = [...sourcesBlock.matchAll(/file\s*:\s*(["'])([\s\S]*?)\1/gi)].map((match) => safeUrl2(match[2])).find((url) => url && /\.(?:m3u8|mp4)$/i.test(url.pathname));
  const subtitles = [];
  for (const match of source.matchAll(/file\s*:\s*(["'])([^"']+?\.(?:srt|vtt)(?:\?[^"']*)?)\1\s*,\s*label\s*:\s*(["'])([\s\S]*?)\3/gi)) {
    const url = safeUrl2(match[2]);
    if (!url) continue;
    subtitles.push({ url: url.href, language: match[4].trim().toLowerCase(), label: match[4].trim() });
  }
  if (!hls) return null;
  return { url: hls.href, type: /\.m3u8$/i.test(hls.pathname) ? "hls" : "mp4", quality: "HD", subtitles };
}
function extractGenericMediaUrls(html) {
  const decoded = String(html || "").replace(/\\u0026/gi, "&").replace(/\\\//g, "/");
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of decoded.matchAll(/https:\/\/[^\s"'<>]+?\.(?:m3u8|mp4)(?:\?[^\s"'<>]*)?/gi)) {
    const url = safeUrl2(match[0]);
    if (!url || seen.has(url.href)) continue;
    seen.add(url.href);
    results.push({
      url: url.href,
      type: /\.m3u8$/i.test(url.pathname) ? "hls" : "mp4",
      quality: "HD"
    });
    if (results.length >= GENERIC_MEDIA_LIMIT) break;
  }
  return results;
}
function mapPlayerAjaxResponse(payload) {
  if (!payload || typeof payload.embed_url !== "string") return null;
  const url = safeUrl2(payload.embed_url);
  return url ? { url: url.href, kind: playerHostKind(url.href) } : null;
}

// src/providers/xfilme.js
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
var PLAYLIST_ACCEPT = "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.9,*/*;q=0.8";
var JSON_ACCEPT = "application/json, text/javascript, */*; q=0.01";
var MAX_STREAMS = 8;
var POW_TIMEOUT_MS = 4e4;
var BYSE_TOKEN_TTL_MS = 174e4;
var byseTokens = /* @__PURE__ */ new Map();
async function fetchText(url, referer, accept = "text/html,application/xhtml+xml", attempts = 2, extraHeaders = null) {
  const headers = { Accept: accept, "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.7", "User-Agent": USER_AGENT };
  if (referer) headers.Referer = referer;
  if (extraHeaders) for (const key of Object.keys(extraHeaders)) headers[key] = extraHeaders[key];
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET", headers });
      if (!response || !response.ok) continue;
      const text = await response.text();
      if (typeof text === "string" && text.trim()) return text;
    } catch {
    }
  }
  return null;
}
async function fetchSessionCookie(origin) {
  try {
    const response = await fetch(origin + "/", { method: "GET", headers: { Accept: "text/html,application/xhtml+xml", "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.7", "User-Agent": USER_AGENT } });
    const raw = response?.headers?.get?.("set-cookie");
    if (!raw) return null;
    return /(?:^|,\s*)(SFSESSID=[^;,]+)/i.exec(raw)?.[1] || null;
  } catch {
    return null;
  }
}
async function postJson(url, payload, refererPage, embedUrl, captchaToken) {
  const origin = (() => {
    try {
      return new URL(embedUrl).origin;
    } catch {
      return XFILME_ORIGIN;
    }
  })();
  const headers = {
    Accept: JSON_ACCEPT,
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    Referer: refererPage,
    Origin: origin,
    "X-Embed-Origin": new URL(refererPage || XFILME_ORIGIN).host,
    "X-Embed-Referer": refererPage,
    "X-Embed-Parent": embedUrl
  };
  if (captchaToken) headers["X-Captcha-Token"] = captchaToken;
  try {
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    if (!response || !response.ok) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}
async function postForm(url, payload, referer) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Origin: new URL(url).origin,
        Referer: referer || `${XFILME_ORIGIN}/`,
        "User-Agent": USER_AGENT,
        "X-Requested-With": "XMLHttpRequest"
      },
      body: new URLSearchParams(payload).toString()
    });
    if (!response || !response.ok) return null;
    return JSON.parse(await response.text());
  } catch {
    return null;
  }
}
async function resolveTmdbMetadata(id, mediaType) {
  if (!/^\d+$/.test(String(id))) return null;
  const path = mediaType === "tv" ? "tv" : "movie";
  const html = await fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=en-US`);
  return html ? extractTmdbMetadata(html) : null;
}
async function resolveDetailPage(metadata, mediaType) {
  const searchUrl = `${XFILME_ORIGIN}/?s=${encodeURIComponent(metadata.title)}`;
  const html = await fetchText(searchUrl, `${XFILME_ORIGIN}/`);
  if (!html) return null;
  const candidate = selectXfilmeCandidate(extractXfilmeCandidates(html), metadata, mediaType);
  return candidate ? { url: candidate.url, searchUrl } : null;
}
function subtitleResult(subtitle, playerUrl) {
  const origin = safeUrl2(playerUrl)?.origin;
  return {
    url: subtitle.url,
    language: subtitle.language || "ro",
    name: subtitle.label || "Subtitrare",
    headers: { Referer: playerUrl, Origin: origin || XFILME_ORIGIN, "User-Agent": USER_AGENT }
  };
}
function streamResult(stream, season, episode) {
  const episodeLabel = season == null ? "" : ` • S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
  const origin = safeUrl2(stream.playerUrl)?.origin;
  const subtitles = Array.isArray(stream.subtitles) ? stream.subtitles.map((subtitle) => subtitleResult(subtitle, stream.playerUrl)) : stream.subtitle ? [subtitleResult(stream.subtitle, stream.playerUrl)] : [];
  return {
    title: `XFilme${episodeLabel} • ${stream.quality} • RO`,
    url: stream.url,
    quality: stream.quality,
    language: "ro",
    provider: "XFilme",
    type: stream.type,
    headers: { Referer: stream.playerUrl, Origin: origin || XFILME_ORIGIN, "User-Agent": USER_AGENT },
    subtitles
  };
}
async function expandHlsVariants(source, playerUrl) {
  const playlist = await fetchText(source.url, playerUrl, PLAYLIST_ACCEPT, 1);
  const variants = playlist ? extractHlsVariants(playlist, source.url) : [];
  if (!variants.length) return [{ ...source, playerUrl }];
  return variants.map((variant) => ({ ...source, url: variant.url, quality: variant.quality, playerUrl }));
}
function cachedByseToken(apiBase) {
  const entry = byseTokens.get(apiBase);
  if (entry && Date.now() < entry.expiresAt) return entry.token;
  byseTokens.delete(apiBase);
  return null;
}
async function byseAuthorize(apiBase, code, pageUrl, embedUrl) {
  const challenge = await postJson(`${apiBase}/api/videos/${encodeURIComponent(code)}/embed/captcha`, { fingerprint: BYSE_FINGERPRINT }, pageUrl, embedUrl);
  if (!challenge?.pow_token || !challenge?.pow_nonce) return null;
  const solution = solvePow(challenge.pow_nonce, challenge.pow_difficulty, POW_TIMEOUT_MS);
  if (solution == null) return null;
  const verified = await postJson(
    `${apiBase}/api/videos/${encodeURIComponent(code)}/embed/captcha/verify`,
    { pow_token: challenge.pow_token, solution, fingerprint: BYSE_FINGERPRINT },
    pageUrl,
    embedUrl
  );
  if (!verified?.token) return null;
  const ttl = Number(verified.expires_in ?? challenge.expires_in ?? 1800);
  byseTokens.set(apiBase, { token: verified.token, expiresAt: Date.now() + Math.min(BYSE_TOKEN_TTL_MS, Math.max(60, ttl - 30) * 1e3) });
  return verified.token;
}
async function resolveByseEmbed(embedUrl, pageUrl) {
  const code = byseEmbedCode(embedUrl);
  if (!code) return [];
  const apiBase = safeUrl2(embedUrl)?.origin;
  if (!apiBase) return [];
  let token = cachedByseToken(apiBase);
  if (token) {
    const cachedPlayback = await postJson(
      `${apiBase}/api/videos/${encodeURIComponent(code)}/embed/playback`,
      { fingerprint: BYSE_FINGERPRINT },
      pageUrl,
      embedUrl,
      token
    );
    const cachedSources = decryptBysePlayback(cachedPlayback?.playback ?? cachedPlayback);
    if (Array.isArray(cachedSources) && cachedSources.length) return cachedSources;
    byseTokens.delete(apiBase);
  }
  token = await byseAuthorize(apiBase, code, pageUrl, embedUrl);
  if (!token) return [];
  const playback = await postJson(
    `${apiBase}/api/videos/${encodeURIComponent(code)}/embed/playback`,
    { fingerprint: BYSE_FINGERPRINT },
    pageUrl,
    embedUrl,
    token
  );
  const sources = decryptBysePlayback(playback?.playback ?? playback);
  return Array.isArray(sources) ? sources : [];
}
async function resolveStreamFlash(embedUrl, pageUrl) {
  const origin = safeUrl2(embedUrl)?.origin;
  const sessionCookie = origin ? await fetchSessionCookie(origin) : null;
  const html = await fetchText(embedUrl, `${XFILME_ORIGIN}/`, "text/html,application/xhtml+xml", 2, sessionCookie ? { Cookie: sessionCookie } : null);
  const sources = html ? extractStreamFlashSources(html, embedUrl) : null;
  return sources ? [{ ...sources, playerUrl: embedUrl }] : [];
}
async function resolveEmbed(embed, pageUrl) {
  const kind = embed.kind;
  const embedUrl = embed.url;
  if (kind === "streamflash") {
    return resolveStreamFlash(embedUrl, pageUrl);
  }
  if (kind === "byse") {
    const sources = await resolveByseEmbed(embedUrl, pageUrl);
    const resolved = [];
    for (const source of sources) {
      for (const expanded of await expandHlsVariants({ ...source, playerUrl: embedUrl }, embedUrl)) {
        resolved.push(expanded);
      }
    }
    return resolved;
  }
  if (kind === "vidmoly") {
    const html = await fetchText(embedUrl, `${XFILME_ORIGIN}/`);
    const sources = html ? extractVidmolySources(html) : null;
    if (!sources) return [];
    return expandHlsVariants({ ...sources, playerUrl: embedUrl }, embedUrl);
  }
  if (kind === "generic") {
    const html = await fetchText(embedUrl, `${XFILME_ORIGIN}/`);
    if (!html) return [];
    const results = [];
    for (const media of extractGenericMediaUrls(html)) results.push({ ...media, subtitles: [], playerUrl: embedUrl });
    return results;
  }
  void pageUrl;
  return [];
}
async function getStreams(tmdbId, requestedType, season, episode) {
  try {
    const mediaType = normalizeMediaType(requestedType);
    if (mediaType !== "movie" && mediaType !== "tv") return [];
    const metadata = await resolveTmdbMetadata(tmdbId, mediaType);
    if (!metadata) return [];
    const page = await resolveDetailPage(metadata, mediaType);
    if (!page) return [];
    let pageHtml = await fetchText(page.url, page.searchUrl);
    let pageUrl = page.url;
    if (!pageHtml) return [];
    if (mediaType === "tv") {
      const episodeUrl = extractEpisodeUrl(pageHtml, Number(season), Number(episode));
      if (!episodeUrl) return [];
      const episodeHtml = await fetchText(episodeUrl, page.url);
      if (!episodeHtml) return [];
      pageHtml = episodeHtml;
      pageUrl = episodeUrl;
    }
    const players = extractXfilmePlayers(pageHtml);
    const resolved = [];
    const seen = /* @__PURE__ */ new Set();
    for (const player of players) {
      const payload = await postForm(
        `${XFILME_ORIGIN}/wp-admin/admin-ajax.php`,
        { action: "doo_player_ajax", post: player.post, nume: player.nume, type: player.type },
        pageUrl
      );
      const embed = payload ? mapPlayerAjaxResponse(payload) : null;
      if (!embed?.url || !embed.kind) continue;
      for (const source of await resolveEmbed(embed, pageUrl)) {
        if (!source?.url || seen.has(source.url)) continue;
        seen.add(source.url);
        resolved.push(source);
        if (resolved.length >= MAX_STREAMS) break;
      }
      if (resolved.length >= MAX_STREAMS) break;
    }
    const requestedSeason = mediaType === "tv" ? Number(season) : null;
    const requestedEpisode = mediaType === "tv" ? Number(episode) : null;
    return resolved.map((stream) => streamResult(stream, requestedSeason, requestedEpisode));
  } catch (error) {
    console.error("XFilme failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
