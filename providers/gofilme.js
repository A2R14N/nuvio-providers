/**
 * gofilme - Built from src/gofilme/
 * Generated: 2026-08-07T21:48:51.991Z
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

// src/gofilme/index.js
var gofilme_exports = {};
__export(gofilme_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(gofilme_exports);

// src/gofilme/tmdb.js
var TMDB_API_KEY = "31031042b5deb218a10d70a4c01ea934";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
function getMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    try {
      const response = yield fetch(url);
      if (!response.ok)
        throw new Error(`TMDB HTTP ${response.status}`);
      const data = yield response.json();
      const title = data.title || data.name || data.original_title || data.original_name;
      const releaseDate = data.release_date || data.first_air_date || "";
      const year = releaseDate ? releaseDate.split("-")[0] : "";
      return { title, year };
    } catch (err) {
      console.error(`[GoFilme] Metadata error: ${err.message}`);
      return null;
    }
  });
}
function slugify(text) {
  return text.toString().toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
}

// src/gofilme/extractor.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// src/gofilme/http.js
var BASE_URL = "https://gofilme.sx";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
  Referer: `${BASE_URL}/`,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5"
};
function fetchText(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}) {
    console.log(`[GoFilme] Fetching: ${url}`);
    const response = yield fetch(url, {
      headers: __spreadValues(__spreadValues({}, HEADERS), customHeaders)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return yield response.text();
  });
}

// src/gofilme/extractor.js
function getHostName(url) {
  const lUrl = url.toLowerCase();
  if (lUrl.includes("vidmoly"))
    return "Vidmoly";
  if (lUrl.includes("voe") || lUrl.includes("matthewhotelscience"))
    return "VOE";
  return "Server";
}
function getLanguageLabel(embedUrl) {
  let decoded = String(embedUrl || "").toLowerCase();
  try {
    decoded = decodeURIComponent(decoded);
  } catch (_) {
  }
  const languages = [];
  if (/(?:[.;/_-]ro(?:[.;/_?&=-]|$)|rom[aâ]n[aă]?|romanian)/i.test(decoded)) {
    languages.push("RO");
  }
  if (/(?:[.;/_-]en(?:[.;/_?&=-]|$)|english|englez[aă]?)/i.test(decoded)) {
    languages.push("EN");
  }
  return languages.length > 0 ? `[${languages.join("+")}]` : "";
}
function decodeBase64(value) {
  try {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const input = String(value).replace(/\s+/g, "").replace(/=+$/, "");
    let output = "";
    let buffer = 0;
    let bits = 0;
    for (let i = 0; i < input.length; i++) {
      const index = alphabet.indexOf(input[i]);
      if (index === -1)
        return null;
      buffer = buffer << 6 | index;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        output += String.fromCharCode(buffer >> bits & 255);
      }
    }
    return output;
  } catch (_) {
    return null;
  }
}
function decodeVoeConfig(payload) {
  try {
    const rot13 = payload.replace(/[a-zA-Z]/g, (char) => {
      const start = char <= "Z" ? 65 : 97;
      return String.fromCharCode(
        (char.charCodeAt(0) - start + 13) % 26 + start
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
      (char) => String.fromCharCode(char.charCodeAt(0) - 3)
    ).join("");
    const json = decodeBase64(shifted.split("").reverse().join(""));
    return json ? JSON.parse(json) : null;
  } catch (_) {
    return null;
  }
}
function resolveVidmolyDirect(embedUrl) {
  return __async(this, null, function* () {
    try {
      console.log(`[GoFilme] Unpacking Vidmoly direct HLS stream...`);
      const html = yield fetchText(embedUrl, {
        Referer: "https://filmeplayer.xyz/"
      });
      const match = html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(
        /sources\s*:\s*\[\s*\{\s*file\s*:\s*["'](https?:\/\/[^"']+)["']/i
      );
      if (match) {
        console.log(`[GoFilme] \u2705 Direct Vidmoly .m3u8 found: ${match[1]}`);
        return {
          url: match[1],
          headers: {
            "User-Agent": HEADERS["User-Agent"],
            Referer: "https://vidmoly.me/"
          }
        };
      }
    } catch (e) {
      console.error(`[GoFilme] Vidmoly resolution error: ${e.message}`);
    }
    return null;
  });
}
function resolveVoeDirect(embedUrl) {
  return __async(this, null, function* () {
    try {
      console.log(`[GoFilme] Unpacking VOE direct stream...`);
      let currentUrl = embedUrl;
      let html = yield fetchText(currentUrl, { Referer: BASE_URL });
      const redirectMatch = html.match(
        /window\.location\.href\s*=\s*['"]([^"']+)['"]/i
      );
      if (redirectMatch) {
        currentUrl = redirectMatch[1];
        console.log(`[GoFilme] Following VOE mirror redirect...`);
        html = yield fetchText(currentUrl, { Referer: embedUrl });
      }
      const voeJsonMatch = html.match(
        /<script\s+type=["']application\/json["']>\s*(\[[^\]]+\])\s*<\/script>/i
      );
      if (voeJsonMatch) {
        try {
          const arr = JSON.parse(voeJsonMatch[1]);
          if (arr && arr[0]) {
            const config = decodeVoeConfig(arr[0]);
            const source = config && (config.source || config.direct_access_url || config.fallback);
            if (source && /^https?:\/\//i.test(source)) {
              console.log(`[GoFilme] \u2705 Direct VOE stream found: ${source}`);
              const originMatch = currentUrl.match(/^(https?:\/\/[^/]+)/i);
              const origin = originMatch ? originMatch[1] : "https://voe.sx";
              return {
                url: source,
                headers: {
                  "User-Agent": HEADERS["User-Agent"],
                  Referer: `${origin}/`,
                  Origin: origin
                }
              };
            }
          }
        } catch (e) {
          console.error(`[GoFilme] VOE JSON error: ${e.message}`);
        }
      }
      let match = html.match(
        /['"]?hls['"]?\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
      ) || html.match(/file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i) || html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
      if (match) {
        console.log(`[GoFilme] \u2705 Direct VOE stream found: ${match[1]}`);
        return {
          url: match[1],
          headers: {
            "User-Agent": HEADERS["User-Agent"],
            Referer: currentUrl
          }
        };
      }
    } catch (e) {
      console.error(`[GoFilme] VOE resolution error: ${e.message}`);
    }
    return null;
  });
}
function extractDirectStream(embedUrl) {
  return __async(this, null, function* () {
    const lUrl = embedUrl.toLowerCase();
    if (lUrl.includes("vidmoly")) {
      const res = yield resolveVidmolyDirect(embedUrl);
      if (res)
        return res;
    }
    if (lUrl.includes("voe")) {
      const res = yield resolveVoeDirect(embedUrl);
      if (res)
        return res;
    }
    return null;
  });
}
function parseEmbedUrl(raw) {
  if (!raw)
    return null;
  let text = String(raw).trim();
  if (!text.startsWith("http") && !text.startsWith("//") && !text.startsWith("<")) {
    try {
      const decoded = decodeBase64(text);
      if (decoded && (decoded.includes("http") || decoded.includes("//") || decoded.includes("<iframe"))) {
        text = decoded;
      }
    } catch (e) {
    }
  }
  if (text.includes("<iframe")) {
    const $f = import_cheerio_without_node_native.default.load(text);
    text = $f("iframe").attr("src") || $f("iframe").attr("data-src") || $f("iframe").attr("data-url") || "";
  }
  if (text.startsWith("//")) {
    text = `https:${text}`;
  }
  return text.startsWith("http://") || text.startsWith("https://") ? text : null;
}
function resolveEmbedUrl(embedUrl, parentUrl) {
  return __async(this, null, function* () {
    if (embedUrl.includes("filmeplayer.xyz")) {
      try {
        console.log(`[GoFilme] Resolving filmeplayer page: ${embedUrl}`);
        const html = yield fetchText(embedUrl, { Referer: parentUrl });
        const nested = [];
        const urlMatches = html.matchAll(/(?:url|src)\s*:\s*["']([^"']+)["']/gi);
        for (const match of urlMatches) {
          let cleanUrl = match[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
          if (cleanUrl.startsWith("//"))
            cleanUrl = `https:${cleanUrl}`;
          if ((cleanUrl.includes("vidmoly") || cleanUrl.includes("voe")) && !nested.includes(cleanUrl)) {
            nested.push(cleanUrl);
          }
        }
        if (nested.length === 0) {
          const $ = import_cheerio_without_node_native.default.load(html);
          $("iframe").each((_, el) => {
            const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-url");
            if (src && (src.includes("vidmoly") || src.includes("voe"))) {
              const cleanSrc = src.startsWith("//") ? `https:${src}` : src;
              if (!nested.includes(cleanSrc))
                nested.push(cleanSrc);
            }
          });
        }
        if (nested.length > 0) {
          return nested;
        }
      } catch (e) {
        console.error(`[GoFilme] Filmeplayer error: ${e.message}`);
      }
    }
    return embedUrl.includes("vidmoly") || embedUrl.includes("voe") ? [embedUrl] : [];
  });
}
function fetchZetaEmbeds($, pageUrl) {
  return __async(this, null, function* () {
    const embeds = [];
    const options = $(
      ".zetaflix_player_option, .dooplay_player_option, [data-post], #playeroptionsul li"
    );
    if (options.length > 0) {
      for (let i = 0; i < options.length; i++) {
        const el = options.eq(i);
        const postId = el.attr("data-post");
        const nume = el.attr("data-nume") || el.attr("data-nump") || i + 1;
        const type = el.attr("data-type") || "mv";
        if (postId) {
          const apiEndpoint = `${BASE_URL}/wp-json/zetaplayer/v2/${postId}/${type}/${nume}`;
          try {
            console.log(
              `[GoFilme] Fetching ZetaPlayer option ${nume}: ${apiEndpoint}`
            );
            const response = yield fetch(apiEndpoint, {
              headers: __spreadProps(__spreadValues({}, HEADERS), {
                Referer: pageUrl,
                Accept: "application/json"
              })
            });
            if (response.ok) {
              const json = yield response.json();
              const target = json.embed_url || json.embed || json.url || json.iframe || json.html || (typeof json === "string" ? json : null);
              const extractedUrl = parseEmbedUrl(target);
              if (extractedUrl) {
                const resolvedUrls = yield resolveEmbedUrl(extractedUrl, pageUrl);
                resolvedUrls.forEach((url) => embeds.push(url));
              }
            }
          } catch (e) {
            console.error(`[GoFilme] ZetaPlayer error: ${e.message}`);
          }
        }
      }
    }
    return embeds;
  });
}
function extractMovieStreams(title, year) {
  return __async(this, null, function* () {
    const streams = [];
    const slug = slugify(title);
    const candidateUrls = [
      `${BASE_URL}/filme/${slug}-${year}/`,
      `${BASE_URL}/filme/${slug}/`,
      `${BASE_URL}/movie/${slug}-${year}/`,
      `${BASE_URL}/movie/${slug}/`
    ];
    let pageHtml = null;
    let finalPageUrl = null;
    for (const targetUrl of candidateUrls) {
      try {
        pageHtml = yield fetchText(targetUrl);
        finalPageUrl = targetUrl;
        break;
      } catch (e) {
      }
    }
    if (!pageHtml) {
      try {
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
        const searchHtml = yield fetchText(searchUrl);
        const $search = import_cheerio_without_node_native.default.load(searchHtml);
        const matchedLink = $search(
          "article.item a, div.result-item a, .result-item .title a"
        ).first().attr("href");
        if (matchedLink) {
          finalPageUrl = matchedLink;
          pageHtml = yield fetchText(matchedLink);
        }
      } catch (e) {
        console.error(`[GoFilme] Search failed: ${e.message}`);
      }
    }
    if (!pageHtml) {
      console.log(`[GoFilme] Media page not found for "${title}"`);
      return [];
    }
    const $ = import_cheerio_without_node_native.default.load(pageHtml);
    const embedUrls = /* @__PURE__ */ new Set();
    $("iframe").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src") || $(el).attr("data-url");
      if (src && (src.includes("vidmoly") || src.includes("voe"))) {
        embedUrls.add(src.startsWith("//") ? `https:${src}` : src);
      }
    });
    const zetaEmbeds = yield fetchZetaEmbeds($, finalPageUrl);
    zetaEmbeds.forEach((url) => {
      if (url.includes("vidmoly") || url.includes("voe")) {
        embedUrls.add(url);
      }
    });
    let index = 1;
    for (const embedUrl of embedUrls) {
      const hostName = getHostName(embedUrl);
      const serverName = `${hostName}${getLanguageLabel(embedUrl)}`;
      const directMedia = yield extractDirectStream(embedUrl);
      if (directMedia && directMedia.url) {
        const streamObj = {
          name: `GoFilme - ${serverName}`,
          title: `${serverName} - 1080p - Server ${index++}`,
          url: directMedia.url,
          quality: "1080p",
          language: "ro",
          headers: directMedia.headers
        };
        streams.push(streamObj);
      }
    }
    return streams;
  });
}

// src/gofilme/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log(`[GoFilme] Request for TMDB ID: ${tmdbId}, Type: ${mediaType}`);
      const metadata = yield getMetadata(tmdbId, mediaType);
      if (!metadata || !metadata.title) {
        console.error(
          `[GoFilme] Could not fetch TMDB metadata for ID: ${tmdbId}`
        );
        return [];
      }
      console.log(
        `[GoFilme] Resolved Title: "${metadata.title}", Year: "${metadata.year}"`
      );
      if (mediaType === "movie") {
        return yield extractMovieStreams(metadata.title, metadata.year);
      } else {
        console.log(`[GoFilme] TV Shows not currently supported.`);
        return [];
      }
    } catch (error) {
      console.error(`[GoFilme] Fatal Error: ${error.message}`);
      return [];
    }
  });
}
