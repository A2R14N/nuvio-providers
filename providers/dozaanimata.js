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

// src/lib/dozaanimata.js
var DOZAANIMATA_ORIGIN = "https://www.dozaanimata.net";
var RESERVED_PREFIXES = ["release-year", "genre", "wp-content", "wp-admin", "tag", "page", "feed", "movies"];
var BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64DecodeText(value) {
  const input = String(value || "").replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
  let output = "";
  let bits = 0;
  let bitCount = 0;
  for (const character of input) {
    if (character === "=") break;
    const index = BASE64_ALPHABET.indexOf(character);
    if (index < 0) return null;
    bits = bits << 6 | index;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      output += String.fromCharCode(bits >> bitCount & 255);
    }
  }
  return output;
}
function safeUrl(value, base = DOZAANIMATA_ORIGIN) {
  const raw = decodeHtml(String(value || "")).replace(/\\(.)/g, "$1").trim();
  if (!raw || /^(?:data|javascript):/i.test(raw)) return null;
  try {
    const url = new URL(/^\/\//.test(raw) ? `https:${raw}` : raw, base);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
function attributeValue(tag, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return decodeHtml(new RegExp(`\\b${escaped}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i").exec(tag)?.[2] || "").trim();
}
function cleanTitle(value) {
  let text = decodeHtml(String(value || "")).replace(/\s+/g, " ").trim();
  const year = Number(/\((\d{4})\)/.exec(text)?.[1] || 0) || null;
  if (year) text = text.replace(/\((\d{4})\)\s*/, " ");
  text = text.replace(/\s*[—–-]\s*(?:Dublat|Subtitrat|Online)[^\-—–]*$/i, "");
  text = text.replace(/\s+(?:Dublat|Subtitrat|Online)(?:\s+(?:în|in)\s+Rom[aâ]n[ăa])?\s*$/i, "");
  return { title: text.replace(/\s+/g, " ").trim(), year };
}
function cardChunks(html) {
  const source = String(html || "");
  const openings = [...source.matchAll(/<div\b[^>]*>/gi)].filter((match) => attributeValue(match[0], "class").split(/\s+/).includes("ml-item"));
  return openings.map((match, index) => source.slice(match.index, openings[index + 1]?.index ?? source.length));
}
function isUsableCardPath(pathname) {
  if (!/\/$/.test(pathname)) return false;
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length || segments.length > 2) return false;
  return !segments.some((segment) => RESERVED_PREFIXES.includes(segment));
}
function extractDozaCandidates(html) {
  const candidates = [];
  const seen = /* @__PURE__ */ new Set();
  for (const card of cardChunks(html)) {
    const anchor = /<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>/i.exec(card);
    if (!anchor) continue;
    const url = safeUrl(anchor[2]);
    if (!url || url.origin !== DOZAANIMATA_ORIGIN || !isUsableCardPath(url.pathname) || seen.has(url.href)) continue;
    if (/^\/episode\//i.test(url.pathname)) continue;
    const heading = /<span\s+class=["'][^"']*mli-info[^"']*["']\s*>\s*<h2>([\s\S]*?)<\/h2>/i.exec(card)?.[1] || attributeValue(anchor[0], "oldtitle");
    const cleaned = cleanTitle(heading);
    if (!cleaned.title) continue;
    seen.add(url.href);
    const isSeries = /^\/(?:series|episode)\//i.test(url.pathname);
    const releaseYear = Number(/release-year\/(\d{4})/.exec(card)?.[1] || 0) || null;
    candidates.push({
      url: url.href,
      title: cleaned.title,
      titleWithoutYear: cleaned.title,
      year: cleaned.year || releaseYear,
      isSeries,
      mediaType: isSeries ? "tv" : "movie"
    });
  }
  return candidates;
}
function tokenSet(value) {
  return normalizeTitle(value).split(" ").filter(Boolean);
}
function tokenSimilarity(left, right) {
  const a = new Set(tokenSet(left));
  const b = new Set(tokenSet(right));
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / Math.max(a.size, b.size);
}
function scoreDozaCandidate(candidate, metadata, mediaType) {
  const wanted = normalizeTitle(metadata.title);
  const full = normalizeTitle(candidate.titleWithoutYear);
  let score = 0;
  if (full === wanted) score += 100;
  else if (full.startsWith(`${wanted} `) || wanted.startsWith(`${full} `)) score += 80;
  else if (full.includes(wanted) || wanted.includes(full)) score += 65;
  else if (tokenSimilarity(full, wanted) === 1) score += 92;
  score += Math.round(tokenSimilarity(full, wanted) * 35);
  if (metadata.year && candidate.year) score += metadata.year === candidate.year ? 30 : -30;
  const wantsSeries = mediaType === "tv";
  score += candidate.isSeries === wantsSeries ? 20 : -20;
  return score;
}
function selectDozaCandidate(candidates, metadata, mediaType) {
  const ranked = candidates.map((candidate) => ({ candidate, score: scoreDozaCandidate(candidate, metadata, mediaType) })).sort((left, right) => right.score - left.score);
  return ranked[0] && ranked[0].score >= 90 ? ranked[0].candidate : null;
}
function extractEpisodeUrl(html, season, episode) {
  if (!Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 1) return null;
  const source = String(html || "");
  const slugPattern = new RegExp(`sezonul-${season}-episodul-${episode}(?:[^0-9]|$)`, "i");
  const openings = [...source.matchAll(/<div\b[^>]*>/gi)].filter((match) => attributeValue(match[0], "class").split(/\s+/).includes("tvseason"));
  const chunks = openings.map((match, index) => source.slice(match.index, openings[index + 1]?.index ?? source.length));
  const findInChunk = (chunk) => {
    for (const match of chunk.matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1/gi)) {
      if (!slugPattern.test(decodeHtml(match[2]))) continue;
      const url = safeUrl(match[2]);
      if (url && url.origin === DOZAANIMATA_ORIGIN && /\/episode\//i.test(url.pathname)) return url.href;
    }
    return null;
  };
  for (const chunk of chunks) {
    const labelSeason = Number(/Sezonul\s*(\d+)/i.exec(stripTags(chunk))?.[1] || 0);
    if (labelSeason !== season) continue;
    const found = findInChunk(chunk);
    if (found) return found;
  }
  return findInChunk(source);
}
function decodeObfuscatedPlayers(html) {
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of String(html || "").matchAll(/\bstr\s*=\s*(["'])((?:@[0-9A-Fa-f]{2})+)\1/g)) {
    let decoded = "";
    try {
      decoded = decodeURIComponent(match[2].replace(/@/g, "%"));
    } catch {
      continue;
    }
    const src = /\bsrc\s*=\s*(["'])([\s\S]*?)\1/i.exec(decoded)?.[2];
    const url = src ? safeUrl(src) : null;
    if (!url || seen.has(url.href)) continue;
    seen.add(url.href);
    results.push(url.href);
  }
  return results;
}
function decodeProtectUrl(value) {
  const url = safeUrl(value);
  if (!url || !/\/protect\.php$/i.test(url.pathname)) return null;
  const payload = url.search.replace(/^\?/, "").split("&")[0];
  if (!payload) return null;
  const decoded = base64DecodeText(payload);
  if (!decoded || !/^https?:\/\//i.test(decoded)) return null;
  return safeUrl(decoded)?.href || null;
}
function extractNetuVideos(html) {
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of String(html || "").matchAll(/<div id="([0-9a-f]+)"/gi)) {
    const rawId = match[1];
    if (rawId.length < 24 || rawId.length % 3 !== 0) continue;
    let hex = "";
    let valid = true;
    for (let offset = 0; offset < rawId.length; offset += 3) {
      const group = rawId.slice(offset, offset + 3);
      if (group[0] !== "0") {
        valid = false;
        break;
      }
      hex += group.slice(1);
    }
    if (!valid) continue;
    let json = "";
    try {
      for (let offset = 0; offset < hex.length; offset += 2) json += String.fromCharCode(Number.parseInt(hex.slice(offset, offset + 2), 16));
    } catch {
      continue;
    }
    let videoId = null;
    try {
      videoId = JSON.parse(json)?.v;
    } catch {
      continue;
    }
    if (typeof videoId !== "string" || !videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    results.push({ videoId, url: `https://hqq.tv/player/embed_player.php?vid=${encodeURIComponent(videoId)}&autoplay=none` });
  }
  return results;
}
function playerKind(playerUrl) {
  const url = safeUrl(playerUrl);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (host === "dozaanimata.net" || host.endsWith(".dozaanimata.net")) return null;
  if (host === "ok.ru" || host.endsWith(".ok.ru") || host.endsWith(".okcdn.ru")) return "okru";
  if (host === "sendvid.com" || host.endsWith(".sendvid.com")) return "sendvid";
  if (host.includes("vidmoly")) return "vidmoly";
  if (host.includes("dood") || host === "d000d.com" || host.endsWith(".d000d.com") || host === "doply.net" || host.endsWith(".doply.net")) return "dood";
  if (host === "playmogo.com" || host.endsWith(".playmogo.com")) return "playmogo";
  if (host === "dsvplay.com" || host.endsWith(".dsvplay.com")) return "dsvplay";
  if (host === "hqq.tv" || host.endsWith(".hqq.tv") || host === "yandexcdn.com" || host.endsWith(".yandexcdn.com")) return "hqq";
  if (host === "hideiframe.com" || host.endsWith(".hideiframe.com")) return "hideiframe";
  return "generic";
}
var UNRESOLVABLE_KINDS = /* @__PURE__ */ new Set(["dood", "playmogo", "dsvplay", "hqq", "hideiframe"]);
function isResolvableKind(kind) {
  return !UNRESOLVABLE_KINDS.has(kind);
}
function playerNavLabels(html) {
  const labels = /* @__PURE__ */ new Map();
  for (const match of String(html || "").matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const item = match[1];
    const target = /href\s*=\s*(["'])#(tab\d+)\1/i.exec(item);
    if (!target) continue;
    const server = stripTags(/<strong>([\s\S]*?)<\/strong>/i.exec(item)?.[1] || "");
    const quality = stripTags(target[0] ? /<a[^>]*>([\s\S]*?)<\/a>/i.exec(item)?.[1] || "" : "");
    labels.set(target[2].toLowerCase(), [server, quality].filter(Boolean).join(" • "));
  }
  return labels;
}
function tabChunks(region) {
  const markers = [...region.matchAll(/<div\s+id\s*=\s*(["'])(tab\d+)\1[^>]*>/gi)];
  const chunks = [];
  if (!markers.length) return region.trim() ? [{ tab: null, html: region }] : [];
  if (markers[0].index > 0) chunks.push({ tab: null, html: region.slice(0, markers[0].index) });
  markers.forEach((marker, index) => {
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? region.length;
    chunks.push({ tab: marker[2].toLowerCase(), html: region.slice(start, end) });
  });
  return chunks.filter((chunk) => chunk.html.trim());
}
function collectChunkPlayers(chunkHtml, sink) {
  for (const src of decodeObfuscatedPlayers(chunkHtml)) {
    const resolved = decodeProtectUrl(src) || safeUrl(src)?.href;
    if (resolved) sink.push(resolved);
  }
  for (const match of chunkHtml.matchAll(/<iframe\b[^>]*\bsrc\s*=\s*(["'])([\s\S]*?)\1/gi)) {
    const url = safeUrl(match[2]);
    if (!url) continue;
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube") || host.includes("youtu.de")) continue;
    if (/\/protect\.php$/i.test(url.pathname)) {
      const resolved = decodeProtectUrl(url.href);
      if (resolved) sink.push(resolved);
      continue;
    }
    sink.push(url.href);
  }
  for (const netu of extractNetuVideos(chunkHtml)) sink.push(netu.url);
}
function extractDozaPlayers(html) {
  const source = String(html || "");
  const playerStart = source.search(/<div\s+id\s*=\s*(["'])player2\1/i);
  const navIndex = source.search(/class\s*=\s*(["'])[^"']*player_nav/);
  const regionEnd = navIndex > playerStart && playerStart >= 0 ? navIndex : source.length;
  const region = playerStart >= 0 ? source.slice(playerStart, regionEnd) : source;
  const labels = playerNavLabels(source);
  const players = [];
  const seen = /* @__PURE__ */ new Set();
  for (const chunk of tabChunks(region)) {
    const found = [];
    collectChunkPlayers(chunk.html, found);
    const label = chunk.tab ? labels.get(chunk.tab) : "";
    for (const url of found) {
      if (seen.has(url)) continue;
      seen.add(url);
      players.push({ url, kind: playerKind(url), label: label || `Server ${players.length + 1}` });
    }
  }
  return players;
}
var OKRU_QUALITY_NAMES = {
  full: "1080p",
  ultra: "2160p",
  quad: "1440p",
  hd: "720p",
  sd: "480p",
  low: "360p",
  lowest: "240p",
  mobile: "240p"
};
function okRuQuality(name) {
  const key = String(name || "").toLowerCase().trim();
  if (OKRU_QUALITY_NAMES[key]) return OKRU_QUALITY_NAMES[key];
  const digits = /(\d{3,4})/.exec(key)?.[1];
  return digits ? `${digits}p` : "HD";
}
function extractOkRuSources(html, playerUrl) {
  const source = String(html || "");
  const optionsMatch = /data-options\s*=\s*(["'])([\s\S]*?)\1/i.exec(source);
  if (!optionsMatch) return null;
  let options = null;
  try {
    options = JSON.parse(optionsMatch[2].replace(/&quot;/g, '"'));
  } catch {
    return null;
  }
  let metadata = options?.flashvars?.metadata;
  if (typeof metadata !== "string") return null;
  try {
    metadata = JSON.parse(metadata);
  } catch {
    return null;
  }
  const sources = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (value, quality) => {
    const url = safeUrl(value, playerUrl);
    if (!url || seen.has(url.href)) return;
    seen.add(url.href);
    sources.push({
      url: url.href,
      type: /\.m3u8(?:[?#]|$)/i.test(url.pathname) ? "hls" : "mp4",
      quality: quality || "HD",
      subtitles: [],
      playerUrl
    });
  };
  for (const video of Array.isArray(metadata.videos) ? metadata.videos : []) push(video?.url, okRuQuality(video?.name));
  push(metadata.ondemandHls, "HD");
  return sources.length ? sources : null;
}
function extractDirectMedia(html) {
  const decoded = decodeHtml(String(html || "")).replace(/\\u0026/gi, "&").replace(/\\u002f/gi, "/").replace(/\\\//g, "/").replace(/\\&/g, "&").replace(/\\"/g, '"');
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  const patterns = [
    /(?:file|src|source|hls|url)\s*[:=]\s*(["'])(https:[\s\S]*?\.(?:m3u8|mp4)(?:\?[^"']*)?)\1/gi,
    /(https:\/\/[^"'\s<>]+\.(?:m3u8|mp4)(?:\?[^"'\s<>]*)?)/gi
  ];
  for (const pattern of patterns) {
    for (const match of decoded.matchAll(pattern)) {
      const url = safeUrl(match[2] || match[1]);
      if (!url || seen.has(url.href) || !/\.(?:m3u8|mp4)$/i.test(url.pathname)) continue;
      seen.add(url.href);
      const quality = /(?:^|[^\d])(\d{3,4})(?:p|(?=\.(?:m3u8|mp4)))/i.exec(match[0])?.[1];
      results.push({
        url: url.href,
        type: url.pathname.toLowerCase().endsWith(".mp4") ? "mp4" : "hls",
        quality: quality ? `${quality}p` : "HD"
      });
    }
  }
  return results;
}
function extractSendVidSources(html, playerUrl) {
  const source = String(html || "");
  const sources = [];
  const seen = /* @__PURE__ */ new Set();
  for (const match of source.matchAll(/<meta\b[^>]*>/gi)) {
    const property = attributeValue(match[0], "property").toLowerCase();
    if (property !== "og:video" && property !== "og:video:url" && property !== "og:video:secure_url") continue;
    const url = safeUrl(attributeValue(match[0], "content"), playerUrl);
    if (url && !seen.has(url.href) && /\.(?:mp4|m3u8)/i.test(url.pathname)) {
      seen.add(url.href);
      sources.push({ url: url.href, type: /\.m3u8$/i.test(url.pathname) ? "hls" : "mp4", quality: "HD" });
    }
  }
  for (const entry of extractDirectMedia(source)) {
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    sources.push(entry);
  }
  return sources.map((entry) => ({ ...entry, subtitles: [], playerUrl }));
}
function extractVidmolySources(html) {
  const source = String(html || "");
  const sourcesBlock = /sources\s*:\s*\[([\s\S]*?)\]/i.exec(source)?.[1] || "";
  const hls = [...sourcesBlock.matchAll(/file\s*:\s*(["'])([\s\S]*?)\1/gi)].map((match) => safeUrl(match[2])).find((url) => url && /\.m3u8$/i.test(url.pathname));
  if (!hls) return null;
  const subtitles = [];
  for (const match of source.matchAll(/file\s*:\s*(["'])([^"']+?\.(?:srt|vtt)(?:\?[^"']*)?)\1\s*,\s*label\s*:\s*(["'])([\s\S]*?)\3/gi)) {
    const url = safeUrl(match[2]);
    if (!url) continue;
    subtitles.push({ url: url.href, language: match[4].trim().toLowerCase(), label: match[4].trim() });
  }
  return [{ url: hls.href, type: "hls", quality: "HD", subtitles }];
}

// src/providers/dozaanimata.js
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
  for (const language of ["ro-RO", "en-US"]) {
    const html = await fetchText(`https://www.themoviedb.org/${path}/${encodeURIComponent(String(id))}?language=${language}`);
    const metadata = html ? extractTmdbMetadata(html) : null;
    if (metadata) return metadata;
  }
  return null;
}
async function searchTitlePage(title, mediaType) {
  const searchUrl = `${DOZAANIMATA_ORIGIN}/?s=${encodeURIComponent(title)}`;
  const html = await fetchText(searchUrl, `${DOZAANIMATA_ORIGIN}/`);
  if (!html) return null;
  const candidate = selectDozaCandidate(extractDozaCandidates(html), { title }, mediaType);
  return candidate ? { ...candidate, searchUrl } : null;
}
async function resolveTitlePage(titles, mediaType) {
  const attempted = /* @__PURE__ */ new Set();
  for (const title of titles) {
    const key = String(title || "").trim().toLowerCase();
    if (!key || attempted.has(key)) continue;
    attempted.add(key);
    const page = await searchTitlePage(title, mediaType);
    if (page) return page;
  }
  return null;
}
function subtitleResult(subtitle, playerUrl) {
  return {
    url: subtitle.url,
    language: subtitle.language || "ro",
    name: subtitle.label || "Subtitrare",
    headers: { Referer: playerUrl, "User-Agent": USER_AGENT }
  };
}
function safeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}
function streamResult(stream, season, episode) {
  const episodeLabel = season == null ? "" : ` • S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
  const subtitles = Array.isArray(stream.subtitles) ? stream.subtitles.map((subtitle) => subtitleResult(subtitle, stream.playerUrl)) : [];
  return {
    title: `DozaAnimata${episodeLabel} • ${stream.quality} • RO`,
    url: stream.url,
    quality: stream.quality,
    language: "ro",
    provider: "DozaAnimata",
    type: stream.type,
    headers: { Referer: stream.playerUrl, Origin: safeOrigin(stream.playerUrl), "User-Agent": USER_AGENT },
    subtitles
  };
}
async function expandHlsVariants(source, playerUrl) {
  const playlist = await fetchText(source.url, playerUrl, PLAYLIST_ACCEPT, 1);
  const variants = playlist ? extractHlsVariants(playlist, source.url) : [];
  if (!variants.length) return [{ ...source, playerUrl }];
  return variants.map((variant) => ({ ...source, url: variant.url, quality: variant.quality, playerUrl }));
}
async function resolvePlayer(player, pageUrl) {
  const kind = player.kind;
  const playerUrl = player.url;
  let sources = [];
  if (kind === "okru") {
    const html = await fetchText(playerUrl, pageUrl);
    sources = html ? extractOkRuSources(html, playerUrl) || [] : [];
  } else if (kind === "sendvid") {
    const html = await fetchText(playerUrl, pageUrl);
    sources = html ? extractSendVidSources(html, playerUrl) : [];
  } else if (kind === "vidmoly") {
    const html = await fetchText(playerUrl, pageUrl);
    sources = html ? extractVidmolySources(html) || [] : [];
  } else if (isResolvableKind(kind)) {
    const html = await fetchText(playerUrl, pageUrl);
    sources = html ? extractDirectMedia(html).slice(0, 2).map((entry) => ({ ...entry, subtitles: [], playerUrl })) : [];
  } else {
    return [];
  }
  const resolved = [];
  const seenOutputs = /* @__PURE__ */ new Set();
  for (const source of sources) {
    if (!source?.url || seenOutputs.has(source.url)) continue;
    const streams = source.type === "hls" ? await expandHlsVariants(source, source.playerUrl || playerUrl) : [{ ...source, playerUrl: source.playerUrl || playerUrl }];
    for (const stream of streams) {
      if (!stream?.url || seenOutputs.has(stream.url)) continue;
      seenOutputs.add(stream.url);
      resolved.push(stream);
    }
  }
  return resolved;
}
async function getStreams(tmdbId, requestedType, season, episode) {
  try {
    const mediaType = normalizeMediaType(requestedType);
    if (mediaType !== "movie" && mediaType !== "tv") return [];
    const seasonNumber = mediaType === "tv" ? Number(season) : null;
    const episodeNumber = mediaType === "tv" ? Number(episode) : null;
    if (mediaType === "tv" && (!Number.isInteger(seasonNumber) || seasonNumber < 0 || !Number.isInteger(episodeNumber) || episodeNumber < 1)) return [];
    const metadata = await resolveTmdbMetadata(tmdbId, mediaType);
    if (!metadata) return [];
    const page = await resolveTitlePage([metadata.title], mediaType);
    if (!page) return [];
    const detailHtml = await fetchText(page.url, page.searchUrl);
    if (!detailHtml) return [];
    let pageUrl = page.url;
    let pageHtml = detailHtml;
    if (mediaType === "tv") {
      const episodeUrl = extractEpisodeUrl(detailHtml, seasonNumber, episodeNumber);
      if (!episodeUrl) return [];
      const episodeHtml = await fetchText(episodeUrl, page.url);
      if (!episodeHtml) return [];
      pageUrl = episodeUrl;
      pageHtml = episodeHtml;
    }
    const resolved = [];
    const seen = /* @__PURE__ */ new Set();
    for (const player of extractDozaPlayers(pageHtml)) {
      for (const source of await resolvePlayer(player, pageUrl)) {
        if (!source?.url || seen.has(source.url)) continue;
        seen.add(source.url);
        resolved.push(source);
      }
    }
    return resolved.map((stream) => streamResult(
      stream,
      mediaType === "tv" ? seasonNumber : null,
      mediaType === "tv" ? episodeNumber : null
    ));
  } catch (error) {
    console.error("DozaAnimata failed:", error && error.message ? error.message : String(error));
    return [];
  }
}
module.exports = { getStreams };
