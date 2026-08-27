/**
 * Gallery Lightbox / Photo Viewer for Dorn & Lucas
 */
(function() {
  'use strict';

  function initLightbox() {
    const galleries = document.querySelectorAll('.post-gallery, .post-content');
    if (!galleries.length) return;

    let lightbox = document.getElementById('gallery-lightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'gallery-lightbox';
      lightbox.className = 'lightbox-overlay';
      lightbox.setAttribute('aria-hidden', 'true');
      lightbox.setAttribute('role', 'dialog');
      lightbox.setAttribute('aria-modal', 'true');
      lightbox.setAttribute('aria-label', 'Photo viewer');

      lightbox.innerHTML = `
        <div class="lightbox-backdrop"></div>
        <div class="lightbox-container">
          <button type="button" class="lightbox-btn lightbox-close" aria-label="Close viewer">&times;</button>
          <button type="button" class="lightbox-btn lightbox-nav lightbox-prev" aria-label="Previous photo">&#10094;</button>
          <div class="lightbox-stage">
            <img class="lightbox-img" src="" alt="">
            <div class="lightbox-meta">
              <span class="lightbox-counter"></span>
              <span class="lightbox-caption"></span>
            </div>
          </div>
          <button type="button" class="lightbox-btn lightbox-nav lightbox-next" aria-label="Next photo">&#10095;</button>
        </div>
      `;
      document.body.appendChild(lightbox);
    }

    const backdrop = lightbox.querySelector('.lightbox-backdrop');
    const imgElement = lightbox.querySelector('.lightbox-img');
    const counterElement = lightbox.querySelector('.lightbox-counter');
    const captionElement = lightbox.querySelector('.lightbox-caption');
    const btnClose = lightbox.querySelector('.lightbox-close');
    const btnPrev = lightbox.querySelector('.lightbox-prev');
    const btnNext = lightbox.querySelector('.lightbox-next');

    let currentImages = [];
    let currentIndex = 0;
    let isOpen = false;

    // Attach click listener to gallery images
    galleries.forEach(gallery => {
      const imgs = Array.from(gallery.querySelectorAll('img')).filter(img => !img.classList.contains('no-lightbox'));
      imgs.forEach((img, idx) => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', (e) => {
          e.preventDefault();
          openLightbox(imgs, idx);
        });
      });
    });

    function openLightbox(imagesList, index) {
      if (!imagesList.length) return;
      currentImages = imagesList;
      currentIndex = index;
      isOpen = true;

      updateLightboxImage();

      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-locked');
      btnClose.focus();
    }

    function closeLightbox() {
      if (!isOpen) return;
      isOpen = false;
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-locked');
      imgElement.src = '';
    }

    function showPrev() {
      if (!currentImages.length) return;
      currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
      updateLightboxImage();
    }

    function showNext() {
      if (!currentImages.length) return;
      currentIndex = (currentIndex + 1) % currentImages.length;
      updateLightboxImage();
    }

    function updateLightboxImage() {
      const targetImg = currentImages[currentIndex];
      if (!targetImg) return;

      const src = targetImg.getAttribute('src') || targetImg.src;
      const alt = targetImg.getAttribute('alt') || '';
      
      imgElement.classList.add('is-loading');
      
      const tempImg = new Image();
      tempImg.onload = function() {
        imgElement.src = src;
        imgElement.alt = alt;
        imgElement.classList.remove('is-loading');
      };
      tempImg.src = src;

      if (counterElement) {
        counterElement.textContent = `${currentIndex + 1} / ${currentImages.length}`;
      }
      if (captionElement) {
        captionElement.textContent = alt;
        captionElement.style.display = alt ? 'block' : 'none';
      }

      if (currentImages.length <= 1) {
        btnPrev.style.display = 'none';
        btnNext.style.display = 'none';
      } else {
        btnPrev.style.display = '';
        btnNext.style.display = '';
      }
    }

    // Controls
    btnClose.addEventListener('click', closeLightbox);
    backdrop.addEventListener('click', closeLightbox);
    btnPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
    btnNext.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        showPrev();
      } else if (e.key === 'ArrowRight') {
        showNext();
      }
    });

    // Touch swipe support
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    lightbox.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
        if (diffX > 0) {
          showPrev();
        } else {
          showNext();
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLightbox);
  } else {
    initLightbox();
  }
})();

