const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

// Cargar variables de entorno
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de peticiones (útil para desarrollo)
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// ----------------------
// RUTAS
// ----------------------
app.use('/api/purchases', require('./routes/purchases'));

// Ruta del carrito para la sincronización offline
app.use('/api/cart', require('./routes/cart'));

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Rapper Dashboard API funcionando',
        timestamp: new Date().toISOString()
    });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Ruta no encontrada' 
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ----------------------
// CONEXIÓN A MONGODB
// ----------------------
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rapper-dashboard';
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => {
    console.log('🔗 Mongoose conectado a MongoDB');
    console.log('✅ MongoDB Conectado:', mongoose.connection.host);
    console.log('📊 Base de datos:', mongoose.connection.name);

    // Solo iniciar servidor si DB conecta
    app.listen(PORT, () => {
        console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
        console.log(`📡 API disponible en http://localhost:${PORT}/api`);
        console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    });
})
.catch((err) => {
    console.error('❌ Error al conectar a MongoDB:', err);
    process.exit(1); // Salir si no hay DB
});

module.exports = app;
