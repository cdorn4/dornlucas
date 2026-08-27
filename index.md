---
layout: default
title: Next thing next
description: The Dorn and Lucas family archive, photo journals, and notes.
---

<section class="home-journal shell" aria-labelledby="journal-heading">
  <div class="section-intro">
    <p class="eyebrow">The blog</p>
    <h2 id="journal-heading">Recent updates</h2>
    <a class="arrow-link" href="{{ '/blog/' | relative_url }}">All posts <span aria-hidden="true">&nearr;</span></a>
  </div>
  <div class="featured-posts">
    {% assign latest_posts = site.posts | slice: 0, 3 %}
    {% for post in latest_posts %}
      <article class="featured-post{% if forloop.first %} featured-post-lead{% endif %}">
        <p class="post-meta">{{ post.date | date: '%B %-d, %Y' }}</p>
        <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
        <p>{{ post.content | strip_html | strip_newlines | truncate: 180 }}</p>
        <a class="arrow-link" href="{{ post.url | relative_url }}">Open entry <span aria-hidden="true">&rarr;</span></a>
      </article>
    {% endfor %}
  </div>
</section>

