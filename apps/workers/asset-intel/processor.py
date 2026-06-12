import json
import subprocess
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional

import cv2
import numpy as np
import whisper


class AssetProcessor:
    def __init__(self, r2_config: dict, openai_api_key: str):
        self.r2_config = r2_config
        self.whisper_model = None

    def _load_whisper(self):
        if self.whisper_model is None:
            self.whisper_model = whisper.load_model("small")
        return self.whisper_model

    def process_all(self, urls: List[str]) -> List[Dict[str, Any]]:
        results = []
        for url in urls:
            result = self._process_single(url)
            results.append(result)
        return results

    def _process_single(self, url: str) -> Dict[str, Any]:
        tmp_dir = Path(tempfile.mkdtemp())
        video_path = tmp_dir / "input.mp4"

        subprocess.run([
            "curl", "-s", "-o", str(video_path), url
        ], check=True, capture_output=True)

        return self._analyze_video(video_path)

    def _analyze_video(self, video_path: Path) -> Dict[str, Any]:
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return {"url": str(video_path), "error": "Cannot open video"}

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0

        cap.release()

        audio_path = self._extract_audio(video_path)

        transcript = None
        words = None
        if audio_path and audio_path.exists():
            transcript, words = self._transcribe(audio_path)

        scenes = self._detect_scenes(video_path)

        tags = self._generate_tags(video_path, scenes)

        quality = self._score_quality(video_path)

        return {
            "duration": duration,
            "width": width,
            "height": height,
            "fps": fps,
            "total_frames": total_frames,
            "aspect_ratio": f"{width}:{height}",
            "transcript": transcript,
            "words": words,
            "scenes": scenes,
            "tags": tags,
            "quality_score": quality,
        }

    def _extract_audio(self, video_path: Path) -> Optional[Path]:
        audio_path = video_path.parent / "audio.wav"
        try:
            subprocess.run([
                "ffmpeg", "-y", "-i", str(video_path),
                "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                str(audio_path)
            ], check=True, capture_output=True)
            return audio_path
        except subprocess.CalledProcessError:
            return None

    def _transcribe(self, audio_path: Path):
        model = self._load_whisper()
        result = model.transcribe(str(audio_path), word_timestamps=True)

        words = []
        for segment in result.get("segments", []):
            for word_info in segment.get("words", []):
                words.append({
                    "word": word_info.get("word", "").strip(),
                    "start": word_info.get("start", 0),
                    "end": word_info.get("end", 0),
                    "confidence": word_info.get("confidence", 1.0),
                })

        return result.get("text", "").strip(), words

    def _detect_scenes(self, video_path: Path) -> List[Dict[str, float]]:
        cap = cv2.VideoCapture(str(video_path))
        fps = cap.get(cv2.CAP_PROP_FPS)
        ret, prev_frame = cap.read()
        if not ret:
            return []

        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
        scenes = [{"start": 0.0}]
        frame_idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_idx += 1

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            diff = cv2.absdiff(prev_gray, gray).mean()
            if diff > 50:
                scenes.append({"start": frame_idx / fps})
            prev_gray = gray

        cap.release()
        for i in range(len(scenes) - 1):
            scenes[i]["end"] = scenes[i + 1]["start"]
            scenes[i]["duration"] = scenes[i]["end"] - scenes[i]["start"]
            scenes[i]["score"] = 1.0
        if scenes:
            scenes[-1]["end"] = frame_idx / fps if fps > 0 else 0
            scenes[-1]["duration"] = scenes[-1]["end"] - scenes[-1]["start"]

        return scenes

    def _generate_tags(self, video_path: Path, scenes: List[Dict]) -> List[str]:
        tags = set()
        for scene in scenes:
            mid_time = (scene["start"] + scene.get("end", scene["start"] + 2)) / 2
            cap = cv2.VideoCapture(str(video_path))
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(mid_time * cap.get(cv2.CAP_PROP_FPS)))
            ret, frame = cap.read()
            cap.release()
            if not ret:
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            brightness = gray.mean()
            if brightness < 50:
                tags.add("dark")
            elif brightness > 200:
                tags.add("bright")

            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            if laplacian_var < 100:
                tags.add("blurry")

            edges = cv2.Canny(gray, 100, 200)
            edge_ratio = (edges > 0).mean()
            if edge_ratio > 0.1:
                tags.add("high_detail")

        return list(tags)

    def _score_quality(self, video_path: Path) -> float:
        cap = cv2.VideoCapture(str(video_path))
        scores = []
        frame_count = 0
        max_frames = 30

        while True:
            ret, frame = cap.read()
            if not ret or frame_count >= max_frames:
                break
            frame_count += 1

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            brightness = gray.mean()
            exposure_score = 1.0 - abs(brightness - 127) / 127
            sharpness_score = min(1.0, laplacian_var / 500)
            scores.append((exposure_score + sharpness_score) / 2)

        cap.release()
        return float(np.mean(scores)) if scores else 0.5