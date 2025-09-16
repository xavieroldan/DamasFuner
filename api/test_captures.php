<?php
/**
 * Test script for capture system validation
 * Tests both simple and multiple captures
 */

require_once 'make_move.php';
require_once 'get_game_state.php';

echo "=== TESTING CAPTURE SYSTEM ===\n\n";

// Test 1: Initial board state
echo "TEST 1: Initial board state\n";
$initialBoard = createInitialBoard();
$initialCaptures = calculateCapturesFromBoard($initialBoard);
echo "Initial captures - Player 1: " . $initialCaptures['player1_captures'] . 
     ", Player 2: " . $initialCaptures['player2_captures'] . "\n";
echo "Initial pieces - Player 1: " . $initialCaptures['current_player1_pieces'] . 
     ", Player 2: " . $initialCaptures['current_player2_pieces'] . "\n";
echo "Expected: 0 captures, 12 pieces each\n";
echo "Result: " . ($initialCaptures['player1_captures'] == 0 && $initialCaptures['player2_captures'] == 0 ? "PASS" : "FAIL") . "\n\n";

// Test 2: Simulate a capture
echo "TEST 2: Simulate a capture\n";
$testBoard = $initialBoard;
// Remove one black piece (player 2) to simulate capture
$testBoard[0][1] = null;
$captureTest = calculateCapturesFromBoard($testBoard);
echo "After removing 1 black piece:\n";
echo "Captures - Player 1: " . $captureTest['player1_captures'] . 
     ", Player 2: " . $captureTest['player2_captures'] . "\n";
echo "Pieces - Player 1: " . $captureTest['current_player1_pieces'] . 
     ", Player 2: " . $captureTest['current_player2_pieces'] . "\n";
echo "Expected: Player 1 has 1 capture, Player 2 has 0 captures\n";
echo "Result: " . ($captureTest['player1_captures'] == 1 && $captureTest['player2_captures'] == 0 ? "PASS" : "FAIL") . "\n\n";

// Test 3: Simulate multiple captures
echo "TEST 3: Simulate multiple captures\n";
$multiBoard = $initialBoard;
// Remove 3 black pieces and 2 white pieces
$multiBoard[0][1] = null;
$multiBoard[0][3] = null;
$multiBoard[1][0] = null;
$multiBoard[5][0] = null;
$multiBoard[5][2] = null;
$multiTest = calculateCapturesFromBoard($multiBoard);
echo "After removing 3 black and 2 white pieces:\n";
echo "Captures - Player 1: " . $multiTest['player1_captures'] . 
     ", Player 2: " . $multiTest['player2_captures'] . "\n";
echo "Pieces - Player 1: " . $multiTest['current_player1_pieces'] . 
     ", Player 2: " . $multiTest['current_player2_pieces'] . "\n";
echo "Expected: Player 1 has 3 captures, Player 2 has 2 captures\n";
echo "Result: " . ($multiTest['player1_captures'] == 3 && $multiTest['player2_captures'] == 2 ? "PASS" : "FAIL") . "\n\n";

// Test 4: Test calculateCaptures function
echo "TEST 4: Test calculateCaptures function\n";
$oldBoard = $initialBoard;
$newBoard = $initialBoard;
$newBoard[0][1] = null; // Remove one black piece
$capturedPieces = calculateCaptures($oldBoard, $newBoard, 1); // Player 1 made the move
echo "Captured pieces: " . json_encode($capturedPieces) . "\n";
echo "Number of captured pieces: " . count($capturedPieces) . "\n";
echo "Expected: 1 captured piece at (0,1)\n";
echo "Result: " . (count($capturedPieces) == 1 && $capturedPieces[0]['row'] == 0 && $capturedPieces[0]['col'] == 1 ? "PASS" : "FAIL") . "\n\n";

echo "=== CAPTURE SYSTEM TEST COMPLETE ===\n";
?>
