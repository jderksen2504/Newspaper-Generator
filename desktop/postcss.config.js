// Diese Datei verhindert, dass Vite die Verzeichnishierarchie hochläuft
// und die postcss.config.mjs aus dem Monorepo-Root findet (die für die
// Next.js-App gedacht ist und @tailwindcss/postcss enthält, das hier
// nicht installiert ist).
//
// Die eigentliche Deaktivierung passiert in vite.config.js (css.postcss),
// aber diese Datei ist ein "Belt-and-Suspenders" Backup.

module.exports = {
  plugins: [],
};
