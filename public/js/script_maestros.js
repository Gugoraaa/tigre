document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    if (message) {
        alert(message); // Muestra el mensaje pasado en la URL
    }
    
    // Recuperar el ID del maestro y del usuario desde los campos ocultos en el HTML
    const maestroId = document.getElementById('maestro-id').value;
    const usuarioId = document.getElementById('usuario-id').value;

    // Campo de búsqueda
    const busquedaInput = document.getElementById('busqueda');
    const resultadosList = document.getElementById('resultados');

    busquedaInput.addEventListener('input', function() {
        const query = this.value;

        // Solo buscar si hay más de una letra
        if (query.length > 0) {
            fetch(`/buscar?q=${query}`)
                .then(response => response.json())
                .then(data => {
                    resultadosList.innerHTML = ''; // Limpiar resultados anteriores

                    // Mostrar resultados
                    data.forEach(item => {
                        const li = document.createElement('li');
                        li.className = 'p-2 hover:bg-gray-200 cursor-pointer'; // Estilos para los resultados
                        li.textContent = item;

                        // Evento de clic en cada resultado
                        li.addEventListener('click', function() {
                            busquedaInput.value = item; // Rellenar el campo de búsqueda con el resultado seleccionado
                            resultadosList.innerHTML = ''; // Limpiar la lista de resultados después de seleccionar
                        });

                        resultadosList.appendChild(li);
                    });
                })
                .catch(error => console.error('Error en la búsqueda:', error));
        } else {
            resultadosList.innerHTML = ''; // Limpiar si no hay texto
        }
    });

    // Capturar el evento Enter en el campo de búsqueda
    busquedaInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Evitar el comportamiento por defecto

            const query = this.value;

            // Redirigir al usuario a una nueva página con la búsqueda
            window.location.href = `/perfil-maestro?q=${encodeURIComponent(query)}`;
        }
    });

    const opinionForm = document.getElementById('opinion-form');

    opinionForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevenir el comportamiento por defecto del formulario

        // Obtener los valores del dropdown y del input de opinión
        const materiaSeleccionada = document.getElementById('materia-dropdown').value;
        const opinion = document.getElementById('opinion-input').value;

        // Validación: verificar que la opinión no esté vacía
        if (!opinion.trim()) {
            alert('Por favor, escribe una opinión.');
            return;
        }

        // Verificar si el usuario está logueado
        if (parseInt(usuarioId) <= 0) { // Comparar como número
            alert('Necesitas iniciar sesión');
            return;
        }

        // Aquí puedes enviar los datos al servidor usando fetch
        fetch('/post_opinion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                materia: materiaSeleccionada,
                opinion: opinion,
                maestroID: maestroId // Usa el ID del maestro desde el campo oculto
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Mostrar un mensaje de éxito o actualizar la página
                alert('Opinión enviada con éxito');
            } else {
                alert('Hubo un error al enviar la opinión');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });

        // Limpiar el campo de opinión después de enviar
        document.getElementById('opinion-input').value = '';
    });
});
