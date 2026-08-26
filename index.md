---
layout: default
title: Home
---
<section class="hero shell">
  <p class="eyebrow">Dorn Lucas / Personal site</p>
  <h1>Notes on the work, ideas, and places that keep me curious.</h1>
  <p class="hero-copy">A simple, durable home for the pages and stories I want to keep close.</p>
  <a class="button" href="{{ '/blog/' | relative_url }}">Read the journal <span aria-hidden="true">&rarr;</span></a>
</section>

<section class="recent shell" aria-labelledby="recent-heading">
  <div class="section-heading">
    <p class="eyebrow">From the archive</p>
    <h2 id="recent-heading">Latest writing</h2>
    <a href="{{ '/blog/' | relative_url }}">View all <span aria-hidden="true">&rarr;</span></a>
  </div>
  <div class="post-grid">
    {% assign latest_posts = site.posts | slice: 0, 3 %}
    {% for post in latest_posts %}
      <article class="post-card">
        <p class="post-meta">{{ post.date | date: '%B %-d, %Y' }}</p>
        <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
        <p>{{ post.excerpt | strip_html | truncate: 150 }}</p>
        <a class="text-link" href="{{ post.url | relative_url }}">Read story <span aria-hidden="true">&rarr;</span></a>
      </article>
    {% else %}
      <p class="empty-state">Your imported Weebly posts will appear here.</p>
    {% endfor %}
  </div>
</section>
