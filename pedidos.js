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
let pedidosCache = [];
let pedidosCargados = 5;
let currentPedido = null;

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

function clearPedidoForm() {
    items = [];
    editingItemIndex = -1;
    renderItems();
    document.getElementById('item-form').style.display = 'none';
    clearItemForm();
}

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

window.removeItem = function(index) {
    confirm('¿Estás seguro de eliminar este item?', () => {
        items.splice(index, 1);
        renderItems();
    });
};

export async function loadHistorialPedidos(reload = false) {
    try {
        if (reload) {
            pedidosCache = [];
            pedidosCargados = 5;
        }

        if (pedidosCache.length === 0) {
            const q = query(collection(db, 'pedidos'), orderBy('fechaCreacion', 'desc'));
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                // Solo agregar pedidos no eliminados
                if (!data.eliminado) {
                    pedidosCache.push({ id: docSnap.id, ...data });
                }
            });
        }

        const list = document.getElementById('historial-list');
        list.innerHTML = '';

        if (pedidosCache.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>No hay pedidos registrados</p></div>';
            document.getElementById('cargar-mas-pedidos').style.display = 'none';
            return;
        }

        const pedidosAMostrar = pedidosCache.slice(0, pedidosCargados);

        pedidosAMostrar.forEach((pedido) => {
            const fecha = pedido.fechaCreacion.toDate().toLocaleDateString();
            const cantidadItems = pedido.items ? pedido.items.length : 0;
            
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
                <div class="pedido-actions">
                    <button class="btn-primary" onclick="event.stopPropagation(); verDetallePedido('${pedido.id}')">
                        Ver Items
                    </button>
                    <button class="btn-secondary" onclick="event.stopPropagation(); agregarItemsAPedido('${pedido.id}')">
                        Agregar Items
                    </button>
                    <button class="btn-danger" onclick="event.stopPropagation(); eliminarPedidoCompleto('${pedido.id}', '${pedido.folio}')">
                        Eliminar Pedido
                    </button>
                </div>
            `;
            list.appendChild(div);
        });

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

window.verDetallePedido = async function(pedidoId) {
    try {
        let pedido = pedidosCache.find(p => p.id === pedidoId);
        
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

// Agregar items a un pedido existente
window.agregarItemsAPedido = async function(pedidoId) {
    try {
        let pedido = pedidosCache.find(p => p.id === pedidoId);
        
        if (!pedido) {
            const pedidoDoc = await getDoc(doc(db, 'pedidos', pedidoId));
            if (pedidoDoc.exists()) {
                pedido = { id: pedidoDoc.id, ...pedidoDoc.data() };
            }
        }

        if (pedido) {
            currentPedido = pedido;
            // Cargar los items existentes del pedido
            items = [...pedido.items];
            renderItems();
            
            // Cargar clientes y mostrar pantalla de edición
            await loadClientes();
            populateItemClienteSelect();
            showScreen('nuevo-pedido-screen');
            
            // Cambiar título para indicar que estamos editando
            document.querySelector('#nuevo-pedido-screen h2').textContent = `Editar Pedido ${pedido.folio}`;
            
            // Cambiar texto del botón guardar
            document.getElementById('guardar-pedido').textContent = 'Actualizar Pedido';
        }
    } catch (error) {
        console.error('Error cargando pedido:', error);
        alert('Error al cargar pedido', 'error');
    }
};

// Eliminar pedido completo
window.eliminarPedidoCompleto = function(pedidoId, folio) {
    confirm(`¿Estás seguro de eliminar completamente el pedido ${folio}? Esta acción no se puede deshacer.`, async () => {
        try {
            // Eliminar de Firestore
            await updateDoc(doc(db, 'pedidos', pedidoId), {
                eliminado: true,
                fechaEliminacion: Timestamp.now()
            });
            
            // Remover del cache
            const cacheIndex = pedidosCache.findIndex(p => p.id === pedidoId);
            if (cacheIndex !== -1) {
                pedidosCache.splice(cacheIndex, 1);
            }
            
            alert('Pedido eliminado correctamente', 'success');
            
            // Recargar lista
            await loadHistorialPedidos(false);
        } catch (error) {
            console.error('Error eliminando pedido:', error);
            alert('Error al eliminar pedido', 'error');
        }
    });
};

function ordenarItemsPorUbicacion(items) {
    const itemsConIndex = items.map((item, index) => ({ item, originalIndex: index }));
    
    return itemsConIndex.sort((a, b) => {
        const ubicA = a.item.ubicacion || '';
        const ubicB = b.item.ubicacion || '';
        
        const parseUbicacion = (ubic) => {
            if (ubic.startsWith('Pasillo ')) {
                return { tipo: 1, num: parseInt(ubic.replace('Pasillo ', '')) || 0 };
            } else if (ubic.startsWith('Mesa ')) {
                return { tipo: 2, num: parseInt(ubic.replace('Mesa ', '')) || 0 };
            } else if (ubic.startsWith('R colgada ')) {
                return { tipo: 3, num: parseInt(ubic.replace('R colgada ', '')) || 0 };
            }
            return { tipo: 999, num: 0 };
        };
        
        const parsedA = parseUbicacion(ubicA);
        const parsedB = parseUbicacion(ubicB);
        
        if (parsedA.tipo !== parsedB.tipo) {
            return parsedA.tipo - parsedB.tipo;
        }
        
        return parsedA.num - parsedB.num;
    });
}

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
    
    let totalCompletados = 0;
    if (pedido.items) {
        totalCompletados = pedido.items
            .filter(item => item.completado)
            .reduce((sum, item) => sum + item.precioFinal, 0);
    }
    
    const infoCard = document.getElementById('detalle-pedido-info');
    infoCard.innerHTML = `
        <p><strong>Clientes:</strong> ${clientesTexto}</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Items:</strong> ${itemsCompletados}/${cantidadItems} completados</p>
        <p><strong>Total Price Shoes:</strong> $${(pedido.totalPriceShoes || 0).toFixed(2)}</p>
        <p><strong>Total Precio Final:</strong> $${(pedido.totalPrecioFinal || 0).toFixed(2)}</p>
        <p style="color: var(--success); font-weight: 600;"><strong>Total Completados:</strong> $${totalCompletados.toFixed(2)}</p>
    `;

    const itemsContainer = document.getElementById('detalle-pedido-items');
    itemsContainer.innerHTML = '';

    if (pedido.items && pedido.items.length > 0) {
        const itemsOrdenados = ordenarItemsPorUbicacion([...pedido.items]);
        
        itemsOrdenados.forEach((itemData) => {
            const item = itemData.item;
            const index = itemData.originalIndex;
            const completado = item.completado || false;
            const nota = item.nota || '';
            
            const itemDiv = document.createElement('div');
            itemDiv.className = `item-detalle-editable ${completado ? 'item-completado-check' : ''}`;
            itemDiv.onclick = (e) => {
                if (!e.target.closest('input[type="checkbox"]') && !e.target.closest('button')) {
                    toggleItemCompletadoDetalle(index);
                }
            };
            itemDiv.style.cursor = 'pointer';
            
            itemDiv.innerHTML = `
                <div class="item-detalle-header">
                    <input type="checkbox" 
                           ${completado ? 'checked' : ''}
                           onclick="event.stopPropagation(); toggleItemCompletadoDetalle(${index})">
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
                    <button class="btn-secondary" onclick="event.stopPropagation(); editarItemCompleto(${index})">
                        Editar Item
                    </button>
                    <button class="btn-secondary" onclick="event.stopPropagation(); editarNotaItemDetalle(${index}, '${nota.replace(/'/g, "\\'")}')">
                        ${nota ? 'Editar Nota' : 'Agregar Nota'}
                    </button>
                    <button class="btn-danger" onclick="event.stopPropagation(); eliminarItemDetalle(${index})">
                        Eliminar
                    </button>
                </div>
            `;
            itemsContainer.appendChild(itemDiv);
        });
    }

    showScreen('detalle-pedido-screen');
}

window.editarItemCompleto = function(itemIndex) {
    const item = currentPedido.items[itemIndex];
    
    const modal = document.getElementById('modal-detalle-pedido');
    const titulo = document.getElementById('modal-detalle-titulo');
    const contenido = document.getElementById('modal-detalle-contenido');
    
    titulo.textContent = 'Editar Item';
    
    let tipoUbicacion = 'Pasillo';
    let numeroUbicacion = '';
    
    if (item.ubicacion) {
        if (item.ubicacion.startsWith('Pasillo ')) {
            tipoUbicacion = 'Pasillo';
            numeroUbicacion = item.ubicacion.replace('Pasillo ', '');
        } else if (item.ubicacion.startsWith('Mesa ')) {
            tipoUbicacion = 'Mesa';
            numeroUbicacion = item.ubicacion.replace('Mesa ', '');
        } else if (item.ubicacion.startsWith('R colgada ')) {
            tipoUbicacion = 'R colgada';
            numeroUbicacion = item.ubicacion.replace('R colgada ', '');
        }
    }
    
    contenido.innerHTML = `
        <div class="form-group">
            <label>Categoría</label>
            <select id="edit-categoria">
                <option value="Zapato" ${item.categoria === 'Zapato' ? 'selected' : ''}>Zapato</option>
                <option value="Ropa" ${item.categoria === 'Ropa' ? 'selected' : ''}>Ropa</option>
            </select>
        </div>
        <div class="form-group">
            <label>ID Price Shoes</label>
            <input type="text" id="edit-id-price" value="${item.idPriceShoes || ''}" placeholder="ID">
        </div>
        <div class="form-group">
            <label>Marca</label>
            <input type="text" id="edit-marca" value="${item.marca || ''}" placeholder="Marca">
        </div>
        <div class="form-group">
            <label>Número/Talla</label>
            <input type="text" id="edit-numero" value="${item.numero}" placeholder="Número">
        </div>
        <div class="form-group">
            <label>Price Shoes</label>
            <input type="number" id="edit-price-shoes" value="${item.priceShoes}" step="0.01">
        </div>
        <div class="form-group">
            <label>Precio Final</label>
            <input type="number" id="edit-precio-final" value="${item.precioFinal}" step="0.01">
        </div>
        <div class="form-group">
            <label>Tipo de Ubicación</label>
            <select id="edit-tipo-ubicacion">
                <option value="Pasillo" ${tipoUbicacion === 'Pasillo' ? 'selected' : ''}>Pasillo</option>
                <option value="Mesa" ${tipoUbicacion === 'Mesa' ? 'selected' : ''}>Mesa</option>
                <option value="R colgada" ${tipoUbicacion === 'R colgada' ? 'selected' : ''}>R colgada</option>
            </select>
        </div>
        <div class="form-group">
            <label>Número de ubicación</label>
            <input type="number" id="edit-numero-ubicacion" value="${numeroUbicacion}" placeholder="Número" min="1">
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button class="btn-secondary" onclick="cerrarModalEdicion()" style="flex: 1;">Cancelar</button>
            <button class="btn-primary" onclick="guardarEdicionItem(${itemIndex})" style="flex: 1;">Guardar</button>
        </div>
    `;
    
    modal.classList.add('active');
};

window.cerrarModalEdicion = function() {
    document.getElementById('modal-detalle-pedido').classList.remove('active');
};

window.guardarEdicionItem = async function(itemIndex) {
    try {
        const categoria = document.getElementById('edit-categoria').value;
        const idPriceShoes = document.getElementById('edit-id-price').value;
        const marca = document.getElementById('edit-marca').value;
        const numero = document.getElementById('edit-numero').value;
        const priceShoes = parseFloat(document.getElementById('edit-price-shoes').value) || 0;
        const precioFinal = parseFloat(document.getElementById('edit-precio-final').value) || 0;
        const tipoUbicacion = document.getElementById('edit-tipo-ubicacion').value;
        const numeroUbicacion = document.getElementById('edit-numero-ubicacion').value;
        
        if (!numero || priceShoes <= 0 || precioFinal <= 0) {
            alert('Por favor completa todos los campos obligatorios', 'warning');
            return;
        }
        
        let ubicacion = '';
        if (numeroUbicacion) {
            ubicacion = `${tipoUbicacion} ${numeroUbicacion}`;
        }
        
        currentPedido.items[itemIndex] = {
            ...currentPedido.items[itemIndex],
            categoria,
            idPriceShoes: idPriceShoes || '',
            marca: marca || '',
            numero,
            priceShoes,
            precioFinal,
            ubicacion
        };
        
        const totalPriceShoes = currentPedido.items.reduce((sum, item) => sum + item.priceShoes, 0);
        const totalPrecioFinal = currentPedido.items.reduce((sum, item) => sum + item.precioFinal, 0);
        
        await updateDoc(doc(db, 'pedidos', currentPedido.id), {
            items: currentPedido.items,
            totalPriceShoes,
            totalPrecioFinal
        });
        
        currentPedido.totalPriceShoes = totalPriceShoes;
        currentPedido.totalPrecioFinal = totalPrecioFinal;
        
        const cacheIndex = pedidosCache.findIndex(p => p.id === currentPedido.id);
        if (cacheIndex !== -1) {
            pedidosCache[cacheIndex] = currentPedido;
        }
        
        cerrarModalEdicion();
        alert('Item actualizado correctamente', 'success');
        mostrarPantallaDetallePedido(currentPedido);
    } catch (error) {
        console.error('Error actualizando item:', error);
        alert('Error al actualizar item', 'error');
    }
};

window.toggleItemCompletadoDetalle = async function(itemIndex) {
    try {
        currentPedido.items[itemIndex].completado = !currentPedido.items[itemIndex].completado;
        
        await updateDoc(doc(db, 'pedidos', currentPedido.id), {
            items: currentPedido.items
        });
        
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

window.editarNotaItemDetalle = function(itemIndex, notaActual) {
    prompt('Nota del item:', notaActual || '', async (nota) => {
        try {
            currentPedido.items[itemIndex].nota = nota;
            
            await updateDoc(doc(db, 'pedidos', currentPedido.id), {
                items: currentPedido.items
            });
            
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

window.eliminarItemDetalle = function(itemIndex) {
    const item = currentPedido.items[itemIndex];
    confirm(`¿Eliminar item ${item.categoria} - #${item.numero}?`, async () => {
        try {
            currentPedido.items.splice(itemIndex, 1);
            
            const totalPriceShoes = currentPedido.items.reduce((sum, item) => sum + item.priceShoes, 0);
            const totalPrecioFinal = currentPedido.items.reduce((sum, item) => sum + item.precioFinal, 0);
            
            await updateDoc(doc(db, 'pedidos', currentPedido.id), {
                items: currentPedido.items,
                totalPriceShoes,
                totalPrecioFinal
            });
            
            currentPedido.totalPriceShoes = totalPriceShoes;
            currentPedido.totalPrecioFinal = totalPrecioFinal;
            
            const cacheIndex = pedidosCache.findIndex(p => p.id === currentPedido.id);
            if (cacheIndex !== -1) {
                pedidosCache[cacheIndex] = currentPedido;
            }
            
            alert('Item eliminado correctamente', 'success');
            
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

// Función global para resetear estado
window.resetPedidoState = function() {
    currentPedido = null;
    clearPedidoForm();
    document.querySelector('#nuevo-pedido-screen h2').textContent = 'Nuevo Pedido';
    document.getElementById('guardar-pedido').textContent = 'Guardar Pedido';
};

export function initPedidos() {
    document.getElementById('modal-detalle-close')?.addEventListener('click', () => {
        document.getElementById('modal-detalle-pedido').classList.remove('active');
    });

    document.getElementById('back-detalle-pedido')?.addEventListener('click', () => {
        showScreen('historial-pedidos-screen');
    });

    document.getElementById('cargar-mas-pedidos')?.addEventListener('click', () => {
        pedidosCargados += 5;
        loadHistorialPedidos(false);
    });

    document.getElementById('btn-nuevo-pedido').addEventListener('click', async () => {
        currentPedido = null; // Resetear pedido actual
        await loadClientes();
        populateItemClienteSelect();
        document.querySelector('#nuevo-pedido-screen h2').textContent = 'Nuevo Pedido';
        document.getElementById('guardar-pedido').textContent = 'Guardar Pedido';
        showScreen('nuevo-pedido-screen');
    });

    document.getElementById('btn-historial-pedidos').addEventListener('click', async () => {
        await loadHistorialPedidos(true);
        showScreen('historial-pedidos-screen');
    });

    document.getElementById('add-item-form').addEventListener('click', () => {
        editingItemIndex = -1;
        document.getElementById('item-form-title').textContent = 'Nuevo Item';
        document.getElementById('save-item').textContent = 'Guardar Item';
        document.getElementById('item-form').style.display = 'block';
        document.getElementById('item-form').scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('cancel-item').addEventListener('click', () => {
        clearItemForm();
        editingItemIndex = -1;
        document.getElementById('item-form').style.display = 'none';
    });

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

    document.getElementById('guardar-pedido').addEventListener('click', async () => {
        if (items.length === 0) {
            alert('Por favor agrega al menos un item al pedido', 'warning');
            return;
        }

        const totalPriceShoes = items.reduce((sum, item) => sum + item.priceShoes, 0);
        const totalPrecioFinal = items.reduce((sum, item) => sum + item.precioFinal, 0);
        const clientesEnPedido = [...new Set(items.map(item => item.clienteNombre))];

        try {
            // Si hay un pedido actual, actualizar; si no, crear nuevo
            if (currentPedido) {
                await updateDoc(doc(db, 'pedidos', currentPedido.id), {
                    clientes: clientesEnPedido,
                    items,
                    totalPriceShoes,
                    totalPrecioFinal,
                    fechaActualizacion: Timestamp.now()
                });

                // Actualizar cache
                const cacheIndex = pedidosCache.findIndex(p => p.id === currentPedido.id);
                if (cacheIndex !== -1) {
                    pedidosCache[cacheIndex] = {
                        ...pedidosCache[cacheIndex],
                        clientes: clientesEnPedido,
                        items,
                        totalPriceShoes,
                        totalPrecioFinal
                    };
                }

                alert(`Pedido ${currentPedido.folio} actualizado exitosamente con ${items.length} item(s)`, 'success');
                currentPedido = null;
            } else {
                const folio = await generarFolio();
                
                await addDoc(collection(db, 'pedidos'), {
                    folio,
                    clientes: clientesEnPedido,
                    items,
                    totalPriceShoes,
                    totalPrecioFinal,
                    fechaCreacion: Timestamp.now()
                });

                alert(`Pedido ${folio} guardado exitosamente con ${items.length} item(s)`, 'success');
            }
            
            // Resetear título y botón
            document.querySelector('#nuevo-pedido-screen h2').textContent = 'Nuevo Pedido';
            document.getElementById('guardar-pedido').textContent = 'Guardar Pedido';
            
            clearPedidoForm();
            showScreen('pedidos-screen');
        } catch (error) {
            console.error('Error guardando pedido:', error);
            alert('Error al guardar el pedido', 'error');
        }
    });
}