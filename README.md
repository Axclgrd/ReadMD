<div align="center">

<img src="src-tauri/icons/icon.png" width="120" height="120" alt="Logo ReadMD" />

# ReadMD

**Lecteur Markdown ultra-léger pour macOS & Windows.**

Double-cliquez sur un `.md`, lisez-le avec un rendu propre et personnalisable. Lecture seule, aucune édition.

[![Plateformes](https://img.shields.io/badge/macOS%20%7C%20Windows-1a56db)](https://github.com/Axclgrd/ReadMD/releases)
[![Licence MIT](https://img.shields.io/badge/licence-MIT-3fb950)](LICENSE)
[![Built with Tauri v2](https://img.shields.io/badge/Tauri-v2-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![Build](https://github.com/Axclgrd/ReadMD/actions/workflows/build.yml/badge.svg)](https://github.com/Axclgrd/ReadMD/actions/workflows/build.yml)
[![Release](https://img.shields.io/github/v/release/Axclgrd/ReadMD?include_prereleases&label=release)](https://github.com/Axclgrd/ReadMD/releases)

</div>

---

ReadMD est un **viewer Markdown** minimaliste construit avec [Tauri v2](https://tauri.app) :
webview natif, pas de navigateur embarqué → un binaire de **~4 Mo** (là où Electron en ferait ~100).
Pensé pour que des collaborateurs **non techniques** ouvrent un `.md` d'un simple double-clic.

<!-- 📸 Capture d'écran : déposez votre image dans docs/screenshot.png puis décommentez ↓
<div align="center"><img src="docs/screenshot.png" width="760" alt="Aperçu de ReadMD" /></div>
-->

## Sommaire

- [Fonctionnalités](#-fonctionnalités)
- [Installation](#-installation-utilisateurs)
- [Développement](#-développement)
- [Architecture](#-architecture)
- [Roadmap](#-roadmap)
- [Contribuer](#-contribuer)
- [Licence](#-licence)

## ✨ Fonctionnalités

- 📄 **Rendu GFM complet** — titres, listes, **cases à cocher**, citations, **tableaux**, liens, images (locales et distantes), séparateurs.
- 🎨 **Coloration syntaxique** du code (highlight.js, ~40 langages courants).
- 📊 **Diagrammes Mermaid** (` ```mermaid `), chargés à la demande ; une erreur de syntaxe affiche un encadré sans casser le document.
- 🖌️ **Personnalisation** — couleurs (titres, sous-titres, texte, liens), polices, taille, largeur de lecture ; aperçu en direct, **sauvegardé sur disque**.
- 🌗 **Thème clair / sombre**, suit le système ou forcé manuellement.
- 📂 **Ouverture multiple** — double-clic (association `.md`/`.markdown`), glisser-déposer, bouton « Ouvrir », ou ligne de commande.
- ♻️ **Rechargement à chaud** — le rendu se met à jour quand le fichier change sur disque.
- 🔗 **Liens externes** ouverts dans le navigateur par défaut.
- 🔒 **Sécurité** — tout le HTML est nettoyé par DOMPurify, CSP stricte, permissions Tauri minimales.

## ⬇️ Installation (utilisateurs)

Téléchargez la dernière version depuis la page **[Releases](https://github.com/Axclgrd/ReadMD/releases)** :

| OS | Fichier |
| --- | --- |
| **macOS** (Apple Silicon) | `ReadMD_x.y.z_aarch64.dmg` |
| **Windows** | `ReadMD_x.y.z_x64-setup.exe` (NSIS) ou `…_x64_en-US.msi` |

Ouvrez le fichier, installez l'app, puis ouvrez n'importe quel `.md`.

> [!NOTE]
> Les builds ne sont **pas signés** (pas de compte Apple/Windows Developer). L'OS peut afficher un avertissement la première fois :
> - **macOS** : clic droit sur l'app → *Ouvrir* (ou `xattr -dr com.apple.quarantine /Applications/ReadMD.app`).
> - **Windows** : *Informations complémentaires* → *Exécuter quand même*.

## 🛠️ Développement

**Prérequis** : [Node ≥ 18](https://nodejs.org), [pnpm](https://pnpm.io), [Rust stable](https://www.rust-lang.org/tools/install) et les [prérequis Tauri](https://tauri.app/start/prerequisites/) de votre OS.

```bash
git clone https://github.com/Axclgrd/ReadMD.git
cd ReadMD
pnpm install
pnpm tauri dev        # développement (hot reload)
pnpm tauri build      # installeurs (.dmg / .msi / .exe)
```

Gates qualité :

```bash
pnpm typecheck && pnpm lint && pnpm test          # frontend
cargo clippy --all-targets -- -D warnings         # depuis src-tauri/
cargo test                                        # depuis src-tauri/
```

## 🧱 Architecture

| Couche | Tech | Rôle |
| --- | --- | --- |
| **Backend** | Rust (`src-tauri/`) | Fenêtre native, lecture fichier (`read_markdown`, extension vérifiée), watcher (`notify`), ouverture au lancement (arg CLI / `RunEvent::Opened`). |
| **Frontend** | React + TypeScript + Vite (`src/`) | UI, rendu markdown-it → highlight.js → **DOMPurify**, Mermaid (lazy), panneau de réglages. |
| **Thème** | Variables CSS (`src/styles/theme.css`) | Toute la personnalisation passe par des variables, modifiées en direct par le panneau. |
| **Prefs** | `tauri-plugin-store` | Réglages persistés en JSON dans le dossier de config de l'app. |

## 🗺️ Roadmap

- **V1 (livré)** : rendu GFM, Mermaid, personnalisation, thème clair/sombre, ouverture multi-source, reload à chaud, liens externes.
- **Hors V1** (structure prévue) : édition, multi-onglets, export PDF.
- **Idée future** : extension **Quick Look / Spotlight** native macOS (`.appex` Swift) pour un aperçu dans le Finder — hors périmètre Tauri, nécessite une signature Apple. Réf : [QLMarkdown](https://github.com/sbarex/QLMarkdown).

## 🤝 Contribuer

Les contributions sont bienvenues !

1. *Forkez* le dépôt et créez une branche (`git checkout -b feat/ma-fonctionnalite`).
2. Vérifiez que les gates passent (`pnpm typecheck && pnpm lint && pnpm test`).
3. Ouvrez une *Pull Request* décrivant le changement.

Pour un bug ou une idée, ouvrez une [issue](https://github.com/Axclgrd/ReadMD/issues).

## 📄 Licence

[MIT](LICENSE) — usage, modification et redistribution libres (y compris commercial), à condition de conserver la notice de copyright. © 2026 ReadMD contributors.

<div align="center"><sub>Construit avec ❤️ et <a href="https://tauri.app">Tauri</a>.</sub></div>
