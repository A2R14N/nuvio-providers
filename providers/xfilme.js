/**
 * xfilme - Built from src/xfilme/
 * Generated: 2026-08-07T21:48:52.023Z
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

// src/xfilme/extractor.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/xfilme/http.js
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
  Referer: "https://xfilme.ro/",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7"
};
function fetchText(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}) {
    const response = yield fetch(url, {
      headers: __spreadValues(__spreadValues({}, HEADERS), customHeaders)
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status} on ${url}`);
    return yield response.text();
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}) {
    const text = yield fetchText(url, customHeaders);
    return JSON.parse(text);
  });
}

// src/xfilme/extractor.js
var BASE_URL = "https://xfilme.ro";
function normalize(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
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
      console.error(`[XFilme] Filemoon AES-GCM error: ${e.message}`);
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
  let count = parseInt(c.shift(), 10) || 0;
  while (count && c.length > 0) {
    let currentArray = [];
    for (let i = 0; i < count; i++) {
      if (c.length === 0)
        break;
      currentArray.unshift(parseInt(c.shift(), 10) || 0);
    }
    d.push(currentArray);
    if (c.length === 0)
      break;
    count = parseInt(c.shift(), 10) || 0;
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
      const urlObj = new URL(embedUrl);
      const mediaId = ((_b = (_a = embedUrl.split("/e/")[1]) == null ? void 0 : _a.split("?")[0]) == null ? void 0 : _b.split("/")[0]) || ((_d = (_c = embedUrl.split("/d/")[1]) == null ? void 0 : _c.split("?")[0]) == null ? void 0 : _d.split("/")[0]);
      if (!mediaId)
        return null;
      const webUrl = `${urlObj.origin}/e/${mediaId}`;
      const headers = {
        "User-Agent": HEADERS["User-Agent"],
        Referer: webUrl
      };
      const res = yield fetch(webUrl, { headers });
      const html = yield res.text();
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
            headers: __spreadProps(__spreadValues({}, headers), {
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
      console.error(`[XFilme] Veev resolution error: ${e.message}`);
    }
    return null;
  });
}
function resolveStreamWish(embedUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(embedUrl);
      const m3u8Match = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/https?:\/\/[^"']+\.m3u8[^"']*/i);
      if (m3u8Match)
        return m3u8Match[1] || m3u8Match[0];
    } catch (e) {
      console.error(`[XFilme] StreamWish error: ${e.message}`);
    }
    return null;
  });
}
function resolveStreamFlash(embedUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(embedUrl);
      const $ = import_cheerio_without_node_native.default.load(html);
      let videoSrc = $("video source").attr("src") || $("video").attr("src");
      if (videoSrc) {
        if (videoSrc.startsWith("//"))
          videoSrc = "https:" + videoSrc;
        if (videoSrc.startsWith("/")) {
          const urlObj = new URL(embedUrl);
          videoSrc = `${urlObj.origin}${videoSrc}`;
        }
        return videoSrc;
      }
      let iframeSrc = $("iframe").attr("src");
      if (iframeSrc) {
        if (iframeSrc.startsWith("//"))
          iframeSrc = "https:" + iframeSrc;
        return yield resolveEmbedToRawM3u8(iframeSrc);
      }
      const m3u8Match = html.match(/https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*/i);
      if (m3u8Match)
        return m3u8Match[0];
    } catch (e) {
      console.error(`[XFilme] StreamFlash resolution error: ${e.message}`);
    }
    return null;
  });
}
function resolveEmbedToRawM3u8(embedUrl) {
  return __async(this, null, function* () {
    if (!embedUrl)
      return null;
    if (embedUrl.includes("listeamed.net")) {
      return null;
    }
    if ((embedUrl.includes(".m3u8") || embedUrl.includes(".mp4")) && !embedUrl.includes("/e/") && !embedUrl.includes("/embed/") && !embedUrl.includes("/watch") && !embedUrl.includes("/v/")) {
      return embedUrl;
    }
    try {
      const urlObj = new URL(embedUrl);
      if (embedUrl.includes("streamflash.sx")) {
        const stream = yield resolveStreamFlash(embedUrl);
        if (stream)
          return stream;
      }
      if (embedUrl.includes("ghbrisk.com") || embedUrl.includes("streamwish") || embedUrl.includes("filelions") || embedUrl.includes("streamhg")) {
        const stream = yield resolveStreamWish(embedUrl);
        if (stream)
          return stream;
      }
      if (embedUrl.includes("veev.to") || embedUrl.includes("voe.sx") || embedUrl.includes("poophq.com") || embedUrl.includes("doods.to")) {
        const stream = yield resolveVeev(embedUrl);
        if (stream)
          return stream;
      }
      if (embedUrl.includes("waaw.to") || embedUrl.includes("netu")) {
        return null;
      }
      let code = "";
      if (embedUrl.includes("/e/")) {
        code = embedUrl.split("/e/")[1].split("?")[0].split("/")[0];
      } else if (embedUrl.includes("/v/")) {
        code = embedUrl.split("/v/")[1].split("?")[0].split("/")[0];
      }
      if (code) {
        try {
          const apiUrl = `${urlObj.origin}/api/videos/${code}`;
          const apiRes = yield fetch(apiUrl, {
            headers: {
              "User-Agent": HEADERS["User-Agent"],
              Referer: embedUrl,
              Origin: urlObj.origin
            }
          });
          if (apiRes.ok) {
            const json = yield apiRes.json();
            if (json && json.playback) {
              const rawM3u8 = yield decryptFilemoonApi(json.playback);
              if (rawM3u8)
                return rawM3u8;
            }
          }
        } catch (e) {
        }
      }
      let hashId = embedUrl.includes("#") ? embedUrl.split("#")[1] : code;
      if (hashId) {
        try {
          const apiUrl = `${urlObj.origin}/api/v1/video?id=${hashId}`;
          const apiRes = yield fetch(apiUrl, {
            headers: { "User-Agent": HEADERS["User-Agent"], Referer: embedUrl }
          });
          if (apiRes.ok) {
            const hexData = yield apiRes.text();
            const rawM3u8 = yield decryptEmbed4MeApi(hexData);
            if (rawM3u8)
              return rawM3u8;
          }
        } catch (e) {
        }
      }
    } catch (e) {
      console.error(`[XFilme] Resolution error: ${e.message}`);
    }
    return null;
  });
}
function isPlayableStream(url) {
  if (!url)
    return false;
  if (url.includes(".m3u8") || url.includes(".mp4") || url.includes("/stream?")) {
    return true;
  }
  return false;
}
function searchXFilme(query, year) {
  return __async(this, null, function* () {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
    const html = yield fetchText(searchUrl);
    const $ = import_cheerio_without_node_native.default.load(html);
    let pageUrl = null;
    $("article, .result-item, .item, .post").each((_, el) => {
      const titleText = $(el).find(".title, .entry-title, h3, h2").text().trim();
      const link = $(el).find("a").attr("href");
      if (!link)
        return;
      if (normalize(titleText).includes(normalize(query))) {
        pageUrl = link;
        return false;
      }
    });
    return pageUrl;
  });
}
function getEpisodeUrl(tvShowUrl, season, episode) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(tvShowUrl);
      const $ = import_cheerio_without_node_native.default.load(html);
      let epUrl = null;
      $(`.episodios li, .season-list li, a[href*="-${season}x${episode}"]`).each(
        (_, el) => {
          const link = $(el).is("a") ? $(el).attr("href") : $(el).find("a").attr("href");
          if (link && (link.includes(`-${season}x${episode}`) || link.includes(`season-${season}-episode-${episode}`))) {
            epUrl = link;
            return false;
          }
        }
      );
      return epUrl || tvShowUrl;
    } catch (e) {
      return tvShowUrl;
    }
  });
}
function fetchPlayerEmbed(postId, nume, type, referer) {
  return __async(this, null, function* () {
    const ajaxUrl = `${BASE_URL}/wp-admin/admin-ajax.php`;
    const body = new URLSearchParams({
      action: "doo_player_ajax",
      post: postId,
      nume,
      type
    });
    try {
      const res = yield fetch(ajaxUrl, {
        method: "POST",
        headers: __spreadProps(__spreadValues({}, HEADERS), {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "X-Requested-With": "XMLHttpRequest",
          Referer: referer
        }),
        body: body.toString()
      });
      const text = yield res.text();
      if (res.ok && text && text !== "0" && text !== "-1") {
        if (text.startsWith("{")) {
          const json = JSON.parse(text);
          return json.embed_url || json.url || json.code || null;
        } else {
          const $ = import_cheerio_without_node_native.default.load(text);
          return $("iframe").attr("src") || null;
        }
      }
    } catch (e) {
      console.error(
        `[XFilme] Failed to fetch player embed ${nume}: ${e.message}`
      );
    }
    return null;
  });
}
function extractStreams(mediaInfo, mediaType, season, episode) {
  return __async(this, null, function* () {
    if (!mediaInfo)
      return [];
    let targetUrl = yield searchXFilme(mediaInfo.originalTitle, mediaInfo.year);
    if (!targetUrl)
      targetUrl = yield searchXFilme(mediaInfo.title, mediaInfo.year);
    if (!targetUrl)
      return [];
    if (mediaType === "tv") {
      targetUrl = yield getEpisodeUrl(targetUrl, season, episode);
    }
    const pageHtml = yield fetchText(targetUrl);
    const $ = import_cheerio_without_node_native.default.load(pageHtml);
    const streams = [];
    const playerOptions = [];
    $('li.dooplay_player_option, .option-player, [id^="player-option"]').each(
      (_, el) => {
        const post = $(el).attr("data-post");
        const nume = $(el).attr("data-nume");
        const type = $(el).attr("data-type") || (mediaType === "tv" ? "tv" : "movie");
        const title = $(el).find(".title").text().trim() || $(el).text().trim();
        if (nume && nume !== "trailer" && post && !title.toLowerCase().includes("netu") && !title.toLowerCase().includes("waaw")) {
          playerOptions.push({ post, nume, type, title });
        }
      }
    );
    for (const opt of playerOptions) {
      const embedUrl = yield fetchPlayerEmbed(
        opt.post,
        opt.nume,
        opt.type,
        targetUrl
      );
      if (embedUrl) {
        const cleanEmbedUrl = embedUrl.startsWith("//") ? `https:${embedUrl}` : embedUrl;
        const rawMediaUrl = yield resolveEmbedToRawM3u8(cleanEmbedUrl);
        if (rawMediaUrl && isPlayableStream(rawMediaUrl)) {
          const embedOrigin = new URL(cleanEmbedUrl).origin;
          let hostName = opt.title || `Server ${opt.nume}`;
          if (cleanEmbedUrl.includes("filemoon") || cleanEmbedUrl.includes("byselapuix"))
            hostName = "FileMoon";
          else if (cleanEmbedUrl.includes("strp2p") || cleanEmbedUrl.includes("ethernix") || cleanEmbedUrl.includes("fortimax"))
            hostName = "XStream";
          else if (cleanEmbedUrl.includes("streamflash"))
            hostName = "StreamFlash";
          streams.push({
            name: `XFilme - ${hostName}`,
            title: `Server ${hostName}`,
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
    }
    return streams;
  });
}

// src/xfilme/index.js
var TMDB_API_KEY = "31031042b5deb218a10d70a4c01ea934";
function getMediaDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const id = typeof tmdbId === "object" ? tmdbId.tmdbId || tmdbId.id : tmdbId;
    try {
      const url = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${id}?api_key=${TMDB_API_KEY}`;
      const data = yield fetchJson(url);
      return {
        title: data.title || data.name,
        originalTitle: data.original_title || data.original_name,
        year: (data.release_date || data.first_air_date || "").split("-")[0]
      };
    } catch (e) {
      console.error(`[XFilme] TMDB lookup error: ${e.message}`);
      if (typeof tmdbId === "object")
        return tmdbId;
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    try {
      let mediaInfo = null;
      if (typeof tmdbId === "object" && tmdbId !== null && tmdbId.title) {
        mediaInfo = tmdbId;
      } else {
        mediaInfo = yield getMediaDetails(tmdbId, mediaType);
      }
      if (!mediaInfo)
        return [];
      return yield extractStreams(mediaInfo, mediaType, season, episode);
    } catch (error) {
      console.error(`[XFilme] Error in getStreams: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
