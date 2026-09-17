# SPDX-License-Identifier: BUSL-1.1
# Copyright (c) 2026 Kaya Yesilyurt - Atlas Chronicles. Siehe LICENSE.
#
# Baut das fertige Windows-Paket in einem Durchgang: Oberflaeche, Desktop-Uebersetzung,
# gepackte Anwendung, Installationsprogramm.
#
# Warum es dieses Skript gibt: die vier Schritte hingen bisher nur lose aneinander. Ging
# einer schief, lief der naechste trotzdem los und meldete einen Folgefehler, der mit der
# echten Ursache nichts zu tun hatte. Am 17.09.2026 sah das so aus: die Uebersetzung brach
# ab, das Packen liess daraufhin einen halbfertigen Ordner liegen, und das
# Installationsprogramm griff genau nach diesem Ordner. Drei Meldungen, ein Fehler.
#
# Deshalb hier: nach jedem Schritt wird angehalten, ein halbfertiger Ordner wird sofort
# weggeraeumt, und das Installationsprogramm bekommt den Ordner ausdruecklich genannt,
# statt sich den neuesten selbst auszusuchen.
#
#   .\tools\paket.ps1                 alles bauen
#   .\tools\paket.ps1 -OhneOberflaeche  vorhandene Oberflaeche wiederverwenden
#   .\tools\paket.ps1 -Aufraeumen       vorher alte Ergebnisse loeschen

[CmdletBinding()]
param(
    [switch]$OhneOberflaeche,
    [switch]$Aufraeumen
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Wurzel    = Split-Path -Parent $PSScriptRoot
$Artefakte = Join-Path $Wurzel '.local\desktop-artifacts'
$Laufzeit  = Join-Path $Wurzel '.local\desktop-runtime\pgsql\runtime.json'
$Beginn    = Get-Date

function Schritt {
    param([string]$Name)
    Write-Host ''
    Write-Host "== $Name" -ForegroundColor Cyan
}

function Melde {
    param([string]$Text)
    Write-Host "   $Text" -ForegroundColor DarkGray
}

# Ein abgebrochenes Werkzeug muss den Lauf beenden. Ohne diese Pruefung laeuft der
# naechste Schritt auf den Truemmern des vorigen weiter.
function Fuehre-Aus {
    param([string]$Was, [string]$Datei, [string[]]$Argumente)
    $start = Get-Date
    & $Datei @Argumente
    if ($LASTEXITCODE -ne 0) {
        throw "$Was fehlgeschlagen (Rueckgabewert $LASTEXITCODE)."
    }
    $dauer = [int]((Get-Date) - $start).TotalSeconds
    Melde "fertig nach $dauer s"
}

function Stempelordner {
    if (-not (Test-Path -LiteralPath $Artefakte)) { return @() }
    return @(Get-ChildItem -LiteralPath $Artefakte -Directory | Select-Object -ExpandProperty Name)
}

function Groesse {
    param([string]$Pfad)
    $mb = (Get-Item -LiteralPath $Pfad).Length / 1MB
    return ('{0:N1} MB' -f $mb)
}

Push-Location $Wurzel
try {
    Write-Host 'Atlas Chronicles - Paket bauen' -ForegroundColor White
    Melde "Arbeitsordner: $Wurzel"

    # --- Voraussetzungen -----------------------------------------------------
    Schritt 'Voraussetzungen pruefen'

    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw 'Node ist nicht installiert oder nicht im Suchpfad.'
    }
    Melde "Node $(& node --version)"

    if (-not (Test-Path -LiteralPath (Join-Path $Wurzel 'package.json'))) {
        throw "Kein Projekt in $Wurzel gefunden."
    }

    # Das Desktop-Paket traegt die Datenbank mit. Fehlt sie, bricht die Uebersetzung
    # mitten im Lauf ab - diese Meldung hier sagt stattdessen, was zu tun ist.
    if (-not (Test-Path -LiteralPath $Laufzeit)) {
        throw "Die vorbereitete Datenbank fehlt ($Laufzeit). Zuerst einmalig: node packages/desktop/tools/prepare-runtime.mjs"
    }
    Melde 'Datenbank-Laufzeit liegt bereit'

    if ($Aufraeumen -and (Test-Path -LiteralPath $Artefakte)) {
        Remove-Item -LiteralPath $Artefakte -Recurse -Force
        Melde 'alte Ergebnisse geloescht'
    }

    # --- 1. Oberflaeche ------------------------------------------------------
    $oberflaeche = Join-Path $Wurzel 'packages\client\dist'
    if ($OhneOberflaeche) {
        Schritt 'Oberflaeche (uebersprungen)'
        if (-not (Test-Path -LiteralPath $oberflaeche)) {
            throw 'Es gibt keine gebaute Oberflaeche zum Wiederverwenden. Ohne -OhneOberflaeche starten.'
        }
        Melde 'vorhandene Oberflaeche wird wiederverwendet'
    }
    else {
        Schritt 'Oberflaeche bauen'
        Fuehre-Aus 'Der Bau der Oberflaeche' 'npm.cmd' @('run', 'build')
    }

    # --- 2. Desktop uebersetzen ---------------------------------------------
    Schritt 'Desktop uebersetzen'
    Fuehre-Aus 'Die Desktop-Uebersetzung' 'node' @('packages/desktop/tools/build.mjs')

    # Die Uebersetzung schreibt diese Datei als letzte. Fehlt sie, war der Lauf
    # unvollstaendig, auch wenn kein Fehler gemeldet wurde.
    $desktopPaket = Join-Path $Wurzel 'packages\desktop\dist\package.json'
    if (-not (Test-Path -LiteralPath $desktopPaket)) {
        throw 'Die Desktop-Uebersetzung ist unvollstaendig: packages/desktop/dist/package.json fehlt.'
    }

    # --- 3. Anwendung packen -------------------------------------------------
    Schritt 'Anwendung packen'
    Melde 'das dauert einige Minuten'
    $vorher = Stempelordner
    try {
        Fuehre-Aus 'Das Packen der Anwendung' 'node' @('packages/desktop/tools/package.mjs')
    }
    catch {
        # Ein gescheiterter Lauf hinterlaesst einen leeren Ordner. Bleibt der liegen,
        # greift das Installationsprogramm beim naechsten Mal danach.
        foreach ($rest in (Stempelordner | Where-Object { $vorher -notcontains $_ })) {
            Remove-Item -LiteralPath (Join-Path $Artefakte $rest) -Recurse -Force
            Melde "halbfertigen Ordner entfernt: $rest"
        }
        throw
    }

    $neu = @(Stempelordner | Where-Object { $vorher -notcontains $_ })
    if ($neu.Count -ne 1) {
        throw "Das Packen hat $($neu.Count) neue Ordner hinterlassen, erwartet war genau einer."
    }
    $stempel = $neu[0]
    $ordner  = Join-Path $Artefakte $stempel
    Melde "Ergebnis: $stempel"

    # --- 4. Installationsprogramm -------------------------------------------
    Schritt 'Installationsprogramm bauen'
    # Ausdruecklich benannt: das Werkzeug wuerde sonst den neuesten Ordner nehmen,
    # und das ist nicht zwingend der, den dieser Lauf gerade gebaut hat.
    Fuehre-Aus 'Der Bau des Installationsprogramms' 'node' @('packages/desktop/tools/installer.mjs', "--artifact=$stempel")

    # --- Ergebnis ------------------------------------------------------------
    Schritt 'Ergebnis'
    $setup = Join-Path $ordner 'installer\Atlas-Chronicles-Setup.exe'
    foreach ($pflicht in @((Join-Path $ordner 'artifact.json'), (Join-Path $ordner 'installer.json'), $setup)) {
        if (-not (Test-Path -LiteralPath $pflicht)) {
            throw "Erwartetes Ergebnis fehlt: $pflicht"
        }
    }

    $bericht = Get-Content -LiteralPath (Join-Path $ordner 'installer.json') -Raw | ConvertFrom-Json
    $minuten = [int]((Get-Date) - $Beginn).TotalMinutes

    Write-Host ''
    Write-Host "   Version         $($bericht.version)"
    Write-Host "   Installation    $setup"
    Write-Host "   Groesse         $(Groesse $setup)"
    Write-Host "   Anwendung       $($bericht.appDirectory)"
    Write-Host ''
    Write-Host "Fertig nach $minuten Minuten." -ForegroundColor Green
    Write-Host 'Nicht signiert, ohne Update-Kanal - nur fuer den eigenen Rechner.' -ForegroundColor Yellow
}
catch {
    Write-Host ''
    Write-Host "Abgebrochen: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
