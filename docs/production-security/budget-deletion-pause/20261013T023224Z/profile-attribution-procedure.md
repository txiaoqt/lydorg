# Minimum additional evidence for profile attribution

Status: **BLOCKED — independent operator attribution is not established.** The read-only comparison confirms all original 92 full rows unchanged and one added pending profile belonging to an existing Google-linked `youth` user. That is a legitimate workflow shape; timing alone does not identify the operator.

The minimum missing evidence is a trusted, operator-attested match of the operator's **own existing Google Auth user UUID** to the added profile's owner. No password, session token, Supabase key, email, name, cookie or new login is needed.

1. Privately identify your own existing Google Auth user in the authorized Supabase production dashboard's Auth Users view. Confirm it is your own account using information already known to you. Do not select an account merely because its timestamps match this report.
2. Copy only its Auth **user UUID**. Do not copy a token, password, API key or Network header. Do not send the UUID or identifying information in chat.
3. Run the following **optional local-only** PowerShell block in your trusted terminal. It prompts invisibly, compares SHA-256 in memory against the independently read production owner fingerprint, and prints only MATCH / NO_MATCH / INPUT_INVALID. It performs no network request and writes no file. Do not put the UUID in the command text or arguments.

```powershell
& {
    $ytraceOwnerPtr = [IntPtr]::Zero
    $ytraceOwnerBytes = $null
    $ytraceOwnerHasher = $null
    try {
        $ytraceOwnerSecure = Read-Host 'Your OWN existing Google Auth user UUID (hidden; not a token)' -AsSecureString
        $ytraceOwnerPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($ytraceOwnerSecure)
        $ytraceOwnerText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ytraceOwnerPtr)
        $ytraceOwnerGuid = [Guid]::ParseExact($ytraceOwnerText.Trim(), 'D')
        $ytraceOwnerBytes = [Text.Encoding]::UTF8.GetBytes($ytraceOwnerGuid.ToString('D').ToLowerInvariant())
        $ytraceOwnerHasher = [Security.Cryptography.SHA256]::Create()
        $ytraceOwnerHash = [BitConverter]::ToString($ytraceOwnerHasher.ComputeHash($ytraceOwnerBytes)).Replace('-', '').ToLowerInvariant()
        if ($ytraceOwnerHash -ceq 'dc239fb97d3966e4b35d4c4d913e3ad7387a434aea5492055771bd7fdf72ba02') {
            'MATCH'
        } else {
            'NO_MATCH'
        }
    } catch {
        'INPUT_INVALID'
    } finally {
        if ($ytraceOwnerPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ytraceOwnerPtr) }
        if ($ytraceOwnerBytes) { [Array]::Clear($ytraceOwnerBytes, 0, $ytraceOwnerBytes.Length) }
        if ($ytraceOwnerHasher) { $ytraceOwnerHasher.Dispose() }
        if ($ytraceOwnerSecure) { $ytraceOwnerSecure.Dispose() }
        $ytraceOwnerText = $null
        $ytraceOwnerHash = $null
    }
}
```

The fingerprint is pseudonymous evidence, not an authentication credential. Managed strings can temporarily exist in process memory; the block does not claim complete memory erasure. It does not read browser storage or acquire a session. This optional block was prepared for operator use and has **not been run against the operator's identity**.

4. Report only the result plus the attestation: “This was my own existing Google Auth account, and I completed its organization profile during the candidate UAT.” MATCH plus that independently obtained identity evidence can resolve attribution. NO_MATCH/INPUT_INVALID leaves it unresolved; do not edit/recreate the profile or silently adopt a new baseline.

Do not adopt a full preservation baseline from this match alone. The previously recorded mutable-inventory differences and fresh exclusive-window preservation checks remain separate reviews.
