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
    document.getElementById('item-numero').value = '';
    document.getElementById('item-price-shoes').value = '';
    document.getElementById('item-precio-final').value = '';
    document.getElementById('item-ubicacion').value = '';
}

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
    document.getElementById('item-numero').value = item.numero;
    document.getElementById('item-price-shoes').value = item.priceShoes;
    document.getElementById('item-precio-final').value = item.precioFinal;
    document.getElementById('item-ubicacion').value = item.ubicacion;
    
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

// Toggle expandir/colapsar items del pedido
window.togglePedidoItems = function(pedidoId) {
    const itemsContainer = document.getElementById(`items-${pedidoId}`);
    const isExpanded = itemsContainer.style.display === 'block';
    
    // Colapsar todos los demás pedidos
    document.querySelectorAll('.pedido-items-list').forEach(container => {
        container.style.display = 'none';
    });
    
    // Toggle el actual
    itemsContainer.style.display = isExpanded ? 'none' : 'block';
};

// Toggle completado de item individual
window.toggleItemCompletado = async function(pedidoId, itemIndex) {
    try {
        const pedidoDoc = await getDoc(doc(db, 'pedidos', pedidoId));
        if (pedidoDoc.exists()) {
            const pedido = pedidoDoc.data();
            pedido.items[itemIndex].completado = !pedido.items[itemIndex].completado;
            
            await updateDoc(doc(db, 'pedidos', pedidoId), {
                items: pedido.items
            });
            
            // Recargar historial
            await loadHistorialPedidos();
            
            // Mantener expandido el pedido actual
            document.getElementById(`items-${pedidoId}`).style.display = 'block';
        }
    } catch (error) {
        console.error('Error actualizando item:', error);
        alert('Error al actualizar item', 'error');
    }
};

// Agregar nota a item
window.agregarNotaItem = function(pedidoId, itemIndex, notaActual) {
    prompt('Nota del item:', notaActual || '', async (nota) => {
        try {
            const pedidoDoc = await getDoc(doc(db, 'pedidos', pedidoId));
            if (pedidoDoc.exists()) {
                const pedido = pedidoDoc.data();
                pedido.items[itemIndex].nota = nota;
                
                await updateDoc(doc(db, 'pedidos', pedidoId), {
                    items: pedido.items
                });
                
                alert('Nota guardada correctamente', 'success');
                
                // Recargar historial
                await loadHistorialPedidos();
                
                // Mantener expandido el pedido actual
                document.getElementById(`items-${pedidoId}`).style.display = 'block';
            }
        } catch (error) {
            console.error('Error guardando nota:', error);
            alert('Error al guardar nota', 'error');
        }
    });
};

// Cargar historial de pedidos
export async function loadHistorialPedidos() {
    try {
        const q = query(collection(db, 'pedidos'), orderBy('fechaCreacion', 'desc'));
        const querySnapshot = await getDocs(q);
        const list = document.getElementById('historial-list');
        list.innerHTML = '';

        if (querySnapshot.empty) {
            list.innerHTML = '<div class="empty-state"><p>No hay pedidos registrados</p></div>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const pedido = { id: docSnap.id, ...docSnap.data() };
            const pedidoId = docSnap.id;
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
            div.className = 'pedido-card';
            
            // Header del pedido (clickeable)
            const header = document.createElement('div');
            header.className = 'pedido-header';
            header.onclick = () => togglePedidoItems(pedidoId);
            header.innerHTML = `
                <div class="pedido-header-content">
                    <h4>Folio: ${pedido.folio}</h4>
                    <span class="pedido-progress">${itemsCompletados}/${cantidadItems}</span>
                </div>
                <div class="pedido-info">
                    <p><strong>Clientes:</strong> ${clientesTexto}</p>
                    ${categorias ? `<p><strong>Categorías:</strong> ${categorias}</p>` : ''}
                    <p><strong>Total Precio Final:</strong> $${(pedido.totalPrecioFinal || 0).toFixed(2)}</p>
                    <p><strong>Fecha:</strong> ${fecha}</p>
                </div>
            `;
            div.appendChild(header);
            
            // Lista de items (colapsable)
            const itemsList = document.createElement('div');
            itemsList.id = `items-${pedidoId}`;
            itemsList.className = 'pedido-items-list';
            itemsList.style.display = 'none';
            
            if (pedido.items && pedido.items.length > 0) {
                pedido.items.forEach((item, index) => {
                    const completado = item.completado || false;
                    const nota = item.nota || '';
                    
                    const itemDiv = document.createElement('div');
                    itemDiv.className = `pedido-item ${completado ? 'item-completado-check' : ''}`;
                    itemDiv.innerHTML = `
                        <div class="pedido-item-checkbox">
                            <input type="checkbox" 
                                   id="check-${pedidoId}-${index}" 
                                   ${completado ? 'checked' : ''}
                                   onchange="toggleItemCompletado('${pedidoId}', ${index})">
                        </div>
                        <div class="pedido-item-content">
                            <div class="pedido-item-main">
                                <strong>${item.categoria} - Número: ${item.numero}</strong>
                                <span class="pedido-item-cliente">${item.clienteNombre}</span>
                            </div>
                            <div class="pedido-item-details">
                                <span>Price Shoes: $${item.priceShoes.toFixed(2)}</span>
                                <span>Precio Final: $${item.precioFinal.toFixed(2)}</span>
                                ${item.ubicacion ? `<span>📍 ${item.ubicacion}</span>` : ''}
                            </div>
                            ${nota ? `<div class="pedido-item-nota">📝 ${nota}</div>` : ''}
                        </div>
                        <div class="pedido-item-actions">
                            <button class="btn-nota-small" onclick="agregarNotaItem('${pedidoId}', ${index}, '${nota.replace(/'/g, "\\'")}')">
                                ${nota ? '✏️' : '📝'}
                            </button>
                        </div>
                    `;
                    itemsList.appendChild(itemDiv);
                });
            }
            
            div.appendChild(itemsList);
            list.appendChild(div);
        });
    } catch (error) {
        console.error('Error cargando historial:', error);
        alert('Error al cargar historial', 'error');
    }
}

// Inicializar eventos de pedidos
export function initPedidos() {
    // Cerrar modal detalle
    document.getElementById('modal-detalle-close')?.addEventListener('click', () => {
        document.getElementById('modal-detalle-pedido').classList.remove('active');
    });

    // Botón nuevo pedido
    document.getElementById('btn-nuevo-pedido').addEventListener('click', async () => {
        await loadClientes();
        populateItemClienteSelect();
        showScreen('nuevo-pedido-screen');
    });

    // Botón historial
    document.getElementById('btn-historial-pedidos').addEventListener('click', async () => {
        await loadHistorialPedidos();
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
        const numero = document.getElementById('item-numero').value;
        const priceShoes = parseFloat(document.getElementById('item-price-shoes').value) || 0;
        const precioFinal = parseFloat(document.getElementById('item-precio-final').value) || 0;
        const ubicacion = document.getElementById('item-ubicacion').value;

        if (!clienteId || !numero || priceShoes <= 0 || precioFinal <= 0) {
            alert('Por favor completa todos los campos obligatorios del item', 'warning');
            return;
        }

        const clientes = getClientes();
        const cliente = clientes.find(c => c.id === clienteId);
        const itemData = {
            clienteId,
            clienteNombre: `${cliente.nombre} ${cliente.apellido}`,
            categoria,
            numero,
            priceShoes,
            precioFinal,
            ubicacion: ubicacion || '',
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