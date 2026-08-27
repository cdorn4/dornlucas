---
layout: default
title: Journal
permalink: /blog/
description: The complete Next thing next journal archive.
---
<section class="archive-hero shell">
  <p class="eyebrow">Next thing next</p>
    <h2>The Blog</h2>
  <p class="lede">The sporadic updates of Chris, Elyse and Auggie.</p>
</section>

<section class="archive shell" aria-label="Blog archive">
  {% assign current_year = '' %}
  {% for post in site.posts %}
    {% assign post_year = post.date | date: '%Y' %}
    {% if post_year != current_year %}
      {% assign current_year = post_year %}
      <h2 class="archive-year">{{ current_year }}</h2>
    {% endif %}
    <article class="archive-item">
      <p class="post-meta">{{ post.date | date: '%b %-d' }}</p>
      <div>
        <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
        <p>{{ post.content | strip_html | strip_newlines | truncate: 220 }}</p>
      </div>
      <a class="arrow-link" href="{{ post.url | relative_url }}" aria-label="Read {{ post.title }}">Read <span aria-hidden="true">&rarr;</span></a>
    </article>
  {% endfor %}
</section>
