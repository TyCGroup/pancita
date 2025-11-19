// clientes.js - Módulo de gestión de clientes
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    getDoc,
    doc,
    Timestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { app } from './firebase-config.js';
import { showScreen } from './navigation.js';
import { alert, prompt } from './modals.js';

const db = getFirestore(app);
let clientes = [];
let currentCliente = null;

// Cargar clientes
export async function loadClientes() {
    try {
        const querySnapshot = await getDocs(collection(db, 'clientes'));
        clientes = [];

        querySnapshot.forEach((doc) => {
            const cliente = { id: doc.id, ...doc.data() };
            clientes.push(cliente);
        });
    } catch (error) {
        console.error('Error cargando clientes:', error);
        alert('Error al cargar clientes', 'error');
    }
}

export function getClientes() {
    return clientes;
}

// Limpiar formulario de cliente
function clearClienteForm() {
    document.getElementById('cliente-nombre').value = '';
    document.getElementById('cliente-apellido').value = '';
    document.getElementById('cliente-whatsapp').value = '';
}

// Calcular totales del cliente
async function calcularTotalesCliente(clienteId) {
    let debe = 0;
    let pagado = 0;

    const deudasSnap = await getDocs(collection(db, `clientes/${clienteId}/deudas`));
    deudasSnap.forEach(doc => {
        debe += doc.data().monto || 0;
    });

    const abonosSnap = await getDocs(collection(db, `clientes/${clienteId}/abonos`));
    abonosSnap.forEach(doc => {
        pagado += doc.data().monto || 0;
    });

    const pedidosSnap = await getDocs(collection(db, 'pedidos'));
    pedidosSnap.forEach(doc => {
        const pedido = doc.data();
        if (pedido.items && pedido.items.length > 0) {
            pedido.items.forEach(item => {
                if (item.clienteId === clienteId) {
                    debe += item.precioFinal || 0;
                }
            });
        } else if (pedido.clienteId === clienteId) {
            debe += pedido.totalPrecioFinal || 0;
        }
    });

    const resta = debe - pagado;
    return { debe, pagado, resta };
}

// Cargar catálogo de clientes
export async function loadCatalogoClientes() {
    try {
        const querySnapshot = await getDocs(collection(db, 'clientes'));
        const list = document.getElementById('catalogo-list');
        list.innerHTML = '';

        if (querySnapshot.empty) {
            list.innerHTML = '<div class="empty-state"><p>No hay clientes registrados</p></div>';
            return;
        }

        for (const docSnap of querySnapshot.docs) {
            const cliente = { id: docSnap.id, ...docSnap.data() };
            const totales = await calcularTotalesCliente(cliente.id);

            const div = document.createElement('div');
            div.className = 'list-item';
            div.style.cursor = 'pointer';
            div.innerHTML = `
                <div class="list-item-header">
                    <h4>${cliente.nombre} ${cliente.apellido}</h4>
                </div>
                <div class="list-item-body">
                    <p><strong>Debe:</strong> $${totales.debe.toFixed(2)}</p>
                    <p><strong>Pagado:</strong> $${totales.pagado.toFixed(2)}</p>
                    <p><strong>Resta:</strong> $${totales.resta.toFixed(2)}</p>
                </div>
            `;
            div.addEventListener('click', () => showDetalleCliente(cliente));
            list.appendChild(div);
        }
    } catch (error) {
        console.error('Error cargando catálogo:', error);
        alert('Error al cargar catálogo', 'error');
    }
}

// Mostrar detalle del cliente
async function showDetalleCliente(cliente) {
    currentCliente = cliente;
    document.getElementById('detalle-cliente-nombre').textContent = `${cliente.nombre} ${cliente.apellido}`;
    
    const totales = await calcularTotalesCliente(cliente.id);
    document.getElementById('debe-total').textContent = `$${totales.debe.toFixed(2)}`;
    document.getElementById('pagado-total').textContent = `$${totales.pagado.toFixed(2)}`;
    document.getElementById('resta-total').textContent = `$${totales.resta.toFixed(2)}`;

    await loadDeudas(cliente.id);
    await loadAbonos(cliente.id);
    await loadPedidosCliente(cliente.id);

    showScreen('detalle-cliente-screen');
}

// Cargar deudas
async function loadDeudas(clienteId) {
    const list = document.getElementById('deudas-list');
    list.innerHTML = '';

    const deudasSnap = await getDocs(collection(db, `clientes/${clienteId}/deudas`));
    deudasSnap.forEach(doc => {
        const deuda = doc.data();
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-body">
                <p><strong>${deuda.nombre}</strong></p>
                <p>Monto: $${deuda.monto.toFixed(2)}</p>
            </div>
        `;
        list.appendChild(div);
    });
}

// Cargar abonos
async function loadAbonos(clienteId) {
    const list = document.getElementById('abonos-list');
    list.innerHTML = '';

    const abonosSnap = await getDocs(collection(db, `clientes/${clienteId}/abonos`));
    abonosSnap.forEach(doc => {
        const abono = doc.data();
        const fecha = abono.fecha.toDate().toLocaleDateString();
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-body">
                <p><strong>Abono</strong></p>
                <p>Monto: $${abono.monto.toFixed(2)}</p>
                <p>Fecha: ${fecha}</p>
            </div>
        `;
        list.appendChild(div);
    });
}

// Cargar pedidos del cliente
async function loadPedidosCliente(clienteId) {
    const list = document.getElementById('pedidos-cliente-list');
    list.innerHTML = '';

    const pedidosSnap = await getDocs(collection(db, 'pedidos'));
    let hayPedidos = false;
    
    pedidosSnap.forEach(docSnap => {
        const pedido = docSnap.data();
        
        let itemsDelCliente = [];
        let totalPriceShoes = 0;
        let totalPrecioFinal = 0;
        
        if (pedido.items && pedido.items.length > 0) {
            itemsDelCliente = pedido.items.filter(item => item.clienteId === clienteId);
            totalPriceShoes = itemsDelCliente.reduce((sum, item) => sum + item.priceShoes, 0);
            totalPrecioFinal = itemsDelCliente.reduce((sum, item) => sum + item.precioFinal, 0);
        } else if (pedido.clienteId === clienteId) {
            itemsDelCliente = [{ total: pedido.totalPrecioFinal }];
            totalPrecioFinal = pedido.totalPrecioFinal;
        }
        
        if (itemsDelCliente.length > 0) {
            hayPedidos = true;
            const fecha = pedido.fechaCreacion.toDate().toLocaleDateString();
            
            let categorias = '';
            if (itemsDelCliente[0].categoria) {
                const categoriasUnicas = [...new Set(itemsDelCliente.map(item => item.categoria))];
                categorias = categoriasUnicas.join(', ');
            }
            
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div class="list-item-body">
                    <p><strong>Folio: ${pedido.folio}</strong></p>
                    ${categorias ? `<p>Categorías: ${categorias}</p>` : ''}
                    <p>Items del cliente: ${itemsDelCliente.length}</p>
                    ${totalPriceShoes > 0 ? `<p>Total Price Shoes: $${totalPriceShoes.toFixed(2)}</p>` : ''}
                    <p>Total Precio Final: $${totalPrecioFinal.toFixed(2)}</p>
                    <p>Fecha: ${fecha}</p>
                    <button class="btn-secondary" style="margin-top: 10px; width: 100%;" onclick="verItemsCliente('${docSnap.id}', '${clienteId}')">
                        Ver Items
                    </button>
                </div>
            `;
            list.appendChild(div);
        }
    });
    
    if (!hayPedidos) {
        list.innerHTML = '<div class="empty-state"><p>No hay pedidos para este cliente</p></div>';
    }
}

// Ver items de cliente en pedido
window.verItemsCliente = async function(pedidoId, clienteId) {
    try {
        const pedidoDoc = await getDoc(doc(db, 'pedidos', pedidoId));
        if (pedidoDoc.exists()) {
            const pedido = pedidoDoc.data();
            let detalles = `Folio: ${pedido.folio}\n\nItems del cliente:\n\n`;
            
            if (pedido.items && pedido.items.length > 0) {
                const itemsDelCliente = pedido.items.filter(item => item.clienteId === clienteId);
                itemsDelCliente.forEach((item, index) => {
                    detalles += `━━━━━━━━━━━━━━━━━━━━\n`;
                    detalles += `Item ${index + 1}:\n`;
                    detalles += `  Categoría: ${item.categoria}\n`;
                    detalles += `  Número: ${item.numero}\n`;
                    detalles += `  Price Shoes: $${item.priceShoes.toFixed(2)}\n`;
                    detalles += `  Precio Final: $${item.precioFinal.toFixed(2)}\n`;
                    if (item.ubicacion) {
                        detalles += `  Ubicación: ${item.ubicacion}\n`;
                    }
                    detalles += `\n`;
                });
                
                const totalPriceShoes = itemsDelCliente.reduce((sum, item) => sum + item.priceShoes, 0);
                const totalPrecioFinal = itemsDelCliente.reduce((sum, item) => sum + item.precioFinal, 0);
                
                detalles += `━━━━━━━━━━━━━━━━━━━━\n`;
                detalles += `Total Items: ${itemsDelCliente.length}\n`;
                detalles += `Total Price Shoes: $${totalPriceShoes.toFixed(2)}\n`;
                detalles += `Total Precio Final: $${totalPrecioFinal.toFixed(2)}`;
            }
            
            alert(detalles);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar items', 'error');
    }
};

// Inicializar eventos de clientes
export function initClientes() {
    // Botones principales
    document.getElementById('btn-nuevo-cliente').addEventListener('click', () => {
        showScreen('nuevo-cliente-screen');
    });

    document.getElementById('btn-catalogo-clientes').addEventListener('click', async () => {
        await loadCatalogoClientes();
        showScreen('catalogo-clientes-screen');
    });

    // Guardar cliente
    document.getElementById('guardar-cliente').addEventListener('click', async () => {
        const nombre = document.getElementById('cliente-nombre').value;
        const apellido = document.getElementById('cliente-apellido').value;
        const whatsapp = document.getElementById('cliente-whatsapp').value;

        if (!nombre || !apellido || !whatsapp) {
            alert('Por favor completa todos los campos', 'warning');
            return;
        }

        try {
            await addDoc(collection(db, 'clientes'), {
                nombre,
                apellido,
                whatsapp,
                fechaCreacion: Timestamp.now()
            });

            alert('Cliente guardado exitosamente', 'success');
            clearClienteForm();
            showScreen('clientes-screen');
        } catch (error) {
            console.error('Error guardando cliente:', error);
            alert('Error al guardar cliente', 'error');
        }
    });

    // Tabs del detalle
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabName}`).classList.add('active');
        });
    });

    // Agregar deuda
    document.getElementById('add-deuda').addEventListener('click', () => {
        document.getElementById('modal-deuda').classList.add('active');
    });

    document.getElementById('modal-deuda-cancel').addEventListener('click', () => {
        document.getElementById('modal-deuda').classList.remove('active');
    });

    document.getElementById('modal-deuda-save').addEventListener('click', async () => {
        const nombre = document.getElementById('modal-deuda-nombre').value;
        const monto = parseFloat(document.getElementById('modal-deuda-monto').value);

        if (!nombre || !monto) {
            alert('Completa todos los campos', 'warning');
            return;
        }

        try {
            await addDoc(collection(db, `clientes/${currentCliente.id}/deudas`), {
                nombre,
                monto,
                fecha: Timestamp.now()
            });

            document.getElementById('modal-deuda').classList.remove('active');
            document.getElementById('modal-deuda-nombre').value = '';
            document.getElementById('modal-deuda-monto').value = '';
            await showDetalleCliente(currentCliente);
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar', 'error');
        }
    });

    // Agregar abono
    document.getElementById('add-abono').addEventListener('click', () => {
        document.getElementById('modal-abono-fecha').valueAsDate = new Date();
        document.getElementById('modal-abono').classList.add('active');
    });

    document.getElementById('modal-abono-cancel').addEventListener('click', () => {
        document.getElementById('modal-abono').classList.remove('active');
    });

    document.getElementById('modal-abono-save').addEventListener('click', async () => {
        const monto = parseFloat(document.getElementById('modal-abono-monto').value);
        const fecha = document.getElementById('modal-abono-fecha').value;

        if (!monto || !fecha) {
            alert('Completa todos los campos', 'warning');
            return;
        }

        try {
            await addDoc(collection(db, `clientes/${currentCliente.id}/abonos`), {
                monto,
                fecha: Timestamp.fromDate(new Date(fecha))
            });

            document.getElementById('modal-abono').classList.remove('active');
            document.getElementById('modal-abono-monto').value = '';
            await showDetalleCliente(currentCliente);
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar', 'error');
        }
    });

    // Enviar por WhatsApp
    document.getElementById('enviar-whatsapp').addEventListener('click', async () => {
        if (!currentCliente) return;

        const totales = await calcularTotalesCliente(currentCliente.id);
        const mensaje = `*Estado de Cuenta*\n\n` +
                       `Cliente: ${currentCliente.nombre} ${currentCliente.apellido}\n` +
                       `Debe: $${totales.debe.toFixed(2)}\n` +
                       `Pagado: $${totales.pagado.toFixed(2)}\n` +
                       `Resta: $${totales.resta.toFixed(2)}`;

        const url = `https://wa.me/${currentCliente.whatsapp}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    });
}