# Dorn Lucas Jekyll site

A static Jekyll site containing the exported Weebly pages and media for `dornlucas.com`.

The native Jekyll layer lives in `_layouts`, `_posts`, `assets`, and the Markdown pages. The legacy event galleries remain as cleaned standalone HTML pages because their original gallery markup and image ordering are worth preserving.

The export currently includes the original homepage/blog index plus these pages: `Baby Shower`, `Bjorklunden 2024`, `Disposable Cameras`, `FK 2019`, `How we met`, `Our Wedding`, and `The Engagement`. The original export is preserved outside this repository as `480379615644731484-1787771491.zip`.

The exported blog indexes have now been converted into 30 native Jekyll posts: 20 from `Next thing next` and 10 from `F**k 2019`, covering May 2019 through March 2026. Some slideshow image references point to files that are not present in the export and still need separate recovery.

## Run locally

Install Ruby and Bundler, then run:

```powershell
bundle install
bundle exec jekyll serve --livereload
```

Open `http://localhost:4000`.

## Importing Weebly content

1. Export or download the Weebly site content. Weebly exports commonly arrive as HTML files and an `uploads` folder; keep a copy of the original export outside this repository.
2. Create one Markdown file per blog article in `_posts` using the filename format `YYYY-MM-DD-title.md`.
3. Add front matter at the top of each post:

```yaml
---
layout: post
title: Your article title
date: 2024-05-12 09:00:00 -0400
tags:
  - topic
excerpt: A short description for archive pages and social previews.
---
```

4. Move article images into `assets/images/` and update image links to `/assets/images/filename.jpg`.
5. For non-blog Weebly pages, add a Markdown file at the desired route with `layout: default` and `permalink` front matter. The existing `about.md` is an example.
6. Update the site title, description, email, and URL in `_config.yml`.
7. Run the local build and check every imported route before deploying.

The starter post in `_posts` is only a migration placeholder and can be deleted after the real articles are imported.

## Optimize images

The exported photos can be optimized in place while preserving their existing paths and filenames:

```powershell
python scripts/optimize_images.py uploads
```

The optimizer uses a 2,000-pixel maximum dimension, JPEG/WebP quality 84, PNG optimization, and keeps the existing file when recompression would be larger. Keep the original ZIP as the full-quality backup.

## Deployment

This site can deploy to GitHub Pages, Netlify, Cloudflare Pages, or any static host. For GitHub Pages, set the repository Pages source to the branch and folder where the built site is published, or use a Pages workflow that runs `bundle exec jekyll build`.
