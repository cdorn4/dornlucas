---
layout: default
title: Journal
permalink: /blog/
---
<section class="page-intro shell">
  <p class="eyebrow">The journal</p>
  <h1>Writing, collected.</h1>
  <p class="lede">A chronological home for your imported Weebly blog pages and everything that comes after.</p>
</section>

<section class="archive shell" aria-label="Blog archive">
  {% for post in site.posts %}
    <article class="archive-item">
      <p class="post-meta">{{ post.date | date: '%B %-d, %Y' }}</p>
      <div>
        <h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
        <p>{{ post.excerpt | strip_html | truncate: 220 }}</p>
      </div>
      <a class="text-link" href="{{ post.url | relative_url }}" aria-label="Read {{ post.title }}">Read <span aria-hidden="true">&rarr;</span></a>
    </article>
  {% else %}
    <p class="empty-state">No posts yet. Add Markdown files to <code>_posts</code> to begin the archive.</p>
  {% endfor %}
</section>
