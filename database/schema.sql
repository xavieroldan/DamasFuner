-- Base de datos para el juego de Damas Online
CREATE DATABASE IF NOT EXISTS damas_online;
USE damas_online;

-- Tabla de partidas
CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_code VARCHAR(6) UNIQUE NOT NULL,
    player1_id INT,
    player2_id INT,
    current_player INT DEFAULT 1,
    board_state TEXT,
    captured_pieces_black INT DEFAULT 0,
    captured_pieces_white INT DEFAULT 0,
    game_status ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
    winner INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_game_code (game_code),
    INDEX idx_status (game_status)
);

-- Tabla de jugadores
CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    game_id INT,
    player_number INT,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    INDEX idx_game_id (game_id)
);

-- Tabla de mensajes de chat
CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    player_id INT NOT NULL,
    player_name VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    INDEX idx_game_id (game_id),
    INDEX idx_created_at (created_at)
);

-- Tabla de movimientos (historial)
CREATE TABLE IF NOT EXISTS moves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id INT NOT NULL,
    player_id INT NOT NULL,
    from_row INT NOT NULL,
    from_col INT NOT NULL,
    to_row INT NOT NULL,
    to_col INT NOT NULL,
    captured_row INT NULL,
    captured_col INT NULL,
    move_type ENUM('move', 'capture', 'king_promotion') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    INDEX idx_game_id (game_id),
    INDEX idx_created_at (created_at)
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar configuración inicial
INSERT INTO system_config (config_key, config_value) VALUES
('max_games_per_hour', '10'),
('max_chat_messages_per_minute', '30'),
('game_timeout_minutes', '30'),
('cleanup_interval_hours', '24')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- Vista para estadísticas de partidas
CREATE OR REPLACE VIEW game_stats AS
SELECT 
    g.id,
    g.game_code,
    g.game_status,
    g.winner,
    g.created_at,
    g.updated_at,
    p1.name as player1_name,
    p2.name as player2_name,
    COUNT(m.id) as total_moves,
    TIMESTAMPDIFF(MINUTE, g.created_at, g.updated_at) as duration_minutes
FROM games g
LEFT JOIN players p1 ON g.player1_id = p1.id
LEFT JOIN players p2 ON g.player2_id = p2.id
LEFT JOIN moves m ON g.id = m.game_id
GROUP BY g.id;

-- Procedimiento para limpiar partidas antiguas
DELIMITER //
CREATE PROCEDURE CleanupOldGames()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE game_id INT;
    DECLARE cur CURSOR FOR 
        SELECT id FROM games 
        WHERE game_status = 'waiting' 
        AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR);
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO game_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        DELETE FROM games WHERE id = game_id;
    END LOOP;
    
    CLOSE cur;
END //
DELIMITER ;

-- Evento para limpiar partidas automáticamente
CREATE EVENT IF NOT EXISTS cleanup_old_games
ON SCHEDULE EVERY 1 HOUR
DO
  CALL CleanupOldGames();
