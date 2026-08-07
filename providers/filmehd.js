/**
 * filmehd - Built from src/filmehd/
 * Generated: 2026-08-07T21:48:51.984Z
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

// src/filmehd/index.js
var SITE_URL = "https://filmehd.to";
var TMDB_URL = "https://api.themoviedb.org/3";
var TMDB_API_KEY = "31031042b5deb218a10d70a4c01ea934";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";
var PAGE_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: `${SITE_URL}/`,
  "User-Agent": USER_AGENT
};
var SERVER_LABELS = ["Filesun", "VOE", "DoodStream"];
var DOOD_DOMAINS = [
  "dood",
  "ds2play",
  "ds2video",
  "playmogo",
  "d0o0d",
  "do0od",
  "d000d",
  "d0000d",
  "vidply",
  "all3do",
  "do7go",
  "dsvplay"
];
function fetchText(url, options) {
  return __async(this, null, function* () {
    const request = Object.assign({}, options || {}, {
      redirect: "follow",
      skipSizeCheck: true,
      cfKiller: true
    });
    request.headers = Object.assign({}, PAGE_HEADERS, request.headers || {});
    let response = yield fetch(url, request);
    if ((response.status === 403 || response.status === 503) && typeof globalThis.Cloudflare !== "undefined" && globalThis.Cloudflare.solve) {
      const challengeUrl = response.url || url;
      const solvedHeaders = yield globalThis.Cloudflare.solve(challengeUrl);
      response = yield fetch(
        challengeUrl,
        Object.assign({}, request, {
          headers: Object.assign({}, request.headers, solvedHeaders || {})
        })
      );
    }
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url}`);
    return { html: yield response.text(), url: response.url || url };
  });
}
function fetchJson(url) {
  return __async(this, null, function* () {
    const response = yield fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT }
    });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}: ${url}`);
    return response.json();
  });
}
function decodeHtml(value) {
  return String(value || "").replace(/&amp;/gi, "&").replace(/&#0*39;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}
function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
function attribute(tag, name) {
  const match = String(tag || "").match(
    new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i")
  );
  return match ? decodeHtml(match[2]) : "";
}
function absoluteUrl(value, base) {
  if (!value)
    return "";
  try {
    return new URL(decodeHtml(value), base).toString();
  } catch (_) {
    return "";
  }
}
function slugify(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}
function normalizeTitle(value) {
  return slugify(value).replace(/-/g, "");
}
function cleanMediaUrl(value) {
  return decodeHtml(String(value || "")).replace(/\\u0026/g, "&").replace(/\\\//g, "/").trim();
}
function directMediaUrl(html) {
  const match = String(html || "").match(
    /https?:\\?\/\\?\/[^"'<>\s]+\.(?:m3u8|mp4)[^"'<>\s]*/i
  );
  return match ? cleanMediaUrl(match[0]) : "";
}
function playerOptions(html) {
  const options = [];
  const pattern = /<li\b[^>]*class=["'][^"']*dooplay_player_option[^"']*["'][^>]*>[\s\S]*?<\/li>/gi;
  let match;
  while (match = pattern.exec(String(html || ""))) {
    const url = absoluteUrl(attribute(match[0], "data-vs"), SITE_URL);
    if (url)
      options.push({ url, label: stripTags(match[0]) });
  }
  return options;
}
function moviePlayers(html) {
  return playerOptions(html).map((option) => {
    const label = SERVER_LABELS.find(
      (server) => new RegExp(server, "i").test(option.label)
    );
    return label ? { url: option.url, host: label } : null;
  }).filter(Boolean);
}
function seriesPlayers(html, episode) {
  const source = String(html || "");
  const headings = [
    /SERVER\s*1\s*-\s*Filesun/i,
    /SERVER\s*2\s*-\s*VOE/i,
    /SERVER\s*3\s*-\s*Doodstream/i
  ];
  return headings.map((heading, index) => {
    const match = heading.exec(source);
    if (!match)
      return null;
    const start = match.index;
    let end = source.length;
    for (let next = index + 1; next < headings.length; next += 1) {
      const nextMatch = headings[next].exec(source.slice(start + match[0].length));
      if (nextMatch) {
        end = start + match[0].length + nextMatch.index;
        break;
      }
    }
    const option = playerOptions(source.slice(start, end))[episode - 1];
    return option ? { url: option.url, host: SERVER_LABELS[index] } : null;
  }).filter(Boolean);
}
function anchors(html, base) {
  const links = [];
  const pattern = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  let match;
  while (match = pattern.exec(String(html || ""))) {
    const href = absoluteUrl(attribute(match[0], "href"), base);
    if (!href)
      continue;
    links.push({
      href,
      text: [
        stripTags(match[0]),
        attribute(match[0], "title"),
        attribute(match[0], "alt"),
        href
      ].filter(Boolean).join(" ")
    });
  }
  return links;
}
function mediaMetadata(tmdbId, mediaType) {
  return __async(this, null, function* () {
    if (typeof tmdbId === "object" && tmdbId !== null && tmdbId.title) {
      return {
        title: tmdbId.title,
        year: tmdbId.year || ""
      };
    }
    const id = typeof tmdbId === "object" ? tmdbId.tmdbId || tmdbId.id : tmdbId;
    const data = yield fetchJson(
      `${TMDB_URL}/${mediaType}/${encodeURIComponent(String(id))}?api_key=${TMDB_API_KEY}`
    );
    return {
      title: data.title || data.name || "",
      year: (data.release_date || data.first_air_date || "").split("-")[0]
    };
  });
}
function findMediaPage(metadata, mediaType, season) {
  return __async(this, null, function* () {
    const slug = slugify(metadata.title);
    const directUrl = mediaType === "tv" ? `${SITE_URL}/seriale/${slug}-sezonul-${season}/` : `${SITE_URL}/filme/${slug}-${metadata.year}/`;
    try {
      const direct = yield fetchText(directUrl);
      if (!/<title>[^<]*(?:404|page not found)/i.test(direct.html)) {
        return direct.url;
      }
    } catch (_) {
    }
    const search = yield fetchText(`${SITE_URL}/?s=${encodeURIComponent(metadata.title)}`);
    const wanted = normalizeTitle(metadata.title);
    const matches = anchors(search.html, search.url).filter((link) => {
      const normalized = normalizeTitle(link.text);
      if (!normalized.includes(wanted))
        return false;
      if (mediaType === "tv") {
        return link.href.includes("/seriale/") && link.href.includes(`sezonul-${season}`);
      }
      return link.href.includes("/filme/") && (!metadata.year || link.text.includes(String(metadata.year)));
    });
    return matches.length ? matches[0].href : "";
  });
}
function decodeBase64(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const input = String(value || "").replace(/\s+/g, "").replace(/=+$/, "");
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (let index = 0; index < input.length; index += 1) {
    const digit = alphabet.indexOf(input[index]);
    if (digit < 0)
      return "";
    buffer = buffer << 6 | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode(buffer >> bits & 255);
    }
  }
  return output;
}
function decodeVoeConfig(payload) {
  try {
    const rot13 = payload.replace(/[a-zA-Z]/g, (character) => {
      const start = character <= "Z" ? 65 : 97;
      return String.fromCharCode(
        (character.charCodeAt(0) - start + 13) % 26 + start
      );
    });
    const normalized = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"].reduce(
      (value, marker) => value.split(marker).join("_"),
      rot13
    );
    const first = decodeBase64(normalized.split("_").join(""));
    if (!first)
      return null;
    const shifted = Array.from(
      first,
      (character) => String.fromCharCode(character.charCodeAt(0) - 3)
    ).join("");
    const json = decodeBase64(shifted.split("").reverse().join(""));
    return json ? JSON.parse(json) : null;
  } catch (_) {
    return null;
  }
}
function resolveVoe(embedUrl, referer) {
  return __async(this, null, function* () {
    let page = yield fetchText(embedUrl, {
      headers: Object.assign({}, PAGE_HEADERS, { Referer: referer })
    });
    const redirect = page.html.match(
      /window\.location\.href\s*=\s*["']([^"']+)["']/i
    );
    if (redirect) {
      page = yield fetchText(absoluteUrl(redirect[1], page.url), {
        headers: Object.assign({}, PAGE_HEADERS, { Referer: page.url })
      });
    }
    const configMatch = page.html.match(
      /<script\s+type=["']application\/json["']>\s*(\[[^\]]+\])\s*<\/script>/i
    );
    if (configMatch) {
      const values = JSON.parse(configMatch[1]);
      const config = values[0] ? decodeVoeConfig(values[0]) : null;
      const source = config && (config.source || config.direct_access_url || config.fallback);
      if (source && /^https?:\/\//i.test(source)) {
        return { url: cleanMediaUrl(source), embedUrl: page.url };
      }
    }
    const direct = directMediaUrl(page.html);
    return direct ? { url: direct, embedUrl: page.url } : null;
  });
}
function isDoodUrl(url) {
  const lower = String(url || "").toLowerCase();
  return DOOD_DOMAINS.some((domain) => lower.includes(domain));
}
function resolveDood(embedUrl, referer) {
  return __async(this, null, function* () {
    const page = yield fetchText(embedUrl, {
      headers: Object.assign({}, PAGE_HEADERS, { Referer: referer })
    });
    const pass = page.html.match(/\/pass_md5\/[^\s"'<>\\]+/i);
    if (!pass)
      return null;
    const origin = new URL(page.url).origin;
    const response = yield fetch(`${origin}${pass[0]}`, {
      headers: Object.assign({}, PAGE_HEADERS, { Referer: page.url }),
      skipSizeCheck: true,
      cfKiller: true
    });
    if (!response.ok)
      return null;
    const prefix = (yield response.text()).trim();
    const tokenMatch = page.html.match(/\?token=([a-zA-Z0-9]+)/i);
    const token = tokenMatch ? tokenMatch[1] : pass[0].split("/").pop();
    const random = Math.random().toString(36).substring(2, 12);
    return {
      url: `${prefix}${random}?token=${token}&expiry=${Date.now()}`,
      embedUrl: page.url
    };
  });
}
function resolvePlayer(player, pageUrl) {
  return __async(this, null, function* () {
    const wrapper = yield fetchText(player.url, {
      headers: Object.assign({}, PAGE_HEADERS, { Referer: pageUrl })
    });
    let resolved = null;
    const direct = directMediaUrl(wrapper.html);
    if (direct)
      resolved = { url: direct, embedUrl: wrapper.url };
    if (!resolved && (/voe\./i.test(wrapper.url) || player.host === "VOE")) {
      resolved = yield resolveVoe(wrapper.url, pageUrl);
    }
    if (!resolved && (isDoodUrl(wrapper.url) || player.host === "DoodStream")) {
      resolved = yield resolveDood(wrapper.url, pageUrl);
    }
    if (!resolved || !resolved.url)
      return null;
    const origin = new URL(resolved.embedUrl || wrapper.url).origin;
    return {
      url: resolved.url,
      host: player.host,
      headers: {
        "User-Agent": USER_AGENT,
        Referer: `${origin}/`,
        Origin: origin
      }
    };
  });
}
function streamType(url) {
  if (/\.m3u8(?:$|[?#])/i.test(url))
    return "application/x-mpegURL";
  return "video/mp4";
}
function extractStreams(pageUrl, metadata, mediaType, season, episode) {
  return __async(this, null, function* () {
    const page = yield fetchText(pageUrl);
    const players = mediaType === "tv" ? seriesPlayers(page.html, Number(episode)) : moviePlayers(page.html);
    const resolved = yield Promise.all(
      players.map((player) => __async(this, null, function* () {
        try {
          return yield resolvePlayer(player, page.url);
        } catch (error) {
          console.log(`[FilmeHD] ${player.host} unavailable: ${error.message}`);
          return null;
        }
      }))
    );
    const seen = {};
    return resolved.filter((item) => {
      if (!item || !item.url || seen[item.url])
        return false;
      seen[item.url] = true;
      return true;
    }).map((item) => ({
      name: `FilmeHD - ${item.host}`,
      title: mediaType === "tv" ? `${metadata.title} S${season}E${episode} \xB7 ${item.host}` : `${metadata.title} \xB7 ${item.host}`,
      url: item.url,
      quality: /\.m3u8(?:$|[?#])/i.test(item.url) ? "1080p" : "Unknown",
      language: "ro",
      type: streamType(item.url),
      headers: item.headers
    }));
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const normalizedType = mediaType === "series" ? "tv" : mediaType;
    if (!tmdbId || normalizedType !== "movie" && normalizedType !== "tv") {
      return [];
    }
    if (normalizedType === "tv" && (!Number.isInteger(Number(season)) || Number(season) < 1 || !Number.isInteger(Number(episode)) || Number(episode) < 1)) {
      return [];
    }
    try {
      const metadata = yield mediaMetadata(tmdbId, normalizedType);
      if (!metadata.title)
        return [];
      const pageUrl = yield findMediaPage(metadata, normalizedType, Number(season));
      if (!pageUrl) {
        console.log(`[FilmeHD] No matching page for ${metadata.title}`);
        return [];
      }
      return extractStreams(
        pageUrl,
        metadata,
        normalizedType,
        Number(season),
        Number(episode)
      );
    } catch (error) {
      console.error(`[FilmeHD] Error: ${error.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
