<?php
require_once __DIR__ . '/config.php';
header('Content-Type: application/json');
$city = $_GET['city'] ?? 'London';

if (WEATHER_API_KEY) {
  $url = 'https://api.openweathermap.org/data/2.5/weather?q='.urlencode($city).'&units=metric&appid='.WEATHER_API_KEY;
  $r = @file_get_contents($url);
  if ($r) { echo $r; exit; }
}
// Fallback mock
$conditions = ['hot','cold','rain','mild'];
$c = $conditions[array_rand($conditions)];
$temp = ['hot'=>30,'cold'=>6,'rain'=>15,'mild'=>22][$c];
echo json_encode(['name'=>$city,'main'=>['temp'=>$temp],'weather'=>[['main'=>ucfirst($c),'description'=>$c.' weather']],'mock'=>true,'condition'=>$c]);
