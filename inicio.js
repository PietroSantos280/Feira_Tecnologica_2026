document.addEventListener('DOMContentLoaded', () => {

  const current =
    (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  document.querySelectorAll('.navbar .nav-link').forEach(link => {

    const target =
      (link.getAttribute('href') || '')
        .split('/')
        .pop()
        .toLowerCase();

    if (target === current) {
      link.classList.add('active');
    }
  });

  const formulario =
    document.getElementById('formularioContato');

  if (formulario) {

    formulario.addEventListener('submit', event => {

      event.preventDefault();

      alert(
        'Obrigado pelo seu contato! Sua mensagem foi enviada com sucesso.'
      );

      window.location.href = 'index.html';
    });
  }

  if (
    !window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
  ) {

    document
      .querySelectorAll(
        'section .card, section .preservacao-item, section .contact-card, section .info-card'
      )
      .forEach((el, i) => {

        el.style.animationDelay =
          `${Math.min(i * 45, 260)}ms`;

      });
  }

});