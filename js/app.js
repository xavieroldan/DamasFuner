// Main application file
document.addEventListener('DOMContentLoaded', () => {
    console.log('Aplicación de Damas Funer iniciada');
    
    // Verificar si el navegador soporta las funcionalidades necesarias
    if (!window.fetch) {
        alert('Tu navegador no soporta las funcionalidades necesarias. Por favor, actualiza tu navegador.');
        return;
    }
    
    // Configurar el tema del juego
    setupTheme();
    
    // Configurar notificaciones
    setupNotifications();
    
    // Configurar atajos de teclado
    setupKeyboardShortcuts();
    
    // Show welcome information
    showWelcomeMessage();
});

function setupTheme() {
    // Detectar preferencia de tema del sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (prefersDark) {
        document.body.classList.add('dark-theme');
    }
    
    // Escuchar cambios en la preferencia de tema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (e.matches) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    });
}

function setupNotifications() {
    // Solicitar permiso para notificaciones
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // ESC para cerrar modales
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            });
        }
        

        
        // Ctrl+L para abandonar partida
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            if (window.game && window.game.gameState === 'playing') {
                window.game.leaveGame();
            }
        }
    });
}

function showWelcomeMessage() {
    setTimeout(() => {
        if (window.game) {
            window.game.addChatMessage('system', '¡Bienvenido a Damas Funer Online!');
        }
    }, 1000);
}

// Function to show notifications
function showNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23667eea"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
        });
    }
}

// Function to copy game code to clipboard
function copyGameCode(code) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
            showNotification('Código copiado', `El código ${code} se ha copiado al portapapeles`);
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Código copiado', `El código ${code} se ha copiado al portapapeles`);
    }
}

// Function to show game statistics
function showGameStats() {
    const stats = {
        gamesPlayed: localStorage.getItem('gamesPlayed') || 0,
        gamesWon: localStorage.getItem('gamesWon') || 0,
        totalMoves: localStorage.getItem('totalMoves') || 0
    };
    
    const winRate = stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed * 100).toFixed(1) : 0;
    
    alert(`Estadísticas del juego:
Partidas jugadas: ${stats.gamesPlayed}
Partidas ganadas: ${stats.gamesWon}
Tasa de victorias: ${winRate}%
Total de movimientos: ${stats.totalMoves}`);
}

// Function to save statistics
function saveGameStats(gameResult) {
    const gamesPlayed = parseInt(localStorage.getItem('gamesPlayed') || '0') + 1;
    const gamesWon = parseInt(localStorage.getItem('gamesWon') || '0') + (gameResult === 'win' ? 1 : 0);
    const totalMoves = parseInt(localStorage.getItem('totalMoves') || '0') + 1;
    
    localStorage.setItem('gamesPlayed', gamesPlayed.toString());
    localStorage.setItem('gamesWon', gamesWon.toString());
    localStorage.setItem('totalMoves', totalMoves.toString());
}

// Function to export game
function exportGame() {
    if (!window.game || !window.game.gameId) {
        alert('No hay partida activa para exportar');
        return;
    }
    
    const gameData = {
        gameId: window.game.gameId,
        board: window.game.board,
        currentPlayer: window.game.currentPlayer,
        capturedPieces: window.game.capturedPieces,
        timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(gameData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `damas_partida_${window.game.gameId}.json`;
    link.click();
}

// Function to import game
function importGame() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const gameData = JSON.parse(e.target.result);
                    // Here you could implement the logic to load the game
                    alert('Función de importación en desarrollo');
                } catch (error) {
                    alert('Error al cargar el archivo de partida');
                }
            };
            reader.readAsText(file);
        }
    };
    
    input.click();
}

// Function to show help
function showHelp() {
    const helpText = `
Damas Funer - Guía de uso

Controles:
- Click en una pieza para seleccionarla
- Click en una casilla válida para mover
- Las casillas verdes indican movimientos posibles
- Las casillas azules indican capturas posibles

Atajos de teclado:
- Ctrl+L: Abandonar partida
- ESC: Cerrar modales
- Enter: Enviar mensaje de chat

Reglas:
- Las piezas se mueven diagonalmente
- Las capturas son obligatorias
- Las piezas se convierten en reyes al llegar al final
- Las reyes pueden moverse en cualquier dirección diagonal
- Gana quien capture todas las piezas del oponente

¡Disfruta jugando!
    `;
    
    alert(helpText);
}

// Function to change language (prepared for future implementations)
function changeLanguage(lang) {
    // Here you could implement the logic to change language
    console.log(`Cambiando idioma a: ${lang}`);
}

// Function to adjust difficulty (prepared for future implementations)
function adjustDifficulty(level) {
    // Here you could implement the logic to adjust difficulty
    console.log(`Ajustando dificultad a: ${level}`);
}

// Function to show developer information
function showAbout() {
    const aboutText = `
Damas Funer v1.0

Desarrollado con:
- HTML5, CSS3, JavaScript
- PHP para el backend
- MySQL para la base de datos

Características:
- Multijugador en tiempo real
- Chat integrado
- Interfaz responsive
- Notificaciones del sistema
- Estadísticas de juego

© 2024 - Todos los derechos reservados
    `;
    
    alert(aboutText);
}

// Exportar funciones globales para uso en otros archivos
window.app = {
    showNotification,
    copyGameCode,
    showGameStats,
    saveGameStats,
    exportGame,
    importGame,
    showHelp,
    changeLanguage,
    adjustDifficulty,
    showAbout
};
