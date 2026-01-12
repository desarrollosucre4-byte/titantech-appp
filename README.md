# 🎫 Sistema de Mesa de Servicios con Gestión de SLA

Este proyecto es una plataforma web para la gestión de tickets de soporte técnico, diseñada para medir y garantizar la calidad del servicio mediante indicadores de tiempo (SLA).

---

## 🚀 1. Propósito del Proyecto
Demostrar la implementación de un sistema web realista con métricas de calidad verificables. El sistema calcula automáticamente los tiempos de respuesta y resolución basados en la prioridad del ticket:
* **Prioridad Alta:** Resolución en 4 horas.
* **Prioridad Media:** Resolución en 8 horas.
* **Prioridad Baja:** Resolución en 24 horas.

---

## 🛠️ 2. Requisitos Previos
Antes de instalar, asegúrate de tener:
* **Node.js** (Versión LTS recomendada)
* **NPM** (Viene incluido con Node.js)
* Un navegador web moderno.

---

## 📦 3. Instalación y Ejecución
Siga estos pasos para ejecutar el sistema en su entorno local:

### Paso 1: Clonar o descargar el proyecto
Si estás usando Git: `git clone [url-del-repositorio]`

### Paso 2: Configurar el Servidor (Backend)
1. Abrir una terminal y entrar a la carpeta: `cd server`
2. Instalar dependencias: `npm install`
3. Iniciar entorno de ejecución: `node index.js`

### Paso 3: Configurar la Interfaz (Frontend)
1. Abrir una **segunda terminal** y entrar a la carpeta: `cd client`
2. Instalar dependencias: `npm install`
3. Iniciar entorno de desarrollo: `npm run dev`

Acceder a la URL que indique la terminal (usualmente `http://localhost:5173`).

---

## 🧪 4. Entornos de Ejecución (Punto 2.1)
El sistema está preparado para operar en dos modalidades:

* **Entorno de Desarrollo (Dev):** Ejecutado mediante `npm run dev` en el cliente. Permite cambios en tiempo real y depuración.
* **Entorno de Ejecución Local:** El servidor corre de forma independiente en el puerto `3001` procesando la lógica del SLA.

---

## 📊 5. Evidencia de Calidad y Métricas
Toda decisión técnica se basa en el cumplimiento del SLA. Puede verificar los datos crudos procesados por el sistema en la siguiente ruta una vez que el servidor esté activo:
`http://localhost:3001/tickets`