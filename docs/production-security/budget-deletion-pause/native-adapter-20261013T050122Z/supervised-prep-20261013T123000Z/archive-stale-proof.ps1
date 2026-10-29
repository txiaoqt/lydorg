$ErrorActionPreference='Stop'
$taskState='C:\Users\Christopher x Angel\.ytrace-production-budget-deletion-pause'
$taskActiveHash='79a508950d5a04eda66634e9ef8bb17eb51756abdcd979b6b996866a9077ced1'
$taskPreserved=@('control-plane-proof-history-0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd.json','control-plane-proof-history-2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf.json','preflight-20261013T104229359Z-a0bcdc9b-9465-4b70-8cbd-ae2f9a76058e.json')
$taskPreservedHashes=@('0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd','2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf','6e5869fcde18f45edfef0ba0a9709d4d0530204d89c6dfd548f55dc719dece81')
$taskDestinationName='control-plane-proof-history-'+$taskActiveHash+'.json'
$taskActive=Join-Path $taskState 'control-plane-proof.json'
$taskDestination=Join-Path $taskState $taskDestinationName
$taskHelper=Join-Path $PSScriptRoot '..\operation-acl.ps1'
$taskRenamed=$false
function Get-StateMetadata([string]$LiteralPath){
  $item=Get-Item -LiteralPath $LiteralPath -Force
  if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'OPERATOR_STATE_REPARSE_POINT'}
  $hasher=[Security.Cryptography.SHA256]::Create()
  try{$aclHash=([BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes((Get-Acl -LiteralPath $LiteralPath).Sddl)))).Replace('-','').ToLowerInvariant()}finally{$hasher.Dispose()}
  $hash=if($item.PSIsContainer){$null}else{(Get-FileHash -LiteralPath $LiteralPath -Algorithm SHA256).Hash.ToLowerInvariant()}
  [ordered]@{name=$item.Name;bytes=if($item.PSIsContainer){$null}else{$item.Length};createdAt=$item.CreationTimeUtc.ToString('o');lastWriteAt=$item.LastWriteTimeUtc.ToString('o');lastAccessAt=$item.LastAccessTimeUtc.ToString('o');attributes=$item.Attributes.ToString();aclSha256=$aclHash;sha256=$hash}
}
function Assert-Same($Actual,$Expected){
  foreach($p in @('bytes','attributes','aclSha256','sha256','createdAt','lastWriteAt')){if([string]$Actual[$p] -ne [string]$Expected[$p]){throw 'OPERATOR_PROTECTED_PROPERTY_MISMATCH'}}
}
function Assert-CliAcl([string]$LiteralPath){
  $output=& powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $taskHelper -Action Verify -Path $LiteralPath
  if($LASTEXITCODE -ne 0 -or ($output | ConvertFrom-Json).status -ne 'PASS'){throw 'OPERATOR_EFFECTIVE_ACL_CHECK_FAILED'}
}
try{
  $expectedBefore=(@($taskPreserved)+@('control-plane-proof.json') | Sort-Object) -join ','
  if(((Get-ChildItem -LiteralPath $taskState -Force | ForEach-Object {$_.Name} | Sort-Object) -join ',') -ne $expectedBefore){throw 'UNEXPECTED_OPERATOR_STATE'}
  if(Test-Path -LiteralPath $taskDestination){throw 'ARCHIVE_DESTINATION_ALREADY_EXISTS'}
  $active=Get-StateMetadata $taskActive
  if($active.sha256 -ne $taskActiveHash -or $active.bytes -ne 197){throw 'EXACT_ACTIVE_PROOF_MISMATCH'}
  $preservedBefore=@{};for($i=0;$i -lt 3;$i++){$m=Get-StateMetadata (Join-Path $taskState $taskPreserved[$i]);if($m.sha256 -ne $taskPreservedHashes[$i]){throw 'PRESERVED_FILE_HASH_MISMATCH'};$preservedBefore[$taskPreserved[$i]]=$m}
  # Same directory; two-argument Move rejects an existing destination (non-overwriting).
  [IO.File]::Move($taskActive,$taskDestination)
  $taskRenamed=$true
  $archived=Get-StateMetadata $taskDestination
  $active.name=$taskDestinationName
  Assert-Same $archived $active
  $preservedAfter=foreach($n in $taskPreserved){$m=Get-StateMetadata (Join-Path $taskState $n);Assert-Same $m $preservedBefore[$n];$m}
  if(Test-Path -LiteralPath $taskActive){throw 'ACTIVE_PROOF_UNEXPECTEDLY_PRESENT'}
  $expectedAfter=(@($taskPreserved)+@($taskDestinationName) | Sort-Object) -join ','
  if(((Get-ChildItem -LiteralPath $taskState -Force | ForEach-Object {$_.Name} | Sort-Object) -join ',') -ne $expectedAfter){throw 'POST_ARCHIVE_STATE_MISMATCH'}
  foreach($path in @($taskState,$taskDestination)+@($taskPreserved | ForEach-Object {Join-Path $taskState $_})){Assert-CliAcl $path}
  $out=[ordered]@{status='PASS';renameCount=1;renameOverwroteFile=$false;archived=$archived;preserved=$preservedAfter;contentsCreationWriteOwnershipAclPreserved=$true;lastAccessChangesAccepted=$true;activeProofAbsent=$true;installationStateCreated=$false;verifiedAt=[DateTime]::UtcNow.ToString('o')}
  $bytes=[Text.Encoding]::UTF8.GetBytes(($out | ConvertTo-Json -Depth 8)+"`n")
  $stream=[IO.File]::Open((Join-Path $PSScriptRoot 'archive-verification.json'),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)}finally{$stream.Dispose()}
  [ordered]@{status='PASS';archivalRenameCount=1;archivedSha256=$archived.sha256;historicalFilesPreserved=3;activeProofAbsent=$true;databaseConnectionAttempted=$false} | ConvertTo-Json -Compress
}catch{
  $code=if($_.Exception.Message -match '^[A-Z0-9_]+$'){$_.Exception.Message}else{'LOCAL_PROOF_OPERATION_FAILED'}
  [ordered]@{status='BLOCKED';code=$code;renameReturnedSuccessfully=$taskRenamed;automaticRetries=0;databaseConnectionAttempted=$false} | ConvertTo-Json -Compress
  exit 2
}
