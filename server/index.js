const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Railway asigna el puerto automáticamente en esta variable
const PORT = process.env.PORT || 3001;

// En Railway sí podemos escribir en la carpeta del proyecto
const dbPath = path.join(__dirname, 'techtitan.db');

let db;

async function iniciar() {
    try {
        db = await open({ filename: dbPath, driver: sqlite3.Database });
        await db.exec(`
            CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT, nombre TEXT);
            CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL, imagen TEXT);
        `);
        // Crear Admin
        await db.run("INSERT OR IGNORE INTO usuarios (email, password, nombre) VALUES ('admin@titantech.com', 'admin123', 'Admin Maestro')");
        console.log("✅ Base de Datos Persistente Activa");
    } catch (e) {
        console.error("Error iniciando DB", e);
    }
}
iniciar();

app.get('/api/productos', async (req, res) => {
    const p = await db.all("SELECT * FROM productos");
    res.json(p);
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const u = await db.get("SELECT * FROM usuarios WHERE email=? AND password=?", [email, password]);
    if (u) return res.json({ success: true, user: { ...u, rol: 'admin' } });
    res.status(401).json({ success: false });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Servidor en puerto ${PORT}`));
