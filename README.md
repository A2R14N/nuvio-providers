# Nuvio Romanian Providers

Romanian-language stream providers for [Nuvio](https://github.com/NuvioMedia), a media app. This collection adds free, publicly available movie, series, animation, and TV-show sources with Romanian subtitles or dubbing.

## Installation

Add this manifest URL in Nuvio (Settings → Providers → Add):

```text
https://raw.githubusercontent.com/A2R14N/nuvio-providers/ro-main/manifest.json
```

## Included providers

| Provider | Content | Types |
|---|---|---|
| **SiteFilme** | Movies and series with Romanian subtitles | Movies, TV |
| **ClickSud** | Romanian entertainment and reality shows | TV |
| **DeseneFaine** | Cartoons dubbed or subtitled in Romanian | Movies, TV |
| **DeseneleDublate** | Dubbed cartoons from the DeseneleDublate catalog | Movies, TV |
| **DesenFlix** | Dubbed cartoons from DesenFlix | Movies, TV |
| **LuminsAngels** | Asian series and films in Romanian | Movies, TV |
| **VoxFilmeOnline** | Movies with Romanian subtitles | Movies |
| **FSonline** | Movies and series with Romanian subtitles | Movies, TV |
| **DozaAnimata** | Cartoons and anime in Romanian | Movies, TV |
| **SerialeOnline** | Series, films, and anime with Romanian subtitles | Movies, TV |

## Features

- **Automatic matching** — providers resolve a title from its TMDB ID, so playback starts straight from Nuvio's catalog without manual searching
- **Romanian subtitles** — attached automatically when a source provides them
- **Quality selection** — multiple resolutions listed when a source offers them, highest first
- **Multiple servers** — several sources per title where available; if one server is down, another may still play
- **Lightweight and safe** — plain JavaScript bundles with no DRM circumvention; sources that require logins, captchas, or browsers are skipped rather than broken

## Notes

- Availability depends on the upstream sites; a title that worked yesterday may be temporarily unavailable
- Streams are pulled from public sources exactly as the sites serve them to visitors
- Intended for personal use

## Version

Current release: **1.2.0** (10 providers)

Development happens on the private [`ro-dev`](https://github.com/A2R14N/nuvio-providers-dev/tree/ro-dev) branch of [`A2R14N/nuvio-providers-dev`](https://github.com/A2R14N/nuvio-providers-dev).
