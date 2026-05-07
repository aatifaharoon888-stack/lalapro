<?php
// Finesse — DB config
define('DB_HOST','localhost');
define('DB_NAME','finesse_db');
define('DB_USER','root');
define('DB_PASS','');

define('SITE_URL','http://localhost/finesse');
define('UPLOAD_DIR', __DIR__ . '/../frontend/assets/uploads/');
define('UPLOAD_URL', SITE_URL . '/frontend/assets/uploads/');

if (!file_exists(UPLOAD_DIR)) @mkdir(UPLOAD_DIR, 0777, true);

// Optional: OpenWeather API key
define('WEATHER_API_KEY', '');
