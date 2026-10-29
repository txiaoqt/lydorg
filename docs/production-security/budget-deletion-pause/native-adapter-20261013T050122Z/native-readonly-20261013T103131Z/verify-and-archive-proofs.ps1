$ErrorActionPreference='Stop'
$taskState='C:\Users\Christopher x Angel\.ytrace-production-budget-deletion-pause'
$taskActiveHash='2c5c494289aec3af41befb52ced87eb962f83e7b8177abd5801dfba079fb66cf'
$taskArchiveHash='0435d3d45351ed5879a40ad3d5e1c3f48b33e2de667e14ac1550bca46dff40fd'
$taskOriginalName='control-plane-proof-history-'+$taskArchiveHash+'.json'
$taskDestinationName='control-plane-proof-history-'+$taskActiveHash+'.json'
$taskActive=Join-Path $taskState 'control-plane-proof.json'
$taskOriginal=Join-Path $taskState $taskOriginalName
$taskDestination=Join-Path $taskState $taskDestinationName
$taskHelper=Join-Path $PSScriptRoot '..\operation-acl.ps1'
$taskRenamed=$false
function Get-StateMetadata([string]$LiteralPath,[bool]$ContentHash=$false){
  $item=Get-Item -LiteralPath $LiteralPath -Force
  if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'OPERATOR_STATE_REPARSE_POINT'}
  $acl=Get-Acl -LiteralPath $LiteralPath
  $hasher=[Security.Cryptography.SHA256]::Create()
  try{$aclHash=([BitConverter]::ToString($hasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($acl.Sddl)))).Replace('-','').ToLowerInvariant()}finally{$hasher.Dispose()}
  $hash=if($ContentHash){(Get-FileHash -LiteralPath $LiteralPath -Algorithm SHA256).Hash.ToLowerInvariant()}else{$null}
  [ordered]@{name=$item.Name;directory=$item.PSIsContainer;bytes=if($item.PSIsContainer){$null}else{$item.Length};createdAt=$item.CreationTimeUtc.ToString('o');lastWriteAt=$item.LastWriteTimeUtc.ToString('o');lastAccessAt=$item.LastAccessTimeUtc.ToString('o');attributes=$item.Attributes.ToString();aclSha256=$aclHash;sha256=$hash}
}
function Assert-StableProperties($Actual,$Expected){
  foreach($property in @('directory','bytes','attributes','aclSha256')){if($Actual[$property] -ne $Expected.$property){throw 'OPERATOR_PROTECTED_PROPERTY_MISMATCH'}}
  foreach($property in @('createdAt','lastWriteAt')){if([DateTimeOffset]::Parse([string]$Actual[$property]).UtcDateTime.Ticks -ne [DateTimeOffset]::Parse([string]$Expected.$property).UtcDateTime.Ticks){throw 'OPERATOR_PROTECTED_TIMESTAMP_MISMATCH'}}
}
function Assert-CliAcl([string]$LiteralPath){
  $output=& powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $taskHelper -Action Verify -Path $LiteralPath
  if($LASTEXITCODE -ne 0){throw 'OPERATOR_EFFECTIVE_ACL_CHECK_FAILED'}
  $result=$output | ConvertFrom-Json
  if($result.status -ne 'PASS' -or $result.effectiveAclVerified -ne $true){throw 'OPERATOR_EFFECTIVE_ACL_CHECK_FAILED'}
}
function Write-NewEvidence([string]$Name,$Value){
  $path=Join-Path $PSScriptRoot $Name
  $bytes=[Text.Encoding]::UTF8.GetBytes(($Value | ConvertTo-Json -Depth 10)+"`n")
  $stream=[IO.File]::Open($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
  try{$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)}finally{$stream.Dispose()}
}
try{
  $actualRoot=[IO.Path]::GetFullPath((Join-Path $env:USERPROFILE '.ytrace-production-budget-deletion-pause'))
  if(-not $actualRoot.Equals($taskState,[StringComparison]::OrdinalIgnoreCase)){throw 'FIXED_OPERATOR_ROOT_MISMATCH'}
  $expectedNames=@($taskOriginalName,'control-plane-proof.json') | Sort-Object
  $children=@(Get-ChildItem -LiteralPath $taskState -Force)
  if((($children.Name | Sort-Object) -join ',') -ne ($expectedNames -join ',')){throw 'UNEXPECTED_OPERATOR_STATE'}
  if(Test-Path -LiteralPath $taskDestination){throw 'ARCHIVE_DESTINATION_ALREADY_EXISTS'}
  $previous=Get-Content -LiteralPath (Join-Path $PSScriptRoot '..\inventory-contract-correction-20261013T091309Z\operator-metadata-after.json') -Raw | ConvertFrom-Json
  $before=@(Get-StateMetadata $taskState;Get-StateMetadata $taskOriginal $true;Get-StateMetadata $taskActive $true)
  foreach($current in $before){$expected=@($previous.properties | Where-Object {$_.name -eq $current.name});if($expected.Count -ne 1){throw 'OPERATOR_REFERENCE_METADATA_MISSING'};Assert-StableProperties $current $expected[0]}
  if($before[1].sha256 -ne $taskArchiveHash -or $before[2].sha256 -ne $taskActiveHash -or $before[1].bytes -ne 200 -or $before[2].bytes -ne 200){throw 'EXACT_PROOF_BYTES_MISMATCH'}
  foreach($path in @($taskState,$taskOriginal,$taskActive)){Assert-CliAcl $path}
  Write-NewEvidence 'operator-state-before.json' ([ordered]@{status='PASS';files=$before;noUnexpectedFiles=$true;authorizationExists=$false;approvedPreflightExists=$false;lockExists=$false;attemptMarkerExists=$false})
  # Same directory; the two-argument Move rejects an existing destination.
  [IO.File]::Move($taskActive,$taskDestination)
  $taskRenamed=$true
  $archived=Get-StateMetadata $taskDestination $true
  $original=Get-StateMetadata $taskOriginal $true
  Assert-StableProperties $archived ([pscustomobject]$before[2])
  Assert-StableProperties $original ([pscustomobject]$before[1])
  if($archived.sha256 -ne $taskActiveHash -or $original.sha256 -ne $taskArchiveHash){throw 'ARCHIVED_PROOF_CONTENT_CHANGED'}
  if(Test-Path -LiteralPath $taskActive){throw 'ACTIVE_PROOF_UNEXPECTEDLY_PRESENT'}
  $afterNames=@(Get-ChildItem -LiteralPath $taskState -Force | ForEach-Object {$_.Name}) | Sort-Object
  if(($afterNames -join ',') -ne ((@($taskOriginalName,$taskDestinationName) | Sort-Object) -join ',')){throw 'POST_ARCHIVE_STATE_MISMATCH'}
  foreach($path in @($taskState,$taskOriginal,$taskDestination)){Assert-CliAcl $path}
  Write-NewEvidence 'archive-verification.json' ([ordered]@{status='PASS';renameCount=1;renameOverwroteFile=$false;archived=$archived;originalArchive=$original;contentsCreationWriteOwnershipAclPreserved=$true;lastAccessChangesAccepted=$true;activeProofAbsent=$true;installationStateCreated=$false;verifiedAt=[DateTime]::UtcNow.ToString('o')})
  [ordered]@{status='PASS';archivalRenameCount=1;originalArchivePreserved=$true;activeProofArchived=$true;activeProofAbsent=$true;databaseConnectionAttempted=$false} | ConvertTo-Json -Compress
}catch{
  $code=if($_.Exception.Message -match '^[A-Z0-9_]+$'){$_.Exception.Message}else{'LOCAL_PROOF_OPERATION_FAILED'}
  [ordered]@{status='BLOCKED';code=$code;renameReturnedSuccessfully=$taskRenamed;automaticRetries=0;databaseConnectionAttempted=$false} | ConvertTo-Json -Compress
  exit 2
}
