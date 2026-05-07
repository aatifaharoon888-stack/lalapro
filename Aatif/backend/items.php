<?php
session_start();
require_once __DIR__ . '/db.php';
if (!isset($_SESSION['user_id'])) json_out(['ok'=>false,'msg'=>'Not authenticated']);
$uid = (int)$_SESSION['user_id'];
$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

if ($action === 'list') {
  $cat = $_GET['category'] ?? '';
  $q = $_GET['q'] ?? '';
  $sql = 'SELECT i.*, c.name AS category, c.slug FROM items i JOIN categories c ON c.id=i.category_id WHERE i.user_id=?';
  $params = [$uid];
  if ($cat) { $sql .= ' AND c.slug=?'; $params[] = $cat; }
  if ($q)   { $sql .= ' AND i.name LIKE ?'; $params[] = "%$q%"; }
  $sql .= ' ORDER BY i.created_at DESC';
  $st = $pdo->prepare($sql); $st->execute($params);
  json_out(['ok'=>true,'items'=>$st->fetchAll()]);
}

if ($action === 'categories') {
  $st = $pdo->query('SELECT * FROM categories ORDER BY name');
  json_out(['ok'=>true,'categories'=>$st->fetchAll()]);
}

if ($action === 'add') {
  $name = clean($_POST['name'] ?? '');
  $cat  = (int)($_POST['category_id'] ?? 0);
  $color = clean($_POST['color'] ?? '');
  $style = clean($_POST['style_tag'] ?? '');
  if (!$name || !$cat || !isset($_FILES['image'])) json_out(['ok'=>false,'msg'=>'Missing fields']);
  $f = $_FILES['image'];
  if ($f['error'] !== 0) json_out(['ok'=>false,'msg'=>'Upload failed']);
  $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
  if (!in_array($ext,['jpg','jpeg','png','webp','gif'])) json_out(['ok'=>false,'msg'=>'Bad file type']);
  $fname = uniqid('itm_').'.'.$ext;
  move_uploaded_file($f['tmp_name'], UPLOAD_DIR.$fname);
  $url = UPLOAD_URL.$fname;
  $st = $pdo->prepare('INSERT INTO items (user_id,category_id,name,color,style_tag,image) VALUES (?,?,?,?,?,?)');
  $st->execute([$uid,$cat,$name,$color,$style,$url]);
  json_out(['ok'=>true,'id'=>$pdo->lastInsertId(),'image'=>$url]);
}

if ($action === 'delete') {
  $id = (int)($_POST['id'] ?? 0);
  $st = $pdo->prepare('DELETE FROM items WHERE id=? AND user_id=?');
  $st->execute([$id,$uid]);
  json_out(['ok'=>true]);
}

json_out(['ok'=>false,'msg'=>'Unknown action']);
