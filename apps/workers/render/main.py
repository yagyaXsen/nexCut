import modal
import json
import os
from pathlib import Path
from typing import List

app = modal.App("nexcut-render")

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "modal==0.64.0",
    "opencv-python-headless==4.8.1",
    "numpy==1.26.0",
    "boto3==1.34.0",
    "httpx==0.25.0",
).apt_install("ffmpeg")


@app.function(image=image, cpu=8, memory=16384, gpu="A10G", timeout=1800)
def render_reel(project_id: str, edl: dict, style_dna: dict, asset_urls: dict, r2_config: dict) -> dict:
    """Render final reel using FFmpeg from EDL + Style DNA."""
    from render.renderer import ReelRenderer
    renderer = ReelRenderer(r2_config)
    result = renderer.render(edl, style_dna, asset_urls)
    return {"project_id": project_id, "output_url": result.get("url"),
            "preview_url": result.get("preview_url"), "duration": result.get("duration")}


@app.function(image=image, cpu=8, memory=16384, gpu="A10G", timeout=1200)
def render_variant(project_id: str, edl: dict, style_dna: dict, asset_urls: dict,
                    r2_config: dict, aspect_ratio: str) -> dict:
    """Render a variant of the reel at different aspect ratio."""
    from render.renderer import ReelRenderer
    edl["aspect_ratio"] = aspect_ratio
    renderer = ReelRenderer(r2_config)
    result = renderer.render(edl, style_dna, asset_urls)
    return {"project_id": project_id, "output_url": result.get("url"),
            "aspect_ratio": aspect_ratio, "duration": result.get("duration")}