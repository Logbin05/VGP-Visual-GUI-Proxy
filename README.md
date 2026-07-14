# VGP — Visual GUI Proxy

Desktop GUI for creating, editing, validating and test-connecting proxy
configuration files (SOCKS5 / HTTP / HTTPS / Shadowsocks / Transparent /
Reverse), built with Tauri 2 + React.

> **alpha-release** — actively developed, some features are UI-only where the
> backend doesn't support them yet (see [Known limitations](#known-limitations)).

- GitHub: [github.com/Logbin05](https://github.com/Logbin05)
- Telegram: [t.me/kernel1panic](https://t.me/kernel1panic)

## Features

- **Configs** — pick a directory, see every config file in it with live
  validation status. Files that fail to parse are shown with the reason
  instead of silently disappearing.
- **Editor** — Form and Raw views of the same config, always in sync.
  - Form: full nested schema (server, auth, timeouts, limits, TLS, network,
    DNS, logging, metrics, protocol-specific options), grouped into
    navigable sections with inline hints.
  - Raw: CodeMirror-based editor with syntax highlighting, search, code
    folding and a VSCode-style status bar. Format (YAML/JSON/TOML) is
    detected from the file's own extension, not chosen manually.
  - Save in place or Save As; opens existing files directly from the file
    list, Configs, or Start's "recent files".
- **Validation** — runs the real compatibility checker against a config file
  and lists errors/warnings/info with the exact message from the backend.
- **Test Runner** — performs a real SOCKS5 handshake + CONNECT through the
  proxy defined in a config (or a manually entered address), against any
  target host or IP, with optional username/password auth. Distinguishes
  "proxy unreachable" from "proxy reachable but couldn't reach the target".
- **Settings** — theme (dark/light/system), accent color, and UI density are
  all real (backed by CSS custom properties + `localStorage`), plus language
  switching (ru/en) and an About section with update checking.
- Custom right-click context menus in Editor, Test and Validation; the
  webview's default context menu is disabled everywhere else.
- Auto-updater wired to `tauri-plugin-updater`, checking once a day plus a
  manual "Check for updates" button, with an OS notification and in-app
  banner when a new version is found.

## Known limitations

- **INI is not supported.** It appears in file pickers for consistency, but
  `rust-ini` has no serde-based (de)serialization for arbitrarily nested
  structs like `ProxyConfig`, so opening/saving `.ini` currently returns a
  clear "unsupported format" error rather than silently failing.
- **Test Runner** only measures TCP connect + SOCKS5 handshake/CONNECT
  timing — no throughput measurement, no step-by-step log beyond the final
  result, and the config's own timeouts aren't applied yet (the frontend
  applies its own 15s client-side timeout as a stopgap).
- **No version history / git integration** for config files.
- **Auto-updater needs a published release to do anything.** The plugin is
  fully wired (signing key, endpoint pointing at
  `github.com/Logbin05/VGP/releases/latest/download/latest.json`,
  notification + relaunch flow) but until an actual signed release with a
  `latest.json` manifest is published there, every check will correctly
  report "no update available".

## Tech stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Zustand, react-i18next,
  CodeMirror 6, Vite.
- **Backend**: Rust, Tauri 2. Config parsing via `serde_yaml` / `serde_json` /
  `toml`; proxy testing via raw `tokio` TCP + hand-rolled SOCKS5.

## Development

Requires [Bun](https://bun.sh) and the [Rust toolchain](https://rustup.rs).

```bash
bun install

# run the app in dev mode (hot-reloads the frontend)
bun tauri dev

# type-check + build the frontend only
bun run build

# build a distributable app bundle
bun tauri build
```

## Project structure

```text
src/                    React frontend
  pages/                One component per screen (Start, Configs, Editor, Validation, Test, Settings)
  components/            Shared UI (ContextMenu, Toggle, TopBar, UpdateBanner, ...)
  lib/                    Non-UI logic (Tauri command wrappers, config (de)serialization, preferences, updater)
  store/                  Zustand app store (current page, loaded config entries, validation cache)
  lang/locales/           ru/en translations

src-tauri/src/
  commands.rs             All #[tauri::command] handlers
  config/                 ProxyConfig model, format load/save, directory scanning
  validation/             Compatibility checker
  proxy/                  SOCKS5 handshake + connection testing
```
