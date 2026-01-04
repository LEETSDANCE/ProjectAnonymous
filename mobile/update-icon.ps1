# PowerShell script to update app icon
# This script copies your icon to all required Android drawable folders

$sourceIcon = "S:\Kepa Work\ProjectAnonymous\ProjectAnonymous.png"
$androidResPath = "S:\Kepa Work\ProjectAnonymous\mobile\android\app\src\main\res"

# Icon sizes for different densities
$iconSizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

Write-Host "Updating app icon..." -ForegroundColor Green

# Check if source icon exists
if (-not (Test-Path $sourceIcon)) {
    Write-Host "Error: Source icon not found at $sourceIcon" -ForegroundColor Red
    exit 1
}

# Install ImageMagick if needed (for resizing)
Write-Host "Note: This script requires ImageMagick to resize icons." -ForegroundColor Yellow
Write-Host "If you don't have it installed, you can:" -ForegroundColor Yellow
Write-Host "1. Install via: winget install ImageMagick.ImageMagick" -ForegroundColor Yellow
Write-Host "2. Or manually resize the icon and place it in the folders below" -ForegroundColor Yellow
Write-Host ""

foreach ($folder in $iconSizes.Keys) {
    $size = $iconSizes[$folder]
    $destFolder = Join-Path $androidResPath $folder
    $destFile = Join-Path $destFolder "ic_launcher.png"
    $destFileRound = Join-Path $destFolder "ic_launcher_round.png"
    
    Write-Host "Processing $folder (${size}x${size})..." -ForegroundColor Cyan
    
    # Create folder if it doesn't exist
    if (-not (Test-Path $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
    }
    
    # Try to resize with ImageMagick
    try {
        & magick convert "$sourceIcon" -resize "${size}x${size}" "$destFile"
        & magick convert "$sourceIcon" -resize "${size}x${size}" "$destFileRound"
        Write-Host "  ✓ Created $destFile" -ForegroundColor Green
    } catch {
        # If ImageMagick is not available, just copy the original
        Write-Host "  ! ImageMagick not found, copying original (you'll need to resize manually)" -ForegroundColor Yellow
        Copy-Item $sourceIcon $destFile -Force
        Copy-Item $sourceIcon $destFileRound -Force
    }
}

Write-Host ""
Write-Host "Icon update complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Uninstall the old app from your device" -ForegroundColor White
Write-Host "2. Run: npx react-native run-android" -ForegroundColor White
Write-Host "3. The new icon and name will appear" -ForegroundColor White
