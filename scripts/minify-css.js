/*
  خطوة بعد البناء: يصغّر _site/css/styles.css فوق _site/css/styles.min.css.
  السبب: base.njk يحمّل styles.min.css حصراً، وكان ملفاً مُصغَّراً يدوياً
  ومرفوعاً للمستودع مرة واحدة بلا أي أداة تعيد إنتاجه — أي تعديل لاحق على
  styles.css كان يختفي فعلياً على الموقع الحي دون أي خطأ ظاهر. يعمل على
  مخرجات _site فقط، ما يغيّر أي ملف مصدر تحت css/.
*/
const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");

const SITE_DIR = path.join(__dirname, "..", "_site");
const src = path.join(SITE_DIR, "css", "styles.css");
const dest = path.join(SITE_DIR, "css", "styles.min.css");

if (!fs.existsSync(src)) {
  console.error("لا يوجد _site/css/styles.css — شغّل npm run build أولاً");
  process.exit(1);
}

const input = fs.readFileSync(src, "utf8");
const output = new CleanCSS({ level: 2 }).minify(input);
if (output.errors.length) {
  console.error(output.errors.join("\n"));
  process.exit(1);
}
fs.writeFileSync(dest, output.styles);
console.log(`تصغير CSS: ${input.length} -> ${output.styles.length} بايت`);
