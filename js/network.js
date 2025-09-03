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

            const data = await response.json();
            
            if (!data.success) {
                alert('Movimiento inválido: ' + data.message);
                // Revertir el movimiento en el cliente
                window.game.renderBoard();
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
            gameData.players.forEach(player => {
                if (player.name) {
                    window.game.playerNames[player.player_number] = player.name;
                }
            });
            // Actualizar la UI después de actualizar los nombres
            window.game.updateGameStatus();
        }
        
        // Procesar mensajes de chat
        if (gameData.chat_messages) {
            gameData.chat_messages.forEach(msg => {
                if (msg.player_id !== this.playerId) {
                    // Crear un ID único para el mensaje
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
        
        // Verificar si el juego terminó
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

    // Método para generar código de partida único
    generateGameCode() {
        return Math.random().toString(36).substr(2, 6).toUpperCase();
    }

    // Método para reconectar en caso de pérdida de conexión
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

    // Método para verificar la conexión
    async checkConnection() {
        try {
            const response = await fetch('api/health_check.php');
            const data = await response.json();
            return data.success;
        } catch (error) {
            return false;
        }
    }

    // Método para notificar fin del juego al servidor
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
}

// Inicializar el gestor de red cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.network = new NetworkManager();
});
