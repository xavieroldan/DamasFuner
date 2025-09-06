class DamasGame {
    constructor() {
        this.board = [];
        this.currentPlayer = 1; // 1 = white, 2 = black
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.gameState = 'waiting'; // waiting, playing, finished
        this.capturedPieces = { black: 0, white: 0 };
        this.playerId = null; // Database player ID
        this.myPlayerNumber = null; // My player number (1 or 2)
        this.gameId = null;
        this.playerName = null; // Current player name
        this.playerNames = { 1: null, 2: null }; // Store both player names
        this.gameEndNotified = false; // Flag to prevent multiple end game notifications
        this.motivationalMessageShown = false; // Flag to prevent showing motivational message multiple times per turn
        
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

        // Determinar si necesitamos rotar el tablero
        const shouldRotate = this.myPlayerNumber === 2;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                // Aplicar rotación si es necesario
                if (shouldRotate) {
                    cell.dataset.row = 7 - row;
                    cell.dataset.col = 7 - col;
                } else {
                    cell.dataset.row = row;
                    cell.dataset.col = col;
                }
                
                // Alternar colores de las casillas
                if ((row + col) % 2 === 0) {
                    cell.classList.add('light');
                } else {
                    cell.classList.add('dark');
                }

                // Obtener coordenadas reales del tablero
                const realRow = shouldRotate ? 7 - row : row;
                const realCol = shouldRotate ? 7 - col : col;
                
                // Agregar pieza si existe
                if (this.board[realRow][realCol]) {
                    const piece = document.createElement('div');
                    piece.className = 'piece';
                    piece.dataset.row = realRow;
                    piece.dataset.col = realCol;
                    
                    if (this.board[realRow][realCol].player === 1) {
                        piece.classList.add('white');
                    } else {
                        piece.classList.add('black');
                    }
                    
                    if (this.board[realRow][realCol].isKing) {
                        piece.classList.add('king');
                        piece.textContent = '♔';
                    }
                    
                    cell.appendChild(piece);
                }

                // Marcar movimientos posibles
                if (this.possibleMoves.some(move => move.row === realRow && move.col === realCol)) {
                    cell.classList.add('possible-move');
                }

                // Marcar pieza seleccionada
                if (this.selectedPiece && this.selectedPiece.row === realRow && this.selectedPiece.col === realCol) {
                    cell.classList.add('selected');
                }

                // Mapear coordenadas para el click
                const clickRow = shouldRotate ? 7 - row : row;
                const clickCol = shouldRotate ? 7 - col : col;
                cell.addEventListener('click', () => this.handleCellClick(clickRow, clickCol));
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
        
        // CRÍTICO: Si no es mi turno, no permitir ninguna interacción
        if (this.currentPlayer !== this.myPlayerNumber) {
            // No mostrar mensaje aquí, el overlay ya indica que no es tu turno
            return; 
        }
        
        const piece = this.board[row][col];
        
        // Si hay una pieza seleccionada, intentar mover
        if (this.selectedPiece) {
            // Si haces clic en otra pieza del mismo color, reiniciar turno
            if (piece && piece.player === this.myPlayerNumber) {
                console.log('=== REINICIANDO TURNO ===');
                console.log('Deseleccionando pieza anterior:', this.selectedPiece);
                this.selectedPiece = null;
                this.possibleMoves = [];
                this.renderBoard();
                // Reiniciar el proceso de selección desde cero
                console.log('=== INICIANDO NUEVA SELECCIÓN ===');
                console.log(`Nueva pieza en (${row}, ${col}):`, piece);
                
                            // Verificar si hay capturas obligatorias antes de seleccionar
            const mandatoryCaptures = this.applyCaptureRules(this.myPlayerNumber);
            console.log(`=== VERIFICACIÓN DE CAPTURAS OBLIGATORIAS ===`);
            console.log(`Mandatory captures:`, mandatoryCaptures);
            console.log(`Length:`, mandatoryCaptures ? mandatoryCaptures.length : 'null');
            
            if (mandatoryCaptures && mandatoryCaptures.length > 0) {
                // Verificar si la pieza seleccionada puede hacer una captura obligatoria
                const canThisPieceCapture = mandatoryCaptures.some(capture => 
                    capture.piece.row === row && capture.piece.col === col
                );
                
                console.log(`Verificando pieza en (${row}, ${col})`);
                console.log(`Puede esta pieza capturar: ${canThisPieceCapture}`);
                console.log(`Capturas obligatorias:`, mandatoryCaptures);
                
                if (!canThisPieceCapture) {
                    // Verificar si hay damas disponibles
                    const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isKing);
                    
                    console.log(`Dama captures:`, damaCaptures);
                    
                    if (damaCaptures.length > 0) {
                        this.showMessage('Debes capturar con la dama', 'error');
                    } else {
                        this.showMessage('Estás obligado a capturar', 'error');
                    }
                    return;
                }
            }
                // Seleccionar la nueva pieza
                this.selectPiece(row, col);
                return;
            } else {
                // Obtener la pieza seleccionada del tablero
                const selectedPieceData = this.board[this.selectedPiece.row][this.selectedPiece.col];
                
                console.log(`=== MOVEMENT VALIDATION ===`);
                console.log(`Selected piece data:`, selectedPieceData);
                console.log(`Selected piece player:`, selectedPieceData ? selectedPieceData.player : 'null');
                console.log(`My player number:`, this.myPlayerNumber);
                console.log(`Is my piece?`, selectedPieceData && selectedPieceData.player === this.myPlayerNumber);
                
                // Verificar que la pieza seleccionada es del jugador actual
                if (selectedPieceData && selectedPieceData.player !== this.myPlayerNumber) {
                    console.log('❌ Cannot move opponent piece');
                    this.showMessage('No puedes mover las piezas del oponente', 'error');
                    this.selectedPiece = null;
                    this.possibleMoves = [];
                    this.renderBoard();
                    return;
                }
                
                if (this.isValidMove(this.selectedPiece, { row, col })) {
                    const fromPiece = { ...this.selectedPiece }; // Save position before moving
                    
                    console.log(`=== MOVEMENT APPROVED ===`);
                    console.log(`From piece:`, fromPiece);
                    console.log(`To position: (${row}, ${col})`);
                    console.log(`Selected piece data:`, selectedPieceData);
                    
                    // Aplicar movimiento localmente PRIMERO
                    const capturedPieces = this.makeMove(fromPiece, { row, col });
                    
                    // Enviar movimiento al servidor
                    if (window.network) {
                        console.log(`=== SENDING MOVE TO SERVER ===`);
                        console.log(`Sending move from (${fromPiece.row}, ${fromPiece.col}) to (${row}, ${col})`);
                        console.log(`Captured pieces to send:`, capturedPieces);
                        this.motivationalMessageShown = false; // Reset flag when making a move
                        window.network.sendMove(fromPiece, { row, col }, capturedPieces);
                    }
                    this.selectedPiece = null;
                    this.possibleMoves = [];
                    this.renderBoard();
                } else {
                    // Show invalid move message
                    this.showInvalidMoveMessage(row, col);
                    // No seleccionar nueva pieza después de mostrar mensaje de movimiento inválido
                    return;
                }
            }
        }
        
        // Si no hay pieza seleccionada o se está cambiando de pieza
        if (piece && piece.player === this.myPlayerNumber) {
            // Solo permitir seleccionar si es mi turno
            if (this.currentPlayer !== this.myPlayerNumber) {
                return; // No hacer nada si no es mi turno
            }
            
            // Si es la misma pieza seleccionada, deseleccionarla
            if (this.selectedPiece && this.selectedPiece.row === row && this.selectedPiece.col === col) {
                console.log('Deseleccionando pieza actual:', this.selectedPiece);
                this.selectedPiece = null;
                this.possibleMoves = [];
                this.renderBoard();
                return;
            }
            
            // Verificar si hay capturas obligatorias antes de seleccionar
            const mandatoryCaptures = this.applyCaptureRules(this.myPlayerNumber);
            if (mandatoryCaptures && mandatoryCaptures.length > 0) {
                // Verificar si la pieza seleccionada puede hacer una captura obligatoria
                const canThisPieceCapture = mandatoryCaptures.some(capture => 
                    capture.piece.row === row && capture.piece.col === col
                );
                
                console.log(`Verificando pieza en (${row}, ${col})`);
                console.log(`Puede esta pieza capturar: ${canThisPieceCapture}`);
                console.log(`Capturas obligatorias:`, mandatoryCaptures);
                
                if (!canThisPieceCapture) {
                    // Verificar si hay damas disponibles
                    const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isKing);
                    
                    if (damaCaptures.length > 0) {
                        this.showMessage('Debes capturar con la dama', 'error');
                    } else {
                        this.showMessage('Estás obligado a capturar', 'error');
                    }
                    return;
                }
            }
            // Seleccionar pieza del jugador actual
            this.selectPiece(row, col);
        } else if (piece && piece.player !== this.myPlayerNumber) {
            // Intentar seleccionar pieza del oponente
            this.showMessage('No puedes mover las piezas del oponente', 'error');
        } else {
            // Click on empty cell without selected piece
            // Solo mostrar mensajes si es mi turno
            if (this.currentPlayer === this.myPlayerNumber) {
                const mandatoryCaptures = this.applyCaptureRules(this.myPlayerNumber);
                if (mandatoryCaptures && mandatoryCaptures.length > 0) {
                    // Verificar si hay damas disponibles
                    const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isKing);
                    
                    if (damaCaptures.length > 0) {
                        this.showMessage('Debes capturar con la dama', 'error');
                    } else {
                        this.showMessage('Estás obligado a capturar', 'error');
                    }
                } else {
                    this.showMessage('Selecciona una pieza primero', 'info');
                }
            }
            // Si no es mi turno, no mostrar ningún mensaje
        }
    }

    selectPiece(row, col) {
        console.log(`=== SELECTING PIECE DEBUG ===`);
        console.log(`Selected piece at (${row}, ${col}):`, this.board[row][col]);
        console.log(`Current player: ${this.currentPlayer}`);
        console.log(`My player number: ${this.myPlayerNumber}`);
        
        const piece = this.board[row][col];
        if (!piece) {
            console.log('No piece at this position, cannot select');
            console.log(`=== END SELECTING PIECE DEBUG ===`);
            return;
        }
        
        console.log(`Piece player: ${piece.player}`);
        
        // Verificar que la pieza es del jugador actual
        if (piece.player !== this.myPlayerNumber) {
            console.log('Cannot select opponent piece');
            this.showMessage('No puedes seleccionar las piezas del oponente', 'error');
            console.log(`=== END SELECTING PIECE DEBUG ===`);
            return;
        }
        
        // Verificar si hay capturas obligatorias
        const mandatoryCaptures = this.applyCaptureRules(this.myPlayerNumber);
        if (mandatoryCaptures && mandatoryCaptures.length > 0) {
            console.log('Capturas obligatorias detectadas:', mandatoryCaptures);
            // Verificar si la pieza seleccionada puede hacer una captura obligatoria
            const canThisPieceCapture = mandatoryCaptures.some(capture => 
                capture.piece.row === row && capture.piece.col === col
            );
            
            if (!canThisPieceCapture) {
                console.log('No se puede seleccionar esta pieza, hay captura obligatoria con otra');
                // Verificar si hay damas disponibles
                const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isKing);
                if (damaCaptures.length > 0) {
                    this.showMessage('Debes capturar con la dama', 'error');
                } else {
                    this.showMessage('Estás obligado a capturar', 'error');
                }
                console.log(`=== END SELECTING PIECE DEBUG ===`);
                return;
            }
        }
        
        this.selectedPiece = { row, col };
        this.possibleMoves = this.getPossibleMoves(row, col);
        
        console.log(`Possible moves:`, this.possibleMoves);
        console.log(`=== END SELECTING PIECE DEBUG ===`);
        
        this.renderBoard();
    }

    getPossibleMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        console.log(`=== GET POSSIBLE MOVES DEBUG ===`);
        console.log(`Piece at (${row}, ${col}):`, piece);
        console.log(`Piece player: ${piece.player}`);
        console.log(`Current player: ${this.currentPlayer}`);
        console.log(`My player number: ${this.myPlayerNumber}`);

        // Verificar si hay capturas obligatorias para el jugador de esta pieza
        const mandatoryCaptures = this.applyCaptureRules(piece.player);
        
        if (mandatoryCaptures && mandatoryCaptures.length > 0) {
            console.log('Capturas obligatorias detectadas:', mandatoryCaptures);
            // Buscar si esta pieza específica puede hacer una captura obligatoria
            const thisPieceCaptures = mandatoryCaptures.filter(capture => 
                capture.piece.row === row && capture.piece.col === col
            );
            
            if (thisPieceCaptures.length > 0) {
                // Si esta pieza puede capturar, usar la función getPossibleCaptures
                const captures = this.getPossibleCaptures(row, col);
                
                if (captures.length > 0) {
                    console.log('Capturas encontradas para esta pieza:', captures);
                    return captures;
                }
            } else {
                console.log('No se puede mover esta pieza, hay captura obligatoria con otra');
                return []; // No se puede mover esta pieza si hay captura obligatoria con otra
            }
        }

        // Si no hay captura obligatoria, mostrar movimientos normales
        const moves = [];
        const directions = piece.isKing ? 
            [[-1, -1], [-1, 1], [1, -1], [1, 1]] : 
            (piece.player === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
        
        console.log(`=== NORMAL MOVEMENTS DEBUG ===`);
        console.log(`Piece player: ${piece.player}, isKing: ${piece.isKing}`);
        console.log(`Directions for this piece:`, directions);

        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;

            console.log(`Checking direction [${dr}, ${dc}] -> (${newRow}, ${newCol})`);
            console.log(`Is valid position: ${this.isValidPosition(newRow, newCol)}`);
            console.log(`Is empty: ${!this.board[newRow][newCol]}`);

            // Movimiento simple
            if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                moves.push({ row: newRow, col: newCol, type: 'move' });
                console.log(`Added move to (${newRow}, ${newCol})`);
            }
        }

        console.log(`Movimientos posibles para pieza en (${row}, ${col}):`, moves);
        return moves;
    }

    isValidMove(from, to) {
        // Verificar si el movimiento está en los movimientos posibles
        const isValid = this.possibleMoves.some(move => move.row === to.row && move.col === to.col);
        
        console.log(`=== VALIDATE MOVE DEBUG ===`);
        console.log(`From: (${from.row}, ${from.col}) to: (${to.row}, ${to.col})`);
        console.log(`Possible moves:`, this.possibleMoves);
        console.log(`Is valid: ${isValid}`);
        console.log(`=== END VALIDATE MOVE DEBUG ===`);
        
        return isValid;
    }

    // Function to check if a move is a valid multiple capture
    isMultipleCaptureMove(from, to) {
        const piece = this.board[from.row][from.col];
        if (!piece) return false;

        // Check if it's a diagonal move with at least 2 squares difference
        const rowDiff = Math.abs(to.row - from.row);
        const colDiff = Math.abs(to.col - from.col);
        
        if (rowDiff !== colDiff || rowDiff < 2) {
            return false;
        }

        // Check if there are enemy pieces in the path
        const rowDirection = to.row > from.row ? 1 : -1;
        const colDirection = to.col > from.col ? 1 : -1;
        
        let enemyCount = 0;
        for (let i = 1; i < rowDiff; i++) {
            const checkRow = from.row + (i * rowDirection);
            const checkCol = from.col + (i * colDirection);
            
            if (this.isValidPosition(checkRow, checkCol) && 
                this.board[checkRow][checkCol] && 
                this.board[checkRow][checkCol].player !== piece.player) {
                enemyCount++;
            }
        }

        return enemyCount > 0;
    }

    // Function to obtener todas las capturas posibles de un jugador
    getAllPossibleCaptures(player) {
        const captures = [];
        const pieces = this.getPlayerPieces(player);
        
        console.log(`=== GET ALL POSSIBLE CAPTURES DEBUG ===`);
        console.log(`Jugador: ${player}`);
        console.log(`Piezas del jugador:`, pieces);
        
        for (const piece of pieces) {
            const pieceCaptures = this.getPossibleCaptures(piece.row, piece.col);
            console.log(`Pieza en (${piece.row}, ${piece.col}):`, piece.piece, 'Capturas:', pieceCaptures);
            if (pieceCaptures.length > 0) {
                captures.push({
                    piece: piece,
                    captures: pieceCaptures
                });
            }
        }
        
        console.log(`Total capturas encontradas:`, captures);
        console.log(`=== END GET ALL POSSIBLE CAPTURES DEBUG ===`);
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

    // Function to obtener movimientos normales de una pieza específica
    getNormalMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        const directions = piece.isKing ? 
            [[-1, -1], [-1, 1], [1, -1], [1, 1]] : 
            (piece.player === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                moves.push({ row: newRow, col: newCol, type: 'normal' });
            }
        }
        
        return moves;
    }

    // Function to obtener capturas posibles de una pieza específica (incluyendo múltiples)
    getPossibleCaptures(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        // Encontrar todas las secuencias de capturas posibles
        const captureSequences = this.findCaptureSequences(row, col, piece, []);
        
        // Si hay secuencias de captura, devolver todas las de la longitud máxima
        if (captureSequences.length > 0) {
            // Encontrar la longitud máxima
            let maxLength = 0;
            for (const sequence of captureSequences) {
                if (sequence.length > maxLength) {
                    maxLength = sequence.length;
                }
            }
            
            // Filtrar solo las secuencias de longitud máxima
            const bestSequences = captureSequences.filter(sequence => sequence.length === maxLength);
            
            // Convertir todas las secuencias al formato esperado por makeMove
            const moves = [];
            for (const sequence of bestSequences) {
                if (sequence.length > 0) {
                    const finalPosition = sequence[sequence.length - 1];
                    moves.push({
                        row: finalPosition.row,
                        col: finalPosition.col,
                        type: 'multiple_capture',
                        captured: sequence.map(capture => ({
                            row: capture.capturedRow,
                            col: capture.capturedCol
                        }))
                    });
                }
            }
            
            return moves;
        }

        return [];
    }

    // Function to encontrar todas las secuencias de capturas posibles
    findCaptureSequences(row, col, piece, capturedPieces) {
        const sequences = [];
        const directions = piece.isKing ? 
            [[-1, -1], [-1, 1], [1, -1], [1, 1]] : 
            (piece.player === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);

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
                    // Crear una copia del tablero para simular la captura
                    const simulatedBoard = this.simulateCapture(row, col, newRow, newCol, jumpRow, jumpCol);
                    
                    // Crear la captura actual
                    const currentCapture = { 
                        row: jumpRow, 
                        col: jumpCol, 
                        capturedRow: newRow, 
                        capturedCol: newCol,
                        pieceType: piece.isKing ? 'dama' : 'peon'
                    };
                    
                    // Verificar si puede hacer más capturas desde la nueva posición
                    const moreCaptures = this.findCaptureSequences(jumpRow, jumpCol, piece, [...capturedPieces, currentCapture]);
                    
                    if (moreCaptures.length > 0) {
                        // Agregar todas las secuencias que continúan desde aquí
                        for (const sequence of moreCaptures) {
                            sequences.push([currentCapture, ...sequence]);
                        }
                    } else {
                        // Esta es una captura simple
                        sequences.push([currentCapture]);
                    }
                }
            }
        }

        return sequences;
    }

    // Function to simular una captura en el tablero
    simulateCapture(fromRow, fromCol, capturedRow, capturedCol, toRow, toCol) {
        const newBoard = this.board.map(row => row.map(cell => cell ? {...cell} : null));
        
        // Mover la pieza
        newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
        newBoard[fromRow][fromCol] = null;
        
        // Eliminar la pieza capturada
        newBoard[capturedRow][capturedCol] = null;
        
        return newBoard;
    }

    // Function to aplicar las reglas de captura obligatoria
    applyCaptureRules(player) {
        const allCaptures = this.getAllPossibleCaptures(player);
        console.log(`=== APPLY CAPTURE RULES DEBUG ===`);
        console.log(`Jugador: ${player}`);
        console.log(`Capturas encontradas:`, allCaptures);
        console.log(`Número de capturas: ${allCaptures.length}`);
        
        if (allCaptures.length === 0) {
            console.log('No hay capturas posibles, devolviendo null');
            return null; // No hay capturas posibles
        }
        
        // Regla 1: Priorizar capturas múltiples (más piezas capturadas)
        let maxCaptures = 0;
        for (const capture of allCaptures) {
            if (capture.captures.length > maxCaptures) {
                maxCaptures = capture.captures.length;
            }
        }
        
        const multipleCaptures = allCaptures.filter(capture => capture.captures.length === maxCaptures);
        console.log(`Capturas con máximo número de piezas (${maxCaptures}):`, multipleCaptures);
        
        // Regla 2: SIEMPRE priorizar damas sobre peones, independientemente del número de capturas
        const damaCaptures = multipleCaptures.filter(capture => 
            capture.piece.piece.isKing
        );
        const peonCaptures = multipleCaptures.filter(capture => 
            !capture.piece.piece.isKing
        );
        
        console.log(`Capturas con dama:`, damaCaptures);
        console.log(`Capturas con peón:`, peonCaptures);
        
        // Si hay capturas con dama, SIEMPRE usar solo damas (incluso si peones pueden capturar más)
        if (damaCaptures.length > 0) {
            console.log('Hay opciones de captura con dama, priorizando damas');
            console.log('Capturas disponibles para elegir:', damaCaptures);
            console.log(`=== END CAPTURE RULES DEBUG ===`);
            return damaCaptures; // Devolver solo capturas con dama
        }
        
        // Regla 3: Solo si NO hay damas disponibles, permitir elección entre peones
        console.log('No hay damas disponibles, permitir elección entre peones');
        console.log('Capturas disponibles para elegir:', peonCaptures);
        console.log(`=== END CAPTURE RULES DEBUG ===`);
        return peonCaptures; // Devolver capturas con peones
    }



    makeMove(from, to) {
        console.log(`=== MAKING MOVE DEBUG ===`);
        console.log(`Moving from (${from.row}, ${from.col}) to (${to.row}, ${to.col})`);
        
        const piece = this.board[from.row][from.col];
        const move = this.possibleMoves.find(m => m.row === to.row && m.col === to.col);
        
        console.log(`Piece to move:`, piece);
        console.log(`Move found:`, move);
        
        // Mover pieza
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = null;
        
        console.log(`Piece moved successfully`);
        console.log(`Board after move:`, this.board[to.row][to.col]);
        console.log(`Board from position:`, this.board[from.row][from.col]);
        
        // Capturar pieza(s) si es necesario
        let capturedPieces = [];
        if (move && move.captured && move.captured.length > 0) { // Check for the 'captured' array
            let totalCaptured = 0;
            
            // Since getPossibleCaptures always returns a 'multiple_capture' type move
            // with a 'captured' array, we can simplify this.
            // The 'move.type' should always be 'multiple_capture' here.
            console.log('Ejecutando captura(s):', move.captured);
            for (const captured of move.captured) {
                // Obtener el jugador de la pieza capturada ANTES de eliminarla
                const capturedPiece = this.board[captured.row][captured.col];
                const capturedPlayer = capturedPiece ? capturedPiece.player : null;
                
                // Add comic capture effect
                this.addCaptureEffect(captured.row, captured.col);
                this.board[captured.row][captured.col] = null;
                totalCaptured++;
                
                // Agregar a la lista de capturas para enviar al servidor
                capturedPieces.push({
                    row: captured.row,
                    col: captured.col,
                    player: capturedPlayer
                });
                
                // Asignar la captura al jugador que la realiza (no al que la recibe)
                // Si soy jugador 1 (blancas), sumo a mis capturas (blancas)
                // Si soy jugador 2 (negras), sumo a mis capturas (negras)
                const myPlayerColor = piece.player === 1 ? 'white' : 'black';
                this.capturedPieces[myPlayerColor] += 1;
            }
            
            console.log(`=== CAPTURE UPDATE ===`);
            console.log(`Total piezas capturadas: ${totalCaptured}`);
            console.log(`New captured count:`, this.capturedPieces);
            console.log(`All captured pieces:`, this.capturedPieces);
            this.updateCapturedPieces();
            
            // Mostrar mensaje de captura exitosa
            const message = totalCaptured === 1 ? 
                `¡${totalCaptured} pieza capturada!` : 
                `¡${totalCaptured} piezas capturadas!`;
            this.showMessage(message, 'success');
            
            // No need for the 'else' block for simple captures, as all captures are now
            // formatted as 'multiple_capture' with a 'captured' array.
            // The logic for `moreCaptures` (lines 769-784) is also removed as the full sequence
            // is expected in one move.
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
        
        // Devolver las capturas para enviar al servidor
        return capturedPieces;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    updateGameStatus() {
        const statusElement = document.getElementById('game-status');
        const playerElement = document.getElementById('current-player');
        const whitePlayerNameElement = document.getElementById('white-player-name');
        const blackPlayerNameElement = document.getElementById('black-player-name');
        
        console.log('updateGameStatus called - gameState:', this.gameState);
        console.log('updateGameStatus called - currentPlayer:', this.currentPlayer);
        console.log('updateGameStatus called - playerNames:', this.playerNames);
        
        // Update player names in the bottom section
        if (whitePlayerNameElement) {
            const whitePlayerName = this.playerNames[1] || 'Jugador 1';
            whitePlayerNameElement.innerHTML = `${whitePlayerName}`;
        }
        if (blackPlayerNameElement) {
            const blackPlayerName = this.playerNames[2] || 'Jugador 2';
            blackPlayerNameElement.innerHTML = `${blackPlayerName}`;
        }
        
        // Agregar clase 'active' al jugador que está jugando
        if (this.currentPlayer === 1) {
            whitePlayerNameElement?.classList.add('active');
            blackPlayerNameElement?.classList.remove('active');
        } else if (this.currentPlayer === 2) {
            blackPlayerNameElement?.classList.add('active');
            whitePlayerNameElement?.classList.remove('active');
        } else {
            // Si no hay jugador activo, quitar la clase active
            whitePlayerNameElement?.classList.remove('active');
            blackPlayerNameElement?.classList.remove('active');
        }
        
        if (this.gameState === 'playing') {
            // Show current player's name in the header (who should play now)
            const currentPlayerNumber = this.currentPlayer;
            const currentPlayerName = this.playerNames[currentPlayerNumber] || `Jugador ${currentPlayerNumber}`;
            const currentColorText = currentPlayerNumber === 1 ? '(Blancas)' : '(Negras)';
            const currentFullPlayerName = `${currentPlayerName} ${currentColorText}`;
            
            // Show my own name in the header
            const myPlayerName = this.playerNames[this.myPlayerNumber] || `Jugador ${this.myPlayerNumber}`;
            const myColorText = this.myPlayerNumber === 1 ? '(Blancas)' : '(Negras)';
            const myFullPlayerName = `${myPlayerName} ${myColorText}`;
            
            console.log('=== UPDATE GAME STATUS DEBUG ===');
            console.log('Current player (who should play):', currentFullPlayerName);
            console.log('My player name:', myFullPlayerName);
            console.log('Is it my turn?', this.currentPlayer === this.myPlayerNumber);
            console.log('this.currentPlayer:', this.currentPlayer);
            console.log('this.myPlayerNumber:', this.myPlayerNumber);
            console.log('this.playerNames:', this.playerNames);
            console.log('=== END UPDATE GAME STATUS DEBUG ===');
            
            if (playerElement) {
                playerElement.textContent = myFullPlayerName; // Show my own name
            }
            if (statusElement) {
                if (this.currentPlayer === this.myPlayerNumber) {
                    statusElement.textContent = `Tu turno`;
                    statusElement.className = 'my-turn';
                } else {
                    statusElement.textContent = `Turno de ${currentPlayerName}`;
                    statusElement.className = 'not-my-turn';
                }
            }
            
            // Update board overlay based on current player
            this.updateBoardOverlay();
        } else {
            if (statusElement) {
                statusElement.textContent = 'Esperando jugadores...';
                statusElement.className = 'waiting';
            }
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
        // this.currentPlayer is who should play now, this.myPlayerNumber is my player number (1 or 2)
        const isMyTurn = this.currentPlayer === this.myPlayerNumber;
        
        console.log(`Overlay update: currentPlayer=${this.currentPlayer}, myPlayerNumber=${this.myPlayerNumber}, isMyTurn=${isMyTurn}`);
        
        if (isMyTurn) {
            overlay.className = 'board-overlay active';
        } else {
            overlay.className = 'board-overlay inactive';
        }
    }

    updateCapturedPieces() {
        const blackCaptured = document.getElementById('black-captured');
        const whiteCaptured = document.getElementById('white-captured');
        
        blackCaptured.textContent = `Capturas: ${this.capturedPieces.black}`;
        whiteCaptured.textContent = `Capturas: ${this.capturedPieces.white}`;
        
        // Agregar atributo data-count para los estilos CSS
        blackCaptured.setAttribute('data-count', this.capturedPieces.black);
        whiteCaptured.setAttribute('data-count', this.capturedPieces.white);
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
                        (pieceObj.player === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]);
                    
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
        
        // Limpiar mensajes anteriores antes de mostrar el mensaje de victoria
        this.clearMessages();
        
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
        // Don't set playerNames here - it will be set by loadInitialGameState
        // Don't set myPlayerNumber here - it will be set by loadInitialGameState
        this.gameState = 'playing';
        this.gameEndNotified = false;
        this.motivationalMessageShown = false; // Reset flag for new game
        
        document.getElementById('new-game-btn').style.display = 'none';
        document.getElementById('join-game-btn').style.display = 'none';
        document.getElementById('leave-game-btn').style.display = 'inline-block';
        
        this.clearMessages(); // Limpiar mensajes al iniciar nueva partida
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
        console.log(`=== SHOWING MESSAGE ===`);
        console.log(`Message: ${message}`);
        console.log(`Type: ${type}`);
        
        // Usar el elemento HTML existente
        const messageElement = document.getElementById('game-message');
        if (!messageElement) {
            console.error('Game message element not found!');
            return;
        }

        // Configurar el mensaje
        messageElement.textContent = message;
        messageElement.className = `game-message ${type}`;
        
        // Forzar estilos inline para asegurar visibilidad
        messageElement.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            padding: 15px 25px !important;
            border-radius: 25px !important;
            font-weight: bold !important;
            font-size: 1.1em !important;
            z-index: 10000 !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
            max-width: 90% !important;
            text-align: center !important;
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            background: ${type === 'error' ? 'linear-gradient(135deg, #ff6b6b, #ee5a52)' : 
                        type === 'success' ? 'linear-gradient(135deg, #51cf66, #40c057)' : 
                        'linear-gradient(135deg, #74c0fc, #339af0)'} !important;
            color: white !important;
            border: 2px solid ${type === 'error' ? '#ff5252' : 
                              type === 'success' ? '#51cf66' : 
                              '#74c0fc'} !important;
        `;
        
        console.log(`Message element display: ${messageElement.style.display}`);
        console.log(`Message element text: ${messageElement.textContent}`);
        console.log(`Message element classes: ${messageElement.className}`);
        console.log(`=== END SHOWING MESSAGE ===`);

        // Hide message after 5 seconds (más tiempo para verlo)
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000);
    }

    // Function to mostrar mensaje específico de movimiento no válido
    showInvalidMoveMessage(row, col) {
        const mandatoryCaptures = this.applyCaptureRules(this.myPlayerNumber);
        
        if (mandatoryCaptures && mandatoryCaptures.length > 0) {
            // Verificar si la pieza seleccionada puede hacer capturas
            const selectedPieceCaptures = this.getPossibleCaptures(this.selectedPiece.row, this.selectedPiece.col);
            
            if (selectedPieceCaptures.length === 0) {
                this.showMessage('Esta pieza no puede capturar. Debes usar la pieza que puede capturar', 'error');
            } else {
                // Verificar si hay damas disponibles
                const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isKing);
                
                if (damaCaptures.length > 0) {
                    this.showMessage('Debes capturar con la dama', 'error');
                } else {
                    this.showMessage('Estás obligado a capturar', 'error');
                }
            }
        } else {
            // Verificar si es un movimiento normal válido
            const piece = this.board[this.selectedPiece.row][this.selectedPiece.col];
            if (piece) {
                const normalMoves = this.getNormalMoves(this.selectedPiece.row, this.selectedPiece.col);
                const isValidNormalMove = normalMoves.some(move => move.row === row && move.col === col);
                
                if (!isValidNormalMove) {
                    this.showMessage('Solo puedes mover a las casillas iluminadas en azul', 'error');
                } else {
                    this.showMessage('Movimiento no válido', 'error');
                }
            } else {
                this.showMessage('Movimiento no válido', 'error');
            }
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
        // No limpiar mensajes aquí, dejar que updateCurrentPlayer() maneje la lógica
    }

    updateCurrentPlayer(player) {
        this.currentPlayer = player;
        this.updateGameStatus();
        
        // Mostrar mensaje de espera si no es tu turno
        if (this.myPlayerNumber && this.currentPlayer !== this.myPlayerNumber) {
            this.showWaitingMessage();
        } else if (this.myPlayerNumber && this.currentPlayer === this.myPlayerNumber && !this.motivationalMessageShown) {
            this.showMotivationalMessage(); // Mostrar mensaje motivador solo si es tu turno y no se ha mostrado
            this.motivationalMessageShown = true; // Marcar que ya se mostró
        } else {
            this.clearMessages(); // Limpiar mensajes en otros casos
        }
    }

    // Function to clear all messages
    clearMessages() {
        const messageElement = document.getElementById('game-message');
        if (messageElement) {
            // No limpiar mensajes motivadores o de espera que deberían persistir
            const isMotivational = messageElement.className.includes('motivational');
            const isWaiting = messageElement.className.includes('waiting');
            const isError = messageElement.className.includes('error');
            
            if (!isMotivational && !isWaiting && !isError) {
                messageElement.style.display = 'none';
                messageElement.textContent = '';
                messageElement.className = 'game-message';
            }
        }
    }

    // Function to show motivational message when it's your turn
    showMotivationalMessage() {
        const messageElement = document.getElementById('game-message');
        if (!messageElement) {
            console.error('Game message element not found!');
            return;
        }

        // Array de frases motivadoras
        const motivationalPhrases = [
            "¡Vamos! 🚀",
            "¡No te duermas! 😴",
            "¡Es tu momento! ⚡",
            "¡A por todas! 🎯",
            "¡No dejes que se enfríe! 🔥",
            "¡Tu oponente está temblando! 😱",
            "¡Es hora de brillar! ✨",
            "¡No pienses, actúa! 🎭",
            "¡Tu turno, tu gloria! 👑",
            "¡La suerte está de tu lado! 🍀",
            "¡No hay tiempo que perder! ⏰",
            "¡Tu oponente está perdiendo paciencia! 😤",
            "¡Es tu turno de ser leyenda! 🏆",
            "¡No dejes que se enfríe el tablero! ❄️",
            "¡Tu momento de gloria! 🌟"
        ];

        // Seleccionar frase aleatoria
        const randomIndex = Math.floor(Math.random() * motivationalPhrases.length);
        const selectedPhrase = motivationalPhrases[randomIndex];
        
        // Configurar el mensaje motivador
        messageElement.textContent = selectedPhrase;
        messageElement.className = 'game-message motivational';
        
        // Aplicar estilos para el mensaje motivador
        messageElement.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            padding: 15px 25px !important;
            border-radius: 25px !important;
            font-weight: bold !important;
            font-size: 1.1em !important;
            z-index: 10000 !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
            max-width: 90% !important;
            text-align: center !important;
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            background: linear-gradient(135deg, #51cf66, #40c057) !important;
            color: white !important;
            border: 2px solid #51cf66 !important;
            animation: motivationalBounce 1.5s ease-in-out !important;
        `;
    }

    // Function to show waiting message when it's not your turn
    showWaitingMessage() {
        const messageElement = document.getElementById('game-message');
        if (!messageElement) {
            console.error('Game message element not found!');
            return;
        }

        // Obtener el nombre del oponente
        const opponentNumber = this.currentPlayer;
        const opponentName = this.playerNames[opponentNumber] || `Jugador ${opponentNumber}`;
        
        // Configurar el mensaje de espera
        messageElement.textContent = `⏳ Esperando a que ${opponentName} mueva...`;
        messageElement.className = 'game-message waiting';
        
        // Aplicar estilos para el mensaje de espera
        messageElement.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            padding: 15px 25px !important;
            border-radius: 25px !important;
            font-weight: bold !important;
            font-size: 1.1em !important;
            z-index: 10000 !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
            max-width: 90% !important;
            text-align: center !important;
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            background: linear-gradient(135deg, #ffd43b, #fab005) !important;
            color: #2d3436 !important;
            border: 2px solid #ffd43b !important;
            animation: waitingPulse 2s infinite !important;
        `;
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
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('game');
    const playerId = urlParams.get('player');
    const playerName = urlParams.get('name');
    
    if (gameId && playerId && playerName) {
        window.game = new DamasGame();
        window.network = new NetworkManager();
        window.game.renderBoard();
        window.game.setupChatEventListeners(); // Ensure chat event listeners are added after DOM
        
        // Initialize game with URL parameters
        console.log('=== GAME INITIALIZATION ===');
        console.log('URL params - gameId:', gameId, 'playerId:', playerId, 'playerName:', playerName);
        console.log('Parsed - gameId:', parseInt(gameId), 'playerId:', parseInt(playerId), 'playerName:', decodeURIComponent(playerName));
        
        window.game.startGame(parseInt(playerId), parseInt(gameId), decodeURIComponent(playerName));
        
        console.log('=== SETTING NETWORK VALUES ===');
        console.log('Before setting - window.network.gameId:', window.network.gameId);
        console.log('Before setting - window.network.playerId:', window.network.playerId);
        console.log('Setting gameId to:', parseInt(gameId));
        console.log('Setting playerId to:', parseInt(playerId));
        
        window.network.gameId = parseInt(gameId);
        window.network.playerId = parseInt(playerId);
        window.network.playerName = decodeURIComponent(playerName);
        
        console.log('After setting - window.network.gameId:', window.network.gameId);
        console.log('After setting - window.network.playerId:', window.network.playerId);
        console.log('Network manager set - gameId:', window.network.gameId, 'playerId:', window.network.playerId, 'playerName:', window.network.playerName);
        console.log('=== END GAME INITIALIZATION ===');
        
        // Load initial game state to get both player names
        window.network.loadInitialGameState();
        
        // Start polling for game updates
        window.network.startPolling();
    } else {
        // Redirect to home if no valid parameters
        window.location.href = 'home.html';
    }
});
