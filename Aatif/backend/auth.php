<?php
session_start();
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
  case 'signup': {
    $name = clean($_POST['name'] ?? '');
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $password = $_POST['password'] ?? '';
    if (!$name || !$email || strlen($password) < 6) json_out(['ok'=>false,'msg'=>'Invalid fields']);
    if (strlen($password) > 64) json_out(['ok'=>false,'msg'=>'Password too long']);
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email=?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) json_out(['ok'=>false,'msg'=>'Email already registered']);
    $hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare('INSERT INTO users (name,email,password) VALUES (?,?,?)');
    $stmt->execute([$name,$email,$hash]);
    $_SESSION['user_id'] = $pdo->lastInsertId();
    $_SESSION['user_name'] = $name;
    json_out(['ok'=>true,'redirect'=>'dashboard.html']);
  }
  case 'login': {
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $password = $_POST['password'] ?? '';
    if (!$email || !$password) json_out(['ok'=>false,'msg'=>'Missing credentials']);
    $stmt = $pdo->prepare('SELECT * FROM users WHERE email=?');
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if (!$u || !password_verify($password, $u['password'])) json_out(['ok'=>false,'msg'=>'Invalid credentials']);
    $_SESSION['user_id'] = $u['id'];
    $_SESSION['user_name'] = $u['name'];
    json_out(['ok'=>true,'redirect'=>'dashboard.html']);
  }
  case 'logout': {
    session_destroy();
    header('Location: ../frontend/index.html'); exit;
  }
  case 'me': {
    if (!isset($_SESSION['user_id'])) json_out(['ok'=>false]);
    json_out(['ok'=>true,'id'=>$_SESSION['user_id'],'name'=>$_SESSION['user_name']]);
  }
  default: json_out(['ok'=>false,'msg'=>'Unknown action']);
}
