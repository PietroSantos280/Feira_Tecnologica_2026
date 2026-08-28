        function filtrar() {
            const bioma = document.getElementById('habitat-filter').value;
            const fauna = document.getElementById('fauna-filter').value;
            
            if (!bioma && !fauna) {
                alert('Por favor, selecione pelo menos uma opção para explorar!');
            } else {
                alert(`Buscando dados para: Bioma [${bioma || 'Todos'}] | Fauna [${fauna || 'Todas'}]`);
            }
        }