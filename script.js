// =========================================================
// HEDER — skrypty strony
// 1. Menu hamburgera (mobile)
// 2. Płynne pojawianie się sekcji przy scrollu
// 3. Prosta walidacja/feedback formularza kontaktowego
// =========================================================

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

  // Zamknij menu po kliknięciu w link (płynne przejście do sekcji)
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Zamknij menu, jeśli okno zostanie powiększone do wersji desktopowej
  window.addEventListener('resize', () => {
    if (window.innerWidth > 780) closeMenu();
  });

  /* ---------- 2. SCROLL REVEAL ---------- */
  // Dodajemy klasę .reveal do elementów, które mają się płynnie pojawiać
  const revealTargets = document.querySelectorAll(
    '.service-card, .review-card, .about-text, .contact-info, .contact-form, .hero-inner'
  );
  revealTargets.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealTargets.forEach(el => observer.observe(el));

  /* ---------- 3. FORMULARZ KONTAKTOWY ---------- */
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Miejsce na docelową integrację (np. wysyłka na e-mail / backend).
      // Na razie tylko potwierdzenie wizualne dla użytkownika.
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

  /* ---------- 4. ROK W STOPCE ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

});
