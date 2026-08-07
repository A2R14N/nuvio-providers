/**
 * clicksud - Built from src/clicksud/
 * Generated: 2026-08-07T21:48:51.957Z
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

// src/clicksud/extractor.js
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));

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
function fetchJson(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}) {
    try {
      const response = yield fetch(url, {
        headers: __spreadValues(__spreadValues({}, HEADERS), customHeaders)
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
      return yield response.json();
    } catch (e) {
      console.error(`[Clicksud] Fetch JSON error for ${url}: ${e.message}`);
      return null;
    }
  });
}

// src/clicksud/resolvers/embed4me.js
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
function resolveEmbed4Me(embedUrl) {
  return __async(this, null, function* () {
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
        headers: { "User-Agent": HEADERS["User-Agent"], Referer: embedUrl }
      });
      if (apiRes.ok) {
        const hexData = yield apiRes.text();
        return yield decryptEmbed4MeApi(hexData);
      }
    }
    return null;
  });
}

// src/clicksud/resolvers/veev.js
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
function decodeVeevTokenChar(tokenStr) {
  let decoded = [];
  for (let i = 0; i < tokenStr.length; i++) {
    let code = tokenStr.charCodeAt(i);
    if (code > 127) {
      decoded.push(
        String.fromCharCode(
          code % 16 < 10 ? code % 16 + 48 : code % 16 + 87
        )
      );
    } else {
      decoded.push(tokenStr[i]);
    }
  }
  return decoded.join("");
}
function buildVeevArray(encodedString) {
  let d = [];
  let c = encodedString.split("");
  let count = /^\d+$/.test(c[0]) ? parseInt(c.shift(), 10) : 0;
  while (count && c.length > 0) {
    let currentArray = [];
    for (let i = 0; i < count; i++) {
      if (c.length === 0)
        break;
      let val = /^\d+$/.test(c[0]) ? parseInt(c.shift(), 10) : 0;
      currentArray.unshift(val);
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
    if (t === 1) {
      ds = ds.split("").reverse().join("");
    }
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
      const fileCodeMatch = embedUrl.match(/\/e\/([a-zA-Z0-9]+)/) || embedUrl.match(/\/v\/([a-zA-Z0-9]+)/) || embedUrl.match(/file_code=([a-zA-Z0-9]+)/);
      if (!fileCodeMatch)
        return null;
      const fileCode = fileCodeMatch[1];
      const webUrl = `https://veev.to/e/${fileCode}`;
      const headers = {
        "User-Agent": HEADERS["User-Agent"],
        Referer: webUrl
      };
      const html = yield fetchText(webUrl, headers);
      if (!html)
        return null;
      const tokenMatch = html.match(
        /window\._vvto\[[^\]]+\]\s*=\s*["']([^"']+)["']/
      );
      if (tokenMatch) {
        const cleanToken = decodeVeevTokenChar(tokenMatch[1]);
        const apiUrl = `https://veev.to/dl?op=player_api&cmd=gi&file_code=${fileCode}&token=${cleanToken}&ie=1`;
        const res = yield fetch(apiUrl, {
          headers: __spreadProps(__spreadValues({}, headers), { "X-Requested-With": "XMLHttpRequest" })
        });
        if (res.ok) {
          const data = yield res.json();
          if (((_a = data == null ? void 0 : data.file) == null ? void 0 : _a.file_status) === "OK" && ((_c = (_b = data.file.dv) == null ? void 0 : _b[0]) == null ? void 0 : _c.url)) {
            return data.file.dv[0].url;
          }
        }
      }
      const fcRegex = /[\.\s'](?:fc|_vvto\[[^\]]*)(?:['\]]*)?\s*[:=]\s*['"]([^'"]+)['"]/g;
      let matches = [];
      let match;
      while ((match = fcRegex.exec(html)) !== null) {
        matches.push(match[1]);
      }
      for (let f of matches.reverse()) {
        const ch = veevDecode(f);
        if (ch !== f) {
          const apiUrl = `https://veev.to/dl?op=player_api&cmd=gi&file_code=${fileCode}&ch=${encodeURIComponent(
            ch
          )}&ie=1`;
          const apiRes = yield fetch(apiUrl, {
            headers: __spreadProps(__spreadValues({}, headers), { "X-Requested-With": "XMLHttpRequest" })
          });
          if (apiRes.ok) {
            const text = yield apiRes.text();
            const jresp = JSON.parse(text).file;
            if (jresp && jresp.file_status === "OK" && ((_d = jresp.dv) == null ? void 0 : _d[0])) {
              const rawS = jresp.dv[0].s;
              if (rawS) {
                const decompressedS = veevDecode(rawS);
                const tarray = buildVeevArray(ch)[0];
                const finalUrl = decodeVeevUrl(decompressedS, tarray);
                if (finalUrl)
                  return finalUrl;
              } else if (jresp.dv[0].url) {
                return jresp.dv[0].url;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(`[Clicksud] Veev resolution error: ${e.message}`);
    }
    return null;
  });
}

// src/clicksud/resolvers/okru.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
function resolveOK(embedUrl) {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      const vidMatch = embedUrl.match(/videoembed\/(\d+)/) || embedUrl.match(/video\/(\d+)/);
      if (!vidMatch)
        return null;
      const videoId = vidMatch[1];
      const embedFullUrl = `https://ok.ru/videoembed/${videoId}`;
      const html = yield fetchText(embedFullUrl, {
        "User-Agent": HEADERS["User-Agent"],
        Referer: BASE_URL
      });
      if (!html)
        return null;
      const $ = import_cheerio_without_node_native.default.load(html);
      const rawOptions = $("[data-options]").attr("data-options");
      if (rawOptions) {
        const decoded = rawOptions.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
        const json = JSON.parse(decoded);
        const meta = typeof ((_a = json.flashvars) == null ? void 0 : _a.metadata) === "string" ? JSON.parse(json.flashvars.metadata) : (_b = json.flashvars) == null ? void 0 : _b.metadata;
        if (meta == null ? void 0 : meta.hlsManifestUrl)
          return meta.hlsManifestUrl;
        if ((meta == null ? void 0 : meta.videos) && meta.videos.length > 0) {
          return meta.videos[meta.videos.length - 1].url;
        }
      }
    } catch (e) {
      console.error(`[Clicksud] OK.ru resolution error: ${e.message}`);
    }
    return null;
  });
}

// src/clicksud/resolvers/vidmoly.js
function resolveVidmoly(embedUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(embedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
          Referer: "https://filmeplayer.xyz/"
        }
      });
      if (!html)
        return null;
      const m3u8Match = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
      if (m3u8Match) {
        return m3u8Match[1] || m3u8Match[0];
      }
    } catch (e) {
      console.error(`[Vidmoly] Resolution error: ${e.message}`);
    }
    return null;
  });
}

// src/clicksud/resolvers/vk.js
function resolveVK(embedUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(embedUrl, {
        Referer: BASE_URL,
        "User-Agent": HEADERS["User-Agent"],
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "iframe",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site"
      });
      if (!html)
        return null;
      const unescapedHtml = html.replace(/\\/g, "");
      const hlsMatch = unescapedHtml.match(
        /["']hls["']\s*:\s*["'](https?:\/\/[^"']+)["']/i
      );
      if (hlsMatch)
        return hlsMatch[1];
      const mp4Match = unescapedHtml.match(
        /["']mp4_1080["']\s*:\s*["'](https?:\/\/[^"']+)["']/i
      ) || unescapedHtml.match(
        /["']mp4_720["']\s*:\s*["'](https?:\/\/[^"']+)["']/i
      ) || unescapedHtml.match(
        /["']mp4_480["']\s*:\s*["'](https?:\/\/[^"']+)["']/i
      ) || unescapedHtml.match(
        /["']mp4_360["']\s*:\s*["'](https?:\/\/[^"']+)["']/i
      ) || unescapedHtml.match(/(https?:\/\/[^"'\s]+\.vkuser\.net[^"'\s]*)/i);
      if (mp4Match) {
        return mp4Match[1] || mp4Match[0];
      }
    } catch (e) {
      console.error(`[Clicksud] VK resolution error: ${e.message}`);
    }
    return null;
  });
}

// src/clicksud/resolvers/rumble.js
function resolveRumble(embedUrl) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
      const mediaIdMatch = embedUrl.match(/\/embed\/([a-zA-Z0-9]+)/) || embedUrl.match(/\/embedJS\/[^\?]+\?.*v=([a-zA-Z0-9]+)/) || embedUrl.match(/\/v\/([a-zA-Z0-9]+)/);
      if (!mediaIdMatch)
        return null;
      const mediaId = mediaIdMatch[1];
      const apiUrl = `https://rumble.com/embedJS/u3/?request=video&ver=2&v=${mediaId}`;
      const res = yield fetch(apiUrl, {
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          Referer: "https://rumble.com/"
        }
      });
      if (res.ok) {
        const data = yield res.json();
        if ((_b = (_a = data.u) == null ? void 0 : _a.hls) == null ? void 0 : _b.url) {
          return data.u.hls.url;
        }
        const ua = data.ua || {};
        if (ua.hls) {
          const hlsUrl = typeof ua.hls === "string" ? ua.hls : ua.hls.url || ((_c = ua.hls["auto"]) == null ? void 0 : _c.url) || ((_d = ua.hls["1080"]) == null ? void 0 : _d.url);
          if (hlsUrl)
            return hlsUrl;
        }
        if (ua.mp4) {
          const mp4Url = ((_e = ua.mp4["1080"]) == null ? void 0 : _e.url) || ((_f = ua.mp4["720"]) == null ? void 0 : _f.url) || ((_g = ua.mp4["480"]) == null ? void 0 : _g.url) || ((_h = ua.mp4["360"]) == null ? void 0 : _h.url) || (typeof ua.mp4 === "string" ? ua.mp4 : null);
          if (mp4Url)
            return mp4Url;
        }
        const jsonStr = JSON.stringify(data);
        const streamMatch = jsonStr.match(/https?:\/\/[^"'\s\\]+?\.m3u8[^"'\s\\]*/i) || jsonStr.match(/https?:\/\/[^"'\s\\]+?\.mp4[^"'\s\\]*/i);
        if (streamMatch) {
          return streamMatch[0].replace(/\\/g, "");
        }
      }
    } catch (e) {
      console.error(`[Clicksud] Rumble resolution error: ${e.message}`);
    }
    return null;
  });
}

// src/clicksud/resolvers/fsonline.js
function resolveFSOnline(embedUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(embedUrl, {
        Referer: "https://clicksud.com.in/"
      });
      if (!html)
        return null;
      const match = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i);
      return match ? match[1] : null;
    } catch (error) {
      console.error(`[Clicksud] FSOnline resolution error: ${error.message}`);
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

// src/clicksud/resolvers/index.js
function resolveEmbedToRawM3u8(embedUrl) {
  return __async(this, null, function* () {
    if (!embedUrl)
      return null;
    if ((embedUrl.includes(".m3u8") || embedUrl.includes(".mp4")) && !embedUrl.includes("/e/") && !embedUrl.includes("/embed") && !embedUrl.includes("video_ext.php")) {
      return embedUrl;
    }
    try {
      if (embedUrl.includes("player.fsonline.app")) {
        const stream = yield resolveFSOnline(embedUrl);
        if (stream)
          return stream;
      }
      if (embedUrl.includes("vidoza.net") || embedUrl.includes("vidoza.co") || embedUrl.includes("videzz.net")) {
        const stream = yield resolveVidoza(embedUrl);
        if (stream)
          return stream;
      }
      if (embedUrl.includes("rumble.com") || embedUrl.includes("rumble")) {
        const stream = yield resolveRumble(embedUrl);
        if (stream)
          return stream;
      }
      if (embedUrl.includes("veev.to") || embedUrl.includes("veev")) {
        const stream = yield resolveVeev(embedUrl);
        if (stream)
          return stream;
      }
      if (embedUrl.includes("ok.ru")) {
        const stream = yield resolveOK(embedUrl);
        if (stream)
          return stream;
      }
      if (embedUrl.includes("vidmoly")) {
        const stream = yield resolveVidmoly(embedUrl);
        if (stream)
          return stream;
      }
      if (embedUrl.includes("vkvideo.ru") || embedUrl.includes("vk.com")) {
        const stream = yield resolveVK(embedUrl);
        if (stream)
          return stream;
      }
      if (embedUrl.includes("embed4me") || embedUrl.includes("player4me") || embedUrl.includes("p2pplay") || embedUrl.includes("streamp2p")) {
        const stream = yield resolveEmbed4Me(embedUrl);
        if (stream)
          return stream;
      }
    } catch (e) {
      console.error(`[Clicksud] Resolution error for ${embedUrl}: ${e.message}`);
    }
    return null;
  });
}

// src/clicksud/extractor.js
function normalize(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function isPlayableStream(url) {
  if (!url)
    return false;
  return url.includes(".m3u8") || url.includes(".mp4") || url.includes("/stream?") || url.includes("vkuser.net") || url.includes("rumble.com");
}
function searchClicksud(query, season, episode) {
  return __async(this, null, function* () {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    const html = yield fetchText(searchUrl);
    if (!html)
      return null;
    const $ = import_cheerio_without_node_native2.default.load(html);
    let pageUrl = null;
    const normQuery = normalize(query);
    const isSpanishQuery = normQuery.includes("spania") || normQuery.includes("spain");
    $("article a, h2.entry-title a, h3.entry-title a, .post-title a").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (href && href.includes("clicksud.com.in/") && !href.includes("/category/") && !href.includes("/page/")) {
        const normText = normalize(text);
        const normHref = normalize(href);
        if (!isSpanishQuery && (normText.includes("spania") || normHref.includes("spania")))
          return true;
        if (season && episode) {
          const epPattern = `sezonul${season}episodul${episode}`;
          if (normHref.includes(epPattern) || normText.includes(epPattern)) {
            pageUrl = href;
            return false;
          }
        }
        if (normText.includes(normQuery) || normHref.includes(normQuery) || normQuery.length > 5 && normText.length > 5 && normQuery.includes(normText)) {
          pageUrl = href;
          return false;
        }
      }
    });
    if (!pageUrl) {
      $("a").each((_, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr("href");
        if (href && href.includes("clicksud.com.in/") && href !== "https://clicksud.com.in/" && href !== "https://clicksud.com.in" && !href.includes("/category/") && !href.includes("/page/")) {
          const normText = normalize(text);
          const normHref = normalize(href);
          if (!isSpanishQuery && (normText.includes("spania") || normHref.includes("spania")))
            return true;
          if (season && episode) {
            const epPattern = `sezonul${season}episodul${episode}`;
            if (normHref.includes(epPattern) || normText.includes(epPattern)) {
              pageUrl = href;
              return false;
            }
          }
          if (normText.length > 3 && normQuery.includes(normText) || normHref.length > 3 && normHref.includes(normQuery)) {
            pageUrl = href;
            return false;
          }
        }
      });
    }
    return pageUrl;
  });
}
function extractStreams(mediaInfo, mediaType, season, episode) {
  return __async(this, null, function* () {
    if (!mediaInfo)
      return [];
    const cleanTitle = (mediaInfo.title || "").replace(/[:\-–—].*$/, "").trim();
    const cleanRoTitle = (mediaInfo.roTitle || "").replace(/[:\-–—].*$/, "").trim();
    const cleanOrigTitle = (mediaInfo.originalTitle || "").replace(/[:\-–—].*$/, "").trim();
    let searchQueries = [];
    if (mediaType === "tv") {
      searchQueries = [
        mediaInfo.roTitle ? `${mediaInfo.roTitle} Sezonul ${season} Episodul ${episode}` : null,
        cleanRoTitle ? `${cleanRoTitle} Sezonul ${season} Episodul ${episode}` : null,
        `${mediaInfo.title} Sezonul ${season} Episodul ${episode}`,
        cleanTitle ? `${cleanTitle} Sezonul ${season} Episodul ${episode}` : null,
        `${mediaInfo.originalTitle} Sezonul ${season} Episodul ${episode}`,
        cleanOrigTitle ? `${cleanOrigTitle} Sezonul ${season} Episodul ${episode}` : null,
        mediaInfo.roTitle ? `${mediaInfo.roTitle} Episodul ${episode}` : null,
        cleanRoTitle ? `${cleanRoTitle} Episodul ${episode}` : null,
        `${mediaInfo.title} Episodul ${episode}`,
        cleanTitle ? `${cleanTitle} Episodul ${episode}` : null,
        cleanTitle ? `${cleanTitle} S${season}E${episode}` : null,
        cleanTitle ? `${cleanTitle} ${season}x${episode}` : null,
        mediaInfo.roTitle,
        cleanRoTitle,
        mediaInfo.title,
        cleanTitle
      ].filter(Boolean);
    } else {
      searchQueries = [mediaInfo.roTitle, cleanRoTitle, mediaInfo.title, cleanTitle, mediaInfo.originalTitle, cleanOrigTitle].filter(Boolean);
    }
    let targetUrl = null;
    for (const q of searchQueries) {
      if (!q)
        continue;
      targetUrl = yield searchClicksud(q, season, episode);
      if (targetUrl)
        break;
    }
    if (!targetUrl) {
      console.log(`[Clicksud] No page found for: ${mediaInfo.title}`);
      return [];
    }
    console.log(`[Clicksud] Extracting streams from: ${targetUrl}`);
    const pagesToScan = [targetUrl];
    if (!targetUrl.endsWith("/"))
      targetUrl += "/";
    pagesToScan.push(`${targetUrl}2/`, `${targetUrl}3/`);
    const embeds = /* @__PURE__ */ new Set();
    const knownHosts = [
      "rumble",
      "embed4me",
      "player4me",
      "p2pplay",
      "streamp2p",
      "vidmoly",
      "vkvideo.ru",
      "vk.com",
      "ok.ru",
      "veev",
      "filemoon",
      "vidoza",
      "videzz",
      "dood",
      "mixdrop",
      "voe",
      "player.fsonline.app"
    ];
    for (const pageUrl of pagesToScan) {
      const pageHtml = yield fetchText(pageUrl);
      if (!pageHtml)
        continue;
      const $ = import_cheerio_without_node_native2.default.load(pageHtml);
      $("iframe").each((_, el) => {
        let src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
        if (src) {
          if (src.startsWith("//"))
            src = "https:" + src;
          embeds.add(src);
        }
      });
      $("[data-link], [data-embed], [data-url], a").each((_, el) => {
        let val = $(el).attr("data-link") || $(el).attr("data-embed") || $(el).attr("data-url") || $(el).attr("href");
        if (val) {
          if (val.startsWith("//"))
            val = "https:" + val;
          if (knownHosts.some((host) => val.toLowerCase().includes(host))) {
            embeds.add(val);
          }
        }
      });
      const rawUrls = pageHtml.match(/https?:\/\/[^\s"'<>\\]+/gi) || [];
      rawUrls.forEach((url) => {
        let cleaned = url.replace(/['"\\>].*$/, "").replace(/&amp;/g, "&");
        if (knownHosts.some((host) => cleaned.toLowerCase().includes(host))) {
          embeds.add(cleaned);
        }
      });
    }
    const streams = [];
    for (const embedUrl of Array.from(embeds)) {
      const rawMediaUrl = yield resolveEmbedToRawM3u8(embedUrl);
      if (rawMediaUrl && isPlayableStream(rawMediaUrl)) {
        const embedOrigin = new URL(embedUrl).origin;
        let serverName = "Direct Stream";
        if (embedUrl.includes("rumble"))
          serverName = "Rumble";
        else if (embedUrl.includes("player.fsonline.app"))
          serverName = "Vidmoly";
        else if (embedUrl.includes("veev"))
          serverName = "Veev";
        else if (embedUrl.includes("ok.ru"))
          serverName = "OK.ru";
        else if (embedUrl.includes("vidmoly"))
          serverName = "Vidmoly";
        else if (embedUrl.includes("vk"))
          serverName = "VK Video";
        else if (embedUrl.includes("vidoza") || embedUrl.includes("videzz"))
          serverName = "Vidoza";
        else if (embedUrl.includes("embed4me") || embedUrl.includes("player4me"))
          serverName = "Embed4Me";
        streams.push({
          name: `Clicksud - ${serverName}`,
          title: `Server ${serverName}`,
          url: rawMediaUrl,
          quality: "1080p",
          language: "ro",
          headers: {
            "User-Agent": HEADERS["User-Agent"],
            Referer: `${embedOrigin}/`,
            Origin: embedOrigin
          }
        });
      }
    }
    return streams;
  });
}

// src/clicksud/tmdb.js
var TMDB_API_KEY = "31031042b5deb218a10d70a4c01ea934";
function getMediaInfo(idInput, mediaType) {
  return __async(this, null, function* () {
    let tmdbId = idInput;
    if (typeof tmdbId === "string" && tmdbId.startsWith("tt")) {
      try {
        const findUrl = `https://api.themoviedb.org/3/find/${tmdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
        const findData = yield fetchJson(findUrl);
        const results = mediaType === "movie" ? findData.movie_results : findData.tv_results;
        if (results && results.length > 0) {
          tmdbId = results[0].id;
        }
      } catch (e) {
        console.error(`[Clicksud] IMDb lookup error for ${idInput}: ${e.message}`);
      }
    }
    const endpoint = mediaType === "movie" ? "movie" : "tv";
    const mainUrl = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const transUrl = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}/translations?api_key=${TMDB_API_KEY}`;
    try {
      const [data, transData] = yield Promise.all([
        fetchJson(mainUrl),
        fetchJson(transUrl).catch(() => null)
      ]);
      if (!data)
        return null;
      let roTitle = null;
      if (transData && transData.translations) {
        const roTrans = transData.translations.find(
          (t) => t.iso_639_1 === "ro" || t.iso_3166_1 === "RO"
        );
        if (roTrans && roTrans.data) {
          roTitle = roTrans.data.title || roTrans.data.name;
        }
      }
      return {
        title: data.title || data.name,
        originalTitle: data.original_title || data.original_name,
        roTitle,
        year: (data.release_date || data.first_air_date || "").split("-")[0]
      };
    } catch (err) {
      console.error(`[Clicksud] TMDB lookup error: ${err.message}`);
      return null;
    }
  });
}

// src/clicksud/index.js
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    try {
      let mediaInfo = null;
      const id = typeof tmdbId === "object" ? tmdbId.tmdbId || tmdbId.id : tmdbId;
      if (id) {
        mediaInfo = yield getMediaInfo(id, mediaType);
      }
      if (!mediaInfo && typeof tmdbId === "object" && tmdbId !== null) {
        mediaInfo = {
          title: tmdbId.title || tmdbId.name,
          originalTitle: tmdbId.originalTitle || tmdbId.original_title || tmdbId.original_name,
          roTitle: tmdbId.roTitle || null
        };
      }
      if (!mediaInfo)
        return [];
      return yield extractStreams(mediaInfo, mediaType, season, episode);
    } catch (error) {
      console.error(`[Clicksud] Error in getStreams: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
