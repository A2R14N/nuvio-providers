/**
 * desenflix - Built from src/desenflix/
 * Generated: 2026-08-07T21:48:51.971Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/desenflix/constants.js
var BASE_URL = "https://desenflix.online";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// src/desenflix/tmdb.js
var TMDB_API_KEY = "31031042b5deb218a10d70a4c01ea934";
function getMediaInfo(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    const id = typeof tmdbId === "object" ? tmdbId.tmdbId || tmdbId.id : tmdbId;
    if (!id)
      return null;
    try {
      const endpoint = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
      const detailsUrl = `https://api.themoviedb.org/3/${endpoint}/${encodeURIComponent(id)}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
      const response = yield fetch(detailsUrl, {
        headers: { "User-Agent": USER_AGENT }
      });
      if (!response.ok)
        return null;
      const data = yield response.json();
      const romanian = (_b = (_a = data.translations) == null ? void 0 : _a.translations) == null ? void 0 : _b.find(
        (translation) => translation.iso_639_1 === "ro"
      );
      return {
        title: data.name || data.title,
        originalTitle: data.original_name || data.original_title,
        romanianTitle: ((_c = romanian == null ? void 0 : romanian.data) == null ? void 0 : _c.name) || ((_d = romanian == null ? void 0 : romanian.data) == null ? void 0 : _d.title) || null,
        year: (data.first_air_date || data.release_date || "").split("-")[0]
      };
    } catch (error) {
      console.warn(`[DesenFlix] TMDB lookup failed: ${error.message}`);
      return null;
    }
  });
}

// src/desenflix/extractor.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/desenflix/http.js
function fetchText(_0) {
  return __async(this, arguments, function* (url, referer = `${BASE_URL}/`) {
    const response = yield fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: referer,
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} on ${url}`);
    }
    return response.text();
  });
}

// src/desenflix/byse.js
var MEMORY_WORDS = 512;
var MEMORY_MASK = MEMORY_WORDS - 1;
var MEMORY_ROUNDS = 2;
var MIX_A = 2654435761;
var MIX_B = 2246822519;
function rotateLeft(value, bits) {
  return (value << bits | value >>> 32 - bits) >>> 0;
}
function multiply(value, factor) {
  return Math.imul(value, factor) >>> 0;
}
function quarterRound(state) {
  state[0] = state[0] + state[1] >>> 0;
  state[3] = rotateLeft(state[3] ^ state[0], 16);
  state[2] = state[2] + state[3] >>> 0;
  state[1] = rotateLeft(state[1] ^ state[2], 12);
  state[0] = state[0] + state[1] >>> 0;
  state[3] = rotateLeft(state[3] ^ state[0], 8);
  state[2] = state[2] + state[3] >>> 0;
  state[1] = rotateLeft(state[1] ^ state[2], 7);
}
function memoryHash(bytes) {
  const state = new Uint32Array([
    1779033703,
    3144134277,
    1013904242,
    2773480762
  ]);
  for (let index = 0; index < bytes.length; index++) {
    state[0] = state[0] + bytes[index] >>> 0;
    state[0] = rotateLeft(state[0], 7);
    quarterRound(state);
  }
  for (let index = 0; index < 8; index++)
    quarterRound(state);
  const memory = new Uint32Array(MEMORY_WORDS);
  for (let index = 0; index < MEMORY_WORDS; index++) {
    quarterRound(state);
    memory[index] = (state[0] ^ state[2]) >>> 0;
  }
  for (let round = 0; round < MEMORY_ROUNDS; round++) {
    for (let index = 0; index < MEMORY_WORDS; index++) {
      const lookup = memory[index] & MEMORY_MASK;
      let mixed = memory[index] + memory[lookup] >>> 0;
      mixed = rotateLeft(mixed, 13);
      mixed = (mixed ^ multiply(memory[index + 1 & MEMORY_MASK], MIX_A)) >>> 0;
      memory[index] = mixed;
      state[0] = (state[0] ^ mixed) >>> 0;
      quarterRound(state);
    }
  }
  const output = new Uint32Array(8);
  const blockSize = MEMORY_WORDS / output.length;
  for (let block = 0; block < output.length; block++) {
    quarterRound(state);
    let mixed = state[0];
    const start = block * blockSize;
    for (let index = 0; index < blockSize; index++) {
      const value = memory[start + index];
      mixed = mixed + value >>> 0;
      mixed = rotateLeft(mixed, 5);
      mixed = (mixed ^ multiply(value, MIX_B)) >>> 0;
    }
    output[block] = (mixed ^ state[2]) >>> 0;
  }
  return output;
}
function countLeadingZeroBits(words) {
  let count = 0;
  for (const word of words) {
    if (word === 0) {
      count += 32;
      continue;
    }
    return count + Math.clz32(word);
  }
  return count;
}
function asciiBytes(value) {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index++) {
    bytes[index] = value.charCodeAt(index) & 255;
  }
  return bytes;
}
function yieldToRuntime() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
function solveChallenge(nonce, difficulty, timeoutMs = 2e4) {
  return __async(this, null, function* () {
    if (difficulty <= 0)
      return "0";
    const prefix = `${nonce}:`;
    const startedAt = Date.now();
    let solution = 0;
    while (Date.now() - startedAt <= timeoutMs) {
      for (let batch = 0; batch < 1024; batch++) {
        const hash = memoryHash(asciiBytes(prefix + solution));
        if (countLeadingZeroBits(hash) >= difficulty) {
          return String(solution);
        }
        solution++;
      }
      yield yieldToRuntime();
    }
    return null;
  });
}
function embedContext(embedUrl, pageUrl) {
  const origin = new URL(embedUrl).origin;
  const parentHost = new URL(pageUrl).host;
  return {
    origin,
    headers: {
      "User-Agent": USER_AGENT,
      Origin: origin,
      Referer: embedUrl,
      "Content-Type": "application/json",
      "X-Embed-Origin": parentHost,
      "X-Embed-Referer": pageUrl,
      "X-Embed-Parent": pageUrl
    }
  };
}
function postJson(url, headers, body) {
  return __async(this, null, function* () {
    const response = yield fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    const data = yield response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  });
}
function base64UrlToBytes(value) {
  let base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4)
    base64 += "=";
  const decoded = atob(base64);
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index++) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}
function decryptPlayback(playback) {
  return __async(this, null, function* () {
    const keyParts = Array.isArray(playback == null ? void 0 : playback.key_parts) ? playback.key_parts : [];
    const version = parseInt(playback == null ? void 0 : playback.version, 10);
    if (!keyParts.length || !version)
      return playback;
    const selected = [version, 31 - version].map((index) => keyParts[index - 1]).filter(Boolean).map(base64UrlToBytes);
    const keyLength = selected.reduce((total, part) => total + part.length, 0);
    const key = new Uint8Array(keyLength);
    let offset = 0;
    for (const part of selected) {
      key.set(part, offset);
      offset += part.length;
    }
    const cryptoObject = globalThis.crypto || typeof window !== "undefined" && window.crypto;
    const cryptoKey = yield cryptoObject.subtle.importKey(
      "raw",
      key,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );
    const decrypted = yield cryptoObject.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(playback.iv) },
      cryptoKey,
      base64UrlToBytes(playback.payload)
    );
    return JSON.parse(new TextDecoder().decode(decrypted));
  });
}
function chooseSource(data) {
  var _a;
  const sources = (data == null ? void 0 : data.sources) || ((_a = data == null ? void 0 : data.playback) == null ? void 0 : _a.sources) || [];
  if (!Array.isArray(sources))
    return null;
  const source = sources[sources.length - 1];
  return typeof source === "string" ? source : (source == null ? void 0 : source.file) || (source == null ? void 0 : source.url);
}
function resolveByse(embedUrl, pageUrl) {
  return __async(this, null, function* () {
    var _a;
    const code = (_a = embedUrl.match(/\/e\/([a-zA-Z0-9]+)/)) == null ? void 0 : _a[1];
    if (!code)
      return null;
    const { origin, headers } = embedContext(embedUrl, pageUrl);
    const fingerprint = {
      token: "nuvio-provider",
      viewer_id: "nuvio",
      device_id: "nuvio",
      confidence: 0
    };
    const apiBase = `${origin}/api/videos/${code}/embed`;
    const challenge = yield postJson(`${apiBase}/captcha`, headers, {
      fingerprint
    });
    const solution = yield solveChallenge(
      challenge.pow_nonce,
      Number(challenge.pow_difficulty) || 0,
      Math.min(2e4, Math.max(4e3, (challenge.expires_in - 3) * 1e3))
    );
    if (solution === null)
      throw new Error("proof-of-work timed out");
    const verification = yield postJson(`${apiBase}/captcha/verify`, headers, {
      pow_token: challenge.pow_token,
      solution,
      fingerprint
    });
    if (verification.status !== "ok" || !verification.token) {
      throw new Error("proof-of-work verification failed");
    }
    const playbackResponse = yield postJson(
      `${apiBase}/playback`,
      Object.assign({}, headers, {
        "X-Captcha-Token": verification.token
      }),
      { fingerprint }
    );
    const decrypted = playbackResponse.playback ? yield decryptPlayback(playbackResponse.playback) : playbackResponse;
    const streamUrl = chooseSource(decrypted) || chooseSource(playbackResponse);
    if (!streamUrl)
      return null;
    return {
      url: streamUrl,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: `${origin}/`,
        Origin: origin
      }
    };
  });
}

// src/desenflix/alternateHosts.js
function resolvePlayMogo(embedUrl, pageUrl) {
  return __async(this, null, function* () {
    var _a;
    try {
      const origin = new URL(embedUrl).origin;
      const html = yield fetchText(embedUrl, pageUrl);
      const passPath = (_a = html.match(/\/pass_md5\/[^\s"'<>\\]+/)) == null ? void 0 : _a[0];
      if (!passPath)
        return null;
      const response = yield fetch(`${origin}${passPath}`, {
        headers: {
          "User-Agent": USER_AGENT,
          Referer: embedUrl,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin"
        }
      });
      if (!response.ok)
        return null;
      const baseUrl = (yield response.text()).trim();
      if (!baseUrl.startsWith("http"))
        return null;
      const random = Math.random().toString(36).substring(2, 12);
      const token = passPath.split("/").pop();
      return {
        url: `${baseUrl}${random}?token=${token}&expiry=${Date.now()}`,
        headers: {
          "User-Agent": USER_AGENT,
          Referer: `${origin}/`,
          Origin: origin
        }
      };
    } catch (error) {
      console.warn(`[DesenFlix] PlayMogo blocked: ${error.message}`);
      return null;
    }
  });
}
function resolveHqq(embedUrl, pageUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(embedUrl, pageUrl);
      const matches = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/gi) || [];
      const streamUrl = matches.map((url) => url.replace(/\\\//g, "/").replace(/&amp;/g, "&")).find((url) => !url.includes("vast"));
      if (!streamUrl)
        return null;
      const origin = new URL(embedUrl).origin;
      const headers = {
        "User-Agent": USER_AGENT,
        Referer: `${origin}/`,
        Origin: origin
      };
      const validation = yield fetch(streamUrl, { headers });
      if (!validation.ok)
        return null;
      const playlist = yield validation.text();
      if (!playlist.startsWith("#EXTM3U"))
        return null;
      return {
        url: streamUrl,
        headers
      };
    } catch (error) {
      console.warn(`[DesenFlix] HQQ resolution failed: ${error.message}`);
      return null;
    }
  });
}

// src/desenflix/extractor.js
function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function slugify(value) {
  return normalize(value).replace(/\s+/g, "-");
}
function titleMatches(value, titles) {
  const candidate = normalize(value);
  return titles.some((title) => {
    const normalized = normalize(title);
    if (!normalized)
      return false;
    if (candidate.includes(normalized) || normalized.includes(candidate)) {
      return true;
    }
    const ignored = /* @__PURE__ */ new Set([
      "a",
      "al",
      "ale",
      "cu",
      "de",
      "din",
      "in",
      "intra",
      "i",
      "iti",
      "la",
      "lui",
      "o",
      "sa",
      "si",
      "the",
      "ti",
      "un"
    ]);
    const targetTokens = normalized.split(" ").filter((token) => token.length > 1 && !ignored.has(token));
    if (targetTokens.length < 2)
      return false;
    const matched = targetTokens.filter(
      (token) => candidate.includes(token)
    ).length;
    return matched / targetTokens.length >= 0.65;
  });
}
function collectResultLinks(html, titles) {
  const $ = import_cheerio_without_node_native.default.load(html);
  const results = [];
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href || !href.startsWith(`${BASE_URL}/`))
      return;
    if (href.includes("/wp-") || href.includes("/category/") || href.includes("/tag/") || href.includes("/author/") || href.includes("/page/")) {
      return;
    }
    const context = [
      $(element).text(),
      $(element).attr("title"),
      $(element).closest("article, .post, .entry, .dfx-card").text(),
      href
    ].filter(Boolean).join(" ");
    if (titleMatches(context, titles))
      results.push(href);
  });
  return Array.from(new Set(results));
}
function findMediaPage(mediaInfo) {
  return __async(this, null, function* () {
    var _a;
    const titles = Array.from(
      new Set(
        [
          mediaInfo.romanianTitle,
          mediaInfo.title,
          mediaInfo.originalTitle
        ].filter(Boolean)
      )
    );
    for (const title of titles) {
      const slug = slugify(title);
      const suffixes = [
        mediaInfo.year ? `-${mediaInfo.year}-dublat-in-romana` : null,
        "-dublat-in-romana",
        mediaInfo.year ? `-${mediaInfo.year}` : null,
        ""
      ].filter((value) => value !== null);
      for (const suffix of suffixes) {
        const directUrl = `${BASE_URL}/${slug}${suffix}/`;
        try {
          const html = yield fetchText(directUrl);
          if (titleMatches((_a = html.match(/<title>(.*?)<\/title>/i)) == null ? void 0 : _a[1], titles)) {
            return { url: directUrl, html };
          }
        } catch (_) {
        }
      }
    }
    for (const title of titles) {
      try {
        const searchHtml = yield fetchText(
          `${BASE_URL}/?s=${encodeURIComponent(title)}`
        );
        const links = collectResultLinks(searchHtml, titles);
        for (const url of links.slice(0, 8)) {
          try {
            const html = yield fetchText(url);
            if (html.includes("dfx-episode-card") || html.includes("dfx-main-player")) {
              return { url, html };
            }
          } catch (_) {
          }
        }
      } catch (error) {
        console.warn(
          `[DesenFlix] Search failed for "${title}": ${error.message}`
        );
      }
    }
    return null;
  });
}
function findEpisodeEmbed(html, season, episode) {
  const $ = import_cheerio_without_node_native.default.load(html);
  let currentSeason = null;
  let match = null;
  $(".dfx-episode-season, details.dfx-episode-card").each((_, element) => {
    var _a, _b;
    if (match)
      return;
    const node = $(element);
    if (node.hasClass("dfx-episode-season")) {
      currentSeason = Number((_a = node.text().match(/\d+/)) == null ? void 0 : _a[0]);
      return;
    }
    const episodeNumber = Number((_b = node.find("summary").text().match(/\d+/)) == null ? void 0 : _b[0]);
    if (currentSeason === Number(season) && episodeNumber === Number(episode)) {
      let source = node.attr("data-src") || node.find("[data-src]").attr("data-src") || node.find("iframe").attr("src");
      if (source == null ? void 0 : source.startsWith("//"))
        source = `https:${source}`;
      match = source || null;
    }
  });
  return match;
}
function findMovieEmbed(html) {
  const $ = import_cheerio_without_node_native.default.load(html);
  let source = $("iframe#dfx-main-player").attr("src") || $("iframe#dfx-main-player").attr("data-src") || $(".dfx-player iframe, .dfx-watch iframe, article iframe").first().attr("src");
  if (source == null ? void 0 : source.startsWith("//"))
    source = `https:${source}`;
  return source || null;
}
function resolveEmbed(embedUrl, pageUrl) {
  return __async(this, null, function* () {
    if (/byseraguci\.com/i.test(embedUrl)) {
      return resolveByse(embedUrl, pageUrl);
    }
    if (/playmogo\.com/i.test(embedUrl)) {
      return resolvePlayMogo(embedUrl, pageUrl);
    }
    if (/hqq\.ac/i.test(embedUrl)) {
      return resolveHqq(embedUrl, pageUrl);
    }
    if (/\.(?:m3u8|mp4)(?:[?#]|$)/i.test(embedUrl)) {
      return { url: embedUrl, headers: {} };
    }
    return null;
  });
}
function extractMediaStream(page, mediaInfo, mediaType, season, episode) {
  return __async(this, null, function* () {
    const isTv = mediaType === "tv" || mediaType === "series";
    const embedUrl = isTv ? findEpisodeEmbed(page.html, season, episode) : findMovieEmbed(page.html);
    if (!embedUrl)
      return [];
    try {
      const resolved = yield resolveEmbed(embedUrl, page.url);
      if (!(resolved == null ? void 0 : resolved.url))
        return [];
      return [
        {
          name: "DesenFlix",
          title: isTv ? `Dublat [RO] - S${season}E${episode}` : "Dublat [RO]",
          url: resolved.url,
          quality: resolved.url.includes(".m3u8") ? "Auto" : "Unknown",
          language: "ro",
          headers: resolved.headers
        }
      ];
    } catch (error) {
      console.warn(
        `[DesenFlix] Failed to resolve ${mediaInfo.title}: ${error.message}`
      );
      return [];
    }
  });
}

// src/desenflix/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const isTv = mediaType === "tv" || mediaType === "series";
    if (mediaType !== "movie" && !isTv)
      return [];
    if (isTv && (!season || !episode)) {
      return [];
    }
    try {
      const mediaInfo = yield getMediaInfo(tmdbId, mediaType);
      if (!mediaInfo)
        return [];
      const page = yield findMediaPage(mediaInfo);
      if (!page) {
        console.log(`[DesenFlix] No media page found for ${mediaInfo.title}`);
        return [];
      }
      console.log(`[DesenFlix] Matched media page: ${page.url}`);
      return extractMediaStream(
        page,
        mediaInfo,
        mediaType,
        season,
        episode
      );
    } catch (error) {
      console.error(`[DesenFlix] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
