        document.addEventListener('DOMContentLoaded', function () {
            const formulario = document.getElementById('formularioContato');

            if (formulario) {
                formulario.addEventListener('submit', function (event) {
                    event.preventDefault();
                    alert('Obrigado pelo seu contato! Sua mensagem foi enviada com sucesso.');
                    window.location.href = 'index.html';
                });
            }
        });