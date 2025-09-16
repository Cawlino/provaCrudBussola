document.addEventListener('DOMContentLoaded', () => {
    const cursosList = document.getElementById('cursos-list');
    const addCursoForm = document.getElementById('add-curso-form');
    const API_URL = 'http://localhost:3000';

    function renderDisciplinas(disciplinas, cursoId) {
        if (!disciplinas || disciplinas.length === 0) {
            return '<p>Nenhuma disciplina cadastrada.</p>';
        }
        return `
            <ul>
                ${disciplinas.map(d => `
                    <li>
                        ${d.nome}
                        <button class="delete-disciplina-btn" data-curso-id="${cursoId}" data-disciplina-id="${d.id}">Remover</button>
                    </li>
                `).join('')}
            </ul>
        `;
    }

    async function fetchAndRenderCursos() {
        try {
            const response = await fetch(`${API_URL}/cursos`);
            const cursos = await response.json();
            cursosList.innerHTML = '';

            cursos.forEach(curso => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div>
                        <strong>${curso.nome}</strong> (Carga Horária: ${curso.carga_horaria}h) - Início: ${curso.data_inicio}
                        <button class="delete-curso-btn" data-id="${curso.id}">Deletar Curso</button>
                    </div>
                    <div>
                        <h4>Disciplinas</h4>
                        ${renderDisciplinas(curso.disciplinas, curso.id)}
                        <form class="add-disciplina-form" data-curso-id="${curso.id}">
                            <input type="text" name="disciplinaNome" placeholder="Nova disciplina" required>
                            <button type="submit">Adicionar</button>
                        </form>
                    </div>
                `;
                cursosList.appendChild(li);
            });
        } catch (error) {
            console.error('Erro ao buscar cursos:', error);
        }
    }

    addCursoForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const { nome, cargaHoraria, dataInicio } = event.target.elements;
        try {
            await fetch(`${API_URL}/cursos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: nome.value, cargaHoraria: cargaHoraria.value, dataInicio: dataInicio.value }),
            });
            addCursoForm.reset();
            fetchAndRenderCursos();
        } catch (error) {
            console.error('Erro ao adicionar curso:', error);
        }
    });

    cursosList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-curso-btn')) {
            const cursoId = event.target.dataset.id;
            try {
                await fetch(`${API_URL}/cursos/${cursoId}`, { method: 'DELETE' });
                fetchAndRenderCursos();
            } catch (error) {
                console.error('Erro ao deletar curso:', error);
            }
        }
        if (event.target.classList.contains('delete-disciplina-btn')) {
            const { cursoId, disciplinaId } = event.target.dataset;
            try {
                await fetch(`${API_URL}/cursos/${cursoId}/disciplinas/${disciplinaId}`, { method: 'DELETE' });
                fetchAndRenderCursos();
            } catch (error) {
                console.error('Erro ao remover disciplina:', error);
            }
        }
    });
    
    cursosList.addEventListener('submit', async (event) => {
        if (event.target.classList.contains('add-disciplina-form')) {
            event.preventDefault();
            const cursoId = event.target.dataset.cursoId;
            const disciplinaNome = event.target.elements.disciplinaNome.value;
            if (!disciplinaNome) return;
            try {
                await fetch(`${API_URL}/cursos/${cursoId}/disciplinas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome: disciplinaNome }),
                });
                fetchAndRenderCursos();
            } catch (error) {
                console.error('Erro ao adicionar disciplina:', error);
            }
        }
    });

    fetchAndRenderCursos();
});
