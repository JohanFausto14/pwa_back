const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');

/**
 * POST /api/cart/sync
 * Endpoint utilizado por el Service Worker para sincronizar
 * la cola de ítems del carrito almacenados offline.
 */
router.post('/sync', async (req, res) => {
    try {
        const { items } = req.body;

        // Validación de entrada
        if (!items || !Array.isArray(items)) {
            console.warn('[Backend] Intento de sincronización con datos no válidos.');
            return res.status(400).json({ 
                success: false, 
                message: 'Formato de datos de carrito no válido.' 
            });
        }

        if (items.length === 0) {
            return res.status(200).json({ 
                success: true, 
                message: 'Cola de sincronización vacía, no se requiere acción.' 
            });
        }

        console.log(`[Backend: Cart Sync] 🛒 Recibidos ${items.length} ítems para procesar.`);

        // Procesar cada elemento de la cola
        const processedPurchases = [];
        
        for (const item of items) {
            try {
                // Extraer datos del elemento encolado
                const { userId, timestamp, total, items: cartItems, createdAt, ...itemData } = item;
                
                // Validar datos requeridos
                if (!userId || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
                    console.warn('[Backend] Elemento de cola con datos incompletos:', item);
                    continue; // Saltar este elemento pero continuar con los demás
                }

                // Calcular total si no se proporciona
                const calculatedTotal = total || cartItems.reduce((sum, cartItem) => sum + (cartItem.price || 0), 0);

                // Crear la compra en la base de datos
                const purchase = await Purchase.create({
                    userId,
                    items: cartItems,
                    total: calculatedTotal,
                    timestamp: timestamp || new Date(createdAt || Date.now()),
                    status: 'synced',
                    syncedAt: new Date(),
                    metadata: {
                        ip: req.ip,
                        userAgent: req.get('user-agent'),
                        source: 'offline-sync',
                        queueId: item.id || 'unknown'
                    }
                });

                processedPurchases.push({
                    id: purchase._id,
                    userId: purchase.userId,
                    total: purchase.total,
                    itemCount: purchase.items.length,
                    syncedAt: purchase.syncedAt
                });

                console.log(`[Backend: Cart Sync] ✅ Compra sincronizada: ${purchase._id}`);

            } catch (itemError) {
                console.error('[Backend: Cart Sync] ❌ Error procesando elemento individual:', itemError.message);
                // Continuar con el siguiente elemento en lugar de fallar completamente
            }
        }

        if (processedPurchases.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo procesar ningún elemento de la cola.'
            });
        }

        console.log(`[Backend: Cart Sync] ✅ ${processedPurchases.length}/${items.length} compras sincronizadas exitosamente.`);
        
        // Respuesta exitosa
        res.status(200).json({ 
            success: true, 
            message: `${processedPurchases.length} compras sincronizadas exitosamente.`,
            processedCount: processedPurchases.length,
            totalReceived: items.length,
            purchases: processedPurchases
        });

    } catch (error) {
        console.error('[Backend: Cart Sync] ❌ Error general al procesar la cola:', error.message);
        // Devolvemos 500 para forzar al Service Worker a mantener los datos y reintentar
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al procesar la cola.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
