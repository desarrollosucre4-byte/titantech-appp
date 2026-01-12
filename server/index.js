const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
// Usamos /tmp para que Render no bloquee la escritura de la base de datos
const dbPath = path.join('/tmp', 'techtitan.db');

let db;

async function conectarDB() {
    db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            nombre TEXT
        );
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT,
            precio REAL,
            imagen TEXT,
            descripcion TEXT
        );
    `);

    // Inyectamos el Admin y productos de prueba automáticamente
    await db.run("INSERT OR IGNORE INTO usuarios (email, password, nombre) VALUES ('admin@titantech.com', 'admin123', 'Admin Maestro')");
    
    const count = await db.get("SELECT COUNT(*) as total FROM productos");
    if (count.total === 0) {
        await db.run(`INSERT INTO productos (nombre, precio, imagen, descripcion) VALUES 
            ('Procesador Titán', 450, 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400', '16 núcleos'),
            ('Teclado RGB', 85, 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400', 'Mecánico')`);
    }
    console.log("✅ Servidor y DB listos en /tmp");
}

conectarDB();

app.get('/api/productos', async (req, res) => {
    const prods = await db.all("SELECT * FROM productos");
    res.json(prods);
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.get("SELECT * FROM usuarios WHERE email = ? AND password = ?", [email, password]);
    if (user) return res.json({ success: true, user: { ...user, rol: 'admin' } });
    res.status(401).json({ success: false });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Listening on ${PORT}`));
