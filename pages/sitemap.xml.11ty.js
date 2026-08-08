/*
  كان sitemap.xml ملفاً ثابتاً يُنسخ كما هو (addPassthroughCopy) — يحتاج تحديث
  يدوي مع كل صفحة جديدة، وفعلاً نسي صفحة terms.html لما أُضيفت. صار يُبنى من
  collections.all تلقائياً، فأي صفحة جديدة تظهر بالخريطة بلا تدخّل يدوي —
  نفس مبدأ خريطة موقع "هكوله" على نفس النطاق.
*/
const SITE_URL = "https://mohframevision.github.io";

exports.data = {
  permalink: "sitemap.xml",
  eleventyExcludeFromCollections: true,
};

exports.render = function (data) {
  const urls = (data.collections.all || [])
    .filter((page) => !String(page.data.robotsMeta || "").includes("noindex"))
    .map((page) => `${SITE_URL}${page.url}`);

  const items = urls.map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`).join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${items}\n` +
    `</urlset>\n`
  );
};
