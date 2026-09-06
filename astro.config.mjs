import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";

export default defineConfig({
  site: "https://blog.xss.kr",
  trailingSlash: "always",
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
      wrap: false,
    },
    remarkPlugins: [remarkMath, remarkDirective, parseDirectiveNode],
    rehypePlugins: [rehypeKatex, rehypeSlug],
  },
});
