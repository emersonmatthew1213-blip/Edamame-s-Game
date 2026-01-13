# Hawkins Explorer — 1980s (GitHub Pages)

A small retro web game (HTML/CSS/JS) that lets you explore a tiny Hawkins, Indiana map.

## Files
- index.html
- styles.css
- script.js

## Local testing
Open `index.html` in a browser (or use a local static server like `python -m http.server`).

## Deploy to GitHub Pages (project site)
Option A — gh-pages branch (recommended):
1. Create a branch called `gh-pages` and push the files there, or push main and create `gh-pages` with the same content.
2. In the repository Settings → Pages, set Source to the `gh-pages` branch and folder `/ (root)`.
3. Wait a minute — the site will be available at `https://<your-username>.github.io/<repo-name>/`.

Git commands example:
```bash
git checkout -b gh-pages
git add index.html styles.css script.js README.md
git commit -m "Add Hawkins Explorer game"
git push -u origin gh-pages
```

Option B — main branch /docs:
- Put the files into a `docs/` folder on `main`, then set GitHub Pages to serve from `main` -> `/docs`.

## Controls
- Arrows / WASD — move
- Space — interact / examine
- M — mute/unmute ambient audio

## Want me to push it for you?
If you want me to push these files and enable Pages for you, grant repository access or paste the repo steps you want me to run and I will prepare the exact commits. Otherwise follow the commands above.
