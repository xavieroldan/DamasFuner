class NetworkManager {
    constructor() {
        console.log('=== NETWORKMANAGER CONSTRUCTOR ===');
        console.log('Creating new NetworkManager instance');
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
        console.log('=== END NETWORKMANAGER CONSTRUCTOR ===');
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

    async sendMove(from, to, capturedPieces = [], boardState = null, totalCaptures = null) {
        console.log(`=== SENDMOVE DEBUG ===`);
        console.log(`this.gameId:`, this.gameId);
        console.log(`this.playerId:`, this.playerId);
        console.log(`from:`, from);
        console.log(`to:`, to);
        console.log(`capturedPieces:`, capturedPieces);
        console.log(`boardState:`, boardState);
        console.log(`totalCaptures:`, totalCaptures);
        console.log(`window.network === this:`, window.network === this);
        console.log(`window.network.gameId:`, window.network ? window.network.gameId : 'window.network is null');
        console.log(`window.network.playerId:`, window.network ? window.network.playerId : 'window.network is null');
        
        if (!this.gameId || !this.playerId) {
            console.log(`❌ EARLY EXIT: gameId or playerId is null`);
            return;
        }

        try {
            console.log(`=== SENDING MOVE REQUEST ===`);
            const requestData = {
                game_id: this.gameId,
                player_id: this.playerId,
                from: from,
                to: to,
                captured_pieces: capturedPieces,
                debug: window.game ? window.game.debugMode : false
            };
            
            // Si se proporciona el estado del tablero, incluirlo en la petición
            if (boardState) {
                requestData.board_state = boardState;
                console.log(`Including complete board state in request`);
            }
            
            // Si se proporcionan las capturas totales, incluirlas en la petición
            if (totalCaptures) {
                requestData.total_captures = totalCaptures;
                console.log(`Including total captures in request:`, totalCaptures);
            }
            
            console.log(`Request data:`, requestData);
            
            const response = await fetch('api/make_move.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
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
                // El servidor ha procesado el movimiento, actualizar el tablero desde el servidor
                if (data.game_data && data.game_data.board) {
                    // No actualizar el tablero si hay capturas múltiples en progreso
                    if (!window.game.multipleCaptureInProgress) {
                        window.game.updateBoardFromServer(data.game_data.board);
                    } else {
                        console.log('Skipping board update after move - multiple captures in progress');
                    }
                    if (data.game_data.current_player) {
                        window.game.updateCurrentPlayer(data.game_data.current_player);
                    }
                }
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

    async getCurrentCaptures() {
        try {
            const response = await fetch(`api/get_game_state.php?game_id=${this.gameId}&player_id=${this.playerId}`);
            const data = await response.json();
            
            console.log('Current captures response:', data);
            
            if (data.success && data.game_data && data.game_data.captured_pieces) {
                return data.game_data.captured_pieces;
            } else {
                // Si no hay datos válidos, devolver 0 para ambos
                return { black: 0, white: 0 };
            }
        } catch (error) {
            console.error('Error getting current captures:', error);
            // En caso de error, devolver 0 para ambos
            return { black: 0, white: 0 };
        }
    }

    handleGameUpdate(gameData) {
        // Actualizar tablero solo si no hay capturas múltiples en progreso
        if (gameData.board) {
            // No actualizar el tablero si hay capturas múltiples en progreso
            if (!window.game.multipleCaptureInProgress) {
                window.game.updateBoardFromServer(gameData.board);
                
                // No calcular nada - solo usar lo que viene del servidor
            } else {
                console.log('Skipping board update - multiple captures in progress');
            }
        }
        
        // Actualizar jugador actual
        if (gameData.current_player) {
            window.game.updateCurrentPlayer(gameData.current_player);
        }
        
        // Actualizar piezas capturadas - solo usar lo que viene del servidor
        console.log(`=== SERVER UPDATE - CAPTURED PIECES CHECK ===`);
        console.log(`gameData.captured_pieces exists:`, !!gameData.captured_pieces);
        console.log(`gameData.captured_pieces value:`, gameData.captured_pieces);
        console.log(`typeof gameData.captured_pieces:`, typeof gameData.captured_pieces);
        
        if (gameData.captured_pieces) {
            console.log(`=== UPDATING CAPTURED PIECES FROM SERVER ===`);
            console.log(`Server captured pieces:`, gameData.captured_pieces);
            console.log(`Current window.game.capturedPieces before update:`, window.game.capturedPieces);
            
            // Ensure server data is valid before updating
            const serverCaptures = gameData.captured_pieces;
            console.log(`serverCaptures type:`, typeof serverCaptures);
            console.log(`serverCaptures === null:`, serverCaptures === null);
            console.log(`serverCaptures === undefined:`, serverCaptures === undefined);
            
            if (typeof serverCaptures === 'object' && serverCaptures !== null) {
                console.log(`✅ Server data is valid object`);
                console.log(`serverCaptures.black:`, serverCaptures.black, `type:`, typeof serverCaptures.black);
                console.log(`serverCaptures.white:`, serverCaptures.white, `type:`, typeof serverCaptures.white);
                
                // Validate and sanitize server data
                const blackCount = typeof serverCaptures.black === 'number' ? serverCaptures.black : 0;
                const whiteCount = typeof serverCaptures.white === 'number' ? serverCaptures.white : 0;
                
                console.log(`Sanitized values - blackCount: ${blackCount} (type: ${typeof blackCount}), whiteCount: ${whiteCount} (type: ${typeof whiteCount})`);
                
                window.game.capturedPieces = { black: blackCount, white: whiteCount };
                console.log(`Updated captured pieces from server:`, window.game.capturedPieces);
                
                window.game.updateCapturedPieces();
                console.log(`Final captured pieces after update:`, window.game.capturedPieces);
            } else {
                console.log(`❌ Invalid server captured pieces data, keeping current values`);
                console.log(`Current values will remain:`, window.game.capturedPieces);
            }
            console.log(`=== END UPDATING CAPTURED PIECES FROM SERVER ===`);
        } else {
            console.log(`❌ No captured_pieces in server data, keeping current values:`, window.game.capturedPieces);
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
                        // Chat messages removed - no longer needed
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
            
            // Verificar si fue por abandono
            const isAbandonment = gameData.game_status === 'finished' && gameData.winner;
            if (isAbandonment) {
                window.game.handleGameAbandonment(winnerName);
            } else {
                // Game won - no chat message needed
            }
            
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

// Network manager will be initialized in game.js
