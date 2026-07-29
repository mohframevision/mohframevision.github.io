module.exports = function (eleventyConfig) {
  // نسخ الملفات كما هي بدون معالجة
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");

  // نسخ الصور المستخدمة فعلياً فقط (تجنب نسخ الملفات الخام الكبيرة غير المستخدمة)
  eleventyConfig.addPassthroughCopy("images/og-image.png");
  eleventyConfig.addPassthroughCopy("images/naqsh/naqsh-hero.jpg");
  eleventyConfig.addPassthroughCopy("images/naqsh/naqsh-bts.jpg");

  eleventyConfig.addPassthroughCopy("favicon.svg");
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
