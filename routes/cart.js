const express = require('express');
const router = express.Router();

/**
 * POST /api/cart/sync
 * Endpoint utilizado por el Service Worker para sincronizar
 * la cola de ítems del carrito almacenados offline.
 */
router.post('/sync', (req, res) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
        console.warn('[Backend] Intento de sincronización con datos no válidos.');
        return res.status(400).json({ success: false, message: 'Formato de datos de carrito no válido.' });
    }

    if (items.length === 0) {
        return res.status(200).json({ success: true, message: 'Cola de sincronización vacía, no se requiere acción.' });
    }

    console.log(`[Backend: Cart Sync] 🛒 Recibidos ${items.length} ítems para procesar.`);

    // --- LÓGICA DE PROCESAMIENTO CRÍTICA ---
    // En un entorno real, aquí harías lo siguiente:
    // 1. **Autenticación/Autorización:** Verificar la identidad del usuario si es necesario.
    // 2. **Transacción de DB:** Iterar sobre cada 'item' y:
    //    a) Validar los datos (ej. stock, precio).
    //    b) Actualizar el estado del carrito de compras del usuario en tu base de datos.
    // 3. **Manejo de errores:** Si la base de datos falla, DEBES devolver un código de error 5xx
    //    para que el Service Worker sepa que debe REINTENTAR en el siguiente evento 'sync'.

    try {
        // Simulación: guardar en la base de datos
        // ... await db.saveCartItems(items);

        console.log(`[Backend: Cart Sync] ✅ ${items.length} ítems procesados y guardados.`);
        
        // La respuesta OK (200) es la señal para el Service Worker
        // para que BORRE la cola de IndexedDB.
        res.status(200).json({ 
            success: true, 
            message: 'Cola de carrito procesada con éxito.',
            processedCount: items.length 
        });

    } catch (error) {
        console.error('[Backend: Cart Sync] ❌ Error al guardar en DB:', error.message);
        // Devolvemos 500 para forzar al Service Worker a mantener los datos y reintentar
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al procesar la cola.' 
        });
    }
});

module.exports = router;
