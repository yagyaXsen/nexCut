import json
import subprocess
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional

import cv2
import numpy as np
import librosa
from openai import OpenAI


class StyleDNAExtractor:
    def __init__(self, r2_config: dict, openai_api_key: str):
        self.r2_config = r2_config
        self.openai = OpenAI(api_key=openai_api_key)

    def extract(self, reference_urls: List[str]) -> Dict[str, Any]:
        """Extract Style DNA from 4-6 reference reels."""
        results = []
        for url in reference_urls:
            analysis = self._analyze_reference(url)
            results.append(analysis)

        return self._synthesize_consensus(results)

    def _download_reference(self, url: str) -> Path:
        """Download reference reel video using yt-dlp."""
        tmp_dir = Path(tempfile.mkdtemp())
        output_path = tmp_dir / "reference.mp4"
        subprocess.run([
            "yt-dlp", "-f", "best[height<=1080]", "-o", str(output_path),
            "--merge-output-format", "mp4", url
        ], check=True, capture_output=True)
        return output_path

    def _transcode(self, input_path: Path) -> Path:
        """Transcode to uniform format (H.264, 30fps, 1080p)."""
        output_path = input_path.parent / "transcoded.mp4"
        subprocess.run([
            "ffmpeg", "-y", "-i", str(input_path),
            "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
            "-r", "30",
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k",
            str(output_path)
        ], check=True, capture_output=True)
        return output_path

    def _extract_audio(self, video_path: Path) -> Path:
        """Extract audio as WAV for analysis."""
        audio_path = video_path.parent / "audio.wav"
        subprocess.run([
            "ffmpeg", "-y", "-i", str(video_path),
            "-vn", "-acodec", "pcm_s16le", "-ar", "22050", "-ac", "1",
            str(audio_path)
        ], check=True, capture_output=True)
        return audio_path

    def _analyze_frames(self, video_path: Path, max_frames: int = 30) -> List[np.ndarray]:
        """Sample frames from video for CV analysis."""
        cap = cv2.VideoCapture(str(video_path))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        duration = total_frames / fps if fps > 0 else 0

        frames = []
        for i in range(max_frames):
            target_frame = int((i / max_frames) * total_frames)
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame)
            ret, frame = cap.read()
            if ret:
                frames.append(frame)

        cap.release()
        return frames, duration, fps

    def _detect_scenes(self, video_path: Path) -> List[Dict[str, float]]:
        """Detect scene changes using OpenCV."""
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
            if diff > 60:
                scenes.append({"start": frame_idx / fps})
            prev_gray = gray

        cap.release()
        for i in range(len(scenes) - 1):
            scenes[i]["end"] = scenes[i + 1]["start"]
            scenes[i]["duration"] = scenes[i]["end"] - scenes[i]["start"]
        if scenes:
            scenes[-1]["end"] = frame_idx / fps if fps > 0 else 0
            scenes[-1]["duration"] = scenes[-1]["end"] - scenes[-1]["start"]

        return scenes

    def _analyze_color_palette(self, frames: List[np.ndarray]) -> Dict[str, Any]:
        """Extract dominant colors and color grading metrics."""
        if not frames:
            return {"dominant_colors": [], "avg_brightness": 0, "avg_contrast": 0}

        all_pixels = np.concatenate([frame.reshape(-1, 3) for frame in frames])
        all_pixels = all_pixels.astype(np.float32)

        avg_brightness = np.mean(all_pixels)
        avg_contrast = np.std(all_pixels)
        avg_saturation = np.mean([
            np.std(frame.reshape(-1, 3), axis=1).mean() for frame in frames
        ])

        return {
            "avg_brightness": float(avg_brightness / 255),
            "avg_contrast": float(avg_contrast / 255),
            "avg_saturation": float(avg_saturation / 255),
        }

    def _analyze_audio(self, audio_path: Path) -> Dict[str, Any]:
        """Analyze audio for BPM, beats, energy."""
        y, sr = librosa.load(str(audio_path), sr=22050)
        duration = librosa.get_duration(y=y, sr=sr)

        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        energy = np.mean(librosa.feature.rms(y=y))
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)

        return {
            "bpm": float(tempo),
            "energy": float(energy),
            "duration": float(duration),
            "num_beats": len(beats),
            "num_onsets": len(onsets),
        }

    def _analyze_with_llm(self, frames_base64: List[str], audio_transcript: str,
                          scene_info: Dict[str, Any], color_info: Dict[str, Any]) -> Dict[str, Any]:
        """Use GPT-4o to analyze editing style, captions, and story structure."""
        messages = [
            {"role": "system", "content": """You are a video editing analyst. Extract the exact editing style 
            from reference reels. Analyze: editing patterns, transitions, captions, music, color grade, story structure.
            Output JSON with precise measurements."""},
            {"role": "user", "content": [
                {"type": "text", "text": f"""Analyze this reference reel's editing style.

Scene information:
- Number of scenes: {scene_info.get('num_scenes', 0)}
- Average scene duration: {scene_info.get('avg_scene_duration', 0):.2f}s
- Color analysis: {json.dumps(color_info)}

Output EXACT JSON:
{{
  "editing": {{
    "avg_cut_duration": float,
    "cut_distribution": "exponential|uniform|burst",
    "transition_style": "zoom_flash|glitch|whip|crossfade|hard_cut",
    "transition_params": {{}},
    "zoom_frequency": float,
    "zoom_intensity": float,
    "beat_sync": bool,
    "beat_sync_strength": float
  }},
  "text": {{
    "font": string,
    "position": "top|center|bottom|lower_third",
    "safe_zone": float,
    "animation": "kinetic_typewriter|pop_in|slide_up|fade_in|scale_in",
    "animation_params": {{}},
    "style": {{"color": string, "stroke": string, "stroke_width": int, "shadow": bool}},
    "hooks": {{"font_size": int, "duration": float, "animation": string}}
  }},
  "story": {{
    "structure": ["hook", "build", "climax", "cta"],
    "section_ratios": [float],
    "pacing_curve": "accelerating|wave|steady|decelerating",
    "hook_style": "text_overlay|visual|audio",
    "cta_style": "follow_for_more|link_in_bio|comment_below|save_for_later"
  }}
}}"""}
            ]}
        ]

        # Add up to 5 keyframes as images
        for frame_b64 in frames_base64[:5]:
            messages[1]["content"].append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{frame_b64}", "detail": "low"}
            })

        response = self.openai.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            response_format={"type": "json_object"},
            max_tokens=2000,
        )

        return json.loads(response.choices[0].message.content)

    def _analyze_reference(self, url: str) -> Dict[str, Any]:
        """Full analysis pipeline for one reference reel."""
        video_path = self._download_reference(url)
        transcoded_path = self._transcode(video_path)
        audio_path = self._extract_audio(transcoded_path)

        frames, duration, fps = self._analyze_frames(transcoded_path)
        scenes = self._detect_scenes(transcoded_path)
        color_info = self._analyze_color_palette(frames)
        audio_info = self._analyze_audio(audio_path)

        # Encode frames as base64 for LLM
        import base64
        import io
        from PIL import Image

        frames_b64 = []
        for frame in frames[:5]:
            pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            buf = io.BytesIO()
            pil_img.save(buf, format="JPEG", quality=60)
            frames_b64.append(base64.b64encode(buf.getvalue()).decode())

        llm_analysis = self._analyze_with_llm(
            frames_b64,
            transcript="",
            scene_info={
                "num_scenes": len(scenes),
                "avg_scene_duration": duration / max(len(scenes), 1),
            },
            color_info=color_info,
        )

        return {
            "url": url,
            "duration": duration,
            "fps": fps,
            "num_scenes": len(scenes),
            "scenes": scenes,
            "audio": audio_info,
            "color_grade": color_info,
            "llm_analysis": llm_analysis,
        }

    def _synthesize_consensus(self, analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Merge multiple reference analyses into one Style DNA with confidence scores."""
        if not analyses:
            return self._default_dna()

        llm_analyses = [a.get("llm_analysis", {}) for a in analyses if a.get("llm_analysis")]
        audio_infos = [a.get("audio", {}) for a in analyses]
        color_infos = [a.get("color_grade", {}) for a in analyses]
        scenes = [a.get("num_scenes", 0) for a in analyses]
        durations = [a.get("duration", 0) for a in analyses]

        def avg(values: List[float]) -> float:
            return sum(values) / max(len(values), 1)

        def median_cuts(cut_durations: List[float]) -> float:
            sorted_vals = sorted(cut_durations)
            return sorted_vals[len(sorted_vals) // 2]

        editing_transitions = []
        editing_transition_params = {}
        editing_zooms = []
        for la in llm_analyses:
            ed = la.get("editing", {})
            editing_transitions.append(ed.get("transition_style", "hard_cut"))
            editing_zooms.append(ed.get("zoom_frequency", 0))

        transition_counts = {}
        for t in editing_transitions:
            transition_counts[t] = transition_counts.get(t, 0) + 1

        consensus = {
            "visual": {
                "color_grade": "dynamic",
                "contrast": avg([c.get("avg_contrast", 0.5) for c in color_infos]),
                "saturation": avg([c.get("avg_saturation", 0.7) for c in color_infos]),
                "grain": 0.05,
            },
            "editing": {
                "avg_cut_duration": median_cuts([
                    la.get("editing", {}).get("avg_cut_duration", 2.0) for la in llm_analyses
                ]),
                "cut_distribution": "exponential",
                "transition_style": max(transition_counts, key=transition_counts.get),
                "transition_params": {},
                "zoom_frequency": avg(editing_zooms),
                "zoom_intensity": avg([la.get("editing", {}).get("zoom_intensity", 1.2) for la in llm_analyses]),
                "beat_sync": True,
                "beat_sync_strength": 0.8,
            },
            "text": llm_analyses[0].get("text", self._default_dna()["text"]) if llm_analyses else self._default_dna()["text"],
            "audio": {
                "music_energy": "high",
                "target_bpm": avg([a.get("bpm", 128) for a in audio_infos]),
                "music_role": "driving" if avg([a.get("energy", 0.5) for a in audio_infos]) > 0.5 else "atmospheric",
                "sfx_profile": ["whoosh", "bass_hit"],
                "sfx_timing": "on_transition",
                "voice_treatment": "preserve_original",
                "ducking": {"ratio": 0.15, "attack": 0.05, "release": 0.3},
            },
            "story": llm_analyses[0].get("story", self._default_dna()["story"]) if llm_analyses else self._default_dna()["story"],
            "confidence": min(0.95, 0.6 + len(analyses) * 0.08),
        }

        return consensus

    def _default_dna(self) -> Dict[str, Any]:
        return {
            "visual": {"color_grade": "natural", "contrast": 1.0, "saturation": 1.0, "grain": 0},
            "editing": {"avg_cut_duration": 2.0, "cut_distribution": "exponential",
                        "transition_style": "hard_cut", "transition_params": {},
                        "zoom_frequency": 0, "zoom_intensity": 1.0,
                        "beat_sync": False, "beat_sync_strength": 0},
            "text": {"font": "Inter-Bold", "position": "center", "safe_zone": 0.15,
                     "animation": "fade_in", "animation_params": {},
                     "style": {"color": "#FFFFFF", "stroke": "#000000", "stroke_width": 3, "shadow": True},
                     "hooks": {"font_size": 80, "duration": 2.0, "animation": "pop_in"}},
            "audio": {"music_energy": "medium", "target_bpm": 120, "music_role": "atmospheric",
                      "sfx_profile": [], "sfx_timing": "on_transition",
                      "voice_treatment": "preserve_original",
                      "ducking": {"ratio": 0.15, "attack": 0.05, "release": 0.3}},
            "story": {"structure": ["hook", "build", "climax", "cta"],
                      "section_ratios": [0.15, 0.35, 0.35, 0.15],
                      "pacing_curve": "accelerating",
                      "hook_style": "text_overlay", "cta_style": "follow_for_more"},
            "confidence": 0,
        }