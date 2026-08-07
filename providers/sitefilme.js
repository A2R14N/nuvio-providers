/**
 * sitefilme - Built from src/sitefilme/
 * Generated: 2026-08-07T21:48:52.001Z
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

// src/sitefilme/index.js
var sitefilme_exports = {};
__export(sitefilme_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(sitefilme_exports);

// src/sitefilme/tmdb.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function fetchTmdbDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const isTv = mediaType === "tv" || mediaType === "series";
    const primaryEndpoint = isTv ? "tv" : "movie";
    const secondaryEndpoint = isTv ? "movie" : "tv";
    let url = `https://api.themoviedb.org/3/${primaryEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
    console.log(`[sitefilme] Requesting TMDB URL: ${url}`);
    try {
      let res = yield fetch(url, { headers: { "User-Agent": USER_AGENT } });
      console.log(`[sitefilme] TMDB Response status: ${res.status}`);
      if (!res.ok) {
        url = `https://api.themoviedb.org/3/${secondaryEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
        console.log(`[sitefilme] Retrying TMDB secondary endpoint: ${url}`);
        res = yield fetch(url, { headers: { "User-Agent": USER_AGENT } });
      }
      if (!res.ok) {
        console.warn(`[sitefilme] TMDB 404.`);
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
        `[sitefilme] TMDB Info: Title="${primaryTitle}", TitleRo="${titleRo || "N/A"}", Year=${year}`
      );
      return {
        title: primaryTitle,
        titleRo: titleRo || primaryTitle,
        year
      };
    } catch (e) {
      console.error("[sitefilme] TMDB Fetch Exception:", e.message);
      return null;
    }
  });
}

// src/sitefilme/extractors.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
var BASE_URL = "https://sitefilme.com";
var USER_AGENT2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function slugify(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}
function fetchHtml(url) {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(url, {
        headers: {
          "User-Agent": USER_AGENT2,
          Referer: BASE_URL + "/"
        }
      });
      if (!response.ok)
        return null;
      const text = yield response.text();
      if (text.includes("404 Not Found") || text.includes("nu a fost g\u0103sit\u0103") || text.includes("Page Not Found")) {
        return null;
      }
      return text;
    } catch (e) {
      console.error(`[sitefilme] Fetch error for ${url}:`, e.message);
      return null;
    }
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
    const videoFileMatches = html.match(/https?:\/\/[^\s"'<>\\]+\.(?:m3u8|mp4)[^\s"'<>\\]*/gi) || [];
    videoFileMatches.forEach((file) => {
      if (isPlayableEmbed(file))
        embedUrls.add(file);
    });
    $("iframe, video, source").each((_, el) => {
      let src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy-src");
      if (src) {
        if (src.startsWith("//"))
          src = "https:" + src;
        if (isPlayableEmbed(src))
          embedUrls.add(src);
      }
    });
    const playerOptions = [];
    $(
      "[data-post][data-type][data-nume], .dooplay_player_option, .server-item"
    ).each((_, el) => {
      playerOptions.push({
        post: $(el).attr("data-post") || $(el).attr("data-id"),
        type: $(el).attr("data-type") || "1",
        nume: $(el).attr("data-nume") || $(el).attr("data-option") || "1"
      });
    });
    if (playerOptions.length > 0) {
      for (const opt of playerOptions) {
        try {
          const formData = new URLSearchParams();
          formData.append("action", "doo_player_ajax");
          formData.append("post", opt.post);
          formData.append("nume", opt.nume);
          formData.append("type", opt.type);
          const ajaxRes = yield fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
            method: "POST",
            headers: {
              "User-Agent": USER_AGENT2,
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              Referer: BASE_URL + "/"
            },
            body: formData.toString()
          });
          if (ajaxRes.ok) {
            const ajaxData = yield ajaxRes.json();
            if (ajaxData && ajaxData.embed_url) {
              let embed = ajaxData.embed_url;
              const iframeMatch = embed.match(/src=["']([^"']+)["']/i);
              if (iframeMatch)
                embed = iframeMatch[1];
              if (embed.startsWith("//"))
                embed = "https:" + embed;
              if (isPlayableEmbed(embed)) {
                embedUrls.add(embed);
              }
            }
          }
        } catch (e) {
        }
      }
    }
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
      "vguard"
    ];
    const rawUrls = html.match(/https?:\/\/[^\s"'<>\\]+/gi) || [];
    rawUrls.forEach((url) => {
      const lower = url.toLowerCase();
      if (knownHosts.some((host) => lower.includes(host)) && isPlayableEmbed(url)) {
        const cleaned = url.replace(/['"\\>].*$/, "");
        embedUrls.add(cleaned);
      }
    });
    return Array.from(embedUrls);
  });
}
function buildStreamObject(embedUrl, showTitle, season, episode, mediaType, playbackUrl = embedUrl) {
  let serverName = "Server";
  const lower = embedUrl.toLowerCase();
  if (lower.includes(".m3u8") || lower.includes(".mp4"))
    serverName = "Direct Stream";
  else if (lower.includes("ok.ru"))
    serverName = "OK.ru";
  else if (lower.includes("filemoon") || lower.includes("byselapuix"))
    serverName = "FileMoon";
  else if (lower.includes("streamtape"))
    serverName = "Streamtape";
  else if (lower.includes("vk.com") || lower.includes("vkvideo"))
    serverName = "VK Video";
  else if (lower.includes("vidoza") || lower.includes("videzz"))
    serverName = "Vidoza";
  else if (lower.includes("dood"))
    serverName = "DoodStream";
  else if (lower.includes("mixdrop"))
    serverName = "Mixdrop";
  else if (lower.includes("supervideo"))
    serverName = "SuperVideo";
  else if (lower.includes("vidguard") || lower.includes("vid-guard") || lower.includes("vgembed") || lower.includes("vguard"))
    serverName = "VidGuard";
  return {
    name: `SiteFilme - ${serverName}`,
    title: `Server ${serverName}`,
    url: playbackUrl,
    quality: "1080p",
    language: "ro",
    headers: {
      "User-Agent": USER_AGENT2,
      Referer: BASE_URL + "/"
    }
  };
}

// src/sitefilme/index.js
var import_cheerio_without_node_native2 = __toESM(require("cheerio-without-node-native"));

// src/clicksud/http.js
var BASE_URL2 = "https://clicksud.com.in";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
  Referer: `${BASE_URL2}/`,
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

// src/sitefilme/index.js
var BASE_URL3 = "https://sitefilme.com";
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    console.log(
      `[sitefilme] getStreams started: ID=${tmdbId}, type=${mediaType}, S=${season}, E=${episode}`
    );
    try {
      const tmdbData = yield fetchTmdbDetails(tmdbId, mediaType);
      if (!tmdbData)
        return [];
      const titlesToTry = Array.from(
        new Set([tmdbData.titleRo, tmdbData.title].filter(Boolean))
      );
      console.log("[sitefilme] Searching titles:", titlesToTry);
      const isTv = mediaType === "tv" || mediaType === "series";
      let pageHtml = null;
      let matchedTitle = tmdbData.titleRo || tmdbData.title;
      for (const title of titlesToTry) {
        const slug = slugify(title);
        let urlsToTry = [];
        if (isTv && season && episode) {
          urlsToTry = [
            `${BASE_URL3}/episoade/${slug}-sezonul-${season}-episodul-${episode}/`,
            `${BASE_URL3}/episoade/${slug}-sezonul-${season}-episodul-${episode}-online-subtitrat/`,
            `${BASE_URL3}/${slug}-sezonul-${season}-episodul-${episode}/`
          ];
        } else {
          if (tmdbData.year) {
            urlsToTry.push(`${BASE_URL3}/filme/${slug}-${tmdbData.year}/`);
            urlsToTry.push(`${BASE_URL3}/${slug}-${tmdbData.year}/`);
          }
          urlsToTry.push(`${BASE_URL3}/filme/${slug}/`);
          urlsToTry.push(`${BASE_URL3}/${slug}/`);
        }
        for (const targetUrl of urlsToTry) {
          console.log(`[sitefilme] Testing direct URL: ${targetUrl}`);
          const html = yield fetchHtml(targetUrl);
          if (html) {
            console.log(`[sitefilme] Found valid page at ${targetUrl}`);
            pageHtml = html;
            matchedTitle = title;
            break;
          }
        }
        if (pageHtml)
          break;
      }
      if (!pageHtml) {
        for (const title of titlesToTry) {
          const cleanQuery = title.replace(/[:\-]/g, " ").trim();
          const searchUrl = `${BASE_URL3}/?s=${encodeURIComponent(cleanQuery)}`;
          console.log(`[sitefilme] Searching site: ${searchUrl}`);
          const searchHtml = yield fetchHtml(searchUrl);
          if (searchHtml) {
            const $ = import_cheerio_without_node_native2.default.load(searchHtml);
            const targetSlug = slugify(title);
            $("a[href]").each((_, el) => {
              const href = $(el).attr("href");
              if (!href || href.includes("wp-") || href === BASE_URL3 + "/" || pageHtml)
                return;
              if (isTv && season && episode) {
                const epRegex = new RegExp(
                  `sezonul-${season}-episodul-${episode}(?:-|\\/|$)`,
                  "i"
                );
                if (epRegex.test(href)) {
                  console.log(`[sitefilme] Found TV search result link: ${href}`);
                  pageHtml = href;
                }
              } else {
                if (href.includes(targetSlug) || href.includes("/filme/")) {
                  console.log(
                    `[sitefilme] Found Movie search result link: ${href}`
                  );
                  pageHtml = href;
                }
              }
            });
            if (typeof pageHtml === "string") {
              pageHtml = yield fetchHtml(pageHtml);
              if (pageHtml)
                break;
            }
          }
        }
      }
      if (!pageHtml) {
        console.log("[sitefilme] Could not find media page.");
        return [];
      }
      const embedUrls = yield extractEmbedsFromPage(pageHtml);
      console.log(`[sitefilme] Discovered ${embedUrls.length} embed link(s)`);
      const streams = [];
      for (const embedUrl of embedUrls) {
        let streamUrl = embedUrl;
        if (embedUrl.includes("vidoza.net") || embedUrl.includes("vidoza.co") || embedUrl.includes("videzz.net")) {
          streamUrl = yield resolveVidoza(embedUrl);
          if (!streamUrl)
            continue;
        }
        streams.push(
          buildStreamObject(
            embedUrl,
            matchedTitle,
            season,
            episode,
            mediaType,
            streamUrl
          )
        );
      }
      return streams;
    } catch (error) {
      console.error("[sitefilme] Error:", error.message);
      return [];
    }
  });
}
