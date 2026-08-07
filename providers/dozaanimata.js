/**
 * dozaanimata - Built from src/dozaanimata/
 * Generated: 2026-08-07T21:48:51.975Z
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

// src/dozaanimata/index.js
var dozaanimata_exports = {};
__export(dozaanimata_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(dozaanimata_exports);

// src/dozaanimata/tmdb.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36";
function fetchTmdbDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    const isTv = mediaType === "tv" || mediaType === "series";
    const primaryEndpoint = isTv ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${primaryEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
    console.log(`[dozaanimata] Requesting TMDB URL: ${url}`);
    try {
      const res = yield fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) {
        console.warn(`[dozaanimata] TMDB returned status ${res.status}`);
        return null;
      }
      const data = yield res.json();
      let titleRo = null;
      if ((_a = data.translations) == null ? void 0 : _a.translations) {
        const roTrans = data.translations.translations.find(
          (t) => t.iso_639_1 === "ro"
        );
        if (roTrans == null ? void 0 : roTrans.data) {
          titleRo = roTrans.data.name || roTrans.data.title;
        }
      }
      const primaryTitle = data.name || data.title || "Unknown";
      const releaseDate = data.first_air_date || data.release_date;
      const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
      console.log(
        `[dozaanimata] TMDB: Title="${primaryTitle}", TitleRo="${titleRo || "N/A"}", Year=${year}`
      );
      return {
        title: primaryTitle,
        titleRo: titleRo || primaryTitle,
        year
      };
    } catch (e) {
      console.error("[dozaanimata] TMDB Exception:", e.message);
      return null;
    }
  });
}

// src/dozaanimata/constants.js
var BASE_URL = "https://www.dozaanimata.net";
var USER_AGENT2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": USER_AGENT2,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  Referer: BASE_URL + "/"
};
function slugify(text) {
  if (!text)
    return "";
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

// src/dozaanimata/http.js
function fetchHtml(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}) {
    try {
      const mergedHeaders = Object.assign({}, HEADERS, customHeaders);
      let response = yield fetch(url, {
        headers: mergedHeaders,
        skipSizeCheck: true,
        cfKiller: true
      });
      if ((response.status === 403 || response.status === 503) && typeof globalThis.Cloudflare !== "undefined" && globalThis.Cloudflare.solve) {
        console.log(`[dozaanimata] Solved Cloudflare for: ${url}`);
        const solvedHeaders = yield globalThis.Cloudflare.solve(url);
        if (solvedHeaders["Cookie"])
          HEADERS["Cookie"] = solvedHeaders["Cookie"];
        if (solvedHeaders["User-Agent"])
          HEADERS["User-Agent"] = solvedHeaders["User-Agent"];
        const retryHeaders = Object.assign({}, mergedHeaders, {
          Cookie: HEADERS["Cookie"],
          "User-Agent": HEADERS["User-Agent"]
        });
        response = yield fetch(url, {
          headers: retryHeaders,
          skipSizeCheck: true,
          cfKiller: true
        });
      }
      if (!response.ok)
        return null;
      const text = yield response.text();
      if (text.includes("404 Not Found") || text.includes("nu a fost g\u0103sit\u0103") || text.includes("Page Not Found")) {
        return null;
      }
      return text;
    } catch (e) {
      console.error(`[dozaanimata] Fetch error for ${url}:`, e.message);
      return null;
    }
  });
}

// src/dozaanimata/extractors/index.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/dozaanimata/extractors/dood.js
var DOOD_DOMAINS = [
  "dood.watch",
  "doodstream.com",
  "dood.to",
  "dood.so",
  "dood.cx",
  "dood.la",
  "dood.ws",
  "dood.sh",
  "doodstream.co",
  "dood.pm",
  "dood.wf",
  "dood.re",
  "dood.yt",
  "dooood.com",
  "dood.stream",
  "ds2play.com",
  "doods.pro",
  "ds2video.com",
  "d0o0d.com",
  "do0od.com",
  "d0000d.com",
  "d000d.com",
  "dood.li",
  "dood.work",
  "dooodster.com",
  "vidply.com",
  "all3do.com",
  "do7go.com",
  "doodcdn.io",
  "doply.net",
  "vide0.net",
  "vvide0.com",
  "d-s.io",
  "dsvplay.com",
  "myvidplay.com",
  "playmogo.com"
];
function isDoodDomain(url) {
  if (!url)
    return false;
  const lower = url.toLowerCase();
  return DOOD_DOMAINS.some((domain) => lower.includes(domain));
}
function resolveDood(embedUrl) {
  return __async(this, null, function* () {
    try {
      const urlObj = new URL(embedUrl);
      const customHeaders = Object.assign({}, HEADERS, {
        Referer: "https://www.dozaanimata.net/",
        "Sec-Fetch-Dest": "iframe",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site"
      });
      const html = yield fetchHtml(embedUrl, customHeaders);
      if (!html)
        return null;
      const passMatch = html.match(/\/pass_md5\/[^\s"'<>\\]+/);
      if (!passMatch)
        return null;
      const passPath = passMatch[0];
      const passUrl = `${urlObj.origin}${passPath}`;
      const passRes = yield fetch(passUrl, {
        headers: Object.assign({}, HEADERS, {
          Referer: embedUrl,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin"
        })
      });
      if (!passRes.ok)
        return null;
      const passText = yield passRes.text();
      const randStr = Math.random().toString(36).substring(2, 12);
      const token = passPath.split("/").pop();
      const rawVideoUrl = `${passText.trim()}${randStr}?token=${token}&expiry=${Date.now()}`;
      return {
        rawUrl: rawVideoUrl,
        headers: {
          "User-Agent": USER_AGENT2,
          Referer: `${urlObj.origin}/`,
          Origin: urlObj.origin
        }
      };
    } catch (e) {
      console.error(`[dozaanimata] DoodStream error: ${e.message}`);
    }
    return null;
  });
}

// src/dozaanimata/extractors/vk.js
function resolveVk(embedUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchHtml(embedUrl, {
        Referer: "https://dozaanimata.net/"
      });
      if (!html)
        return null;
      const hlsMatch = html.match(/["']hls["']\s*:\s*["']([^"']+)["']/i);
      if (hlsMatch)
        return hlsMatch[1].replace(/\\/g, "");
      const mp4Match = html.match(/["']url1080["']\s*:\s*["']([^"']+)["']/i) || html.match(/["']url720["']\s*:\s*["']([^"']+)["']/i) || html.match(/["']url480["']\s*:\s*["']([^"']+)["']/i) || html.match(/["']url360["']\s*:\s*["']([^"']+)["']/i);
      if (mp4Match)
        return mp4Match[1].replace(/\\/g, "");
    } catch (e) {
    }
    return null;
  });
}

// src/dozaanimata/extractors/veev.js
function veevDecode(etext) {
  if (!etext || etext.length === 0)
    return etext;
  let result = [];
  let lut = {};
  let n = 256;
  let c = etext[0];
  result.push(c);
  for (let i = 1; i < etext.length; i++) {
    let char = etext[i];
    let code = char.charCodeAt(0);
    let nc = code < 256 ? char : lut[code] !== void 0 ? lut[code] : c + c[0];
    result.push(nc);
    lut[n] = c + nc[0];
    n++;
    c = nc;
  }
  return result.join("");
}
function buildArray(encodedString) {
  let d = [];
  let c = encodedString.split("");
  let count = /^\d+$/.test(c[0]) ? parseInt(c.shift(), 10) : 0;
  while (count && c.length > 0) {
    let currentArray = [];
    for (let i = 0; i < count; i++) {
      if (c.length === 0)
        break;
      currentArray.unshift(/^\d+$/.test(c[0]) ? parseInt(c.shift(), 10) : 0);
    }
    d.push(currentArray);
    if (c.length === 0)
      break;
    count = /^\d+$/.test(c[0]) ? parseInt(c.shift(), 10) : 0;
  }
  return d;
}
function decodeVeevUrl(etext, tarray) {
  let ds = etext;
  if (!tarray)
    return ds;
  for (let t of tarray) {
    if (t === 1)
      ds = ds.split("").reverse().join("");
    let hex = "";
    for (let i = 0; i < ds.length; i += 2) {
      hex += String.fromCharCode(parseInt(ds.substr(i, 2), 16));
    }
    ds = hex;
    ds = ds.replace("dXRmOA==", "");
  }
  return ds;
}
function resolveVeev(embedUrl) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    try {
      const urlObj = new URL(embedUrl);
      const mediaId = ((_b = (_a = embedUrl.split("/e/")[1]) == null ? void 0 : _a.split("?")[0]) == null ? void 0 : _b.split("/")[0]) || ((_d = (_c = embedUrl.split("/d/")[1]) == null ? void 0 : _c.split("?")[0]) == null ? void 0 : _d.split("/")[0]);
      if (!mediaId)
        return null;
      const webUrl = `${urlObj.origin}/e/${mediaId}`;
      const html = yield fetchHtml(webUrl, { Referer: webUrl });
      if (!html)
        return null;
      const regex = /[\.\s'](?:fc|_vvto\[[^\]]*)(?:['\]]*)?\s*[:=]\s*['"]([^'"]+)['"]/g;
      let matches = [];
      let match;
      while ((match = regex.exec(html)) !== null) {
        matches.push(match[1]);
      }
      for (let f of matches.reverse()) {
        const ch = veevDecode(f);
        if (ch !== f) {
          const apiUrl = `${urlObj.origin}/dl?op=player_api&cmd=gi&file_code=${mediaId}&ch=${encodeURIComponent(ch)}&ie=1`;
          const apiRes = yield fetch(apiUrl, {
            headers: Object.assign({}, HEADERS, {
              Referer: webUrl,
              "X-Requested-With": "XMLHttpRequest"
            })
          });
          const jsonText = yield apiRes.text();
          const jresp = JSON.parse(jsonText).file;
          if (jresp && jresp.file_status === "OK" && jresp.dv && jresp.dv[0]) {
            const rawS = jresp.dv[0].s;
            const decompressedS = veevDecode(rawS);
            const tarray = buildArray(ch)[0];
            return decodeVeevUrl(decompressedS, tarray);
          }
        }
      }
    } catch (e) {
    }
    return null;
  });
}

// src/dozaanimata/extractors/filemoon.js
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
    }
    return null;
  });
}

// src/dozaanimata/extractors/streamwish.js
function resolveStreamWish(embedUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchHtml(embedUrl);
      if (!html)
        return null;
      const m3u8Match = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/https?:\/\/[^"']+\.m3u8[^"']*/i);
      if (m3u8Match)
        return m3u8Match[1] || m3u8Match[0];
    } catch (e) {
    }
    return null;
  });
}

// src/clicksud/http.js
var BASE_URL2 = "https://clicksud.com.in";
var HEADERS2 = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
  Referer: `${BASE_URL2}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
};
function fetchText(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}) {
    try {
      const response = yield fetch(url, {
        headers: __spreadValues(__spreadValues({}, HEADERS2), customHeaders)
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

// src/dozaanimata/extractors/index.js
function resolveEmbedToRawStream(embedUrl) {
  return __async(this, null, function* () {
    if (!embedUrl)
      return null;
    if ((embedUrl.includes(".m3u8") || embedUrl.includes(".mp4")) && !embedUrl.includes("/e/") && !embedUrl.includes("/embed/") && !embedUrl.includes("/v/")) {
      return { rawUrl: embedUrl, headers: HEADERS };
    }
    try {
      const urlObj = new URL(embedUrl);
      let rawResult = null;
      if (isDoodDomain(embedUrl)) {
        rawResult = yield resolveDood(embedUrl);
      } else if (embedUrl.includes("vk.com") || embedUrl.includes("vkvideo.ru")) {
        const rawUrl = yield resolveVk(embedUrl);
        if (rawUrl)
          rawResult = {
            rawUrl,
            headers: {
              "User-Agent": USER_AGENT2,
              Referer: "https://dozaanimata.net/"
            }
          };
      } else if (embedUrl.includes("veev.to") || embedUrl.includes("voe") || embedUrl.includes("poophq")) {
        const rawUrl = yield resolveVeev(embedUrl);
        if (rawUrl)
          rawResult = { rawUrl, headers: HEADERS };
      } else if (embedUrl.includes("ghbrisk") || embedUrl.includes("streamwish") || embedUrl.includes("filelions") || embedUrl.includes("streamhg")) {
        const rawUrl = yield resolveStreamWish(embedUrl);
        if (rawUrl)
          rawResult = { rawUrl, headers: HEADERS };
      } else if (embedUrl.includes("vidoza.net") || embedUrl.includes("vidoza.co") || embedUrl.includes("videzz.net")) {
        const rawUrl = yield resolveVidoza(embedUrl);
        if (rawUrl) {
          rawResult = {
            rawUrl,
            headers: {
              "User-Agent": USER_AGENT2,
              Referer: `${urlObj.origin}/`
            }
          };
        }
      }
      let code = embedUrl.includes("/e/") ? embedUrl.split("/e/")[1].split("?")[0].split("/")[0] : null;
      if (!rawResult && code) {
        try {
          const apiUrl = `${urlObj.origin}/api/videos/${code}`;
          const apiRes = yield fetch(apiUrl, {
            headers: Object.assign({}, HEADERS, {
              Referer: embedUrl,
              Origin: urlObj.origin
            })
          });
          if (apiRes.ok) {
            const json = yield apiRes.json();
            if (json == null ? void 0 : json.playback) {
              const rawUrl = yield decryptFilemoonApi(json.playback);
              if (rawUrl)
                rawResult = {
                  rawUrl,
                  headers: {
                    "User-Agent": USER_AGENT2,
                    Referer: `${urlObj.origin}/`
                  }
                };
            }
          }
        } catch (e) {
        }
      }
      return rawResult;
    } catch (e) {
      console.error(`[dozaanimata] Master resolution error: ${e.message}`);
    }
    return null;
  });
}
function extractEmbedsFromPage(html) {
  return __async(this, null, function* () {
    if (!html)
      return [];
    const $ = import_cheerio_without_node_native.default.load(html);
    const embedUrls = /* @__PURE__ */ new Set();
    const isPlayableEmbed = (url) => {
      if (!url || typeof url !== "string")
        return false;
      if (!url.startsWith("http://") && !url.startsWith("https://"))
        return false;
      const lower = url.toLowerCase();
      if (lower.includes("youtube.com") || lower.includes("youtu.be") || lower.includes("wp-") || lower.endsWith(".js") || lower.includes("popads"))
        return false;
      return true;
    };
    $("iframe, embed, object").each((_, el) => {
      let src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
      if (src) {
        if (src.startsWith("//"))
          src = "https:" + src;
        if (isPlayableEmbed(src))
          embedUrls.add(src);
      }
    });
    const knownHosts = [
      "ok.ru",
      "filemoon",
      "streamtape",
      "vk.com",
      "vkvideo.ru",
      "vidoza",
      "videzz",
      "voe",
      "streamwish"
    ].concat(DOOD_DOMAINS);
    const rawUrls = html.match(/https?:\/\/[^\s"'<>\\]+/gi) || [];
    rawUrls.forEach((url) => {
      const lower = url.toLowerCase();
      if (knownHosts.some((host) => lower.includes(host)) && isPlayableEmbed(url)) {
        embedUrls.add(url.replace(/['"\\>].*$/, ""));
      }
    });
    return Array.from(embedUrls);
  });
}
function buildStreamObject(rawStream, embedUrl, showTitle, season, episode, mediaType) {
  let serverName = "Server";
  const lower = (embedUrl || "").toLowerCase();
  if (isDoodDomain(embedUrl)) {
    if (lower.includes("playmogo"))
      serverName = "PlayMogo";
    else
      serverName = "DoodStream";
  } else if (lower.includes("ok.ru"))
    serverName = "OK.ru";
  else if (lower.includes("filemoon"))
    serverName = "FileMoon";
  else if (lower.includes("vk.com") || lower.includes("vkvideo.ru"))
    serverName = "VK Video";
  else if (lower.includes("streamtape"))
    serverName = "StreamTape";
  else if (lower.includes("vidoza") || lower.includes("videzz"))
    serverName = "Vidoza";
  const isTv = mediaType === "tv" || mediaType === "series";
  const displayTitle = isTv && season && episode ? `${showTitle} S${season}E${episode}` : showTitle;
  const rawUrl = typeof rawStream === "string" ? rawStream : rawStream == null ? void 0 : rawStream.rawUrl;
  const isM3u8 = rawUrl && rawUrl.includes(".m3u8");
  return {
    name: `DozaAnimata - ${serverName}`,
    title: displayTitle,
    url: rawUrl,
    quality: isM3u8 ? "Auto" : "1080p",
    language: "ro",
    headers: (rawStream == null ? void 0 : rawStream.headers) || HEADERS
  };
}

// src/dozaanimata/index.js
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    console.log(
      `[dozaanimata] getStreams started: ID=${tmdbId}, type=${mediaType}, S=${season}, E=${episode}`
    );
    try {
      const tmdbData = yield fetchTmdbDetails(tmdbId, mediaType);
      if (!tmdbData)
        return [];
      const isTv = mediaType === "tv" || mediaType === "series";
      const titlesToTry = Array.from(
        new Set([tmdbData.title, tmdbData.titleRo].filter(Boolean))
      );
      let pageHtml = null;
      let matchedTitle = tmdbData.title;
      const slugCandidates = [];
      const baseSlugs = titlesToTry.map((t) => slugify(t)).filter(Boolean);
      if (isTv && season && episode) {
        for (const slug of baseSlugs) {
          slugCandidates.push(
            `${slug}-sezonul-${season}-episodul-${episode}-online-in-romana`
          );
          slugCandidates.push(`${slug}-sezonul-${season}-episodul-${episode}`);
        }
      } else {
        if (tmdbData.year) {
          for (const slug of baseSlugs) {
            slugCandidates.push(`${slug}-${tmdbData.year}-online-in-romana`);
          }
        }
        for (const slug of baseSlugs) {
          slugCandidates.push(`${slug}-online-in-romana`);
        }
        for (const slug of baseSlugs) {
          slugCandidates.push(`${slug}`);
        }
      }
      for (const slug of slugCandidates) {
        const candidateUrl = `${BASE_URL}/${slug}/`;
        console.log(`[dozaanimata] Checking direct slug URL: ${candidateUrl}`);
        const html = yield fetchHtml(candidateUrl);
        if (html) {
          console.log(`[dozaanimata] Direct URL matched: ${candidateUrl}`);
          pageHtml = html;
          break;
        }
      }
      if (!pageHtml) {
        for (const title of titlesToTry) {
          const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
          const searchHtml = yield fetchHtml(searchUrl);
          if (searchHtml) {
            const $ = import_cheerio_without_node_native2.default.load(searchHtml);
            const searchResults = [];
            $("a[href]").each((_, el) => {
              const href = $(el).attr("href");
              if (!href || href.includes("wp-") || href.includes("/category/") || href.includes("/tag/") || href === BASE_URL + "/")
                return;
              if (isTv && season && episode) {
                const epRegex = new RegExp(
                  `sezonul-${season}-episodul-${episode}(?:-|\\/|$)`,
                  "i"
                );
                if (epRegex.test(href))
                  searchResults.push(href);
              } else {
                if (href.startsWith(BASE_URL) && href.includes("-online-in-romana")) {
                  searchResults.push(href);
                }
              }
            });
            if (searchResults.length > 0) {
              const targetUrl = searchResults[0];
              pageHtml = yield fetchHtml(targetUrl);
              if (pageHtml) {
                matchedTitle = title;
                break;
              }
            }
          }
        }
      }
      if (!pageHtml) {
        console.log("[dozaanimata] Could not find media page.");
        return [];
      }
      const embedUrls = yield extractEmbedsFromPage(pageHtml);
      console.log(`[dozaanimata] Discovered ${embedUrls.length} stream embed(s)`);
      const finalStreams = [];
      for (const embedUrl of embedUrls) {
        console.log(`[dozaanimata] Resolving raw stream for embed: ${embedUrl}`);
        const rawStream = yield resolveEmbedToRawStream(embedUrl);
        if (rawStream && rawStream.rawUrl) {
          console.log(
            `[dozaanimata] Successfully resolved raw stream: ${rawStream.rawUrl}`
          );
          finalStreams.push(
            buildStreamObject(
              rawStream,
              embedUrl,
              matchedTitle,
              season,
              episode,
              mediaType
            )
          );
        } else {
          console.log(`[dozaanimata] Falling back to embed URL for ${embedUrl}`);
          finalStreams.push(
            buildStreamObject(
              { rawUrl: embedUrl },
              embedUrl,
              matchedTitle,
              season,
              episode,
              mediaType
            )
          );
        }
      }
      return finalStreams;
    } catch (error) {
      console.error("[dozaanimata] Error:", error.message);
      return [];
    }
  });
}
