<?php
/**
 * Finesse — Application Configuration
 * Place this file at:  Aatif/backend/config.php
 *
 * ⚠️  NEVER commit real API keys to version control.
 *     In production, load secrets from environment variables:
 *         define('ANTHROPIC_API_KEY', getenv('ANTHROPIC_API_KEY') ?: '');
 */

/* ── Database ─────────────────────────────────────────────────── */
define('DB_HOST', 'localhost');
define('DB_NAME', 'finesse_db');
define('DB_USER', 'root');
define('DB_PASS', '');

/* ── Site / Upload paths ──────────────────────────────────────── */
define('SITE_URL',    'http://localhost/finesse');
define('UPLOAD_DIR',  __DIR__ . '/../frontend/assets/uploads/');
define('UPLOAD_URL',  SITE_URL . '/frontend/assets/uploads/');

if (!file_exists(UPLOAD_DIR)) {
    @mkdir(UPLOAD_DIR, 0777, true);
}

/* ── External APIs ────────────────────────────────────────────── */

/**
 * OpenWeatherMap API key (optional).
 * Get yours free at: https://openweathermap.org/api
 * Leave empty to use the built-in mock weather data.
 */
define('WEATHER_API_KEY', '');   // e.g. 'abc123def456...'

/**
 * Anthropic API key — powers the Finesse AI chatbot.
 * Get yours at: https://console.anthropic.com
 *
 * HOW TO ADD YOUR KEY:
 *   1. Go to https://console.anthropic.com → API Keys → Create Key
 *   2. Copy the key (starts with "sk-ant-...")
 *   3. Paste it below between the single quotes
 *
 * Leave empty '' to use the keyword-based fallback chatbot.
 */
define('ANTHROPIC_API_KEY', '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');  // ← paste your key here: 'sk-ant-api03-...'
