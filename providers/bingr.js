/**
 * bingr - Built from src/bingr/
 * Generated: 2026-08-07T21:48:51.955Z
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

// src/bingr/index.js
var API_URL = "https://api.bingr.one/api";
var SERVERS = [
  { id: "s11", name: "Sirius" },
  { id: "s12", name: "Quasar" },
  { id: "s4", name: "Luna" }
];
function fetchJson(url, options) {
  return __async(this, null, function* () {
    const response = yield fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  });
}
function normalizeQuality(source) {
  const quality = String(source.quality || source.label || "").trim();
  if (!quality || quality.toLowerCase() === "unknown")
    return "Auto";
  return quality;
}
function normalizeSubtitles(subtitles) {
  if (!Array.isArray(subtitles))
    return [];
  return subtitles.filter((subtitle) => subtitle && subtitle.url).map((subtitle) => ({
    url: subtitle.url,
    lang: subtitle.lang || subtitle.language || "und",
    language: subtitle.language || subtitle.lang || "und",
    label: subtitle.label || subtitle.name || subtitle.lang || subtitle.language || "Subtitle",
    name: subtitle.name || subtitle.label || subtitle.lang || subtitle.language || "Subtitle"
  }));
}
function fetchServer(server, mediaType, tmdbId, query) {
  return __async(this, null, function* () {
    try {
      const data = yield fetchJson(`${API_URL}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          srv: server.id,
          t: mediaType,
          id: String(tmdbId),
          query
        })
      });
      if (!data || !Array.isArray(data.sources))
        return [];
      const subtitles = normalizeSubtitles(data.subtitles);
      return data.sources.filter((source) => source && source.url).map((source, index) => {
        const quality = normalizeQuality(source);
        const sourceLabel = source.name && source.name !== "Unknown" && source.name !== "Auto" ? source.name : source.label && source.label !== "Auto" ? source.label : `Source ${index + 1}`;
        return {
          name: `Bingr - ${server.name}`,
          title: `${server.name} - ${sourceLabel}`,
          url: source.url,
          quality,
          language: "en",
          type: source.type,
          headers: source.headers || {},
          subtitles: normalizeSubtitles(source.subtitles).concat(subtitles)
        };
      });
    } catch (error) {
      console.log(`[Bingr] ${server.name} unavailable: ${error.message}`);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const settings = globalThis.SCRAPER_SETTINGS || {};
    const selectedServer = settings.server || "all";
    const servers = selectedServer === "all" ? SERVERS : SERVERS.filter((server) => server.id === selectedServer);
    const normalizedType = mediaType === "series" ? "tv" : mediaType;
    if (!tmdbId || normalizedType !== "movie" && normalizedType !== "tv" || normalizedType === "tv" && (!season || !episode)) {
      return [];
    }
    try {
      const details = yield fetchJson(
        `${API_URL}/details/${normalizedType}/${tmdbId}?v=1`
      );
      if (!details || !details.title)
        return [];
      const query = {
        title: details.title,
        year: details.year ? String(details.year) : void 0
      };
      if (normalizedType === "tv") {
        query.season = Number(season);
        query.episode = Number(episode);
      }
      const results = yield Promise.all(
        servers.map(
          (server) => fetchServer(server, normalizedType, tmdbId, query)
        )
      );
      const seen = {};
      const streams = [].concat.apply([], results);
      return streams.filter((stream) => {
        if (seen[stream.url])
          return false;
        seen[stream.url] = true;
        return true;
      });
    } catch (error) {
      console.error(`[Bingr] Error: ${error.message}`);
      return [];
    }
  });
}
function onSettings() {
  return [
    {
      type: "select",
      key: "server",
      label: "Preferred Server",
      description: "Query only the selected Bingr server, or query all.",
      options: [
        { label: "All servers", value: "all" },
        { label: "Sirius (s11)", value: "s11" },
        { label: "Quasar (s12)", value: "s12" },
        { label: "Luna (s4)", value: "s4" }
      ],
      defaultValue: "all"
    }
  ];
}
module.exports = { getStreams, onSettings };
