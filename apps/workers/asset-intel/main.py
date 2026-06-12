import modal
import json
import os
from pathlib import Path
from typing import List

app = modal.App("nexcut-asset-intel")

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "modal==0.64.0",
    "openai==1.30.0",
    "opencv-python-headless==4.8.1",
    "numpy==1.26.0",
    "scenedetect==0.6.1",
    "whisper==1.1.10",
    "boto3==1.34.0",
    "pydantic==2.5.0",
    "httpx==0.25.0",
).apt_install("ffmpeg")


@app.function(image=image, cpu=4, memory=8192, timeout=900)
def process_assets(project_id: str, asset_urls: List[str], r2_config: dict) -> dict:
    """Process user footage: transcode, transcribe, tag, detect scenes."""
    from asset_intel.processor import AssetProcessor
    processor = AssetProcessor(r2_config, openai_api_key=os.environ["OPENAI_API_KEY"])
    processed = processor.process_all(asset_urls)
    return {"project_id": project_id, "assets": processed}


@app.function(image=image, cpu=2, memory=4096, timeout=300)
def generate_edl(project_id: str, style_dna: dict, asset_info: dict,
                 voice_segments: list, variant: str = "balanced",
                 music_mood: str = "auto") -> dict:
    """Generate Edit Decision List from Style DNA + processed assets + voice segments."""
    from asset_intel.edl_generator import EDLGenerator
    generator = EDLGenerator(openai_api_key=os.environ["OPENAI_API_KEY"])
    edl = generator.generate(style_dna, asset_info, voice_segments, variant, music_mood)
    return {"project_id": project_id, "edl": edl}