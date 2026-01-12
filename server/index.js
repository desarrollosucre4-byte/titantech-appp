const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

// AJUSTE 1: Puerto dinámico para la nube (Render)
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

app.use('/uploads', express.static(uploadDir));

let db;

async function conectarDB() {
    db = await open({
        filename: './techtitan.db',
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

    // AJUSTE 2: Usuario Admin (Sigue siendo el mismo que tenías)
    const adminExists = await db.get('SELECT * FROM usuarios WHERE email = ?', ['admin@titantech.com']);
    if (!adminExists) {
        await db.run('INSERT INTO usuarios (email, password, nombre) VALUES (?, ?, ?)', 
        ['admin@titantech.com', 'admin123', 'Administrador Maestro']);
        console.log("👤 Usuario Admin creado: admin@titantech.com / admin123");
    }

    const prodCount = await db.get('SELECT count(*) as count FROM productos');
    if (prodCount.count === 0) {
        await db.run(`INSERT INTO productos (nombre, precio, imagen, descripcion) VALUES 
            ('Procesador Titán X1', 450, 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=400', 'Potencia extrema de 16 núcleos.'),
            ('GPU Neón RTX', 890, 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400', 'Gráficos ultra realistas con trazado de rayos.'),
            ('Módulo RAM RGB', 120, 'https://images.unsplash.com/photo-1541029071515-84cc54f84dc5?w=400', 'Velocidad de 3600MHz con iluminación dinámica.')`);
    }

    console.log("🚀 Sistema TITÁNTECH listo.");
}

conectarDB();

// --- RUTAS DE ADMIN ---

app.post('/api/admin/productos', upload.single('imagen'), async (req, res) => {
    try {
        const { nombre, precio, descripcion } = req.body;
        if (!req.file) return res.status(400).json({ success: false, message: 'Falta la imagen' });

        // AJUSTE 3: Ruta de imagen relativa para que funcione en cualquier URL
        const imagenUrl = `/uploads/${req.file.filename}`;
        await db.run(
            'INSERT INTO productos (nombre, precio, imagen, descripcion) VALUES (?, ?, ?, ?)',
            [nombre, parseFloat(precio), imagenUrl, descripcion]
        );
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.delete('/api/admin/productos/:id', async (req, res) => {
    try {
        await db.run('DELETE FROM productos WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// --- RUTAS DE USUARIO ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const usuario = await db.get('SELECT * FROM usuarios WHERE email = ? AND password = ?', [email, password]);
        if (usuario) {
            res.json({ success: true, user: { email: usuario.email, nombre: usuario.nombre } });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const existe = await db.get('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (existe) return res.status(400).json({ success: false, message: 'Ya registrado' });
        await db.run('INSERT INTO usuarios (email, password) VALUES (?, ?)', [email, password]);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/productos', async (req, res) => {
    try {
        const productos = await db.all('SELECT * FROM productos');
        res.json(productos);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/finalizar-compra', async (req, res) => {
    const { email, productos } = req.body;
    try {
        for (const p of productos) {
            await db.run(
                'INSERT INTO pedidos (usuario_email, producto_nombre, precio) VALUES (?, ?, ?)', 
                [email, p.nombre, p.precio]
            );
        }
        res.json({ success: true });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ success: false }); 
    }
});

app.get('/api/historial/:email', async (req, res) => {
    try {
        const pedidos = await db.all(
            'SELECT * FROM pedidos WHERE usuario_email = ? ORDER BY fecha DESC', 
            [req.params.email]
        );
        res.json(pedidos);
    } catch (e) { 
        res.status(500).json([]); 
    }
});

app.post('/api/tickets', async (req, res) => {
    const { email, titulo, prioridad } = req.body;
    const horasSLA = prioridad === 'Alta' ? 4 : prioridad === 'Media' ? 8 : 24;
    const vencimiento = new Date();
    vencimiento.setHours(vencimiento.getHours() + horasSLA);
    try {
        await db.run('INSERT INTO tickets (usuario_email, titulo, prioridad, vencimiento) VALUES (?, ?, ?, ?)',
            [email, titulo, prioridad, vencimiento.toISOString()]);
        res.json({ success: true, vencimiento: vencimiento.toISOString() });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/mis-tickets/:email', async (req, res) => {
    try {
        const tickets = await db.all('SELECT * FROM tickets WHERE usuario_email = ? ORDER BY fecha_creacion DESC', [req.params.email]);
        res.json(tickets);
    } catch (error) { res.status(500).json({ success: false }); }
});

// AJUSTE FINAL: Escuchar en el puerto que Render asigne
app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Servidor TITÁNTECH activo en puerto ${PORT}`);
});
