document.addEventListener('DOMContentLoaded', function () {
  const current = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.navbar .nav-link').forEach(function (link) {
    if ((link.getAttribute('href') || '').toLowerCase() === current) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  document.querySelectorAll('img').forEach(function (image) {
    image.addEventListener('error', function () {
      image.classList.add('image-missing');
    }, { once: true });
  });

  const navbar = document.querySelector('.navbar-collapse');
  document.querySelectorAll('.navbar .nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      if (navbar && navbar.classList.contains('show') && window.bootstrap) {
        window.bootstrap.Collapse.getOrCreateInstance(navbar).hide();
      }
    });
  });

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const sections = document.querySelectorAll('main > section, body > section:not(.banner-section):not(.dados-banner)');
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    sections.forEach(function (section) {
      section.classList.add('reveal-ready');
      observer.observe(section);
    });
  }

  const formulario = document.getElementById('formularioContato');
  if (formulario) {
    formulario.addEventListener('submit', function (event) {
      if (!formulario.checkValidity()) return;
      const botao = formulario.querySelector('[type="submit"]');
      if (botao) {
        botao.textContent = 'Enviando...';
        botao.setAttribute('aria-busy', 'true');
      }
    });
  }
});
