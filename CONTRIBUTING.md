# Contributing to BuzzChat 🐝

First off, thanks for taking the time to contribute! 🎉

## How Can I Contribute?

### 🐛 Reporting Bugs
- Use the [bug report template](https://github.com/JakeLiuMe/BuzzChat/issues/new?template=bug_report.yml)
- Include browser version, extension version, and platform (Whatnot/YouTube/etc.)
- Screenshots or screen recordings help a lot!

### 💡 Suggesting Features
- Use the [feature request template](https://github.com/JakeLiuMe/BuzzChat/issues/new?template=feature_request.yml)
- Explain the use case — why would this help live sellers?

### 🔧 Pull Requests

1. **Fork** the repo
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/BuzzChat.git`
3. **Create a branch**: `git checkout -b feature/amazing-feature`
4. **Install dependencies**: `npm install`
5. **Make your changes**
6. **Run tests**: `npm test`
7. **Run linter**: `npm run lint`
8. **Commit**: `git commit -m 'Add amazing feature'`
9. **Push**: `git push origin feature/amazing-feature`
10. **Open a PR**

### 📝 Code Style

- Use ES6+ features
- 2-space indentation
- Single quotes for strings
- Semicolons required
- Run `npm run lint:fix` before committing

### 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:popup
npm run test:e2e
npm run test:unit

# Run with visible browser
npm run test:headed
```

### 📁 Project Structure

```
src/
├── popup/          # Extension popup UI
├── scripts/        # Content scripts (runs on pages)
├── background/     # Service worker
└── lib/            # Shared utilities
```

## 🏷️ Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting (no code change)
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

Examples:
```
feat: add emoji picker to message composer
fix: timer messages not sending on YouTube
docs: update installation instructions
```

## 📋 Issue Labels

| Label | Description |
|-------|-------------|
| `bug` | Something isn't working |
| `enhancement` | New feature request |
| `good first issue` | Good for newcomers |
| `help wanted` | Extra attention needed |
| `documentation` | Docs improvements |

## 💬 Questions?

- Open a [discussion](https://github.com/JakeLiuMe/BuzzChat/discussions)
- Check existing issues first

---

Thank you for helping make BuzzChat better! 🐝
