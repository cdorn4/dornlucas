---
layout: default
title: Next thing next
description: The Dorn and Lucas family archive, photo journals, and notes.
---

{% assign latest_post = site.posts.first %}
{% if latest_post %}
<section class="home-latest-post shell" aria-labelledby="latest-post-heading">
  <article class="latest-post-card">
    <header class="latest-post-header">
      <div class="post-meta-bar">
        <span class="post-kicker-badge"><span class="signal-dot"></span> Latest Post</span>
        <span class="post-meta-divider">&bull;</span>
        <time class="post-date" datetime="{{ latest_post.date | date_to_xmlschema }}">{{ latest_post.date | date: '%B %-d, %Y' }}</time>
      </div>
      <h1 id="latest-post-heading" class="latest-post-title">
        <a href="{{ latest_post.url | relative_url }}">{{ latest_post.title }}</a>
      </h1>
      {% if latest_post.tags.size > 0 %}
        <ul class="tag-list" aria-label="Tags">
          {% for tag in latest_post.tags %}<li>#{{ tag }}</li>{% endfor %}
        </ul>
      {% endif %}
    </header>

    <div class="expandable-wrapper" id="latest-post-wrapper">
      <div class="post-content latest-post-content">
        {{ latest_post.content }}
      </div>
      <div class="expand-fade-overlay" id="expand-fade"></div>
    </div>

    <div class="latest-post-actions">
      <button type="button" class="expand-toggle-btn" id="expand-btn" aria-expanded="false" aria-controls="latest-post-wrapper">
        <span class="expand-btn-text">Expand full post</span>
        <span class="expand-btn-icon" aria-hidden="true">&darr;</span>
      </button>
      <a class="arrow-link" href="{{ latest_post.url | relative_url }}">Open entry page <span aria-hidden="true">&rarr;</span></a>
    </div>
  </article>
</section>
{% endif %}

<section class="home-journal shell" aria-labelledby="journal-heading">
  <div class="section-intro">
    <p class="eyebrow">The blog</p>
    <h2 id="journal-heading">Recent updates</h2>
    <a class="arrow-link" href="{{ '/blog/' | relative_url }}">All posts <span aria-hidden="true">&nearr;</span></a>
  </div>
  <div class="featured-posts">
    {% assign recent_posts = site.posts | slice: 1, 3 %}
    {% for post in recent_posts %}
      <article class="featured-post">
        <p class="post-meta">{{ post.date | date: '%B %-d, %Y' }}</p>
        <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
        <p>{{ post.content | strip_html | strip_newlines | truncate: 180 }}</p>
        <a class="arrow-link" href="{{ post.url | relative_url }}">Open entry <span aria-hidden="true">&rarr;</span></a>
      </article>
    {% endfor %}
  </div>
</section>

<script>
  document.addEventListener('DOMContentLoaded', function() {
    const wrapper = document.getElementById('latest-post-wrapper');
    const btn = document.getElementById('expand-btn');
    if (!wrapper || !btn) return;

    btn.addEventListener('click', function() {
      const isExpanded = wrapper.classList.toggle('is-expanded');
      btn.setAttribute('aria-expanded', isExpanded);
      const textSpan = btn.querySelector('.expand-btn-text');
      const iconSpan = btn.querySelector('.expand-btn-icon');
      if (isExpanded) {
        if (textSpan) textSpan.textContent = 'Collapse post';
        if (iconSpan) iconSpan.innerHTML = '&uarr;';
      } else {
        if (textSpan) textSpan.textContent = 'Expand full post';
        if (iconSpan) iconSpan.innerHTML = '&darr;';
        wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
</script>

