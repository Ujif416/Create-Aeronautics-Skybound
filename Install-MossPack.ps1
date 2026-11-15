[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory=$true)][string]$GameDir,
    [Parameter(Mandatory=$true)][ValidatePattern('^[\w.+-]+$')][string]$VersionId
)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($GameDir)
$versionFile = Join-Path $root "versions\$VersionId\$VersionId.json"
if (!(Test-Path -LiteralPath $versionFile)) { throw "Install Minecraft 1.21.1 / NeoForge 21.1.259 in MossLauncher first: $versionFile" }
$version = Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json
$gameArgs = @($version.arguments.game)
$neoArg = [array]::IndexOf($gameArgs, '--fml.neoForgeVersion')
if ($version.inheritsFrom -ne '1.21.1' -or $neoArg -lt 0 -or $gameArgs[$neoArg + 1] -ne '21.1.259') {
    throw 'Selected profile must inherit Minecraft 1.21.1 and use NeoForge 21.1.259.'
}
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'pack-index.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$sourceRoot = Join-Path $PSScriptRoot 'pack'
$instance = Join-Path $root "instances\$VersionId"
$modRoot = Join-Path $root "mods\$VersionId"
$expectedMods = @($manifest.files | Where-Object { $_.path.StartsWith('mods/') } | ForEach-Object { Split-Path $_.path -Leaf })
foreach ($dir in @($modRoot, (Join-Path $instance 'mods'))) {
    if (Test-Path -LiteralPath $dir) {
        foreach ($file in Get-ChildItem -LiteralPath $dir -File -Filter '*.jar') {
            if ($file.Name -notin $expectedMods) { throw "Existing extra mod: $($file.FullName). Use a clean profile." }
            $entry = $manifest.files | Where-Object { $_.path -eq "mods/$($file.Name)" }
            if ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ne $entry.sha256) { throw "Existing mod differs: $($file.FullName). Use a clean profile." }
        }
    }
}
$operations = @()
foreach ($entry in $manifest.files) {
    if ($entry.path -match '(^/|\\|:|(^|/)\.\.(/|$))') { throw 'Unsafe manifest path.' }
    $source = Join-Path $sourceRoot $entry.path
    if (!(Test-Path -LiteralPath $source -PathType Leaf)) { throw "Missing file: $($entry.path)" }
    if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -ne $entry.sha256) { throw "Checksum mismatch: $($entry.path)" }
    $target = if ($entry.path.StartsWith('mods/')) { Join-Path $modRoot $entry.path.Substring(5) } else { Join-Path $instance $entry.path }
    if (Test-Path -LiteralPath $target) {
        if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $entry.sha256) { throw "Existing file differs: $target. Use a clean profile or back up and move conflicting files first." }
    } else { $operations += [pscustomobject]@{Source=$source; Target=$target} }
}
if ($PSCmdlet.ShouldProcess($instance, "Install $($operations.Count) verified files")) {
    foreach ($op in $operations) {
        New-Item -ItemType Directory -Path (Split-Path $op.Target -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $op.Source -Destination $op.Target
    }
    Write-Host "Installed Create Aeronautics - Skybound. Select $VersionId in MossLauncher."
}
