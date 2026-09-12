# SPDX-License-Identifier: BUSL-1.1
# Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
# One owned database effect; sequencing belongs to the remote-tests StateGraph.
param(
  [Parameter(Mandatory=$true)][string]$RunDirectory,
  [Parameter(Mandatory=$true)][ValidateSet('Start','Stop')][string]$Action
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$testRoot = 'D:\AtlasTests'
$runRoot = [IO.Path]::GetFullPath((Join-Path $testRoot 'runs')) + '\'
$runPath = [IO.Path]::GetFullPath($RunDirectory).TrimEnd('\')
if (!$runPath.StartsWith($runRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Run directory must be inside the dedicated test root.' }
if ((Get-Content -LiteralPath (Join-Path $testRoot 'atlas-test-root.json') -Raw | ConvertFrom-Json).owner -ne 'Atlas_Chronicles') { throw 'Test root ownership mismatch.' }
$manifest = Get-Content -LiteralPath (Join-Path $runPath 'manifest.json') -Raw | ConvertFrom-Json
$dataPath = Join-Path $runPath 'pgdata'
$fixturePath = Join-Path $runPath 'database.json'
$binPath = Join-Path $testRoot 'runtime\pgsql\bin'
if ($Action -eq 'Stop') {
  $fixture = Get-Content -LiteralPath $fixturePath -Raw | ConvertFrom-Json
  if ($fixture.snapshotId -ne $manifest.snapshotId -or $fixture.dataDirectory -ne $dataPath -or $fixture.binDirectory -ne $binPath) { throw 'Database ownership mismatch.' }
  $pidPath = Join-Path $dataPath 'postmaster.pid'
  if (!(Test-Path -LiteralPath $pidPath)) { Write-Output 'Owned database is already stopped.'; exit 0 }
  $pidLines = Get-Content -LiteralPath $pidPath
  if ([IO.Path]::GetFullPath($pidLines[1]).TrimEnd('\') -ne $dataPath -or [int]$pidLines[3] -ne $fixture.port) { throw 'PostgreSQL ownership record mismatch.' }
  $databaseProcess = Get-Process -Id ([int]$pidLines[0]) -ErrorAction Stop
  if ($databaseProcess.Path -ne (Join-Path $binPath 'postgres.exe')) { throw 'PostgreSQL executable identity mismatch.' }
  & (Join-Path $binPath 'pg_ctl.exe') -D $dataPath -m fast -w -t 30 stop
  if ($LASTEXITCODE -ne 0) { throw 'Owned PostgreSQL shutdown failed.' }
  exit 0
}
if (Test-Path -LiteralPath $dataPath) { throw 'Existing database directory will not be replaced.' }
if (Test-Path -LiteralPath $fixturePath) { throw 'Existing database receipt will not be replaced.' }
$listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 0)
$listener.Start()
$databasePort = $listener.LocalEndpoint.Port
$listener.Stop()
& (Join-Path $binPath 'initdb.exe') -D $dataPath -U atlas_test --auth=trust --no-locale --encoding=UTF8
if ($LASTEXITCODE -ne 0) { throw 'Test database initialization failed.' }
$fixture = [ordered]@{ schemaVersion=1; snapshotId=$manifest.snapshotId; dataDirectory=$dataPath; binDirectory=$binPath; port=$databasePort; databaseUrl="postgresql://atlas_test@127.0.0.1:$databasePort/atlas_test" }
[IO.File]::WriteAllText($fixturePath, ($fixture | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
& (Join-Path $binPath 'pg_ctl.exe') -D $dataPath -l (Join-Path $runPath 'postgres.log') -o "-h 127.0.0.1 -p $databasePort" -w -t 30 start
if ($LASTEXITCODE -ne 0) { throw 'Test database startup failed; inspect its owned log.' }
& (Join-Path $binPath 'createdb.exe') -h 127.0.0.1 -p $databasePort -U atlas_test atlas_test
if ($LASTEXITCODE -ne 0) { throw 'Test database creation failed.' }
$identity = & (Join-Path $binPath 'psql.exe') -h 127.0.0.1 -p $databasePort -U atlas_test -d atlas_test -At -c "SELECT current_database() || ':' || current_user || ':' || inet_server_port()"
if ($LASTEXITCODE -ne 0 -or $identity -ne "atlas_test:atlas_test:$databasePort") { throw 'Test database identity mismatch.' }
Write-Output "Disposable PostgreSQL 17 ready on loopback port $databasePort."
