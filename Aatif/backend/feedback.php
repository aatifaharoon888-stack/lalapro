<?php
session_start();
require_once __DIR__ . '/db.php';
$msg = trim($_POST['message'] ?? '');
$words = str_word_count($msg);
if ($words < 1 || $words > 250) json_out(['ok'=>false,'msg'=>'Message must be 1–250 words']);
$uid = $_SESSION['user_id'] ?? null;
$st = $pdo->prepare('INSERT INTO feedback (user_id,message) VALUES (?,?)');
$st->execute([$uid, clean($msg)]);
json_out(['ok'=>true]);
