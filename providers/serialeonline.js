// src/lib/sitefilme.js
function decodeHtml(value) {
  if (typeof value !== "string") return "";
  const named = {
    amp: "&",
    apos: "'",
    quot: '"',
    lt: "<",
    gt: ">",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    hellip: "…",
    ș: "ș",
    ţ: "ţ"
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const hexadecimal = entity[1]?.toLowerCase() === "x";
      const code = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      if (Number.isFinite(code) && code > 0 && code <= 1114111) {
        try {
          return String.fromCodePoint(code);
        } catch {
        }
      }
      return match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}
function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function normalizeTitle(value) {
  return decodeHtml(String(value || "")).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function splitTitleAndYear(value) {
  const clean = decodeHtml(String(value || "")).replace(/\s+/g, " ").trim();
  const match = /^(.*?)\s*\((?:TV\s+Series\s+)?(\d{4})\)\s*$/i.exec(clean);
  return match ? { title: match[1].trim(), year: Number(match[2]) } : { title: clean, year: null };
}
function extractTmdbMetadata(html) {
  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html || "")?.[1];
  const pageTitle = stripTags(titleTag || "");
  const suffixRemoved = pageTitle.replace(/\s+[—–-]\s+The Movie Database\s*\(TMDB\)\s*$/i, "").trim();
  const parsed = splitTitleAndYear(suffixRemoved);
  if (!parsed.title) return null;
  return parsed;
}
function resolvePlaylistUrl(baseUrl, reference) {
  const value = decodeHtml(String(reference || "")).trim();
  if (!value || value.startsWith("data:") || value.startsWith("javascript:")) return null;
  try {
    const resolved = new URL(value, baseUrl);
    return resolved.protocol === "https:" && resolved.pathname.toLowerCase().endsWith(".m3u8") ? resolved.href : null;
  } catch {
    return null;
  }
}
function extractHlsVariants(playlist, masterUrl) {
  if (typeof playlist !== "string" || !playlist.includes("#EXTM3U")) return [];
  const lines = playlist.replace(/\r/g, "").split("\n").map((line) => line.trim());
  const byResolution = /* @__PURE__ */ new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;
    const resolution = /(?:^|,)RESOLUTION=(\d+)x(\d+)(?:,|$)/i.exec(line.slice(line.indexOf(":") + 1));
    if (!resolution) continue;
    const width = Number(resolution[1]);
    const height = Number(resolution[2]);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) continue;
    const bandwidth = Number(/(?:^|,)(?:AVERAGE-)?BANDWIDTH=(\d+)(?:,|$)/i.exec(line.slice(line.indexOf(":") + 1))?.[1] || 0);
    let reference = null;
    for (let next = index + 1; next < lines.length; next += 1) {
      if (!lines[next] || lines[next].startsWith("#")) continue;
      reference = lines[next];
      index = next;
      break;
    }
    const url = resolvePlaylistUrl(masterUrl, reference);
    if (!url || url === masterUrl) continue;
    const candidate = { url, quality: `${height}p`, width, height, bandwidth };
    const existing = byResolution.get(height);
    if (!existing || candidate.bandwidth > existing.bandwidth) byResolution.set(height, candidate);
  }
  return [...byResolution.values()].sort((left, right) => right.height - left.height);
}
function normalizeMediaType(value) {
  const type = String(value || "").toLowerCase();
  return type === "series" || type === "show" ? "tv" : type;
}

// src/lib/serialeonline.js
var SERIALEONLINE_ORIGIN = "https://serialeonline.app";
var DETAIL_PATH = /^\/vezi-(?:filmul|serialul)\/[a-z0-9-]+\/?$/i;
var EPISODE_PATH = /\/vezi-episodul\/([a-z0-9-]+)\/s(\d+)-e(\d+)\/?/i;
function safeUrl(value, base = SERIALEONLINE_ORIGIN) {
  const raw = decodeHtml(String(value || "")).replace(/\\(.)/g, "$1").replace(/\s+/g, " ").trim();
  if (!raw || /^(?:data|javascript):/i.test(raw)) return null;
  try {
    const url = new URL(raw, base);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
function splitTitleAndYear2(value) {
  const clean = decodeHtml(String(value || "")).replace(/\s+/g, " ").trim();
  const match = /^(.*?)\s*\((\d{4})\)\s*$/.exec(clean);
  return match ? { title: match[1].trim(), year: Number(match[2]) } : { title: clean, year: null };
}
function anchorChunks(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<a\b[^>]*>/gi)];
  const chunks = [];
  for (let index = 0; index < openings.length; index += 1) {
    const match = openings[index];
    const rawHref = /\bhref\s*=\s*(["'])([\s\S]*?)\1/i.exec(match[0])?.[2];
    if (!rawHref) continue;
    const close = source.indexOf("</a>", match.index + match[0].length);
    const nextOpen = openings[index + 1]?.index ?? source.length;
    const end = close >= 0 && close + 4 <= nextOpen ? close + 4 : nextOpen;
    chunks.push({ tag: match[0], html: source.slice(match.index, end), href: decodeHtml(rawHref).trim() });
  }
  return chunks;
}
function extractLivesearchCandidates(html) {
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (const chunk of anchorChunks(html)) {
    if (/nav-bottom/i.test(chunk.tag)) continue;
    const url = safeUrl(chunk.href);
    if (!url || url.origin !== SERIALEONLINE_ORIGIN || !DETAIL_PATH.test(url.pathname) || seen.has(url.href)) continue;
    const heading = /<h3\b[^>]*class\s*=\s*(["'])[^"']*film-name[^"']*\1[^>]*>([\s\S]*?)<\/h3>/i.exec(chunk.html)?.[2];
    const title = decodeHtml(String(heading || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    if (!title) continue;
    seen.add(url.href);
    const infoBlock = /<div\b[^>]*class\s*=\s*(["'])[^"']*film-infor[^"']*\1[^>]*>([\s\S]*?)<\/div>/i.exec(chunk.html)?.[2] || "";
    const spans = [...infoBlock.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].map((match) => stripInner(match[1]));
    const year = Number(spans.find((value) => /^\d{4}$/.test(value))) || slugYear(url.pathname) || null;
    const kindLabel = spans.find((value) => /^(?:film|serial)$/i.test(value)) || "";
    candidates.push({
      url: url.href,
      title,
      titleWithoutYear: splitTitleAndYear2(title).title,
      year,
      isSeries: /serial/i.test(kindLabel) || /\/vezi-serialul\//i.test(url.pathname)
    });
  }
  return candidates;
}
function cardChunks(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<div\b[^>]*>/gi)].filter((match) => attributeValue(match[0], "class").split(/\s+/).includes("flw-item"));
  return openings.map((match, index) => source.slice(match.index, openings[index + 1]?.index ?? source.length));
}
function extractSearchPageCandidates(html) {
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (const card of cardChunks(html)) {
    const anchor = [...card.matchAll(/<a\b[^>]*href\s*=\s*(["'])([\s\S]*?)\1[^>]*>/gi)].find((match) => {
      const url2 = safeUrl(match[2]);
      return url2 && url2.origin === SERIALEONLINE_ORIGIN && DETAIL_PATH.test(url2.pathname);
    });
    if (!anchor) continue;
    const url = safeUrl(anchor[2]);
    if (!url || seen.has(url.href)) continue;
    const heading = /<h3\b[^>]*class\s*=\s*(["'])[^"']*film-name[^"']*\1[^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(card)?.[2] || attributeValue(anchor[0], "title");
    const cleaned = decodeHtml(String(heading || "").replace(/\s*Urm[ăa]re[sș]te\s+online\s*$/i, "").replace(/\s*online subtitrat(?:[^\s].*)?$/i, "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    seen.add(url.href);
    candidates.push({
      url: url.href,
      title: cleaned,
      titleWithoutYear: splitTitleAndYear2(cleaned).title,
      year: slugYear(url.pathname),
      isSeries: /\/vezi-serialul\//i.test(url.pathname)
    });
  }
  return candidates;
}
function stripInner(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function slugYear(pathname) {
  return Number(/-(\d{4})(?:-online[^/]*)?\/?$/i.exec(String(pathname || ""))?.[1] || 0) || null;
}
function attributeValue(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return decodeHtml(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i").exec(tag)?.[2] || "").trim();
}
function tokenSimilarity(left, right) {
  const a = new Set(normalizeTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizeTitle(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(a.size, b.size);
}
function scoreCandidate(candidate, metadata, mediaType) {
  const wanted = normalizeTitle(metadata.title);
  const full = normalizeTitle(candidate.titleWithoutYear);
  let score = 0;
  if (full === wanted) score += 100;
  else if (full.startsWith(`${wanted} `) || wanted.startsWith(`${full} `)) score += 80;
  else if (full.includes(wanted) || wanted.includes(full)) score += 65;
  score += Math.round(tokenSimilarity(full, wanted) * 35);
  if (metadata.year && candidate.year) score += metadata.year === candidate.year ? 30 : -30;
  const wantsSeries = mediaType === "tv";
  score += candidate.isSeries === wantsSeries ? 20 : -20;
  return score;
}
function selectCandidate(candidates, metadata, mediaType) {
  const ranked = candidates.map((candidate) => ({ candidate, score: scoreCandidate(candidate, metadata, mediaType) })).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 100 ? ranked[0].candidate : null;
}
function extractPlayerToken(html) {
  const source = String(html || "");
  let fallback = null;
  for (const match of source.matchAll(/<(?:div|main|section)\b[^>]*>/gi)) {
    const token = /\bdata-token\s*=\s*(["'])([A-Za-z0-9+/=]{16,})\1/i.exec(match[0])?.[2];
    if (!token) continue;
    const id = attributeValue(match[0], "id").toLowerCase();
    if (id === "main-wrapper" || id === "series-player") return token;
    if (!fallback) fallback = token;
  }
  return fallback;
}
function playersFieldFor(mediaType) {
  return mediaType === "tv" ? "players_show" : "players";
}
function buildMultipartBody(field, value, boundary) {
  const head = `--${boundary}`;
  return `${head}\r
Content-Disposition: form-data; name="${field}"\r
\r
${String(value ?? "")}\r
${head}--\r
`;
}
function parseServerList(text) {
  let data;
  try {
    data = JSON.parse(String(text || ""));
  } catch {
    return [];
  }
  const list = Array.isArray(data) ? data : data && typeof data === "object" ? [data] : [];
  const servers = [];
  const seen = /* @__PURE__ */ new Set();
  for (const entry of list) {
    const link = entry && typeof entry === "object" ? String(entry.link || "") : "";
    const url = safeUrl(link);
    if (!url || seen.has(url.href)) continue;
    seen.add(url.href);
    servers.push({
      name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : `Server ${servers.length + 1}`,
      link: url.href
    });
  }
  return servers;
}
function classifyEmbedHost(embedUrl) {
  const url = safeUrl(embedUrl);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (host === "serialeonline.app" || host.endsWith(".serialeonline.app")) return null;
  if (host === "gn1r5n.org" || host.endsWith(".gn1r5n.org")) return "byse";
  if (/vidmoly/.test(host) || /^(?:www\.)?kaembed\.[a-z.]+$/.test(host)) return "vidmoly";
  return "generic";
}
var UNRESOLVABLE_KINDS = /* @__PURE__ */ new Set(["byse"]);
function isResolvableHost(kind) {
  return Boolean(kind) && !UNRESOLVABLE_KINDS.has(kind);
}
function extractEpisodeUrl(html, season, episode) {
  if (!Number.isInteger(season) || season < 1 || !Number.isInteger(episode) || episode < 1) return null;
  for (const chunk of anchorChunks(html)) {
    const url = safeUrl(chunk.href);
    if (!url || url.origin !== SERIALEONLINE_ORIGIN) continue;
    const match = EPISODE_PATH.exec(url.pathname);
    if (!match) continue;
    if (Number(match[2]) !== season || Number(match[3]) !== episode) continue;
    return url.href;
  }
  return null;
}
function subtitleLanguage(label) {
  const clean = String(label || "").trim().toLowerCase();
  if (/^(?:romanian|romana|română)$/.test(clean)) return "ro";
  if (/^(?:english|engleza|engleză)$/.test(clean)) return "en";
  return clean;
}
function extractJwPlayerSources(html, embedUrl) {
  const source = String(html || "");
  const sourcesBlock = /sources\s*:\s*\[([\s\S]*?)\]/i.exec(source)?.[1] || "";
  const media = [...sourcesBlock.matchAll(/file\s*:\s*(["'])([\s\S]*?)\1/gi)].map((match) => safeUrl(match[2], embedUrl)).find((url) => url && /\.(?:m3u8|mp4)$/i.test(url.pathname));
  if (!media) return null;
  const tracksBlock = /baseTracks\s*=\s*\[([\s\S]*?)\]\s*;/i.exec(source)?.[1] || source;
  const subtitles = [];
  for (const match of tracksBlock.matchAll(/file\s*:\s*(["'])([^"']+?\.(?:vtt|srt)(?:\?[^"']*)?)\1\s*,\s*label\s*:\s*(["'])([\s\S]*?)\3/gi)) {
    const url = safeUrl(match[2], embedUrl);
    if (!url) continue;
    subtitles.push({ url: url.href, language: subtitleLanguage(match[4]), label: match[4].trim() });
  }
  subtitles.sort((left, right) => Number(right.language === "ro") - Number(left.language === "ro"));
  const qualityHint = /label\s*:\s*(["'])(\d{3,4})p/i.exec(source)?.[2];
  return {
    url: media.href,
    type: /\.mp4$/i.test(media.pathname) ? "mp4" : "hls",
    quality: qualityHint ? `${qualityHint}p` : "HD",
    subtitles
  };
}
function extractDirectMedia(html, baseUrl) {
  const decoded = decodeHtml(String(html || "")).replace(/\\u0026/gi, "&").replace(/\\u002f/gi, "/").replace(/\\\//g, "/").replace(/\\"/g, '"');
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of decoded.matchAll(/(https:\/\/[^"'\s<>]+\.(?:m3u8|mp4)(?:\?[^"'\s<>]*)?)/gi)) {
    const url = safeUrl(match[1], baseUrl);
    if (!url || seen.has(url.href) || !/\.(?:m3u8|mp4)$/i.test(url.pathname)) continue;
    seen.add(url.href);
    const quality = /(?:^|[^\d])(\d{3,4})p/i.exec(match[1])?.[1];
    results.push({
      url: url.href,
      type: /\.mp4$/i.test(url.pathname) ? "mp4" : "hls",
      quality: quality ? `${quality}p` : "HD",
      subtitles: []
    });
  }
  return results.slice(0, 2);
}

// src/providers/serialeonline.js
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
var PLAYLIST_ACCEPT = "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.9,*/*;q=0.8";
async function fetchText(url, referer, accept = "text/html,application/xhtml+xml", attempts = 2) {
  const headers = { Accept: accept, "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.7", "User-Agent": USER_AGENT };
  if (referer) headers.Referer = referer;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET", headers });
      if (!response || !response.ok) continue;
      const text = await response.text();
      if (typeof text === "string" && text.trim()) return text;
    } catch {
    }
  }
  return null;
}
async function postPlayers(token, mediaType, referer) {
  const boundary = "----nuvioSerialeOnline" + Date.now().toString(36);
  try {
    const response = await fetch(`${SERIALEONLINE_ORIGIN}/ajax/ajax.php`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Origin: SERIALEONLINE_ORIGIN,
        Referer: referer,
        "User-Agent": USER_AGENT,
        "X-Requested-With": "XMLHttpRequest"
      },
      body: buildMultipartBody(playersFieldFor(mediaType), token, boundary)
    });
    if (!response || !response.ok) return null;
    const text = await response.text();
    return typeof text === "string" && text.trim() ? text : null;
  } catch {
    return null;
  }
}
async function resolveTmdbMetadata(id, mediaType) {
  if (!/^\d+$/.test(String(id))) return null;
  const path = mediaType === "tv" ? "tv" : "movie";
  const html = await fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=en-US`);
  return html ? extractTmdbMetadata(html) : null;
}
function searchUrl(title) {
  return `${SERIALEONLINE_ORIGIN}/livesearch?q=${encodeURIComponent(title)}`;
}
async function resolveCandidatePage(metadata, mediaType) {
  const html = await fetchText(searchUrl(metadata.title), `${SERIALEONLINE_ORIGIN}/`);
  let candidates = html ? extractLivesearchCandidates(html) : [];
  if (!candidates.length) {
    const fallbackHtml = await fetchText(`${SERIALEONLINE_ORIGIN}/search?keyword=${encodeURIComponent(metadata.title)}`, `${SERIALEONLINE_ORIGIN}/`);
    candidates = fallbackHtml ? extractSearchPageCandidates(fallbackHtml) : [];
  }
  const candidate = selectCandidate(candidates, metadata, mediaType);
  return candidate ? { ...candidate, searchUrl: searchUrl(metadata.title) } : null;
}
async function expandHlsVariants(source, playerUrl) {
  const playlist = await fetchText(source.url, playerUrl, PLAYLIST_ACCEPT, 1);
  const variants = playlist ? extractHlsVariants(playlist, source.url) : [];
  if (!variants.length) return [{ ...source, playerUrl }];
  return variants.map((variant) => ({ ...source, url: variant.url, quality: variant.quality, playerUrl }));
}
async function resolveServer(server, referer) {
  if (!isResolvableHost(classifyEmbedHost(server.link))) return [];
  const embedHtml = await fetchText(server.link, referer);
  if (!embedHtml) return [];
  const sources = extractJwPlayerSources(embedHtml, server.link);
  if (!sources) return extractDirectMedia(embedHtml, server.link).map((entry) => ({ ...entry, playerUrl: server.link }));
  return sources.type === "hls" ? expandHlsVariants(sources, server.link) : [{ ...sources, playerUrl: server.link }];
}
function streamResult(stream, season, episode) {
  const episodeLabel = season == null ? "" : ` • S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
  const origin = safeUrl(stream.playerUrl)?.origin;
  return {
    title: `SerialeOnline${episodeLabel} • ${stream.quality} • RO Sub`,
    url: stream.url,
    quality: stream.quality,
    language: "ro",
    provider: "SerialeOnline",
    type: stream.type,
    headers: { Referer: stream.playerUrl, Origin: origin, "User-Agent": USER_AGENT },
    subtitles: (stream.subtitles || []).map((subtitle) => ({
      url: subtitle.url,
      language: subtitle.language || "ro",
      name: subtitle.label || "Subtitrare",
      headers: { Referer: stream.playerUrl, "User-Agent": USER_AGENT }
    }))
  };
}
async function getStreams(tmdbId, requestedType, season, episode) {
  try {
    const mediaType = normalizeMediaType(requestedType);
    if (mediaType !== "movie" && mediaType !== "tv") return [];
    const metadata = await resolveTmdbMetadata(tmdbId, mediaType);
    if (!metadata) return [];
    const page = await resolveCandidatePage(metadata, mediaType);
    if (!page) return [];
    let playbackUrl = page.url;
    if (mediaType === "tv") {
      const seasonNumber = Number(season);
      const episodeNumber = Number(episode);
      if (!Number.isInteger(seasonNumber) || !Number.isInteger(episodeNumber) || seasonNumber < 1 || episodeNumber < 1) return [];
      const seriesHtml = await fetchText(page.url, page.searchUrl);
      if (!seriesHtml) return [];
      playbackUrl = extractEpisodeUrl(seriesHtml, seasonNumber, episodeNumber);
      if (!playbackUrl) return [];
    }
    const playbackHtml = await fetchText(playbackUrl, `${SERIALEONLINE_ORIGIN}/`);
    const token = playbackHtml ? extractPlayerToken(playbackHtml) : null;
    if (!token) return [];
    const serversText = await postPlayers(token, mediaType, playbackUrl);
    const servers = serversText ? parseServerList(serversText) : [];
    if (!servers.length) return [];
    const resolved = [];
    const seen = /* @__PURE__ */ new Set();
    for (const server of servers) {
      for (const source of await resolveServer(server, playbackUrl)) {
        if (!source?.url || seen.has(source.url)) continue;
        seen.add(source.url);
        resolved.push(source);
      }
    }
    return resolved.map((stream) => streamResult(
      stream,
      mediaType === "tv" ? Number(season) : null,
      mediaType === "tv" ? Number(episode) : null
    ));
  } catch (error) {
    console.error("SerialeOnline failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
