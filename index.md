---
layout: default
title: Next thing next
description: The Dorn and Lucas family archive, photo journals, and notes.
---
<section class="home-hero shell">
  <div class="hero-kicker"><span class="signal-dot"></span> The Dorn + Lucas archive</div>
  <h1>NEXT THING<br><em>NEXT.</em></h1>
  <p class="hero-intro">A living record of family, travel, photographs, and the small stories that make up a life.</p>
  <div class="hero-actions">
    <a class="button button-primary" href="{{ '/blog/' | relative_url }}">Read the journal <span aria-hidden="true">&rarr;</span></a>
    <a class="button button-quiet" href="{{ '/photos/' | relative_url }}">Browse photographs</a>
  </div>
  <div class="hero-note"><span>01</span><span>Established 2019</span><span>Appleton, Wisconsin</span></div>
</section>

<section class="home-journal shell" aria-labelledby="journal-heading">
  <div class="section-intro">
    <p class="eyebrow">The journal</p>
    <h2 id="journal-heading">Recent dispatches</h2>
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

<section class="home-collections shell" aria-labelledby="collections-heading">
  <div class="section-intro">
    <p class="eyebrow">Collected here</p>
    <h2 id="collections-heading">More than a timeline.</h2>
  </div>
  <div class="collection-list">
    <a class="collection-link" href="{{ '/photos/' | relative_url }}"><span>01</span><strong>Photographs</strong><span aria-hidden="true">&nearr;</span></a>
    <a class="collection-link" href="{{ '/our-wedding.html' | relative_url }}"><span>02</span><strong>Our wedding</strong><span aria-hidden="true">&nearr;</span></a>
    <a class="collection-link" href="{{ '/fk-2019.html' | relative_url }}"><span>03</span><strong>F**k 2019</strong><span aria-hidden="true">&nearr;</span></a>
  </div>
</section>
