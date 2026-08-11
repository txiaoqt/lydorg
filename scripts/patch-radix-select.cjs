const fs = require("node:fs");
const path = require("node:path");

const packageRoot = path.resolve("node_modules/@radix-ui/react-select/dist");
const targets = ["index.js", "index.mjs"];
const from = "allowPinchZoom: true";
const to = "allowPinchZoom: true, removeScrollBar: false";

for (const target of targets) {
  const file = path.join(packageRoot, target);
  if (!fs.existsSync(file)) continue;

  const source = fs.readFileSync(file, "utf8");
  if (source.includes(to)) continue;
  if (!source.includes(from)) {
    throw new Error(`Unable to patch Radix Select scroll lock in ${file}`);
  }

  fs.writeFileSync(file, source.replace(from, to));
}
