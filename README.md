# ReadMD

**Lecteur Markdown ultra-léger pour macOS et Windows.** Double-cliquez sur un
fichier `.md`, lisez-le avec un rendu propre et personnalisable. Lecture seule,
aucune édition — pensé pour des collaborateurs non techniques.

> Construit avec [Tauri v2](https://tauri.app) (webview natif, pas Electron) →
> binaire minuscule. Le `.dmg` macOS fait ~4 Mo.

<!-- Capture d'écran (placeholder) : ajoutez docs/screenshot.png -->
<!-- ![ReadMD](docs/screenshot.png) -->

## Fonctionnalités

- **Rendu GFM complet** : titres, paragraphes, listes, **cases à cocher**,
  citations, **tableaux**, liens, images (locales et distantes), séparateurs.
- **Coloration syntaxique** du code (highlight.js, ~40 langages courants).
- **Diagrammes Mermaid** (` ```mermaid `), chargés à la demande ; une erreur de
  syntaxe affiche un encadré sans casser le reste du document.
- **Personnalisation** : couleurs des titres / sous-titres / texte / liens,
  police du corps et du code, taille de police, largeur de lecture — aperçu en
  direct et **sauvegardé sur disque**.
- **Thème clair / sombre**, suit le système ou forcé manuellement.
- **Ouverture** : double-clic (association `.md`/`.markdown`), glisser-déposer,
  bouton « Ouvrir », ou en ligne de commande (`readmd fichier.md`).
- **Rechargement à chaud** : le rendu se met à jour si le fichier change sur disque.
- **Liens externes** ouverts dans le navigateur par défaut, pas dans la fenêtre.
- **Sécurité** : tout le HTML rendu est nettoyé par DOMPurify, CSP stricte,
  permissions Tauri réduites au minimum.

## Installation (utilisateurs)

1. Téléchargez le fichier correspondant à votre système depuis la page
   [Releases](../../releases) :
   - **macOS** : `ReadMD_x.y.z_aarch64.dmg` (Apple Silicon).
   - **Windows** : `ReadMD_x.y.z_x64-setup.exe` (NSIS) ou `ReadMD_x.y.z_x64_en-US.msi`.
2. Ouvrez le fichier et glissez **ReadMD** dans vos Applications.
3. Lancez ReadMD, puis ouvrez n'importe quel `.md`.

> **macOS — note Gatekeeper.** Les binaires des Releases ne sont pas signés tant
> qu'un compte Apple Developer n'est pas configuré (voir CI). Si macOS bloque
> l'ouverture (« développeur non identifié »), faites un clic droit → *Ouvrir*,
> ou retirez l'attribut de quarantaine :
> ```bash
> xattr -dr com.apple.quarantine /Applications/ReadMD.app
> ```

## Développement

**Prérequis** : [Node ≥ 18](https://nodejs.org), [pnpm](https://pnpm.io),
[Rust (stable)](https://www.rust-lang.org/tools/install), et les
[prérequis Tauri](https://tauri.app/start/prerequisites/) de votre OS
(sur macOS : Xcode Command Line Tools).

```bash
pnpm install          # dépendances JS
pnpm tauri dev        # lance l'app en mode développement
pnpm tauri build      # produit les installeurs (.dmg / .msi / .exe)
```

Gates qualité :

```bash
pnpm typecheck        # TypeScript strict
pnpm lint             # ESLint
pnpm test             # tests unitaires (vitest)
# côté Rust (depuis src-tauri/) :
cargo clippy --all-targets -- -D warnings
cargo test
```

### Architecture

- **Frontend** : React + TypeScript + Vite. Le rendu vit dans
  `src/lib/markdown.ts` (markdown-it → highlight.js → **DOMPurify**) ; Mermaid
  est isolé en lazy dans `src/lib/mermaid.ts`. Tout le thème passe par des
  variables CSS (`src/styles/theme.css`) que le panneau de réglages modifie.
- **Backend** : Rust (`src-tauri/`). Une seule commande de lecture
  (`read_markdown`, vérifie l'extension — pas d'accès disque large), un watcher
  de fichier (`notify`), et la réception du fichier au lancement (arg CLI sous
  Windows, `RunEvent::Opened` sous macOS).
- **Persistance** des préférences via `tauri-plugin-store` (JSON dans le dossier
  de config de l'app).

## Roadmap

**Livré (V1)** : rendu GFM, Mermaid, personnalisation, thème clair/sombre,
ouverture (double-clic / drag&drop / dialog / CLI), reload à chaud, liens externes.

**Hors périmètre V1** (structure prévue pour les ajouter sans refonte) :
édition, sauvegarde, multi-onglets, export PDF.

**Phase 2 (idée future)** : extension **Quick Look / Spotlight** native macOS
(`.appex` en Swift via Xcode) pour un aperçu du rendu directement dans le
Finder/Spotlight. Hors périmètre actuel car non géré par Tauri, spécifique
macOS, et nécessite signature Apple. Référence open source :
[QLMarkdown](https://github.com/sbarex/QLMarkdown).

## Licence

[MIT](LICENSE) — usage, modification et redistribution libres (y compris
commercial), à condition de conserver la notice de copyright.
© 2026 ReadMD contributors.
