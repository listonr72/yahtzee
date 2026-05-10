# Simple HTTP server for Yahtzee scorecard
# Run: powershell -ExecutionPolicy Bypass -File serve.ps1

$port = 8080
$root = $PSScriptRoot

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
} catch {
    Write-Host "Could not start on port $port (try running as Administrator, or change port)" -ForegroundColor Red
    exit
}

$localIP = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.PrefixOrigin -ne 'WellKnown' -and $_.IPAddress -ne '127.0.0.1' } |
    Select-Object -First 1).IPAddress

Write-Host ""
Write-Host "  Yahtzee server running!" -ForegroundColor Green
Write-Host ""
Write-Host "  Open on this laptop : http://localhost:$port" -ForegroundColor Cyan
if ($localIP) {
    Write-Host "  Open on your phone  : http://$($localIP):$port" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Press Ctrl+C to stop"
Write-Host ""

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css'
    '.js'   = 'application/javascript'
    '.png'  = 'image/png'
    '.ico'  = 'image/x-icon'
}

while ($listener.IsListening) {
    try {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response

        $path = $req.Url.LocalPath
        if ($path -eq '/') { $path = '/index.html' }

        $filePath = Join-Path $root $path.TrimStart('/')

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath)
            $mime = if ($mimeTypes[$ext]) { $mimeTypes[$ext] } else { 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.ContentType = $mime
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "  200  $($req.Url.LocalPath)" -ForegroundColor DarkGray
        } else {
            $res.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $path")
            $res.OutputStream.Write($msg, 0, $msg.Length)
            Write-Host "  404  $($req.Url.LocalPath)" -ForegroundColor DarkYellow
        }

        $res.OutputStream.Close()
    } catch [System.Net.HttpListenerException] {
        break
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}

$listener.Stop()
