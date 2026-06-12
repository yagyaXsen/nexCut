import modal
import json
import os
from pathlib import Path
from typing import List

app = modal.App("nexcut-style-dna")

image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "modal==0.64.0",
    "openai==1.30.0",
    "opencv-python-headless==4.8.1",
    "numpy==1.26.0",
    "librosa==0.10.1",
    "scenedetect==0.6.1",
    "boto3==1.34.0",
    "pydantic==2.5.0",
    "httpx==0.25.0",
    "yt-dlp",
).apt_install("ffmpeg")


@app.function(image=image, gpu="A10G", timeout=600)
def extract_style_dna(project_id: str, reference_urls: List[str], r2_config: dict) -> dict:
    """Extract Style DNA from 4-6 reference reels using LLM + CV + Audio analysis."""
    from style_dna.extractor import StyleDNAExtractor

    extractor = StyleDNAExtractor(r2_config, openai_api_key=os.environ["OPENAI_API_KEY"])
    dna = extractor.extract(reference_urls)
    return {"project_id": project_id, "style_dna": dna, "confidence": dna.get("confidence", 0)}


@app.function(image=image, keep_warm=1, timeout=60)
def process_job(project_id: str, job_data: dict) -> dict:
    """Queue style DNA extraction job."""
    return {"job_id": project_id, "status": "queued"}