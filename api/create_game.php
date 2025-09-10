<?php
/**
 * API to create a new checkers game
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

try {
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Log the request for debugging
    error_log("Create game request: " . json_encode($input));
    
    if (!$input || !isset($input['player_name'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Player name required']);
        exit;
    }
    
    $playerName = trim($input['player_name']);
    if (empty($playerName) || strlen($playerName) < 3 || strlen($playerName) > 15) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El nombre debe tener entre 3 y 15 caracteres']);
        exit;
    }
    
    // Generate unique code for the game
    $gameCode = generateUniqueGameCode();
    
    // Crear estado inicial del tablero
    $initialBoard = createInitialBoard();
    
    // Crear la partida en la base de datos
    $conn = getDBConnection();
    $conn->beginTransaction();
    
    try {
        // Insertar la partida
        $sql = "INSERT INTO games (game_code, player1_id, board_state, game_status) VALUES (?, NULL, ?, 'waiting')";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$gameCode, json_encode($initialBoard)]);
        $gameId = $conn->lastInsertId();
        
        // Insertar el jugador 1
        $sql = "INSERT INTO players (name, game_id, player_number) VALUES (?, ?, 1)";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$playerName, $gameId]);
        $playerId = $conn->lastInsertId();
        
        // Actualizar la partida con el ID del jugador 1
        $sql = "UPDATE games SET player1_id = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute([$playerId, $gameId]);
        
        $conn->commit();
        
        // Respuesta exitosa
        echo json_encode([
            'success' => true,
            'game_id' => $gameId,
            'player_id' => $playerId,
            'game_code' => $gameCode,
            'message' => 'Partida creada exitosamente'
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Error creating game: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error creating game: ' . $e->getMessage()
    ]);
}

/**
 * Generates a unique 3-digit numeric code for the game
 */
function generateUniqueGameCode() {
    $maxAttempts = 10;
    
    for ($i = 0; $i < $maxAttempts; $i++) {
        // Generate 3-digit numeric code (100-999)
        $code = str_pad(rand(100, 999), 3, '0', STR_PAD_LEFT);
        
        // Verify that the code does not exist
        $existing = fetchOne("SELECT id FROM games WHERE game_code = ?", [$code]);
        if (!$existing) {
            return $code;
        }
    }
    
    throw new Exception('No se pudo generar un código único para la partida');
}

/**
 * Crea el estado inicial del tablero de damas
 */
function createInitialBoard() {
    $board = array_fill(0, 8, array_fill(0, 8, null));
    
    // Place black pieces (player 2) in the first 3 rows
    for ($row = 0; $row < 3; $row++) {
        for ($col = 0; $col < 8; $col++) {
            if (($row + $col) % 2 === 1) {
                $board[$row][$col] = [
                    'player' => 2,
                    'isQueen' => false
                ];
            }
        }
    }
    
    // Place white pieces (player 1) in the last 3 rows
    for ($row = 5; $row < 8; $row++) {
        for ($col = 0; $col < 8; $col++) {
            if (($row + $col) % 2 === 1) {
                $board[$row][$col] = [
                    'player' => 1,
                    'isQueen' => false
                ];
            }
        }
    }
    
    return $board;
}
?>
