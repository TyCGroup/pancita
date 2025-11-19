// pedidos.js - Módulo de gestión de pedidos
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc,
    query,
    orderBy,
    getDoc,
    Timestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { app } from './firebase-config.js';
import { showScreen } from './navigation.js';
import { loadClientes, getClientes } from './clientes.js';
import { alert, confirm, prompt } from './modals.js';

const db = getFirestore(app);
let items = [];
let editingItemIndex = -1;
let pedidosCache = []; // Cache de pedidos
let pedidosCargados = 5; // Cantidad de pedidos a mostrar
let currentPedido = null; // Pedido actual en detalle

// Generar folio automático
async function generarFolio() {
    try {
        const pedidosSnap = await getDocs(collection(db, 'pedidos'));
        const numeroFolio = pedidosSnap.size + 1;
        return `PED-${String(numeroFolio).padStart(4, '0')}`;
    } catch (error) {
        console.error('Error generando folio:', error);
        return `PED-${Date.now()}`;
    }
}

// Popular select de clientes en items
export function populateItemClienteSelect() {
    const select = document.getElementById('item-cliente');
    select.innerHTML = '<option value="">Seleccionar cliente...</option>';
    
    const clientes = getClientes();
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = `${cliente.nombre} ${cliente.apellido}`;
        select.appendChild(option);
    });
}

// Renderizar items
function renderItems() {
    const list = document.getElementById('items-list');
    list.innerHTML = '';
    
    let totalPriceShoes = 0;
    let totalPrecioFinal = 0;

    items.forEach((item, index) => {
        totalPriceShoes += item.priceShoes;
        totalPrecioFinal += item.precioFinal;
        
        const div = document.createElement('div');
        div.className = 'item-card';
        div.innerHTML = `
            <div class="item-info">
                <strong>Item ${index + 1} - ${item.categoria}</strong>
                <span>Cliente: ${item.clienteNombre}</span>
                ${item.marca ? `<span>Marca: ${item.marca}</span>` : ''}
                ${item.idPriceShoes ? `<span>ID: ${item.idPriceShoes}</span>` : ''}
                <span>Número: ${item.numero}</span>
                <span>Price Shoes: $${item.priceShoes.toFixed(2)}</span>
                <span>Precio Final: $${item.precioFinal.toFixed(2)}</span>
                ${item.ubicacion ? `<span>Ubicación: ${item.ubicacion}</span>` : ''}
            </div>
            <div class="item-actions">
                <button onclick="editItem(${index})" style="background: var(--warning); margin-right: 5px;">✏️</button>
                <button onclick="removeItem(${index})">🗑️</button>
            </div>
        `;
        list.appendChild(div);
    });

    document.getElementById('total-items').textContent = items.length;
    document.getElementById('total-price-shoes').textContent = totalPriceShoes.toFixed(2);
    document.getElementById('total-precio-final').textContent = totalPrecioFinal.toFixed(2);
}

// Limpiar formulario de item
function clearItemForm() {
    document.getElementById('item-cliente').value = '';
    document.getElementById('item-categoria').value = 'Zapato';
    document.getElementById('item-id-price').value = '';
    document.getElementById('item-marca').value = '';
    document.getElementById('item-numero').value = '';
    document.getElementById('item-price-shoes').value = '';
    document.getElementById('item-precio-final').value = '';
    document.getElementById('ubicacion-pasillo').value = '';
    document.getElementById('ubicacion-rcolgada-num').value = '';
    document.getElementById('ubicacion-mesa-num').value = '';
    document.getElementById('ubicacion-ropa-colgada').checked = true;
    handleCategoriaChange();
}

// Manejar cambio de categoría para mostrar/ocultar campos de ubicación
window.handleCategoriaChange = function() {
    const categoria = document.getElementById('item-categoria').value;
    const ubicacionZapatoGroup = document.getElementById('ubicacion-zapato-group');
    const ubicacionRopaGroup = document.getElementById('ubicacion-ropa-group');
    
    if (categoria === 'Zapato') {
        ubicacionZapatoGroup.style.display = 'block';
        ubicacionRopaGroup.style.display = 'none';
    } else {
        ubicacionZapatoGroup.style.display = 'none';
        ubicacionRopaGroup.style.display = 'block';
    }
};

// Limpiar formulario de pedido
function clearPedidoForm() {
    items = [];
    editingItemIndex = -1;
    renderItems();
    document.getElementById('item-form').style.display = 'none';
    clearItemForm();
}

// Editar item
window.editItem = function(index) {
    const item = items[index];
    editingItemIndex = index;
    
    document.getElementById('item-form-title').textContent = `Editar Item ${index + 1}`;
    document.getElementById('save-item').textContent = 'Actualizar Item';
    document.getElementById('item-cliente').value = item.clienteId;
    document.getElementById('item-categoria').value = item.categoria;
    document.getElementById('item-id-price').value = item.idPriceShoes || '';
    document.getElementById('item-marca').value = item.marca || '';
    document.getElementById('item-numero').value = item.numero;
    document.getElementById('item-price-shoes').value = item.priceShoes;
    document.getElementById('item-precio-final').value = item.precioFinal;
    
    // Parsear ubicación
    if (item.ubicacion) {
        if (item.ubicacion.startsWith('Pasillo ')) {
            const numPasillo = item.ubicacion.replace('Pasillo ', '');
            document.getElementById('ubicacion-pasillo').value = numPasillo;
        } else if (item.ubicacion.startsWith('R colgada ')) {
            const numRColgada = item.ubicacion.replace('R colgada ', '');
            document.getElementById('ubicacion-rcolgada-num').value = numRColgada;
            document.getElementById('ubicacion-ropa-colgada').checked = true;
        } else if (item.ubicacion.startsWith('Mesa ')) {
            const numMesa = item.ubicacion.replace('Mesa ', '');
            document.getElementById('ubicacion-mesa-num').value = numMesa;
            document.getElementById('ubicacion-ropa-mesa').checked = true;
        }
    }
    
    handleCategoriaChange();
    document.getElementById('item-form').style.display = 'block';
    document.getElementById('item-form').scrollIntoView({ behavior: 'smooth' });
};

// Eliminar item
window.removeItem = function(index) {
    confirm('¿Estás seguro de eliminar este item?', () => {
        items.splice(index, 1);
        renderItems();
    });
};

// Cargar historial de pedidos con paginación
export async function loadHistorialPedidos(reload = false) {
    try {
        // Si es reload, limpiar cache y resetear contador
        if (reload) {
            pedidosCache = [];
            pedidosCargados = 5;
        }

        // Solo cargar si el cache está vacío
        if (pedidosCache.length === 0) {
            const q = query(collection(db, 'pedidos'), orderBy('fechaCreacion', 'desc'));
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach((docSnap) => {
                pedidosCache.push({ id: docSnap.id, ...docSnap.data() });
            });
        }

        const list = document.getElementById('historial-list');
        list.innerHTML = '';

        if (pedidosCache.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>No hay pedidos registrados</p></div>';
            document.getElementById('cargar-mas-pedidos').style.display = 'none';
            return;
        }

        // Mostrar solo los primeros N pedidos
        const pedidosAMostrar = pedidosCache.slice(0, pedidosCargados);

        pedidosAMostrar.forEach((pedido) => {
            const fecha = pedido.fechaCreacion.toDate().toLocaleDateString();
            const cantidadItems = pedido.items ? pedido.items.length : 0;
            
            // Contar items completados
            let itemsCompletados = 0;
            if (pedido.items) {
                itemsCompletados = pedido.items.filter(item => item.completado).length;
            }
            
            let categorias = '';
            if (pedido.items && pedido.items.length > 0) {
                const categoriasUnicas = [...new Set(pedido.items.map(item => item.categoria))];
                categorias = categoriasUnicas.join(', ');
            }

            let clientesTexto = '';
            if (pedido.clientes && pedido.clientes.length > 0) {
                clientesTexto = pedido.clientes.join(', ');
            } else if (pedido.clienteNombre) {
                clientesTexto = pedido.clienteNombre;
            }
            
            const div = document.createElement('div');
            div.className = 'pedido-card-simple';
            div.onclick = () => verDetallePedido(pedido.id);
            div.innerHTML = `
                <div class="pedido-header-simple">
                    <h4>Folio: ${pedido.folio}</h4>
                    <span class="pedido-progress">${itemsCompletados}/${cantidadItems}</span>
                </div>
                <div class="pedido-info">
                    <p><strong>Clientes:</strong> ${clientesTexto}</p>
                    ${categorias ? `<p><strong>Categorías:</strong> ${categorias}</p>` : ''}
                    <p><strong>Total:</strong> $${(pedido.totalPrecioFinal || 0).toFixed(2)}</p>
                    <p><strong>Fecha:</strong> ${fecha}</p>
                </div>
            `;
            list.appendChild(div);
        });

        // Mostrar/ocultar botón "Cargar más"
        const btnCargarMas = document.getElementById('cargar-mas-pedidos');
        if (pedidosCargados >= pedidosCache.length) {
            btnCargarMas.style.display = 'none';
        } else {
            btnCargarMas.style.display = 'block';
        }

    } catch (error) {
        console.error('Error cargando historial:', error);
        alert('Error al cargar historial', 'error');
    }
}

// Ver detalle de pedido individual
window.verDetallePedido = async function(pedidoId) {
    try {
        // Buscar en cache primero
        let pedido = pedidosCache.find(p => p.id === pedidoId);
        
        // Si no está en cache, cargar desde Firestore
        if (!pedido) {
            const pedidoDoc = await getDoc(doc(db, 'pedidos', pedidoId));
            if (pedidoDoc.exists()) {
                pedido = { id: pedidoDoc.id, ...pedidoDoc.data() };
            }
        }

        if (pedido) {
            currentPedido = pedido;
            mostrarPantallaDetallePedido(pedido);
        }
    } catch (error) {
        console.error('Error cargando detalle:', error);
        alert('Error al cargar detalle del pedido', 'error');
    }
};

// Mostrar pantalla de detalle con items editables
function mostrarPantallaDetallePedido(pedido) {
    document.getElementById('detalle-pedido-folio').textContent = `Pedido ${pedido.folio}`;
    
    let clientesTexto = '';
    if (pedido.clientes && pedido.clientes.length > 0) {
        clientesTexto = pedido.clientes.join(', ');
    } else if (pedido.clienteNombre) {
        clientesTexto = pedido.clienteNombre;
    }

    const cantidadItems = pedido.items ? pedido.items.length : 0;
    let itemsCompletados = 0;
    if (pedido.items) {
        itemsCompletados = pedido.items.filter(item => item.completado).length;
    }

    const fecha = pedido.fechaCreacion.toDate().toLocaleDateString();
    
    // Info del pedido
    const infoCard = document.getElementById('detalle-pedido-info');
    infoCard.innerHTML = `
        <p><strong>Clientes:</strong> ${clientesTexto}</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Items:</strong> ${itemsCompletados}/${cantidadItems} completados</p>
        <p><strong>Total Price Shoes:</strong> $${(pedido.totalPriceShoes || 0).toFixed(2)}</p>
        <p><strong>Total Precio Final:</strong> $${(pedido.totalPrecioFinal || 0).toFixed(2)}</p>
    `;

    // Lista de items editables
    const itemsContainer = document.getElementById('detalle-pedido-items');
    itemsContainer.innerHTML = '';

    if (pedido.items && pedido.items.length > 0) {
        pedido.items.forEach((item, index) => {
            const completado = item.completado || false;
            const nota = item.nota || '';
            
            const itemDiv = document.createElement('div');
            itemDiv.className = `item-detalle-editable ${completado ? 'item-completado-check' : ''}`;
            itemDiv.innerHTML = `
                <div class="item-detalle-header">
                    <input type="checkbox" 
                           ${completado ? 'checked' : ''}
                           onchange="toggleItemCompletadoDetalle(${index})">
                    <strong>${item.categoria} - #${item.numero}</strong>
                </div>
                <div class="item-detalle-body">
                    <p><strong>Cliente:</strong> ${item.clienteNombre}</p>
                    ${item.marca ? `<p><strong>Marca:</strong> ${item.marca}</p>` : ''}
                    ${item.idPriceShoes ? `<p><strong>ID:</strong> ${item.idPriceShoes}</p>` : ''}
                    <p><strong>Price Shoes:</strong> $${item.priceShoes.toFixed(2)}</p>
                    <p><strong>Precio Final:</strong> $${item.precioFinal.toFixed(2)}</p>
                    ${item.ubicacion ? `<p><strong>Ubicación:</strong> ${item.ubicacion}</p>` : ''}
                    ${nota ? `<div class="item-nota-detalle">📝 ${nota}</div>` : ''}
                </div>
                <div class="item-detalle-actions">
                    <button class="btn-secondary" onclick="editarNotaItemDetalle(${index}, '${nota.replace(/'/g, "\\'")}')">
                        ${nota ? 'Editar Nota' : 'Agregar Nota'}
                    </button>
                    <button class="btn-danger" onclick="eliminarItemDetalle(${index})">
                        Eliminar Item
                    </button>
                </div>
            `;
            itemsContainer.appendChild(itemDiv);
        });
    }

    showScreen('detalle-pedido-screen');
}

// Toggle completado desde detalle
window.toggleItemCompletadoDetalle = async function(itemIndex) {
    try {
        currentPedido.items[itemIndex].completado = !currentPedido.items[itemIndex].completado;
        
        await updateDoc(doc(db, 'pedidos', currentPedido.id), {
            items: currentPedido.items
        });
        
        // Actualizar cache
        const cacheIndex = pedidosCache.findIndex(p => p.id === currentPedido.id);
        if (cacheIndex !== -1) {
            pedidosCache[cacheIndex] = currentPedido;
        }
        
        mostrarPantallaDetallePedido(currentPedido);
    } catch (error) {
        console.error('Error actualizando item:', error);
        alert('Error al actualizar item', 'error');
    }
};

// Editar nota desde detalle
window.editarNotaItemDetalle = function(itemIndex, notaActual) {
    prompt('Nota del item:', notaActual || '', async (nota) => {
        try {
            currentPedido.items[itemIndex].nota = nota;
            
            await updateDoc(doc(db, 'pedidos', currentPedido.id), {
                items: currentPedido.items
            });
            
            // Actualizar cache
            const cacheIndex = pedidosCache.findIndex(p => p.id === currentPedido.id);
            if (cacheIndex !== -1) {
                pedidosCache[cacheIndex] = currentPedido;
            }
            
            alert('Nota guardada correctamente', 'success');
            mostrarPantallaDetallePedido(currentPedido);
        } catch (error) {
            console.error('Error guardando nota:', error);
            alert('Error al guardar nota', 'error');
        }
    });
};

// Eliminar item desde detalle
window.eliminarItemDetalle = function(itemIndex) {
    const item = currentPedido.items[itemIndex];
    confirm(`¿Eliminar item ${item.categoria} - #${item.numero}?`, async () => {
        try {
            currentPedido.items.splice(itemIndex, 1);
            
            // Recalcular totales
            const totalPriceShoes = currentPedido.items.reduce((sum, item) => sum + item.priceShoes, 0);
            const totalPrecioFinal = currentPedido.items.reduce((sum, item) => sum + item.precioFinal, 0);
            
            await updateDoc(doc(db, 'pedidos', currentPedido.id), {
                items: currentPedido.items,
                totalPriceShoes,
                totalPrecioFinal
            });
            
            currentPedido.totalPriceShoes = totalPriceShoes;
            currentPedido.totalPrecioFinal = totalPrecioFinal;
            
            // Actualizar cache
            const cacheIndex = pedidosCache.findIndex(p => p.id === currentPedido.id);
            if (cacheIndex !== -1) {
                pedidosCache[cacheIndex] = currentPedido;
            }
            
            alert('Item eliminado correctamente', 'success');
            
            // Si no quedan items, volver al historial
            if (currentPedido.items.length === 0) {
                showScreen('historial-pedidos-screen');
                await loadHistorialPedidos(true);
            } else {
                mostrarPantallaDetallePedido(currentPedido);
            }
        } catch (error) {
            console.error('Error eliminando item:', error);
            alert('Error al eliminar item', 'error');
        }
    });
};

// Inicializar eventos de pedidos
export function initPedidos() {
    // Cerrar modal detalle
    document.getElementById('modal-detalle-close')?.addEventListener('click', () => {
        document.getElementById('modal-detalle-pedido').classList.remove('active');
    });

    // Navegación detalle pedido
    document.getElementById('back-detalle-pedido')?.addEventListener('click', () => {
        showScreen('historial-pedidos-screen');
    });

    // Cargar más pedidos
    document.getElementById('cargar-mas-pedidos')?.addEventListener('click', () => {
        pedidosCargados += 5;
        loadHistorialPedidos(false);
    });

    // Botón nuevo pedido
    document.getElementById('btn-nuevo-pedido').addEventListener('click', async () => {
        await loadClientes();
        populateItemClienteSelect();
        showScreen('nuevo-pedido-screen');
    });

    // Botón historial
    document.getElementById('btn-historial-pedidos').addEventListener('click', async () => {
        await loadHistorialPedidos(true);
        showScreen('historial-pedidos-screen');
    });

    // Agregar item
    document.getElementById('add-item-form').addEventListener('click', () => {
        editingItemIndex = -1;
        document.getElementById('item-form-title').textContent = 'Nuevo Item';
        document.getElementById('save-item').textContent = 'Guardar Item';
        document.getElementById('item-form').style.display = 'block';
        document.getElementById('item-form').scrollIntoView({ behavior: 'smooth' });
    });

    // Cancelar item
    document.getElementById('cancel-item').addEventListener('click', () => {
        clearItemForm();
        editingItemIndex = -1;
        document.getElementById('item-form').style.display = 'none';
    });

    // Guardar item
    document.getElementById('save-item').addEventListener('click', () => {
        const clienteId = document.getElementById('item-cliente').value;
        const categoria = document.getElementById('item-categoria').value;
        const idPriceShoes = document.getElementById('item-id-price').value;
        const marca = document.getElementById('item-marca').value;
        const numero = document.getElementById('item-numero').value;
        const priceShoes = parseFloat(document.getElementById('item-price-shoes').value) || 0;
        const precioFinal = parseFloat(document.getElementById('item-precio-final').value) || 0;

        if (!clienteId || !numero || priceShoes <= 0 || precioFinal <= 0) {
            alert('Por favor completa todos los campos obligatorios del item', 'warning');
            return;
        }

        // Construir ubicación según categoría
        let ubicacion = '';
        if (categoria === 'Zapato') {
            const numPasillo = document.getElementById('ubicacion-pasillo').value;
            if (numPasillo) {
                ubicacion = `Pasillo ${numPasillo}`;
            }
        } else if (categoria === 'Ropa') {
            const tipoRopa = document.querySelector('input[name="ubicacion-ropa"]:checked').value;
            if (tipoRopa === 'R colgada') {
                const numRColgada = document.getElementById('ubicacion-rcolgada-num').value;
                if (numRColgada) {
                    ubicacion = `R colgada ${numRColgada}`;
                }
            } else if (tipoRopa === 'Mesa') {
                const numMesa = document.getElementById('ubicacion-mesa-num').value;
                if (numMesa) {
                    ubicacion = `Mesa ${numMesa}`;
                }
            }
        }

        const clientes = getClientes();
        const cliente = clientes.find(c => c.id === clienteId);
        const itemData = {
            clienteId,
            clienteNombre: `${cliente.nombre} ${cliente.apellido}`,
            categoria,
            idPriceShoes: idPriceShoes || '',
            marca: marca || '',
            numero,
            priceShoes,
            precioFinal,
            ubicacion,
            completado: false,
            nota: ''
        };

        if (editingItemIndex >= 0) {
            items[editingItemIndex] = itemData;
            editingItemIndex = -1;
        } else {
            items.push(itemData);
        }

        renderItems();
        clearItemForm();
        document.getElementById('item-form').style.display = 'none';
    });

    // Guardar pedido
    document.getElementById('guardar-pedido').addEventListener('click', async () => {
        if (items.length === 0) {
            alert('Por favor agrega al menos un item al pedido', 'warning');
            return;
        }

        const folio = await generarFolio();
        const totalPriceShoes = items.reduce((sum, item) => sum + item.priceShoes, 0);
        const totalPrecioFinal = items.reduce((sum, item) => sum + item.precioFinal, 0);
        const clientesEnPedido = [...new Set(items.map(item => item.clienteNombre))];

        try {
            await addDoc(collection(db, 'pedidos'), {
                folio,
                clientes: clientesEnPedido,
                items,
                totalPriceShoes,
                totalPrecioFinal,
                fechaCreacion: Timestamp.now()
            });

            alert(`Pedido ${folio} guardado exitosamente con ${items.length} item(s)`, 'success');
            clearPedidoForm();
            showScreen('pedidos-screen');
        } catch (error) {
            console.error('Error guardando pedido:', error);
            alert('Error al guardar el pedido', 'error');
        }
    });
}