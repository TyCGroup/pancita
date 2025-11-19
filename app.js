// app.js - Archivo principal
import { initAuth, login, logout } from './auth.js';
import { initNavigation } from './navigation.js';
import { initPedidos } from './pedidos.js';
import { initClientes } from './clientes.js';
import { initModals } from './modals.js';

// Inicializar modales
initModals();

// Inicializar autenticación
initAuth();

// Inicializar navegación
initNavigation();

// Inicializar módulos
initPedidos();
initClientes();

// Event listeners del login
document.getElementById('login-btn').addEventListener('click', async () => {
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    await login(email, password);
});

// Event listener del logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
});