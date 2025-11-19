// navigation.js - Módulo de navegación
export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

export function resetearEstadoPedido() {
    // Esta función será llamada por pedidos.js para resetear el estado
    document.querySelector('#nuevo-pedido-screen h2').textContent = 'Nuevo Pedido';
    document.getElementById('guardar-pedido').textContent = 'Guardar Pedido';
}

export function initNavigation() {
    // Menú principal
    document.getElementById('menu-pedidos').addEventListener('click', () => {
        showScreen('pedidos-screen');
    });

    document.getElementById('menu-clientes').addEventListener('click', () => {
        showScreen('clientes-screen');
    });

    // Navegación Pedidos
    document.getElementById('back-pedidos').addEventListener('click', () => {
        showScreen('menu-screen');
    });

    document.getElementById('back-nuevo-pedido').addEventListener('click', () => {
        // Resetear el estado del pedido
        if (window.resetPedidoState) {
            window.resetPedidoState();
        }
        showScreen('pedidos-screen');
    });

    document.getElementById('back-historial-pedidos').addEventListener('click', () => {
        showScreen('pedidos-screen');
    });

    // Navegación Clientes
    document.getElementById('back-clientes').addEventListener('click', () => {
        showScreen('menu-screen');
    });

    document.getElementById('back-nuevo-cliente').addEventListener('click', () => {
        showScreen('clientes-screen');
    });

    document.getElementById('back-catalogo').addEventListener('click', () => {
        showScreen('clientes-screen');
    });

    document.getElementById('back-detalle-cliente').addEventListener('click', () => {
        showScreen('catalogo-clientes-screen');
    });
}