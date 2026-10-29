# Local preparation ONLY. No signing, download, login, browser extraction or token file.
param([string]$Candidate)
$ErrorActionPreference = 'Stop'
$secret = $null
$pointer = [IntPtr]::Zero
$child = $null
$tokenText = $null
$inputJson = $null
$inputWriter = $null
$phase = 'LOCAL_INPUT_CHECKS'
try {
    $repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
    $privateDirectory = Join-Path $repository '.agent/security/production-gateway-acceptance'
    $candidateFile = Join-Path $privateDirectory 'candidates.local.json'
    if (!(Test-Path -LiteralPath $candidateFile -PathType Leaf)) { throw 'CANDIDATE_FILE_MISSING' }
    $operatorSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    foreach ($localPath in @($privateDirectory, $candidateFile)) {
        $acl = Get-Acl -LiteralPath $localPath
        if ($localPath -eq $privateDirectory -and !$acl.AreAccessRulesProtected) { throw 'PRIVATE_DIRECTORY_ACL_UNPROTECTED' }
        if ($acl.Access.Count -ne 2) { throw 'PRIVATE_INPUT_ACL_INVALID' }
        foreach ($entry in $acl.Access) {
            $sid = $entry.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
            if ($sid -notin @($operatorSid, 'S-1-5-18') -or $entry.AccessControlType -ne 'Allow') {
                throw 'PRIVATE_INPUT_ACL_INVALID'
            }
        }
    }
    Push-Location -LiteralPath $repository
    try {
        & git -c core.fsmonitor=false check-ignore --quiet -- '.agent/security/production-gateway-acceptance/candidates.local.json'
        if ($LASTEXITCODE -ne 0) { throw 'PRIVATE_INPUT_NOT_IGNORED' }
        $tracked = @(& git -c core.fsmonitor=false ls-files -- '.agent/security/production-gateway-acceptance')
        if ($LASTEXITCODE -ne 0 -or $tracked.Count -ne 0) { throw 'PRIVATE_INPUT_TRACKED_OR_GIT_CHECK_FAILED' }
    } finally { Pop-Location }
    if (!$Candidate) { $Candidate = Read-Host 'Candidate label you intend to approve (DOC-01, DOC-02 or DOC-03)' }
    if ($Candidate -notmatch '^DOC-0[1-3]$') { throw 'CANDIDATE_LABEL_INVALID' }
    $phase = 'OPERATOR_INPUT'
    $reportedExpiry = Read-Host 'expiresAt from your existing Admin session record (ISO timestamp)'
    $parsedExpiry = [DateTimeOffset]::MinValue
    if (![DateTimeOffset]::TryParse($reportedExpiry, [ref]$parsedExpiry) -or $parsedExpiry -le [DateTimeOffset]::UtcNow) {
        throw 'OPERATOR_REPORTED_SESSION_EXPIRED_OR_INVALID'
    }
    $expectedHash = Read-Host 'Independently trusted expected SHA-256, or Enter if unavailable'
    $secret = Read-Host 'Your OWN existing production Admin sessionToken (hidden; not a password or Supabase JWT)' -AsSecureString
    if ($secret.Length -eq 0) { throw 'SESSION_INPUT_MISSING' }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $tokenText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $inputJson = @{candidateLabel=$Candidate; sessionExpiresAt=$reportedExpiry;
        expectedSha256=$expectedHash; sessionToken=$tokenText} | ConvertTo-Json -Compress
    $phase = 'LOCAL_CHILD_START'
    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = (Get-Command node -ErrorAction Stop).Source
    $scriptPath = Join-Path $repository 'scripts/security/production-gateway-acceptance-inputs.mjs'
    $start.Arguments = '"' + $scriptPath + '" --prepare'
    $start.WorkingDirectory = $repository
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardInput = $true
    # Do not load a parent shell's optional Node preload/debug configuration.
    $start.EnvironmentVariables.Remove('NODE_OPTIONS')
    $child = [Diagnostics.Process]::new()
    $child.StartInfo = $start
    $null = $child.Start()
    $phase = 'LOCAL_SECRET_PIPE'
    # Windows PowerShell 5.1 lacks ProcessStartInfo.StandardInputEncoding.
    # Write explicit UTF-8 through the redirected pipe on both .NET runtimes.
    # Token never enters CLI arguments, environment variables or files.
    $inputWriter = [IO.StreamWriter]::new($child.StandardInput.BaseStream, [Text.UTF8Encoding]::new($false))
    $inputWriter.WriteLine($inputJson)
    $inputWriter.Dispose()
    $inputWriter = $null
    $phase = 'LOCAL_CHILD_VALIDATION'
    if (!$child.WaitForExit(15000)) { $child.Kill(); throw 'LOCAL_PREPARATION_TIMEOUT' }
    if ($child.ExitCode -ne 0) { throw 'LOCAL_PREPARATION_BLOCKED' }
    Write-Host 'Prepared only. No gateway request was sent. Token discarded; re-entry is required for an authorized test.'
} catch {
    # Never print raw exceptions, command inputs, private paths, tokens or inner errors.
    $safeCodes = @('CANDIDATE_FILE_MISSING','PRIVATE_DIRECTORY_ACL_UNPROTECTED','PRIVATE_INPUT_ACL_INVALID',
        'PRIVATE_INPUT_NOT_IGNORED','PRIVATE_INPUT_TRACKED_OR_GIT_CHECK_FAILED','CANDIDATE_LABEL_INVALID',
        'OPERATOR_REPORTED_SESSION_EXPIRED_OR_INVALID','SESSION_INPUT_MISSING',
        'LOCAL_PREPARATION_TIMEOUT','LOCAL_PREPARATION_BLOCKED')
    $safeReason = 'LOCAL_RUNTIME_OR_IO_FAILURE'
    if ($_.Exception.Message -cin $safeCodes) { $safeReason = $_.Exception.Message }
    Write-Host "BLOCKED [$phase / $safeReason]. No gateway request was sent."
    exit 2
} finally {
    $tokenText = $null
    $inputJson = $null
    if ($inputWriter) { try { $inputWriter.Dispose() } catch {} }
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if ($secret) { $secret.Dispose() }
    if ($child) { $child.Dispose() }
}
