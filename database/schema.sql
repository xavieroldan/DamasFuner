-- DAMAS FUNER - DATABASE SCHEMA
-- Multiplayer checkers game database schema v2.0.0

-- Table: chat_messages (legacy feature)
DROP TABLE IF EXISTS `chat_messages`;
CREATE TABLE `chat_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `game_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `player_name` varchar(50) NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_game_id` (`game_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4;

-- Table: games
DROP TABLE IF EXISTS `games`;
CREATE TABLE `games` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `game_code` varchar(6) NOT NULL,
  `player1_id` int(11) DEFAULT NULL,
  `player2_id` int(11) DEFAULT NULL,
  `current_player` int(11) DEFAULT '1',
  `board_state` text,
  `captured_pieces_black` int(11) DEFAULT '0',
  `captured_pieces_white` int(11) DEFAULT '0',
  `game_status` enum('waiting','playing','finished') DEFAULT 'waiting',
  `winner` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `game_code` (`game_code`),
  KEY `idx_game_code` (`game_code`),
  KEY `idx_status` (`game_status`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4;

-- Table: moves
DROP TABLE IF EXISTS `moves`;
CREATE TABLE `moves` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `game_id` int(11) NOT NULL,
  `player_id` int(11) NOT NULL,
  `from_row` int(11) NOT NULL,
  `from_col` int(11) NOT NULL,
  `to_row` int(11) NOT NULL,
  `to_col` int(11) NOT NULL,
  `captured_row` int(11) DEFAULT NULL,
  `captured_col` int(11) DEFAULT NULL,
  `move_type` enum('move','capture','multiple_capture','queen_promotion') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_game_id` (`game_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4;

-- Table: players
DROP TABLE IF EXISTS `players`;
CREATE TABLE `players` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `game_id` int(11) DEFAULT NULL,
  `player_number` int(11) DEFAULT NULL,
  `last_activity` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_game_id` (`game_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4;


-- Table: system_config
DROP TABLE IF EXISTS `system_config`;
CREATE TABLE `system_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `config_key` varchar(50) NOT NULL,
  `config_value` text,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4;

-- Insert default configuration values
INSERT INTO `system_config` VALUES 
(1,'max_games_per_hour','10','2025-09-02 15:52:55'),
(2,'max_chat_messages_per_minute','30','2025-09-02 15:52:55'),
(3,'game_timeout_minutes','30','2025-09-02 15:52:55'),
(4,'cleanup_interval_hours','24','2025-09-02 15:52:55');

-- Stored procedure: CleanupOldGames
DROP PROCEDURE IF EXISTS `CleanupOldGames`;
DELIMITER ;;
CREATE PROCEDURE `CleanupOldGames`()
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
END ;;
DELIMITER ;

-- View: game_stats
DROP VIEW IF EXISTS `game_stats`;
CREATE VIEW `game_stats` AS 
SELECT 
    `g`.`id` AS `id`,
    `g`.`game_code` AS `game_code`,
    `g`.`game_status` AS `game_status`,
    `g`.`winner` AS `winner`,
    `g`.`created_at` AS `created_at`,
    `g`.`updated_at` AS `updated_at`,
    `p1`.`name` AS `player1_name`,
    `p2`.`name` AS `player2_name`,
    count(`m`.`id`) AS `total_moves`,
    timestampdiff(MINUTE,`g`.`created_at`,`g`.`updated_at`) AS `duration_minutes` 
FROM `games` `g` 
LEFT JOIN `players` `p1` ON `g`.`player1_id` = `p1`.`id`
LEFT JOIN `players` `p2` ON `g`.`player2_id` = `p2`.`id`
LEFT JOIN `moves` `m` ON `g`.`id` = `m`.`game_id`
GROUP BY `g`.`id`;