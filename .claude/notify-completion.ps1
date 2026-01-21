# Claude Code Completion Notification dlya Telegram
# Etot skript otpravlyaet uvedomlenie kogda Claude zavershil zadachu

# Ustanavljivaem UTF-8 kodirovu dlya PowerShell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Chitaem JSON ot Claude
$hookInput = [Console]::In.ReadToEnd()

try {
    # Logiruyem to chto poluchili (dlya otladki)
    $hookInput | Out-File "D:\DEV\AI_Workspace\.claude\hook-debug.log" -Encoding UTF8

    # Parsim JSON
    $data = $hookInput | ConvertFrom-Json -ErrorAction Stop

    $sessionId = if ($data.session_id) { $data.session_id } else { "unknown" }
    $cwd = if ($data.cwd) { $data.cwd } else { "D:\DEV\AI_Workspace" }

    # Izvlekaem imya proekta iz puti
    $projectName = Split-Path -Leaf $cwd

    # Chitaem konfig
    $configPath = "D:\DEV\AI_Workspace\.notify-config"
    $config = Get-Content $configPath -Encoding UTF8 | Where-Object { $_ -notmatch '^#' -and $_ -match '=' }
    $botToken = ($config | Where-Object { $_ -match 'TELEGRAM_BOT_TOKEN' }) -replace 'TELEGRAM_BOT_TOKEN=', ''
    $chatId = ($config | Where-Object { $_ -match 'TELEGRAM_CHAT_ID' }) -replace 'TELEGRAM_CHAT_ID=', ''

    # Formiruem soobshchenie
    $emoji = [char]::ConvertFromUtf32(0x2705)
    $telegramMessage = "$emoji <b>$projectName</b>`n`nJob's done!"

    # Otpravlyaem v Telegram napryamuyu
    $apiUrl = "https://api.telegram.org/bot$botToken/sendMessage"
    $body = @{
        chat_id = $chatId
        text = $telegramMessage
        parse_mode = "HTML"
    } | ConvertTo-Json -Depth 10

    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -ContentType "application/json; charset=utf-8"

    exit 0
}
catch {
    # Logiruyem oshibku
    $_ | Out-File "D:\DEV\AI_Workspace\.claude\hook-error.log" -Encoding UTF8
    exit 0  # Ne preryvaem rabotu Claude
}
