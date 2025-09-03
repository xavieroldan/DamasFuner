// Home page functionality
class HomeManager {
    constructor() {
        this.network = new NetworkManager();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // New game button
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.showCreateModal();
        });

        // Join game button
        document.getElementById('join-game-btn').addEventListener('click', () => {
            this.showJoinModal();
        });

        // Create game modal
        document.getElementById('confirm-create-btn').addEventListener('click', () => {
            this.createGame();
        });

        document.getElementById('cancel-create-btn').addEventListener('click', () => {
            this.hideModal('create-modal');
        });

        // Join game modal
        document.getElementById('confirm-join-btn').addEventListener('click', () => {
            this.joinGame();
        });

        document.getElementById('cancel-join-btn').addEventListener('click', () => {
            this.hideModal('join-modal');
        });

        // Copy code button
        document.getElementById('copy-code-btn').addEventListener('click', () => {
            this.copyGameCode();
        });

        // Enter key listeners
        document.getElementById('create-player-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.createGame();
            }
        });

        document.getElementById('game-code-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.joinGame();
            }
        });

        document.getElementById('player-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.joinGame();
            }
        });
    }

    showCreateModal() {
        document.getElementById('create-modal').style.display = 'flex';
        document.getElementById('create-player-name-input').focus();
    }

    showJoinModal() {
        document.getElementById('join-modal').style.display = 'flex';
        document.getElementById('game-code-input').focus();
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showWaitingSpinner(gameCode) {
        document.getElementById('display-game-code').textContent = gameCode;
        document.getElementById('waiting-modal').style.display = 'flex';
    }

    hideWaitingSpinner() {
        document.getElementById('waiting-modal').style.display = 'none';
    }

    async createGame() {
        const playerName = document.getElementById('create-player-name-input').value.trim();
        
        if (!playerName || playerName.length < 3) {
            alert('El nombre debe tener al menos 3 caracteres');
            return;
        }
        
        this.hideModal('create-modal');
        
        try {
            const response = await fetch('api/create_game.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    player_name: playerName
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showWaitingSpinner(data.game_code);
                this.network.gameId = data.game_id;
                this.network.playerId = data.player_id;
                this.network.playerName = playerName;
                
                // Start polling to check when second player joins
                this.startWaitingPolling();
            } else {
                alert('Error al crear la partida: ' + data.message);
            }
        } catch (error) {
            console.error('Error creating game:', error);
            alert('Error de conexión. Inténtalo de nuevo.');
        }
    }

    async joinGame() {
        const gameCode = document.getElementById('game-code-input').value.trim();
        const playerName = document.getElementById('player-name-input').value.trim();
        
        if (!gameCode || !playerName) {
            alert('Por favor, ingresa el código de partida y tu nombre');
            return;
        }
        
        if (playerName.length < 3) {
            alert('El nombre debe tener al menos 3 caracteres');
            return;
        }
        
        this.hideModal('join-modal');
        
        try {
            const response = await fetch('api/join_game.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game_code: gameCode,
                    player_name: playerName
                })
            });

            const data = await response.json();
            
            if (data.success) {
                // Redirect to game page
                window.location.href = `index.html?game=${data.game_id}&player=${data.player_id}&name=${encodeURIComponent(playerName)}`;
            } else {
                alert('Error al unirse a la partida: ' + data.message);
            }
        } catch (error) {
            console.error('Error joining game:', error);
            alert('Error de conexión. Inténtalo de nuevo.');
        }
    }

    startWaitingPolling() {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`api/get_game_state.php?game_id=${this.network.gameId}&player_id=${this.network.playerId}`);
                const data = await response.json();
                
                console.log('Polling game state:', data);
                
                if (data.success && (data.game_state === 'playing' || (data.players && data.players.length >= 2))) {
                    // Second player joined, redirect to game
                    console.log('Second player detected, redirecting...');
                    clearInterval(pollInterval);
                    this.hideWaitingSpinner();
                    window.location.href = `index.html?game=${this.network.gameId}&player=${this.network.playerId}&name=${encodeURIComponent(this.network.playerName)}`;
                }
            } catch (error) {
                console.error('Error polling game state:', error);
            }
        }, 2000);
    }

    copyGameCode() {
        const gameCode = document.getElementById('display-game-code').textContent;
        navigator.clipboard.writeText(gameCode).then(() => {
            const btn = document.getElementById('copy-code-btn');
            const originalText = btn.textContent;
            btn.textContent = '✅ Copiado!';
            btn.style.background = '#4CAF50';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 2000);
        }).catch(() => {
            alert('No se pudo copiar el código. Código: ' + gameCode);
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.homeManager = new HomeManager();
});
