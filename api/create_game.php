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
    // Obtener datos del POST
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['player_name'])) {
        throw new Exception('Nombre del jugador requerido');
    }
    
    $playerName = trim($input['player_name']);
    if (empty($playerName) || strlen($playerName) > 50) {
        throw new Exception('Nombre del jugador inválido');
    }
    
    // Generar código único para la partida
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
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

/**
 * Genera un código único de 6 caracteres para la partida
 */
function generateUniqueGameCode() {
    $characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $maxAttempts = 10;
    
    for ($i = 0; $i < $maxAttempts; $i++) {
        $code = '';
        for ($j = 0; $j < 6; $j++) {
            $code .= $characters[rand(0, strlen($characters) - 1)];
        }
        
        // Verificar que el código no exista
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
    
    // Colocar piezas negras (jugador 1) en las primeras 3 filas
    for ($row = 0; $row < 3; $row++) {
        for ($col = 0; $col < 8; $col++) {
            if (($row + $col) % 2 === 1) {
                $board[$row][$col] = [
                    'player' => 1,
                    'isKing' => false
                ];
            }
        }
    }
    
    // Colocar piezas blancas (jugador 2) en las últimas 3 filas
    for ($row = 5; $row < 8; $row++) {
        for ($col = 0; $col < 8; $col++) {
            if (($row + $col) % 2 === 1) {
                $board[$row][$col] = [
                    'player' => 2,
                    'isKing' => false
                ];
            }
        }
    }
    
    return $board;
}
?>
