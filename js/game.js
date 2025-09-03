class DamasGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 1; // 1 = white, 2 = black
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.gameState = 'waiting'; // waiting, playing, finished
        this.capturedPieces = { black: 0, white: 0 };
        this.playerId = null;
        this.gameId = null;
        this.playerName = null; // Current player name
        this.playerNames = { 1: null, 2: null }; // Store both player names
        this.gameEndNotified = false; // Flag to prevent multiple end game notifications
        
        this.initializeBoard();
        this.setupEventListeners();
    }

    initializeBoard() {
        // Create 8x8 board
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        
        // Colocar piezas negras (jugador 1)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { player: 1, isKing: false };
                }
            }
        }
        
        // Colocar piezas blancas (jugador 2)
        for (let row = 5; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { player: 2, isKing: false };
                }
            }
        }
    }

    setupEventListeners() {
        // Event listeners para los botones
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.showGameModal();
        });

        document.getElementById('join-game-btn').addEventListener('click', () => {
            this.showJoinModal();
        });

        document.getElementById('leave-game-btn').addEventListener('click', () => {
            this.leaveGame();
        });

        document.getElementById('create-game-btn').addEventListener('click', () => {
            this.showCreateModal();
        });

        document.getElementById('join-existing-btn').addEventListener('click', () => {
            this.showJoinModal();
        });

        document.getElementById('close-modal-btn').addEventListener('click', () => {
            this.hideModal('game-modal');
        });

        document.getElementById('confirm-join-btn').addEventListener('click', () => {
            this.joinGame();
        });

        document.getElementById('cancel-join-btn').addEventListener('click', () => {
            this.hideModal('join-modal');
        });

        // Event listener para Enter en el input de nombre al unirse
        document.getElementById('player-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.joinGame();
            }
        });

        document.getElementById('confirm-create-btn').addEventListener('click', () => {
            this.createGame();
        });

        document.getElementById('cancel-create-btn').addEventListener('click', () => {
            this.hideModal('create-modal');
        });

        // Event listener para Enter en el input de crear partida
        document.getElementById('create-player-name-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.createGame();
            }
        });

        // Los event listeners del chat se configuran en setupChatEventListeners()
    }

    renderBoard() {
        const boardElement = document.getElementById('game-board');
        boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Alternar colores de las casillas
                if ((row + col) % 2 === 0) {
                    cell.classList.add('light');
                } else {
                    cell.classList.add('dark');
                }

                // Agregar pieza si existe
                if (this.board[row][col]) {
                    const piece = document.createElement('div');
                    piece.className = 'piece';
                    piece.dataset.row = row;
                    piece.dataset.col = col;
                    
                    if (this.board[row][col].player === 1) {
                        piece.classList.add('white');
                    } else {
                        piece.classList.add('black');
                    }
                    
                    if (this.board[row][col].isKing) {
                        piece.classList.add('king');
                        piece.textContent = '♔';
                    }
                    
                    cell.appendChild(piece);
                }

                // Marcar movimientos posibles
                if (this.possibleMoves.some(move => move.row === row && move.col === col)) {
                    cell.classList.add('possible-move');
                }

                // Marcar pieza seleccionada
                if (this.selectedPiece && this.selectedPiece.row === row && this.selectedPiece.col === col) {
                    cell.classList.add('selected');
                }

                cell.addEventListener('click', () => this.handleCellClick(row, col));
                boardElement.appendChild(cell);
            }
        }
    }

    handleCellClick(row, col) {
        if (this.gameState !== 'playing') {
            if (this.gameState === 'finished') {
                this.showMessage('La partida ha terminado', 'info');
            }
            return;
        }
        
        const piece = this.board[row][col];
        
        // Si hay una pieza seleccionada, intentar mover
        if (this.selectedPiece) {
            if (this.isValidMove(this.selectedPiece, { row, col })) {
                const fromPiece = { ...this.selectedPiece }; // Save position before moving
                this.makeMove(this.selectedPiece, { row, col });
                this.selectedPiece = null;
                this.possibleMoves = [];
                this.renderBoard();
                
                // Enviar movimiento al servidor
                if (window.network) {
                    window.network.sendMove(fromPiece, { row, col });
                }
            } else {
                // Show invalid move message
                this.showInvalidMoveMessage(row, col);
                // Seleccionar nueva pieza
                this.selectPiece(row, col);
            }
        } else if (piece && piece.player === this.currentPlayer) {
            // Seleccionar pieza
            this.selectPiece(row, col);
        } else if (piece && piece.player !== this.currentPlayer) {
            // Intentar seleccionar pieza del oponente
            this.showMessage('No puedes mover las piezas del oponente', 'error');
        } else {
            // Click on empty cell without selected piece
            this.showMessage('Selecciona una pieza primero', 'info');
        }
    }

    selectPiece(row, col) {
        this.selectedPiece = { row, col };
        this.possibleMoves = this.getPossibleMoves(row, col);
        this.renderBoard();
    }

    getPossibleMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        // Verificar si hay capturas obligatorias
        const mandatoryCapture = this.applyCaptureRules(piece.player);
        
        if (mandatoryCapture) {
            console.log('Captura obligatoria detectada:', mandatoryCapture);
            // Si hay captura obligatoria, solo mostrar movimientos de captura
            if (mandatoryCapture.piece.row === row && mandatoryCapture.piece.col === col) {
                return mandatoryCapture.captures.map(capture => ({
                    row: capture.row,
                    col: capture.col,
                    type: 'capture',
                    captured: { row: capture.capturedRow, col: capture.capturedCol }
                }));
            } else {
                console.log('No se puede mover esta pieza, hay captura obligatoria con otra');
                return []; // No se puede mover esta pieza si hay captura obligatoria con otra
            }
        }

        // Si no hay captura obligatoria, mostrar movimientos normales
        const moves = [];
        const directions = piece.isKing ? 
            [[-1, -1], [-1, 1], [1, -1], [1, 1]] : 
            (piece.player === 1 ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]]);

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;

            // Movimiento simple
            if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                moves.push({ row: newRow, col: newCol, type: 'move' });
            }
        }

        console.log(`Movimientos posibles para pieza en (${row}, ${col}):`, moves);
        return moves;
    }

    isValidMove(from, to) {
        return this.possibleMoves.some(move => move.row === to.row && move.col === to.col);
    }

    // Function to obtener todas las capturas posibles de un jugador
    getAllPossibleCaptures(player) {
        const captures = [];
        const pieces = this.getPlayerPieces(player);
        
        for (const piece of pieces) {
            const pieceCaptures = this.getPossibleCaptures(piece.row, piece.col);
            if (pieceCaptures.length > 0) {
                captures.push({
                    piece: piece,
                    captures: pieceCaptures
                });
            }
        }
        
        return captures;
    }

    // Function to obtener las piezas de un jugador
    getPlayerPieces(player) {
        const pieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] && this.board[row][col].player === player) {
                    pieces.push({ row, col, piece: this.board[row][col] });
                }
            }
        }
        return pieces;
    }

    // Function to obtener capturas posibles de una pieza específica
    getPossibleCaptures(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const captures = [];
        const directions = piece.isKing ? 
            [[-1, -1], [-1, 1], [1, -1], [1, 1]] : 
            (piece.player === 1 ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]]);

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;

            // Verificar si hay una pieza enemiga para capturar
            if (this.isValidPosition(newRow, newCol) && 
                this.board[newRow][newCol] && 
                this.board[newRow][newCol].player !== piece.player) {
                
                const jumpRow = newRow + dr;
                const jumpCol = newCol + dc;
                
                if (this.isValidPosition(jumpRow, jumpCol) && !this.board[jumpRow][jumpCol]) {
                    captures.push({ 
                        row: jumpRow, 
                        col: jumpCol, 
                        capturedRow: newRow, 
                        capturedCol: newCol,
                        pieceType: piece.isKing ? 'dama' : 'peon'
                    });
                }
            }
        }

        return captures;
    }

    // Function to aplicar las reglas de captura obligatoria
    applyCaptureRules(player) {
        const allCaptures = this.getAllPossibleCaptures(player);
        console.log(`Capturas encontradas para jugador ${player}:`, allCaptures);
        
        if (allCaptures.length === 0) {
            console.log('No hay capturas posibles, devolviendo null');
            return null; // No hay capturas posibles
        }
        
        // Rule 1: Highest capture value (king has priority over pawn)
        const damaCaptures = allCaptures.filter(capture => 
            capture.piece.piece.isKing
        );
        
        if (damaCaptures.length > 0) {
            // Si hay capturas con dama, usar solo esas
            allCaptures.splice(0, allCaptures.length, ...damaCaptures);
        }
        
        // Return the first available capture (no longer prioritizing by number of pieces)
        console.log('Mejor captura encontrada:', allCaptures[0]);
        return allCaptures[0];
    }



    makeMove(from, to) {
        const piece = this.board[from.row][from.col];
        const move = this.possibleMoves.find(m => m.row === to.row && m.col === to.col);
        
        // Mover pieza
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;
        
        // Capturar pieza si es necesario
        if (move && move.type === 'capture') {
            // Add comic capture effect
            this.addCaptureEffect(move.captured.row, move.captured.col);
            this.board[move.captured.row][move.captured.col] = null;
            this.capturedPieces[piece.player === 1 ? 'white' : 'black']++;
            this.updateCapturedPieces();
            
            // Check if there are more possible captures after this
            const moreCaptures = this.getPossibleCaptures(to.row, to.col);
            if (moreCaptures.length > 0) {
                // No cambiar turno, el mismo jugador debe continuar capturando
                this.selectedPiece = { row: to.row, col: to.col };
                this.possibleMoves = moreCaptures.map(capture => ({
                    row: capture.row,
                    col: capture.col,
                    type: 'capture',
                    captured: { row: capture.capturedRow, col: capture.capturedCol }
                }));
                this.renderBoard();
                // Check winner after capture
                this.checkWinnerIfNeeded();
                return; // No cambiar turno
            }
        }
        
        // Promover a rey
        if ((piece.player === 1 && to.row === 7) || (piece.player === 2 && to.row === 0)) {
            piece.isKing = true;
            // Add comic promotion effect
            this.addPromotionEffect(to.row, to.col);
        }
        
        // Change turn only if no more captures
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.updateGameStatus();
        
        // Check winner only after a valid move
        this.checkWinnerIfNeeded();
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    updateGameStatus() {
        const statusElement = document.getElementById('game-status');
        const playerElement = document.getElementById('current-player');
        
        if (this.gameState === 'playing') {
            const playerNumber = this.currentPlayer;
            const playerName = this.playerNames[playerNumber] || `Jugador ${playerNumber}`;
            const colorText = playerNumber === 1 ? '(Blancas)' : '(Negras)';
            const fullPlayerName = `${playerName} ${colorText}`;
            
            playerElement.textContent = fullPlayerName;
            statusElement.textContent = `Turno de ${fullPlayerName}`;
            
            // Update board overlay based on current player
            this.updateBoardOverlay();
        } else {
            statusElement.textContent = 'Esperando jugadores...';
            this.updateBoardOverlay();
        }
    }
    
    updateBoardOverlay() {
        const overlay = document.getElementById('board-overlay');
        if (!overlay) return;
        
        if (this.gameState !== 'playing') {
            overlay.className = 'board-overlay inactive';
            return;
        }
        
        // Check if it's the current player's turn
        // this.currentPlayer is who should play now, this.playerId is my ID
        const isMyTurn = this.currentPlayer === this.playerId;
        
        console.log(`Overlay update: currentPlayer=${this.currentPlayer}, myPlayerId=${this.playerId}, isMyTurn=${isMyTurn}`);
        
        if (isMyTurn) {
            overlay.className = 'board-overlay active';
        } else {
            overlay.className = 'board-overlay inactive';
        }
    }

    updateCapturedPieces() {
        document.getElementById('black-captured').textContent = this.capturedPieces.black;
        document.getElementById('white-captured').textContent = this.capturedPieces.white;
    }

    // Function to verificar ganador solo cuando sea necesario
    checkWinnerIfNeeded() {
        if (this.gameState !== 'playing') {
            return;
        }
        
        const winner = this.checkWinner();
        if (winner) {
            this.endGame(winner);
            return true; // Indicates game ended
        }
        return false; // Game continues
    }

    // Function to verificar si hay un ganador
    checkWinner() {
        // Verificar si un jugador no tiene piezas (victoria por captura)
        const player1Pieces = this.getPlayerPieces(1);
        const player2Pieces = this.getPlayerPieces(2);
        
        if (player1Pieces.length === 0) {
            return 2; // Jugador 2 gana
        }
        if (player2Pieces.length === 0) {
            return 1; // Jugador 1 gana
        }
        
        // Verificar si el jugador actual no tiene movimientos posibles (victoria por bloqueo)
        // Note: this.currentPlayer already changed in makeMove, so we check the player who should play now
        const currentPlayerPieces = this.currentPlayer === 1 ? player1Pieces : player2Pieces;
        
        // Solo verificar bloqueo si el jugador tiene piezas
        if (currentPlayerPieces.length > 0) {
            let hasAnyValidMove = false;
            
            // Verificar cada pieza del jugador actual
            for (const piece of currentPlayerPieces) {
                const pieceObj = this.board[piece.row][piece.col];
                if (pieceObj) {
                    // Verificar movimientos simples (no solo capturas)
                    const directions = pieceObj.isKing ? 
                        [[-1, -1], [-1, 1], [1, -1], [1, 1]] : 
                        (pieceObj.player === 1 ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]]);
                    
                    for (const [dr, dc] of directions) {
                        const newRow = piece.row + dr;
                        const newCol = piece.col + dc;
                        if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                            hasAnyValidMove = true;
                            break;
                        }
                    }
                    
                    // Si no hay movimientos simples, verificar si hay capturas obligatorias
                    if (!hasAnyValidMove) {
                        const captureMoves = this.getPossibleMoves(piece.row, piece.col);
                        if (captureMoves.length > 0) {
                            hasAnyValidMove = true;
                            break;
                        }
                    }
                    
                    if (hasAnyValidMove) break;
                }
            }
            
            // If current player cannot make any move, opponent wins
            if (!hasAnyValidMove) {
                return this.currentPlayer === 1 ? 2 : 1;
            }
        }
        
        return null; // No winner yet
    }

    // Function to finalizar el juego
    endGame(winner) {
        // Avoid ending game if already finished
        if (this.gameState === 'finished') {
            return;
        }
        
        this.gameState = 'finished';
        const winnerNumber = winner;
        const winnerPlayerName = this.playerNames[winnerNumber] || `Jugador ${winnerNumber}`;
        const colorText = winnerNumber === 1 ? '(Blancas)' : '(Negras)';
        const winnerName = `${winnerPlayerName} ${colorText}`;
        
        // Actualizar la interfaz
        const statusElement = document.getElementById('game-status');
        statusElement.textContent = `¡${winnerName} ha ganado!`;
        statusElement.style.color = '#4CAF50';
        statusElement.style.fontWeight = 'bold';
        
        // Mostrar mensaje de victoria
        this.showMessage(`¡${winnerName} ha ganado la partida!`, 'success');
        
        // Add message to chat
        this.addChatMessage('system', `🎉 ¡${winnerName} ha ganado la partida!`);
        
        // Deshabilitar interacciones del tablero
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.renderBoard();
        
        // Notificar al servidor sobre el fin del juego (solo una vez)
        if (window.network && !this.gameEndNotified) {
            this.gameEndNotified = true;
            window.network.endGame(winner);
        }
    }

    showGameModal() {
        document.getElementById('game-modal').style.display = 'block';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showCreateModal() {
        this.hideModal('game-modal');
        document.getElementById('create-modal').style.display = 'block';
    }

    showJoinModal() {
        this.hideModal('game-modal');
        document.getElementById('join-modal').style.display = 'block';
    }

    createGame() {
        const playerName = document.getElementById('create-player-name-input').value.trim();
        
        if (!playerName || playerName.length < 3) {
            alert('El nombre debe tener al menos 3 caracteres');
            return;
        }
        
        this.hideModal('create-modal');
        if (window.network) {
            window.network.createGame(playerName);
        }
    }

    joinGame() {
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
        if (window.network) {
            window.network.joinGame(gameCode, playerName);
        }
    }

    leaveGame() {
        if (window.network) {
            window.network.leaveGame();
        }
        this.resetGame();
    }

    resetGame() {
        this.initializeBoard();
        this.currentPlayer = 1;
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.gameState = 'waiting';
        this.capturedPieces = { black: 0, white: 0 };
        this.playerId = null;
        this.gameId = null;
        this.gameEndNotified = false;
        
        // Restaurar estilos del estado del juego
        const statusElement = document.getElementById('game-status');
        statusElement.style.color = '';
        statusElement.style.fontWeight = '';
        
        this.renderBoard();
        this.updateGameStatus();
        this.updateCapturedPieces();
        
        document.getElementById('new-game-btn').style.display = 'inline-block';
        document.getElementById('join-game-btn').style.display = 'inline-block';
        document.getElementById('leave-game-btn').style.display = 'none';
    }

    startGame(playerId, gameId, playerName) {
        this.playerId = playerId;
        this.gameId = gameId;
        this.playerName = playerName; // Store current player name
        this.playerNames[playerId] = playerName; // Store player name by ID
        this.gameState = 'playing';
        this.gameEndNotified = false;
        
        document.getElementById('new-game-btn').style.display = 'none';
        document.getElementById('join-game-btn').style.display = 'none';
        document.getElementById('leave-game-btn').style.display = 'inline-block';
        
        this.updateGameStatus();
        this.addChatMessage('system', '¡Partida iniciada! ¡Buena suerte!');
    }

    addChatMessage(sender, message) {
        const chatMessages = document.getElementById('chat-messages');
        
        // Check if last message is the same to avoid duplicates
        const lastMessage = chatMessages.lastElementChild;
        if (lastMessage && lastMessage.textContent === message) {
            return; // Don't add duplicate message
        }
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        
        // Para mensajes de sistema, mostrar solo el mensaje sin prefijos
        if (sender === 'system') {
            messageElement.textContent = message;
        } else {
            // For player messages, add player name
            const playerNumber = sender === 'player1' ? 1 : 2;
            const playerName = this.playerNames[playerNumber] || `Jugador ${playerNumber}`;
            console.log(`Chat message: sender=${sender}, playerNumber=${playerNumber}, playerName=${playerName}, playerNames=`, this.playerNames);
            messageElement.textContent = `${playerName}: ${message}`;
        }
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to mostrar mensajes informativos
    showMessage(message, type = 'info') {
        // Crear elemento de mensaje si no existe
        let messageElement = document.getElementById('game-message');
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'game-message';
            messageElement.className = 'game-message';
            document.body.appendChild(messageElement);
        }

        // Configurar el mensaje
        messageElement.textContent = message;
        messageElement.className = `game-message ${type}`;
        messageElement.style.display = 'block';

        // Hide message after 3 seconds
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }

    // Function to mostrar mensaje específico de movimiento no válido
    showInvalidMoveMessage(row, col) {
        const mandatoryCapture = this.applyCaptureRules(this.currentPlayer);
        
        if (mandatoryCapture) {
            if (mandatoryCapture.piece.row !== this.selectedPiece.row || 
                mandatoryCapture.piece.col !== this.selectedPiece.col) {
                this.showMessage('Debes capturar con la pieza de mayor rango o que capture más fichas', 'error');
            } else {
                this.showMessage('Debes realizar la captura obligatoria', 'error');
            }
        } else {
            this.showMessage('Movimiento no válido', 'error');
        }
    }

    sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (message && window.network) {
            window.network.sendChatMessage(message);
            input.value = '';
        }
    }

    setupChatEventListeners() {
        // Event listener for send button
        const sendBtn = document.getElementById('send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendChatMessage();
            });
        }

        // Event listener para la tecla Enter en el input del chat
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault(); // Prevenir el comportamiento por defecto
                    this.sendChatMessage();
                }
            });
        }
    }

    updateBoardFromServer(boardData) {
        this.board = boardData;
        this.renderBoard();
    }

    updateCurrentPlayer(player) {
        this.currentPlayer = player;
        this.updateGameStatus();
    }

    // Function to añadir efecto cómico de captura
    addCaptureEffect(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            const piece = cell.querySelector('.piece');
            if (piece) {
                piece.classList.add('capturing');
                // Remove class after animation
                setTimeout(() => {
                    piece.classList.remove('capturing');
                }, 800);
            }
        }
        
        // Show comic message
        this.showMessage('¡BOOM! 💥 ¡Captura épica!', 'success');
    }

    // Function to añadir efecto cómico de promoción
    addPromotionEffect(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            const piece = cell.querySelector('.piece');
            if (piece) {
                piece.classList.add('promoting');
                // Remove class after animation
                setTimeout(() => {
                    piece.classList.remove('promoting');
                }, 1500);
            }
        }
        
        // Show comic message
        this.showMessage('¡CORONACIÓN! 👑 ¡Ahora eres una DAMA!', 'success');
    }

    // Function to añadir efecto cómico de movimiento
    addMoveEffect(row, col) {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (cell) {
            const piece = cell.querySelector('.piece');
            if (piece) {
                piece.classList.add('moving');
                // Remove class after animation
                setTimeout(() => {
                    piece.classList.remove('moving');
                }, 500);
            }
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new DamasGame();
    window.game.renderBoard();
    window.game.setupChatEventListeners(); // Ensure chat event listeners are added after DOM
});
