/**
 * anikoto - Built from src/anikoto/
 * Generated: 2026-08-06T13:16:39.031Z
 */
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

// src/anikoto/index.js
var BASE_URL = "https://anikototv.to";
var TMDB_URL = "https://api.themoviedb.org/3";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var DEFAULT_HEADERS = {
  "User-Agent": USER_AGENT,
  Referer: `${BASE_URL}/`,
  Accept: "*/*"
};
var AJAX_HEADERS = {
  "User-Agent": USER_AGENT,
  "X-Requested-With": "XMLHttpRequest",
  Referer: `${BASE_URL}/`,
  Accept: "application/json, text/javascript, */*; q=0.01"
};
function fetchJson(url, options) {
  return __async(this, null, function* () {
    const response = yield fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }
    return response.json();
  });
}
function fetchText(url, options) {
  return __async(this, null, function* () {
    const response = yield fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${url}`);
    }
    return response.text();
  });
}
function removeAccents(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function normalizeTitle(value) {
  return removeAccents(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function titleMatchScore(expected, candidate) {
  const normExpected = normalizeTitle(expected);
  const normCandidate = normalizeTitle(candidate);
  if (!normExpected || !normCandidate)
    return 0;
  if (normExpected === normCandidate)
    return 100;
  if (normCandidate.includes(normExpected))
    return 80;
  if (normExpected.includes(normCandidate))
    return 70;
  const expectedWords = normExpected.split(" ").filter(Boolean);
  const candidateWords = normCandidate.split(" ").filter(Boolean);
  const candidateSet = new Set(candidateWords);
  let matched = 0;
  for (const word of expectedWords) {
    if (candidateSet.has(word))
      matched++;
  }
  return matched / expectedWords.length * 60;
}
function formatM3u8Url(url) {
  if (!url)
    return "";
  const cleanUrl = String(url).trim();
  if (cleanUrl.includes(".m3u8"))
    return cleanUrl;
  const hashIndex = cleanUrl.indexOf("#");
  const base = hashIndex !== -1 ? cleanUrl.slice(0, hashIndex) : cleanUrl;
  const hash = hashIndex !== -1 ? cleanUrl.slice(hashIndex) : "";
  const queryIndex = base.indexOf("?");
  const path = queryIndex !== -1 ? base.slice(0, queryIndex) : base;
  const query = queryIndex !== -1 ? base.slice(queryIndex) : "";
  const pathWithM3u8 = path.endsWith(".m3u8") ? path : `${path}.m3u8`;
  return `${pathWithM3u8}${query}${hash}`;
}
function getTmdbMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      const endpoint = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
      const url = `${TMDB_URL}/${endpoint}/${encodeURIComponent(tmdbId)}?api_key=${TMDB_API_KEY}`;
      const data = yield fetchJson(url, { headers: DEFAULT_HEADERS });
      const rawTitle = endpoint === "tv" ? data.name : data.title;
      const rawOrig = endpoint === "tv" ? data.original_name : data.original_title;
      return {
        title: removeAccents(rawTitle),
        originalTitle: removeAccents(rawOrig)
      };
    } catch (e) {
      return null;
    }
  });
}
function findWatchUrl(metadata) {
  return __async(this, null, function* () {
    const titlesToSearch = Array.from(
      new Set([metadata == null ? void 0 : metadata.title, metadata == null ? void 0 : metadata.originalTitle].filter(Boolean))
    );
    for (const queryTitle of titlesToSearch) {
      try {
        const cleanQuery = removeAccents(queryTitle);
        const searchUrl = `${BASE_URL}/ajax/anime/search?keyword=${encodeURIComponent(cleanQuery)}`;
        console.log(`[Anikoto] Searching anime: ${searchUrl}`);
        const searchData = yield fetchJson(searchUrl, { headers: AJAX_HEADERS });
        if (!searchData || !searchData.result || !searchData.result.html) {
          continue;
        }
        const html = searchData.result.html;
        const itemRegex = /<a\b[^>]*href=[\x22'](https?:\/\/anikototv\.to\/watch\/[^'\x22]+)[\x22'][^>]*>([\s\S]*?)<\/a>/gi;
        let bestMatch = null;
        let highestScore = 0;
        let itemMatch;
        while ((itemMatch = itemRegex.exec(html)) !== null) {
          const url = itemMatch[1];
          const itemHtml = itemMatch[2];
          const titleMatch = itemHtml.match(
            /class=[\x22']name d-title[\x22'][^>]*>([^<]+)</i
          );
          const jpMatch = itemHtml.match(/data-jp=[\x22']([^'\x22]+)[\x22']/i);
          const candTitle = titleMatch ? titleMatch[1] : "";
          const candJp = jpMatch ? jpMatch[1] : "";
          let score = Math.max(
            titleMatchScore(queryTitle, candTitle),
            titleMatchScore(queryTitle, candJp)
          );
          if (normalizeTitle(queryTitle).indexOf("movie") === -1 && normalizeTitle(candTitle).indexOf("movie") !== -1) {
            score -= 30;
          }
          if (score > highestScore) {
            highestScore = score;
            bestMatch = url;
          }
        }
        if (bestMatch && highestScore >= 30) {
          return bestMatch;
        }
      } catch (err) {
        console.log(`[Anikoto] Search failed for "${queryTitle}": ${err.message}`);
      }
    }
    return null;
  });
}
function parseServersFromHtml(html) {
  const servers = [];
  const typeRegex = /<div\b[^>]*data-type=[\x22']([^'\x22]+)[\x22'][^>]*>([\s\S]*?)<\/div\s*>/gi;
  const liRegex = /<li\b[^>]*data-link-id=[\x22']([^'\x22]+)[\x22'][^>]*>([\s\S]*?)<\/li>/gi;
  let typeMatch;
  while ((typeMatch = typeRegex.exec(html)) !== null) {
    const dataType = typeMatch[1];
    const sectionHtml = typeMatch[2];
    let liMatch;
    while ((liMatch = liRegex.exec(sectionHtml)) !== null) {
      const linkId = liMatch[1];
      const serverName = liMatch[2].replace(/<[^>]*>/g, "").trim();
      if (!serverName.toLowerCase().includes("kiwi sub")) {
        servers.push({
          type: dataType,
          linkId,
          serverName
        });
      }
    }
  }
  return servers;
}
function parseRenditionsFromM3u8(playlistText, serverName, dataType, embedOrigin) {
  if (!playlistText)
    return [];
  const renditions = [];
  const lines = playlistText.split("\n");
  let currentResolution = "";
  const typeTag = dataType ? dataType.toUpperCase() : "SUB";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      const resMatch = line.match(/RESOLUTION=(\d+x\d+)/i);
      if (resMatch) {
        const heightMatch = resMatch[1].match(/x(\d+)/);
        currentResolution = heightMatch ? `${heightMatch[1]}p` : resMatch[1];
      } else {
        currentResolution = "HD";
      }
    } else if (line && !line.startsWith("#") && line.startsWith("http")) {
      const quality = currentResolution || "HD";
      const displayName = `Anikoto \u2022 ${serverName} [${typeTag}]`;
      const displayTitle = `${serverName} [${typeTag}] ${quality}`;
      renditions.push({
        name: displayName,
        title: displayTitle,
        url: formatM3u8Url(line),
        quality,
        type: "application/x-mpegurl",
        headers: {
          "User-Agent": USER_AGENT,
          Referer: `${embedOrigin}/`
        }
      });
      currentResolution = "";
    }
  }
  return renditions;
}
function resolveServerStream(server, episodeNumber) {
  return __async(this, null, function* () {
    var _a;
    try {
      const serverUrl = `${BASE_URL}/ajax/server?get=${encodeURIComponent(server.linkId)}`;
      const serverRes = yield fetchJson(serverUrl, { headers: AJAX_HEADERS });
      if (!serverRes || !serverRes.result || !serverRes.result.url) {
        return [];
      }
      const embedUrl = serverRes.result.url;
      let embedOrigin = BASE_URL;
      try {
        const parsedOrigin = embedUrl.match(/^(https?:\/\/[^/]+)/i);
        if (parsedOrigin)
          embedOrigin = parsedOrigin[1];
      } catch (e) {
      }
      const embedPageHtml = yield fetchText(embedUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          Referer: `${BASE_URL}/`
        }
      });
      const idMatch = embedPageHtml.match(/data-id=[\x22'](\d+)[\x22']/);
      if (!idMatch)
        return [];
      const dataId = idMatch[1];
      const getSourcesUrl = `${embedOrigin}/stream/getSources?id=${encodeURIComponent(dataId)}`;
      const sourcesData = yield fetchJson(getSourcesUrl, {
        headers: {
          "User-Agent": USER_AGENT,
          "X-Requested-With": "XMLHttpRequest",
          Referer: embedUrl
        }
      });
      if (!sourcesData || !sourcesData.sources)
        return [];
      const masterM3u8Url = typeof sourcesData.sources === "string" ? sourcesData.sources : sourcesData.sources.file || Array.isArray(sourcesData.sources) && ((_a = sourcesData.sources[0]) == null ? void 0 : _a.file);
      if (!masterM3u8Url)
        return [];
      const subtitles = (sourcesData.tracks || []).filter((track) => track && track.file && (track.kind === "captions" || track.kind === "subtitles")).map((track) => ({
        url: track.file,
        lang: track.label ? track.label.slice(0, 3).toLowerCase() : "und",
        label: track.label || "Subtitle"
      }));
      const typeTag = server.type ? server.type.toUpperCase() : "SUB";
      const displayName = `Anikoto \u2022 ${server.serverName} [${typeTag}]`;
      let playlistText = null;
      try {
        playlistText = yield fetchText(masterM3u8Url, {
          headers: {
            "User-Agent": USER_AGENT,
            Referer: `${embedOrigin}/`
          }
        });
      } catch (e) {
      }
      const renditions = parseRenditionsFromM3u8(playlistText, server.serverName, server.type, embedOrigin);
      if (renditions.length > 0) {
        return renditions.map((r) => Object.assign({}, r, { subtitles }));
      }
      return [
        {
          name: displayName,
          title: `${server.serverName} [${typeTag}] HD`,
          url: formatM3u8Url(masterM3u8Url),
          quality: "HD",
          type: "application/x-mpegurl",
          headers: {
            "User-Agent": USER_AGENT,
            Referer: `${embedOrigin}/`
          },
          subtitles
        }
      ];
    } catch (err) {
      console.log(`[Anikoto] Failed to resolve server ${server.serverName}: ${err.message}`);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const normalizedType = mediaType === "series" ? "tv" : mediaType;
    const epNum = episode || 1;
    try {
      const metadata = yield getTmdbMetadata(tmdbId, normalizedType);
      if (!metadata || !metadata.title) {
        console.log(`[Anikoto] Could not get metadata for TMDB ID: ${tmdbId}`);
        return [];
      }
      const watchBaseUrl = yield findWatchUrl(metadata);
      if (!watchBaseUrl) {
        console.log(`[Anikoto] Watch page not found for title: ${metadata.title}`);
        return [];
      }
      const watchEpUrl = `${watchBaseUrl}/ep-${epNum}`;
      console.log(`[Anikoto] Fetching episode page: ${watchEpUrl}`);
      const watchHtml = yield fetchText(watchEpUrl, { headers: DEFAULT_HEADERS });
      const animeIdMatch = watchHtml.match(/data-id=[\x22'](\d+)[\x22']/);
      if (!animeIdMatch) {
        console.log(`[Anikoto] Could not extract anime data-id from episode page`);
        return [];
      }
      const animeId = animeIdMatch[1];
      const epListUrl = `${BASE_URL}/ajax/episode/list/${animeId}`;
      const epListData = yield fetchJson(epListUrl, { headers: AJAX_HEADERS });
      if (!epListData || !epListData.result) {
        console.log(`[Anikoto] Episode list failed for anime ID: ${animeId}`);
        return [];
      }
      const epHtml = epListData.result;
      const epRegex = /<a\b[^>]*data-num=[\x22'](\d+)[\x22'][^>]*data-ids=[\x22']([^'\x22]+)[\x22']/gi;
      let dataIds = null;
      let epMatch;
      while ((epMatch = epRegex.exec(epHtml)) !== null) {
        if (Number(epMatch[1]) === Number(epNum)) {
          dataIds = epMatch[2];
          break;
        }
      }
      if (!dataIds) {
        console.log(`[Anikoto] Episode ${epNum} not found in episode list`);
        return [];
      }
      const serverListUrl = `${BASE_URL}/ajax/server/list?servers=${encodeURIComponent(dataIds)}`;
      const serverListData = yield fetchJson(serverListUrl, { headers: AJAX_HEADERS });
      if (!serverListData || !serverListData.result) {
        console.log(`[Anikoto] Server list failed for episode ${epNum}`);
        return [];
      }
      const servers = parseServersFromHtml(serverListData.result);
      console.log(`[Anikoto] Discovered ${servers.length} valid server(s)`);
      const streamGroups = yield Promise.all(
        servers.map((server) => resolveServerStream(server, epNum))
      );
      const streams = [].concat.apply([], streamGroups);
      const seen = /* @__PURE__ */ new Set();
      return streams.filter((stream) => {
        const key = `${stream.name}_${stream.url}`;
        if (seen.has(key))
          return false;
        seen.add(key);
        return true;
      });
    } catch (error) {
      console.error(`[Anikoto] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
