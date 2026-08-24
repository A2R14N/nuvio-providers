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
var DESENEFAINE_ORIGIN = "https://desenefaine.com";
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
function utf8Text(bytes) {
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
function extractFilemoonCode(playerUrl) {
  const url = safeUrl(playerUrl);
  if (!url) return null;
  return /^\/e\/([A-Za-z0-9]+)/.exec(url.pathname)?.[1] || null;
}
function decryptFilemoonPlayback(playback) {
  try {
    const version = Number.parseInt(playback?.version, 10);
    const parts = Array.isArray(playback?.key_parts) ? playback.key_parts : [];
    const first = base64UrlBytes(parts[version - 1]);
    const second = base64UrlBytes(parts[30 - version]);
    const iv = base64UrlBytes(playback?.iv);
    const encrypted = base64UrlBytes(playback?.payload);
    if (!first || !second || !iv || !encrypted) return null;
    const key = new Uint8Array(first.length + second.length);
    key.set(first);
    key.set(second, first.length);
    const plaintext = decryptAes256Gcm(key, iv, encrypted);
    if (!plaintext) return null;
    const data = JSON.parse(utf8Text(plaintext));
    const sources = Array.isArray(data?.sources) ? data.sources : [];
    for (let index = sources.length - 1; index >= 0; index -= 1) {
      const value = typeof sources[index] === "string" ? sources[index] : sources[index]?.url || sources[index]?.file;
      const url = safeUrl(value);
      if (url && /\.m3u8$/i.test(url.pathname)) return url.href;
    }
  } catch {
  }
  return null;
}
function safeUrl(value, base = DESENEFAINE_ORIGIN) {
  try {
    const url = new URL(decodeHtml(String(value || "")).replace(/\\\//g, "/").trim(), base);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
function attributeValue(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return decodeHtml(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i").exec(tag)?.[2] || "").trim();
}
function articleChunks(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<article\b[^>]*>/gi)];
  return openings.map((match, index) => source.slice(match.index, openings[index + 1]?.index ?? source.length));
}
function extractDeseneFaineCandidates(html) {
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (const article of articleChunks(html)) {
    const linkMatch = /<a\b[^>]*href\s*=\s*(["'])([^"']*\/(?:film|serial)\/[^"']+)\1[^>]*>/i.exec(article);
    if (!linkMatch) continue;
    const url = safeUrl(linkMatch[2]);
    if (!url || url.origin !== DESENEFAINE_ORIGIN || !/^\/(?:film|serial)\/[^/]+\/?$/i.test(url.pathname) || seen.has(url.href)) continue;
    const heading = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(article)?.[1] || /class\s*=\s*(["'])[^"']*\bentry-title\b[^"']*\1[^>]*>([\s\S]*?)<\//i.exec(article)?.[2];
    const title = stripTags(heading || "");
    if (!title) continue;
    const year = Number(/class\s*=\s*(["'])[^"']*\byear\b[^"']*\1[^>]*>\s*(\d{4})/i.exec(article)?.[2] || 0) || null;
    seen.add(url.href);
    candidates.push({ url: url.href, title, year, type: url.pathname.startsWith("/serial/") ? "tv" : "movie" });
  }
  return candidates;
}
function titleSimilarity(left, right) {
  const a = new Set(normalizeTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizeTitle(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(a.size, b.size);
}
function selectDeseneFaineCandidate(candidates, metadata, mediaType) {
  const wanted = normalizeTitle(metadata?.title);
  const typed = candidates.filter((candidate) => candidate.type === mediaType);
  const ranked = typed.map((candidate) => {
    const found = normalizeTitle(candidate.title);
    let score = found === wanted ? 130 : found.includes(wanted) || wanted.includes(found) ? 85 : 0;
    score += Math.round(titleSimilarity(found, wanted) * 50);
    if (metadata?.year && candidate.year) score += metadata.year === candidate.year ? 30 : -30;
    return { candidate, score };
  }).sort((left, right) => right.score - left.score);
  if (ranked[0] && ranked[0].score >= 105) return ranked[0].candidate;
  const sameYear = metadata?.year ? typed.filter((candidate) => candidate.year === metadata.year) : [];
  return sameYear.length === 1 ? sameYear[0] : null;
}
function extractEpisodeUrl(html, season, episode) {
  if (!Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 1) return null;
  const pattern = new RegExp(`/epi/[^"'?#]+-sezonul-${season}-episodul-${episode}/?`, "i");
  for (const match of String(html || "").matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1/gi)) {
    const url = safeUrl(match[2]);
    if (url && url.origin === DESENEFAINE_ORIGIN && pattern.test(url.pathname)) return url.href;
  }
  return null;
}
function isRomanianDubbed(html) {
  const source = String(html || "");
  const labels = [];
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(source)?.[1];
  if (title) labels.push(stripTags(title));
  for (const tag of source.match(/<meta\b[^>]*>/gi) || []) {
    const property = attributeValue(tag, "property").toLowerCase();
    const name = attributeValue(tag, "name").toLowerCase();
    if (property === "og:title" || name === "twitter:title") labels.push(attributeValue(tag, "content"));
  }
  return labels.some((label) => /\bdublat(?:e|ă)?\s+(?:în|in)\s+rom[aâ]n[ăa](?:\s|$|[^A-Za-z0-9])/i.test(label));
}
function decodeBase64(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = String(value || "").replace(/[^A-Za-z0-9+/=]/g, "");
  let output = "";
  let bits = 0;
  let bitCount = 0;
  for (const character of clean) {
    if (character === "=") break;
    const index = alphabet.indexOf(character);
    if (index < 0) continue;
    bits = bits << 6 | index;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      output += String.fromCharCode(bits >> bitCount & 255);
    }
  }
  return output;
}
function extractPlayerOptions(html) {
  const options = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of String(html || "").matchAll(/<a\b[^>]*\bdata-src\s*=\s*(["'])(.*?)\1[^>]*>[\s\S]*?<\/a>/gi)) {
    const decoded = decodeBase64(decodeHtml(match[2]));
    const url = safeUrl(decoded);
    if (!url || url.origin !== DESENEFAINE_ORIGIN || url.pathname !== "/" || !/[?&]trembed=\d+(?:&|$)/i.test(url.search) || !/[?&]trid=\d+(?:&|$)/i.test(url.search) || !/[?&]trtype=[12](?:&|$)/i.test(url.search) || seen.has(url.href)) continue;
    seen.add(url.href);
    options.push({ url: url.href, label: stripTags(match[0]) || `Server ${options.length + 1}` });
  }
  return options;
}
function extractHiddenPlayerUrl(html) {
  for (const match of String(html || "").matchAll(/<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/gi)) {
    const url = safeUrl(match[2]);
    if (url && url.origin === DESENEFAINE_ORIGIN && /[?&]trhide=1(?:&|$)/i.test(url.search) && /[?&]tid=[0-9a-f]+(?:&|$)/i.test(url.search)) return url.href.replace(/&$/, "");
  }
  return null;
}
function decodeExternalPlayerUrl(html) {
  const token = /\btrde\(\s*(["'])([0-9a-f]+)\1\s*\)/i.exec(String(html || ""))?.[2];
  if (!token || token.length % 2 !== 0) return null;
  const hex = token.split("").reverse().join("");
  let decoded = "";
  for (let index = 0; index < hex.length; index += 2) {
    const byte = Number.parseInt(hex.slice(index, index + 2), 16);
    if (!Number.isInteger(byte)) return null;
    decoded += String.fromCharCode(byte);
  }
  const url = safeUrl(decoded);
  if (!url || url.origin === DESENEFAINE_ORIGIN) return null;
  return url.href;
}
function playerKind(playerUrl) {
  const url = safeUrl(playerUrl);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (["vidmoly.org", "vidmoly.biz", "vidmoly.net"].some((domain) => host === domain || host.endsWith(`.${domain}`))) return "vidmoly";
  if (["filemoon.sx", "filemoon.to", "filemoon.link", "bysewihe.com"].some((domain) => host === domain || host.endsWith(`.${domain}`))) return "filemoon";
  if (["voe.sx", "voe-network.net"].some((domain) => host === domain || host.endsWith(`.${domain}`))) return "voe";
  if (host === "ok.ru" || host.endsWith(".ok.ru")) return "okru";
  return null;
}
function extractDirectMedia(html) {
  const decoded = decodeHtml(String(html || "")).replace(/\\u0026/gi, "&").replace(/\\u002f/gi, "/").replace(/\\\//g, "/").replace(/\\&/g, "&").replace(/\\"/g, '"');
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  const patterns = [
    /(?:file|src|source|hls)\s*[:=]\s*(["'])(https:[\s\S]*?\.(?:m3u8|mp4)(?:\?[^"']*)?)\1/gi,
    /(https:\/\/[^"'\s<>]+\.(?:m3u8|mp4)(?:\?[^"'\s<>]*)?)/gi
  ];
  for (const pattern of patterns) {
    for (const match of decoded.matchAll(pattern)) {
      const url = safeUrl(match[2] || match[1]);
      if (!url || seen.has(url.href) || !/\.(?:m3u8|mp4)$/i.test(url.pathname)) continue;
      seen.add(url.href);
      const quality = /(?:^|[^\d])(\d{3,4})(?:p|(?=\.(?:m3u8|mp4)))/i.exec(match[0])?.[1];
      results.push({ url: url.href, type: url.pathname.toLowerCase().endsWith(".mp4") ? "mp4" : "hls", quality: quality ? `${quality}p` : "HD" });
    }
  }
  return results;
}

// src/providers/desenefaine.js
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
var HTML_ACCEPT = "text/html,application/xhtml+xml";
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
async function resolveTmdbMetadata(id, mediaType) {
  if (!/^\d+$/.test(String(id))) return null;
  const path = mediaType === "tv" ? "tv" : "movie";
  const html = await fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=en-US`);
  return html ? extractTmdbMetadata(html) : null;
}
async function resolveTitlePage(metadata, mediaType) {
  const searchUrl = `${DESENEFAINE_ORIGIN}/?s=${encodeURIComponent(metadata.title)}`;
  const html = await fetchText(searchUrl, `${DESENEFAINE_ORIGIN}/`);
  if (!html) return null;
  const candidate = selectDeseneFaineCandidate(extractDeseneFaineCandidates(html), metadata, mediaType);
  return candidate ? { ...candidate, searchUrl } : null;
}
async function resolveOption(option, pageUrl) {
  const optionHtml = await fetchText(option.url, pageUrl);
  const hiddenUrl = extractHiddenPlayerUrl(optionHtml);
  if (!hiddenUrl) return [];
  const hiddenHtml = await fetchText(hiddenUrl, option.url);
  const externalUrl = decodeExternalPlayerUrl(hiddenHtml);
  const kind = externalUrl ? playerKind(externalUrl) : null;
  if (!externalUrl || !kind) return [];
  if (kind === "filemoon" && new URL(externalUrl).hostname.toLowerCase().endsWith("bysewihe.com")) {
    const code = extractFilemoonCode(externalUrl);
    if (!code) return [];
    const origin = new URL(externalUrl).origin;
    try {
      const response = await fetch(`${origin}/api/videos/${encodeURIComponent(code)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Origin: origin,
          Referer: externalUrl,
          "User-Agent": USER_AGENT
        }
      });
      if (!response || !response.ok) return [];
      const data = JSON.parse(await response.text());
      const streamUrl = decryptFilemoonPlayback(data?.playback);
      return streamUrl ? [{ url: streamUrl, type: "hls", quality: "HD", playerUrl: externalUrl, refererUrl: `${origin}/` }] : [];
    } catch {
      return [];
    }
  }
  const playerHtml = await fetchText(externalUrl, pageUrl);
  if (!playerHtml) return [];
  return extractDirectMedia(playerHtml).map((stream) => ({ ...stream, playerUrl: externalUrl }));
}
function streamResult(stream, pageUrl, season, episode, dubbed) {
  const episodeLabel = season == null ? "" : ` • S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
  const playerOrigin = new URL(stream.playerUrl).origin;
  return {
    title: `DeseneFaine${episodeLabel} • ${stream.quality} • ${dubbed ? "RO DUB" : "RO"}`,
    url: stream.url,
    quality: stream.quality,
    language: "ro",
    provider: "DeseneFaine",
    type: stream.type,
    headers: { Referer: stream.refererUrl || stream.playerUrl, Origin: playerOrigin, "User-Agent": USER_AGENT }
  };
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
    const page = await resolveTitlePage(metadata, mediaType);
    if (!page) return [];
    const detailHtml = await fetchText(page.url, page.searchUrl);
    if (!detailHtml) return [];
    let pageUrl = page.url;
    let pageHtml = detailHtml;
    if (mediaType === "tv") {
      const episodeUrl = extractEpisodeUrl(detailHtml, seasonNumber, episodeNumber);
      if (!episodeUrl) return [];
      const episodeHtml = await fetchText(episodeUrl, page.url);
      if (!episodeHtml) return [];
      pageUrl = episodeUrl;
      pageHtml = episodeHtml;
    }
    const resolved = [];
    const seen = /* @__PURE__ */ new Set();
    for (const option of extractPlayerOptions(pageHtml)) {
      for (const source of await resolveOption(option, pageUrl)) {
        if (source.type === "hls") {
          const playlist = await fetchText(source.url, source.playerUrl, "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.9,*/*;q=0.8", 1);
          const variants = playlist ? extractHlsVariants(playlist, source.url) : [];
          const streams = variants.length ? variants.map((variant) => ({ ...variant, type: "hls", playerUrl: source.playerUrl })) : [source];
          for (const stream of streams) if (!seen.has(stream.url)) {
            seen.add(stream.url);
            resolved.push(stream);
          }
        } else if (!seen.has(source.url)) {
          seen.add(source.url);
          resolved.push(source);
        }
      }
    }
    const dubbed = isRomanianDubbed(pageHtml) || mediaType === "tv" && isRomanianDubbed(detailHtml);
    return resolved.map((stream) => streamResult(stream, pageUrl, seasonNumber, episodeNumber, dubbed));
  } catch (error) {
    console.error("DeseneFaine failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
