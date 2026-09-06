import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";

export type Post = CollectionEntry<"posts">;

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection(
    "posts",
    ({ data }) => import.meta.env.DEV || !data.draft,
  );
  return posts.sort(
    (a, b) => b.data.published.valueOf() - a.data.published.valueOf(),
  );
}

export function postUrl(post: Post): string {
  return `/posts/${post.slug}/`;
}

export function formatDate(date: Date, withYear = true): string {
  return new Intl.DateTimeFormat("ko-KR", {
    ...(withYear && { year: "numeric" }),
    month: "long",
    day: "numeric",
  }).format(date);
}

export function readingTime(body: string): number {
  const plain = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>[\]()!-]/g, " ");
  return Math.max(1, Math.ceil(plain.trim().length / 620));
}
