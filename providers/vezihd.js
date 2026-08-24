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

// src/lib/vezihd.js
var VEZIHD_ORIGIN = "https://vezihd.ro";
var AD_HOSTS = [
  "yadro.ru",
  "googlesyndication.com",
  "doubleclick.net",
  "googletagmanager.com",
  "google-analytics.com",
  "histats.com",
  "mosevura.com"
];
var VK_HOST_PATTERN = /^(?:[a-z0-9-]+\.)*(?:vkvideo\.ru|vk\.com|vk\.ru)$/;
var STREAMFLASH_HOST_PATTERN = /^(?:www\.)?streamflash\.[a-z.]+$/;
var VEZIHD_ORIGIN_HOST = "vezihd.ro";
function safeUrl(value, base = VEZIHD_ORIGIN) {
  const raw = decodeHtml(String(value || "")).replace(/\\(.)/g, "$1").replace(/\s+/g, " ").trim();
  if (!raw || /^(?:data|javascript):/i.test(raw)) return null;
  let url;
  try {
    url = new URL(raw, base);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const direct = /^(?:https:)?\/\/([^/?#]+)([\s\S]*)$/i.exec(raw);
  if (!direct || direct[1] === url.host) return url;
  return { ...url, href: `https://${direct[1]}${direct[2]}` };
}
function isAdHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return AD_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}
function splitTitleAndYear2(value) {
  const clean = decodeHtml(String(value || "")).replace(/\s+/g, " ").trim();
  const match = /^(.*?)\s*\((\d{4})\)\s*$/.exec(clean);
  return match ? { title: match[1].trim(), year: Number(match[2]) } : { title: clean, year: null };
}
function slugYear(pathname) {
  const segment = pathname.split("/").filter(Boolean).pop() || "";
  const year = /[-_](1[89]\d{2}|20\d{2})$/i.exec(segment)?.[1];
  return year ? Number(year) : null;
}
function candidateUrl(href) {
  const url = safeUrl(href);
  if (!url || url.origin !== VEZIHD_ORIGIN) return null;
  if (!/^\/(?:film|seriale|emisiune)\/[^\s?#]+/i.test(url.pathname)) return null;
  return url;
}
function extractVezihdCandidates(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<div\b[^>]*class\s*=\s*(["'])[^"']*\bsearch-entry-card\b[^"']*\1[^>]*>/gi)];
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < openings.length; index += 1) {
    const card = source.slice(openings[index].index + openings[index][0].length, openings[index + 1]?.index ?? source.length);
    const titleBlock = /<div\s+class=["'][^"']*\bsearch-entry-title\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(card)?.[1] || "";
    const anchor = /<a\b[^>]*href\s*=\s*(["'])([\s\S]*?)\1[^>]*>([\s\S]*?)<\/a>/i.exec(titleBlock);
    if (!anchor) continue;
    const url = candidateUrl(anchor[2]);
    if (!url || seen.has(url.href)) continue;
    const title = stripTags(anchor[3]);
    if (!title) continue;
    seen.add(url.href);
    const parsed = splitTitleAndYear2(title);
    const numbers = parseSeasonEpisode(title);
    candidates.push({
      url: url.href,
      title,
      titleWithoutYear: parsed.title,
      year: parsed.year || slugYear(url.pathname),
      season: numbers.season,
      episode: numbers.episode,
      isSeries: /^\/(?:seriale|emisiune)\//i.test(url.pathname) || numbers.episode != null
    });
  }
  return candidates;
}
function tokenSimilarity(left, right) {
  const a = new Set(normalizeTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizeTitle(right).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(a.size, b.size);
}
function scoreVezihdCandidate(candidate, metadata, mediaType) {
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
function selectVezihdCandidate(candidates, metadata, mediaType) {
  const ranked = candidates.map((candidate) => ({ candidate, score: scoreVezihdCandidate(candidate, metadata, mediaType) })).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 100 ? ranked[0].candidate : null;
}
function parseSeasonEpisode(title) {
  const normalized = normalizeTitle(title);
  const season = /\bsezon(?:ul)?\s*(\d+)\b/i.exec(normalized)?.[1];
  const episode = /\bepisod(?:ul)?\s*(\d+)\b/i.exec(normalized)?.[1];
  return {
    season: season == null ? null : Number(season),
    episode: episode == null ? null : Number(episode)
  };
}
function episodeBaseTitle(title) {
  return String(title || "").replace(/\s+sezon(?:ul)?\s*\d+[\s\S]*$/i, "").replace(/\s+episod(?:ul)?\s*\d+[\s\S]*$/i, "").replace(/\s+\d{4}$/, "").trim();
}
function scoreVezihdEpisode(candidate, metadata, season, episode) {
  if (candidate.episode !== episode) return -Infinity;
  if (candidate.season != null && candidate.season !== season) return -Infinity;
  if (candidate.season == null && season !== 1) return -Infinity;
  const wanted = normalizeTitle(metadata.title);
  const found = normalizeTitle(episodeBaseTitle(candidate.title));
  let score = candidate.season === season ? 40 : 10;
  if (found === wanted) score += 120;
  else if (found.startsWith(`${wanted} `) || wanted.startsWith(`${found} `)) score += 90;
  else if (found.includes(wanted) || wanted.includes(found)) score += 70;
  score += Math.round(tokenSimilarity(found, wanted) * 45);
  return score;
}
function selectVezihdEpisode(candidates, metadata, season, episode) {
  const ranked = candidates.map((candidate) => ({ candidate, score: scoreVezihdEpisode(candidate, metadata, season, episode) })).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score !== -Infinity && ranked[0].score >= 100 ? ranked[0].candidate : null;
}
function classifyEmbedUrl(embedUrl) {
  const url = safeUrl(embedUrl);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (/youtube\.com$/.test(host) || host === "youtu.be") return null;
  if (host === VEZIHD_ORIGIN_HOST || host.endsWith(".vezihd.ro")) return null;
  if (isAdHost(host)) return null;
  if (VK_HOST_PATTERN.test(host) && /^\/video_ext\.php$/i.test(url.pathname)) return "vkvideo";
  if (STREAMFLASH_HOST_PATTERN.test(host)) return "streamflash";
  if (/^\/embed\/[a-z0-9]+\/?$/i.test(url.pathname)) return "vidhide";
  if (/^\/(?:e|f)\/[a-z0-9]+/i.test(url.pathname)) return /^byse/.test(host.split(".")[0]) ? "byse" : "waaw";
  return "generic";
}
function extractPlayerUrls(html) {
  const source = decodeHtml(String(html || ""));
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of source.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*(["'])([\s\S]*?)\1/gi)) {
    const url = safeUrl(match[2]);
    const kind = url ? classifyEmbedUrl(url.href) : null;
    if (!url || !kind || seen.has(url.href)) continue;
    seen.add(url.href);
    results.push({ url: url.href, kind });
  }
  return results;
}
function publicVkEmbedUrl(embedUrl) {
  const url = safeUrl(embedUrl);
  if (!url || !VK_HOST_PATTERN.test(url.hostname) || !/^\/video_ext\.php$/i.test(url.pathname)) return null;
  return `https://vk.com${url.pathname}${url.search}`;
}
function waawEmbedUrl(embedUrl, pageUrl) {
  if (classifyEmbedUrl(embedUrl) !== "waaw") return null;
  const url = safeUrl(embedUrl);
  if (!url) return null;
  const embed = new URL(url.href);
  embed.pathname = embed.pathname.replace(/^\/f\//, "/e/");
  if (!embed.searchParams.has("http_referer")) {
    embed.searchParams.set("http_referer", pageUrl ? String(pageUrl) : `${VEZIHD_ORIGIN}/`);
  }
  return embed.protocol === "https:" ? embed.href : null;
}
function extractWaawSources(html, embedUrl) {
  const source = String(html || "");
  const mediaMatch = /\.src\s*\(\s*\{\s*src\s*:\s*(["'])(https:\/\/[^'"\s]+?\.(?:m3u8|mp4)(?:\?[^'"\s]*)?)\1/i.exec(source) || /(?:^|[^:\w])["'](https:\/\/[^"'\s]+?\.m3u8(?:\?[^"'\s]*)?)["']/i.exec(source.replace(/\/\*[\s\S]*?\*\//g, " "));
  const media = safeUrl(mediaMatch?.[2] || mediaMatch?.[1], embedUrl);
  if (!media) return null;
  const subtitles = [];
  for (const match of source.matchAll(/file2sub\s*\(\s*(["'])([^"']+?)\1\s*,\s*(["'])([\w-]{2,})\3\s*,\s*(["'])([\s\S]*?)\5/g)) {
    const subtitle = safeUrl(match[2], embedUrl);
    if (!subtitle) continue;
    subtitles.push({ url: subtitle.href, language: match[4].toLowerCase(), label: match[6].trim() });
  }
  subtitles.sort((left, right) => Number(right.language === "ro") - Number(left.language === "ro"));
  return { url: media.href, type: /\.mp4(?:\?|$)/i.test(media.pathname + media.search) ? "mp4" : "hls", quality: "HD", subtitles };
}
function unpackPackedScript(html) {
  const match = /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('(.*?)',(\d+),(\d+),'(.*?)'\.split\('\|'\)/s.exec(String(html || ""));
  if (!match) return null;
  const radix = Number(match[2]);
  if (!Number.isInteger(radix) || radix < 2 || radix > 36) return null;
  const words = match[4].replace(/\\(['"\\])/g, "$1").split("|");
  let payload = match[1].replace(/\\(['"\\])/g, "$1");
  for (let index = words.length - 1; index >= 0; index -= 1) {
    if (!words[index]) continue;
    payload = payload.replace(new RegExp(`\\b${index.toString(radix)}\\b`, "g"), words[index]);
  }
  return payload;
}
function subtitleLanguage(label) {
  const clean = String(label || "").trim().toLowerCase();
  return /^(?:romanian|romana|română|ro)$/.test(clean) ? "ro" : clean;
}
function extractVidhideSources(unpacked, embedUrl) {
  const source = String(unpacked || "");
  const linksBlock = /var\s+links\s*=\s*\{([\s\S]*?)\}/.exec(source)?.[1] || "";
  const links = /* @__PURE__ */ new Map();
  for (const match of linksBlock.matchAll(/"([A-Za-z0-9_]+)"\s*:\s*"([^"]*)"/g)) {
    const url = safeUrl(match[2], embedUrl);
    if (url && /\.m3u8(?:[?#]|$)/i.test(url.pathname + url.search)) links.set(match[1].toLowerCase(), url.href);
  }
  const preferred = ["hls4", "hls3", "hls2"].map((key) => links.get(key)).find(Boolean) || [...links.values()][0];
  const fallback = !preferred ? safeUrl(/(https:[^"'\s<>]+?\.m3u8(?:\?[^"'\s<>]*)?)/i.exec(source.replace(/\\/g, ""))?.[1], embedUrl)?.href : null;
  const hls = preferred || fallback;
  if (!hls) return null;
  const subtitles = [];
  const seenSubtitles = /* @__PURE__ */ new Set();
  const trackPatterns = [
    /file\s*:\s*(["'])([^"']+?\.(?:vtt|srt)(?:\?[^"']*)?)\1\s*,\s*label\s*:\s*(["'])([\s\S]*?)\3/g,
    /label\s*:\s*(["'])([\s\S]*?)\1\s*,\s*file\s*:\s*(["'])([^"']+?\.(?:vtt|srt)(?:\?[^"']*)?)\3/g
  ];
  for (const pattern of trackPatterns) {
    for (const match of source.matchAll(pattern)) {
      const label = (pattern === trackPatterns[0] ? match[4] : match[2]).trim();
      const url = safeUrl(pattern === trackPatterns[0] ? match[2] : match[4], embedUrl);
      if (!url || seenSubtitles.has(url.href)) continue;
      seenSubtitles.add(url.href);
      subtitles.push({ url: url.href, language: subtitleLanguage(label), label });
    }
  }
  subtitles.sort((left, right) => Number(right.language === "ro") - Number(left.language === "ro"));
  return { url: hls, type: "hls", quality: "HD", subtitles };
}
function extractStreamFlashSources(html, playerUrl) {
  const video = /<video\b[^>]*>([\s\S]*?)<\/video>/i.exec(String(html || ""))?.[1] || "";
  if (!video) return null;
  const sourceTag = /<source\b[^>]*>/i.exec(video)?.[0] || "";
  const trackTag = [...video.matchAll(/<track\b[^>]*>/gi)].map((match) => match[0]).find((tag) => /\bkind\s*=\s*(["'])?(?:subtitles|captions)\1?/i.test(tag));
  const media = safeUrl(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i.exec(sourceTag)?.[2], playerUrl);
  if (!media) return null;
  const subtitle = safeUrl(/\bsrc\s*=\s*(["'])([\s\S]*?)\1/i.exec(trackTag || "")?.[2], playerUrl);
  const quality = /(\d{3,4})p/i.exec(stripTags(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || ""))?.[1];
  return {
    url: media.href,
    type: "mp4",
    quality: quality ? `${quality}p` : "HD",
    subtitle: subtitle ? { url: subtitle.href, language: /\bsrclang\s*=\s*(["'])([\s\S]*?)\1/i.exec(trackTag)?.[2] || "ro", label: /\blabel\s*=\s*(["'])([\s\S]*?)\1/i.exec(trackTag)?.[2] || "Subtitrare" } : null
  };
}
function extractVkVideoSource(html) {
  const decoded = decodeHtml(String(html || ""));
  const hlsUrl = safeUrl(/["']hls(?:_fmp4)?["']\s*:\s*["'](https:[^"']+)["']/i.exec(decoded)?.[1]);
  const hls = hlsUrl && /(?:^|\.)vkuser\.net$/.test(hlsUrl.hostname.toLowerCase()) && hlsUrl.pathname.toLowerCase().endsWith(".m3u8") ? hlsUrl.href : null;
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
    hls,
    quality: "HD",
    mp4: preferredMp4.length ? preferredMp4 : [...byQuality.values()].filter((stream) => Number.parseInt(stream.quality, 10) <= 720).sort((left, right) => Number.parseInt(right.quality, 10) - Number.parseInt(left.quality, 10))
  };
}
function extractGenericMediaUrls(html, limit = 2) {
  const decoded = decodeHtml(String(html || "")).replace(/\\u0026/gi, "&").replace(/\\\//g, "/");
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  for (const pattern of [/(https:\/\/[^"'\s<>]+?\.m3u8(?:\?[^"'\s<>]*)?)/gi, /(https:\/\/[^"'\s<>]+?\.mp4(?:\?[^"'\s<>]*)?)/gi]) {
    for (const match of decoded.matchAll(pattern)) {
      const url = safeUrl(match[1]);
      if (!url || seen.has(url.href)) continue;
      seen.add(url.href);
      results.push({ url: url.href, type: pattern.source.includes("m3u8") ? "hls" : "mp4" });
      if (results.length >= limit) return results;
    }
  }
  return results;
}
function searchUrl(query) {
  return `${VEZIHD_ORIGIN}/search/${encodeURIComponent(String(query || "").trim())}/`;
}
function expandHlsMaster(playlist, masterUrl) {
  const variants = extractHlsVariants(playlist, masterUrl);
  const masterHost = /^https:\/\/([^/?#]+)/i.exec(String(masterUrl || ""))?.[1];
  if (!masterHost) return variants;
  const lowered = masterHost.toLowerCase();
  if (masterHost === lowered) return variants;
  return variants.map((variant) => {
    let parsed;
    try {
      parsed = new URL(variant.url);
    } catch {
      return variant;
    }
    if (parsed.host !== lowered) return variant;
    return { ...variant, url: `${parsed.protocol}//${masterHost}${parsed.pathname}${parsed.search}${parsed.hash}` };
  });
}

// src/providers/vezihd.js
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
async function resolveTmdbMetadata(id, mediaType) {
  if (!/^\d+$/.test(String(id))) return null;
  const path = mediaType === "tv" ? "tv" : "movie";
  const html = await fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=en-US`);
  return html ? extractTmdbMetadata(html) : null;
}
async function resolveSearchPage(metadata) {
  const url = searchUrl(metadata.title);
  const html = await fetchText(url, `${VEZIHD_ORIGIN}/`);
  if (!html) return null;
  return { url, candidates: extractVezihdCandidates(html) };
}
function subtitleResult(subtitle, playerUrl) {
  return {
    url: subtitle.url,
    language: subtitle.language || "ro",
    name: subtitle.label || "Subtitrare",
    headers: { Referer: playerUrl, "User-Agent": USER_AGENT }
  };
}
async function expandHlsVariants(source, playerUrl) {
  const playlist = await fetchText(source.url, playerUrl, PLAYLIST_ACCEPT, 1);
  const variants = playlist ? expandHlsMaster(playlist, source.url) : [];
  if (!variants.length) return [{ ...source, playerUrl }];
  return variants.map((variant) => ({ ...source, url: variant.url, quality: variant.quality }));
}
async function resolvePlayer(player, pageUrl) {
  const playerUrl = player.url;
  if (player.kind === "byse") return [];
  if (player.kind === "vidhide") {
    const html2 = await fetchText(playerUrl, pageUrl);
    const source = html2 ? extractVidhideSources(unpackPackedScript(html2), playerUrl) : null;
    if (!source) return [];
    return expandHlsVariants(source, playerUrl);
  }
  if (player.kind === "waaw") {
    const embedUrl = waawEmbedUrl(playerUrl, pageUrl);
    if (!embedUrl) return [];
    const html2 = await fetchText(embedUrl, pageUrl);
    const source = html2 ? extractWaawSources(html2, embedUrl) : null;
    if (!source) return [];
    return source.type === "hls" ? expandHlsVariants(source, embedUrl) : [{ ...source, playerUrl: embedUrl }];
  }
  if (player.kind === "streamflash") {
    const html2 = await fetchText(playerUrl, pageUrl);
    const sources = html2 ? extractStreamFlashSources(html2, playerUrl) : null;
    return sources ? [{ ...sources, subtitles: [], playerUrl }] : [];
  }
  if (player.kind === "vkvideo") {
    const requestUrl = publicVkEmbedUrl(playerUrl);
    if (!requestUrl) return [];
    let source = null;
    for (let attempt = 0; attempt < 3 && !source?.hls && !source?.mp4?.length; attempt += 1) {
      const html2 = await fetchText(requestUrl, pageUrl);
      if (!html2) continue;
      source = extractVkVideoSource(html2);
    }
    if (!source) return [];
    const results = [];
    for (const stream of source.mp4 || []) results.push({ url: stream.url, quality: stream.quality, type: "mp4", subtitles: [], playerUrl: requestUrl });
    if (source.hls) results.push(...(await expandHlsVariants({ url: source.hls, type: "hls", quality: source.quality, subtitles: [] }, requestUrl)).map((item) => ({ ...item, playerUrl: requestUrl })));
    return results;
  }
  const html = await fetchText(playerUrl, pageUrl);
  if (!html) return [];
  const genericSources = await Promise.all(extractGenericMediaUrls(html).map(
    async (media) => media.type === "hls" ? expandHlsVariants({ ...media, quality: "HD", subtitles: [] }, playerUrl) : [{ ...media, quality: "HD", subtitles: [], playerUrl }]
  ));
  return genericSources.flat();
}
function streamResult(stream, season, episode) {
  const episodeLabel = season == null ? "" : ` • S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
  const origin = safeUrl(stream.url)?.origin;
  const subtitles = Array.isArray(stream.subtitles) ? stream.subtitles.map((subtitle) => subtitleResult(subtitle, stream.playerUrl)) : [];
  return {
    title: `VeziHD${episodeLabel} • ${stream.quality} • RO Sub`,
    url: stream.url,
    quality: stream.quality,
    language: "ro",
    provider: "VeziHD",
    type: stream.type,
    headers: { Referer: stream.playerUrl, Origin: origin, "User-Agent": USER_AGENT },
    ...subtitles.length ? { subtitles } : {}
  };
}
async function getStreams(tmdbId, requestedType, season, episode) {
  try {
    const mediaType = normalizeMediaType(requestedType);
    if (mediaType !== "movie" && mediaType !== "tv") return [];
    const metadata = await resolveTmdbMetadata(tmdbId, mediaType);
    if (!metadata) return [];
    const search = await resolveSearchPage(metadata);
    if (!search) return [];
    let page = null;
    if (mediaType === "tv") {
      const seasonNumber = Number(season);
      const episodeNumber = Number(episode);
      if (!Number.isInteger(seasonNumber) || !Number.isInteger(episodeNumber)) return [];
      page = selectVezihdEpisode(search.candidates, metadata, seasonNumber, episodeNumber);
    } else {
      page = selectVezihdCandidate(search.candidates, metadata, mediaType);
    }
    if (!page) return [];
    const detailHtml = await fetchText(page.url, search.url);
    if (!detailHtml) return [];
    const resolved = [];
    const seen = /* @__PURE__ */ new Set();
    for (const player of extractPlayerUrls(detailHtml)) {
      for (const source of await resolvePlayer(player, page.url)) {
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
    console.error("VeziHD failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
