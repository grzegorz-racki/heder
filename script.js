// =========================================================
// HEDER — skrypty strony
// 1. Menu hamburgera (mobile)
// 2. Płynne przewijanie do sekcji (własny easing) + scroll-spy
// 3. AOS — inicjalizacja animacji wjazdu sekcji (jak na roder.com.pl)
// 3a. Lightbox — pełny podgląd zdjęć z sekcji "O firmie"
// 4. Karuzela opinii — LIVE Google Reviews (Google Places API)
//    z automatycznym powrotem do opinii przykładowych, jeśli
//    API nie jest jeszcze skonfigurowane lub odpowiedź się nie uda
// 5. Formularz kontaktowy — walidacja/feedback
// 6. Polityka cookies — prosty popup informacyjny (funkcje globalne,
//    wzorem roder.com.pl — bez bannera zgody, bez localStorage)
// =========================================================

/* =========================================================
   KONFIGURACJA ŻYWYCH OPINII GOOGLE
   =========================================================
   Aby opinie na stronie pobierały się NA ŻYWO wprost z Twojej
   wizytówki Google (Google Business Profile), uzupełnij oba
   poniższe pola. Bez nich strona pokazuje aktualne opinie
   przykładowe (te już wpisane w index.html) — nic się nie psuje.

   KROK 1 — apiKey:
     1. Wejdź na https://console.cloud.google.com/
     2. Utwórz projekt (lub użyj istniejącego).
     3. Włącz "Maps JavaScript API" oraz "Places API".
     4. Utwórz klucz API (Credentials → Create credentials → API key).
     5. Ogranicz klucz do swojej domeny (HTTP referrers) — ważne
        dla bezpieczeństwa, żeby nikt inny nie użył Twojego klucza.
     6. Wklej klucz poniżej jako apiKey.

   KROK 2 — placeId:
     1. Wejdź na narzędzie Google "Place ID Finder":
        https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder
     2. Wyszukaj "Heder Zakład pogrzebowy Szczecin".
     3. Skopiuj Place ID (zaczyna się zwykle od "ChIJ...").
     4. Wklej poniżej jako placeId.

   Uwaga: Google Places API zwraca maks. 5 najbardziej trafnych
   opinii (limit narzucony przez Google, nie przez nas) oraz
   wymaga aktywnego rozliczenia (billing) w Google Cloud —
   w standardowym ruchu strony wizytówkowej mieści się to
   zwykle w darmowym miesięcznym limicie Google.
   ========================================================= */
const GOOGLE_REVIEWS_CONFIG = {
  apiKey: '',   // <-- wklej swój klucz Google Maps JavaScript API
  placeId: 'ChIJoSz1makJqkcRBd1gXRW1Lok',
};

/* ---------- Stan karuzeli opinii (poza DOMContentLoaded,
   by dało się bezpiecznie zainicjować ją ponownie po
   doładowaniu żywych opinii z Google) ---------- */
let __reviewsAnimationId = null;

function buildReviewCardHTML({ name, meta, text, starCount }) {
  const stars = '★★★★★☆☆☆☆☆'.slice(5 - starCount, 10 - starCount);
  const safeText = String(text || '').trim();
  return `
    <figure class="review-card">
      <span class="review-stars" aria-hidden="true">${stars}</span>
      <blockquote>${safeText}</blockquote>
      <figcaption>
        <span class="reviewer-name">${name || 'Klient Google'}</span>
        <span class="reviewer-meta">${meta || 'Opinia Google'}</span>
      </figcaption>
    </figure>`;
}

function renderLiveReviews(googleReviews) {
  const track = document.getElementById('reviews-track');
  if (!track || !googleReviews || !googleReviews.length) return false;

  const cardsHTML = googleReviews.map(r => buildReviewCardHTML({
    name: r.author_name,
    meta: `Opinia Google · ${r.relative_time_description || ''}`.trim(),
    text: r.text,
    starCount: Math.max(1, Math.min(5, Math.round(r.rating || 5))),
  })).join('');

  track.innerHTML = cardsHTML;
  return true;
}

function updateGoogleSummary(rating, totalReviews) {
  const el = document.querySelector('.google-summary-text');
  if (!el || !rating) return;
  const total = totalReviews ? ` (${totalReviews})` : '';
  el.innerHTML = `<strong>${rating.toFixed(1)} / 5</strong> na podstawie opinii w Google${total}`;
}

function initReviewsCarousel() {
  const track = document.getElementById('reviews-track');
  const prevBtn = document.getElementById('reviews-prev');
  const nextBtn = document.getElementById('reviews-next');
  const dotsWrap = document.getElementById('reviews-dots');
  if (!track || !prevBtn || !nextBtn || !dotsWrap) return;

  // Zatrzymaj ewentualną poprzednią pętlę animacji (np. po doładowaniu
  // żywych opinii i ponownym wywołaniu tej funkcji).
  if (__reviewsAnimationId !== null) {
    cancelAnimationFrame(__reviewsAnimationId);
    __reviewsAnimationId = null;
  }

  // Usuń ewentualne sklonowane karty z poprzedniej inicjalizacji,
  // zostaw tylko oryginalny zestaw (aria-hidden="true" = klon pętli).
  track.querySelectorAll('[aria-hidden="true"]').forEach(el => el.remove());
  dotsWrap.innerHTML = '';

  const originalCards = Array.from(track.children);
  if (!originalCards.length) return;

  // Zbuduj kropki nawigacyjne — po jednej na oryginalną opinię
  originalCards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Przejdź do opinii ${i + 1}`);
    if (i === 0) dot.classList.add('is-active');
    dot.addEventListener('click', () => {
      pauseTemporarily();
      track.scrollTo({ left: i * cardStep(), behavior: 'smooth' });
    });
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  // Duplikujemy karty, by uzyskać efekt nieskończonej, płynnej pętli
  originalCards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('a, button').forEach(el => el.setAttribute('tabindex', '-1'));
    track.appendChild(clone);
  });

  function cardStep() {
    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || '24');
    return originalCards[0].getBoundingClientRect().width + gap;
  }

  function updateDots() {
    const idx = Math.round(track.scrollLeft / cardStep()) % originalCards.length;
    dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
  }

  // Ciągłe, płynne przewijanie w tle (jak w widgetach opinii Google)
  let isPaused = false;
  let lastTime = null;
  const SPEED_PX_PER_SEC = 32;

  function tick(now) {
    if (lastTime === null) lastTime = now;
    const dt = now - lastTime;
    lastTime = now;

    if (!isPaused) {
      const halfWidth = track.scrollWidth / 2;
      track.scrollLeft += (SPEED_PX_PER_SEC * dt) / 1000;
      if (track.scrollLeft >= halfWidth) {
        track.scrollLeft -= halfWidth;
      }
      updateDots();
    }
    __reviewsAnimationId = requestAnimationFrame(tick);
  }

  let resumeTimer = null;
  function pauseTemporarily() {
    isPaused = true;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { isPaused = false; }, 4500);
  }

  prevBtn.onclick = () => {
    pauseTemporarily();
    track.scrollBy({ left: -cardStep(), behavior: 'smooth' });
  };
  nextBtn.onclick = () => {
    pauseTemporarily();
    track.scrollBy({ left: cardStep(), behavior: 'smooth' });
  };

  track.onmouseenter = () => { isPaused = true; };
  track.onmouseleave = () => { isPaused = false; };
  track.ontouchstart = () => { isPaused = true; };
  track.ontouchend = pauseTemporarily;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion) {
    __reviewsAnimationId = requestAnimationFrame(tick);
  }
}

function loadLiveGoogleReviews() {
  const { apiKey, placeId } = GOOGLE_REVIEWS_CONFIG;
  if (!apiKey || !placeId) return; // brak konfiguracji — zostają opinie przykładowe

  window.__onGoogleReviewsLoaded = function () {
    try {
      const dummyMapDiv = document.createElement('div');
      const service = new google.maps.places.PlacesService(dummyMapDiv);
      service.getDetails(
        { placeId, fields: ['reviews', 'rating', 'user_ratings_total'] },
        (place, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            place && place.reviews && place.reviews.length
          ) {
            renderLiveReviews(place.reviews);
            initReviewsCarousel();
            updateGoogleSummary(place.rating, place.user_ratings_total);
          }
          // status inny niż OK / brak opinii → po cichu zostają
          // opinie przykładowe już obecne na stronie.
        }
      );
    } catch (err) {
      // Cichy fallback do opinii przykładowych — strona ma działać
      // poprawnie nawet bez skonfigurowanego API.
    }
  };

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=__onGoogleReviewsLoaded`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- 1. MENU HAMBURGERA ---------- */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  function closeMenu() {
    mobileMenu.classList.remove('is-open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Otwórz menu');
  }

  function toggleMenu() {
    const isOpen = mobileMenu.classList.toggle('is-open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.setAttribute('aria-label', isOpen ? 'Zamknij menu' : 'Otwórz menu');
  }

  hamburger.addEventListener('click', toggleMenu);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 780) closeMenu();
  });

  /* ---------- 2. PŁYNNE PRZEWIJANIE MIĘDZY SEKCJAMI ---------- */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function getHeaderOffset() {
    const header = document.getElementById('site-header');
    return header ? header.offsetHeight + 4 : 0;
  }

  function smoothScrollTo(targetY, duration = 700) {
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);
      window.scrollTo({ top: startY + distance * eased, left: 0, behavior: 'auto' });
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function flashSection(section) {
    section.classList.add('section-flash');
    setTimeout(() => section.classList.remove('section-flash'), 900);
  }

  const allNavAnchors = document.querySelectorAll('a[href^="#"]');
  allNavAnchors.forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      closeMenu();

      const targetY = target.getBoundingClientRect().top + window.pageYOffset - getHeaderOffset();
      smoothScrollTo(Math.max(targetY, 0), 700);
      history.pushState(null, '', id);

      setTimeout(() => flashSection(target), 720);
    });
  });

  /* ---------- SCROLL-SPY: aktywny link w menu ---------- */
  const sections = ['start', 'uslugi', 'o-firmie', 'opinie', 'kontakt']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  const navLinkEls = document.querySelectorAll('.nav-link');

  function setActiveNav(id) {
    navLinkEls.forEach(link => {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
    });
  }

  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActiveNav(entry.target.id);
    });
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

  sections.forEach(sec => spyObserver.observe(sec));

  /* ---------- 3. AOS — INICJALIZACJA ANIMACJI WJAZDU SEKCJI ---------- */
  // Ta sama biblioteka i te same ustawienia co na roder.com.pl —
  // elementy ze znacznikiem data-aos="..." w index.html animują się
  // przy wjeżdżaniu w widok, jednorazowo (once: true).
  if (typeof AOS !== 'undefined') {
    AOS.init({ duration: 800, easing: 'ease-in-out', once: true, mirror: false, offset: 50 });
  } else {
    // CDN z biblioteką AOS niedostępne — nie blokuj strony: pokaż
    // wszystko od razu, bez animacji wjazdu (patrz .no-aos w CSS).
    document.documentElement.classList.add('no-aos');
  }

  /* ---------- 3b. LICZNIKI W SEKCJI "O FIRMIE" (animowane liczby) ---------- */
  const countEls = Array.from(document.querySelectorAll('.stat-number[data-count-to]'));
  if (countEls.length) {
    function animateCount(el) {
      const from = parseFloat(el.getAttribute('data-count-from')) || 0;
      const to = parseFloat(el.getAttribute('data-count-to'));
      const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1600;
      const startTime = performance.now();

      function formatNumber(value) {
        const rounded = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
        // Separator tysięcy w stylu polskim (spacja) — tylko dla liczb całkowitych bez części dziesiętnej
        if (decimals === 0) {
          return Math.round(value).toLocaleString('pl-PL');
        }
        return rounded;
      }

      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out — szybki start, delikatne wyhamowanie na końcu (naturalne "zatrzymanie się")
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = from + (to - from) * eased;
        el.textContent = formatNumber(current) + suffix;
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = formatNumber(to) + suffix;
        }
      }
      requestAnimationFrame(step);
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!prefersReducedMotion) animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    countEls.forEach(el => countObserver.observe(el));
  }

  /* ---------- 3a. LIGHTBOX — PEŁNY PODGLĄD ZDJĘĆ Z SEKCJI "O FIRMIE" ---------- */
  const galleryPhotos = Array.from(document.querySelectorAll('#about-gallery .about-photo'));
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxOverlay = document.getElementById('lightbox-overlay');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  if (galleryPhotos.length && lightbox && lightboxImg) {
    let currentPhotoIndex = 0;

    function openLightbox(index) {
      currentPhotoIndex = (index + galleryPhotos.length) % galleryPhotos.length;
      const img = galleryPhotos[currentPhotoIndex].querySelector('img');
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || '';
      lightboxCaption.textContent = img.alt || '';
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    function showNext(step) {
      openLightbox(currentPhotoIndex + step);
    }

    galleryPhotos.forEach((photo, index) => {
      photo.addEventListener('click', () => openLightbox(index));
      photo.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLightbox(index);
        }
      });
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxOverlay) lightboxOverlay.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', () => showNext(-1));
    if (lightboxNext) lightboxNext.addEventListener('click', () => showNext(1));

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showNext(-1);
      if (e.key === 'ArrowRight') showNext(1);
    });
  }

  /* ---------- 4. OPINIE — start z przykładowymi, próba doładowania żywych ---------- */
  initReviewsCarousel();
  loadLiveGoogleReviews();

  /* ---------- 5. FORMULARZ KONTAKTOWY ---------- */
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const originalText = button.textContent;
      button.textContent = 'Wiadomość wysłana ✓';
      button.disabled = true;
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
        form.reset();
      }, 2500);
    });
  }

  /* ---------- ROK W STOPCE ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

});

// =========================================================
// POLITYKA COOKIES — proste okno informacyjne (wzorem roder.com.pl)
// Funkcje globalne, wywoływane bezpośrednio z onclick w index.html.
// Brak bannera zgody, brak kategorii, brak zapisu w localStorage —
// to tylko informacja, którą można w każdej chwili ponownie otworzyć
// linkiem w stopce.
// =========================================================
function openCookiePopup() {
  const popup = document.getElementById('cookiePopup');
  if (popup) {
    popup.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
}

function closeCookiePopup() {
  const popup = document.getElementById('cookiePopup');
  if (popup) {
    popup.classList.remove('is-open');
    document.body.style.overflow = '';
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCookiePopup();
});
