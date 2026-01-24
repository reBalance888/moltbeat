# Claude Code Completion Notification для Telegram - PPhavchik Bot
# Отправляет уведомление когда Claude завершил задачу

# Читаем JSON от Claude
$hookInput = [Console]::In.ReadToEnd()

try {
    # Логируем то что получили (для отладки)
    $hookInput | Out-File "D:\DEV\AI_Workspace\.claude\hook-debug-pphavchik.log" -Encoding UTF8

    # Читаем конфигурацию (token i chat_id)
    $configPath = "D:\DEV\AI_Workspace\.notify-config"

    if (Test-Path $configPath) {
        $config = Get-Content $configPath | Where-Object { $_ -notmatch '^#' -and $_ -match '=' }
        $botToken = ($config | Where-Object { $_ -match 'TELEGRAM_BOT_TOKEN' }) -replace 'TELEGRAM_BOT_TOKEN=', ''
        $chatId = ($config | Where-Object { $_ -match 'TELEGRAM_CHAT_ID' }) -replace 'TELEGRAM_CHAT_ID=', ''

        # Формируем сообщение
        $emoji = [char]::ConvertFromUtf32(0x2705)  # зелёная галочка
        $telegramMessage = "$emoji <b>PPhavchik</b>`n`nJob's done!"

        # Отправляем в Telegram
        $apiUrl = "https://api.telegram.org/bot$botToken/sendMessage"
        $body = @{
            chat_id = $chatId
            text = $telegramMessage
            parse_mode = "HTML"
        } | ConvertTo-Json

        Invoke-RestMethod -Uri $apiUrl -Method Post -Body $body -ContentType "application/json; charset=utf-8" | Out-Null
    }

    exit 0
}
catch {
    # Логируем ошибку
    $_ | Out-File "D:\DEV\AI_Workspace\.claude\hook-error-pphavchik.log" -Encoding UTF8
    exit 0  # Не прерываем работу Claude
}
