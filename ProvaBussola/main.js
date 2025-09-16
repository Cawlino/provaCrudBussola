const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        initializeDb();
    }
});

function initializeDb() {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS cursos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                carga_horaria INTEGER,
                data_inicio TEXT
            );
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS disciplinas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL UNIQUE
            );
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS curso_disciplinas (
                curso_id INTEGER,
                disciplina_id INTEGER,
                FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
                FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id) ON DELETE CASCADE,
                PRIMARY KEY (curso_id, disciplina_id)
            );
        `);
    });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function createCurso(nome, cargaHoraria, dataInicio) {
    const sql = `INSERT INTO cursos (nome, carga_horaria, data_inicio) VALUES (?, ?, ?)`;
    return new Promise((resolve, reject) => {
        db.run(sql, [nome, cargaHoraria, dataInicio], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
        });
    });
}

async function readCursos() {
    const cursosSql = `SELECT * FROM cursos`;
    const cursos = await new Promise((resolve, reject) => {
        db.all(cursosSql, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });

    for (const curso of cursos) {
        const disciplinasSql = `
            SELECT d.id, d.nome FROM disciplinas d
            JOIN curso_disciplinas cd ON d.id = cd.disciplina_id
            WHERE cd.curso_id = ?
        `;
        curso.disciplinas = await new Promise((resolve, reject) => {
            db.all(disciplinasSql, [curso.id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
    return cursos;
}

function deleteCurso(id) {
    const sql = `DELETE FROM cursos WHERE id = ?`;
    return new Promise((resolve, reject) => {
        db.run(sql, id, function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
}

async function findOrCreateDisciplina(nome) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT id FROM disciplinas WHERE nome = ?`, [nome], (err, row) => {
            if (err) return reject(err);
            if (row) return resolve(row);
            db.run(`INSERT INTO disciplinas (nome) VALUES (?)`, [nome], function(err) {
                if (err) return reject(err);
                resolve({ id: this.lastID });
            });
        });
    });
}

function addDisciplinaToCurso(cursoId, disciplinaId) {
    const sql = `INSERT INTO curso_disciplinas (curso_id, disciplina_id) VALUES (?, ?)`;
    return new Promise((resolve, reject) => {
        db.run(sql, [cursoId, disciplinaId], function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
}

function removeDisciplinaFromCurso(cursoId, disciplinaId) {
    const sql = `DELETE FROM curso_disciplinas WHERE curso_id = ? AND disciplina_id = ?`;
    return new Promise((resolve, reject) => {
        db.run(sql, [cursoId, disciplinaId], function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
}

app.get('/cursos', async (req, res) => {
    try {
        const cursos = await readCursos();
        res.json(cursos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/cursos', async (req, res) => {
    try {
        const { nome, cargaHoraria, dataInicio } = req.body;
        const novoCurso = await createCurso(nome, cargaHoraria, dataInicio);
        res.status(201).json(novoCurso);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/cursos/:id', async (req, res) => {
    try {
        const result = await deleteCurso(req.params.id);
        if (result.changes === 0) return res.status(404).json({ error: 'Curso não encontrado' });
        res.status(200).json({ message: 'Curso deletado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/cursos/:id/disciplinas', async (req, res) => {
    try {
        const cursoId = req.params.id;
        const { nome } = req.body;
        if (!nome) return res.status(400).json({ error: 'O nome da disciplina é obrigatório' });

        const disciplina = await findOrCreateDisciplina(nome);
        await addDisciplinaToCurso(cursoId, disciplina.id);
        res.status(201).json({ message: 'Disciplina adicionada com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/cursos/:cursoId/disciplinas/:disciplinaId', async (req, res) => {
    try {
        const { cursoId, disciplinaId } = req.params;
        const result = await removeDisciplinaFromCurso(cursoId, disciplinaId);
        if (result.changes === 0) return res.status(404).json({ error: 'Associação não encontrada' });
        res.status(200).json({ message: 'Disciplina removida com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

