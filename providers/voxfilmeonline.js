/**
 * voxfilmeonline - Built from src/voxfilmeonline/
 * Generated: 2026-08-07T21:48:52.020Z
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

// src/voxfilmeonline/http.js
var BASE_URL = "https://voxfilmeonline.biz";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
function fetchText(_0) {
  return __async(this, arguments, function* (url, referer = BASE_URL + "/") {
    const response = yield fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: referer,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} on ${url}`);
    }
    return yield response.text();
  });
}

// src/voxfilmeonline/tmdb.js
var TMDB_API_KEY = "31031042b5deb218a10d70a4c01ea934";
function getMovieInfo(tmdbId) {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      const url = `https://api.themoviedb.org/3/movie/${encodeURIComponent(tmdbId)}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
      const data = JSON.parse(yield fetchText(url, "https://www.themoviedb.org/"));
      const romanian = (((_a = data.translations) == null ? void 0 : _a.translations) || []).find(
        (translation) => translation.iso_639_1 === "ro"
      );
      return {
        title: data.title,
        originalTitle: data.original_title,
        romanianTitle: ((_b = romanian == null ? void 0 : romanian.data) == null ? void 0 : _b.title) || null,
        year: (data.release_date || "").split("-")[0]
      };
    } catch (error) {
      console.error(`[VoxFilmeOnline] TMDB lookup failed: ${error.message}`);
      return null;
    }
  });
}

// src/voxfilmeonline/extractor.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function extractYear(value) {
  const match = String(value || "").match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : "";
}
function scoreResult(text, href, titles, year) {
  const normalized = normalizeText(text);
  const normalizedHref = normalizeText(href);
  let score = 0;
  for (const title of titles) {
    const target = normalizeText(title);
    if (!target)
      continue;
    if (normalized.includes(target))
      score = Math.max(score, 100);
    if (normalizedHref.includes(target))
      score = Math.max(score, 90);
  }
  const resultYear = extractYear(text + " " + href);
  if (year && resultYear === String(year))
    score += 30;
  else if (year && resultYear && resultYear !== String(year))
    score -= 40;
  return score;
}
function findMoviePage(mediaInfo) {
  return __async(this, null, function* () {
    const titles = Array.from(
      new Set(
        [
          mediaInfo.romanianTitle,
          mediaInfo.title,
          mediaInfo.originalTitle
        ].filter(Boolean)
      )
    );
    let bestResult = null;
    for (const title of titles) {
      try {
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
        const html = yield fetchText(searchUrl);
        const $ = import_cheerio_without_node_native.default.load(html);
        $("a[href]").each((_, element) => {
          const href = $(element).attr("href");
          if (!href || !href.startsWith(BASE_URL + "/"))
            return;
          const text = $(element).text().replace(/\s+/g, " ").trim();
          const score = scoreResult(
            text,
            href,
            titles,
            mediaInfo.year
          );
          if (score > 0 && (!bestResult || score > bestResult.score)) {
            bestResult = { href, score };
          }
        });
        if (bestResult && bestResult.score >= 130)
          break;
      } catch (error) {
        console.warn(
          `[VoxFilmeOnline] Search failed for "${title}": ${error.message}`
        );
      }
    }
    return (bestResult == null ? void 0 : bestResult.href) || null;
  });
}
function extractEmbedUrls(html) {
  const urls = /* @__PURE__ */ new Set();
  const normalizedHtml = html.replace(/\\\//g, "/").replace(/\\"/g, '"').replace(/\\'/g, "'");
  const matches = normalizedHtml.matchAll(
    /<iframe[^>]+src=["']([^"']+)["']/gi
  );
  for (const match of matches) {
    let url = match[1].trim();
    if (url.startsWith("//"))
      url = "https:" + url;
    if (/^https?:\/\//i.test(url))
      urls.add(url);
  }
  return Array.from(urls);
}
function cleanMediaUrl(value) {
  return String(value || "").replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();
}
function resolveVidmoly(embedUrl, pageUrl) {
  return __async(this, null, function* () {
    const html = yield fetchText(embedUrl, pageUrl);
    const match = html.match(
      /sources\s*:\s*\[\s*\{\s*file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
    ) || html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
    return match ? cleanMediaUrl(match[1]) : null;
  });
}
function resolveVidara(embedUrl) {
  return __async(this, null, function* () {
    const url = new URL(embedUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const filecode = parts[parts.length - 1];
    if (!filecode)
      return null;
    const response = yield fetch(`${url.origin}/api/stream${url.search}`, {
      method: "POST",
      headers: {
        "User-Agent": USER_AGENT,
        Referer: embedUrl,
        Origin: url.origin,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ filecode, device: "web" })
    });
    if (!response.ok) {
      throw new Error(`Vidara API returned HTTP ${response.status}`);
    }
    const data = yield response.json();
    return (data == null ? void 0 : data.streaming_url) ? cleanMediaUrl(data.streaming_url) : null;
  });
}
function decodeBase64(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const input = String(value).replace(/\s+/g, "").replace(/=+$/, "");
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (let index = 0; index < input.length; index++) {
    const digit = alphabet.indexOf(input[index]);
    if (digit === -1)
      return null;
    buffer = buffer << 6 | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode(buffer >> bits & 255);
    }
  }
  return output;
}
function decodeVoeConfig(payload) {
  try {
    const rot13 = payload.replace(/[a-zA-Z]/g, (character) => {
      const start = character <= "Z" ? 65 : 97;
      return String.fromCharCode(
        (character.charCodeAt(0) - start + 13) % 26 + start
      );
    });
    const normalized = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"].reduce(
      (value, marker) => value.split(marker).join("_"),
      rot13
    );
    const firstPass = decodeBase64(normalized.split("_").join(""));
    if (!firstPass)
      return null;
    const shifted = Array.from(
      firstPass,
      (character) => String.fromCharCode(character.charCodeAt(0) - 3)
    ).join("");
    const json = decodeBase64(shifted.split("").reverse().join(""));
    return json ? JSON.parse(json) : null;
  } catch (_) {
    return null;
  }
}
function resolveVoe(embedUrl, pageUrl) {
  return __async(this, null, function* () {
    let currentUrl = embedUrl;
    let html = yield fetchText(currentUrl, pageUrl);
    const redirect = html.match(
      /window\.location\.href\s*=\s*["']([^"']+)["']/i
    );
    if (redirect) {
      currentUrl = redirect[1];
      html = yield fetchText(currentUrl, embedUrl);
    }
    const configMatch = html.match(
      /<script\s+type=["']application\/json["']>\s*(\[[^\]]+\])\s*<\/script>/i
    );
    if (configMatch) {
      const values = JSON.parse(configMatch[1]);
      const config = values[0] ? decodeVoeConfig(values[0]) : null;
      const source = config && (config.source || config.direct_access_url || config.fallback);
      if (source && /^https?:\/\//i.test(source)) {
        return cleanMediaUrl(source);
      }
    }
    const direct = html.match(
      /(?:["']?hls["']?\s*:|file\s*:)\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
    );
    return direct ? cleanMediaUrl(direct[1]) : null;
  });
}
function resolveStreams(pageUrl) {
  return __async(this, null, function* () {
    const html = yield fetchText(pageUrl);
    const embeds = extractEmbedUrls(html).sort((left, right) => {
      return Number(/vidmoly/i.test(right)) - Number(/vidmoly/i.test(left));
    });
    const streams = [];
    const seen = /* @__PURE__ */ new Set();
    for (const embedUrl of embeds) {
      try {
        let mediaUrl = null;
        let host = null;
        if (/vidmoly/i.test(embedUrl)) {
          mediaUrl = yield resolveVidmoly(embedUrl, pageUrl);
          host = "Vidmoly";
        } else if (/vidara/i.test(embedUrl)) {
          mediaUrl = yield resolveVidara(embedUrl);
          host = "Vidara";
        } else if (/(?:^|\/\/)(?:www\.)?voe\./i.test(embedUrl)) {
          mediaUrl = yield resolveVoe(embedUrl, pageUrl);
          host = "VOE";
        }
        if (!mediaUrl || seen.has(mediaUrl))
          continue;
        if (!/\.(?:m3u8|mp4)(?:[?#]|$)/i.test(mediaUrl))
          continue;
        seen.add(mediaUrl);
        const origin = new URL(embedUrl).origin;
        streams.push({
          name: "VoxFilmeOnline",
          title: `${host}[RO]`,
          url: mediaUrl,
          quality: "Auto",
          language: "ro",
          headers: {
            "User-Agent": USER_AGENT,
            Referer: `${origin}/`,
            Origin: origin
          }
        });
      } catch (error) {
        console.warn(
          `[VoxFilmeOnline] ${embedUrl} could not be resolved: ${error.message}`
        );
      }
    }
    return streams;
  });
}

// src/voxfilmeonline/index.js
function getStreams(tmdbId, mediaType) {
  return __async(this, null, function* () {
    if (mediaType !== "movie")
      return [];
    try {
      const mediaInfo = yield getMovieInfo(tmdbId);
      if (!mediaInfo)
        return [];
      const pageUrl = yield findMoviePage(mediaInfo);
      if (!pageUrl) {
        console.log(
          `[VoxFilmeOnline] No result for ${mediaInfo.title} (${mediaInfo.year})`
        );
        return [];
      }
      console.log(`[VoxFilmeOnline] Matched page: ${pageUrl}`);
      return yield resolveStreams(pageUrl);
    } catch (error) {
      console.error(`[VoxFilmeOnline] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
