// Home page functionality
class HomeManager {
    constructor() {
        this.gameId = null;
        this.playerId = null;
        this.playerName = null;
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

        // Debug mode button - will be set up after DOM is ready

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

        // Real-time validation for create game form
        document.getElementById('create-player-name-input').addEventListener('input', (e) => {
            this.validateCreateForm();
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

        // Real-time validation for join game form
        document.getElementById('player-name-input').addEventListener('input', (e) => {
            this.validateJoinForm();
        });

        document.getElementById('game-code-input').addEventListener('input', (e) => {
            this.validateJoinForm();
        });
    }

    // Validation functions for forms
    validateCreateForm() {
        const playerName = document.getElementById('create-player-name-input').value.trim();
        const createBtn = document.getElementById('confirm-create-btn');
        
        if (playerName.length >= 3 && playerName.length <= 10) {
            createBtn.disabled = false;
            createBtn.style.opacity = '1';
        } else {
            createBtn.disabled = true;
            createBtn.style.opacity = '0.5';
        }
    }

    validateJoinForm() {
        const gameCode = document.getElementById('game-code-input').value.trim();
        const playerName = document.getElementById('player-name-input').value.trim();
        const joinBtn = document.getElementById('confirm-join-btn');
        
        if (gameCode.length === 3 && playerName.length >= 3 && playerName.length <= 10) {
            joinBtn.disabled = false;
            joinBtn.style.opacity = '1';
        } else {
            joinBtn.disabled = true;
            joinBtn.style.opacity = '0.5';
        }
    }

    showCreateModal() {
        document.getElementById('create-modal').style.display = 'flex';
        document.getElementById('create-player-name-input').focus();
        // Initialize button as disabled
        const createBtn = document.getElementById('confirm-create-btn');
        createBtn.disabled = true;
        createBtn.style.opacity = '0.5';
    }

    showJoinModal() {
        document.getElementById('join-modal').style.display = 'flex';
        document.getElementById('game-code-input').focus();
        // Initialize button as disabled
        const joinBtn = document.getElementById('confirm-join-btn');
        joinBtn.disabled = true;
        joinBtn.style.opacity = '0.5';
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
        
        if (!playerName || playerName.length < 3 || playerName.length > 10) {
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
                this.gameId = data.game_id;
                this.playerId = data.player_id;
                this.playerName = playerName;
                
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
        
        if (!gameCode || !playerName || playerName.length < 3 || playerName.length > 10) {
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
                window.location.href = `game.html?game=${data.game_id}&player=${data.player_id}&name=${encodeURIComponent(playerName)}`;
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
                const response = await fetch(`api/get_game_state.php?game_id=${this.gameId}&player_id=${this.playerId}`);
                const data = await response.json();
                
                console.log('Polling game state:', data);
                
                if (data.success && data.game_data) {
                    const gameData = data.game_data;
                    
                    // Check if both players are present (player1_name and player2_name are not null)
                    const hasBothPlayers = gameData.player1_name && gameData.player2_name;
                    const isPlaying = gameData.game_status === 'playing';
                    
                    console.log('Game status:', gameData.game_status);
                    console.log('Player 1 name:', gameData.player1_name);
                    console.log('Player 2 name:', gameData.player2_name);
                    console.log('Has both players:', hasBothPlayers);
                    console.log('Is playing:', isPlaying);
                    
                    if (isPlaying || hasBothPlayers) {
                        // Second player joined, redirect to game
                        console.log('Second player detected, redirecting...');
                        clearInterval(pollInterval);
                        this.hideWaitingSpinner();
                        window.location.href = `game.html?game=${this.gameId}&player=${this.playerId}&name=${encodeURIComponent(this.playerName)}`;
                    }
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

    activateDebugMode() {
        console.log('🔧 activateDebugMode called');
        console.log('🔧 Redirecting to game.html?debug=true');
        // Redirect directly to debug mode without creating a real game
        window.location.href = 'game.html?debug=true';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.homeManager = new HomeManager();
    
    // Set up debug button after DOM is ready
    const debugBtn = document.getElementById('debug-mode-btn');
    console.log('🔧 Debug button found:', !!debugBtn);
    if (debugBtn) {
        debugBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔧 Debug button clicked');
            window.location.href = 'debug.html';
        });
    } else {
        console.log('🔧 Debug button not found!');
    }
});
