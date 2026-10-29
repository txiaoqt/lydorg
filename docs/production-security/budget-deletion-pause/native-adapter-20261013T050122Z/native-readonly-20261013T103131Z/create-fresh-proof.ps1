$ErrorActionPreference='Stop'
$taskState='C:\Users\Christopher x Angel\.ytrace-production-budget-deletion-pause'
$taskActive=Join-Path $taskState 'control-plane-proof.json'
$taskHelper=Join-Path $PSScriptRoot '..\operation-acl.ps1'
try{
  $expected=@('control-plane-proof-history-0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.json','control-plane-proof-history-2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf.json') | Sort-Object
  $names=@(Get-ChildItem -LiteralPath $taskState -Force | ForEach-Object {$_.Name}) | Sort-Object
  if(($names -join ',') -ne ($expected -join ',')){throw 'UNEXPECTED_POST_ARCHIVE_OPERATOR_STATE'}
  if(Test-Path -LiteralPath $taskActive){throw 'ACTIVE_PROOF_ALREADY_EXISTS'}
  foreach($name in $expected){if((Get-FileHash -LiteralPath (Join-Path $taskState $name) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $name.Substring(28,64)){throw 'ARCHIVE_HASH_CHANGED'}}
  $acl=& powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $taskHelper -Action Verify -Path $taskState
  if($LASTEXITCODE -ne 0){throw 'PROOF_ROOT_ACL_FAILED'}
  $source=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'control-plane-evidence.json') -Raw | ConvertFrom-Json
  if($source.project -ne 'mqqaykksadotbrghbexz' -or $source.host -ne 'db.mqqaykksadotbrghbexz.supabase.co' -or $source.status -ne 'ACTIVE_HEALTHY' -or $source.verifiedVia -ne 'supabase-control-plane-get-project'){throw 'FRESH_CONTROL_PLANE_IDENTITY_MISMATCH'}
  $age=([DateTimeOffset]::UtcNow-[DateTimeOffset]::Parse([string]$source.verifiedAt)).TotalSeconds
  if($age -lt 0 -or $age -gt 300){throw 'FRESH_CONTROL_PLANE_PROOF_EXPIRED'}
  $proof=[ordered]@{project=$source.project;host=$source.host;status=$source.status;verifiedVia=$source.verifiedVia;verifiedAt=$source.verifiedAt}
  $bytes=[Text.Encoding]::UTF8.GetBytes(($proof | ConvertTo-Json -Compress)+"`n")
  $stream=[IO.File]::Open($taskActive,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)}finally{$stream.Dispose()}
  $hasher=[Security.Cryptography.SHA256]::Create()
  try{$expectedHash=([BitConverter]::ToString($hasher.ComputeHash($bytes))).Replace('-','').ToLowerInvariant()}finally{$hasher.Dispose()}
  if((Get-FileHash -LiteralPath $taskActive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash -or (Get-Item -LiteralPath $taskActive).Length -ne $bytes.Length){throw 'FRESH_PROOF_INTEGRITY_MISMATCH'}
  $acl=& powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $taskHelper -Action Verify -Path $taskActive
  if($LASTEXITCODE -ne 0){throw 'FRESH_PROOF_ACL_FAILED'}
  $verification=[ordered]@{status='PASS';project=$proof.project;host=$proof.host;proofSha256=$expectedHash;proofBytes=$bytes.Length;proofAgeSeconds=([DateTimeOffset]::UtcNow-[DateTimeOffset]::Parse([string]$source.verifiedAt)).TotalSeconds;createNewUsed=$true;activeProofAclVerified=$true;bothArchivesPreserved=$true;installationStateCreated=$false;verifiedAt=[DateTime]::UtcNow.ToString('o')}
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot 'fresh-proof-verification.json'),($verification | ConvertTo-Json -Depth 5)+"`n",[Text.UTF8Encoding]::new($false))
  $verification | ConvertTo-Json -Compress
}catch{
  $code=if($_.Exception.Message -match '^[A-Z0-9_]+$'){$_.Exception.Message}else{'FRESH_PROOF_LOCAL_OPERATION_FAILED'}
  [ordered]@{status='BLOCKED';code=$code;automaticRetries=0;databaseConnectionAttempted=$false} | ConvertTo-Json -Compress
  exit 2
}
