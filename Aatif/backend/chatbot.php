<?php
/**
 * Finesse — AI Chatbot Endpoint
 * Place this file at:  Aatif/backend/chatbot.php
 *
 * Calls Anthropic Claude API for intelligent, context-aware fashion advice.
 * Falls back gracefully to keyword replies if no API key is set.
 *
 * POST params:
 *   message  (string) — user message text
 *
 * Response JSON:
 *   { ok: true,  reply: "...", history_len: N }
 *   { ok: false, msg: "..." }
 */

session_start();
require_once __DIR__ . '/db.php';      // gives us json_out() & clean()
require_once __DIR__ . '/config.php';  // gives us ANTHROPIC_API_KEY

header('Content-Type: application/json');

/* ── guard ────────────────────────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['ok' => false, 'msg' => 'POST only']);
}

$message = trim($_POST['message'] ?? '');
if ($message === '') {
    json_out(['ok' => false, 'msg' => 'Empty message']);
}
if (mb_strlen($message) > 500) {
    json_out(['ok' => false, 'msg' => 'Message too long (max 500 chars)']);
}

/* ── conversation history (per session, max 10 turns) ──────────
   Each turn: ['role' => 'user'|'assistant', 'content' => '...']  */
if (!isset($_SESSION['chat_history']) || !is_array($_SESSION['chat_history'])) {
    $_SESSION['chat_history'] = [];
}

// Add the new user turn
$_SESSION['chat_history'][] = ['role' => 'user', 'content' => $message];

// Keep only the last 10 turns (5 exchanges) to save tokens
$history = array_slice($_SESSION['chat_history'], -10);

/* ── system prompt ─────────────────────────────────────────────── */
$system = <<<PROMPT
You are FINESSE — a sophisticated, luxury AI fashion stylist and wardrobe concierge for the Finesse platform (a premium digital wardrobe & outfit planning app).

Your personality:
- Warm, witty, and elegantly confident — like a Parisian personal stylist
- Knowledgeable about fashion, color theory, dress codes, and seasonal trends
- Concise: 1–3 sentences per reply unless the user asks for a detailed breakdown

Your job is to help users with:
1. Outfit suggestions and styling advice tailored to their wardrobe
2. Weather-appropriate clothing (e.g. "It's 8°C — layer a structured coat over a knit")
3. Color harmony and combination tips (reference the palette: black, ivory, beige, gold, gray, navy)
4. How to use Finesse features:
   - Closet → upload & tag pieces
   - Diva Studio → drag-and-drop outfit builder on a mannequin
   - Planner → calendar + live weather outfit scheduling
   - Dashboard → AI picks & outfit history
5. Style principles (capsule wardrobes, silhouette balance, occasion dressing)

Platform context: Users have a digital closet categorised into Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories, Jewelry, Handbags, Jumpsuits, Swimsuits, Sets.

Rules:
- NEVER go off-topic (no coding, politics, medical, etc.) — gracefully redirect to fashion/styling
- If unsure, ask one clarifying question about the user's wardrobe or occasion
- Use a fashion emoji occasionally (✨👗🧥👠👜) — never overdo it
- Address the user warmly but not excessively (no "absolutely!" or "great question!")
PROMPT;

/* ── call Anthropic API ─────────────────────────────────────────── */
$apiKey = defined('ANTHROPIC_API_KEY') ? ANTHROPIC_API_KEY : '';

if (!empty($apiKey)) {

    $payload = json_encode([
        'model'      => 'claude-sonnet-4-20250514',
        'max_tokens' => 300,
        'system'     => $system,
        'messages'   => $history,
    ]);

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01',
        ],
    ]);

    $raw      = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($raw && $httpCode === 200) {
        $res   = json_decode($raw, true);
        $reply = $res['content'][0]['text'] ?? null;

        if ($reply) {
            // Store assistant reply in history
            $_SESSION['chat_history'][] = ['role' => 'assistant', 'content' => $reply];
            json_out([
                'ok'          => true,
                'reply'       => $reply,
                'history_len' => count($_SESSION['chat_history']),
            ]);
        }
    }

    // If we reach here the API call failed — fall through to keyword fallback
    error_log("Finesse chatbot API error — HTTP $httpCode | cURL: $curlErr");
}

/* ── keyword fallback (no API key or API error) ──────────────────── */
$reply = keywordReply($message);
$_SESSION['chat_history'][] = ['role' => 'assistant', 'content' => $reply];
json_out([
    'ok'          => true,
    'reply'       => $reply,
    'history_len' => count($_SESSION['chat_history']),
    'fallback'    => true,
]);


/* ─────────────────────────────────────────────────────────────────
   Keyword fallback function
   ──────────────────────────────────────────────────────────────── */
function keywordReply(string $msg): string
{
    $t = mb_strtolower($msg);

    // Greetings
    if (preg_match('/\b(hi|hello|hey|good morning|good evening|bonjour)\b/', $t))
        return "Hello, darling — welcome to your Finesse atelier. What are we styling today? ✨";

    // Weather / temperature
    if (preg_match('/\b(weather|rain|cold|hot|warm|freezing|sunny|windy|snow)\b/', $t))
        return "Head to the Planner — it reads live weather and suggests the perfect look for your city. ☂️";

    // Outfit / suggestion / recommendation
    if (preg_match('/\b(outfit|suggest|recommend|wear|style|look|combination)\b/', $t))
        return "Open Diva Studio to compose a look, or hit ✦ Random Look in the Planner for an instant AI pick. 👗";

    // Color advice
    if (preg_match('/\b(color|colour|match|pair|palette|tone)\b/', $t))
        return "Ivory pairs beautifully with black or champagne gold — a classic Finesse palette. Try building around one neutral anchor piece. 🎨";

    // Upload / add items
    if (preg_match('/\b(upload|add|photo|picture|item|piece|closet)\b/', $t))
        return "Go to Closet → '+ Add Piece', upload a photo and tag category & color — your archive builds itself. 📸";

    // Planner
    if (preg_match('/\b(plan|calendar|schedule|date|event|tomorrow|week)\b/', $t))
        return "The Planner lets you assign outfits to calendar dates and adapts suggestions to live weather. 📅";

    // Trends
    if (preg_match('/\b(trend|season|vogue|fashion|2025|2026)\b/', $t))
        return "This season leans into quiet luxury — structured neutrals, clean silhouettes, and one statement accessory. Let your closet do the talking. 👑";

    // Occasion dressing
    if (preg_match('/\b(wedding|formal|work|office|casual|party|dinner|interview)\b/', $t))
        return "For occasion dressing, tell me the dress code and I'll guide you to the right pieces from your closet. What's the event?";

    // Thanks
    if (preg_match('/\b(thanks|thank you|merci|appreciate)\b/', $t))
        return "Always a pleasure. Stay finessed. ✨";

    // Compliment
    if (preg_match('/\b(great|amazing|love|best|perfect|good)\b/', $t))
        return "You have impeccable taste — that's why you're here. Anything else I can help you compose? 👗";

    // Default
    return "I'm Finesse — your personal AI stylist. Ask me about outfit ideas, color pairings, occasion dressing, or how to use the studio. ✨";
}
 