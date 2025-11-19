// auth.js - Módulo de autenticación
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { app } from './firebase-config.js';
import { showScreen } from './navigation.js';

const auth = getAuth(app);
let currentUser = null;

// Verificar estado de autenticación
export function initAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            showScreen('menu-screen');
        } else {
            currentUser = null;
            showScreen('login-screen');
        }
    });
}

// Login
export async function login(email, password) {
    const errorDiv = document.getElementById('login-error');
    const loginBtn = document.getElementById('login-btn');

    if (!email || !password) {
        errorDiv.textContent = 'Por favor ingresa email y contraseña';
        return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Iniciando sesión...';
    errorDiv.textContent = '';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    } catch (error) {
        console.error('Error en login:', error);
        
        let mensaje = 'Error al iniciar sesión';
        switch (error.code) {
            case 'auth/invalid-email':
                mensaje = 'El email no es válido';
                break;
            case 'auth/user-disabled':
                mensaje = 'Esta cuenta ha sido deshabilitada';
                break;
            case 'auth/user-not-found':
                mensaje = 'No existe una cuenta con este email';
                break;
            case 'auth/wrong-password':
                mensaje = 'Contraseña incorrecta';
                break;
            case 'auth/invalid-credential':
                mensaje = 'Email o contraseña incorrectos';
                break;
            case 'auth/too-many-requests':
                mensaje = 'Demasiados intentos. Intenta más tarde';
                break;
            default:
                mensaje = 'Error: ' + error.message;
        }
        
        errorDiv.textContent = mensaje;
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Iniciar Sesión';
    }
}

// Logout
export async function logout() {
    try {
        await signOut(auth);
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    } catch (error) {
        console.error('Error en logout:', error);
        alert('Error al cerrar sesión');
    }
}

export function getCurrentUser() {
    return currentUser;
}