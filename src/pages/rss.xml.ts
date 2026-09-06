import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPublishedPosts, postUrl } from "../lib/posts";

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();
  return rss({
    title: "nullbyte",
    description: "웹 보안, CTF, 버그바운티에 관한 기록",
    site: context.site ?? "https://blog.xss.kr",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: postUrl(post),
    })),
  });
}
