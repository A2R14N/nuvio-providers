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

// src/lib/clicksud.js
var CLICKSUD_ORIGIN = "https://click-sud.pro";
function decodeJavaScriptEscapes(value) {
  return decodeHtml(String(value || "")).replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16))).replace(/\\\//g, "/").replace(/\\&/g, "&").replace(/\\"/g, '"');
}
function safeUrl(value, base = CLICKSUD_ORIGIN) {
  try {
    const url = new URL(decodeJavaScriptEscapes(value).trim(), base);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
function episodeNumbers(title) {
  const normalized = normalizeTitle(title);
  const season = /\bsezon(?:ul)?\s+(\d+)\b/i.exec(normalized)?.[1];
  const episode = /\b(?:episod(?:ul)?|epsiod(?:ul)?)\s+(\d+)\b/i.exec(normalized)?.[1];
  return {
    season: season == null ? null : Number(season),
    episode: episode == null ? null : Number(episode)
  };
}
function baseTitle(title) {
  return String(title || "").replace(/\s+sezon(?:ul)?\s+\d+[\s\S]*$/i, "").replace(/\s+(?:episod(?:ul)?|epsiod(?:ul)?)\s+\d+[\s\S]*$/i, "").trim();
}
function extractClickSudCandidates(html) {
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  const pattern = /<h[1-3]\b[^>]*class\s*=\s*(["'])[^"']*\bpost-title\b[^"']*\1[^>]*>[\s\S]*?<a\b[^>]*href\s*=\s*(["'])(.*?)\2[^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of String(html || "").matchAll(pattern)) {
    const url = safeUrl(match[3]);
    if (!url || url.origin !== CLICKSUD_ORIGIN || url.pathname === "/" || seen.has(url.href)) continue;
    const title = stripTags(match[4]);
    const numbers = episodeNumbers(title);
    if (!title || numbers.episode == null) continue;
    seen.add(url.href);
    candidates.push({
      url: url.href,
      title,
      baseTitle: baseTitle(title),
      season: numbers.season,
      episode: numbers.episode
    });
  }
  return candidates;
}
function titleSimilarity(left, right) {
  const a = new Set(normalizeTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizeTitle(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(a.size, b.size);
}
function scoreClickSudCandidate(candidate, metadata, season, episode) {
  if (candidate.episode !== episode) return -Infinity;
  if (candidate.season != null && candidate.season !== season) return -Infinity;
  if (candidate.season == null && season !== 1) return -Infinity;
  const wanted = normalizeTitle(metadata.title);
  const found = normalizeTitle(candidate.baseTitle);
  let score = candidate.season === season ? 40 : 10;
  if (found === wanted) score += 120;
  else if (found.startsWith(`${wanted} `) || wanted.startsWith(`${found} `)) score += 90;
  else if (found.includes(wanted) || wanted.includes(found)) score += 70;
  score += Math.round(titleSimilarity(found, wanted) * 45);
  return score;
}
function selectClickSudCandidate(candidates, metadata, season, episode) {
  const ranked = candidates.map((candidate) => ({ candidate, score: scoreClickSudCandidate(candidate, metadata, season, episode) })).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 100 ? ranked[0].candidate : null;
}
function extractPlayerEmbeds(html) {
  const embeds = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of String(html || "").matchAll(/<iframe\b[^>]*(?:src|data-src)\s*=\s*(["'])(.*?)\1/gi)) {
    const url = safeUrl(match[2]);
    if (!url || seen.has(url.href)) continue;
    const host = url.hostname.toLowerCase();
    let kind = null;
    if (["vidmoly.org", "vidmoly.biz", "vidmoly.net"].some((domain) => host === domain || host.endsWith(`.${domain}`))) kind = "vidmoly";
    else if (host === "ok.ru" || host.endsWith(".ok.ru")) kind = "okru";
    else if (host === "vkvideo.ru" || host.endsWith(".vkvideo.ru")) kind = "vkvideo";
    else if (host === "rumble.com" || host.endsWith(".rumble.com")) kind = "rumble";
    else if (host === "my.mail.ru") kind = "mailru";
    if (!kind) continue;
    seen.add(url.href);
    embeds.push({ kind, url: url.href });
  }
  return embeds;
}
function publicEmbedUrl(embed) {
  if (!embed || embed.kind !== "vkvideo") return embed?.url || null;
  const url = safeUrl(embed.url);
  if (!url || url.hostname !== "vkvideo.ru" && !url.hostname.endsWith(".vkvideo.ru")) return null;
  return `https://vk.com${url.pathname}${url.search}${url.hash}`;
}
function validatedHlsUrl(value) {
  const url = safeUrl(value);
  return url && url.pathname.toLowerCase().endsWith(".m3u8") ? url.href : null;
}
function validatedMp4Url(value, allowedDomain) {
  const url = safeUrl(value);
  if (!url || !url.pathname.toLowerCase().endsWith(".mp4")) return null;
  const host = url.hostname.toLowerCase();
  if (allowedDomain && host !== allowedDomain && !host.endsWith(`.${allowedDomain}`)) return null;
  return url.href;
}
function extractVidmolySource(html) {
  const decoded = decodeJavaScriptEscapes(html);
  const source = /\bfile\s*:\s*(["'])(https:[\s\S]*?\.m3u8(?:\?[^"']*)?)\1/i.exec(decoded)?.[2] || /(https:\/\/[^"'\s<>]+\.m3u8(?:\?[^"'\s<>]*)?)/i.exec(decoded)?.[1];
  const label = /\blabel\s*:\s*(["'])(.*?)\1/i.exec(decoded)?.[2] || "";
  const quality = /(\d{3,4})p/i.exec(label)?.[1];
  return { hls: validatedHlsUrl(source), quality: quality ? `${quality}p` : "HD" };
}
function extractOkRuSource(html) {
  const decoded = decodeJavaScriptEscapes(html);
  const hls = /["']hlsManifestUrl["']\s*:\s*["'](https:[^"']+)["']/i.exec(decoded)?.[1];
  return { hls: validatedHlsUrl(hls), quality: "HD" };
}
function extractRumbleId(embedUrl) {
  const url = safeUrl(embedUrl);
  if (!url || url.hostname !== "rumble.com" && !url.hostname.endsWith(".rumble.com")) return null;
  return /^\/embed\/([a-z0-9]+)(?:\/|$)/i.exec(url.pathname)?.[1] || null;
}
function rumbleMediaUrl(value, extension) {
  const candidate = typeof value === "string" ? value : value && typeof value.url === "string" ? value.url : null;
  return extension === "hls" ? validatedHlsUrl(candidate) : validatedMp4Url(candidate);
}
function extractRumbleSource(payload) {
  let data;
  try {
    data = JSON.parse(String(payload || ""));
  } catch {
    return { hls: null, quality: "HD", mp4: [] };
  }
  const hlsContainers = [data?.u?.hls, data?.ua?.hls];
  let hls = null;
  for (const container of hlsContainers) {
    hls = rumbleMediaUrl(container, "hls");
    if (hls) break;
    if (container && typeof container === "object") {
      for (const value of Object.values(container)) {
        hls = rumbleMediaUrl(value, "hls");
        if (hls) break;
      }
    }
    if (hls) break;
  }
  const mp4 = [];
  const seen = /* @__PURE__ */ new Set();
  for (const container of [data?.u?.mp4, data?.ua?.mp4]) {
    if (!container) continue;
    const entries = typeof container === "object" && !Array.isArray(container) ? Object.entries(container) : [["", container]];
    for (const [label, value] of entries) {
      const url = rumbleMediaUrl(value, "mp4");
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const declared = Number.parseInt(label, 10) || Number.parseInt(value?.quality || value?.height, 10);
      mp4.push({ url, quality: Number.isInteger(declared) ? `${declared}p` : "HD" });
    }
  }
  mp4.sort((left, right) => Number.parseInt(right.quality, 10) - Number.parseInt(left.quality, 10));
  return { hls, quality: "HD", mp4 };
}
function extractMailRuMetadataUrl(html) {
  const decoded = decodeJavaScriptEscapes(html);
  const value = /["']metadataUrl["']\s*:\s*["']([^"']+)["']/i.exec(decoded)?.[1];
  const url = safeUrl(value);
  if (!url || url.hostname !== "my.mail.ru" || !url.pathname.startsWith("/+/video/meta/")) return null;
  return url.href;
}
function extractMailRuSource(payload) {
  let data;
  try {
    data = JSON.parse(String(payload || ""));
  } catch {
    return { mp4: [] };
  }
  const mp4 = [];
  const seen = /* @__PURE__ */ new Set();
  for (const video of Array.isArray(data?.videos) ? data.videos : []) {
    const url = validatedMp4Url(video?.url, "my.mail.ru");
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const quality = /(\d{3,4})p/i.exec(String(video?.key || ""))?.[1];
    mp4.push({ url, quality: quality ? `${quality}p` : "HD" });
  }
  mp4.sort((left, right) => Number.parseInt(right.quality, 10) - Number.parseInt(left.quality, 10));
  return { mp4 };
}
function extractVkVideoSource(html) {
  const decoded = decodeJavaScriptEscapes(html);
  const hls = /["']hls(?:_fmp4)?["']\s*:\s*["'](https:[^"']+)["']/i.exec(decoded)?.[1];
  const byQuality = /* @__PURE__ */ new Map();
  for (const match of decoded.matchAll(/["']mp4_(\d{3,4})["']\s*:\s*["'](https:[^"']+)["']/gi)) {
    const quality = Number(match[1]);
    const url = safeUrl(match[2]);
    if (!Number.isInteger(quality) || !url) continue;
    const host = url.hostname.toLowerCase();
    if (host !== "vkuser.net" && !host.endsWith(".vkuser.net")) continue;
    byQuality.set(quality, { url: url.href, quality: `${quality}p` });
  }
  const preferredMp4 = [720, 480].map((quality) => byQuality.get(quality)).filter(Boolean);
  return {
    hls: validatedHlsUrl(hls),
    quality: "HD",
    mp4: preferredMp4.length ? preferredMp4 : [...byQuality.values()].filter((stream) => Number.parseInt(stream.quality, 10) <= 720).sort((left, right) => Number.parseInt(right.quality, 10) - Number.parseInt(left.quality, 10))
  };
}

// src/providers/clicksud.js
var REQUEST_HEADERS = {
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.7",
  "Cache-Control": "no-cache",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
};
async function fetchText(url, referer, accept = REQUEST_HEADERS.Accept, attempts = 2) {
  const headers = { ...REQUEST_HEADERS, Accept: accept };
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
async function resolveTmdbMetadata(id) {
  if (!/^\d+$/.test(String(id))) return null;
  const url = `https://www.themoviedb.org/tv/${encodeURIComponent(String(id))}?language=en-US`;
  const html = await fetchText(url);
  return html ? extractTmdbMetadata(html) : null;
}
async function resolveEpisodePage(metadata, season, episode) {
  const queries = [
    `${metadata.title} Sezonul ${season} Episodul ${episode}`,
    `${metadata.title} Episodul ${episode}`,
    metadata.title
  ];
  const used = /* @__PURE__ */ new Set();
  for (const query of queries) {
    const searchUrl = `${CLICKSUD_ORIGIN}/?s=${encodeURIComponent(query)}`;
    if (used.has(searchUrl)) continue;
    used.add(searchUrl);
    const html = await fetchText(searchUrl, `${CLICKSUD_ORIGIN}/`);
    if (!html) continue;
    const candidate = selectClickSudCandidate(extractClickSudCandidates(html), metadata, season, episode);
    if (candidate) return { ...candidate, searchUrl };
  }
  return null;
}
function playbackHeaders(embedUrl) {
  const url = new URL(embedUrl);
  const headers = {
    Referer: embedUrl,
    "User-Agent": REQUEST_HEADERS["User-Agent"]
  };
  if (url.hostname !== "vk.com") headers.Origin = url.origin;
  return headers;
}
function streamResult(stream, embedUrl, season, episode) {
  return {
    title: `ClickSud • S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")} • ${stream.quality} • RO`,
    url: stream.url,
    quality: stream.quality,
    language: "ro",
    provider: "ClickSud",
    type: stream.type || "hls",
    headers: playbackHeaders(embedUrl)
  };
}
async function resolveEmbed(embed, pageUrl) {
  const requestUrl = publicEmbedUrl(embed);
  if (!requestUrl) return [];
  if (embed.kind === "rumble") {
    const mediaId = extractRumbleId(requestUrl);
    if (!mediaId) return [];
    const apiUrl = `https://rumble.com/embedJS/u3/?request=video&ver=2&v=${encodeURIComponent(mediaId)}`;
    const payload = await fetchText(apiUrl, requestUrl, "application/json,text/plain;q=0.9,*/*;q=0.8", 2);
    const source2 = extractRumbleSource(payload);
    const direct = source2.mp4.map((stream) => ({ ...stream, type: "mp4", refererUrl: requestUrl }));
    if (source2.hls) direct.push({ url: source2.hls, quality: source2.quality, type: "hls", refererUrl: requestUrl });
    return direct;
  }
  if (embed.kind === "mailru") {
    const html = await fetchText(requestUrl, pageUrl, REQUEST_HEADERS.Accept, 2);
    const metadataUrl = extractMailRuMetadataUrl(html);
    if (!metadataUrl) return [];
    const payload = await fetchText(metadataUrl, requestUrl, "application/json,text/plain;q=0.9,*/*;q=0.8", 2);
    return extractMailRuSource(payload).mp4.map((stream) => ({ ...stream, type: "mp4", refererUrl: requestUrl }));
  }
  const attempts = embed.kind === "vkvideo" ? 3 : 1;
  let source = null;
  for (let attempt = 0; attempt < attempts && !source?.hls; attempt += 1) {
    const html = await fetchText(requestUrl, pageUrl, REQUEST_HEADERS.Accept, embed.kind === "vidmoly" ? 2 : 1);
    if (!html) continue;
    source = embed.kind === "vidmoly" ? extractVidmolySource(html) : embed.kind === "okru" ? extractOkRuSource(html) : extractVkVideoSource(html);
  }
  if (embed.kind === "vkvideo" && source?.mp4?.length) {
    return source.mp4.map((stream) => ({ ...stream, type: "mp4", refererUrl: requestUrl }));
  }
  if (!source?.hls) return [];
  const master = await fetchText(
    source.hls,
    requestUrl,
    "application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.9,*/*;q=0.8"
  );
  const variants = master ? extractHlsVariants(master, source.hls) : [];
  const streams = variants.length ? variants : [{ url: source.hls, quality: source.quality }];
  return streams.map((stream) => ({ ...stream, refererUrl: requestUrl }));
}
async function getStreams(tmdbId, requestedType, season, episode) {
  try {
    if (normalizeMediaType(requestedType) !== "tv") return [];
    const seasonNumber = Number(season);
    const episodeNumber = Number(episode);
    if (!Number.isInteger(seasonNumber) || seasonNumber < 0 || !Number.isInteger(episodeNumber) || episodeNumber < 1) return [];
    const metadata = await resolveTmdbMetadata(tmdbId);
    if (!metadata) return [];
    const page = await resolveEpisodePage(metadata, seasonNumber, episodeNumber);
    if (!page) return [];
    const html = await fetchText(page.url, page.searchUrl);
    if (!html) return [];
    const results = [];
    const seen = /* @__PURE__ */ new Set();
    for (const embed of extractPlayerEmbeds(html)) {
      for (const stream of await resolveEmbed(embed, page.url)) {
        if (seen.has(stream.url)) continue;
        seen.add(stream.url);
        results.push(streamResult(stream, stream.refererUrl, seasonNumber, episodeNumber));
      }
    }
    return results;
  } catch (error) {
    console.error("ClickSud failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
