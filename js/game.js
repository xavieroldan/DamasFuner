class DamasGame {
    constructor() {
        console.log(`=== DAMASGAME CONSTRUCTOR - START ===`);
        
        this.board = [];
        this.currentPlayer = 1; // 1 = white, 2 = black
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.gameState = 'waiting'; // waiting, playing, finished
        
        // capturedPieces will be set by network.js from server data
        // Do not initialize locally - wait for server data
        this.capturedPieces = null;
        console.log(`capturedPieces initialized to null - will be set by server`);
        
        this.playerId = null; // Database player ID
        this.myPlayerNumber = null; // My player number (1 or 2)
        this.gameId = null;
        this.playerName = null; // Current player name
        this.playerNames = { 1: null, 2: null }; // Store both player names
        this.gameEndNotified = false; // Flag to prevent multiple end game notifications
        this.motivationalMessageShown = false; // Flag to prevent showing motivational message multiple times per turn
        this.multipleCaptureInProgress = false; // Flag to track if multiple captures are in progress
        this.capturedPiecesInSequence = []; // Store pieces captured during current sequence
        this.debugMode = false; // Debug mode for testing
        this.debugEditMode = true; // Debug edit mode (true = edit board, false = play game)
        this.debugPieceType = 'pawn'; // Current piece type to place in debug mode
        this.debugPlayer = 1; // Current player for debug mode
        
        console.log(`=== DAMASGAME CONSTRUCTOR - END ===`);
        
        this.initializeBoard();
        this.setupEventListeners();
    }

    initializeBoard() {
        // Create 8x8 board
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        
        // Place black pieces (player 1)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { player: 1, isQueen: false };
                }
            }
        }
        
        // Place white pieces (player 2)
        for (let row = 5; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    this.board[row][col] = { player: 2, isQueen: false };
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
                
                // Apply rotation if necessary
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
                    
                    if (this.board[realRow][realCol].isQueen) {
                        piece.classList.add('queen');
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
        // Debug mode handling
        if (this.debugMode) {
            this.handleDebugClick(row, col);
            return;
        }
        
        this.handleNormalCellClick(row, col);
    }

    handleNormalCellClick(row, col) {
        // No limpiar mensaje motivacional al hacer clic - debe ser persistente
        
        if (this.gameState !== 'playing') {
            if (this.gameState === 'finished') {
                this.showMessage('La partida ha terminado', 'info');
            }
            return;
        }
        
        // CRITICAL: If it's not my turn, don't allow any interaction
        if (this.currentPlayer !== this.myPlayerNumber) {
            // Don't show message here, the overlay already indicates it's not your turn
            return; 
        }
        
        const piece = this.board[row][col];
        
        // Si hay una pieza seleccionada, intentar mover
        if (this.selectedPiece) {
            // If clicking on another piece of the same color, check if there are multiple captures in progress
            if (piece && piece.player === this.myPlayerNumber) {
                // Check if there are multiple captures in progress
                if (this.multipleCaptureInProgress) {
                    console.log('=== CAPTURAS MÚLTIPLES EN PROGRESO ===');
                    console.log('Hay capturas múltiples en progreso, no permitir cambio de pieza');
                    this.showMessage('🚫 Debes continuar con la misma pieza para completar las capturas', 'error');
                    return;
                }
                
                console.log('=== REINICIANDO TURNO ===');
                console.log('Deseleccionando pieza anterior:', this.selectedPiece);
                this.selectedPiece = null;
                this.possibleMoves = [];
                this.renderBoard();
                // Restart selection process from scratch
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
                    const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isQueen);
                    
                    console.log(`Dama captures:`, damaCaptures);
                    
                    if (damaCaptures.length > 0) {
                        this.showMessage('🚫 Debes capturar con la dama', 'error');
                    } else {
                        this.showMessage('🚫 Estás obligado a capturar', 'error');
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
                    this.showMessage('🚫 No puedes mover las piezas del oponente', 'error');
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
                    
                    // Aplicar movimiento localmente - makeMove se encarga de enviar al servidor cuando corresponda
                    const capturedPieces = this.makeMove(fromPiece, { row, col });
                    
                    // Reset flag when making a move
                    this.motivationalMessageShown = false;
                    
                    // Only clear possibleMoves if there are no multiple captures in progress
                    if (!this.multipleCaptureInProgress) {
                    this.possibleMoves = [];
                    }
                    
                    this.renderBoard();
                } else {
                    // Show invalid move message
                    this.showInvalidMoveMessage(row, col);
                    // Don't select new piece after showing invalid move message
                    return;
                }
            }
        }
        
        // If no piece is selected or changing piece
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
            
            // Check for mandatory captures before selecting (only if no multiple captures in progress)
            if (!this.multipleCaptureInProgress) {
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
                        const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isQueen);
                    
                    if (damaCaptures.length > 0) {
                            this.showMessage('🚫 Debes capturar con la dama', 'error');
                    } else {
                            this.showMessage('🚫 Estás obligado a capturar', 'error');
                    }
                    return;
                    }
                }
            }
            // Seleccionar pieza del jugador actual
            this.selectPiece(row, col);
        } else if (piece && piece.player !== this.myPlayerNumber) {
            // Intentar seleccionar pieza del oponente
            this.showMessage('🚫 No puedes mover las piezas del oponente', 'error');
        } else {
            // Click on empty cell without selected piece
            // Only show messages if it's my turn and no multiple captures in progress
            if (this.currentPlayer === this.myPlayerNumber && !this.multipleCaptureInProgress) {
                const mandatoryCaptures = this.applyCaptureRules(this.myPlayerNumber);
                if (mandatoryCaptures && mandatoryCaptures.length > 0) {
                    // Verificar si hay damas disponibles
                    const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isQueen);
                    
                    if (damaCaptures.length > 0) {
                        this.showMessage('🚫 Debes capturar con la dama', 'error');
                    } else {
                        this.showMessage('🚫 Estás obligado a capturar', 'error');
                    }
                } else {
                    this.showMessage('Selecciona una pieza primero', 'info');
                }
            }
            // If it's not my turn or there are multiple captures in progress, don't show any message
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
            this.showMessage('🚫 No puedes seleccionar las piezas del oponente', 'error');
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
                const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isQueen);
                if (damaCaptures.length > 0) {
                    this.showMessage('🚫 Debes capturar con la dama', 'error');
                } else {
                    this.showMessage('🚫 Estás obligado a capturar', 'error');
                }
                console.log(`=== END SELECTING PIECE DEBUG ===`);
                return;
            }
        }
        
        this.selectedPiece = { row, col };
        this.possibleMoves = this.getPossibleMovesDebug(row, col);
        
        console.log(`Possible moves:`, this.possibleMoves);
        console.log(`=== END SELECTING PIECE DEBUG ===`);
        
        this.renderBoard();
    }

    getPossibleMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        console.log(`=== GET POSSIBLE MOVES (NORMAL MODE) ===`);
        console.log(`Piece at (${row}, ${col}):`, piece);
        console.log(`Piece player: ${piece.player}`);
        console.log(`Current player: ${this.currentPlayer}`);
        console.log(`My player number: ${this.myPlayerNumber}`);

        // Use the same logic as getPossibleMovesDebug: always check captures first
                const captures = this.getPossibleCaptures(row, col);
                
                if (captures.length > 0) {
            console.log(`Found ${captures.length} captures, using capture moves`);
            console.log(`=== END GET POSSIBLE MOVES ===`);
                    return captures;
        }
        
        // Si no hay capturas, mostrar movimientos normales
        console.log(`=== NORMAL MOVEMENTS ===`);
        const normalMoves = this.getNormalMoves(row, col);
        console.log(`Normal moves found:`, normalMoves);
        console.log(`=== END GET POSSIBLE MOVES ===`);
        return normalMoves;
    }

    isValidMove(from, to) {
        // Check if the move is in the possible moves
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

    // Function to get normal moves for a specific piece
    getNormalMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        const moves = [];
        
        if (piece.isQueen) {
            // For queens: search all empty squares diagonally
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            
            console.log(`=== GET NORMAL MOVES FOR QUEEN AT (${row}, ${col}) ===`);
            
            for (const [dRow, dCol] of directions) {
                let currentRow = row + dRow;
                let currentCol = col + dCol;
                
                console.log(`Checking direction: (${dRow}, ${dCol})`);
                
                // Search for empty squares in this diagonal direction
                while (this.isValidPosition(currentRow, currentCol)) {
                    console.log(`Checking position: (${currentRow}, ${currentCol})`);
                    if (!this.board[currentRow][currentCol]) {
                        // Empty cell, it's a valid move
                        console.log(`Empty cell found at (${currentRow}, ${currentCol}) - adding to moves`);
                        moves.push({ row: currentRow, col: currentCol, type: 'normal' });
                    } else {
                        // There's a piece, we can't continue in this direction
                        console.log(`Piece found at (${currentRow}, ${currentCol}) - stopping in this direction`);
                        break;
                    }
                    currentRow += dRow;
                    currentCol += dCol;
                }
            }
            
            console.log(`Total normal moves found: ${moves.length}`);
            console.log(`Moves:`, moves);
            console.log(`=== END GET NORMAL MOVES ===`);
        } else {
            // Para peones: solo movimientos de una casilla
            const directions = piece.player === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                moves.push({ row: newRow, col: newCol, type: 'normal' });
                }
            }
        }
        
        return moves;
    }

    // Function to get possible captures for a specific piece (WITH MULTIPLE CAPTURE PRIORITIZATION)
    getPossibleCaptures(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        console.log(`=== GET POSSIBLE CAPTURES DEBUG (WITH MULTIPLE CAPTURE PRIORITY) ===`);
        console.log(`Getting captures for piece at (${row}, ${col}):`, piece);

        if (piece.isQueen) {
            // For queens: analyze each initial capture and see how many additional captures it allows
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            const captureOptions = [];
            
            for (const [dr, dc] of directions) {
                let currentRow = row + dr;
                let currentCol = col + dc;
                let foundEnemy = false;
                let enemyRow = -1;
                let enemyCol = -1;

                // Search for the first enemy piece in this direction
                while (this.isValidPosition(currentRow, currentCol)) {
                    if (this.board[currentRow][currentCol]) {
                        if (this.board[currentRow][currentCol].player !== piece.player) {
                            foundEnemy = true;
                            enemyRow = currentRow;
                            enemyCol = currentCol;
                            break;
                        } else {
                            break; // Pieza propia, no podemos saltar
                        }
                    }
                    currentRow += dr;
                    currentCol += dc;
                }

                // Si encontramos enemigo, analizar todas las posiciones de aterrizaje
                if (foundEnemy) {
                    let landingRow = enemyRow + dr;
                    let landingCol = enemyCol + dc;
                    
                    while (this.isValidPosition(landingRow, landingCol) && !this.board[landingRow][landingCol]) {
                        // Simulate the capture and see how many additional captures it allows
                        const additionalCaptures = this.countAdditionalCaptures(landingRow, landingCol, piece);
                        
                        captureOptions.push({
                            row: landingRow,
                            col: landingCol,
                            type: 'single_capture',
                            captured: [{
                                row: enemyRow,
                                col: enemyCol
                            }],
                            additionalCaptures: additionalCaptures,
                            totalCaptures: 1 + additionalCaptures
                        });
                        
                        console.log(`Capture option: (${landingRow}, ${landingCol}) after enemy at (${enemyRow}, ${enemyCol}) - Additional captures: ${additionalCaptures}`);
                        
                        landingRow += dr;
                        landingCol += dc;
                    }
                }
            }
            
            // Sort by total number of captures (highest first)
            captureOptions.sort((a, b) => b.totalCaptures - a.totalCaptures);
            
            // Si hay opciones con diferentes números de capturas, solo devolver las de mayor número
            if (captureOptions.length > 0) {
                const maxCaptures = captureOptions[0].totalCaptures;
                const bestOptions = captureOptions.filter(option => option.totalCaptures === maxCaptures);
                
                console.log(`Best capture options with ${maxCaptures} total captures:`, bestOptions.length);
                console.log(`=== END GET POSSIBLE CAPTURES DEBUG ===`);
                return bestOptions;
            }
            
            console.log(`No capture options found`);
            console.log(`=== END GET POSSIBLE CAPTURES DEBUG ===`);
        return [];
        } else {
            // Para peones: analizar capturas y priorizar las que permiten más capturas totales
            const directions = piece.player === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
            const captureOptions = [];

            for (const [dr, dc] of directions) {
                const enemyRow = row + dr;
                const enemyCol = col + dc;
                const landingRow = enemyRow + dr;
                const landingCol = enemyCol + dc;

                if (this.isValidPosition(enemyRow, enemyCol) && 
                    this.board[enemyRow][enemyCol] && 
                    this.board[enemyRow][enemyCol].player !== piece.player &&
                    this.isValidPosition(landingRow, landingCol) && 
                    !this.board[landingRow][landingCol]) {
                    
                    // Simular la captura y ver cuántas capturas adicionales permite
                    const additionalCaptures = this.countAdditionalCaptures(landingRow, landingCol, piece);
                    
                    captureOptions.push({
                        row: landingRow,
                        col: landingCol,
                        type: 'single_capture',
                        captured: [{
                            row: enemyRow,
                            col: enemyCol
                        }],
                        additionalCaptures: additionalCaptures,
                        totalCaptures: 1 + additionalCaptures
                    });
                    
                    console.log(`Pawn capture option: (${landingRow}, ${landingCol}) after enemy at (${enemyRow}, ${enemyCol}) - Additional captures: ${additionalCaptures}`);
                }
            }
            
            // Sort by total number of captures (highest first)
            captureOptions.sort((a, b) => b.totalCaptures - a.totalCaptures);
            
            // Si hay opciones con diferentes números de capturas, solo devolver las de mayor número
            if (captureOptions.length > 0) {
                const maxCaptures = captureOptions[0].totalCaptures;
                const bestOptions = captureOptions.filter(option => option.totalCaptures === maxCaptures);
                
                console.log(`Best pawn capture options with ${maxCaptures} total captures:`, bestOptions.length);
                console.log(`=== END GET POSSIBLE CAPTURES DEBUG ===`);
                return bestOptions;
            }
            
            console.log(`No pawn capture options found`);
            console.log(`=== END GET POSSIBLE CAPTURES DEBUG ===`);
            return [];
        }
    }
    
    // Function to contar capturas adicionales desde una posición
    countAdditionalCaptures(row, col, piece) {
        let count = 0;
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        
        for (const [dr, dc] of directions) {
            let currentRow = row + dr;
            let currentCol = col + dc;
            let foundEnemy = false;
            let enemyRow = -1;
            let enemyCol = -1;

            // Buscar la primera pieza enemiga en esta dirección
            while (this.isValidPosition(currentRow, currentCol)) {
                if (this.board[currentRow][currentCol]) {
                    if (this.board[currentRow][currentCol].player !== piece.player) {
                        foundEnemy = true;
                        enemyRow = currentRow;
                        enemyCol = currentCol;
                        break;
                    } else {
                        break; // Pieza propia, no podemos saltar
                    }
                }
                currentRow += dr;
                currentCol += dc;
            }

            // Si encontramos enemigo, contar posiciones de aterrizaje
            if (foundEnemy) {
                let landingRow = enemyRow + dr;
                let landingCol = enemyCol + dc;
                
                while (this.isValidPosition(landingRow, landingCol) && !this.board[landingRow][landingCol]) {
                    count++;
                    landingRow += dr;
                    landingCol += dc;
                }
            }
        }
        
        return count;
    }
    
    // Function to contar capturas adicionales desde una posición usando un tablero simulado
    countAdditionalCapturesFromBoard(row, col, piece, board) {
        let count = 0;
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        
        for (const [dr, dc] of directions) {
            let currentRow = row + dr;
            let currentCol = col + dc;
            let foundEnemy = false;
            let enemyRow = -1;
            let enemyCol = -1;

            // Buscar la primera pieza enemiga en esta dirección
            while (this.isValidPosition(currentRow, currentCol)) {
                if (board[currentRow][currentCol]) {
                    if (board[currentRow][currentCol].player !== piece.player) {
                        foundEnemy = true;
                        enemyRow = currentRow;
                        enemyCol = currentCol;
                        break;
                    } else {
                        break; // Pieza propia, no podemos saltar
                    }
                }
                currentRow += dr;
                currentCol += dc;
            }

            // Si encontramos enemigo, contar posiciones de aterrizaje
            if (foundEnemy) {
                let landingRow = enemyRow + dr;
                let landingCol = enemyCol + dc;
                
                while (this.isValidPosition(landingRow, landingCol) && !board[landingRow][landingCol]) {
                    count++;
                    landingRow += dr;
                    landingCol += dc;
                }
            }
        }
        
        return count;
    }

    // Function to encontrar todas las secuencias de capturas posibles
    findCaptureSequences(row, col, piece, capturedPieces, visited = new Set()) {
        const sequences = [];
        const positionKey = `${row},${col}`;
        
        // Evitar procesar la misma posición múltiples veces
        if (visited.has(positionKey)) {
            return sequences;
        }
        
        visited.add(positionKey);
        
        if (piece.isQueen) {
            // Para damas: buscar capturas a distancia en diagonal
            const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
            
            for (const [dr, dc] of directions) {
                const queenCaptures = this.findQueenCapturesInDirection(row, col, piece, dr, dc, capturedPieces, visited);
                sequences.push(...queenCaptures);
            }
        } else {
            // Para peones: solo capturas individuales (sin secuencias múltiples)
            const directions = piece.player === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

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
                        // Crear la captura individual
                    const currentCapture = { 
                        row: jumpRow, 
                        col: jumpCol, 
                        capturedRow: newRow, 
                        capturedCol: newCol,
                            pieceType: 'peon'
                        };
                        
                        // Solo agregar capturas individuales para peones
                        sequences.push([currentCapture]);
                    }
                }
            }
        }

        return sequences;
    }

    // Function específica para capturas de dama en una dirección diagonal (SIMPLIFICADA)
    findQueenCapturesInDirection(row, col, piece, dr, dc, capturedPieces, visited = new Set()) {
        const sequences = [];
        let currentRow = row + dr;
        let currentCol = col + dc;
        let foundEnemy = false;
        let enemyRow = -1;
        let enemyCol = -1;

        console.log(`=== FINDING QUEEN CAPTURES IN DIRECTION (SIMPLIFIED) ===`);
        console.log(`From (${row}, ${col}) in direction (${dr}, ${dc})`);

        // Buscar la primera pieza enemiga en esta dirección diagonal
        while (this.isValidPosition(currentRow, currentCol)) {
            console.log(`Checking position (${currentRow}, ${currentCol})`);
            if (this.board[currentRow][currentCol]) {
                console.log(`Piece found at (${currentRow}, ${currentCol}):`, this.board[currentRow][currentCol]);
                if (this.board[currentRow][currentCol].player !== piece.player) {
                    // Encontramos una pieza enemiga
                    foundEnemy = true;
                    enemyRow = currentRow;
                    enemyCol = currentCol;
                    console.log(`Enemy piece found at (${enemyRow}, ${enemyCol})`);
                    break;
                    } else {
                    // Pieza propia, no podemos saltar por encima
                    console.log(`Own piece found, stopping in this direction`);
                    break;
                }
            } else {
                console.log(`Empty cell at (${currentRow}, ${currentCol})`);
            }
            currentRow += dr;
            currentCol += dc;
        }

        if (foundEnemy) {
            console.log(`Enemy found, looking for landing positions after (${enemyRow}, ${enemyCol})`);
            // Buscar todas las casillas vacías después de la pieza enemiga en la misma diagonal
            let landingRow = enemyRow + dr;
            let landingCol = enemyCol + dc;
            
            while (this.isValidPosition(landingRow, landingCol) && !this.board[landingRow][landingCol]) {
                console.log(`Checking landing position (${landingRow}, ${landingCol})`);
                
                // Crear la captura simple
                const currentCapture = { 
                    row: landingRow, 
                    col: landingCol, 
                    capturedRow: enemyRow, 
                    capturedCol: enemyCol,
                    pieceType: 'dama'
                };

                console.log(`Adding simple capture to (${landingRow}, ${landingCol})`);
                        sequences.push([currentCapture]);

                // Continuar buscando más casillas vacías en la misma dirección
                landingRow += dr;
                landingCol += dc;
            }
        } else {
            console.log(`No enemy found in direction (${dr}, ${dc})`);
        }
        
        console.log(`Sequences found in direction (${dr}, ${dc}):`, sequences.length);
        console.log(`=== END FINDING QUEEN CAPTURES IN DIRECTION ===`);

        return sequences;
    }

    // Function para buscar capturas de dama en todas las direcciones después de una captura
    findQueenCapturesFromAllDirections(row, col, piece, capturedPieces, visited = new Set()) {
        const sequences = [];
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        
        console.log(`=== FINDING QUEEN CAPTURES FROM ALL DIRECTIONS ===`);
        console.log(`From position (${row}, ${col})`);
        
        for (const [dr, dc] of directions) {
            console.log(`Checking direction (${dr}, ${dc})`);
            const queenCaptures = this.findQueenCapturesInDirection(row, col, piece, dr, dc, capturedPieces, visited);
            console.log(`Direction (${dr}, ${dc}) found ${queenCaptures.length} sequences`);
            sequences.push(...queenCaptures);
        }
        
        console.log(`Total sequences found from all directions: ${sequences.length}`);
        console.log(`=== END FINDING QUEEN CAPTURES FROM ALL DIRECTIONS ===`);

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
            capture.piece.piece.isQueen
        );
        const peonCaptures = multipleCaptures.filter(capture => 
            !capture.piece.piece.isQueen
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
                
                // SERVIDOR CALCULA CAPTURAS - CLIENTE SOLO MUESTRA MENSAJE
                // Las capturas se actualizarán desde la respuesta del servidor
                console.log(`=== CAPTURE DETECTED ===`);
                console.log(`piece.player:`, piece.player);
                console.log(`Total captured in this move: ${totalCaptured}`);
                
                // Mostrar mensaje de captura exitosa
                const message = totalCaptured === 1 ? 
                    `¡${totalCaptured} pieza capturada!` : 
                    `¡${totalCaptured} piezas capturadas!`;
                this.showMessage(message, 'success');
            }
            
            // No need for the 'else' block for simple captures, as all captures are now
            // formatted as 'multiple_capture' with a 'captured' array.
            // The logic for `moreCaptures` (lines 769-784) is also removed as the full sequence
            // is expected in one move.
        }
        
        // Promover a dama
        if ((piece.player === 1 && to.row === 0) || (piece.player === 2 && to.row === 7)) {
            piece.isQueen = true;
            console.log(`=== PAWN PROMOTED TO QUEEN ===`);
            console.log(`Piece at (${to.row}, ${to.col}) promoted to queen`);
            console.log(`=== END PAWN PROMOTION ===`);
            // Add comic promotion effect
            this.addPromotionEffect(to.row, to.col);
        }
        
        // LÓGICA SIMPLIFICADA DE CAPTURAS MÚLTIPLES
        if (move && move.captured && move.captured.length > 0) {
            console.log(`=== CAPTURE MADE - CHECKING FOR MORE CAPTURES ===`);
            console.log(`Piece at (${to.row}, ${to.col}) after capture`);
            
            // Verificar si hay más capturas disponibles desde la nueva posición
            const additionalCaptures = this.getPossibleCaptures(to.row, to.col);
            console.log(`Additional captures available:`, additionalCaptures.length);
            
            if (additionalCaptures.length > 0) {
                console.log(`More captures available - keeping turn and piece selected`);
                // Mantener el turno y la pieza seleccionada para continuar capturando
                this.selectedPiece = { row: to.row, col: to.col };
                this.possibleMoves = additionalCaptures;
                this.multipleCaptureInProgress = true;
                this.renderBoard();
                
                // Mostrar mensaje motivador
                this.showMotivationalMessage();
            } else {
                console.log(`No more captures available - changing turn`);
                // No hay más capturas, cambiar turno normalmente
                if (!this.debugMode) {
                    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                } else {
                    console.log(`🔧 Debug mode: turn change disabled - use debug controls`);
                }
        this.selectedPiece = null;
        this.possibleMoves = [];
                this.multipleCaptureInProgress = false;
                
                // Limpiar el tablero visualmente
                this.renderBoard();
                
                // Enviar al servidor si no estamos en modo debug
                if (!this.debugMode) {
                    this.sendMoveToServer(from, to, move.captured);
                } else {
                    console.log(`🔧 Debug mode: skipping server communication`);
                    // En modo debug, actualizar capturas localmente
                    this.updateCapturedPieces();
                    // Verificar ganador en modo debug
                    this.checkWinnerIfNeeded();
                }
            }
        } else {
            console.log(`No capture made - changing turn normally`);
            // No hubo captura, cambiar turno normalmente
            if (!this.debugMode) {
                this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
            } else {
                console.log(`🔧 Debug mode: turn change disabled - use debug controls`);
            }
            this.selectedPiece = null;
            this.possibleMoves = [];
            this.multipleCaptureInProgress = false;
            
            // Limpiar el tablero visualmente
            this.renderBoard();
            
            // Enviar al servidor si no estamos en modo debug
            if (!this.debugMode) {
                this.sendMoveToServer(from, to, []);
            } else {
                console.log(`🔧 Debug mode: skipping server communication`);
                // En modo debug, actualizar capturas localmente
                this.updateCapturedPieces();
                // Verificar ganador en modo debug
                this.checkWinnerIfNeeded();
            }
        }
        
        this.updateGameStatus();
        
        // Check winner only after a valid move
        this.checkWinnerIfNeeded();
        
        // Devolver las capturas para enviar al servidor
        return capturedPieces;
    }

    async sendMoveToServer(from, to, capturedPieces) {
        console.log(`=== SENDING MOVE TO SERVER ===`);
        console.log(`Sending move from (${from.row}, ${from.col}) to (${to.row}, ${to.col})`);
        console.log(`Captured pieces to send:`, capturedPieces);
        console.log(`Complete board state to send:`, this.board);
        
        if (window.network && window.network.sendMove) {
            try {
                // SERVIDOR CALCULA CAPTURAS - CLIENTE SOLO ENVÍA TABLERO
                // El servidor es la única fuente de verdad para el conteo de capturas
                console.log(`Server will calculate captures from board state`);
                
                // Enviar movimiento con el tablero completo - el servidor calculará las capturas
                await window.network.sendMove(from, to, capturedPieces, this.board);
                console.log(`Move sent to server successfully`);
            } catch (error) {
                console.error(`Error sending move to server:`, error);
                this.showMessage('Error al enviar movimiento al servidor', 'error');
            }
        } else {
            console.error(`Network manager not available`);
            this.showMessage('Error de conexión', 'error');
        }
    }
    

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    // Función eliminada - no necesitamos calcular desde el tablero

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
                    
                    // Mostrar mensaje motivacional si es tu turno y no se ha mostrado
                    if (!this.motivationalMessageShown) {
                        this.showMotivationalMessage();
                        this.motivationalMessageShown = true;
                    }
                } else {
                    statusElement.textContent = `Turno de ${currentPlayerName}`;
                    statusElement.className = 'not-my-turn';
                    statusElement.style.cssText = ''; // Limpiar estilos del mensaje motivacional
                    
                    // Limpiar mensaje motivacional cuando no es tu turno
                    this.clearMotivationalMessage();
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
        // En modo debug, siempre permitir jugar
        const isMyTurn = this.debugMode ? true : (this.currentPlayer === this.myPlayerNumber);
        
        console.log(`Overlay update: currentPlayer=${this.currentPlayer}, myPlayerNumber=${this.myPlayerNumber}, isMyTurn=${isMyTurn}, debugMode=${this.debugMode}`);
        
        if (isMyTurn) {
            overlay.className = 'board-overlay active';
        } else {
            overlay.className = 'board-overlay inactive';
        }
    }

    updateCapturedPieces() {
        console.log(`=== UPDATING CAPTURED PIECES - START ===`);
        console.log(`this.capturedPieces from server:`, this.capturedPieces);
        console.log(`Debug mode:`, this.debugMode);
        
        const blackCaptured = document.getElementById('black-captured');
        const whiteCaptured = document.getElementById('white-captured');
        
        if (!blackCaptured || !whiteCaptured) {
            console.error(`❌ DOM elements not found - blackCaptured:`, blackCaptured, `whiteCaptured:`, whiteCaptured);
            return;
        }
        
        let blackCount, whiteCount;
        
        if (this.debugMode) {
            // En modo debug, calcular capturas localmente
            console.log(`🔧 Debug mode: calculating captures locally`);
            const captures = this.calculateLocalCaptures();
            blackCount = captures.black;
            whiteCount = captures.white;
            console.log(`Debug calculated - black: ${blackCount}, white: ${whiteCount}`);
        } else {
            // En modo juego normal, usar solo datos del servidor
            // Ensure capturedPieces exists (should be set by network.js from server)
            if (!this.capturedPieces) {
                console.log(`❌ capturedPieces not set by server, using defaults`);
                this.capturedPieces = { black: 0, white: 0 };
            }
            
            // Get values directly from server data
            blackCount = this.capturedPieces.black || 0;
            whiteCount = this.capturedPieces.white || 0;
            console.log(`Server values - black: ${blackCount}, white: ${whiteCount}`);
        }
        
        // Update DOM with calculated values
        const blackText = `Capturas: ${blackCount}`;
        const whiteText = `Capturas: ${whiteCount}`;
        
        blackCaptured.textContent = blackText;
        whiteCaptured.textContent = whiteText;
        
        // Set data attributes for CSS styling
        blackCaptured.setAttribute('data-count', blackCount);
        whiteCaptured.setAttribute('data-count', whiteCount);
        
        console.log(`Updated DOM - black: "${blackText}", white: "${whiteText}"`);
        console.log(`=== UPDATING CAPTURED PIECES - END ===`);
    }

    // Calculate captures locally for debug mode
    calculateLocalCaptures() {
        let currentPlayer1Pieces = 0; // White pieces
        let currentPlayer2Pieces = 0; // Black pieces
        
        // Count pieces on current board
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col]) {
                    const piece = this.board[row][col];
                    if (piece.player === 1) {
                        currentPlayer1Pieces++;
                    } else if (piece.player === 2) {
                        currentPlayer2Pieces++;
                    }
                }
            }
        }
        
        // Initial pieces count (12 each)
        const initialPlayer1Pieces = 12; // White pieces
        const initialPlayer2Pieces = 12; // Black pieces
        
        // Calculate captures
        // Player 1 captures = missing Player 2 pieces
        const player1_captures = Math.max(0, initialPlayer2Pieces - currentPlayer2Pieces);
        // Player 2 captures = missing Player 1 pieces  
        const player2_captures = Math.max(0, initialPlayer1Pieces - currentPlayer1Pieces);
        
        console.log(`Debug local calculation - Player 1 pieces: ${currentPlayer1Pieces}, Player 2 pieces: ${currentPlayer2Pieces}`);
        console.log(`Debug local calculation - Player 1 captures: ${player1_captures}, Player 2 captures: ${player2_captures}`);
        
        return {
            black: player2_captures, // Player 2 (black) captures
            white: player1_captures  // Player 1 (white) captures
        };
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
                    const directions = pieceObj.isQueen ? 
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
        
        // Mostrar pantalla de fin de partida con opciones
        this.showGameEndScreen(winnerName, winnerNumber);
        
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

    // Mostrar pantalla de fin de partida con opciones
    showGameEndScreen(winnerName, winnerNumber) {
        // Crear el modal de fin de partida si no existe
        let endGameModal = document.getElementById('end-game-modal');
        if (!endGameModal) {
            endGameModal = this.createEndGameModal();
        }

        // Actualizar el contenido del modal
        const winnerText = document.getElementById('end-game-winner');
        const player1Name = this.playerNames[1] || 'Jugador 1';
        const player2Name = this.playerNames[2] || 'Jugador 2';
        
        // Determinar si el jugador actual es el ganador
        const isWinner = (this.myPlayerNumber === winnerNumber);
        const statusText = isWinner ? '¡Has ganado!' : 'Has perdido';
        const emoji = isWinner ? '🎉' : '😔';
        
        winnerText.innerHTML = `
            <h2>${emoji} ${statusText} ${emoji}</h2>
            <p>¡${winnerName} ha ganado la partida!</p>
        `;

        // Mostrar el modal
        endGameModal.style.display = 'block';
        
        // Configurar los botones según el modo
        if (this.debugMode) {
            this.setupDebugEndGameButtons(winnerNumber, player1Name, player2Name);
        } else {
            this.setupEndGameButtons(winnerNumber, player1Name, player2Name);
        }
    }

    // Crear el modal de fin de partida
    createEndGameModal() {
        const modal = document.createElement('div');
        modal.id = 'end-game-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            backdrop-filter: blur(5px);
        `;

        modal.innerHTML = `
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                color: white;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                max-width: 500px;
                width: 90%;
            ">
                <div id="end-game-winner"></div>
                <div id="end-game-options" style="margin-top: 30px;">
                    <div id="countdown-message" style="
                        text-align: center;
                        font-size: 18px;
                        color: #333;
                        margin: 20px 0;
                        padding: 20px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 10px;
                        border: 2px solid #ddd;
                    ">
                        <div id="countdown-text">Volviendo al menú principal en...</div>
                        <div id="countdown-number" style="
                            font-size: 48px;
                            font-weight: bold;
                            color: #FF6B6B;
                            margin: 10px 0;
                            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                        ">10</div>
                        <div id="countdown-subtext" class="countdown-text" style="margin-top: 10px;">
                            La partida ha terminado
                        </div>
                    </div>
                    
                    <!-- Solo mostrar botones en modo debug -->
                    <div id="debug-buttons" style="display: none;">
                        <button id="btn-reset-board" class="end-game-btn" style="
                            background: linear-gradient(45deg, #FF9800, #F57C00);
                            color: white;
                            border: none;
                            padding: 15px 25px;
                            margin: 10px;
                            border-radius: 25px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                        ">🔄 Reiniciar tablero<br>(modo debug)</button>
                        <br>
                        <button id="btn-main-menu" class="end-game-btn" style="
                            background: linear-gradient(45deg, #9C27B0, #7B1FA2);
                            color: white;
                            border: none;
                            padding: 15px 25px;
                            margin: 10px;
                            border-radius: 25px;
                            font-size: 16px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                        ">🏠 Menú Principal</button>
                    </div>
                    
                    <div id="end-game-status" style="margin-top: 20px; font-size: 14px; color: #666;"></div>
                </div>
            </div>
        `;

        // Agregar efectos hover a los botones
        const style = document.createElement('style');
        style.textContent = `
            .end-game-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3) !important;
            }
            .end-game-btn:active {
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);

        // Cerrar modal al hacer clic fuera de él
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // No cerrar automáticamente para evitar pérdida de opciones
                // El usuario debe elegir una opción
            }
        });

        document.body.appendChild(modal);
        return modal;
    }

    // Configurar los botones del modal de fin de partida para modo debug
    setupDebugEndGameButtons(winnerNumber, player1Name, player2Name) {
        const countdownMessage = document.getElementById('countdown-message');
        const debugButtons = document.getElementById('debug-buttons');
        const btnResetBoard = document.getElementById('btn-reset-board');
        const btnMainMenu = document.getElementById('btn-main-menu');
        const statusDiv = document.getElementById('end-game-status');

        // Ocultar countdown en modo debug
        countdownMessage.style.display = 'none';
        
        // Mostrar botones de debug
        debugButtons.style.display = 'block';
        btnResetBoard.style.display = 'inline-block';
        btnMainMenu.style.display = 'inline-block';

        // Limpiar event listeners anteriores
        btnResetBoard.replaceWith(btnResetBoard.cloneNode(true));
        btnMainMenu.replaceWith(btnMainMenu.cloneNode(true));
        
        const newBtnResetBoard = document.getElementById('btn-reset-board');
        const newBtnMainMenu = document.getElementById('btn-main-menu');

        // Reiniciar tablero en modo debug
        newBtnResetBoard.addEventListener('click', () => {
            this.handleDebugResetBoard();
        });

        // Salir al menú principal
        newBtnMainMenu.addEventListener('click', () => {
            this.handleDebugMainMenu();
        });

        // Mostrar estado inicial
        statusDiv.textContent = 'Modo debug - Opciones limitadas';
    }

    // Configurar los botones del modal de fin de partida
    setupEndGameButtons(winnerNumber, player1Name, player2Name) {
        const countdownMessage = document.getElementById('countdown-message');
        const debugButtons = document.getElementById('debug-buttons');
        const statusDiv = document.getElementById('end-game-status');

        // Mostrar countdown en modo normal
        countdownMessage.style.display = 'block';
        
        // Ocultar botones de debug en modo normal
        debugButtons.style.display = 'none';

        // Iniciar countdown de 10 segundos
        this.startCountdown();

        // Mostrar estado inicial
        statusDiv.textContent = 'La partida ha terminado';
    }

    // Iniciar countdown de 10 segundos
    startCountdown() {
        let countdown = 10;
        const countdownNumber = document.getElementById('countdown-number');
        const countdownText = document.getElementById('countdown-text');
        
        // Actualizar el número inicial
        if (countdownNumber) {
            countdownNumber.textContent = countdown;
        }
        
        const countdownInterval = setInterval(() => {
            countdown--;
            
            if (countdownNumber) {
                countdownNumber.textContent = countdown;
                
                // Cambiar color cuando queden pocos segundos
                if (countdown <= 3) {
                    countdownNumber.style.color = '#FF4444';
                    countdownNumber.style.animation = 'pulse 0.5s infinite';
                }
            }
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                
                // Redirigir al menú principal
                window.location.href = 'home.html';
            }
        }, 1000);
        
        // Agregar animación CSS para el pulso
        if (!document.getElementById('countdown-animation-style')) {
            const style = document.createElement('style');
            style.id = 'countdown-animation-style';
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Manejar reinicio de tablero en modo debug
    handleDebugResetBoard() {
        console.log('🔧 Debug mode: resetting board');
        
        // Cerrar modal
        const endGameModal = document.getElementById('end-game-modal');
        if (endGameModal) {
            endGameModal.style.display = 'none';
        }
        
        // Reiniciar el juego
        this.resetGame();
        this.gameState = 'playing';
        this.currentPlayer = 1;
        
        // Actualizar UI
        this.renderBoard();
        this.updateGameStatus();
        this.updateCapturedPieces();
        
        // Limpiar mensajes
        this.clearMessages();
        
        console.log('🔧 Debug mode: board reset complete');
    }

    // Manejar salida al menú principal en modo debug
    handleDebugMainMenu() {
        console.log('🔧 Debug mode: returning to main menu');
        
        // Cerrar modal
        const endGameModal = document.getElementById('end-game-modal');
        if (endGameModal) {
            endGameModal.style.display = 'none';
        }
        
        // Redirigir a home.html
        window.location.href = 'home.html';
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
        // Redirigir a la home después de abandonar
        window.location.href = 'home.html';
    }

    handleGameAbandonment(winnerName) {
        console.log('Game abandoned by opponent');
        
        // Mostrar mensaje de abandono
        this.addChatMessage('system', `¡El oponente ha abandonado la partida! ¡Has ganado!`);
        
        // Cambiar el botón abandonar por un botón de "Salir"
        const leaveBtn = document.getElementById('leave-game-btn');
        leaveBtn.textContent = 'Salir';
        leaveBtn.style.backgroundColor = '#28a745'; // Verde
        leaveBtn.onclick = () => {
            window.location.href = 'home.html';
        };
        
        // Deshabilitar el tablero
        this.gameState = 'finished';
        this.updateGameStatus();
        
        // Mostrar mensaje de victoria
        this.showMessage('¡El oponente ha abandonado! ¡Has ganado la partida!', 'success');
    }

    resetGame() {
        this.initializeBoard();
        this.currentPlayer = 1;
        this.selectedPiece = null;
        this.possibleMoves = [];
        this.gameState = 'waiting';
        this.capturedPieces = null; // Will be set by server
        this.playerId = null;
        this.gameId = null;
        this.gameEndNotified = false;
        
        // Restaurar estilos del estado del juego
        const statusElement = document.getElementById('game-status');
        if (statusElement) {
            statusElement.style.color = '';
            statusElement.style.fontWeight = '';
        }
        
        this.renderBoard();
        this.updateGameStatus();
        this.updateCapturedPieces();
        
        const newGameBtn = document.getElementById('new-game-btn');
        const joinGameBtn = document.getElementById('join-game-btn');
        const leaveGameBtn = document.getElementById('leave-game-btn');
        
        if (newGameBtn) newGameBtn.style.display = 'inline-block';
        if (joinGameBtn) joinGameBtn.style.display = 'inline-block';
        if (leaveGameBtn) leaveGameBtn.style.display = 'none';
    }

    startGame(playerId, gameId, playerName) {
        console.log(`=== START GAME - START ===`);
        console.log(`playerId:`, playerId, `gameId:`, gameId, `playerName:`, playerName);
        console.log(`capturedPieces before startGame:`, this.capturedPieces);
        
        this.playerId = playerId;
        this.gameId = gameId;
        this.playerName = playerName; // Store current player name
        // Don't set playerNames here - it will be set by loadInitialGameState
        // Don't set myPlayerNumber here - it will be set by loadInitialGameState
        this.gameState = 'playing';
        this.gameEndNotified = false;
        this.motivationalMessageShown = false; // Reset flag for new game
        
        // capturedPieces will be set by network.js from server data
        // Do not initialize locally - wait for server data
        console.log(`capturedPieces in startGame:`, this.capturedPieces);
        
        const newGameBtn = document.getElementById('new-game-btn');
        const joinGameBtn = document.getElementById('join-game-btn');
        const leaveGameBtn = document.getElementById('leave-game-btn');
        
        if (newGameBtn) newGameBtn.style.display = 'none';
        if (joinGameBtn) joinGameBtn.style.display = 'none';
        if (leaveGameBtn) leaveGameBtn.style.display = 'inline-block';
        
        this.clearMessages(); // Limpiar mensajes al iniciar nueva partida
        this.updateGameStatus();
        this.addChatMessage('system', '¡Partida iniciada! ¡Buena suerte!');
        
        console.log(`capturedPieces after startGame:`, this.capturedPieces);
        console.log(`=== START GAME - END ===`);
    }

    addChatMessage(sender, message) {
        const chatMessages = document.getElementById('chat-messages');
        
        // Check if chat container exists (chat system may be disabled)
        if (!chatMessages) {
            console.log(`Chat message (${sender}): ${message}`);
            return;
        }
        
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
        
        // Si es un mensaje de error, ocultar el mensaje motivacional
        if (type === 'error') {
            this.clearMotivationalMessage();
        }
        
        // Usar el elemento HTML existente
        const messageElement = document.getElementById('game-message');
        if (!messageElement) {
            console.error('Game message element not found!');
            return;
        }

        // Configurar el mensaje
        messageElement.textContent = message;
        messageElement.className = `game-message ${type}`;
        messageElement.style.display = 'block';
        messageElement.style.opacity = '1';
        messageElement.style.visibility = 'visible';
        
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
        // No mostrar mensajes de captura obligatoria si hay capturas múltiples en progreso
        if (this.multipleCaptureInProgress) {
            this.showMessage('🚫 Solo puedes mover a las casillas en azul', 'error');
            return;
        }
        
        const mandatoryCaptures = this.applyCaptureRules(this.myPlayerNumber);
        
        if (mandatoryCaptures && mandatoryCaptures.length > 0) {
            // Verificar si la pieza seleccionada puede hacer capturas
            const selectedPieceCaptures = this.getPossibleCaptures(this.selectedPiece.row, this.selectedPiece.col);
            
            if (selectedPieceCaptures.length === 0) {
                this.showMessage('🚫 Esta pieza no puede capturar. Debes usar la pieza que puede capturar', 'error');
            } else {
                // Verificar si hay damas disponibles
                const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isQueen);
                
                if (damaCaptures.length > 0) {
                    this.showMessage('🚫 Debes capturar con la dama', 'error');
                } else {
                    this.showMessage('🚫 Estás obligado a capturar', 'error');
                }
            }
        } else {
            // Verificar si es un movimiento normal válido
            const piece = this.board[this.selectedPiece.row][this.selectedPiece.col];
            if (piece) {
                const normalMoves = this.getNormalMoves(this.selectedPiece.row, this.selectedPiece.col);
                const isValidNormalMove = normalMoves.some(move => move.row === row && move.col === col);
                
                if (!isValidNormalMove) {
                    this.showMessage('🚫 Solo puedes mover a las casillas en azul', 'error');
                } else {
                    this.showMessage('🚫 Movimiento no válido', 'error');
                }
            } else {
                this.showMessage('🚫 Movimiento no válido', 'error');
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
        console.log('=== updateCurrentPlayer called ===');
        console.log('player:', player);
        console.log('this.myPlayerNumber:', this.myPlayerNumber);
        console.log('this.currentPlayer:', this.currentPlayer);
        console.log('this.motivationalMessageShown:', this.motivationalMessageShown);
        
        this.currentPlayer = player;
        this.updateGameStatus();
        
        // Mostrar mensaje de espera si no es tu turno
        if (this.myPlayerNumber && this.currentPlayer !== this.myPlayerNumber) {
            console.log('Showing waiting message - not my turn');
            this.showWaitingMessage();
            // Limpiar mensaje motivacional cuando no es tu turno
            this.clearMotivationalMessage();
        } else if (this.myPlayerNumber && this.currentPlayer === this.myPlayerNumber && !this.motivationalMessageShown) {
            console.log('Showing motivational message - my turn and not shown yet');
            this.showMotivationalMessage(); // Mostrar mensaje motivador solo si es tu turno y no se ha mostrado
            this.motivationalMessageShown = true; // Marcar que ya se mostró
        } else if (this.myPlayerNumber && this.currentPlayer === this.myPlayerNumber) {
            console.log('My turn but message already shown - keeping it visible');
            // Si es tu turno y ya se mostró el mensaje, mantenerlo visible
            // No hacer nada para mantener el mensaje motivacional
        } else {
            console.log('Clearing messages - other case');
            this.clearMessages(); // Limpiar mensajes en otros casos
        }
    }

    // Function to clear all messages
    clearMessages() {
        const messageElement = document.getElementById('game-message');
        if (messageElement) {
            // No limpiar mensajes de espera o error que deberían persistir
            const isWaiting = messageElement.className.includes('waiting');
            const isError = messageElement.className.includes('error');
            
            if (!isWaiting && !isError) {
                messageElement.style.display = 'none';
                messageElement.textContent = '';
                messageElement.className = 'game-message';
            }
        }
        
        // No limpiar mensaje motivacional automáticamente - debe ser persistente
    }

    // Function to clear only the motivational message
    clearMotivationalMessage() {
        const gameMessageElement = document.getElementById('game-message');
        if (gameMessageElement) {
            // Solo limpiar si es un mensaje motivacional, no si es un mensaje de espera
            if (gameMessageElement.classList.contains('motivational')) {
                gameMessageElement.style.display = 'none';
                gameMessageElement.textContent = '';
            }
        }
        this.motivationalMessageShown = false; // Reset flag
    }

    // Function to show motivational message when it's your turn
    showMotivationalMessage() {
        console.log('=== showMotivationalMessage called ===');
        const gameMessageElement = document.getElementById('game-message');
        if (!gameMessageElement) {
            console.error('Game message element not found!');
            return;
        }
        console.log('Game message element found:', gameMessageElement);

        // Obtener nombre del jugador
        const playerName = this.playerNames[this.myPlayerNumber] || 'Jugador';
        
        // Array de frases motivadoras con nombre del jugador y emoji de llamada a la acción
        const motivationalPhrases = [
            `↘️ ${playerName}, ¡Vamos! 🚀`,
            `↘️ ${playerName}, ¡No te duermas! 😴`,
            `↘️ ${playerName}, ¡Es tu momento! ⚡`,
            `↘️ ${playerName}, ¡A por todas! 🎯`,
            `↘️ ${playerName}, ¡No dejes que se enfríe! 🔥`,
            `↘️ ${playerName}, ¡Tu oponente está temblando! 😱`,
            `↘️ ${playerName}, ¡Es hora de brillar! ✨`,
            `↘️ ${playerName}, ¡No pienses, actúa! 🎭`,
            `↘️ ${playerName}, ¡Tu turno, tu gloria! 👑`,
            `↘️ ${playerName}, ¡La suerte está de tu lado! 🍀`,
            `↘️ ${playerName}, ¡No hay tiempo que perder! ⏰`,
            `↘️ ${playerName}, ¡Tu oponente está perdiendo paciencia! 😤`,
            `↘️ ${playerName}, ¡Es tu turno de ser leyenda! 🏆`,
            `↘️ ${playerName}, ¡No dejes que se enfríe el tablero! ❄️`,
            `↘️ ${playerName}, ¡Tu momento de gloria! 🌟`
        ];

        // Seleccionar frase aleatoria
        const randomIndex = Math.floor(Math.random() * motivationalPhrases.length);
        const selectedPhrase = motivationalPhrases[randomIndex];
        
        // Limpiar clases y estilos anteriores
        gameMessageElement.className = 'game-message';
        gameMessageElement.removeAttribute('style');
        
        // Establecer contenido y clase
        gameMessageElement.textContent = selectedPhrase;
        gameMessageElement.classList.add('motivational');
        
        // Forzar display después de aplicar la clase
        setTimeout(() => {
            gameMessageElement.style.setProperty('display', 'block', 'important');
        }, 10);
        
        console.log('Motivational message applied with class:', gameMessageElement.className);
    }

    // Function to show waiting message when it's not your turn
    showWaitingMessage() {
        console.log('=== showWaitingMessage called ===');
        const gameMessageElement = document.getElementById('game-message');
        if (!gameMessageElement) {
            console.error('Game message element not found!');
            return;
        }
        console.log('Game message element found:', gameMessageElement);
        console.log('Element before changes:', {
            textContent: gameMessageElement.textContent,
            innerHTML: gameMessageElement.innerHTML,
            className: gameMessageElement.className,
            style: gameMessageElement.style.cssText
        });

        // Obtener el nombre del oponente
        const opponentNumber = this.currentPlayer;
        const opponentName = this.playerNames[opponentNumber] || `Jugador ${opponentNumber}`;
        
        console.log('Opponent number:', opponentNumber);
        console.log('Opponent name:', opponentName);
        
        // Limpiar clases y estilos anteriores
        gameMessageElement.className = 'game-message';
        gameMessageElement.removeAttribute('style');
        
        // Establecer contenido y clase
        const messageText = `⏳ Esperando a que ${opponentName} mueva...`;
        gameMessageElement.textContent = messageText;
        gameMessageElement.classList.add('waiting');
        
        console.log('Message text set to:', messageText);
        console.log('Element textContent after setting:', gameMessageElement.textContent);
        console.log('Element innerHTML after setting:', gameMessageElement.innerHTML);
        
        // Forzar display después de aplicar la clase
        setTimeout(() => {
            gameMessageElement.style.setProperty('display', 'block', 'important');
            console.log('Display forced to block, element now:', gameMessageElement);
            console.log('Element after timeout:', {
                textContent: gameMessageElement.textContent,
                innerHTML: gameMessageElement.innerHTML,
                className: gameMessageElement.className,
                style: gameMessageElement.style.cssText,
                computedStyle: window.getComputedStyle(gameMessageElement).display
            });
        }, 10);
        
        console.log('Waiting message applied with class:', gameMessageElement.className);
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
    const debugMode = urlParams.get('debug') === 'true';
    
    if ((gameId && playerId && playerName) || debugMode) {
        window.game = new DamasGame();
        window.network = new NetworkManager();
        window.game.renderBoard();
        window.game.setupChatEventListeners(); // Ensure chat event listeners are added after DOM
        
        // Check debug mode first
        console.log('=== DEBUG CHECK ===');
        console.log('debugMode:', debugMode);
        console.log('URL debug param:', urlParams.get('debug'));
        if (debugMode) {
            console.log('=== DEBUG MODE INITIALIZATION ===');
            console.log('Debug mode activated - skipping network initialization');
            window.game.debugMode = true;
            window.game.createDebugPanel();
            // Don't call toggleDebugMode() - just show the panel
            const panel = document.getElementById('debug-panel');
            const board = document.getElementById('game-board');
            
            console.log('🔧 Panel found:', !!panel);
            console.log('🔧 Board found:', !!board);
            
            if (panel && board) {
                panel.style.display = 'block';
                board.style.border = '3px solid red';
                console.log('🔧 Debug mode activated');
            } else {
                console.log('🔧 Error: Panel or board not found');
            }
            // Clear board for debug mode
            window.game.clearBoard();
            // Set fake game parameters for debug mode
            window.game.gameId = 999;
            window.game.myPlayerNumber = 1;
            window.game.playerName = 'Debug Player';
            window.game.playerNames = { 1: 'Debug Player', 2: 'Debug Opponent' };
            window.game.currentPlayer = 1;
            window.game.gameState = 'playing';
            window.game.updateGameStatus();
        } else {
            // Initialize game with URL parameters (normal mode)
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
        }
    } else {
        // Redirect to home if no valid parameters
        window.location.href = 'home.html';
    }
});

// Debug functions
DamasGame.prototype.createDebugPanel = function() {
    // Create debug panel HTML
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 10000;
        display: none;
        min-width: 200px;
    `;
    
    debugPanel.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold;">🔧 MODO DEBUG</div>
        <div style="margin-bottom: 8px;">
            <button id="debug-mode-toggle" style="padding: 5px 10px; width: 100%; margin-bottom: 5px;">Modo: Editar Tablero</button>
        </div>
        <div id="debug-edit-controls" style="margin-bottom: 8px;">
            <div style="margin-bottom: 8px;">
                <label>Jugador: </label>
                <select id="debug-player" style="margin-left: 5px;">
                    <option value="1">1 (Blancas)</option>
                    <option value="2">2 (Negras)</option>
                </select>
            </div>
            <div style="margin-bottom: 8px;">
                <label>Pieza: </label>
                <select id="debug-piece" style="margin-left: 5px;">
                    <option value="pawn">Peón</option>
                    <option value="queen">Dama</option>
                </select>
            </div>
            <div style="margin-bottom: 8px;">
                <button id="debug-clear" style="padding: 5px 10px; width: 100%;">Limpiar Tablero</button>
            </div>
        </div>
        <div style="margin-bottom: 8px;">
            <button id="debug-turn" style="margin-right: 5px; padding: 5px 10px;">Cambiar Turno</button>
            <span id="debug-turn-display">Turno: 1</span>
        </div>
        <div id="debug-mode-instructions" style="font-size: 10px; color: #ccc;">
            Click en casilla para colocar/remover pieza
        </div>
    `;
    
    document.body.appendChild(debugPanel);
    console.log('🔧 Debug panel created and appended to body');
    
    // Add event listeners
    document.getElementById('debug-mode-toggle').addEventListener('click', () => {
        this.toggleDebugEditMode();
    });
    
    document.getElementById('debug-clear').addEventListener('click', () => {
        this.clearBoard();
    });
    
    document.getElementById('debug-turn').addEventListener('click', () => {
        this.changeTurn();
    });
    
    document.getElementById('debug-player').addEventListener('change', (e) => {
        this.debugPlayer = parseInt(e.target.value);
    });
    
    document.getElementById('debug-piece').addEventListener('change', (e) => {
        this.debugPieceType = e.target.value;
    });
};

DamasGame.prototype.toggleDebugMode = function() {
    this.debugMode = !this.debugMode;
    const panel = document.getElementById('debug-panel');
    const button = document.getElementById('debug-toggle');
    const board = document.getElementById('game-board');
    
    if (this.debugMode) {
        panel.style.display = 'block';
        button.textContent = 'Desactivar Debug';
        board.style.border = '3px solid red';
        console.log('🔧 Debug mode activated');
    } else {
        panel.style.display = 'none';
        button.textContent = 'Activar Debug';
        board.style.border = '';
        console.log('🔧 Debug mode deactivated');
    }
};

DamasGame.prototype.toggleDebugEditMode = function() {
    this.debugEditMode = !this.debugEditMode;
    const button = document.getElementById('debug-mode-toggle');
    const instructions = document.getElementById('debug-mode-instructions');
    
    if (this.debugEditMode) {
        button.textContent = 'Modo: Editar Tablero';
        instructions.textContent = 'Click en casilla para colocar/remover pieza';
    } else {
        button.textContent = 'Modo: Jugar';
        instructions.textContent = 'Click en pieza para seleccionar y mover';
    }
    
    console.log(`🔧 Debug edit mode: ${this.debugEditMode ? 'EDIT' : 'PLAY'}`);
};

DamasGame.prototype.handleDebugClick = function(row, col) {
    if (this.debugEditMode) {
        // Edit mode: place/remove pieces
        const piece = this.board[row][col];
        
        if (piece) {
            // Remove piece
            this.board[row][col] = null;
            console.log(`🔧 Removed piece at (${row}, ${col})`);
        } else {
            // Add piece
            this.board[row][col] = {
                player: this.debugPlayer,
                isQueen: this.debugPieceType === 'queen'
            };
            console.log(`🔧 Added ${this.debugPieceType} for player ${this.debugPlayer} at (${row}, ${col})`);
        }
        
        this.renderBoard();
    } else {
        // Play mode: call debug-specific game logic
        this.handleDebugPlayMode(row, col);
    }
};

DamasGame.prototype.handleDebugPlayMode = function(row, col) {
    console.log(`🔧 Debug play mode - handling click at (${row}, ${col})`);
    console.log(`🔧 Current player: ${this.currentPlayer}`);
    console.log(`🔧 Piece at (${row}, ${col}):`, this.board[row][col]);
    
    if (this.gameState !== 'playing') {
        if (this.gameState === 'finished') {
            this.showMessage('La partida ha terminado', 'info');
        }
        return;
    }
    
    const piece = this.board[row][col];
    
    // Si hay una pieza seleccionada, intentar mover
    if (this.selectedPiece) {
        // If clicking on another piece of the same color, check if there are multiple captures in progress
        if (piece && piece.player === this.currentPlayer) {
            // Check if there are multiple captures in progress
            if (this.multipleCaptureInProgress) {
                console.log('=== CAPTURAS MÚLTIPLES EN PROGRESO ===');
                console.log('Hay capturas múltiples en progreso, no permitir cambio de pieza');
                this.showMessage('🚫 Debes continuar con la misma pieza para completar las capturas', 'error');
                return;
            }
            
            console.log('=== REINICIANDO TURNO ===');
            console.log('Deseleccionando pieza anterior:', this.selectedPiece);
            this.selectedPiece = null;
            this.possibleMoves = [];
            // No llamar renderBoard aquí para evitar loops
            // Reiniciar el proceso de selección desde cero
            console.log('=== INICIANDO NUEVA SELECCIÓN ===');
            console.log(`Nueva pieza en (${row}, ${col}):`, piece);
            
            // Verificar si hay capturas obligatorias antes de seleccionar
            const mandatoryCaptures = this.applyCaptureRules(this.currentPlayer);
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
                    const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isQueen);
                    
                    console.log(`Dama captures:`, damaCaptures);
                    
                    if (damaCaptures.length > 0) {
                        this.showMessage('🚫 Debes capturar con la dama', 'error');
                    } else {
                        this.showMessage('🚫 Estás obligado a capturar', 'error');
                    }
                    return;
                }
            }
            // Seleccionar la nueva pieza (modo debug)
            this.selectPieceDebug(row, col);
            return;
        } else {
            // Obtener la pieza seleccionada del tablero
            const selectedPieceData = this.board[this.selectedPiece.row][this.selectedPiece.col];
            
            console.log(`=== MOVEMENT VALIDATION ===`);
            console.log(`Selected piece data:`, selectedPieceData);
            console.log(`Selected piece player:`, selectedPieceData ? selectedPieceData.player : 'null');
            console.log(`Current player:`, this.currentPlayer);
            console.log(`Is current player piece?`, selectedPieceData && selectedPieceData.player === this.currentPlayer);
            
            // Verificar que la pieza seleccionada es del jugador actual
            if (selectedPieceData && selectedPieceData.player !== this.currentPlayer) {
                console.log('❌ Cannot move opponent piece');
                this.showMessage('🚫 No puedes mover las piezas del oponente', 'error');
                this.selectedPiece = null;
                this.possibleMoves = [];
                // No llamar renderBoard aquí para evitar loops
                return;
            }
            
            if (this.isValidMove(this.selectedPiece, { row, col })) {
                const fromPiece = { ...this.selectedPiece }; // Save position before moving
                
                console.log(`=== MOVEMENT APPROVED ===`);
                console.log(`From piece:`, fromPiece);
                console.log(`To position: (${row}, ${col})`);
                console.log(`Selected piece data:`, selectedPieceData);
                
                // Aplicar movimiento localmente - makeMove se encarga de enviar al servidor cuando corresponda
                const capturedPieces = this.makeMove(fromPiece, { row, col });
                
                // Reset flag when making a move
                this.motivationalMessageShown = false;
                
                // Solo limpiar possibleMoves si no hay capturas múltiples en progreso
                if (!this.multipleCaptureInProgress) {
                    this.possibleMoves = [];
                }
                
                // No llamar renderBoard aquí para evitar loops
            } else {
                // Show invalid move message
                this.showInvalidMoveMessage(row, col);
                // No seleccionar nueva pieza después de mostrar mensaje de movimiento inválido
                return;
            }
        }
    }
    
    // Si no hay pieza seleccionada o se está cambiando de pieza
    if (piece && piece.player === this.currentPlayer) {
        // Si es la misma pieza seleccionada, deseleccionarla
        if (this.selectedPiece && this.selectedPiece.row === row && this.selectedPiece.col === col) {
            console.log('Deseleccionando pieza actual:', this.selectedPiece);
            this.selectedPiece = null;
            this.possibleMoves = [];
            // No llamar renderBoard aquí para evitar loops
            return;
        }
        
        // Verificar si hay capturas obligatorias antes de seleccionar (solo si no hay capturas múltiples en progreso)
        if (!this.multipleCaptureInProgress) {
            const mandatoryCaptures = this.applyCaptureRules(this.currentPlayer);
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
                    const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isQueen);
                    
                    if (damaCaptures.length > 0) {
                        this.showMessage('🚫 Debes capturar con la dama', 'error');
                    } else {
                        this.showMessage('🚫 Estás obligado a capturar', 'error');
                    }
                    return;
                }
            }
        }
        // Seleccionar pieza del jugador actual (modo debug)
        this.selectPieceDebug(row, col);
    } else if (piece && piece.player !== this.currentPlayer) {
        // Intentar seleccionar pieza del oponente
        console.log(`🔧 Piece player: ${piece.player}, Current player: ${this.currentPlayer}`);
        console.log(`🔧 Cannot select opponent piece`);
        this.showMessage('🚫 No puedes mover las piezas del oponente', 'error');
    } else {
        // Click on empty cell without selected piece
        // Solo mostrar mensajes si es mi turno y no hay capturas múltiples en progreso
        if (this.currentPlayer === this.currentPlayer && !this.multipleCaptureInProgress) {
            const mandatoryCaptures = this.applyCaptureRules(this.currentPlayer);
            if (mandatoryCaptures && mandatoryCaptures.length > 0) {
                // Verificar si hay damas disponibles
                const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isQueen);
                
                if (damaCaptures.length > 0) {
                    this.showMessage('🚫 Debes capturar con la dama', 'error');
                } else {
                    this.showMessage('🚫 Estás obligado a capturar', 'error');
                }
            } else {
                this.showMessage('Selecciona una pieza primero', 'info');
            }
        }
        // Si no es mi turno o hay capturas múltiples en progreso, no mostrar ningún mensaje
    }
    
    // Actualizar solo la visualización sin recrear event listeners
    this.updateBoardVisualization();
};

DamasGame.prototype.selectPieceDebug = function(row, col) {
    console.log(`=== SELECTING PIECE DEBUG (DEBUG MODE) ===`);
    console.log(`Selected piece at (${row}, ${col}):`, this.board[row][col]);
    console.log(`Current player: ${this.currentPlayer}`);
    
    const piece = this.board[row][col];
    if (!piece) {
        console.log('No piece at this position, cannot select');
        console.log(`=== END SELECTING PIECE DEBUG ===`);
        return;
    }
    
    console.log(`Piece player: ${piece.player}`);
    
    // Verificar que la pieza es del jugador actual (usar currentPlayer en modo debug)
    if (piece.player !== this.currentPlayer) {
        console.log('Cannot select opponent piece');
        this.showMessage('🚫 No puedes seleccionar las piezas del oponente', 'error');
        console.log(`=== END SELECTING PIECE DEBUG ===`);
        return;
    }
    
    // Verificar si hay capturas obligatorias
    const mandatoryCaptures = this.applyCaptureRules(this.currentPlayer);
    if (mandatoryCaptures && mandatoryCaptures.length > 0) {
        console.log('Capturas obligatorias detectadas:', mandatoryCaptures);
        // Verificar si la pieza seleccionada puede hacer una captura obligatoria
        const canThisPieceCapture = mandatoryCaptures.some(capture => 
            capture.piece.row === row && capture.piece.col === col
        );
        
        if (!canThisPieceCapture) {
            console.log('No se puede seleccionar esta pieza, hay captura obligatoria con otra');
            // Verificar si hay damas disponibles
            const damaCaptures = mandatoryCaptures.filter(capture => capture.piece.piece.isQueen);
            if (damaCaptures.length > 0) {
                this.showMessage('🚫 Debes capturar con la dama', 'error');
            } else {
                this.showMessage('🚫 Estás obligado a capturar', 'error');
            }
            console.log(`=== END SELECTING PIECE DEBUG ===`);
            return;
        }
    }
    
    this.selectedPiece = { row, col };
    this.possibleMoves = this.getPossibleMovesDebug(row, col);
    
    console.log(`Possible moves:`, this.possibleMoves);
    console.log(`=== END SELECTING PIECE DEBUG ===`);
    
    // No llamar renderBoard aquí para evitar loops - se llama desde handleDebugPlayMode
};

DamasGame.prototype.getPossibleMovesDebug = function(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];

    console.log(`=== GET POSSIBLE MOVES DEBUG (DEBUG MODE) ===`);
    console.log(`Piece at (${row}, ${col}):`, piece);
    console.log(`Piece player: ${piece.player}`);
    console.log(`Current player: ${this.currentPlayer}`);

    // Para modo debug, usar la misma lógica que getPossibleCaptures
    const captures = this.getPossibleCaptures(row, col);
    
    if (captures.length > 0) {
        console.log(`Found ${captures.length} captures, using capture moves`);
        console.log(`=== END GET POSSIBLE MOVES DEBUG ===`);
        return captures;
    }
    
    // Si no hay capturas, mostrar movimientos normales
    const moves = [];
    
    if (piece.isQueen) {
        // Para damas: buscar todas las casillas vacías en diagonal
        const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        
        for (const [dRow, dCol] of directions) {
            let currentRow = row + dRow;
            let currentCol = col + dCol;
            
            // Buscar casillas vacías en esta dirección diagonal
            while (this.isValidPosition(currentRow, currentCol)) {
                if (!this.board[currentRow][currentCol]) {
                    // Casilla vacía, es un movimiento válido
                    moves.push({ row: currentRow, col: currentCol, type: 'normal' });
                } else {
                    // Hay una pieza, no podemos continuar en esta dirección
                    break;
                }
                currentRow += dRow;
                currentCol += dCol;
            }
        }
    } else {
        // Para peones: solo movimientos de una casilla
        const directions = piece.player === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];

        for (const [dRow, dCol] of directions) {
            const newRow = row + dRow;
            const newCol = col + dCol;
            
            if (this.isValidPosition(newRow, newCol) && !this.board[newRow][newCol]) {
                moves.push({ row: newRow, col: newCol, type: 'normal' });
            }
        }
    }
    
    console.log(`Debug moves found:`, moves.length);
    console.log(`=== END GET POSSIBLE MOVES DEBUG ===`);
    
    return moves;
};

DamasGame.prototype.updateBoardVisualization = function() {
    // Actualizar solo la visualización sin recrear event listeners
    const boardElement = document.getElementById('game-board');
    if (!boardElement) return;
    
    // Determinar si necesitamos rotar el tablero
    const shouldRotate = this.myPlayerNumber === 2;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const realRow = shouldRotate ? 7 - row : row;
            const realCol = shouldRotate ? 7 - col : col;
            
            const cell = document.querySelector(`[data-row="${realRow}"][data-col="${realCol}"]`);
            if (!cell) continue;
            
            // Limpiar clases existentes
            cell.classList.remove('possible-move', 'selected');
            
            // Marcar movimientos posibles
            if (this.possibleMoves.some(move => move.row === realRow && move.col === realCol)) {
                cell.classList.add('possible-move');
            }

            // Marcar pieza seleccionada
            if (this.selectedPiece && this.selectedPiece.row === realRow && this.selectedPiece.col === realCol) {
                cell.classList.add('selected');
            }
        }
    }
};

DamasGame.prototype.clearBoard = function() {
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            this.board[row][col] = null;
        }
    }
    this.renderBoard();
    console.log('🔧 Board cleared');
};

DamasGame.prototype.changeTurn = function() {
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    document.getElementById('debug-turn-display').textContent = `Turno: ${this.currentPlayer}`;
    console.log(`🔧 Turn changed to: ${this.currentPlayer}`);
    
    // Actualizar overlay y capturas en modo debug
    this.updateBoardOverlay();
    this.updateCapturedPieces();
    this.updateGameStatus();
};
