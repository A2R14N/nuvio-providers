/**
 * luminsangels - Built from src/luminsangels/
 * Generated: 2026-08-07T21:48:51.997Z
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

// src/luminsangels/http.js
var BASE_URL = "https://luminsangelsseriale.com";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
function fetchText(_0) {
  return __async(this, arguments, function* (url, referer = BASE_URL + "/") {
    const response = yield fetch(url, {
      redirect: "follow",
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

// src/luminsangels/tmdb.js
var TMDB_API_KEY = "31031042b5deb218a10d70a4c01ea934";
function getSeriesInfo(tmdbId) {
  return __async(this, null, function* () {
    var _a, _b;
    try {
      const url = `https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbId)}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
      const data = JSON.parse(yield fetchText(url, "https://www.themoviedb.org/"));
      const romanian = (((_a = data.translations) == null ? void 0 : _a.translations) || []).find(
        (translation) => translation.iso_639_1 === "ro"
      );
      return {
        title: data.name,
        originalTitle: data.original_name,
        romanianTitle: ((_b = romanian == null ? void 0 : romanian.data) == null ? void 0 : _b.name) || null
      };
    } catch (error) {
      console.error(`[LuminsAngels] TMDB lookup failed: ${error.message}`);
      return null;
    }
  });
}

// src/luminsangels/extractor.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function titleMatches(value, titles) {
  const candidate = normalize(value);
  return titles.some((title) => {
    const target = normalize(title);
    return target && candidate.includes(target);
  });
}
function episodeMatches(value, season, episode) {
  const candidate = normalize(value);
  const patterns = [
    new RegExp(
      `(?:sezon|sezonul|season)\\s*0*${season}\\s+(?:episod|episodul|episode)\\s*0*${episode}(?:\\D|$)`,
      "i"
    ),
    new RegExp(`\\bs\\s*0*${season}\\s*e\\s*0*${episode}\\b`, "i")
  ];
  return patterns.some((pattern) => pattern.test(candidate));
}
function collectLinks(html) {
  const $ = import_cheerio_without_node_native.default.load(html);
  const links = [];
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href || !href.startsWith(BASE_URL + "/"))
      return;
    const context = [
      $(element).text(),
      $(element).attr("title"),
      $(element).attr("aria-label"),
      $(element).closest("article, .pt-cv-content-item").text(),
      href
    ].filter(Boolean).join(" ");
    links.push({ href, context });
  });
  return links;
}
function findEpisodePage(mediaInfo, season, episode) {
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
    const seriesPages = [];
    for (const title of titles) {
      try {
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
        const links = collectLinks(yield fetchText(searchUrl));
        const exact = links.find(
          (link) => titleMatches(link.context, titles) && episodeMatches(link.context, season, episode)
        );
        if (exact)
          return exact.href;
        for (const link of links) {
          if (titleMatches(link.context, titles) && !/episod|episode|sezon|season/i.test(link.href) && !seriesPages.includes(link.href)) {
            seriesPages.push(link.href);
          }
        }
      } catch (error) {
        console.warn(
          `[LuminsAngels] Search failed for "${title}": ${error.message}`
        );
      }
    }
    for (const seriesPage of seriesPages.slice(0, 5)) {
      try {
        const exact = collectLinks(yield fetchText(seriesPage)).find(
          (link) => titleMatches(link.context, titles) && episodeMatches(link.context, season, episode)
        );
        if (exact)
          return exact.href;
      } catch (_) {
      }
    }
    return null;
  });
}
function extractEmbeds(html) {
  const $ = import_cheerio_without_node_native.default.load(html);
  const embeds = /* @__PURE__ */ new Set();
  $("iframe").each((_, element) => {
    let source = $(element).attr("src") || $(element).attr("data-src") || $(element).attr("data-lazy-src");
    if (!source)
      return;
    if (source.startsWith("//"))
      source = "https:" + source;
    if (/^https?:\/\//i.test(source))
      embeds.add(source);
  });
  return Array.from(embeds);
}
function resolveVidmoly(embedUrl, pageUrl) {
  return __async(this, null, function* () {
    const html = yield fetchText(embedUrl, pageUrl);
    const match = html.match(
      /sources\s*:\s*\[\s*\{\s*file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i
    ) || html.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i);
    return match ? match[1].replace(/\\\//g, "/").replace(/&amp;/g, "&") : null;
  });
}
function extractStreams(pageUrl, season, episode) {
  return __async(this, null, function* () {
    const embeds = extractEmbeds(yield fetchText(pageUrl));
    const streams = [];
    const seen = /* @__PURE__ */ new Set();
    for (const embedUrl of embeds) {
      try {
        let mediaUrl = null;
        let host = null;
        if (/vidmoly/i.test(embedUrl)) {
          mediaUrl = yield resolveVidmoly(embedUrl, pageUrl);
          host = "Vidmoly";
        }
        if (!mediaUrl || seen.has(mediaUrl))
          continue;
        seen.add(mediaUrl);
        const origin = new URL(embedUrl).origin;
        streams.push({
          name: "Lumins Angels",
          title: `${host}[RO] - S${season}E${episode}`,
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
          `[LuminsAngels] Failed to resolve ${embedUrl}: ${error.message}`
        );
      }
    }
    return streams;
  });
}

// src/luminsangels/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    if (mediaType !== "tv" && mediaType !== "series" || !season || !episode) {
      return [];
    }
    try {
      const mediaInfo = yield getSeriesInfo(tmdbId);
      if (!mediaInfo)
        return [];
      const pageUrl = yield findEpisodePage(mediaInfo, season, episode);
      if (!pageUrl) {
        console.log(
          `[LuminsAngels] No episode found for ${mediaInfo.title} S${season}E${episode}`
        );
        return [];
      }
      console.log(`[LuminsAngels] Matched episode: ${pageUrl}`);
      return yield extractStreams(pageUrl, season, episode);
    } catch (error) {
      console.error(`[LuminsAngels] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
