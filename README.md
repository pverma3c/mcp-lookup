# mcp-lookup

An Electron + React + TypeScript desktop app for discovering, connecting to, and chatting against MCP (Model Context Protocol) servers.

## Install

### Linux (recommended: AppImage)

The **AppImage** is the recommended Linux build — it's a single self-contained file, runs without root, and supports in-app auto-updates.

1. Download `mcp-lookup-<version>.AppImage` from the [latest release](https://github.com/pverma3c/mcp-lookup/releases/latest).
2. Make it executable and run:
   ```bash
   chmod +x mcp-lookup-*.AppImage
   ./mcp-lookup-*.AppImage
   ```

The app checks for new versions on launch; when one is published, an "Update available" indicator appears in the title bar with download + restart-to-install actions.

### Linux (.deb, alternative)

Prefer your package manager? Grab `mcp-lookup_<version>_amd64.deb` from the same release page and install with:

```bash
sudo dpkg -i mcp-lookup_*_amd64.deb
sudo apt-get install -f
```

Note: `.deb` installs live in `/opt/` and require `sudo` to upgrade, so the in-app updater will surface new versions but cannot install them automatically — it will open the release page instead.

### Windows / macOS

Download the latest `setup.exe` (Windows) or `.dmg` (macOS) from the [releases page](https://github.com/pverma3c/mcp-lookup/releases/latest). In-app auto-updates work on both.

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
npm install
npm run dev
```

### Build

```bash
npm run build:linux   # AppImage + .deb
npm run build:win     # NSIS installer
npm run build:mac     # DMG
```

### Release (publishes to GitHub)

```bash
GH_TOKEN=<your-fine-grained-token> npm run release:linux
```

This builds the artifacts and uploads them to a draft GitHub release matching the `package.json` version. Open the release on GitHub, write notes, and click **Publish release** to roll it out to existing users via the in-app updater.

The token needs **Contents: Read and write** on this repo. Don't commit it — keep it in `.env` (already gitignored) or pass it inline.

## Recommended IDE setup

- [VS Code](https://code.visualstudio.com/) with [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) extensions.
