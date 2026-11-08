@echo off
title CS2Lineups - Image Optimizer
cd /d "%~dp0"
if exist "optimize-images.exe" (
    "optimize-images.exe" %*
) else (
    python scripts\optimize_images.py %*
)
