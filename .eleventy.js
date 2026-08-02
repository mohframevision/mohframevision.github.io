module.exports = function (eleventyConfig) {
  // نسخ الملفات كما هي بدون معالجة
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");

  // نسخ الصور المستخدمة فعلياً فقط (تجنب نسخ الملفات الخام الكبيرة غير المستخدمة)
  eleventyConfig.addPassthroughCopy("images/og-image.png");
  eleventyConfig.addPassthroughCopy("images/naqsh/naqsh-hero.jpg");

  eleventyConfig.addPassthroughCopy("favicon.svg");
  eleventyConfig.addPassthroughCopy("favicon.ico");
  eleventyConfig.addPassthroughCopy("favicon-32x32.png");
  eleventyConfig.addPassthroughCopy("favicon-16x16.png");
  eleventyConfig.addPassthroughCopy("apple-touch-icon.png");
  eleventyConfig.addPassthroughCopy("android-chrome-192x192.png");
  eleventyConfig.addPassthroughCopy("android-chrome-512x512.png");
  eleventyConfig.addPassthroughCopy("site.webmanifest");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("sitemap.xml");
  eleventyConfig.addPassthroughCopy("ads.txt");
  eleventyConfig.addPassthroughCopy(".nojekyll");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("LICENSE");

  return {
    dir: {
      input: "pages",
      includes: "../_includes",
      data: "../_data",
      output: "_site"
    },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
