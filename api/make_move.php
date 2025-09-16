<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

/**
 * Calculate captured pieces by comparing old and new board states
 * @param array $oldBoard Previous board state
 * @param array $newBoard New board state
 * @param int $playerNumber Player who made the move (1 or 2)
 * @return array Array of captured pieces with row, col, and piece info
 */
function calculateCaptures($oldBoard, $newBoard, $playerNumber) {
    $capturedPieces = [];
    $enemyPlayer = $playerNumber === 1 ? 2 : 1;
    
    // Compare each position to find missing pieces
    for ($row = 0; $row < 8; $row++) {
        for ($col = 0; $col < 8; $col++) {
            $oldPiece = $oldBoard[$row][$col];
            $newPiece = $newBoard[$row][$col];
            
            // If there was an enemy piece before and it's gone now, it was captured
            if ($oldPiece && $oldPiece['player'] == $enemyPlayer && !$newPiece) {
                $capturedPieces[] = [
                    'row' => $row,
                    'col' => $col,
                    'piece' => $oldPiece['isQueen'] ? 'queen' : 'pawn',
                    'player' => $enemyPlayer
                ];
                error_log("Captured piece at ($row, $col): " . ($oldPiece['isQueen'] ? 'queen' : 'pawn'));
            }
        }
    }
    
    return $capturedPieces;
}

/**
 * Calculate total captures from current board state by counting missing pieces
 * @param array $boardState Current board state
 * @return array Array with player1_captures and player2_captures
 */
function calculateCapturesFromBoard($boardState) {
    // Count pieces on current board
    $currentPlayer1Pieces = 0; // White pieces
    $currentPlayer2Pieces = 0; // Black pieces
    
    for ($row = 0; $row < 8; $row++) {
        for ($col = 0; $col < 8; $col++) {
            if ($boardState[$row][$col]) {
                $piece = $boardState[$row][$col];
                if ($piece['player'] == 1) {
                    $currentPlayer1Pieces++;
                } else if ($piece['player'] == 2) {
                    $currentPlayer2Pieces++;
                }
            }
        }
    }
    
    // Initial pieces count (12 each)
    $initialPlayer1Pieces = 12; // White pieces
    $initialPlayer2Pieces = 12; // Black pieces
    
    // Calculate captures
    // Player 1 captures = missing Player 2 pieces
    $player1_captures = max(0, $initialPlayer2Pieces - $currentPlayer2Pieces);
    // Player 2 captures = missing Player 1 pieces  
    $player2_captures = max(0, $initialPlayer1Pieces - $currentPlayer1Pieces);
    
    return [
        'player1_captures' => $player1_captures,
        'player2_captures' => $player2_captures,
        'current_player1_pieces' => $currentPlayer1Pieces,
        'current_player2_pieces' => $currentPlayer2Pieces
    ];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['from']) || !isset($input['to']) || !isset($input['player_id']) || !isset($input['game_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required parameters']);
    exit;
}

$from = $input['from'];
$to = $input['to'];
$playerId = $input['player_id'];
$gameId = $input['game_id'];
$debugMode = isset($input['debug']) ? (bool)$input['debug'] : false;

try {
    $conn = getDBConnection();
    
    // Obtener el estado actual del juego
    $game = fetchOne("SELECT board_state, current_player FROM games WHERE id = ?", [$gameId]);
    if (!$game) {
        throw new Exception('Game not found');
    }
    
    $board = json_decode($game['board_state'], true);
    $currentPlayer = $game['current_player'];
    
    // Get player number (1 or 2) based on their ID
    $player = fetchOne("SELECT player_number FROM players WHERE id = ? AND game_id = ?", [$playerId, $gameId]);
    if (!$player) {
        echo json_encode(['valid' => false, 'message' => 'Jugador no encontrado']);
        exit;
    }
    
    $playerNumber = $player['player_number'];
    
    // Verificar que es el turno del jugador (CRÍTICO para juegos online)
    // Skip turn validation in debug mode
    if (!$debugMode && $currentPlayer !== $playerNumber) {
        echo json_encode(['success' => false, 'message' => 'No es tu turno']);
        exit;
    }
    
    $fromRow = $from['row'];
    $fromCol = $from['col'];
    $toRow = $to['row'];
    $toCol = $to['col'];
    
    // NO VALIDAR NADA - El cliente maneja todas las reglas del juego
    // Only verify coordinates are on the board (skip in debug mode)
    if (!$debugMode && ($fromRow < 0 || $fromRow >= 8 || $fromCol < 0 || $fromCol >= 8 ||
        $toRow < 0 || $toRow >= 8 || $toCol < 0 || $toCol >= 8)) {
        echo json_encode(['valid' => false, 'message' => 'Coordenadas fuera del tablero']);
        exit;
    }
    
    $piece = $board[$fromRow][$fromCol];
    $newBoard = $board;
    
    // SERVIDOR CALCULA CAPTURAS - ÚNICA FUENTE DE VERDAD
    $capturedPieces = [];
    $captureCount = 0;
    
    // If client sends complete board, use it directly
    if (isset($input['board_state'])) {
        $newBoard = $input['board_state'];
        error_log("Using complete board state from client");
        
        // Calcular capturas comparando el tablero anterior con el nuevo
        $capturedPieces = calculateCaptures($board, $newBoard, $playerNumber);
        $captureCount = count($capturedPieces);
        error_log("Capturas calculadas: " . json_encode($capturedPieces));
        error_log("Server calculated captures: " . $captureCount . " pieces");
    } else {
        // Fallback: process basic movement (for compatibility)
        $newBoard[$toRow][$toCol] = $newBoard[$fromRow][$fromCol];
        $newBoard[$fromRow][$fromCol] = null;
        error_log("Using fallback movement processing");
        
        // Calculate captures for basic movement
        $capturedPieces = calculateCaptures($board, $newBoard, $playerNumber);
        $captureCount = count($capturedPieces);
        error_log("Capturas calculadas (fallback): " . json_encode($capturedPieces));
    }
    
    // VALIDACIÓN: Verificar que las capturas calculadas sean correctas
    $boardValidation = calculateCapturesFromBoard($newBoard);
    error_log("Validación de capturas - Player 1: " . $boardValidation['player1_captures'] . 
              ", Player 2: " . $boardValidation['player2_captures']);
    error_log("Piezas actuales - Player 1: " . $boardValidation['current_player1_pieces'] . 
              ", Player 2: " . $boardValidation['current_player2_pieces']);
    
    // SERVIDOR CALCULA TOTALES DE CAPTURAS - ÚNICA FUENTE DE VERDAD
    if ($debugMode) {
        // En modo debug, usar los totales actuales de la DB sin modificar
        $currentGame = fetchOne("SELECT captured_pieces_black, captured_pieces_white FROM games WHERE id = ?", [$gameId]);
        $totalCapturedBlack = (int)($currentGame['captured_pieces_black'] ?? 0);
        $totalCapturedWhite = (int)($currentGame['captured_pieces_white'] ?? 0);
        error_log("Debug mode: using existing DB totals - Black: $totalCapturedBlack, White: $totalCapturedWhite");
    } else {
        // In normal game mode, use board validation as source of truth
        $totalCapturedBlack = $boardValidation['player2_captures']; // Player 2 (black) captures
        $totalCapturedWhite = $boardValidation['player1_captures']; // Player 1 (white) captures
        error_log("Game mode: using board validation - Black: $totalCapturedBlack, White: $totalCapturedWhite");
    }
    
    error_log("Final validation - Board state captures match calculated totals");
    
    // Determinar el siguiente jugador (cambiar de 1 a 2 o viceversa)
    // En modo debug, mantener el turno actual
    $nextPlayer = $debugMode ? $currentPlayer : ($playerNumber === 1 ? 2 : 1);
    
    // Actualizar base de datos (tablero, turno y capturas)
    $stmt = $conn->prepare("UPDATE games SET board_state = ?, captured_pieces_black = ?, captured_pieces_white = ?, current_player = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([json_encode($newBoard), $totalCapturedBlack, $totalCapturedWhite, $nextPlayer, $gameId]);
    
    // Registrar el movimiento (sin capturas - el cliente maneja las reglas)
    $stmt = $conn->prepare("INSERT INTO moves (game_id, player_id, from_row, from_col, to_row, to_col, move_type) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$gameId, $playerId, $fromRow, $fromCol, $toRow, $toCol, 'move']);
    
    echo json_encode([
        'success' => true,
        'message' => 'Movimiento realizado exitosamente',
        'board_state' => $newBoard,
        'captured_pieces' => $capturedPieces,
        'capture_count' => $captureCount,
        'current_player' => $nextPlayer,
        'game_data' => [
            'board' => $newBoard,
            'current_player' => $nextPlayer,
            'captured_pieces' => [
                'black' => $totalCapturedBlack,
                'white' => $totalCapturedWhite
            ]
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error in make_move: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>
