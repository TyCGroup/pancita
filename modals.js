// modals.js - Módulo de gestión de modales
export function showModal(type, title, message, onConfirm = null) {
    const modal = document.getElementById('modal-notification');
    const modalTitle = document.getElementById('modal-notification-title');
    const modalMessage = document.getElementById('modal-notification-message');
    const modalIcon = document.getElementById('modal-notification-icon');
    const btnConfirm = document.getElementById('modal-notification-confirm');
    const btnCancel = document.getElementById('modal-notification-cancel');

    // Configurar icono según tipo
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        question: '❓'
    };

    modalIcon.textContent = icons[type] || icons.info;
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Mostrar/ocultar botón cancelar según si hay callback
    if (onConfirm) {
        btnCancel.style.display = 'block';
        btnConfirm.textContent = 'Confirmar';
        
        // Limpiar eventos previos
        const newBtnConfirm = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);
        
        document.getElementById('modal-notification-confirm').addEventListener('click', () => {
            modal.classList.remove('active');
            onConfirm();
        });
    } else {
        btnCancel.style.display = 'none';
        btnConfirm.textContent = 'Aceptar';
        
        const newBtnConfirm = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);
        
        document.getElementById('modal-notification-confirm').addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    modal.classList.add('active');
}

export function showPrompt(title, defaultValue = '', onConfirm) {
    const modal = document.getElementById('modal-prompt');
    const modalTitle = document.getElementById('modal-prompt-title');
    const input = document.getElementById('modal-prompt-input');
    const btnConfirm = document.getElementById('modal-prompt-confirm');
    const btnCancel = document.getElementById('modal-prompt-cancel');

    modalTitle.textContent = title;
    input.value = defaultValue;

    // Limpiar eventos previos
    const newBtnConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);

    document.getElementById('modal-prompt-confirm').addEventListener('click', () => {
        const value = input.value;
        if (value.trim()) {
            modal.classList.remove('active');
            onConfirm(value);
        }
    });

    modal.classList.add('active');
    input.focus();
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Inicializar event listeners de modales
export function initModals() {
    // Modal de notificación
    document.getElementById('modal-notification-cancel')?.addEventListener('click', () => {
        closeModal('modal-notification');
    });

    // Modal de prompt
    document.getElementById('modal-prompt-cancel')?.addEventListener('click', () => {
        closeModal('modal-prompt');
        document.getElementById('modal-prompt-input').value = '';
    });

    // Modal de deuda
    document.getElementById('modal-deuda-cancel')?.addEventListener('click', () => {
        closeModal('modal-deuda');
    });

    // Modal de abono
    document.getElementById('modal-abono-cancel')?.addEventListener('click', () => {
        closeModal('modal-abono');
    });

    // Cerrar modales al hacer click fuera
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Reemplazar alert nativo
export function alert(message, type = 'info') {
    showModal(type, type === 'error' ? 'Error' : 'Información', message);
}

// Reemplazar confirm nativo
export function confirm(message, onConfirm) {
    showModal('question', 'Confirmación', message, onConfirm);
}

// Reemplazar prompt nativo
export function prompt(title, defaultValue, onConfirm) {
    showPrompt(title, defaultValue, onConfirm);
}