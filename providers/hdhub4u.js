/**
 * hdhub4u - Built from src/hdhub4u/
 * Generated: 2026-08-07T21:48:51.994Z
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

// src/hdhub4u/index.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
var BASE_URL = "https://new3.hdhub4u.cl";
var SEARCH_URL = "https://search.pingora.fyi/collections/post/documents/search";
var TMDB_URL = "https://api.themoviedb.org/3";
var TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36";
var HEADERS = {
  "User-Agent": USER_AGENT,
  Cookie: "xla=s4t",
  Referer: `${BASE_URL}/`
};
var BLOCKED_HOSTS = {
  "fancy-mountain-7dfb.terapiyo232.workers.dev": true,
  "super-feather-7987.pinajo4039500.workers.dev": true
};
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const response = yield fetch(url, options);
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url}`);
    return response.text();
  });
}
function decodeBase64(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const input = String(value || "").replace(/=+$/, "");
  let output = "";
  let count = 0;
  let bits;
  let buffer;
  let index = 0;
  while (buffer = input.charAt(index++)) {
    buffer = alphabet.indexOf(buffer);
    if (buffer < 0)
      continue;
    bits = count % 4 ? bits * 64 + buffer : buffer;
    if (count++ % 4) {
      output += String.fromCharCode(bits >> (-2 * count & 6) & 255);
    }
  }
  return output;
}
function rot13(value) {
  return String(value || "").replace(/[a-zA-Z]/g, (character) => {
    const code = character.charCodeAt(0) + 13;
    const limit = character <= "Z" ? 90 : 122;
    return String.fromCharCode(code <= limit ? code : code - 26);
  });
}
function absoluteUrl(value, base = BASE_URL) {
  if (!value)
    return "";
  if (/^https?:\/\//i.test(value))
    return value;
  try {
    return new URL(value, base).toString();
  } catch (e) {
    return "";
  }
}
function normalizeTitle(value) {
  return String(value || "").toLowerCase().replace(/\b(the|a|an)\b/g, " ").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function titleScore(expected, candidate, expectedYear, candidateYear) {
  const expectedWords = normalizeTitle(expected).split(" ").filter(Boolean);
  const candidateWords = normalizeTitle(candidate).split(" ").filter(Boolean);
  if (!expectedWords.length || !candidateWords.length)
    return 0;
  const candidateSet = new Set(candidateWords);
  const matched = expectedWords.filter((word) => candidateSet.has(word)).length;
  let score = matched / expectedWords.length;
  if (expectedWords.every((word) => candidateSet.has(word)))
    score += 0.25;
  if (expectedYear && candidateYear === expectedYear)
    score += 0.25;
  else if (expectedYear && candidateYear && Math.abs(candidateYear - expectedYear) > 1) {
    score -= 0.5;
  }
  return score;
}
function qualityFromText(value) {
  if (/\b(?:2160p|4k)\b/i.test(value))
    return "4K";
  const match = String(value || "").match(/\b(1080|720|480)p\b/i);
  return match ? `${match[1]}p` : "Unknown";
}
function sizeFromText(value) {
  const match = String(value || "").match(/([\d.]+)\s*(GB|MB|KB)/i);
  return match ? `${match[1]} ${match[2].toUpperCase()}` : "Unknown";
}
function isDirectVideo(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (BLOCKED_HOSTS[host])
      return false;
    return host.endsWith(".workers.dev") || host.endsWith(".r2.cloudflarestorage.com");
  } catch (e) {
    return false;
  }
}
function getMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const response = yield fetch(
      `${TMDB_URL}/${endpoint}/${encodeURIComponent(tmdbId)}?api_key=${TMDB_KEY}`,
      { headers: { Accept: "application/json", "User-Agent": USER_AGENT } }
    );
    if (!response.ok)
      throw new Error(`TMDB HTTP ${response.status}`);
    const data = yield response.json();
    const date = endpoint === "tv" ? data.first_air_date : data.release_date;
    return {
      title: endpoint === "tv" ? data.name : data.title,
      year: date ? Number(date.slice(0, 4)) : null
    };
  });
}
function searchSite(query) {
  return __async(this, null, function* () {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&query_by=post_title,category&query_by_weights=4,2&sort_by=sort_by_date:desc&limit=15&highlight_fields=none&use_cache=true&page=1&analytics_tag=${today}`;
    const response = yield fetch(url, { headers: HEADERS });
    if (!response.ok)
      throw new Error(`Search HTTP ${response.status}`);
    const data = yield response.json();
    return (data.hits || []).map(({ document }) => {
      const title = document.post_title || "";
      const yearMatch = title.match(/\b(19|20)\d{2}\b/);
      return {
        title,
        year: yearMatch ? Number(yearMatch[0]) : null,
        url: absoluteUrl(document.permalink)
      };
    });
  });
}
function selectResult(metadata, results, mediaType, season) {
  let best = null;
  for (const result of results) {
    let score = titleScore(
      metadata.title,
      result.title,
      metadata.year,
      result.year
    );
    if (mediaType === "tv" && season) {
      const seasonMatch = result.title.match(/(?:season\s*|s)(\d+)/i);
      if (seasonMatch && Number(seasonMatch[1]) === Number(season))
        score += 0.5;
      else if (seasonMatch)
        score -= 0.75;
    }
    if (!best || score > best.score)
      best = __spreadProps(__spreadValues({}, result), { score });
  }
  return best && best.score >= 0.6 ? best : null;
}
function decodeRedirect(url) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(url, { headers: HEADERS });
      const pattern = /s\s*\(\s*['"]o['"]\s*,\s*['"]([A-Za-z0-9+/=]+)['"]|ck\s*\(\s*['"]_wp_http_\d+['"]\s*,\s*['"]([^'"]+)['"]/g;
      let combined = "";
      let match;
      while (match = pattern.exec(html))
        combined += match[1] || match[2] || "";
      if (!combined) {
        const plain = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
        return plain ? absoluteUrl(plain[1], url) : "";
      }
      const decoded = decodeBase64(rot13(decodeBase64(decodeBase64(combined))));
      const payload = JSON.parse(decoded);
      const direct = decodeBase64(payload.o || "").trim();
      if (direct)
        return direct;
      const data = decodeBase64(payload.data || "").trim();
      const blogUrl = String(payload.blog_url || "").trim();
      if (!blogUrl || !data)
        return "";
      const result = yield fetchText(`${blogUrl}?re=${data}`, { headers: HEADERS });
      return import_cheerio_without_node_native.default.load(result)("body").text().trim();
    } catch (e) {
      return "";
    }
  });
}
function extractHubCloud(url, referer) {
  return __async(this, null, function* () {
    var _a;
    try {
      let pageUrl = url.replace("hubcloud.ink", "hubcloud.dad");
      let html = yield fetchText(pageUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer })
      });
      if (!pageUrl.includes("hubcloud.php")) {
        const $first = import_cheerio_without_node_native.default.load(html);
        const next = $first("#download").attr("href") || ((_a = html.match(/var url\s*=\s*['"]([^'"]+)/)) == null ? void 0 : _a[1]);
        if (next) {
          pageUrl = absoluteUrl(next, pageUrl);
          html = yield fetchText(pageUrl, {
            headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: url })
          });
        }
      }
      const $ = import_cheerio_without_node_native.default.load(html);
      const header = $("div.card-header").text().replace(/\s+/g, " ").trim();
      const size = $("i#size").text().trim();
      const quality = qualityFromText(header);
      const streams = [];
      $("a.btn[href]").each((_, element) => {
        const link = $(element).attr("href");
        if (!link || !isDirectVideo(link))
          return;
        streams.push({
          url: link,
          quality,
          size: sizeFromText(size),
          title: header || quality
        });
      });
      return streams;
    } catch (e) {
      return [];
    }
  });
}
function resolveLink(url, referer, depth = 0) {
  return __async(this, null, function* () {
    if (!url || depth > 4)
      return [];
    const absolute = absoluteUrl(url, referer);
    if (!absolute)
      return [];
    if (isDirectVideo(absolute)) {
      return [{ url: absolute, quality: "Unknown", size: "Unknown", title: "" }];
    }
    let host;
    try {
      host = new URL(absolute).hostname.toLowerCase();
    } catch (e) {
      return [];
    }
    if (host.includes("hubcloud"))
      return extractHubCloud(absolute, referer);
    if (host.includes("hubdrive")) {
      try {
        const html = yield fetchText(absolute, {
          headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer })
        });
        const $ = import_cheerio_without_node_native.default.load(html);
        const next = $(
          "a.btn.btn-primary.btn-user.btn-success1[href], a.btn-success[href]"
        ).first().attr("href");
        return next ? resolveLink(next, absolute, depth + 1) : [];
      } catch (e) {
        return [];
      }
    }
    if (absolute.includes("?id=") || /techyboy4u|gadgetsweb|cryptoinsights|bloggingvector|ampproject/.test(host)) {
      const redirected = yield decodeRedirect(absolute);
      return redirected ? resolveLink(redirected, absolute, depth + 1) : [];
    }
    if (host.includes("hblinks") || host.includes("hubstream.dad")) {
      try {
        const html = yield fetchText(absolute, {
          headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: referer })
        });
        const $ = import_cheerio_without_node_native.default.load(html);
        const links = $("h3 a[href], h4 a[href], h5 a[href], .entry-content a[href]").map((_, element) => $(element).attr("href")).get();
        const results = yield Promise.all(
          links.map((link) => resolveLink(link, absolute, depth + 1))
        );
        return results.flat();
      } catch (e) {
        return [];
      }
    }
    return [];
  });
}
function extractPage(pageUrl, mediaType, requestedEpisode) {
  return __async(this, null, function* () {
    const html = yield fetchText(pageUrl, {
      headers: __spreadProps(__spreadValues({}, HEADERS), { Referer: `${BASE_URL}/` })
    });
    const $ = import_cheerio_without_node_native.default.load(html);
    const candidates = [];
    if (mediaType === "movie") {
      $("h3 a[href], h4 a[href], .page-body a[href]").each((_, element) => {
        const link = $(element);
        const href = link.attr("href");
        const context = `${link.text()} ${link.parent().text()}`;
        if (href && (/480|720|1080|2160|4k/i.test(context) || /hubcloud|hblinks|hubstream|hdstream4u/i.test(href))) {
          candidates.push({ url: href, episode: null });
        }
      });
    } else {
      $("h3, h4").each((_, element) => {
        const section = $(element);
        const episodeMatch = section.text().match(/(?:episode\s*|e)(\d+)/i);
        if (!episodeMatch)
          return;
        const episode = Number(episodeMatch[1]);
        section.find("a[href]").each((__, anchor) => {
          candidates.push({ url: $(anchor).attr("href"), episode });
        });
      });
    }
    const selected = candidates.filter(
      (item) => mediaType === "movie" || requestedEpisode == null || item.episode === Number(requestedEpisode)
    );
    const resolved = yield Promise.all(
      selected.map((item) => __async(this, null, function* () {
        const streams = yield resolveLink(item.url, pageUrl);
        return streams.map((stream) => __spreadProps(__spreadValues({}, stream), { episode: item.episode }));
      }))
    );
    return resolved.flat();
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    if (!tmdbId || mediaType !== "movie" && mediaType !== "tv")
      return [];
    try {
      console.log(`[HDHub4u] Looking up ${mediaType} ${tmdbId}`);
      const metadata = yield getMetadata(tmdbId, mediaType);
      const query = mediaType === "tv" && season ? `${metadata.title} Season ${season}` : metadata.title;
      const result = selectResult(
        metadata,
        yield searchSite(query),
        mediaType,
        season
      );
      if (!result)
        return [];
      const extracted = yield extractPage(result.url, mediaType, episode);
      const seen = {};
      const streams = extracted.filter((stream) => isDirectVideo(stream.url)).filter((stream) => {
        if (seen[stream.url])
          return false;
        seen[stream.url] = true;
        return true;
      }).map((stream) => ({
        name: "HDHub4u",
        title: stream.title || `${metadata.title} - ${stream.quality}`,
        url: stream.url,
        quality: stream.quality,
        language: "hi \u2022 en",
        size: stream.size,
        provider: "hdhub4u"
      }));
      const order = { "4K": 4, "1080p": 3, "720p": 2, "480p": 1, Unknown: 0 };
      console.log(`[HDHub4u] Returning ${streams.length} direct stream(s)`);
      return streams.sort((a, b) => order[b.quality] - order[a.quality]);
    } catch (error) {
      console.error(`[HDHub4u] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
