import json
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional


class ReelRenderer:
    def __init__(self, r2_config: dict):
        self.r2_config = r2_config

    def render(self, edl: Dict[str, Any], style_dna: Dict[str, Any],
               asset_urls: Dict[str, str]) -> Dict[str, Any]:
        tmp_dir = Path(tempfile.mkdtemp())
        target_duration = edl.get("target_duration", 30)
        aspect_ratio = edl.get("aspect_ratio", "9:16")
        clips = edl.get("clips", [])
        captions = edl.get("captions", [])
        sfx_list = edl.get("sfx", [])

        if not clips:
            return {"error": "No clips in EDL"}

        output_1080p = tmp_dir / "final_1080p.mp4"
        output_720p = tmp_dir / "preview_720p.mp4"

        filter_parts = []
        input_files = []
        input_index = 0
        clip_input_map = {}
        video_streams = []
        audio_streams = []

        for clip in clips:
            asset_id = clip.get("asset_id", "")
            url = asset_urls.get(asset_id, asset_id)
            clip_path = tmp_dir / f"clip_{input_index}.mp4"

            try:
                subprocess.run([
                    "curl", "-s", "-o", str(clip_path), url
                ], check=True, capture_output=True, timeout=60)
            except Exception:
                continue

            input_files.append(str(clip_path))
            clip_input_map[input_index] = clip
            video_streams.append(f"[{input_index}:v]")
            audio_streams.append(f"[{input_index}:a]")
            input_index += 1

        if not input_files:
            return {"error": "No valid input files"}

        stream_labels_v = []
        stream_labels_a = []

        for i, clip in enumerate(clips):
            if i >= len(input_files):
                break

            trim_start = clip.get("source_in", 0)
            trim_end = clip.get("source_out", 10)
            duration = trim_end - trim_start

            zoom = clip.get("zoom", {})
            zoom_start = zoom.get("start", 1.0)
            zoom_end = zoom.get("end", 1.0)

            label_v = f"[v{i}]"
            label_a = f"[a{i}]"

            trim_filter = f"[{i}:v]trim={trim_start}:{trim_end},setpts=PTS-STARTPTS"
            if zoom_start != 1.0 or zoom_end != 1.0:
                zoom_expr = f"{zoom_start}+({zoom_end}-{zoom_start})*(t/{duration})"
                trim_filter += f",zoompan=z='{zoom_expr}':d={int(duration * 30)}:s=1080x1920:fps=30"

            if aspect_ratio == "9:16":
                trim_filter += ",scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black"
            elif aspect_ratio == "1:1":
                trim_filter += ",scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black"

            contrast = style_dna.get("visual", {}).get("contrast", 1.0)
            saturation = style_dna.get("visual", {}).get("saturation", 1.0)
            if contrast != 1.0 or saturation != 1.0:
                trim_filter += f",eq=contrast={contrast}:saturation={saturation}"

            trim_filter += label_v

            audio_filter = f"[{i}:a]atrim={trim_start}:{trim_end},asetpts=PTS-STARTPTS{label_a}"

            filter_parts.append(trim_filter)
            filter_parts.append(audio_filter)
            stream_labels_v.append(label_v)
            stream_labels_a.append(label_a)

        if len(stream_labels_v) > 1:
            concat_v = "".join(stream_labels_v)
            concat_a = "".join(stream_labels_a)
            concat_filter = f"{concat_v}{concat_a}concat=n={len(stream_labels_v)}:v=1:a=1[outv][outa]"
            filter_parts.append(concat_filter)
        elif len(stream_labels_v) == 1:
            filter_parts.append(f"{stream_labels_v[0]}[outv];{stream_labels_a[0]}[outa]")
        else:
            return {"error": "No processed streams"}

        filter_complex = ";".join(filter_parts)

        video_filter = f"[outv]{self._build_caption_filter(captions, style_dna)}"
        filter_parts.append(video_filter)

        complete_filter = ";".join(filter_parts)

        cmd_1080p = [
            "ffmpeg", "-y"
        ]
        for inp in input_files:
            cmd_1080p.extend(["-i", inp])
        cmd_1080p.extend([
            "-filter_complex", complete_filter,
            "-map", "[finalv]", "-map", "[outa_mixed]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k",
            "-t", str(target_duration),
            str(output_1080p)
        ])

        cmd_720p = cmd_1080p.copy()
        cmd_720p[cmd_720p.index(str(output_1080p))] = str(output_720p)
        vf_index = next(i for i, x in enumerate(cmd_720p) if x == "-filter_complex") + 1
        cmd_720p[vf_index] += ",scale=720:1280"

        try:
            subprocess.run(cmd_720p, check=True, capture_output=True, timeout=600)
            subprocess.run(cmd_1080p, check=True, capture_output=True, timeout=1200)
        except subprocess.CalledProcessError as e:
            return {"error": f"Render failed: {e.stderr.decode()[:500]}"}

        return {
            "url": str(output_1080p),
            "preview_url": str(output_720p),
            "duration": float(target_duration),
        }

    def _build_caption_filter(self, captions: list, style_dna: dict) -> str:
        text_style = style_dna.get("text", {})
        font_color = text_style.get("style", {}).get("color", "#FFFFFF")
        stroke_color = text_style.get("style", {}).get("stroke", "#000000")
        stroke_width = text_style.get("style", {}).get("stroke_width", 3)
        font_size = text_style.get("hooks", {}).get("font_size", 80)
        safe_zone = text_style.get("safe_zone", 0.15)

        width, height = 1080, 1920
        center_x = width // 2
        bottom_y = int(height * (1 - safe_zone))
        top_y = int(height * safe_zone)

        caption_parts = [""]
        for caption in captions:
            text = caption.get("text", "").replace("'", "\\'").replace(":", "\\:")
            start = caption.get("start", 0)
            end = caption.get("end", 2)
            duration = end - start
            style = caption.get("style", "body")
            pos = caption.get("position", "center")

            if pos == "top":
                y_pos = top_y
            elif pos == "bottom":
                y_pos = bottom_y
            else:
                y_pos = height // 2

            fs = font_size if style == "hook" else font_size // 2
            if duration <= 0:
                duration = 2

            enable_expr = f"between(t,{start},{end})"
            caption_parts.append(
                f"drawtext=text='{text}':x={center_x}-text_w/2:y={y_pos}:"
                f"fontsize={fs}:fontcolor={font_color}:"
                f"bordercolor={stroke_color}:borderw={stroke_width}:"
                f"box=1:boxcolor=black@0.5:boxborderw=10:"
                f"enable='{enable_expr}'"
            )

        caption_filter = "[outv]" + ";".join(caption_parts) + "[finalv]"
        return caption_filter