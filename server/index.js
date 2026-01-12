const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// AJUSTE DE SEGURIDAD PARA RENDER: Usar la carpeta /tmp para la base de datos
// Esto evita el error de "Read-only file system"
const dbPath = path.join('/tmp', 'techtitan.db');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

let db;

async function conectarDB() {
    try {
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

        // Inyección forzada de Admin
        await db.run('INSERT OR IGNORE INTO usuarios (email, password, nombre) VALUES (?, ?, ?)', 
        ['admin@titantech.com', 'admin123', 'Administrador Maestro']);

        console.log(`✅ Base de datos iniciada en: ${dbPath}`);
    } catch (error) {
        console.error("❌ ERROR CRÍTICO DE DB:", error);
    }
}

conectarDB();

// RUTA DE PRUEBA: Si entras a tu-url.com/status y ves "OK", el servidor está vivo
app.get('/status', (req, res) => res.send('Servidor TITÁNTECH está VIVO 🚀'));

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const usuario = await db.get('SELECT * FROM usuarios WHERE email = ? AND password = ?', [email, password]);
        if (usuario) {
            res.json({ success: true, user: { email: usuario.email, nombre: usuario.nombre, rol: 'admin' } });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ... Mantén tus otras rutas aquí abajo igual que antes ...

app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Servidor en puerto ${PORT}`);
});
