<?php
/**
 * Relevo de correo para Tío Wheels.
 *
 * Railway no logra conectarse a los puertos de correo del hosting (465 y 587 dan
 * tiempo de espera agotado), así que la tienda le pide a este archivo que envíe
 * el correo desde el propio servidor, por HTTPS. Exim del cPanel lo despacha
 * localmente, con el SPF y el DKIM del dominio ya configurados.
 *
 * Instalación:
 *   1. Cambia SECRETO por una clave larga e inventada (la misma que va en Railway).
 *   2. Sube este archivo al cPanel, en public_html, con el nombre correo.php
 *   3. En Railway agrega:
 *        MAIL_RELAY_URL    = https://tiowheels.cl/correo.php
 *        MAIL_RELAY_SECRET = la misma clave
 *
 * Comprobación rápida (no envía nada):
 *   curl -H "X-Tw-Secreto: LA_CLAVE" https://tiowheels.cl/correo.php
 */

declare(strict_types=1);

const SECRETO   = 'CAMBIA-ESTA-CLAVE-POR-UNA-LARGA';
const REMITENTE = 'info@tiowheels.cl';
const NOMBRE    = 'Tío Wheels';
const RESPONDER = 'contacto@tiowheels.cl';
const MAX_BYTES = 512000; // 500 KB de cuerpo: de sobra para un correo con HTML

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

function salir(int $codigo, array $datos): void {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

// La clave viaja en una cabecera; si no calza, no se hace nada.
$enviada = $_SERVER['HTTP_X_TW_SECRETO'] ?? '';
if (SECRETO === 'CAMBIA-ESTA-CLAVE-POR-UNA-LARGA') {
    salir(503, ['ok' => false, 'error' => 'Falta configurar la clave en correo.php']);
}
if (!is_string($enviada) || !hash_equals(SECRETO, $enviada)) {
    salir(401, ['ok' => false, 'error' => 'No autorizado']);
}

// GET = comprobación de que el archivo está arriba y responde
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    salir(200, ['ok' => true, 'listo' => true, 'remitente' => REMITENTE, 'php' => PHP_VERSION]);
}

$crudo = file_get_contents('php://input', false, null, 0, MAX_BYTES + 1);
if ($crudo === false || strlen($crudo) > MAX_BYTES) {
    salir(413, ['ok' => false, 'error' => 'Cuerpo demasiado grande']);
}
$datos = json_decode($crudo, true);
if (!is_array($datos)) {
    salir(400, ['ok' => false, 'error' => 'JSON inválido']);
}

$para    = trim((string)($datos['to'] ?? ''));
$asunto  = trim((string)($datos['subject'] ?? ''));
$html    = (string)($datos['html'] ?? '');
$texto   = (string)($datos['text'] ?? '');
$responder = trim((string)($datos['replyTo'] ?? RESPONDER));

if (!filter_var($para, FILTER_VALIDATE_EMAIL)) {
    salir(400, ['ok' => false, 'error' => 'Destinatario inválido']);
}
if (!filter_var($responder, FILTER_VALIDATE_EMAIL)) {
    $responder = RESPONDER;
}
if ($asunto === '' || ($html === '' && $texto === '')) {
    salir(400, ['ok' => false, 'error' => 'Falta asunto o contenido']);
}
// Un asunto con saltos de línea permite inyectar cabeceras: se limpia.
$asunto = str_replace(["\r", "\n"], ' ', $asunto);

$limite = '=_tw_' . bin2hex(random_bytes(12));
$cabeceras = implode("\r\n", [
    'From: =?UTF-8?B?' . base64_encode(NOMBRE) . '?= <' . REMITENTE . '>',
    'Reply-To: ' . $responder,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' . $limite . '"',
    'X-Mailer: tiowheels-relay',
]);

if ($texto === '') {
    $texto = trim(html_entity_decode(strip_tags(preg_replace('/<(br|\/p|\/div|\/tr)[^>]*>/i', "\n", $html) ?? $html), ENT_QUOTES, 'UTF-8'));
}

$cuerpo = "--$limite\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($texto)) . "\r\n"
        . "--$limite\r\n"
        . "Content-Type: text/html; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($html !== '' ? $html : nl2br(htmlspecialchars($texto)))) . "\r\n"
        . "--$limite--";

$asuntoCodificado = '=?UTF-8?B?' . base64_encode($asunto) . '?=';
$enviado = mail($para, $asuntoCodificado, $cuerpo, $cabeceras, '-f' . REMITENTE);

if (!$enviado) {
    salir(502, ['ok' => false, 'error' => 'El servidor de correo rechazó el envío']);
}
salir(200, ['ok' => true, 'to' => $para]);
