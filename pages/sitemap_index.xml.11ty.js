/*
  فهرس يجمع خريطتَي الموقعين على نفس النطاق — هذا الموقع (بورتفوليو) وهكوله
  (مجلد فرعي، مستودع Git منفصل تماماً وله بناء مستقل). قوقل يراجع النطاق
  كاملاً كخاصية واحدة (نفس سبب رفض AdSense)، وهذا يسهّل عليه اكتشاف خريطتَي
  الموقعين معاً بدل الاعتماد على إرسال كل واحدة على حدة بسيرش كونسول.

  ملاحظة: هذا الملف بمستودع البورتفوليو تحديداً لأنه صاحب جذر النطاق —
  مستودع هكوله منشور تحت /hakolah/ (Pages "project site") وما يقدر يكتب
  ملفاً بجذر النطاق. خريطة هكوله (hakolah/sitemap.xml) تبقى مُدارة هناك
  بالكامل، هذا الملف بس يشير لها.
*/
exports.data = {
  permalink: "sitemap_index.xml",
  eleventyExcludeFromCollections: true,
};

exports.render = function () {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <sitemap>\n` +
    `    <loc>https://mohframevision.github.io/sitemap.xml</loc>\n` +
    `  </sitemap>\n` +
    `  <sitemap>\n` +
    `    <loc>https://mohframevision.github.io/hakolah/sitemap.xml</loc>\n` +
    `  </sitemap>\n` +
    `</sitemapindex>\n`
  );
};
