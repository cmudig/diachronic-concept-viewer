# Diachronic Concept Viewer

Install dependencies:

```bash
cd diachronic-concept-viewer
npm install
```

...then start [Rollup](https://rollupjs.org):

```bash
npm run autobuild
```

Currently the app expects a dataset in the `src/dummy-data` directory, consisting
of a `data.js` file and a `thumbnails.js` file. The dataset should be in the same
format as expected by `dr-viewer`.
