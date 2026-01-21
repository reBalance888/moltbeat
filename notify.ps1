# Skript otpravki uvedomleniy v Telegram
# Ispolzuetsya dlya uvedomleniy o zavershenii zadach v raznykh proektakh

# Ustanavljivaem UTF-8 kodirovu dlya PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

param(
    [string]$Project = "Claude",
    [string]$Message = "Zadacha vypolnena!",
    [string]$Type = "success"
)

# Chitaem konfiguraciyu (token i chat_id)
$configPath = "D:\DEV\AI_Workspace\.notify-config"

if (-not (Test-Path $configPath)) {
    Write-Error "Konfig fayl ne nayden: $configPath"
    exit 1
}

# Parsim konfig
$config = Get-Content $configPath | Where-Object { $_ -notmatch '^#' -and $_ -match '=' }
$botToken = ($config | Where-Object { $_ -match 'TELEGRAM_BOT_TOKEN' }) -replace 'TELEGRAM_BOT_TOKEN=', ''
$chatId = ($config | Where-Object { $_ -match 'TELEGRAM_CHAT_ID' }) -replace 'TELEGRAM_CHAT_ID=', ''

# Opredelyaem emoji v zavisimosti ot tipa (Unicode kody)
switch ($Type) {
    "success" { $emoji = [char]::ConvertFromUtf32(0x2705) }  # zelenyy galochka
    "warning" { $emoji = [char]::ConvertFromUtf32(0x26A0) + [char]::ConvertFromUtf32(0xFE0F) }  # zheltyy znak
    "error" { $emoji = [char]::ConvertFromUtf32(0x1F525) }  # ogon
    default { $emoji = [char]::ConvertFromUtf32(0x2705) }
}

# Formiruem tekst soobshcheniya dlya Telegram (s formatirovaniem)
$telegramMessage = "$emoji <b>$Project</b>`n`n$Message"

# Otpravlyaem v Telegram cherez Bot API
$apiUrl = "https://api.telegram.org/bot$botToken/sendMessage"

$body = @{
    chat_id = $chatId
    text = $telegramMessage
    parse_mode = "HTML"
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json; charset=utf-8"

    if ($response.ok) {
        Write-Host "Uvedomlenie otpravleno v Telegram!" -ForegroundColor Green
        exit 0
    } else {
        Write-Error "Oshibka otpravki: $($response.description)"
        exit 1
    }
} catch {
    Write-Error "Ne udalos otpravit uvedomlenie: $_"
    exit 1
}
