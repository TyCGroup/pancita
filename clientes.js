// clientes.js - Módulo de gestión de clientes
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    Timestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { app } from './firebase-config.js';
import { showScreen } from './navigation.js';
import { alert, prompt } from './modals.js';
import { verDetallePedido } from './pedidos.js';

const db = getFirestore(app);
let clientes = [];
let currentCliente = null;

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

function clearClienteForm() {
    document.getElementById('cliente-nombre').value = '';
    document.getElementById('cliente-apellido').value = '';
    document.getElementById('cliente-whatsapp').value = '';
}

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
                // SOLO contar items completados (palomeados)
                if (item.clienteId === clienteId && item.completado === true) {
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

async function loadDeudas(clienteId) {
    const list = document.getElementById('deudas-list');
    list.innerHTML = '';

    const deudasSnap = await getDocs(collection(db, `clientes/${clienteId}/deudas`));
    
    if (deudasSnap.empty) {
        list.innerHTML = '<div class="empty-state"><p>No hay deudas registradas</p></div>';
        return;
    }
    
    deudasSnap.forEach(docSnap => {
        const deuda = docSnap.data();
        const deudaId = docSnap.id;
        const fecha = deuda.fecha ? deuda.fecha.toDate().toLocaleDateString() : '';
        
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-body">
                <p><strong>${deuda.nombre}</strong></p>
                <p>Monto: $${deuda.monto.toFixed(2)}</p>
                ${fecha ? `<p>Fecha: ${fecha}</p>` : ''}
            </div>
            <div class="list-item-actions">
                <button class="btn-edit" onclick="editarDeuda('${clienteId}', '${deudaId}', '${deuda.nombre.replace(/'/g, "\\'")}', ${deuda.monto})">
                    ✏️
                </button>
                <button class="btn-delete" onclick="eliminarDeuda('${clienteId}', '${deudaId}', '${deuda.nombre.replace(/'/g, "\\'")}')">
                    🗑️
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

async function loadAbonos(clienteId) {
    const list = document.getElementById('abonos-list');
    list.innerHTML = '';

    const abonosSnap = await getDocs(collection(db, `clientes/${clienteId}/abonos`));
    
    if (abonosSnap.empty) {
        list.innerHTML = '<div class="empty-state"><p>No hay abonos registrados</p></div>';
        return;
    }
    
    abonosSnap.forEach(docSnap => {
        const abono = docSnap.data();
        const abonoId = docSnap.id;
        const fecha = abono.fecha.toDate().toLocaleDateString();
        
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-body">
                <p><strong>Abono</strong></p>
                <p>Monto: $${abono.monto.toFixed(2)}</p>
                <p>Fecha: ${fecha}</p>
            </div>
            <div class="list-item-actions">
                <button class="btn-edit" onclick="editarAbono('${clienteId}', '${abonoId}', ${abono.monto}, '${fecha}')">
                    ✏️
                </button>
                <button class="btn-delete" onclick="eliminarAbono('${clienteId}', '${abonoId}')">
                    🗑️
                </button>
            </div>
        `;
        list.appendChild(div);
    });
}

async function loadPedidosCliente(clienteId) {
    const list = document.getElementById('pedidos-cliente-list');
    list.innerHTML = '';

    const pedidosSnap = await getDocs(collection(db, 'pedidos'));
    let hayPedidos = false;
    
    pedidosSnap.forEach(docSnap => {
        const pedidoId = docSnap.id;
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
            div.style.cursor = 'pointer';
            div.onclick = () => verDetallePedido(pedidoId);
            div.innerHTML = `
                <div class="list-item-body">
                    <p><strong>Folio: ${pedido.folio}</strong></p>
                    ${categorias ? `<p>Categorías: ${categorias}</p>` : ''}
                    <p>Items del cliente: ${itemsDelCliente.length}</p>
                    ${totalPriceShoes > 0 ? `<p>Total Price Shoes: $${totalPriceShoes.toFixed(2)}</p>` : ''}
                    <p>Total Precio Final: $${totalPrecioFinal.toFixed(2)}</p>
                    <p>Fecha: ${fecha}</p>
                </div>
            `;
            list.appendChild(div);
        }
    });
    
    if (!hayPedidos) {
        list.innerHTML = '<div class="empty-state"><p>No hay pedidos para este cliente</p></div>';
    }
}

// Editar deuda
window.editarDeuda = function(clienteId, deudaId, nombre, monto) {
    document.getElementById('modal-deuda-nombre').value = nombre;
    document.getElementById('modal-deuda-monto').value = monto;
    document.getElementById('modal-deuda-title').textContent = 'Editar Deuda';
    document.getElementById('modal-deuda-save').textContent = 'Actualizar';
    document.getElementById('modal-deuda-save').setAttribute('data-editing', deudaId);
    document.getElementById('modal-deuda').classList.add('active');
};

// Eliminar deuda
window.eliminarDeuda = async function(clienteId, deudaId, nombre) {
    const { confirm } = await import('./modals.js');
    confirm(`¿Eliminar la deuda "${nombre}"?`, async () => {
        try {
            await deleteDoc(doc(db, `clientes/${clienteId}/deudas`, deudaId));
            alert('Deuda eliminada correctamente', 'success');
            await showDetalleCliente(currentCliente);
        } catch (error) {
            console.error('Error:', error);
            alert('Error al eliminar deuda', 'error');
        }
    });
};

// Editar abono
window.editarAbono = function(clienteId, abonoId, monto, fecha) {
    document.getElementById('modal-abono-monto').value = monto;
    document.getElementById('modal-abono-fecha').value = fecha.split('/').reverse().join('-');
    document.getElementById('modal-abono-title').textContent = 'Editar Abono';
    document.getElementById('modal-abono-save').textContent = 'Actualizar';
    document.getElementById('modal-abono-save').setAttribute('data-editing', abonoId);
    document.getElementById('modal-abono').classList.add('active');
};

// Eliminar abono
window.eliminarAbono = async function(clienteId, abonoId) {
    const { confirm } = await import('./modals.js');
    confirm(`¿Eliminar este abono?`, async () => {
        try {
            await deleteDoc(doc(db, `clientes/${clienteId}/abonos`, abonoId));
            alert('Abono eliminado correctamente', 'success');
            await showDetalleCliente(currentCliente);
        } catch (error) {
            console.error('Error:', error);
            alert('Error al eliminar abono', 'error');
        }
    });
};

export function initClientes() {
    document.getElementById('btn-nuevo-cliente').addEventListener('click', () => {
        showScreen('nuevo-cliente-screen');
    });

    document.getElementById('btn-catalogo-clientes').addEventListener('click', async () => {
        await loadCatalogoClientes();
        showScreen('catalogo-clientes-screen');
    });

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

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${tabName}`).classList.add('active');
        });
    });

    document.getElementById('add-deuda').addEventListener('click', () => {
        document.getElementById('modal-deuda-title').textContent = 'Agregar Deuda';
        document.getElementById('modal-deuda-save').textContent = 'Guardar';
        document.getElementById('modal-deuda-save').removeAttribute('data-editing');
        document.getElementById('modal-deuda-nombre').value = '';
        document.getElementById('modal-deuda-monto').value = '';
        document.getElementById('modal-deuda').classList.add('active');
    });

    document.getElementById('modal-deuda-cancel').addEventListener('click', () => {
        document.getElementById('modal-deuda').classList.remove('active');
        document.getElementById('modal-deuda-save').removeAttribute('data-editing');
    });

    document.getElementById('modal-deuda-save').addEventListener('click', async () => {
        const nombre = document.getElementById('modal-deuda-nombre').value;
        const monto = parseFloat(document.getElementById('modal-deuda-monto').value);
        const deudaId = document.getElementById('modal-deuda-save').getAttribute('data-editing');

        if (!nombre || !monto) {
            alert('Completa todos los campos', 'warning');
            return;
        }

        try {
            if (deudaId) {
                // Actualizar deuda existente
                await updateDoc(doc(db, `clientes/${currentCliente.id}/deudas`, deudaId), {
                    nombre,
                    monto,
                    fechaActualizacion: Timestamp.now()
                });
                alert('Deuda actualizada correctamente', 'success');
            } else {
                // Crear nueva deuda
                await addDoc(collection(db, `clientes/${currentCliente.id}/deudas`), {
                    nombre,
                    monto,
                    fecha: Timestamp.now()
                });
                alert('Deuda agregada correctamente', 'success');
            }

            document.getElementById('modal-deuda').classList.remove('active');
            document.getElementById('modal-deuda-nombre').value = '';
            document.getElementById('modal-deuda-monto').value = '';
            document.getElementById('modal-deuda-save').removeAttribute('data-editing');
            await showDetalleCliente(currentCliente);
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar', 'error');
        }
    });

    document.getElementById('add-abono').addEventListener('click', () => {
        document.getElementById('modal-abono-title').textContent = 'Agregar Abono';
        document.getElementById('modal-abono-save').textContent = 'Guardar';
        document.getElementById('modal-abono-save').removeAttribute('data-editing');
        document.getElementById('modal-abono-monto').value = '';
        document.getElementById('modal-abono-fecha').valueAsDate = new Date();
        document.getElementById('modal-abono').classList.add('active');
    });

    document.getElementById('modal-abono-cancel').addEventListener('click', () => {
        document.getElementById('modal-abono').classList.remove('active');
        document.getElementById('modal-abono-save').removeAttribute('data-editing');
    });

    document.getElementById('modal-abono-save').addEventListener('click', async () => {
        const monto = parseFloat(document.getElementById('modal-abono-monto').value);
        const fecha = document.getElementById('modal-abono-fecha').value;
        const abonoId = document.getElementById('modal-abono-save').getAttribute('data-editing');

        if (!monto || !fecha) {
            alert('Completa todos los campos', 'warning');
            return;
        }

        try {
            if (abonoId) {
                // Actualizar abono existente
                await updateDoc(doc(db, `clientes/${currentCliente.id}/abonos`, abonoId), {
                    monto,
                    fecha: Timestamp.fromDate(new Date(fecha)),
                    fechaActualizacion: Timestamp.now()
                });
                alert('Abono actualizado correctamente', 'success');
            } else {
                // Crear nuevo abono
                await addDoc(collection(db, `clientes/${currentCliente.id}/abonos`), {
                    monto,
                    fecha: Timestamp.fromDate(new Date(fecha))
                });
                alert('Abono agregado correctamente', 'success');
            }

            document.getElementById('modal-abono').classList.remove('active');
            document.getElementById('modal-abono-monto').value = '';
            document.getElementById('modal-abono-save').removeAttribute('data-editing');
            await showDetalleCliente(currentCliente);
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar', 'error');
        }
    });

    document.getElementById('enviar-whatsapp').addEventListener('click', async () => {
        if (!currentCliente) return;

        try {
            await generarPDFEstadoCuenta();
        } catch (error) {
            console.error('Error:', error);
            await enviarWhatsAppSimple();
        }
    });
}

async function enviarWhatsAppSimple() {
    const totales = await calcularTotalesCliente(currentCliente.id);
    const mensaje = `*Estado de Cuenta*\n\n` +
                   `Cliente: ${currentCliente.nombre} ${currentCliente.apellido}\n` +
                   `Debe: $${totales.debe.toFixed(2)}\n` +
                   `Pagado: $${totales.pagado.toFixed(2)}\n` +
                   `Resta: $${totales.resta.toFixed(2)}`;

    const url = `https://wa.me/${currentCliente.whatsapp}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

async function generarPDFEstadoCuenta() {
    const { jsPDF } = window.jspdf;
    
    const totales = await calcularTotalesCliente(currentCliente.id);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;
    
    // Encabezado
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTADO DE CUENTA', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date().toLocaleDateString('es-MX', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    }), pageWidth / 2, 25, { align: 'center' });
    
    // Cliente
    yPos = 50;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', 20, yPos);
    
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`${currentCliente.nombre} ${currentCliente.apellido}`, 20, yPos);
    yPos += 6;
    doc.text(`WhatsApp: ${currentCliente.whatsapp}`, 20, yPos);
    
    // Resumen
    yPos += 15;
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos - 5, pageWidth - 30, 30, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN', 20, yPos + 3);
    
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Debe:`, 20, yPos);
    doc.setTextColor(220, 38, 38);
    doc.text(`$${totales.debe.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
    
    yPos += 7;
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Pagado:`, 20, yPos);
    doc.setTextColor(34, 197, 94);
    doc.text(`$${totales.pagado.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
    
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`SALDO:`, 20, yPos);
    const saldoColor = totales.resta > 0 ? [220, 38, 38] : [34, 197, 94];
    doc.setTextColor(...saldoColor);
    doc.text(`$${totales.resta.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
    
    // Deudas
    yPos += 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DEUDAS', 20, yPos);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);
    
    const deudasSnap = await getDocs(collection(db, `clientes/${currentCliente.id}/deudas`));
    yPos += 8;
    
    if (deudasSnap.empty) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('No hay deudas registradas', 20, yPos);
        yPos += 10;
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        deudasSnap.forEach(docSnap => {
            const deuda = docSnap.data();
            const fecha = deuda.fecha ? deuda.fecha.toDate().toLocaleDateString() : '';
            
            if (yPos > pageHeight - 30) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setTextColor(0, 0, 0);
            doc.text(deuda.nombre, 25, yPos);
            doc.text(fecha, pageWidth / 2, yPos, { align: 'center' });
            doc.setTextColor(220, 38, 38);
            doc.text(`$${deuda.monto.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
            yPos += 7;
        });
    }
    
    // Abonos
    yPos += 5;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ABONOS', 20, yPos);
    doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);
    
    const abonosSnap = await getDocs(collection(db, `clientes/${currentCliente.id}/abonos`));
    yPos += 8;
    
    if (abonosSnap.empty) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('No hay abonos registrados', 20, yPos);
    } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        abonosSnap.forEach(docSnap => {
            const abono = docSnap.data();
            const fecha = abono.fecha.toDate().toLocaleDateString();
            
            if (yPos > pageHeight - 30) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setTextColor(0, 0, 0);
            doc.text('Abono', 25, yPos);
            doc.text(fecha, pageWidth / 2, yPos, { align: 'center' });
            doc.setTextColor(34, 197, 94);
            doc.text(`$${abono.monto.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
            yPos += 7;
        });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Estado de cuenta informativo', pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `Estado_Cuenta_${currentCliente.nombre}_${currentCliente.apellido}.pdf`;
    link.click();
    
    const mensaje = `*Estado de Cuenta*\n\n` +
                   `Hola ${currentCliente.nombre}! 👋\n\n` +
                   `Te envío tu estado de cuenta:\n\n` +
                   `💰 *Saldo Pendiente:* $${totales.resta.toFixed(2)}\n\n` +
                   `📄 He generado un PDF detallado que puedes consultar.\n\n` +
                   `¿Tienes alguna duda?`;

    setTimeout(() => {
        const url = `https://wa.me/${currentCliente.whatsapp}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    }, 500);
}