# Authorized single DOC-01 signing/download only. No token file or new login.
$ErrorActionPreference='Stop'
$secret=$null; $pointer=[IntPtr]::Zero; $child=$null; $writer=$null; $tokenText=$null; $inputJson=$null
$started=$false
$phase='LOCAL_SAFETY_CHECKS'
try {
    $repository=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
    $privateDirectory=Join-Path $repository '.agent/security/production-gateway-acceptance'
    $candidateFile=Join-Path $privateDirectory 'candidates.local.json'
    $nativeEnv=Join-Path $repository '.env.foundation.local'
    $operatorSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    foreach($path in @($privateDirectory,$candidateFile,$nativeEnv)) {
        if(!(Test-Path -LiteralPath $path)){throw 'LOCAL_INPUT_MISSING'}
        $acl=Get-Acl -LiteralPath $path
        if($path -eq $privateDirectory -and !$acl.AreAccessRulesProtected){throw 'PRIVATE_DIRECTORY_UNPROTECTED'}
        if($acl.Access.Count -ne 2){throw 'PRIVATE_INPUT_ACL_INVALID'}
        foreach($entry in $acl.Access) {
            $sid=$entry.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
            $allowed=@($operatorSid,'S-1-5-18')
            if($path -eq $nativeEnv){$allowed+= 'S-1-5-32-544'}
            if($sid -notin $allowed -or $entry.AccessControlType -ne 'Allow'){throw 'PRIVATE_INPUT_ACL_INVALID'}
        }
    }
    foreach($name in @('positive-attempt-started.local.json','positive-acceptance-receipt.local.json','positive-operation.lock.local.json')) {
        if(Test-Path -LiteralPath (Join-Path $privateDirectory $name)){throw 'PREVIOUS_OR_ACTIVE_ATTEMPT_EXISTS'}
    }
    Push-Location -LiteralPath $repository
    try {
        foreach($name in @('.env.foundation.local','.agent/security/production-gateway-acceptance/candidates.local.json')) {
            & git -c core.fsmonitor=false check-ignore --quiet -- $name
            if($LASTEXITCODE -ne 0){throw 'PRIVATE_INPUT_NOT_IGNORED'}
            $tracked=@(& git -c core.fsmonitor=false ls-files -- $name)
            if($LASTEXITCODE -ne 0 -or $tracked.Count -ne 0){throw 'PRIVATE_INPUT_TRACKED'}
        }
    } finally {Pop-Location}
    $phase='EXISTING_SESSION_INPUT'
    $expiry=Read-Host 'Actual expiresAt of your EXISTING production Admin session'
    $parsed=[DateTimeOffset]::MinValue
    if(![DateTimeOffset]::TryParse($expiry,[ref]$parsed) -or $parsed -le [DateTimeOffset]::UtcNow){throw 'SESSION_EXPIRY_INVALID'}
    Write-Host 'Authorized scope: DOC-01; one signing request; one in-memory download; no independent expected hash.'
    $secret=Read-Host 'Your OWN existing production Admin sessionToken (hidden)' -AsSecureString
    if($secret.Length -eq 0){throw 'SESSION_INPUT_MISSING'}
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $tokenText=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $inputJson=@{candidateLabel='DOC-01';expectedSha256='';sessionExpiresAt=$expiry;sessionToken=$tokenText} | ConvertTo-Json -Compress
    $phase='STARTING_RESTRICTED_CHILD'
    $start=[Diagnostics.ProcessStartInfo]::new()
    $start.FileName=(Get-Command node -ErrorAction Stop).Source
    $runner=Join-Path $repository 'scripts/security/run-production-gateway-acceptance.mjs'
    $start.Arguments='--env-file="'+$nativeEnv+'" "'+$runner+'" --run-once'
    $start.WorkingDirectory=$repository
    $start.UseShellExecute=$false; $start.CreateNoWindow=$true
    $start.RedirectStandardInput=$true; $start.RedirectStandardOutput=$true; $start.RedirectStandardError=$true
    $start.EnvironmentVariables.Remove('NODE_OPTIONS')
    $child=[Diagnostics.Process]::new(); $child.StartInfo=$start
    $null=$child.Start(); $started=$true
    $outputTask=$child.StandardOutput.ReadToEndAsync()
    $errorTask=$child.StandardError.ReadToEndAsync()
    $writer=[IO.StreamWriter]::new($child.StandardInput.BaseStream,[Text.UTF8Encoding]::new($false))
    $writer.WriteLine($inputJson); $writer.Dispose(); $writer=$null
    $tokenText=$null; $inputJson=$null
    $phase='AWAITING_RESULT'
    if(!$child.WaitForExit(180000)){Write-Host 'RESULT PENDING: do not rerun. Preserve the process, attempt marker and receipt.';exit 2}
    # Print only allowlisted fields from the sanitized runner summary, never raw stderr.
    $allowed=@('status','reason','project','candidateLabel','signingRequests','downloadRequests','sessionValidation',
        'authorizedSigning','authorizedDownload','signingHTTP','downloadHTTP','downloadedBytes',
        'independentContentHashComparison','permissionSpecificDenial','receiptWritten','receiptWriteFailed',
        'gatewayRequests','downloads','attemptMarkerCreated')
    $blockedBeforeSigning=$false
    foreach($line in ($outputTask.Result -split "`r?`n")) {
        if(!$line.Trim()){continue}
        try {
            $record=$line | ConvertFrom-Json
            if($record.status -eq 'BLOCKED' -and $record.signingRequests -eq 0 -and $record.downloadRequests -eq 0){$blockedBeforeSigning=$true}
            $safe=[ordered]@{}
            foreach($key in $allowed){if($record.PSObject.Properties[$key]){$safe[$key]=$record.$key}}
            if($safe.Count -gt 0){Write-Host ($safe | ConvertTo-Json -Compress)}
        } catch {Write-Host 'Unrecognized child output suppressed. Do not rerun; inspect the sanitized receipt.'}
    }
    if($child.ExitCode -ne 0){
        if($blockedBeforeSigning){Write-Host 'STOPPED before signing. No attempt marker was created. Resolve the reported input/preflight issue before any manual rerun.'}
        else{Write-Host 'STOPPED. Do not automatically retry. Preserve the sanitized receipt and attempt marker.'}
        exit 2
    }
    Write-Host 'Finished. Keep the receipt for independent verification. No frontend deployment is authorized.'
} catch {
    if($started){Write-Host 'STOP: child execution outcome requires receipt inspection. Do not rerun.'}
    else{
        $reason='LOCAL_PREPARATION_FAILED'
        $allowlisted=@('LOCAL_INPUT_MISSING','PRIVATE_DIRECTORY_UNPROTECTED','PRIVATE_INPUT_ACL_INVALID',
            'PREVIOUS_OR_ACTIVE_ATTEMPT_EXISTS','PRIVATE_INPUT_NOT_IGNORED','PRIVATE_INPUT_TRACKED',
            'SESSION_EXPIRY_INVALID','SESSION_INPUT_MISSING')
        if($_.Exception.Message -in $allowlisted){$reason=$_.Exception.Message}
        Write-Host ('BLOCKED before execution. Phase: '+$phase+'; reason: '+$reason)
    }
    exit 2
} finally {
    $tokenText=$null;$inputJson=$null
    if($writer){try{$writer.Dispose()}catch{}}
    if($pointer -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
    if($secret){$secret.Dispose()}
    if($child){$child.Dispose()}
}
