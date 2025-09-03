class NetworkManager {
    constructor() {
        this.socket = null;
        this.gameId = null;
        this.playerId = null;
        this.playerName = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.processedMessages = new Set(); // Track processed chat messages
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Los event listeners del chat se manejan en game.js
    }

    async createGame(playerName) {
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
                this.gameId = data.game_id;
                this.playerId = data.player_id;
                this.playerName = playerName; // Usar el nombre real del jugador
                
                window.game.startGame(this.playerId, this.gameId, playerName);
                this.processedMessages.clear(); // Limpiar mensajes procesados para nueva partida
                window.game.addChatMessage('system', `Partida creada. Código: ${data.game_code}`);
                
                // Iniciar polling para actualizaciones
                this.startPolling();
            } else {
                alert('Error al crear la partida: ' + data.message);
            }
        } catch (error) {
            console.error('Error al crear partida:', error);
            alert('Error de conexión al crear la partida');
        }
    }

    async joinGame(gameCode, playerName) {
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
                this.gameId = data.game_id;
                this.playerId = data.player_id;
                this.playerName = playerName;
                
                window.game.startGame(this.playerId, this.gameId, playerName);
                this.processedMessages.clear(); // Limpiar mensajes procesados para nueva partida
                window.game.addChatMessage('system', `Te has unido a la partida como ${playerName}`);
                
                // Iniciar polling para actualizaciones
                this.startPolling();
            } else {
                alert('Error al unirse a la partida: ' + data.message);
            }
        } catch (error) {
            console.error('Error al unirse a la partida:', error);
            alert('Error de conexión al unirse a la partida');
        }
    }

    async leaveGame() {
        if (!this.gameId || !this.playerId) return;

        try {
            await fetch('api/leave_game.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game_id: this.gameId,
                    player_id: this.playerId
                })
            });

            this.stopPolling();
            this.gameId = null;
            this.playerId = null;
            this.playerName = null;
            
        } catch (error) {
            console.error('Error al abandonar la partida:', error);
        }
    }

    async sendMove(from, to) {
        if (!this.gameId || !this.playerId) return;

        try {
            console.log(`=== SENDING MOVE REQUEST ===`);
            console.log(`Request data:`, {
                game_id: this.gameId,
                player_id: this.playerId,
                from: from,
                to: to
            });
            
            const response = await fetch('api/make_move.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game_id: this.gameId,
                    player_id: this.playerId,
                    from: from,
                    to: to
                })
            });
            
            console.log(`Response status: ${response.status}`);
            console.log(`Response ok: ${response.ok}`);

            const data = await response.json();
            
            console.log(`=== SERVER RESPONSE ===`);
            console.log(`Server response:`, data);
            
            if (!data.success) {
                console.log(`Move rejected by server: ${data.message}`);
                alert('Movimiento inválido: ' + data.message);
                // Revertir el movimiento en el cliente
                window.game.renderBoard();
            } else {
                console.log(`Move accepted by server`);
            }
        } catch (error) {
            console.error('Error al enviar movimiento:', error);
            alert('Error de conexión al enviar movimiento');
        }
    }

    async sendChatMessage(message) {
        if (!this.gameId || !this.playerId) return;

        try {
            await fetch('api/send_chat.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game_id: this.gameId,
                    player_id: this.playerId,
                    message: message
                })
            });
        } catch (error) {
            console.error('Error al enviar mensaje de chat:', error);
        }
    }

    startPolling() {
        this.stopPolling(); // Asegurar que no hay polling duplicado
        
        this.pollingInterval = setInterval(async () => {
            await this.pollGameState();
        }, 2000); // Polling cada 2 segundos
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    async pollGameState() {
        if (!this.gameId || !this.playerId) return;

        try {
            const response = await fetch(`api/get_game_state.php?game_id=${this.gameId}&player_id=${this.playerId}`);
            const data = await response.json();
            
            if (data.success) {
                this.handleGameUpdate(data.game_data);
            }
        } catch (error) {
            console.error('Error al obtener estado del juego:', error);
        }
    }

    handleGameUpdate(gameData) {
        // Actualizar tablero
        if (gameData.board) {
            window.game.updateBoardFromServer(gameData.board);
        }
        
        // Actualizar jugador actual
        if (gameData.current_player) {
            window.game.updateCurrentPlayer(gameData.current_player);
        }
        
        // Actualizar piezas capturadas
        if (gameData.captured_pieces) {
            window.game.capturedPieces = gameData.captured_pieces;
            window.game.updateCapturedPieces();
        }
        
        // Actualizar estado del juego
        if (gameData.game_state) {
            window.game.gameState = gameData.game_state;
            window.game.updateGameStatus();
        }
        
        // Actualizar nombres de jugadores
        if (gameData.players) {
            console.log('Updating player names from server:', gameData.players);
            gameData.players.forEach(player => {
                if (player.name) {
                    window.game.playerNames[player.player_number] = player.name;
                    console.log(`Set player ${player.player_number} name to: ${player.name}`);
                }
            });
            console.log('Updated playerNames:', window.game.playerNames);
            // Update UI after updating names
            window.game.updateGameStatus();
        }
        
        // Procesar mensajes de chat
        if (gameData.chat_messages) {
            gameData.chat_messages.forEach(msg => {
                if (msg.player_id !== this.playerId) {
                    // Create unique ID for message
                    const messageId = `${msg.id || msg.created_at}_${msg.player_id}_${msg.message}`;
                    
                    // Solo procesar si no se ha procesado antes
                    if (!this.processedMessages.has(messageId)) {
                        // Determinar el tipo de mensaje
                        if (msg.player_name === 'Sistema') {
                            window.game.addChatMessage('system', msg.message);
                        } else {
                    const sender = msg.player_id === 1 ? 'player1' : 'player2';
                            window.game.addChatMessage(sender, msg.message);
                        }
                        this.processedMessages.add(messageId);
                    }
                }
            });
        }
        
        // Check if game ended
        if (gameData.winner) {
            const winnerNumber = gameData.winner;
            const winnerPlayerName = window.game.playerNames[winnerNumber] || `Jugador ${winnerNumber}`;
            const colorText = winnerNumber === 1 ? '(Blancas)' : '(Negras)';
            const winnerName = `${winnerPlayerName} ${colorText}`;
            window.game.addChatMessage('system', `¡${winnerName} ha ganado la partida!`);
            window.game.gameState = 'finished';
            this.stopPolling();
        }
    }

    // Method to generate unique game code
    generateGameCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    // Method to reconnect in case of connection loss
    async reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Máximo número de intentos de reconexión alcanzado');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            if (this.gameId && this.playerId) {
                this.startPolling();
            }
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    // Method to verify connection
    async checkConnection() {
        try {
            const response = await fetch('api/health_check.php');
            const data = await response.json();
            return data.success;
        } catch (error) {
            return false;
        }
    }

    // Method to notify game end to server
    async endGame(winner) {
        if (!this.gameId || !this.playerId) return;

        try {
            await fetch('api/end_game.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    game_id: this.gameId,
                    player_id: this.playerId,
                    winner: winner
                })
            });
        } catch (error) {
            console.error('Error al notificar fin del juego:', error);
        }
    }

    // Method to load initial game state and player names
    async loadInitialGameState() {
        try {
            console.log('=== LOADING INITIAL GAME STATE ===');
            console.log('Loading initial game state for game:', this.gameId, 'player:', this.playerId);
            console.log('My playerId from URL:', this.playerId);
            console.log('My playerName from URL:', this.playerName);
            const response = await fetch(`api/get_game_state.php?game_id=${this.gameId}&player_id=${this.playerId}`);
            const data = await response.json();
            
            console.log('Initial game state response:', data);
            
            if (data.success && data.game_data) {
                const gameData = data.game_data;
                
                console.log('Game data received:', gameData);
                console.log('Current player:', gameData.current_player);
                console.log('Game status:', gameData.game_status);
                console.log('Player 1 name:', gameData.player1_name);
                console.log('Player 2 name:', gameData.player2_name);
                
                // Set both player names
                if (gameData.player1_name) {
                    window.game.playerNames[1] = gameData.player1_name;
                    console.log('Set player 1 name to:', gameData.player1_name);
                }
                if (gameData.player2_name) {
                    window.game.playerNames[2] = gameData.player2_name;
                    console.log('Set player 2 name to:', gameData.player2_name);
                }
                
                // Determine my player number based on my playerId and player names
                console.log('=== PLAYER IDENTIFICATION DEBUG ===');
                console.log('My playerName from URL:', this.playerName);
                console.log('Player 1 name from server:', gameData.player1_name);
                console.log('Player 2 name from server:', gameData.player2_name);
                
                // Clean names for comparison (trim whitespace)
                const myCleanName = this.playerName ? this.playerName.trim() : '';
                const player1CleanName = gameData.player1_name ? gameData.player1_name.trim() : '';
                const player2CleanName = gameData.player2_name ? gameData.player2_name.trim() : '';
                
                console.log('My clean name:', myCleanName);
                console.log('Player 1 clean name:', player1CleanName);
                console.log('Player 2 clean name:', player2CleanName);
                console.log('Player 1 name === my name?', player1CleanName === myCleanName);
                console.log('Player 2 name === my name?', player2CleanName === myCleanName);
                
                if (player1CleanName === myCleanName) {
                    window.game.myPlayerNumber = 1;
                    console.log('✅ I am Player 1 (Whites)');
                } else if (player2CleanName === myCleanName) {
                    window.game.myPlayerNumber = 2;
                    console.log('✅ I am Player 2 (Blacks)');
                } else {
                    console.error('❌ Could not determine my player number!');
                    console.log('My name:', this.playerName);
                    console.log('Player 1 name:', gameData.player1_name);
                    console.log('Player 2 name:', gameData.player2_name);
                    console.log('My name length:', this.playerName ? this.playerName.length : 'undefined');
                    console.log('Player 1 name length:', gameData.player1_name ? gameData.player1_name.length : 'undefined');
                    console.log('Player 2 name length:', gameData.player2_name ? gameData.player2_name.length : 'undefined');
                }
                console.log('=== END PLAYER IDENTIFICATION DEBUG ===');
                
                // Set current player from server
                if (gameData.current_player) {
                    window.game.currentPlayer = gameData.current_player;
                    console.log('Set current player to:', gameData.current_player);
                }
                
                // Set game state from server
                if (gameData.game_status) {
                    window.game.gameState = gameData.game_status;
                    console.log('Set game state to:', gameData.game_status);
                }
                
                console.log('Final playerNames object:', window.game.playerNames);
                console.log('Final myPlayerNumber:', window.game.myPlayerNumber);
                console.log('Final currentPlayer:', window.game.currentPlayer);
                console.log('Final gameState:', window.game.gameState);
                
                // Update UI with player names
                window.game.updateGameStatus();
                console.log('Updated game status with player names');
            } else {
                console.error('Failed to load game state:', data);
            }
            console.log('=== END LOADING INITIAL GAME STATE ===');
        } catch (error) {
            console.error('Error loading initial game state:', error);
        }
    }
}

// Initialize network manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.network = new NetworkManager();
});
