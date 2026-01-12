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

// AJUSTE DE CARPETA UPLOADS: Usamos la ruta local del proyecto
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

app.use('/uploads', express.static(uploadDir));

let db;

async function conectarDB() {
    // AJUSTE CLAVE: Eliminamos cualquier referencia a /data
    // Se guarda en la raíz del servidor para que Render no dé error de permisos
    db = await open({
        filename: path.join(__dirname, 'techtitan.db'),
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
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_email TEXT,
            producto_nombre TEXT,
            precio REAL,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_email TEXT,
            titulo TEXT,
            prioridad TEXT,
            vencimiento DATETIME,
            estado TEXT DEFAULT 'Abierto',
            fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Inyectamos el admin directamente en el arranque
    const adminExists = await db.get('SELECT * FROM usuarios WHERE email = ?', ['admin@titantech.com']);
    if (!adminExists) {
        await db.run('INSERT INTO usuarios (email, password, nombre) VALUES (?, ?, ?)', 
        ['admin@titantech.com', 'admin123', 'Administrador Maestro']);
        console.log("👤 Admin inyectado en base de datos local");
    }

    console.log("🚀 Base de datos SQLite conectada en modo local (Tier Gratuito)");
}

conectarDB();

// --- RUTAS (Simplificadas para evitar errores) ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const usuario = await db.get('SELECT * FROM usuarios WHERE email = ? AND password = ?', [email, password]);
        if (usuario) {
            const rol = usuario.email === 'admin@titantech.com' ? 'admin' : 'user';
            res.json({ success: true, user: { email: usuario.email, nombre: usuario.nombre, rol } });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/productos', async (req, res) => {
    try {
        const productos = await db.all('SELECT * FROM productos');
        res.json(productos);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/admin/productos', upload.single('imagen'), async (req, res) => {
    try {
        const { nombre, precio, descripcion } = req.body;
        const imagenUrl = `/uploads/${req.file.filename}`;
        await db.run('INSERT INTO productos (nombre, precio, imagen, descripcion) VALUES (?, ?, ?, ?)',
            [nombre, parseFloat(precio), imagenUrl, descripcion]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// Más rutas... (puedes mantener las de pedidos y tickets igual)

app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Servidor TITÁNTECH activo en puerto ${PORT}`);
});
