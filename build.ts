import { readFileSync } from "fs";

const cssPlugin: import("bun").BunPlugin = {
  name: "css-inject",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = readFileSync(args.path, "utf8");
      return {
        contents: `
const __s = document.createElement('style');
__s.textContent = ${JSON.stringify(css)};
document.head.appendChild(__s);
`,
        loader: "js",
      };
    });
  },
};

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  naming: "matai.min.js",
  target: "browser",
  minify: true,
  plugins: [cssPlugin],
});

if (!result.success) {
  for (const msg of result.logs) console.error(msg);
  process.exit(1);
}

console.log("Built dist/matai.min.js");
