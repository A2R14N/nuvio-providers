/**
 * desenefaine - Built from src/desenefaine/
 * Generated: 2026-08-07T21:48:51.962Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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

// src/desenefaine/index.js
var desenefaine_exports = {};
__export(desenefaine_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(desenefaine_exports);

// src/desenefaine/tmdb.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function fetchTmdbDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const isTv = mediaType === "tv" || mediaType === "series";
    const primaryEndpoint = isTv ? "tv" : "movie";
    const secondaryEndpoint = isTv ? "movie" : "tv";
    let url = `https://api.themoviedb.org/3/${primaryEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
    console.log(`[desenefaine] Requesting TMDB URL: ${url}`);
    try {
      let res = yield fetch(url, { headers: { "User-Agent": USER_AGENT } });
      console.log(`[desenefaine] TMDB Response status: ${res.status}`);
      if (!res.ok) {
        url = `https://api.themoviedb.org/3/${secondaryEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
        console.log(`[desenefaine] Retrying TMDB secondary endpoint: ${url}`);
        res = yield fetch(url, { headers: { "User-Agent": USER_AGENT } });
      }
      if (!res.ok) {
        console.warn(`[desenefaine] TMDB 404.`);
        return null;
      }
      const data = yield res.json();
      let titleRo = null;
      if (data.translations && data.translations.translations) {
        const roTrans = data.translations.translations.find(
          (t) => t.iso_639_1 === "ro"
        );
        if (roTrans && roTrans.data) {
          titleRo = roTrans.data.name || roTrans.data.title;
        }
      }
      const primaryTitle = data.name || data.title || "Unknown";
      const releaseDate = data.first_air_date || data.release_date;
      const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
      console.log(
        `[desenefaine] TMDB Info: Title="${primaryTitle}", TitleRo="${titleRo || "N/A"}", Year=${year}`
      );
      return {
        title: primaryTitle,
        titleRo: titleRo || primaryTitle,
        year
      };
    } catch (e) {
      console.error("[desenefaine] TMDB Fetch Exception:", e.message);
      return null;
    }
  });
}

// src/desenefaine/extractors.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/clicksud/http.js
var BASE_URL = "https://clicksud.com.in";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
  Referer: `${BASE_URL}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
};
function fetchText(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}) {
    try {
      const response = yield fetch(url, {
        headers: __spreadValues(__spreadValues({}, HEADERS), customHeaders)
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
      return yield response.text();
    } catch (e) {
      console.error(`[Clicksud] Fetch error for ${url}: ${e.message}`);
      return null;
    }
  });
}

// src/clicksud/resolvers/vidoza.js
function normalizeEmbedUrl(input) {
  const url = new URL(input);
  const match = url.pathname.match(
    /\/(?:embed-)?([a-zA-Z0-9]+)(?:\.html)?\/?$/
  );
  if (!match)
    return input;
  return `${url.origin}/embed-${match[1]}.html`;
}
function parseQuality(value) {
  const match = String(value || "").match(/(\d{3,4})/);
  return match ? Number(match[1]) : 0;
}
function resolveVidoza(embedUrl) {
  return __async(this, null, function* () {
    var _a;
    try {
      const normalizedUrl = normalizeEmbedUrl(embedUrl);
      const html = yield fetchText(normalizedUrl, {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
        Referer: normalizedUrl
      });
      if (!html)
        return null;
      const sources = [];
      const patterns = [
        /(?:file|src)\s*[:=,]?\s*["']([^"']+)["'][^}\]]*?\bres\s*[:=]\s*["']?([^"',}\]]+)/gi,
        /\bres\s*[:=]\s*["']?([^"',}\]]+)[^}\]]*?(?:file|src)\s*[:=,]?\s*["']([^"']+)["']/gi
      ];
      let match;
      while (match = patterns[0].exec(html)) {
        sources.push({ url: match[1], quality: parseQuality(match[2]) });
      }
      while (match = patterns[1].exec(html)) {
        sources.push({ url: match[2], quality: parseQuality(match[1]) });
      }
      if (!sources.length) {
        const direct = html.match(
          /["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i
        );
        if (direct)
          sources.push({ url: direct[1], quality: 0 });
      }
      const playable = sources.map((source) => {
        let url = source.url.replace(/\\\//g, "/").replace(/&amp;/g, "&");
        if (url.startsWith("//"))
          url = `https:${url}`;
        else if (url.startsWith("/"))
          url = new URL(url, normalizedUrl).href;
        return __spreadProps(__spreadValues({}, source), { url });
      }).filter((source) => /^https?:\/\//i.test(source.url)).sort((left, right) => right.quality - left.quality);
      return ((_a = playable[0]) == null ? void 0 : _a.url) || null;
    } catch (error) {
      console.error(`[Vidoza] Resolution error: ${error.message}`);
      return null;
    }
  });
}

// src/desenefaine/extractors.js
var BASE_URL2 = "https://desenefaine.com";
var USER_AGENT2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function slugify(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}
function fetchHtml(url, customHeaders) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(url, {
        headers: Object.assign(
          {
            "User-Agent": USER_AGENT2,
            Referer: BASE_URL2 + "/"
          },
          customHeaders || {}
        )
      });
      if (!response.ok)
        return null;
      const text = yield response.text();
      if (text.includes("404 Not Found") || text.includes("nu a fost g\u0103sit\u0103") || text.includes("Page Not Found")) {
        return null;
      }
      return text;
    } catch (e) {
      console.error(`[desenefaine] Fetch error for ${url}:`, e.message);
      return null;
    }
  });
}
function decodeTid(tid) {
  if (!tid)
    return null;
  try {
    const reversed = tid.split("").reverse().join("");
    let decoded = "";
    for (let i = 0; i < reversed.length; i += 2) {
      decoded += String.fromCharCode(parseInt(reversed.substr(i, 2), 16));
    }
    decoded = decoded.replace(/&amp;/g, "&");
    if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
      return decoded;
    }
    return null;
  } catch (e) {
    return null;
  }
}
function base64UrlToBytes(str) {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4)
    b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function decryptFilemoonApi(playback) {
  return __async(this, null, function* () {
    try {
      const versionNum = parseInt(playback.version, 10);
      const idx1 = versionNum;
      const idx2 = 31 - versionNum;
      const keyPart1 = playback.key_parts[idx1 - 1];
      const keyPart2 = playback.key_parts[idx2 - 1];
      const b1 = base64UrlToBytes(keyPart1);
      const b2 = base64UrlToBytes(keyPart2);
      const keyBytes = new Uint8Array(b1.length + b2.length);
      keyBytes.set(b1, 0);
      keyBytes.set(b2, b1.length);
      const ivBytes = base64UrlToBytes(playback.iv);
      const payloadBytes = base64UrlToBytes(playback.payload);
      const cryptoObj = globalThis.crypto || typeof window !== "undefined" && window.crypto;
      const cryptoKey = yield cryptoObj.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      const decryptedBuffer = yield cryptoObj.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes },
        cryptoKey,
        payloadBytes
      );
      const jsonStr = new TextDecoder().decode(decryptedBuffer);
      const data = JSON.parse(jsonStr);
      if (data.sources && data.sources.length > 0) {
        const best = data.sources[data.sources.length - 1];
        return best.url || best.file;
      }
    } catch (e) {
      console.error("[desenefaine] Filemoon AES-GCM error:", e.message);
    }
    return null;
  });
}
function decryptEmbed4MeApi(hexPayload) {
  return __async(this, null, function* () {
    if (!hexPayload || typeof hexPayload !== "string" || hexPayload.includes("error")) {
      return null;
    }
    try {
      const keyBytes = new TextEncoder().encode("kiemtienmua911ca");
      const ivBytes = new TextEncoder().encode("1234567890oiuytr");
      const cleanHex = hexPayload.trim();
      const payloadBytes = new Uint8Array(
        cleanHex.match(/[\da-f]{2}/gi).map((b) => parseInt(b, 16))
      );
      const cryptoObj = globalThis.crypto || typeof window !== "undefined" && window.crypto;
      const cryptoKey = yield cryptoObj.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-CBC" },
        false,
        ["decrypt"]
      );
      const decryptedBuffer = yield cryptoObj.subtle.decrypt(
        { name: "AES-CBC", iv: ivBytes },
        cryptoKey,
        payloadBytes
      );
      const jsonStr = new TextDecoder().decode(decryptedBuffer);
      const data = JSON.parse(jsonStr);
      return data.cfNative || data.source || data.file || null;
    } catch (e) {
      return null;
    }
  });
}
function resolveEmbedToRawM3u8(embedUrl) {
  return __async(this, null, function* () {
    if (!embedUrl)
      return null;
    if (embedUrl.includes(".m3u8") || embedUrl.includes(".mp4"))
      return embedUrl;
    try {
      if (embedUrl.includes("vidoza.net") || embedUrl.includes("vidoza.co") || embedUrl.includes("videzz.net")) {
        const rawUrl = yield resolveVidoza(embedUrl);
        if (rawUrl)
          return rawUrl;
      }
      if (embedUrl.includes("bysewihe") || embedUrl.includes("filemoon")) {
        let code = "";
        if (embedUrl.includes("/e/"))
          code = embedUrl.split("/e/")[1].split("?")[0].split("/")[0];
        if (code) {
          const urlObj = new URL(embedUrl);
          const apiUrl = `${urlObj.origin}/api/videos/${code}`;
          const apiRes = yield fetch(apiUrl, {
            headers: {
              "User-Agent": USER_AGENT2,
              Referer: embedUrl,
              Origin: urlObj.origin
            }
          });
          if (apiRes.ok) {
            const json = yield apiRes.json();
            if (json.playback) {
              const rawM3u8 = yield decryptFilemoonApi(json.playback);
              if (rawM3u8) {
                console.log(
                  `[desenefaine] SUCCESS Extracted Filemoon raw .m3u8: ${rawM3u8}`
                );
                return rawM3u8;
              }
            }
          }
        }
      }
      let hashId = "";
      if (embedUrl.includes("#")) {
        hashId = embedUrl.split("#")[1];
      } else if (embedUrl.includes("/e/")) {
        hashId = embedUrl.split("/e/")[1].split("?")[0].split("/")[0];
      }
      if (hashId) {
        const urlObj = new URL(embedUrl);
        const apiUrl = `${urlObj.origin}/api/v1/video?id=${hashId}`;
        const apiRes = yield fetch(apiUrl, {
          headers: { "User-Agent": USER_AGENT2, Referer: embedUrl }
        });
        if (apiRes.ok) {
          const hexData = yield apiRes.text();
          const rawM3u8 = yield decryptEmbed4MeApi(hexData);
          if (rawM3u8) {
            console.log(`[desenefaine] SUCCESS Extracted raw .m3u8: ${rawM3u8}`);
            return rawM3u8;
          }
        }
      }
    } catch (e) {
    }
    return embedUrl;
  });
}
function extractEmbedsFromPage(html) {
  return __async(this, null, function* () {
    if (!html)
      return [];
    const $ = import_cheerio_without_node_native.default.load(html);
    const initialEmbeds = /* @__PURE__ */ new Set();
    const isPlayableEmbed = (url) => {
      if (!url || typeof url !== "string")
        return false;
      if (!url.startsWith("http://") && !url.startsWith("https://"))
        return false;
      const lower = url.toLowerCase();
      if (lower.includes("youtube.com") || lower.includes("youtu.be"))
        return false;
      if (lower.includes("wp-json") || lower.includes("wp-content") || lower.includes("wp-includes"))
        return false;
      if (lower.endsWith(".js") || lower.includes(".js?") || lower.includes("loadermain") || lower.includes("googleapis.com"))
        return false;
      if (lower.includes("popads") || lower.includes("doubleclick") || lower.includes("adsterra") || lower.includes("popunder"))
        return false;
      return true;
    };
    const knownHosts = [
      "ok.ru",
      "filemoon",
      "streamtape",
      "vk.com",
      "vidoza",
      "videzz",
      "supervideo",
      "dood",
      "mixdrop",
      "upstream",
      "voe.sx",
      "streamwish",
      "mp4upload",
      "vidguard",
      "vid-guard",
      "vgembed",
      "vguard",
      "vsembed",
      "videasy",
      "embed4me",
      "player4me",
      "desenefaine.net",
      "bysewihe",
      "streamp2p",
      "seekstreaming",
      "seeksreaming",
      "embedseek",
      "p2pplay",
      "fileons",
      "lulu",
      "streamhub"
    ];
    $(
      "[href*='trembed='], [value*='trembed='], [data-url*='trembed='], a, option"
    ).each((_, el) => {
      let src = $(el).attr("href") || $(el).attr("value") || $(el).attr("data-url") || $(el).attr("src");
      if (src && src.includes("trembed=")) {
        if (src.startsWith("//"))
          src = "https:" + src;
        if (src.startsWith("/"))
          src = BASE_URL2 + src;
        initialEmbeds.add(src);
      }
    });
    const tridMatch = html.match(/trid=(\d+)/i);
    const trtypeMatch = html.match(/trtype=(\d+)/i);
    if (tridMatch) {
      const trid = tridMatch[1];
      const trtype = trtypeMatch ? trtypeMatch[1] : "2";
      for (let i = 0; i <= 10; i++) {
        initialEmbeds.add(
          `${BASE_URL2}/?trembed=${i}&trid=${trid}&trtype=${trtype}`
        );
      }
    }
    const rawUrls = html.match(/https?:\/\/[^\s"'<>\\]+/gi) || [];
    rawUrls.forEach((url) => {
      let cleaned = url.replace(/['"\\>].*$/, "").replace(/&amp;/g, "&");
      const lower = cleaned.toLowerCase();
      if (knownHosts.some((host) => lower.includes(host)) && isPlayableEmbed(cleaned)) {
        initialEmbeds.add(cleaned);
      }
    });
    const embedUrls = /* @__PURE__ */ new Set();
    for (const url of Array.from(initialEmbeds)) {
      if (url.includes("trembed=") || url.includes("trid=") || url.includes("trhide=")) {
        try {
          const tidMatch = url.match(/tid=([a-f0-9]+)/i);
          if (tidMatch && tidMatch[1]) {
            const decodedUrl = decodeTid(tidMatch[1]);
            if (decodedUrl && isPlayableEmbed(decodedUrl)) {
              embedUrls.add(decodedUrl);
              continue;
            }
          }
          const trembedHtml = yield fetchHtml(url);
          if (trembedHtml) {
            const respTidMatch = trembedHtml.match(/tid=([a-f0-9]+)/i);
            if (respTidMatch && respTidMatch[1]) {
              const decodedUrl = decodeTid(respTidMatch[1]);
              if (decodedUrl && isPlayableEmbed(decodedUrl)) {
                embedUrls.add(decodedUrl);
                continue;
              }
            }
            const $t = import_cheerio_without_node_native.default.load(trembedHtml);
            let iframeSrc = $t("iframe").attr("src") || $t("iframe").attr("data-src");
            if (iframeSrc) {
              if (iframeSrc.startsWith("//"))
                iframeSrc = "https:" + iframeSrc;
              iframeSrc = iframeSrc.replace(/&amp;/g, "&");
              if (isPlayableEmbed(iframeSrc)) {
                embedUrls.add(iframeSrc);
              }
            }
            const tRawUrls = trembedHtml.match(/https?:\/\/[^\s"'<>\\]+/gi) || [];
            tRawUrls.forEach((rUrl) => {
              let cleaned = rUrl.replace(/['"\\>].*$/, "").replace(/&amp;/g, "&");
              const lower = cleaned.toLowerCase();
              if (knownHosts.some((host) => lower.includes(host)) && isPlayableEmbed(cleaned)) {
                embedUrls.add(cleaned);
              }
            });
          }
        } catch (e) {
        }
      } else {
        embedUrls.add(url.replace(/&amp;/g, "&"));
      }
    }
    const directStreams = [];
    for (const embedUrl of Array.from(embedUrls)) {
      const rawM3u8 = yield resolveEmbedToRawM3u8(embedUrl);
      if (rawM3u8 && (rawM3u8.includes(".m3u8") || rawM3u8.includes(".mp4"))) {
        directStreams.push(rawM3u8);
      }
    }
    return directStreams;
  });
}
function buildStreamObject(embedUrl, showTitle, season, episode, mediaType) {
  let serverName = "Direct Stream";
  const lower = embedUrl.toLowerCase();
  let targetOrigin = "https://desenefaine.com";
  if (lower.includes("embed4me") || lower.includes("player4me") || lower.includes("4meplayer")) {
    serverName = "Embed4Me";
    const originMatch = embedUrl.match(/^(https?:\/\/[^/]+)/i);
    targetOrigin = originMatch ? originMatch[1] : "https://player4me.embed4me.com";
  } else if (lower.includes("bysewihe") || lower.includes("filemoon") || lower.includes("sprintcdn") || lower.includes("r66nv9ed")) {
    serverName = "FileMoon";
    targetOrigin = "https://bysewihe.com";
  } else if (lower.includes("streamp2p") || lower.includes("p2pplay")) {
    serverName = "Streamp2p";
    targetOrigin = "https://streamp2p.p2pplay.online";
  } else if (lower.includes("seekstreaming") || lower.includes("seeksreaming") || lower.includes("embedseek")) {
    serverName = "SeekStreaming";
    targetOrigin = "https://seeksreaming.embedseek.com";
  } else if (lower.includes("vembed") || lower.includes("vsembed")) {
    serverName = "Vembed";
    targetOrigin = "https://vsembed.su";
  } else if (lower.includes("vidoza") || lower.includes("videzz")) {
    serverName = "Vidoza";
    targetOrigin = new URL(embedUrl).origin;
  }
  return {
    name: `Desenefaine - ${serverName}`,
    title: `Server ${serverName}`,
    url: embedUrl,
    quality: "1080p",
    language: "ro",
    headers: {
      "User-Agent": USER_AGENT2,
      Referer: `${targetOrigin}/`,
      Origin: targetOrigin
    }
  };
}

// src/desenefaine/index.js
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));
var BASE_URL3 = "https://desenefaine.com";
function hasPlayerElements(html) {
  if (!html)
    return false;
  const lower = html.toLowerCase();
  return lower.includes("trembed=") || lower.includes("trid=") || lower.includes("<iframe") || lower.includes("player-option") || lower.includes("vsembed") || lower.includes("embed4me") || lower.includes("player4me") || lower.includes("desenefaine.net") || lower.includes("bysewihe");
}
function extractPageYear(html) {
  if (!html)
    return null;
  const patterns = [
    /"datePublished"\s*:\s*"(\d{4})/,
    /property="og:title"\s+content="[^"]*\((\d{4})\)/,
    /property="twitter:title"\s+content="[^"]*\((\d{4})\)/,
    /<title[^>]*>[^<]*\((\d{4})\)/,
    /(?:og:published_time|article:published_time)"\s+content="(\d{4})/
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m)
      return parseInt(m[1], 10);
  }
  return null;
}
function isValidMoviePage(html, tmdbData) {
  if (!html || !hasPlayerElements(html))
    return false;
  const pageYear = extractPageYear(html);
  if (tmdbData.year && pageYear && Math.abs(pageYear - tmdbData.year) > 1) {
    console.log(
      `[desenefaine] Rejecting wrong-year page: page year=${pageYear}, TMDB year=${tmdbData.year}`
    );
    return false;
  }
  return true;
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    console.log(
      `[desenefaine] getStreams started: ID=${tmdbId}, type=${mediaType}, S=${season}, E=${episode}`
    );
    try {
      const tmdbData = yield fetchTmdbDetails(tmdbId, mediaType);
      if (!tmdbData)
        return [];
      const titlesToTry = Array.from(
        new Set([tmdbData.titleRo, tmdbData.title].filter(Boolean))
      );
      console.log("[desenefaine] Searching titles:", titlesToTry);
      const isTv = mediaType === "tv" || mediaType === "series";
      let pageHtml = null;
      let matchedTitle = tmdbData.titleRo || tmdbData.title;
      for (const title of titlesToTry) {
        const slug = slugify(title);
        let urlsToTry = [];
        if (isTv && season && episode) {
          urlsToTry = [
            `${BASE_URL3}/epi/${slug}-sezonul-${season}-episodul-${episode}/`,
            `${BASE_URL3}/episoade/${slug}-sezonul-${season}-episodul-${episode}/`
          ];
        } else {
          urlsToTry = [
            `${BASE_URL3}/film/${slug}/`,
            `${BASE_URL3}/film/${slug}-${tmdbData.year}/`,
            `${BASE_URL3}/desen/${slug}/`,
            `${BASE_URL3}/desen/${slug}-${tmdbData.year}/`,
            `${BASE_URL3}/movie/${slug}/`
          ];
        }
        for (const targetUrl of urlsToTry) {
          console.log(`[desenefaine] Testing direct URL: ${targetUrl}`);
          const html = yield fetchHtml(targetUrl);
          const valid = isTv ? hasPlayerElements(html) : isValidMoviePage(html, tmdbData);
          if (valid) {
            console.log(`[desenefaine] Found valid player page at ${targetUrl}`);
            pageHtml = html;
            matchedTitle = title;
            break;
          }
        }
        if (pageHtml)
          break;
      }
      if (!pageHtml) {
        const candidates = [];
        for (const title of titlesToTry) {
          const cleanQuery = title.replace(/[:\-]/g, " ").trim();
          const searchUrl = `${BASE_URL3}/?s=${encodeURIComponent(cleanQuery)}`;
          console.log(`[desenefaine] Searching site: ${searchUrl}`);
          const searchHtml = yield fetchHtml(searchUrl);
          if (!searchHtml)
            continue;
          const $ = import_cheerio_without_node_native2.default.load(searchHtml);
          const targetSlug = slugify(title);
          $("a[href]").each((_, el) => {
            const href = $(el).attr("href");
            if (!href || href.includes("wp-") || href === BASE_URL3 + "/")
              return;
            const path = href.split("?")[0];
            let isMatch = false;
            let score = 0;
            if (isTv && season && episode) {
              const epRegex = new RegExp(
                `sezonul-${season}-episodul-${episode}(?:-|\\/|$)`,
                "i"
              );
              if (epRegex.test(href)) {
                isMatch = true;
                score += 2;
              }
            } else {
              const seg = (path.match(/\/(?:film|desen|movie)\/([^/]+)\/?$/) || [])[1];
              if (seg && seg.startsWith(targetSlug)) {
                isMatch = true;
                score += seg === targetSlug ? 3 : 2;
              }
            }
            if (!isMatch)
              return;
            const yearMatch = path.match(/[-/](19\d{2}|20\d{2})(?:-|\/|$)/);
            if (yearMatch) {
              const yearInUrl = parseInt(yearMatch[1], 10);
              if (tmdbData.year && yearInUrl === tmdbData.year)
                score += 3;
              else if (tmdbData.year)
                score -= 3;
            }
            console.log(
              `[desenefaine] Search candidate: ${href} (score=${score})`
            );
            candidates.push({ href, score });
          });
        }
        candidates.sort((a, b) => b.score - a.score);
        for (const candidate of candidates) {
          const yearMatch = candidate.href.match(/[-/](19\d{2}|20\d{2})(?:-|\/|$)/);
          if (tmdbData.year && yearMatch && parseInt(yearMatch[1], 10) !== tmdbData.year) {
            console.log(
              `[desenefaine] Rejecting wrong-year candidate: ${candidate.href}`
            );
            continue;
          }
          const candidateHtml = yield fetchHtml(candidate.href);
          const valid = isTv ? hasPlayerElements(candidateHtml) : isValidMoviePage(candidateHtml, tmdbData);
          if (valid) {
            console.log(
              `[desenefaine] Found valid player page at ${candidate.href}`
            );
            pageHtml = candidateHtml;
            break;
          }
        }
      }
      if (!pageHtml) {
        console.log("[desenefaine] Could not find media page.");
        return [];
      }
      const embedUrls = yield extractEmbedsFromPage(pageHtml);
      console.log(`[desenefaine] Discovered ${embedUrls.length} embed link(s)`);
      return embedUrls.map(
        (url) => buildStreamObject(url, matchedTitle, season, episode, mediaType)
      );
    } catch (error) {
      console.error("[desenefaine] Error:", error.message);
      return [];
    }
  });
}
