# Nuvio Romanian Providers

A collection of Romanian-language streaming providers for Nuvio.

This repository contains the ready-to-use, minified provider bundles. Development
sources and build tooling are maintained separately.

## Installation

Add the following manifest URL in Nuvio:

```text
https://raw.githubusercontent.com/A2R14N/nuvio-providers/main/manifest.json
```

In Nuvio, open **Settings → Plugins**, add the URL, refresh the plugin list, and
enable the providers you want to use.

## Available providers

- Clicksud
- Desenefaine
- DeseneDublate
- DozaAnimata
- FSOnline
- GoFilme
- Lumins Angels
- SiteFilme
- VeziHD
- VoxFilmeOnline
- XFilme

Provider availability can change when third-party websites update their pages or
players.

## Repository structure

```text
.
├── manifest.json
└── providers/
    └── *.js
```

`manifest.json` is the provider registry used by Nuvio. The `providers` directory
contains the compiled and minified JavaScript bundles referenced by the manifest.

## Disclaimer

This repository does not host or distribute movies, series, or other media.
Providers only retrieve links exposed by third-party websites. Users are
responsible for complying with the laws and terms applicable in their country.

