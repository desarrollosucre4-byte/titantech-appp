import { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { 
  ShoppingCart, User, ShieldCheck, PlusCircle, Info, 
  LayoutDashboard, Mail, Phone, MapPin, Package, 
  Clock, CheckCircle, X, Trash2, ChevronRight, AlertTriangle 
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState('inicio');
  const [prods, setProds] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usuarioActivo, setUsuarioActivo] = useState(null);
  const [notificacion, setNotificacion] = useState({ visible: false, texto: '' });

  // ESTADOS DE CARRITO, CHECKOUT Y TICKETS
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [envio, setEnvio] = useState({ direccion: '', telefono: '', ciudad: '' });
  const [ticketData, setTicketData] = useState({ titulo: '', prioridad: 'Media' });
  const [misTickets, setMisTickets] = useState([]);

  // ESTADOS DE MODALES Y ADMIN
  const [selectedProduct, setSelectedProduct] = useState(null); 
  const [productToDelete, setProductToDelete] = useState(null); 
  const [newProd, setNewProd] = useState({ nombre: '', precio: '', descripcion: '' });

  const totalCart = cart.reduce((acc, curr) => acc + curr.precio, 0);
  const isAdmin = usuarioActivo?.email === 'admin@titantech.com';

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    if (usuarioActivo) {
      cargarHistorial();
      fetch(`http://localhost:3001/api/mis-tickets/${usuarioActivo.email}`).then(r => r.json()).then(setMisTickets);
    }
  }, [usuarioActivo]);

  const cargarProductos = () => {
    fetch('http://localhost:3001/api/productos').then(r => r.json()).then(setProds).catch(() => console.log("Servidor Offline"));
  };

  const cargarHistorial = () => {
    if (usuarioActivo) {
      fetch(`http://localhost:3001/api/historial/${usuarioActivo.email}`).then(r => r.json()).then(setHistorial);
    }
  };

  const mostrarAviso = (txt) => {
    setNotificacion({ visible: true, texto: txt });
    setTimeout(() => setNotificacion({ visible: false, texto: '' }), 3000);
  };

  // --- LÓGICA DE ADMIN ---
  const eliminarProductoReal = async () => {
    if (!productToDelete) return;
    const res = await fetch(`http://localhost:3001/api/admin/productos/${productToDelete.id}`, { method: 'DELETE' });
    if(res.ok) { 
        mostrarAviso("Hardware eliminado del sistema"); 
        cargarProductos(); 
        setProductToDelete(null); 
    }
  };

  const eliminarProducto = (p) => {
    setProductToDelete(p); 
  };

  const guardarProductoAdmin = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('nombre', newProd.nombre);
    formData.append('precio', newProd.precio);
    formData.append('descripcion', newProd.descripcion);
    formData.append('imagen', e.target.imagen.files[0]); 

    try {
      const res = await fetch('http://localhost:3001/api/admin/productos', {
        method: 'POST',
        body: formData 
      });
      if (res.ok) {
        mostrarAviso("Hardware inyectado con éxito");
        setNewProd({ nombre: '', precio: '', descripcion: '' });
        cargarProductos();
        setView('productos');
      }
    } catch (err) { mostrarAviso("Error en la subida"); }
  };

  // --- LÓGICA DE COMPRA ---
  const agregarAlCarrito = (p) => {
    setCart([...cart, p]);
    mostrarAviso(`${p.nombre} añadido`);
  };

  const finalizarPedido = async (e) => {
    e.preventDefault();
    if (!usuarioActivo) return setView('login');
    try {
      const res = await fetch('http://localhost:3001/api/finalizar-compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usuarioActivo.email, productos: cart, ...envio })
      });
      if (res.ok) {
        mostrarAviso("¡Orden de compra procesada!");
        setCart([]);
        cargarHistorial(); // Actualiza el historial inmediatamente
        setView('historial');
      }
    } catch (err) { mostrarAviso("Error en la transacción"); }
  };

  // --- LÓGICA DE SOPORTE ---
  const enviarTicketSLA = async (e) => {
    e.preventDefault();
    if (!usuarioActivo) return setView('login');
    try {
      const res = await fetch('http://localhost:3001/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: usuarioActivo.email, titulo: ticketData.titulo, prioridad: ticketData.prioridad })
      });
      const data = await res.json();
      if (data.success) {
        mostrarAviso(`Ticket Creado con Éxito`);
        setView('soporte_lista');
        fetch(`http://localhost:3001/api/mis-tickets/${usuarioActivo.email}`).then(r => r.json()).then(setMisTickets);
      }
    } catch (err) { mostrarAviso("Error al generar ticket"); }
  };

  // --- AUTENTICACIÓN ---
  const loginReal = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        setUsuarioActivo(data.user);
        setView('inicio');
        mostrarAviso(`Bienvenido: @${data.user.email.split('@')[0]}`);
      } else { mostrarAviso("Acceso Denegado"); }
    } catch (err) { mostrarAviso("Error de Servidor"); }
  };

  const registrarNuevo = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) { mostrarAviso("Registro exitoso."); setView('login'); }
      else { mostrarAviso(data.message); }
    } catch (err) { mostrarAviso("Error de red"); }
  };

  const iniciarConGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      mostrarAviso("Sincronizando Google Auth...");
      const resInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const perfil = await resInfo.json();
      const resServer = await fetch('http://localhost:3001/api/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: perfil.email, nombre: perfil.name })
      });
      const data = await resServer.json();
      if (data.success) {
        setUsuarioActivo(data.user);
        setView('inicio');
        mostrarAviso(`Identificado como: ${perfil.name}`);
      }
    }
  });

  const Navbar = () => (
    <nav className="p-6 bg-[#0f172a]/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center sticky top-0 z-50 px-10 text-white font-black italic">
      <h1 onClick={() => setView('inicio')} className="text-2xl text-blue-500 cursor-pointer flex items-center gap-2 uppercase tracking-tighter">
        <ShieldCheck size={28} /> TITÁNTECH
      </h1>
      <div className="flex gap-8 text-[10px] uppercase tracking-widest items-center">
        <button onClick={() => setView('inicio')} className={view === 'inicio' ? 'text-blue-400' : ''}>Inicio</button>
        <button onClick={() => setView('productos')} className={view === 'productos' ? 'text-blue-400' : ''}>Tienda</button>
        <button onClick={() => setView('soporte')} className={view === 'soporte' ? 'text-blue-400' : ''}>Soporte</button>
        <button onClick={() => setView('historial')} className={view === 'historial' ? 'text-blue-400' : ''}>Historial</button>
        {isAdmin && (
          <button onClick={() => setView('admin')} className="text-yellow-400 flex items-center gap-1 border border-yellow-400/20 px-3 py-1 rounded-md">
            <LayoutDashboard size={14} /> Admin
          </button>
        )}
        <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 bg-blue-600/20 p-2 px-4 rounded-lg border border-blue-500/30">
          <ShoppingCart size={16} /> ({cart.length})
        </button>
        {usuarioActivo ? (
          <div className="flex items-center gap-4">
            <span className="text-blue-400 border border-blue-400/20 px-3 py-1 rounded-lg">@{usuarioActivo.nombre || usuarioActivo.email.split('@')[0]}</span>
            <button onClick={() => { setUsuarioActivo(null); setView('inicio'); }} className="text-red-500 font-bold uppercase text-[10px]">Salir</button>
          </div>
        ) : (
          <button onClick={() => setView('login')} className="bg-blue-600 px-5 py-2 rounded-full text-[10px] font-bold uppercase">Entrar</button>
        )}
      </div>
    </nav>
  );

  const Footer = () => (
    <footer className="bg-[#0f172a] border-t border-white/5 p-16 mt-20 text-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 text-[10px] uppercase font-bold tracking-widest">
        <div className="space-y-4">
          <h1 className="text-xl font-black italic text-blue-500 flex items-center gap-2"><ShieldCheck /> TITÁNTECH</h1>
          <p className="flex items-center gap-2 text-slate-500"><MapPin size={14}/> Sector 7 - CyberCity</p>
          <p className="flex items-center gap-2 text-slate-500"><Phone size={14}/> +54 911 000-TITAN</p>
          <p className="flex items-center gap-2 text-slate-500"><Mail size={14}/> admin@titantech.com</p>
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-blue-500 mb-2 font-black">Navegación</span>
          <button onClick={() => setView('inicio')} className="text-left">Inicio</button>
          <button onClick={() => setView('productos')} className="text-left">Tienda</button>
          <button onClick={() => setView('historial')} className="text-left">Mis Órdenes</button>
        </div>
        <div className="flex flex-col gap-3 text-slate-400">
          <span className="text-blue-500 mb-2 text-white font-black">Pagos</span>
          <span>Google Pay</span>
          <span>Crypto Payments</span>
          <span>Visa / Mastercard</span>
        </div>
        <div className="text-right flex flex-col justify-end text-slate-600 font-black italic">
          <p>Mesa de Servicio SLA Activa</p>
          <p>© 2026 TITÁNTECH CORPORATION</p>
        </div>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30">
      <Navbar />

      {/* MODAL CONFIRMACIÓN ELIMINAR */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[600] flex items-center justify-center p-6">
          <div className="bg-[#0f172a] max-w-sm w-full rounded-[2.5rem] border border-red-500/30 p-10 text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter mb-4">¿Confirmar Borrado?</h2>
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest leading-relaxed mb-8">
              Estás a punto de eliminar <span className="text-white">"{productToDelete.nombre}"</span> de la terminal. Esta acción es irreversible.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={eliminarProductoReal}
                className="w-full bg-red-600 py-4 rounded-2xl font-black uppercase text-white hover:bg-red-500 transition shadow-lg shadow-red-600/20"
              >
                Eliminar Permanente
              </button>
              <button 
                onClick={() => setProductToDelete(null)}
                className="w-full bg-white/5 py-4 rounded-2xl font-black uppercase text-slate-400 hover:text-white transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESPECIFICACIONES */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[300] flex items-center justify-center p-6">
          <div className="bg-[#0f172a] max-w-3xl w-full rounded-[3rem] border border-white/10 overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 text-white bg-white/5 p-2 rounded-full z-10"><X size={20}/></button>
            <div className="md:w-1/2 bg-slate-900 flex items-center justify-center p-8">
              <img src={selectedProduct.imagen} className="w-full h-auto object-contain rounded-2xl" alt={selectedProduct.nombre} />
            </div>
            <div className="md:w-1/2 p-10 flex flex-col">
              <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">{selectedProduct.nombre}</h2>
              <p className="text-blue-400 text-4xl font-black italic my-6">${selectedProduct.precio}</p>
              <div className="flex-1 overflow-y-auto">
                <span className="text-blue-500 font-black text-[10px] uppercase mb-3 flex items-center gap-2"><Info size={14}/> Especificaciones</span>
                <p className="text-slate-400 text-xs leading-relaxed uppercase font-medium">{selectedProduct.descripcion || "Diseño de alto rendimiento TITÁN."}</p>
              </div>
              <button 
                onClick={() => { agregarAlCarrito(selectedProduct); setSelectedProduct(null); }}
                className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase text-white mt-8 hover:bg-blue-500 transition shadow-lg"
              >
                Añadir a la Orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CANASTA */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex justify-end">
          <div className="w-full max-w-md bg-[#0f172a] h-full p-10 border-l border-blue-500/20 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-5 font-black italic uppercase text-blue-500">
              <h2 className="text-2xl flex items-center gap-2"><ShoppingCart /> Mi Canasta</h2>
              <button onClick={() => setIsCartOpen(false)}><X /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {cart.map((item, idx) => (
                <div key={idx} className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5">
                  <span className="text-xs font-bold uppercase">{item.nombre}</span>
                  <span className="text-blue-400 font-black">${item.precio}</span>
                </div>
              ))}
              {cart.length === 0 && <p className="text-center italic text-slate-600 uppercase text-[10px] py-10 font-black">Canasta Vacía</p>}
            </div>
            <div className="border-t border-white/5 pt-8 mt-6">
              <div className="flex justify-between text-2xl font-black italic uppercase mb-8">
                <span>Total:</span>
                <span className="text-white font-black">${totalCart}</span>
              </div>
              <button 
                onClick={() => { setIsCartOpen(false); setView('checkout'); }}
                className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase text-white shadow-lg"
                disabled={cart.length === 0}
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA PRODUCTOS */}
      {view === 'productos' && (
        <main className="max-w-7xl mx-auto p-12 grid grid-cols-1 md:grid-cols-3 gap-10 animate-in fade-in duration-500">
          {prods.map(p => (
            <div key={p.id} className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-3 group hover:border-blue-500/50 transition-all shadow-2xl relative">
              <div className="h-56 rounded-[2rem] bg-slate-900 overflow-hidden relative">
                <img src={p.imagen} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-700" alt={p.nombre} />
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  {isAdmin && (
                    <button onClick={() => eliminarProducto(p)} className="bg-red-500/80 p-3 rounded-full text-white hover:bg-red-600 backdrop-blur-md">
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button onClick={() => setSelectedProduct(p)} className="bg-blue-600/80 p-3 rounded-full text-white backdrop-blur-md">
                    <Info size={16} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white uppercase italic tracking-tighter">{p.nombre}</h3>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-blue-400 text-3xl font-black italic">${p.precio}</p>
                  <button onClick={() => setSelectedProduct(p)} className="text-[9px] font-black uppercase text-slate-500 hover:text-white flex items-center gap-1">Ver <ChevronRight size={12}/></button>
                </div>
                <button 
                  onClick={() => agregarAlCarrito(p)} 
                  className="w-full mt-6 bg-white/5 border border-white/10 text-white py-4 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition"
                >
                  Adquirir
                </button>
              </div>
            </div>
          ))}
        </main>
      )}

      {/* VISTA INICIO CON NOVEDADES */}
      {view === 'inicio' && (
        <div className="animate-in fade-in duration-700">
          <section className="h-[70vh] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
            <div className="absolute w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] -z-10 animate-pulse"></div>
            <h2 className="text-8xl font-black italic uppercase mb-6 text-white tracking-tighter leading-none text-center">
              HARDWARE <br /> <span className="text-blue-500">EXTREMO</span>
            </h2>
            <p className="text-slate-400 uppercase tracking-[0.4em] text-[10px] mb-8 font-bold text-center">Protocolos de alto rendimiento activados</p>
            <button 
              onClick={() => setView('productos')} 
              className="bg-white text-black px-12 py-4 rounded-full font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2 group"
            >
              Explorar Terminal <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />
            </button>
          </section>

          <section className="max-w-7xl mx-auto px-10 pb-20">
            <div className="flex items-center gap-4 mb-12">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
              <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter flex items-center gap-3">
                <Package className="text-blue-500" size={24} /> Novedades del Arsenal
              </h3>
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...prods].reverse().slice(0, 4).map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedProduct(p)}
                  className="bg-[#0f172a] border border-white/5 rounded-[2rem] p-4 group hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden shadow-2xl"
                >
                  <div className="absolute top-2 left-2 z-10">
                    <span className="bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded-full animate-bounce">Nuevo</span>
                  </div>
                  <div className="h-40 rounded-2xl bg-slate-900 mb-4 overflow-hidden">
                    <img src={p.imagen} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-500" alt={p.nombre} />
                  </div>
                  <h4 className="text-xs font-black text-white uppercase italic truncate">{p.nombre}</h4>
                  <p className="text-blue-400 font-black mt-1">${p.precio}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* VISTA HISTORIAL */}
      {view === 'historial' && (
        <div className="max-w-4xl mx-auto p-12 animate-in slide-in-from-bottom-10 duration-500">
          <h2 className="text-4xl font-black italic mb-10 text-blue-500 uppercase font-black tracking-tighter">Bitácora de Órdenes</h2>
          <div className="space-y-4">
            {historial.length > 0 ? historial.map(h => (
              <div key={h.id} className="bg-[#0f172a] p-6 rounded-3xl border border-white/5 flex justify-between items-center group hover:border-blue-500/20 transition-all">
                <div>
                  <p className="font-black text-xl uppercase italic tracking-tighter text-white">{h.producto_nombre}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-black">
                    ID Transacción: #{h.id.toString().padStart(6, '0')} | {new Date(h.fecha).toLocaleDateString()} {new Date(h.fecha).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-blue-400 font-black text-3xl italic">${h.precio}</p>
                  <span className="text-[8px] bg-blue-500/10 text-blue-500 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-blue-500/20">Procesado</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                <Package size={48} className="mx-auto text-slate-700 mb-4 opacity-20" />
                <p className="italic text-slate-600 uppercase text-xs font-black tracking-widest">Sin transacciones registradas en el mainframe.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA ADMIN */}
      {view === 'admin' && isAdmin && (
        <div className="max-w-2xl mx-auto py-20 px-6 animate-in fade-in">
          <div className="bg-[#0f172a] p-12 rounded-[3rem] border border-yellow-500/20 shadow-2xl">
            <h2 className="text-3xl font-black italic mb-8 uppercase text-yellow-500 flex items-center gap-3"><PlusCircle size={30}/> Nuevo Hardware</h2>
            <form onSubmit={guardarProductoAdmin} className="space-y-4 text-white">
              <input type="text" placeholder="NOMBRE" className="w-full p-4 bg-[#020617] border border-slate-800 rounded-2xl text-xs font-bold uppercase outline-none focus:border-yellow-500" value={newProd.nombre} onChange={(e) => setNewProd({...newProd, nombre: e.target.value})} required />
              <textarea placeholder="ESPECIFICACIONES" className="w-full p-4 bg-[#020617] border border-slate-800 rounded-2xl text-xs font-bold h-32 uppercase outline-none focus:border-yellow-500" value={newProd.descripcion} onChange={(e) => setNewProd({...newProd, descripcion: e.target.value})} required />
              <input type="number" placeholder="PRECIO ($)" className="w-full p-4 bg-[#020617] border border-slate-800 rounded-2xl text-xs font-bold uppercase outline-none focus:border-yellow-500" value={newProd.precio} onChange={(e) => setNewProd({...newProd, precio: parseFloat(e.target.value)})} required />
              <input type="file" name="imagen" accept="image/*" className="w-full p-4 bg-[#020617] border border-slate-800 rounded-2xl text-xs text-slate-400" required />
              <button className="w-full bg-yellow-500 py-5 rounded-2xl font-black uppercase text-black hover:bg-yellow-400 transition">Publicar en Arsenal</button>
            </form>
          </div>
        </div>
      )}

      {/* VISTA CHECKOUT */}
      {view === 'checkout' && (
        <div className="max-w-2xl mx-auto py-20 px-6">
          <div className="bg-[#0f172a] p-12 rounded-[3rem] border border-blue-500/20 shadow-2xl">
            <h2 className="text-3xl font-black italic mb-2 uppercase text-white flex items-center gap-3"><Package /> Envío</h2>
            <form onSubmit={finalizarPedido} className="space-y-6 mt-8">
              <input type="text" placeholder="DIRECCIÓN" className="w-full p-5 bg-[#020617] border border-slate-800 rounded-2xl text-xs font-bold uppercase text-white outline-none" onChange={(e) => setEnvio({...envio, direccion: e.target.value})} required />
              <input type="text" placeholder="TELÉFONO" className="w-full p-5 bg-[#020617] border border-slate-800 rounded-2xl text-xs font-bold uppercase text-white outline-none" onChange={(e) => setEnvio({...envio, telefono: e.target.value})} required />
              <button className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase italic shadow-2xl text-white">Finalizar Orden de ${totalCart}</button>
            </form>
          </div>
        </div>
      )}

      {/* VISTA SOPORTE */}
      {view === 'soporte' && (
        <div className="max-w-2xl mx-auto py-20 px-6">
          <div className="bg-[#0f172a] p-12 rounded-[3rem] border border-blue-500/20 shadow-2xl">
            <h2 className="text-3xl font-black italic mb-2 uppercase flex items-center gap-2"><Clock /> Mesa de Ayuda</h2>
            <form onSubmit={enviarTicketSLA} className="space-y-6 mt-8">
              <input type="text" placeholder="ASUNTO" className="w-full p-5 bg-[#020617] border border-slate-800 rounded-2xl text-xs font-bold uppercase text-white outline-none" onChange={(e) => setTicketData({...ticketData, titulo: e.target.value})} required />
              <select className="w-full p-5 bg-[#020617] border border-slate-800 rounded-2xl text-xs font-bold uppercase text-white outline-none" onChange={(e) => setTicketData({...ticketData, prioridad: e.target.value})}>
                <option value="Baja">Prioridad Baja (24h)</option>
                <option value="Media">Prioridad Media (8h)</option>
                <option value="Alta">Prioridad Alta (4h)</option>
              </select>
              <button className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase italic text-white">Abrir Ticket SLA</button>
              <button type="button" onClick={() => setView('soporte_lista')} className="w-full text-[10px] font-black uppercase text-slate-500 underline mt-4">Ver Bitácora de Soporte</button>
            </form>
          </div>
        </div>
      )}

      {/* VISTA SOPORTE LISTA */}
      {view === 'soporte_lista' && (
        <div className="max-w-4xl mx-auto p-12">
          <h2 className="text-4xl font-black italic mb-10 text-blue-500 uppercase font-black">Bitácora Soporte SLA</h2>
          <div className="space-y-4 text-white">
            {misTickets.map(t => (
              <div key={t.id} className="bg-[#0f172a] p-6 rounded-3xl border border-white/5 flex justify-between items-center group hover:border-blue-500/30 transition">
                <div>
                  <p className="font-black text-xl italic uppercase">{t.titulo}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Expira: {new Date(t.vencimiento).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${t.prioridad === 'Alta' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>{t.prioridad}</span>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase font-black">{t.estado}</p>
                </div>
              </div>
            ))}
            {misTickets.length === 0 && <p className="italic text-slate-600 uppercase text-xs text-center py-20 font-black">Sin reportes activos.</p>}
          </div>
        </div>
      )}

      {/* VISTA LOGIN */}
      {view === 'login' && (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#0f172a] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
            <h2 className="text-3xl font-black text-center mb-8 italic uppercase text-white text-center">Acceso <span className="text-blue-500 text-center">Titán</span></h2>
            <form onSubmit={loginReal} className="space-y-4">
              <input type="email" placeholder="EMAIL" className="w-full p-5 bg-[#020617] border border-slate-800 rounded-2xl text-white text-xs font-bold uppercase outline-none focus:border-blue-500" onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="PASSWORD" className="w-full p-5 bg-[#020617] border border-slate-800 rounded-2xl text-white text-xs font-bold uppercase outline-none focus:border-blue-500" onChange={(e) => setPassword(e.target.value)} required />
              <button className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase text-white shadow-lg">Ingresar</button>
            </form>
            <button onClick={() => iniciarConGoogle()} className="w-full mt-4 bg-white text-black py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-3">
              <img src="https://www.google.com/favicon.ico" className="w-4" alt="G" /> Google Sync
            </button>
            <p className="text-center mt-6 text-[10px] text-slate-500 font-black uppercase tracking-widest cursor-pointer hover:text-white" onClick={() => setView('registro')}>¿Sin cuenta? Crear Registro</p>
          </div>
        </div>
      )}

      {/* VISTA REGISTRO */}
      {view === 'registro' && (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#0f172a] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
            <h2 className="text-3xl font-black text-center mb-8 italic uppercase text-white text-center">Nuevo <span className="text-blue-500">Registro</span></h2>
            <form onSubmit={registrarNuevo} className="space-y-4">
              <input type="email" placeholder="NUEVO EMAIL" className="w-full p-5 bg-[#020617] border border-slate-800 rounded-2xl text-white text-xs font-bold uppercase outline-none" onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="NUEVA CLAVE" className="w-full p-5 bg-[#020617] border border-slate-800 rounded-2xl text-white text-xs font-bold uppercase outline-none" onChange={(e) => setPassword(e.target.value)} required />
              <button className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase text-white shadow-lg">Crear Cuenta</button>
              <button type="button" onClick={() => setView('login')} className="w-full text-[10px] text-slate-500 font-black uppercase mt-2">Ya soy miembro</button>
            </form>
          </div>
        </div>
      )}

      {/* NOTIFICACIÓN */}
      <div className={`fixed bottom-10 right-10 z-[500] transition-all duration-500 transform ${notificacion.visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <div className="bg-[#0f172a] border border-blue-500 text-blue-400 px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4 italic text-[10px] font-black uppercase">
          <CheckCircle size={16}/> {notificacion.texto}
        </div>
      </div>

      <Footer />
    </div>
  );
}