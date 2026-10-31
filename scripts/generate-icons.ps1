Add-Type -AssemblyName System.Drawing

function Create-SquareIcon {
    param(
        [string]$sourcePath,
        [string]$destPath,
        [int]$size,
        [float]$paddingRatio = 0.08
    )

    $src = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))
    $dest = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $availW = $size * (1.0 - 2 * $paddingRatio)
    $availH = $size * (1.0 - 2 * $paddingRatio)

    $scale = [Math]::Min($availW / $src.Width, $availH / $src.Height)
    $drawW = [int]($src.Width * $scale)
    $drawH = [int]($src.Height * $scale)
    $drawX = [int](($size - $drawW) / 2)
    $drawY = [int](($size - $drawH) / 2)

    $g.DrawImage($src, $drawX, $drawY, $drawW, $drawH)
    $g.Dispose()
    $src.Dispose()

    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    Write-Host "Generated $destPath"
}

Create-SquareIcon "public/images/brand-logo.png" "public/favicon-16x16.png" 16 0.05
Create-SquareIcon "public/images/brand-logo.png" "public/favicon-32x32.png" 32 0.05
Create-SquareIcon "public/images/brand-logo.png" "public/apple-touch-icon.png" 180 0.08
Create-SquareIcon "public/images/brand-logo.png" "public/icon-192.png" 192 0.08
Create-SquareIcon "public/images/brand-logo.png" "public/icon-512.png" 512 0.08
Create-SquareIcon "public/images/brand-logo.png" "src/app/icon.png" 32 0.05
Create-SquareIcon "public/images/brand-logo.png" "src/app/apple-icon.png" 180 0.08

# Generate favicon.ico containing PNG payload
function Convert-PngToIco {
    param(
        [string]$pngPath,
        [string]$icoPath
    )

    $pngBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $pngPath))
    $stream = New-Object System.IO.MemoryStream

    # ICONDIR structure: 6 bytes
    # Reserved: 0 (2 bytes)
    $stream.WriteByte(0); $stream.WriteByte(0)
    # Type: 1 = ICO (2 bytes)
    $stream.WriteByte(1); $stream.WriteByte(0)
    # Count: 1 image (2 bytes)
    $stream.WriteByte(1); $stream.WriteByte(0)

    # ICONDIRENTRY structure: 16 bytes
    # Width: 32 (1 byte)
    $stream.WriteByte(32)
    # Height: 32 (1 byte)
    $stream.WriteByte(32)
    # Colors: 0 (1 byte)
    $stream.WriteByte(0)
    # Reserved: 0 (1 byte)
    $stream.WriteByte(0)
    # Color planes: 1 (2 bytes)
    $stream.WriteByte(1); $stream.WriteByte(0)
    # Bits per pixel: 32 (2 bytes)
    $stream.WriteByte(32); $stream.WriteByte(0)
    # Image size in bytes (4 bytes)
    $sizeBytes = [System.BitConverter]::GetBytes([uint32]$pngBytes.Length)
    $stream.Write($sizeBytes, 0, 4)
    # Image offset: 6 + 16 = 22 (4 bytes)
    $offsetBytes = [System.BitConverter]::GetBytes([uint32]22)
    $stream.Write($offsetBytes, 0, 4)

    # Image data (PNG payload)
    $stream.Write($pngBytes, 0, $pngBytes.Length)

    [System.IO.File]::WriteAllBytes($icoPath, $stream.ToArray())
    $stream.Dispose()
    Write-Host "Generated $icoPath from PNG"
}

Convert-PngToIco "public/favicon-32x32.png" "public/favicon.ico"
Convert-PngToIco "public/favicon-32x32.png" "src/app/favicon.ico"
