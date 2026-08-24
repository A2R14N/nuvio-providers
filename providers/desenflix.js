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

// src/lib/deseneledublate.js
var DESENELEDUBLATE_ORIGIN = "https://deseneledublate.com";
function decodeJavaScriptEscapes(value) {
  return decodeHtml(String(value || "")).replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16))).replace(/\\\//g, "/").replace(/\\&/g, "&").replace(/\\"/g, '"');
}
var STREAMTAPE_HOSTS = ["streamtape.com", "streamtape.to", "streamtape.net", "strcloud.in", "streamadblocker.tube", "tapewithadblock.org"];
function isStreamtapeHost(hostname) {
  const host = hostname.toLowerCase();
  return STREAMTAPE_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
function applySubstrings(value, offsets) {
  let result = value;
  for (const offset of offsets) result = result.slice(offset);
  return result;
}
function decodeStreamtapeSource(html) {
  const source = String(html || "");
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of source.matchAll(
    /robotlink['"]?\)?[^=]{0,40}?=\s*(["'])([^"']*)\1\s*\+\s*(?:['"]{2}\s*\+\s*)?\(\s*(["'])((?:(?!\3).)+)\3\s*\)((?:\.substring\(\s*\d+\s*\))*)/gi
  )) {
    const prefix = decodeJavaScriptEscapes(match[2]).trim();
    const offsets = [...match[5].matchAll(/\.substring\(\s*(\d+)\s*\)/gi)].map((part) => Number(part[1]));
    const rebuilt = `${prefix}${applySubstrings(match[4], offsets)}`;
    try {
      const url = new URL(rebuilt.startsWith("//") ? `https:${rebuilt}` : rebuilt, DESENELEDUBLATE_ORIGIN);
      if (url.protocol !== "https:" || !isStreamtapeHost(url.hostname)) continue;
      if (url.pathname !== "/get_video" || !url.searchParams.get("id") || seen.has(url.href)) continue;
      seen.add(url.href);
      candidates.push(url.href);
    } catch {
    }
  }
  return candidates.find((url) => new URL(url).hostname.toLowerCase() === "streamtape.com") || candidates[0] || null;
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
function powHashBytes(length) {
  const table = POW_TABLE;
  const input = POW_INPUT;
  let mixedState = 0;
  let s0 = 1779033703;
  let s1 = 3144134277;
  let s2 = 1013904242;
  let s3 = 2773480762;
  for (let index = 0; index < length; index += 1) {
    s0 = s0 + input[index] >>> 0;
    s0 = (s0 << 7 | s0 >>> 25) >>> 0;
    s0 = s0 + s1 >>> 0;
    mixedState = s3 ^ s0;
    s3 = (mixedState << 16 | mixedState >>> 16) >>> 0;
    s2 = s2 + s3 >>> 0;
    mixedState = s1 ^ s2;
    s1 = (mixedState << 12 | mixedState >>> 20) >>> 0;
    s0 = s0 + s1 >>> 0;
    mixedState = s3 ^ s0;
    s3 = (mixedState << 8 | mixedState >>> 24) >>> 0;
    s2 = s2 + s3 >>> 0;
    mixedState = s1 ^ s2;
    s1 = (mixedState << 7 | mixedState >>> 25) >>> 0;
  }
  for (let index = 0; index < 8; index += 1) {
    s0 = s0 + s1 >>> 0;
    mixedState = s3 ^ s0;
    s3 = (mixedState << 16 | mixedState >>> 16) >>> 0;
    s2 = s2 + s3 >>> 0;
    mixedState = s1 ^ s2;
    s1 = (mixedState << 12 | mixedState >>> 20) >>> 0;
    s0 = s0 + s1 >>> 0;
    mixedState = s3 ^ s0;
    s3 = (mixedState << 8 | mixedState >>> 24) >>> 0;
    s2 = s2 + s3 >>> 0;
    mixedState = s1 ^ s2;
    s1 = (mixedState << 7 | mixedState >>> 25) >>> 0;
  }
  for (let index = 0; index < 512; index += 1) {
    s0 = s0 + s1 >>> 0;
    mixedState = s3 ^ s0;
    s3 = (mixedState << 16 | mixedState >>> 16) >>> 0;
    s2 = s2 + s3 >>> 0;
    mixedState = s1 ^ s2;
    s1 = (mixedState << 12 | mixedState >>> 20) >>> 0;
    s0 = s0 + s1 >>> 0;
    mixedState = s3 ^ s0;
    s3 = (mixedState << 8 | mixedState >>> 24) >>> 0;
    s2 = s2 + s3 >>> 0;
    mixedState = s1 ^ s2;
    s1 = (mixedState << 7 | mixedState >>> 25) >>> 0;
    table[index] = (s0 ^ s2) >>> 0;
  }
  for (let round = 0; round < 2; round += 1) {
    for (let index = 0; index < 512; index += 1) {
      const target = table[index] & 511;
      let mixed = table[index] + table[target] >>> 0;
      mixed = (mixed << 13 | mixed >>> 19) >>> 0;
      mixed = (mixed ^ Math.imul(table[index + 1 & 511], 2654435761)) >>> 0;
      table[index] = mixed;
      s0 = (s0 ^ mixed) >>> 0;
      s0 = s0 + s1 >>> 0;
      mixedState = s3 ^ s0;
      s3 = (mixedState << 16 | mixedState >>> 16) >>> 0;
      s2 = s2 + s3 >>> 0;
      mixedState = s1 ^ s2;
      s1 = (mixedState << 12 | mixedState >>> 20) >>> 0;
      s0 = s0 + s1 >>> 0;
      mixedState = s3 ^ s0;
      s3 = (mixedState << 8 | mixedState >>> 24) >>> 0;
      s2 = s2 + s3 >>> 0;
      mixedState = s1 ^ s2;
      s1 = (mixedState << 7 | mixedState >>> 25) >>> 0;
    }
  }
  const out = POW_OUT;
  for (let block = 0; block < 8; block += 1) {
    s0 = s0 + s1 >>> 0;
    mixedState = s3 ^ s0;
    s3 = (mixedState << 16 | mixedState >>> 16) >>> 0;
    s2 = s2 + s3 >>> 0;
    mixedState = s1 ^ s2;
    s1 = (mixedState << 12 | mixedState >>> 20) >>> 0;
    s0 = s0 + s1 >>> 0;
    mixedState = s3 ^ s0;
    s3 = (mixedState << 8 | mixedState >>> 24) >>> 0;
    s2 = s2 + s3 >>> 0;
    mixedState = s1 ^ s2;
    s1 = (mixedState << 7 | mixedState >>> 25) >>> 0;
    let accumulator = s0;
    const base = block * 64;
    for (let position = 0; position < 64; position += 1) {
      const value = table[base + position];
      accumulator = accumulator + value >>> 0;
      accumulator = (accumulator << 5 | accumulator >>> 27) >>> 0;
      accumulator = (accumulator ^ Math.imul(value, 2246822519)) >>> 0;
    }
    out[block] = (accumulator ^ s2) >>> 0;
  }
  return out;
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
      const words = powHashBytes(position);
      let matched = false;
      if (level <= 32) {
        const threshold = level === 32 ? 0 : 4294967296 / Math.pow(2, level) >>> 0;
        matched = words[0] < threshold && leadingZeroBits(words) >= level;
      } else {
        matched = words[0] === 0 && leadingZeroBits(words) >= level;
      }
      if (matched) return String(counter);
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
function attributeValue(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return decodeHtml(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i").exec(tag)?.[2] || "").trim();
}
function splitTitleAndYear2(value) {
  const clean = decodeHtml(String(value || "")).replace(/\s+/g, " ").trim();
  const match = /^(.*?)\s*\((\d{4})\)\s*[\s\S]*$/.exec(clean);
  return match ? { title: match[1].trim(), year: Number(match[2]) } : { title: clean, year: null };
}
function yearFromSlug(pathname) {
  const match = /(?:^|-)(19\d{2}|20\d{2})(?:-|$)/.exec(String(pathname || ""));
  return match ? Number(match[1]) : null;
}
function normalizeTitleValue(value) {
  return decodeHtml(String(value || "")).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function extractRestSearchResults(jsonText) {
  let data;
  try {
    data = JSON.parse(String(jsonText || "[]"));
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of data) {
    const url = safeUrl(item?.url);
    const title = stripTags(item?.title || "");
    if (!url || url.origin !== DESENFLIX_ORIGIN || !title || seen.has(url.href)) continue;
    seen.add(url.href);
    const parsed = splitTitleAndYear2(title);
    const year = parsed.year ?? yearFromSlug(url.pathname);
    candidates.push({ url: url.href, title, titleWithoutYear: parsed.title, year });
  }
  return candidates;
}
function titleSimilarity(left, right) {
  const a = new Set(normalizeTitleValue(left).split(" ").filter(Boolean));
  const b = new Set(normalizeTitleValue(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(a.size, b.size);
}
function rankSearchResults(candidates, metadata) {
  const wanted = normalizeTitleValue(metadata?.title);
  const scored = candidates.map((candidate) => {
    const found = normalizeTitleValue(candidate.titleWithoutYear);
    let score = found === wanted ? 130 : found.includes(wanted) || wanted.includes(found) ? 85 : 0;
    score += Math.round(titleSimilarity(candidate.titleWithoutYear, metadata?.title) * 50);
    if (metadata?.year && candidate.year) score += metadata.year === candidate.year ? 30 : -30;
    return { candidate, score };
  }).sort((left, right) => right.score - left.score);
  const strong = scored.filter((entry) => entry.score >= 105).map((entry) => entry.candidate);
  if (strong.length) return strong;
  if (metadata?.year) {
    const sameYear = candidates.filter((candidate) => candidate.year === metadata.year);
    if (sameYear.length === 1) return sameYear;
  }
  return [];
}
function extractEpisodeCards(html) {
  const cards = [];
  const seen = /* @__PURE__ */ new Set();
  const source = String(html || "");
  const openings = [...source.matchAll(/<details\b[^>]*class=["'][^"']*dfx-episode-card[^"']*["'][^>]*>/gi)];
  openings.forEach((opening) => {
    const src = attributeValue(opening[0], "data-src");
    const label = stripTags(attributeValue(opening[0], "data-title"));
    const numbers = /^Sezonul\s+(\d+)\s*-\s*Episodul\s+(\d+)/i.exec(label);
    const url = safeUrl(src);
    if (!numbers || !Number.isInteger(Number(numbers[1])) || !Number.isInteger(Number(numbers[2])) || !url) return;
    if (seen.has(url.href)) return;
    seen.add(url.href);
    cards.push({ season: Number(numbers[1]), episode: Number(numbers[2]), title: label, url: url.href });
  });
  return cards;
}
function findEpisodeCard(cards, season, episode) {
  return cards.find((card) => card.season === season && card.episode === episode)?.url || null;
}
var BYSE_HOSTS = ["byseraguci.com", "byse.sx"];
var STREAMTAPE_HOSTS2 = ["streamtape.com", "streamtape.to", "streamtape.net", "strcloud.in", "streamadblocker.tube", "tapewithadblock.org"];
function hostMatches(hostname, domains) {
  const host = String(hostname || "").toLowerCase();
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
function extractMainPlayerEmbed(html) {
  const source = String(html || "");
  const iframe = /<iframe\b[^>]*id=["']dfx-main-player["'][^>]*>/i.exec(source)?.[0] || /<iframe\b[^>]*src=["']https?:\/\/[^"']*(?:byseraguci\.com|byse\.sx)\/e\/[^"']*["'][^>]*>/i.exec(source)?.[0];
  if (!iframe) return null;
  return safeUrl(attributeValue(iframe, "src"))?.href || null;
}
function playerKindForEmbed(embedUrl) {
  const url = safeUrl(embedUrl);
  if (!url) return null;
  if (hostMatches(url.hostname, BYSE_HOSTS)) return "byse";
  if (hostMatches(url.hostname, STREAMTAPE_HOSTS2)) return "streamtape";
  return null;
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

// src/providers/desenflix.js
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
var HTML_ACCEPT = "text/html,application/xhtml+xml";
var JSON_ACCEPT = "application/json,text/plain;q=0.9,*/*;q=0.8";
var POW_TIMEOUT_MS = 45e3;
async function fetchText(url, referer, accept = HTML_ACCEPT, attempts = 2) {
  const headers = { Accept: accept, "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.7", "User-Agent": USER_AGENT };
  if (referer) headers.Referer = referer;
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
async function postJson(url, bodyObjectOrString, refererPage, embedUrl, captchaToken) {
  const origin = (() => {
    try {
      return new URL(embedUrl).origin;
    } catch {
      return DESENFLIX_ORIGIN;
    }
  })();
  const headers = {
    Accept: JSON_ACCEPT,
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    Referer: refererPage,
    Origin: origin,
    "X-Embed-Origin": new URL(refererPage || DESENFLIX_ORIGIN).host,
    "X-Embed-Referer": refererPage,
    "X-Embed-Parent": embedUrl
  };
  if (captchaToken) headers["X-Captcha-Token"] = captchaToken;
  try {
    const response = await fetch(url, { method: "POST", headers, body: typeof bodyObjectOrString === "string" ? bodyObjectOrString : JSON.stringify(bodyObjectOrString) });
    if (!response || !response.ok) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}
async function resolveTmdbMetadata(id, mediaType) {
  if (!/^\d+$/.test(String(id))) return null;
  const path = mediaType === "tv" ? "tv" : "movie";
  const variants = await Promise.all([
    fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=ro-RO`, DESENFLIX_ORIGIN, HTML_ACCEPT, 1),
    fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=en-US`, DESENFLIX_ORIGIN, HTML_ACCEPT, 1)
  ]);
  const titles = [];
  for (const html of variants) {
    const metadata = html ? extractTmdbMetadata(html) : null;
    if (metadata?.title && !titles.some((existing) => existing.title === metadata.title)) titles.push(metadata);
  }
  return titles.length ? { titles } : null;
}
async function resolveTitlePage(titles, mediaType, seasonNumber, episodeNumber) {
  const used = /* @__PURE__ */ new Set();
  for (const metadata of titles) {
    const searchUrl = `${DESENFLIX_ORIGIN}/wp-json/wp/v2/search?search=${encodeURIComponent(metadata.title)}&per_page=10`;
    if (used.has(searchUrl)) continue;
    used.add(searchUrl);
    const payload = await fetchText(searchUrl, `${DESENFLIX_ORIGIN}/`, JSON_ACCEPT);
    if (!payload) continue;
    const ranked = rankSearchResults(extractRestSearchResults(payload), metadata).slice(0, 3);
    for (const candidate of ranked) {
      const pageHtml = await fetchText(candidate.url, searchUrl);
      if (!pageHtml) continue;
      if (mediaType === "tv") {
        const episodeUrl = findEpisodeCard(extractEpisodeCards(pageHtml), seasonNumber, episodeNumber);
        if (episodeUrl) return { kind: "tv", pageUrl: candidate.url, embedUrl: episodeUrl };
      } else {
        const mainEmbed = extractMainPlayerEmbed(pageHtml);
        if (mainEmbed) return { kind: "movie", pageUrl: candidate.url, embedUrl: mainEmbed };
      }
    }
  }
  return null;
}
async function resolveByseEmbed(embedUrl, pageUrl) {
  const code = byseEmbedCode(embedUrl);
  if (!code) return [];
  const apiBase = (() => {
    try {
      return new URL(embedUrl).origin;
    } catch {
      return null;
    }
  })();
  if (!apiBase) return [];
  const challenge = await postJson(`${apiBase}/api/videos/${encodeURIComponent(code)}/embed/captcha`, { fingerprint: BYSE_FINGERPRINT }, pageUrl, embedUrl);
  if (!challenge?.pow_token || !challenge?.pow_nonce) return [];
  const solution = solvePow(challenge.pow_nonce, challenge.pow_difficulty, POW_TIMEOUT_MS);
  if (solution == null) return [];
  const verified = await postJson(
    `${apiBase}/api/videos/${encodeURIComponent(code)}/embed/captcha/verify`,
    { pow_token: challenge.pow_token, solution, fingerprint: BYSE_FINGERPRINT },
    pageUrl,
    embedUrl
  );
  if (!verified?.token) return [];
  const playback = await postJson(
    `${apiBase}/api/videos/${encodeURIComponent(code)}/embed/playback`,
    { fingerprint: BYSE_FINGERPRINT },
    pageUrl,
    embedUrl,
    verified.token
  );
  const sources = decryptBysePlayback(playback?.playback ?? playback);
  return Array.isArray(sources) ? sources : [];
}
async function resolveEmbed(embedUrl, pageUrl) {
  const kind = playerKindForEmbed(embedUrl);
  if (kind === "byse") return await resolveByseEmbed(embedUrl, pageUrl);
  if (kind === "streamtape") {
    const html = await fetchText(embedUrl, pageUrl, HTML_ACCEPT, 2);
    if (!html) return [];
    const url = decodeStreamtapeSource(html);
    return url ? [{ url, quality: "HD", type: "mp4" }] : [];
  }
  return [];
}
function streamResult(stream, season, episode) {
  const episodeLabel = season == null ? "" : ` • S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
  let origin = null;
  try {
    origin = new URL(stream.refererUrl).origin;
  } catch {
  }
  const headers = { Referer: stream.refererUrl, "User-Agent": USER_AGENT };
  if (origin) headers.Origin = origin;
  return {
    title: `DesenFlix${episodeLabel} • ${stream.quality} • RO`,
    url: stream.url,
    quality: stream.quality,
    language: "ro",
    provider: "DesenFlix",
    type: stream.type,
    headers
  };
}
async function expandHls(source, embedUrl) {
  const master = await fetchText(
    source.url,
    source.refererUrl || embedUrl,
    "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.9,*/*;q=0.8",
    1
  );
  const variants = master ? extractHlsVariants(master, source.url) : [];
  if (variants.length) return variants.map((variant) => ({ ...variant, type: "hls", refererUrl: source.refererUrl || embedUrl }));
  return [{ ...source, quality: source.quality || "HD", refererUrl: source.refererUrl || embedUrl }];
}
async function getStreams(tmdbId, requestedType, season, episode) {
  try {
    const mediaType = normalizeMediaType(requestedType);
    if (mediaType !== "movie" && mediaType !== "tv") return [];
    const seasonNumber = mediaType === "tv" ? Number(season) : null;
    const episodeNumber = mediaType === "tv" ? Number(episode) : null;
    if (mediaType === "tv" && (!Number.isInteger(seasonNumber) || seasonNumber < 0 || !Number.isInteger(episodeNumber) || episodeNumber < 1)) return [];
    const metadata = await resolveTmdbMetadata(tmdbId, mediaType);
    if (!metadata) return [];
    const page = await resolveTitlePage(metadata.titles, mediaType, seasonNumber, episodeNumber);
    if (!page) return [];
    const results = [];
    const seen = /* @__PURE__ */ new Set();
    for (const source of await resolveEmbed(page.embedUrl, page.pageUrl)) {
      const streams = source.type === "hls" ? await expandHls(source, page.embedUrl) : [{ ...source, refererUrl: page.embedUrl }];
      for (const stream of streams) {
        if (seen.has(stream.url)) continue;
        seen.add(stream.url);
        results.push(streamResult({ ...stream, refererUrl: stream.refererUrl || page.embedUrl }, seasonNumber, episodeNumber));
      }
    }
    return results;
  } catch (error) {
    console.error("DesenFlix failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
