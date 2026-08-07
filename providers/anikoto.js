/**
 * anikoto - Built from src/anikoto/
 * Generated: 2026-08-07T05:52:35.373Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
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

// src/anikoto/index.js
var anikoto_exports = {};
__export(anikoto_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(anikoto_exports);

// src/anikoto/tmdb.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
function fetchTmdbDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const isTv = mediaType === "tv" || mediaType === "series";
    const primaryEndpoint = isTv ? "tv" : "movie";
    const secondaryEndpoint = isTv ? "movie" : "tv";
    let url = `https://api.themoviedb.org/3/${primaryEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
    console.log(`[anikoto] Requesting TMDB URL: ${url}`);
    try {
      let res = yield fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) {
        url = `https://api.themoviedb.org/3/${secondaryEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
        res = yield fetch(url, { headers: { "User-Agent": USER_AGENT } });
      }
      if (!res.ok)
        return null;
      const data = yield res.json();
      const primaryTitle = data.name || data.title || "Unknown";
      const originalTitle = data.original_name || data.original_title || null;
      const releaseDate = data.first_air_date || data.release_date;
      const year = releaseDate ? parseInt(releaseDate.split("-")[0]) : null;
      let titleRo = null;
      if (data.translations && data.translations.translations) {
        const roTrans = data.translations.translations.find(
          (t) => t.iso_639_1 === "ro"
        );
        if (roTrans && roTrans.data) {
          titleRo = roTrans.data.name || roTrans.data.title;
        }
      }
      return {
        title: primaryTitle,
        originalTitle,
        titleRo: titleRo || primaryTitle,
        year,
        seasons: Array.isArray(data.seasons) ? data.seasons.map((s) => ({
          number: Number(s.season_number || 0),
          name: s.name || "",
          episodeCount: Number(s.episode_count || 0),
          year: s.air_date ? parseInt(String(s.air_date).split("-")[0]) : null
        })) : []
      };
    } catch (e) {
      console.error("[anikoto] TMDB Exception:", e.message);
      return null;
    }
  });
}

// src/anikoto/constants.js
var BASE_URL = "https://anikototv.to";
var MEGA_BASE = "https://megaplay.buzz";
var USER_AGENT2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var AJAX_HEADERS = {
  "User-Agent": USER_AGENT2,
  Accept: "application/json,text/html,text/plain,*/*",
  "X-Requested-With": "XMLHttpRequest",
  Referer: BASE_URL + "/"
};
function slugify(text) {
  if (!text)
    return "";
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}
function normalizeTitle(text) {
  if (!text)
    return "";
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
}
function titleSimilarity(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb)
    return 0;
  if (na === nb)
    return 1;
  const tokensA = new Set(na.split(/\s+/).filter(Boolean));
  const tokensB = new Set(nb.split(/\s+/).filter(Boolean));
  let overlap = 0;
  tokensA.forEach((t) => {
    if (tokensB.has(t))
      overlap++;
  });
  const union = tokensA.size + tokensB.size - overlap;
  return union ? overlap / union : 0;
}
function wordSimilarity(a, b) {
  const wordsA = new Set(
    String(a || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1)
  );
  const wordsB = new Set(
    String(b || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1)
  );
  if (!wordsA.size || !wordsB.size)
    return 0;
  let overlap = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w))
      overlap++;
  });
  const union = wordsA.size + wordsB.size - overlap;
  return union ? overlap / union : 0;
}

// src/anikoto/index.js
var PROVIDER = "Anikoto";
function fetchText(url, headers) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(url, { headers });
      if (!res.ok)
        return null;
      return yield res.text();
    } catch (e) {
      console.error(`[anikoto] Fetch error for ${url}:`, e.message);
      return null;
    }
  });
}
function parseSearchResults(html) {
  const results = [];
  const re = /<a[^>]*class="item"[^>]*href="([^"]*watch\/[^"?]+)"[^>]*>[\s\S]*?<div class="name d-title"[^>]*>([\s\S]*?)<\/div>/g;
  let m;
  while (m = re.exec(html)) {
    const title = m[2].replace(/<[^>]+>/g, "").trim();
    if (!title)
      continue;
    results.push({ watchUrl: m[1], title });
  }
  return results;
}
function searchSite(keyword) {
  return __async(this, null, function* () {
    const url = `${BASE_URL}/ajax/anime/search?keyword=${encodeURIComponent(keyword)}`;
    const text = yield fetchText(url, AJAX_HEADERS);
    if (!text)
      return [];
    try {
      const data = JSON.parse(text);
      if (!data.result || !data.result.html)
        return [];
      return parseSearchResults(data.result.html);
    } catch (e) {
      console.error("[anikoto] Search JSON parse error:", e.message);
      return [];
    }
  });
}
var SEASON_STOPWORDS = /* @__PURE__ */ new Set([
  "part",
  "season",
  "the",
  "of",
  "and",
  "vs",
  "film",
  "movie",
  "series",
  "full",
  "final",
  "cour"
]);
function wordsOf(text) {
  return new Set(
    String(text || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !SEASON_STOPWORDS.has(w))
  );
}
function seasonSignalScore(entryTitle, season) {
  if (!season)
    return 0;
  const title = String(entryTitle || "").toLowerCase();
  const n = Number(season);
  const numMatch = title.match(/\b(?:season|s)\s*(\d+)\b/);
  if (numMatch && Number(numMatch[1]) === n)
    return 0.5;
  const partMatch = title.match(/\bpart\s*(\d+)\b/i);
  if (partMatch && Number(partMatch[1]) === n)
    return 0.4;
  return 0;
}
function entryKindPenalty(entryTitle) {
  const t = String(entryTitle || "").toLowerCase();
  if (/(ova|ona|special|recap|season summary|best of|trailer|movie)$|\b(ova|ona)\b/.test(t)) {
    return -0.6;
  }
  return 0;
}
function searchAndPickAnime(_0) {
  return __async(this, arguments, function* (tmdbData, opts = {}) {
    const { season, isTv } = opts;
    const titles = Array.from(
      new Set([tmdbData.title, tmdbData.originalTitle, tmdbData.titleRo].filter(Boolean))
    );
    const seen = /* @__PURE__ */ new Map();
    const querySet = new Set(titles);
    if (isTv && season) {
      const tmdbSeason = (tmdbData.seasons || []).find((s) => s.number === Number(season));
      for (const title of titles) {
        if (tmdbSeason && tmdbSeason.name) {
          const cleanName = tmdbSeason.name.replace(/\d+$/g, "").trim();
          if (cleanName && cleanName.toLowerCase() !== title.toLowerCase()) {
            querySet.add(`${title} ${cleanName}`.replace(/[:\-]/g, " ").trim().slice(0, 60));
            querySet.add(`${title} Season ${season}`.slice(0, 60));
          }
        } else {
          querySet.add(`${title} Season ${season}`.slice(0, 60));
        }
      }
    }
    for (const title of titles) {
      const query = title.replace(/[:\-]/g, " ").trim();
      querySet.add(query);
    }
    for (const q of querySet) {
      const results = yield searchSite(q);
      for (const r of results) {
        const slug = r.watchUrl.split("/watch/")[1] || "";
        const prev = seen.get(r.watchUrl);
        if (!prev || r.title.length < prev.title.length) {
          seen.set(r.watchUrl, __spreadProps(__spreadValues({}, r), { slug }));
        }
      }
    }
    let best = null;
    let bestScore = 0.3;
    for (const r of seen.values()) {
      let score = Math.max(
        titleSimilarity(r.title, tmdbData.title),
        wordSimilarity(r.title, tmdbData.title)
      );
      if (normalizeTitle(r.title) === normalizeTitle(tmdbData.title))
        score = 1;
      const slug = slugify(tmdbData.title);
      if (slug && r.slug.startsWith(slug))
        score = Math.max(score, 0.75);
      if (isTv && season) {
        score += entryKindPenalty(r.title);
        score += seasonSignalScore(r.title, season);
        const tmSeason = (tmdbData.seasons || []).find((s) => s.number === Number(season));
        const tmSeasonWords = season ? wordsOf(tmSeason ? tmSeason.name : "") : /* @__PURE__ */ new Set();
        const entryWords = wordsOf(r.title);
        if (tmSeasonWords.size) {
          let hits = 0;
          tmSeasonWords.forEach((w) => {
            if (entryWords.has(w))
              hits++;
          });
          if (hits >= 2)
            score += 0.25;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }
    return { best, all: Array.from(seen.values()) };
  });
}
function findFilmId(watchUrl) {
  return __async(this, null, function* () {
    const html = yield fetchText(watchUrl, { "User-Agent": USER_AGENT2 });
    if (!html)
      return null;
    const m = html.match(/id="watch-main"[^>]*data-id="(\d+)"/);
    return m ? m[1] : null;
  });
}
function fetchEpisodes(filmId) {
  return __async(this, null, function* () {
    const text = yield fetchText(`${BASE_URL}/ajax/episode/list/${filmId}`, AJAX_HEADERS);
    if (!text)
      return [];
    try {
      const data = JSON.parse(text);
      const html = data.result || "";
      const eps = [];
      const re = /<a href="#" (data-id="\d+"[^>]*?)>/g;
      let m;
      while (m = re.exec(html)) {
        const attrs = m[1];
        const id = (attrs.match(/data-id="(\d+)"/) || [])[1];
        const num = (attrs.match(/data-num="([^"]*)"/) || [])[1];
        const ids = (attrs.match(/data-ids="([^"]*)"/) || [])[1];
        if (id && ids)
          eps.push({ id, num: num || "", ids });
      }
      return eps;
    } catch (e) {
      console.error("[anikoto] Episode list parse error:", e.message);
      return [];
    }
  });
}
function computeGlobalEpisode(tmdbData, tmdbId, season, episode) {
  return __async(this, null, function* () {
    if (!season || !episode)
      return String(episode || 1);
    if (Number(season) <= 1)
      return String(episode);
    try {
      const text = yield fetchText(
        `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=439c478a771f35c05022f9feabcca01c`,
        { "User-Agent": USER_AGENT2 }
      );
      if (!text)
        return String(episode);
      const data = JSON.parse(text);
      let offset = 0;
      if (Array.isArray(data.seasons)) {
        for (const s of data.seasons) {
          const n = Number(s.season_number || 0);
          if (n > 0 && n < Number(season))
            offset += Number(s.episode_count || 0);
        }
      }
      return String(offset + Number(episode));
    } catch (e) {
      console.error("[anikoto] TMDB season offset error:", e.message);
      return String(episode);
    }
  });
}
function resolveEpisodeNumber(tmdbData, tmdbId, season, episode, found, candidates) {
  return __async(this, null, function* () {
    const sNum = Number(season);
    const eNum = Number(episode) || 1;
    const target = String(eNum);
    const baseTitleNorm = normalizeTitle(found.title.replace(/\bpart\s*\d+\b/gi, ""));
    const parts = (candidates || []).filter((c) => normalizeTitle(c.title.replace(/\bpart\s*\d+\b/gi, "")) === baseTitleNorm).filter((c) => /part\s*\d+\b/i.test(c.title)).sort((a, b) => {
      const an = Number((a.title.match(/\bpart\s*(\d+)\b/i) || [])[1] || 0);
      const bn = Number((b.title.match(/\bpart\s*(\d+)\b/i) || [])[1] || 0);
      return an - bn;
    });
    if (parts.length >= 2) {
      let offset = 0;
      for (const p of parts) {
        const fid = yield findFilmId(p.watchUrl);
        const eps = fid ? yield fetchEpisodes(fid) : [];
        const count = eps.length || 0;
        if (eNum > offset && eNum <= offset + count) {
          const localNum = String(eNum - offset);
          console.log(
            `[anikoto] resolved S${sNum}E${eNum} -> ${p.title} ep ${localNum} (${count}eps, offset ${offset})`
          );
          return { watchUrl: p.watchUrl, num: localNum, title: p.title };
        }
        offset += count;
      }
      return { watchUrl: found.watchUrl, num: null };
    }
    const seasonMatch = found.title.match(/\bseason\s*(\d+)\b/i);
    if (seasonMatch && Number(seasonMatch[1]) === sNum) {
      return { watchUrl: found.watchUrl, num: target, title: found.title };
    }
    const globalNum = yield computeGlobalEpisode(tmdbData, tmdbId, season, episode);
    return { watchUrl: found.watchUrl, num: globalNum, title: found.title };
  });
}
function fetchServers(episodeId) {
  return __async(this, null, function* () {
    const text = yield fetchText(`${BASE_URL}/ajax/server/list?servers=${encodeURIComponent(episodeId)}`, AJAX_HEADERS);
    if (!text)
      return [];
    try {
      const data = JSON.parse(text);
      const html = data.result || "";
      const servers = [];
      const re = /<li[^>]*data-link-id="([^"]*)"[^>]*>([^<]*)</g;
      let m;
      while (m = re.exec(html)) {
        const name = m[2].trim();
        if (!m[1] || !name)
          continue;
        servers.push({ linkId: m[1], name });
      }
      return servers;
    } catch (e) {
      console.error("[anikoto] Server list parse error:", e.message);
      return [];
    }
  });
}
function fetchServerUrl(linkId) {
  return __async(this, null, function* () {
    const text = yield fetchText(`${BASE_URL}/ajax/server?get=${encodeURIComponent(linkId)}`, AJAX_HEADERS);
    if (!text)
      return null;
    try {
      const data = JSON.parse(text);
      return data.result && data.result.url ? data.result.url : null;
    } catch (e) {
      console.error("[anikoto] Server URL parse error:", e.message);
      return null;
    }
  });
}
var CLEAN_BASE = "https://1oe.lostproject.club/anime/";
function cleanCdn(sourceUrl) {
  try {
    const m = sourceUrl.match(/^https?:\/\/[^/]+\/([^/]+)\/([^/]+)\/[^/]+$/i);
    if (!m)
      return null;
    return `${CLEAN_BASE}${m[1]}/${m[2]}/master.m3u8`;
  } catch (e) {
    return null;
  }
}
function resolveMega(embedUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(embedUrl, {
        "User-Agent": USER_AGENT2,
        Referer: `${BASE_URL}/`,
        Accept: "text/html,application/json,text/plain,*/*"
      });
      if (!html)
        return null;
      const idMatch = html.match(/id="megaplay-player"[^>]*data-id="(\d+)"/) || html.match(/data-id="(\d+)"[^>]*data-realid=/);
      if (!idMatch)
        return null;
      const dataId = idMatch[1];
      let origin;
      try {
        origin = new URL(embedUrl).origin;
      } catch (e) {
        console.error("[anikoto] Invalid embed URL:", embedUrl);
        return null;
      }
      const jsonText = yield fetchText(`${origin}/stream/getSourcesNew?id=${dataId}`, {
        "User-Agent": USER_AGENT2,
        Referer: embedUrl,
        Origin: origin,
        "X-Requested-With": "XMLHttpRequest"
      });
      if (!jsonText)
        return null;
      const data = JSON.parse(jsonText);
      const sources = data.sources;
      let url = null;
      if (sources && typeof sources === "object")
        url = sources.file || sources.url;
      else if (Array.isArray(sources) && sources[0])
        url = sources[0].file || sources[0].url;
      if (!url)
        return null;
      const subtitles = buildSubtitles(data.tracks);
      const clean = cleanCdn(url);
      if (clean) {
        const ok = yield fetchText(clean, {
          "User-Agent": USER_AGENT2,
          Referer: `${origin}/`,
          Origin: origin
        });
        if (ok) {
          console.log(`[anikoto] using clean mirror: ${clean}`);
          return { url: clean, subtitles, origin };
        }
      }
      console.warn(`[anikoto] skipping PNG-wrapped source: ${url}`);
      return null;
    } catch (e) {
      console.error(`[anikoto] MegaPlay resolve error for ${embedUrl}:`, e.message);
      return null;
    }
  });
}
function buildSubtitles(tracks) {
  if (!Array.isArray(tracks))
    return [];
  return tracks.filter((t) => t && t.file).map((t) => ({
    url: t.file,
    lang: t.label || "Unknown"
  }));
}
function audioLabelFromUrl(embedUrl) {
  try {
    const seg = (new URL(embedUrl).pathname.split("/").filter(Boolean).pop() || "").toLowerCase();
    if (seg.includes("dub"))
      return "Dub";
    if (seg.includes("sub"))
      return seg.startsWith("h") ? "HardSub" : "Sub";
    return "";
  } catch (e) {
    return "";
  }
}
function buildStream(showTitle, season, episode, mediaType, url, subtitles, serverName, origin, audioLabel) {
  const isTv = mediaType === "tv" || mediaType === "series";
  const displayTitle = isTv && season && episode ? `${showTitle} S${season}E${episode}` : showTitle;
  const isM3u8 = (url || "").toLowerCase().includes(".m3u8");
  const ref = origin || MEGA_BASE;
  const kind = isM3u8 ? "HLS" : "Direct";
  const parts = [];
  if (serverName)
    parts.push(serverName);
  parts.push(kind);
  if (audioLabel)
    parts.push(audioLabel);
  const label = parts.length > 1 ? parts.join(" \xB7 ") : "HLS";
  return {
    name: `${PROVIDER} \xB7 ${label}`,
    title: serverName ? `${displayTitle} ${label}` : `${displayTitle} ${audioLabel || ""}`.trim(),
    url,
    quality: isM3u8 ? "Auto" : "1080p",
    headers: {
      "User-Agent": USER_AGENT2,
      Referer: `${ref}/`,
      Origin: `${ref}`
    },
    subtitles
  };
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    console.log(
      `[anikoto] getStreams started: ID=${tmdbId}, type=${mediaType}, S=${season}, E=${episode}`
    );
    try {
      const tmdbData = yield fetchTmdbDetails(tmdbId, mediaType);
      if (!tmdbData)
        return [];
      const isTv = mediaType === "tv" || mediaType === "series";
      const { best: found, all: candidates } = yield searchAndPickAnime(tmdbData, {
        isTv,
        season
      });
      if (!found) {
        console.log("[anikoto] Could not find the anime on the site.");
        return [];
      }
      console.log(`[anikoto] Matched anime: ${found.title} (${found.watchUrl})`);
      let watchUrl = found.watchUrl;
      let requestedNum = "1";
      if (isTv) {
        const resolved = yield resolveEpisodeNumber(
          tmdbData,
          tmdbId,
          season,
          episode,
          found,
          candidates
        );
        watchUrl = resolved.watchUrl || found.watchUrl;
        requestedNum = resolved.num;
        if (resolved.title)
          found.title = resolved.title;
      }
      if (!requestedNum) {
        console.log(`[anikoto] S${season}E${episode} outside split-arc range`);
        return [];
      }
      const filmId = yield findFilmId(watchUrl);
      if (!filmId)
        return [];
      const episodes = yield fetchEpisodes(filmId);
      let ep = episodes.find((e) => e.num === requestedNum);
      if (!ep && isTv)
        ep = episodes.find((e) => e.num === String(episode));
      if (!ep) {
        console.log(
          `[anikoto] episode ${requestedNum} not found among ${episodes.length} episode(s)`
        );
        return [];
      }
      const servers = yield fetchServers(ep.ids);
      console.log(`[anikoto] found ${servers.length} server(s)`);
      if (servers.length === 0)
        return [];
      const streams = [];
      for (const server of servers) {
        const embedUrl = yield fetchServerUrl(server.linkId);
        if (!embedUrl)
          continue;
        console.log(`[anikoto] server ${server.name} -> ${embedUrl}`);
        let resolved = null;
        if (embedUrl.includes(".m3u8") || embedUrl.endsWith(".mp4")) {
          resolved = { url: embedUrl, subtitles: [] };
        } else {
          resolved = yield resolveMega(embedUrl);
        }
        if (!resolved || !resolved.url)
          continue;
        streams.push(
          buildStream(
            found.title,
            season,
            episode,
            mediaType,
            resolved.url,
            resolved.subtitles || [],
            server.name,
            resolved.origin,
            audioLabelFromUrl(embedUrl)
          )
        );
      }
      return streams;
    } catch (error) {
      console.error(`[anikoto] Error: ${error.message}`);
      return [];
    }
  });
}
