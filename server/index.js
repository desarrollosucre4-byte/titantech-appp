const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Railway asigna el puerto automáticamente
const PORT = process.env.PORT || 3001;

// En Railway usamos la carpeta raíz del servidor para la DB
const dbPath = path.join(__dirname, 'techtitan.db');

let db;

async function iniciar() {
    try {
        db = await open({ filename: dbPath, driver: sqlite3.Database });
        
        // Crear tablas necesarias
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

        // Inyectar Admin por defecto
        await db.run(`INSERT OR IGNORE INTO usuarios (email, password, nombre) 
                      VALUES ('admin@titantech.com', 'admin123', 'Admin Maestro')`);
        
        console.log("✅ Base de Datos Persistente Activa en Railway");
    } catch (e) {
        console.error("❌ Error iniciando DB:", e);
    }
}
iniciar();

// --- RUTAS DE PRODUCTOS ---

app.get('/api/productos', async (req, res) => {
    try {
        const p = await db.all("SELECT * FROM productos");
        res.json(p);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener productos" });
    }
});

app.post('/api/admin/productos', async (req, res) => {
    const { nombre, precio, imagen, descripcion } = req.body;
    try {
        await db.run(
            'INSERT INTO productos (nombre, precio, imagen, descripcion) VALUES (?, ?, ?, ?)',
            [nombre, parseFloat(precio), imagen, descripcion]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/admin/productos/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM productos WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// --- RUTA DE LOGIN ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const u = await db.get("SELECT * FROM usuarios WHERE email=? AND password=?", [email, password]);
        if (u) {
            // Enviamos el rol 'admin' si el email es el correcto
            const rol = u.email === 'admin@titantech.com' ? 'admin' : 'user';
            return res.json({ 
                success: true, 
                user: { email: u.email, nombre: u.nombre, rol: rol } 
            });
        }
        res.status(401).json({ success: false, message: "Credenciales inválidas" });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Ruta de prueba para confirmar que el servidor responde
app.get('/', (req, res) => res.send("Servidor TITÁNTECH Operativo en Railway 🚀"));

app.listen(PORT, '0.0.0.0', () => console.log(`📡 Online en puerto ${PORT}`));
