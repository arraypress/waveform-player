# Contributing to WaveformPlayer

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/waveform-player.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b fix/your-fix-name`

## Development

```bash
# Watch mode (rebuilds on changes)
npm run dev

# Build all formats
npm run build

# Check bundle size
npm run size

# Local server for demo
npm run serve
```

## Pull Requests

- Keep PRs focused on a single change
- Follow the existing code style
- Update documentation if your change affects the public API
- Test across browsers if possible (Chrome, Firefox, Safari)

## Commit Messages

We use conventional commit style:

- `fix:` for bug fixes
- `feat:` for new features
- `docs:` for documentation changes
- `chore:` for maintenance tasks

## Bug Reports

When filing an issue, please include:

- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- A minimal reproduction if possible

## License

By contributing, you agree that your contributions will be licensed under the MIT License.