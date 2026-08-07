/**
 * enma - Built from src/enma/
 * Generated: 2026-08-07T21:48:51.980Z
 */
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/enma/index.js
var enma_exports = {};
__export(enma_exports, {
  getStreams: () => getStreams
});
module.exports = __toCommonJS(enma_exports);
var PROVIDER_NAME = "Enma";
var API_BASE = "https://api.enma.lol/api";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var API_HEADERS = {
  "User-Agent": USER_AGENT,
  Origin: "https://www.enma.lol",
  Referer: "https://www.enma.lol/",
  Accept: "application/json,text/plain,*/*"
};
var MEGA_ORIGIN = "https://megaplay.buzz";
var CLEAN_BASE = "https://1oe.lostproject.club/anime/";
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
function pickBestMatch(candidates, tmdbTitle) {
  let best = null;
  let bestScore = 0.3;
  for (const c of candidates) {
    let score = Math.max(
      titleSimilarity(c.title, tmdbTitle),
      wordSimilarity(c.title, tmdbTitle)
    );
    if (normalizeTitle(c.title) === normalizeTitle(tmdbTitle))
      score = 1;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return { best, bestScore };
}
var T1 = hexToBytes("ebc327f49399425fbf4976c6db27321b735a365dd697dd28a9c71aca83482d02");
var T2 = hexToBytes("ffbb3494eb998da10c43d2d092f4da7d85901b7023fefc5f5d3067a6a3cdeaa5");
var T3 = hexToBytes("94d4c0eaaf84e994acb266994d520922c52d26ceef30018d758f3dce60f3e82e");
var T4 = hexToBytes("7c7ba4892d4968099b95c723d6e3664f22e3b29d8eb344f4849c884566c22e4c");
function hexToBytes(h) {
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}
var SBOX = (() => {
  const b = hexToBytes("637c777bf26b6fc53001672bfed7ab76ca82c97dfa5947f0add4a2af9ca472c0b7fd9326363ff7cc34a5e5f171d8311504c723c31896059a071280e2eb27b27509832c1a1b6e5aa0523bd6b329e32f8453d100ed20fcb15b6acbbe394a4c58cfd0efaafb434d338545f9027f503c9fa851a3408f929d38f5bcb6da2110fff3d2cd0c13ec5f974417c4a77e3d645d197360814fdc222a908846eeb814de5e0bdbe0323a0a4906245cc2d3ac629195e479e7c8376d8dd54ea96c56f4ea657aae08ba78252e1ca6b4c6e8dd741f4bbd8b8a703eb5664803f60e613557b986c11d9ee1f8981169d98e949b1e87e9ce5528df8ca1890dbfe6426841992d0fb054bb16");
  return b;
})();
function xtime(x) {
  return (x << 1 ^ ((x & 128) >> 7) * 27) & 255;
}
function aesKeySchedule(key32) {
  const sched = new Uint8Array(240);
  sched.set(key32, 0);
  const rcon = hexToBytes("01020408102040801b36");
  let rconIdx = 0;
  for (let i = 32; i < 240; i += 4) {
    let w0 = sched[i - 4], w1 = sched[i - 3], w2 = sched[i - 2], w3 = sched[i - 1];
    if (i % 32 === 0) {
      const tmp = w0;
      w0 = SBOX[w1] ^ rcon[rconIdx++];
      w1 = SBOX[w2];
      w2 = SBOX[w3];
      w3 = SBOX[tmp];
    } else if (i % 32 === 16) {
      w0 = SBOX[w0];
      w1 = SBOX[w1];
      w2 = SBOX[w2];
      w3 = SBOX[w3];
    }
    sched[i] = sched[i - 32] ^ w0;
    sched[i + 1] = sched[i - 31] ^ w1;
    sched[i + 2] = sched[i - 30] ^ w2;
    sched[i + 3] = sched[i - 29] ^ w3;
  }
  return sched;
}
var SHIFT_ROW = [0, 5, 10, 15, 4, 9, 14, 3, 8, 13, 2, 7, 12, 1, 6, 11];
function aesEncryptBlock(block, sched) {
  for (let i = 0; i < 16; i++)
    block[i] ^= sched[i];
  const t = new Uint8Array(16);
  const u = new Uint8Array(16);
  for (let round = 1; round <= 13; round++) {
    for (let i = 0; i < 16; i++)
      t[i] = SBOX[block[i]];
    for (let i = 0; i < 16; i++)
      u[i] = t[SHIFT_ROW[i]];
    for (let c = 0; c < 4; c++) {
      const o = c * 4;
      const b0 = u[o], b1 = u[o + 1], b2 = u[o + 2], b3 = u[o + 3];
      const x = b0 ^ b1 ^ b2 ^ b3;
      u[o] = (xtime(b0 ^ b1) ^ b0 ^ x) & 255;
      u[o + 1] = (xtime(b1 ^ b2) ^ b1 ^ x) & 255;
      u[o + 2] = (xtime(b2 ^ b3) ^ b2 ^ x) & 255;
      u[o + 3] = (xtime(b3 ^ b0) ^ b3 ^ x) & 255;
    }
    const keyOff = round * 16;
    for (let i = 0; i < 16; i++)
      block[i] = u[i] ^ sched[keyOff + i];
  }
  for (let i = 0; i < 16; i++)
    t[i] = SBOX[block[i]];
  for (let i = 0; i < 16; i++)
    u[i] = t[SHIFT_ROW[i]];
  for (let i = 0; i < 16; i++)
    u[i] ^= sched[224 + i];
  block.set(u);
}
function gmul(acc, h) {
  const state = new Uint8Array(16);
  state.set(h);
  const result = new Uint8Array(16);
  for (let bit = 0; bit < 128; bit++) {
    const b = acc[bit >> 3] >> 7 - (bit & 7) & 1;
    if (b) {
      for (let j = 0; j < 16; j++)
        result[j] ^= state[j];
    }
    let carry = state[15] & 1;
    for (let j = 15; j >= 1; j--)
      state[j] = (state[j] >> 1 | (state[j - 1] & 1) << 7) & 255;
    state[0] = state[0] >> 1;
    if (carry)
      state[0] ^= 225;
  }
  return result;
}
function adaDecrypt(input) {
  if (input.length < 28)
    return new Uint8Array(0);
  const key = new Uint8Array(32);
  for (let i2 = 0; i2 < 32; i2++)
    key[i2] = T1[i2] ^ T2[i2] ^ T3[i2] ^ T4[i2];
  const sched = aesKeySchedule(key);
  const nonce = input.slice(0, 12);
  const tag = input.slice(12, 28);
  const ctLen = input.length - 28;
  const ct = input.slice(28);
  const h = new Uint8Array(16);
  aesEncryptBlock(h, sched);
  let gh = new Uint8Array(16);
  let i = 0;
  for (; i + 16 <= ctLen; i += 16) {
    for (let j = 0; j < 16; j++)
      gh[j] ^= ct[i + j];
    gh = gmul(gh, h);
  }
  if (i < ctLen) {
    for (let j = 0; j < ctLen - i; j++)
      gh[j] ^= ct[i + j];
    gh = gmul(gh, h);
  }
  const lenBlock = new Uint8Array(16);
  const bl = ctLen * 8;
  for (let k = 0; k < 8; k++)
    lenBlock[15 - k] = Math.floor(bl / Math.pow(256, k)) % 256;
  for (let j = 0; j < 16; j++)
    gh[j] ^= lenBlock[j];
  gh = gmul(gh, h);
  const j0 = new Uint8Array(16);
  j0.set(nonce, 0);
  j0[15] = 1;
  aesEncryptBlock(j0, sched);
  for (let j = 0; j < 16; j++)
    j0[j] ^= gh[j];
  let chk = 0;
  for (let j = 0; j < 16; j++)
    chk |= j0[j] ^ tag[j];
  if (chk !== 0)
    return new Uint8Array(0);
  const out = new Uint8Array(ctLen);
  const counter = new Uint8Array(16);
  counter.set(nonce, 0);
  counter[15] = 1;
  let pos = 0;
  while (pos < ctLen) {
    for (let k = 15; k >= 12; k--) {
      counter[k] = counter[k] + 1 & 255;
      if (counter[k] !== 0)
        break;
    }
    const ks = new Uint8Array(16);
    ks.set(counter);
    aesEncryptBlock(ks, sched);
    const n = Math.min(16, ctLen - pos);
    for (let j = 0; j < n; j++)
      out[pos + j] = ct[pos + j] ^ ks[j];
    pos += n;
  }
  return out;
}
var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function base64ToBytes(b64) {
  const clean = String(b64 || "").replace(/[^A-Za-z0-9+/=]/g, "");
  const len = clean.length;
  const out = new Uint8Array(Math.floor(len * 3 / 4));
  let o = 0;
  let acc = 0;
  let bits = 0;
  for (let i = 0; i < len; i++) {
    const ch = clean[i];
    if (ch === "=")
      break;
    const v = B64.indexOf(ch);
    if (v < 0)
      continue;
    acc = acc << 6 | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = acc >> bits & 255;
    }
  }
  return out.subarray(0, o);
}
function utf8ToString(bytes) {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i++];
    let cp = b0;
    if (b0 >= 240) {
      cp = (b0 & 7) << 18 | (bytes[i] & 63) << 12 | (bytes[i + 1] & 63) << 6 | bytes[i + 2] & 63;
      i += 3;
    } else if (b0 >= 224) {
      cp = (b0 & 15) << 12 | (bytes[i] & 63) << 6 | bytes[i + 1] & 63;
      i += 2;
    } else if (b0 >= 192) {
      cp = (b0 & 31) << 6 | bytes[i] & 63;
      i += 1;
    }
    if (cp <= 65535)
      out += String.fromCharCode(cp);
    else {
      const c = cp - 65536;
      out += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    }
  }
  return out;
}
function decryptEnmaPayload(body) {
  try {
    const pt = adaDecrypt(base64ToBytes(body));
    if (pt.length === 0)
      return null;
    return JSON.parse(utf8ToString(pt));
  } catch (e) {
    console.error("[enma] payload decrypt failed:", e && e.message);
    return null;
  }
}
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
function fetchTmdbDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const isTv = mediaType === "tv" || mediaType === "series";
    const primaryEndpoint = isTv ? "tv" : "movie";
    const secondaryEndpoint = isTv ? "movie" : "tv";
    let url = `https://api.themoviedb.org/3/${primaryEndpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=translations`;
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
        const roTrans = data.translations.translations.find((t) => t.iso_639_1 === "ro");
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
      return null;
    }
  });
}
var PROVIDER = PROVIDER_NAME;
function fetchText(url, headers) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(url, { headers });
      if (!res.ok)
        return null;
      return yield res.text();
    } catch (e) {
      return null;
    }
  });
}
function api(path) {
  return __async(this, null, function* () {
    const text = yield fetchText(`${API_BASE}${path}`, API_HEADERS);
    if (!text)
      return null;
    try {
      return decryptEnmaPayload(text.trim());
    } catch (e) {
      return null;
    }
  });
}
function searchSite(keyword) {
  return __async(this, null, function* () {
    const data = yield api(`/search?keyword=${encodeURIComponent(keyword)}`);
    if (!data || !data.success)
      return [];
    const list = data.results && data.results.data || [];
    return list.filter((it) => it && it.id && it.title).map((it) => ({
      id: it.id,
      dataId: it.data_id,
      title: it.title,
      japaneseTitle: it.japanese_title,
      showType: it.tvInfo && it.tvInfo.showType || (it.adultContent ? "Movie" : "TV"),
      eps: it.tvInfo && (it.tvInfo.eps || it.tvInfo.sub) || 0
    }));
  });
}
function fetchEpisodes(id) {
  return __async(this, null, function* () {
    const data = yield api(`/episodes/${encodeURIComponent(id)}`);
    const results = data && data.results || {};
    const eps = results.episodes || [];
    return { totalEpisodes: results.totalEpisodes || eps.length, episodes: eps };
  });
}
function fetchServers(episodeId, episodeNo) {
  return __async(this, null, function* () {
    const data = yield api(
      `/servers/${encodeURIComponent(episodeId)}?ep=${encodeURIComponent(episodeNo)}`
    );
    const list = data && data.results || [];
    return list.filter((s) => s && s.serverName && s.type);
  });
}
function fetchStream(episodeId, episodeNo, serverName, type) {
  return __async(this, null, function* () {
    const params = `id=${encodeURIComponent(`${episodeId}?ep=${episodeNo}`)}&server=${encodeURIComponent(serverName)}&type=${encodeURIComponent(type)}`;
    const data = yield api(`/stream?${params}`);
    return data && data.results || null;
  });
}
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
function isPlayableHls(url) {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Referer: `${MEGA_ORIGIN}/`,
          Origin: MEGA_ORIGIN
        }
      });
      if (!res.ok)
        return false;
      const text = yield res.text();
      return text.slice(0, 7) === "#EXTM3U";
    } catch (e) {
      return false;
    }
  });
}
function resolveMega(embedUrl) {
  return __async(this, null, function* () {
    try {
      const html = yield fetchText(embedUrl, {
        "User-Agent": USER_AGENT,
        Referer: "https://www.enma.lol/",
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
        return null;
      }
      const jsonText = yield fetchText(`${origin}/stream/getSourcesNew?id=${dataId}`, {
        "User-Agent": USER_AGENT,
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
      const subtitles = (Array.isArray(data.tracks) ? data.tracks : []).filter((t) => t && t.file).map((t) => {
        const label = t.label || "Unknown";
        return { url: t.file, lang: label, language: label, name: label };
      });
      const clean = cleanCdn(url);
      const candidates = [];
      if (clean)
        candidates.push(clean);
      candidates.push(url);
      for (const cand of candidates) {
        if (yield isPlayableHls(cand)) {
          return { url: cand, subtitles, origin };
        }
      }
      return { url, subtitles, origin };
    } catch (e) {
      return null;
    }
  });
}
function searchAndMatchTitles(tmdbData) {
  return __async(this, null, function* () {
    const titles = Array.from(
      new Set([tmdbData.title, tmdbData.originalTitle, tmdbData.titleRo].filter(Boolean))
    );
    const seen = /* @__PURE__ */ new Map();
    for (const t of titles) {
      const query = t.replace(/[:\-–—]/g, " ").trim().slice(0, 60);
      if (!query)
        continue;
      const results = yield searchSite(query);
      for (const r of results) {
        const prev = seen.get(r.id);
        if (!prev || r.title && r.title.length < prev.title.length)
          seen.set(r.id, r);
      }
    }
    return Array.from(seen.values());
  });
}
function pickEntry(candidates, tmdbTitle, isTv) {
  const wantType = isTv ? "TV" : "Movie";
  const { best } = pickBestMatch(candidates, tmdbTitle);
  if (best)
    return best;
  return candidates[0] || null;
}
function resolveEntry(tmdbData, entry, isTv, season, episode) {
  return __async(this, null, function* () {
    const entryId = entry.id;
    const episodesInfo = yield fetchEpisodes(entryId);
    const eps = episodesInfo.episodes;
    if (!isTv) {
      const epNo2 = eps[0] && eps[0].episode_no || 1;
      return { entryId, epNo: epNo2, title: tmdbData.title };
    }
    const epNo = episode || 1;
    return { entryId, epNo, title: tmdbData.title };
  });
}
function buildStream(title, season, episode, isTv, url, subtitles, serverName, type, headers, quality) {
  const kind = "HLS";
  const audio = String(type || "").toLowerCase() === "dub" ? "Dub" : String(type || "").toLowerCase() === "sub" ? "Sub" : "";
  const displayTitle = isTv && season && episode ? `${title} S${season}E${episode}` : title;
  const labelParts = [serverName, kind, audio].filter(Boolean);
  const label = labelParts.length ? labelParts.join(" \xB7 ") : "HLS";
  const reqHeaders = headers || {
    "User-Agent": USER_AGENT,
    Referer: `${MEGA_ORIGIN}/`,
    Origin: MEGA_ORIGIN
  };
  return {
    name: `${PROVIDER} \xB7 ${label}`,
    title: `${displayTitle} ${label}`.trim(),
    url,
    quality: quality || "Auto",
    language: "en",
    headers: reqHeaders,
    behaviorHints: {
      proxyHeaders: {
        request: reqHeaders
      }
    },
    subtitles
  };
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const tmdbData = yield fetchTmdbDetails(tmdbId, mediaType);
      if (!tmdbData)
        return [];
      const isTv = mediaType === "tv" || mediaType === "series";
      const candidates = yield searchAndMatchTitles(tmdbData);
      if (candidates.length === 0)
        return [];
      const entry = pickEntry(candidates, tmdbData.title, isTv);
      if (!entry)
        return [];
      const { entryId, epNo, title } = yield resolveEntry(tmdbData, entry, isTv, season, episode);
      const { episodes } = yield fetchEpisodes(entryId);
      let ep = episodes.find((e) => String(e.episode_no) === String(epNo));
      if (!ep && isTv) {
        ep = episodes.find((e) => String(e.episode_no) === String(episode));
      }
      if (!ep)
        return [];
      const episodeId = ep.id || `${entryId}?ep=${ep.episode_no}`;
      const allServers = yield fetchServers(episodeId, ep.episode_no);
      const servers = allServers.filter(
        (s) => s && String(s.serverName).toUpperCase() === "HD-1"
      );
      if (servers.length === 0)
        return [];
      const streams = [];
      const used = /* @__PURE__ */ new Set();
      for (const server of servers) {
        const key = `${server.type}:${server.serverName}`;
        if (used.has(key))
          continue;
        used.add(key);
        const streamInfo = yield fetchStream(
          episodeId,
          ep.episode_no,
          server.serverName,
          server.type
        );
        const link = streamInfo && streamInfo.streamingLink;
        if (!link || !link.iframe)
          continue;
        const resolved = yield resolveMega(link.iframe);
        if (!resolved || !resolved.url)
          continue;
        streams.push(
          buildStream(
            title,
            season,
            episode,
            isTv,
            resolved.url,
            resolved.subtitles || [],
            server.serverName,
            server.type,
            void 0,
            resolved.quality
          )
        );
      }
      return streams;
    } catch (error) {
      return [];
    }
  });
}
