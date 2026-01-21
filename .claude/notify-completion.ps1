# Claude Code Completion Notification dlya Telegram
# Etot skript otpravlyaet uvedomlenie kogda Claude zavershil zadachu

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

    # Otpravlyaem uvedomlenie cherez nash notify.ps1
    $notifyScript = "D:\DEV\AI_Workspace\notify.ps1"
    $message = "Работа выполнена!"

    & powershell.exe -ExecutionPolicy Bypass -File $notifyScript -Project $projectName -Message $message -Type "success"

    exit 0
}
catch {
    # Logiruyem oshibku
    $_ | Out-File "D:\DEV\AI_Workspace\.claude\hook-error.log" -Encoding UTF8
    exit 0  # Ne preryvaem rabotu Claude
}
