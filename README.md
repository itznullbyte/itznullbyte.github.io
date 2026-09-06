# nullbyte blog

A minimal Astro blog with an editorial white theme.

```sh
npm install
npm run dev
```

Production build:

```sh
npm run build
```

Markdown posts live in `src/content/posts`. Draft posts are copied into the new project but are not published until `draft: false` is set.

To set the homepage thumbnail for a post, place the image next to its `index.md` and add it to the frontmatter:

```yaml
image: ./thumbnail.jpg
```

The newest post's image is used in the `Latest note` card. If `image` is omitted, the date graphic is shown instead.
