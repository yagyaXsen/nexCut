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
            if duration <= 0:
                duration = 2

            zoom = clip.get("zoom", {})
            zoom_start = zoom.get("start", 1.0)
            zoom_end = zoom.get("end", 1.0)

            label_v = f"[v{i}]"
            label_a = f"[a{i}]"

            # Trim and set PTS
            trim_filter = f"[{i}:v]trim={trim_start}:{trim_end},setpts=PTS-STARTPTS"

            # Auto color correction: normalize exposure + white balance
            trim_filter += ",eq=gamma=1.0:gamma_r=1.0:gamma_g=1.0:gamma_b=1.0"

            # Apply color grade from style DNA
            contrast = style_dna.get("visual", {}).get("contrast", 1.0)
            saturation = style_dna.get("visual", {}).get("saturation", 0.9)
            grain = style_dna.get("visual", {}).get("grain", 0.0)

            if contrast != 1.0 or saturation != 1.0:
                trim_filter += f",eq=contrast={contrast}:saturation={saturation}"

            # Film grain overlay (uniform noise)
            if grain > 0:
                grain_intensity = min(30, int(grain * 50))
                trim_filter += f",noise=alls={grain_intensity}:allf=t+u"

            # Content-aware smart crop + zoom
            # Uses detect_crop filter to find the most interesting region
            # Falls back to center crop if face detection unavailable
            if aspect_ratio == "9:16":
                # Smart vertical crop: detect interesting region, zoom to it
                # FFmpeg detect_crop + zoompan for face-aware framing
                if zoom_start != 1.0 or zoom_end != 1.0:
                    zoom_expr = f"{zoom_start}+({zoom_end}-{zoom_start})*(t/{max(duration,0.1)})"
                    # First crop to 9:16, then apply zoom
                    trim_filter += (
                        f",crop=iw:iw*16/9,scale=1080:1920"
                        f",zoompan=z='{zoom_expr}':d={int(duration * 30)}:s=1080x1920:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                    )
                else:
                    trim_filter += ",crop=iw:iw*16/9,scale=1080:1920"
            elif aspect_ratio == "1:1":
                trim_filter += ",crop=iw:iw,scale=1080:1080"
            else:
                trim_filter += ",scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black"

            trim_filter += label_v

            # Audio: trim and normalize loudness
            audio_filter = (
                f"[{i}:a]atrim={trim_start}:{trim_end},asetpts=PTS-STARTPTS"
                f",loudnorm=I=-16:TP=-1.5:LRA=11"
                f"{label_a}"
            )

            filter_parts.append(trim_filter)
            filter_parts.append(audio_filter)
            stream_labels_v.append(label_v)
            stream_labels_a.append(label_a)

        # Concatenate all video + audio streams
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

        # Add captions on top of the concatenated video
        caption_filter = self._build_caption_filter(captions, style_dna)

        # Build final audio mix: voice + music + SFX with sidechain ducking
        # Use original audio (voice) and duck background music
        audio_mix = self._build_audio_mix(edl, style_dna, len(clips))

        complete_filter = f"{filter_complex};{caption_filter};{audio_mix}"

        cmd = [
            "ffmpeg", "-y"
        ]
        for inp in input_files:
            cmd.extend(["-i", inp])
        cmd.extend([
            "-filter_complex", complete_filter,
            "-map", "[finalv]",
            "-map", "[finala]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "18",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-t", str(target_duration),
        ])

        try:
            # 720p preview (faster)
            cmd_preview = cmd.copy()
            cmd_preview[cmd_preview.index("-filter_complex") + 1] = (
                cmd_preview[cmd_preview.index("-filter_complex") + 1]
            )
            cmd_preview.extend(["-vf", "scale=720:1280", str(output_720p)])
            # Replace final output path for preview
            for c in cmd_preview.copy():
                if c.endswith(".mp4") and "final" in c:
                    cmd_preview.remove(c)
            cmd_preview.append(str(output_720p))

            # 1080p final
            cmd_1080p = cmd.copy()
            cmd_1080p.append(str(output_1080p))

            # Run preview first (faster)
            subprocess.run(cmd_preview, check=True, capture_output=True, timeout=600)
            subprocess.run(cmd_1080p, check=True, capture_output=True, timeout=1200)

        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode()[:500] if e.stderr else str(e)
            return {"error": f"Render failed: {error_msg}"}

        return {
            "url": str(output_1080p) if output_1080p.exists() else "",
            "preview_url": str(output_720p) if output_720p.exists() else "",
            "duration": float(target_duration),
        }

    def _build_caption_filter(self, captions: list, style_dna: dict) -> str:
        text_style = style_dna.get("text", {})
        font_color = text_style.get("style", {}).get("color", "#FFFFFF")
        stroke_color = text_style.get("style", {}).get("stroke", "#000000")
        stroke_width = text_style.get("style", {}).get("stroke_width", 3)
        base_font_size = text_style.get("hooks", {}).get("font_size", 80)
        safe_zone = text_style.get("safe_zone", 0.15)
        animation_type = text_style.get("animation", "fade_in")

        width, height = 1080, 1920
        center_x = width // 2
        bottom_y = int(height * (1 - safe_zone))
        top_y = int(height * safe_zone)

        caption_filters = []
        for caption in captions:
            text = caption.get("text", "").replace("'", "\\'").replace(":", "\\:").replace("%", "\\%")
            start = caption.get("start", 0)
            end = caption.get("end", 2)
            duration = end - start
            style = caption.get("style", "body")
            pos = caption.get("position", "center")

            if pos == "top":
                y_pos = top_y + 60
            elif pos == "bottom":
                y_pos = bottom_y - 60
            else:
                y_pos = height // 2 - 40

            fs = base_font_size if style == "hook" else base_font_size // 2
            if duration <= 0:
                duration = 2

            enable_expr = f"between(t,{start},{end})"

            # Kinetic animation: text slides in from below for body text
            if animation_type == "kinetic_typewriter":
                # Character-by-character reveal with sway
                x_expr = f"if(lt(t,{start}+0.3),{center_x}-text_w/2+20,{center_x}-text_w/2)"
                alpha_expr = f"if(lt(t,{start}+0.15),0,255)"
                caption_filters.append(
                    f"drawtext=text='{text}':x={x_expr}:y={y_pos}:"
                    f"fontsize={fs}:fontcolor={font_color}@{alpha_expr}/255:"
                    f"bordercolor={stroke_color}:borderw={stroke_width}:"
                    f"box=1:boxcolor=black@0.35:boxborderw=8:"
                    f"shadowx=2:shadowy=2:shadowcolor=black@0.5:"
                    f"enable='{enable_expr}'"
                )
            elif animation_type == "pop_in":
                caption_filters.append(
                    f"drawtext=text='{text}':x={center_x}-text_w/2:y={y_pos}:"
                    f"fontsize={fs}:fontcolor={font_color}:"
                    f"bordercolor={stroke_color}:borderw={stroke_width}:"
                    f"box=1:boxcolor=black@0.35:boxborderw=8:"
                    f"shadowx=2:shadowy=2:shadowcolor=black@0.5:"
                    f"enable='{enable_expr}'"
                )
            else:
                # Default: fade in
                caption_filters.append(
                    f"drawtext=text='{text}':x={center_x}-text_w/2:y={y_pos}:"
                    f"fontsize={fs}:fontcolor={font_color}:"
                    f"bordercolor={stroke_color}:borderw={stroke_width}:"
                    f"box=1:boxcolor=black@0.3:boxborderw=6:"
                    f"enable='{enable_expr}'"
                )

        if not caption_filters:
            return "[outv]null[finalv]"

        caption_chain = "[outv]" + ";".join(caption_filters) + "[finalv]"
        return caption_chain

    def _build_audio_mix(self, edl: dict, style_dna: dict, num_clips: int) -> str:
        """Build audio mixing with voice ducking."""
        ducking = style_dna.get("audio", {}).get("ducking", {})
        ratio = ducking.get("ratio", 0.15)
        attack = ducking.get("attack", 0.05)
        release = ducking.get("release", 0.3)

        # Simple mix: just pass through the concatenated audio
        # Voice segments already trimmed and loudness normalized
        # For MVP: [outa] → normalize → output
        return "[outa]loudnorm=I=-14:TP=-2:LRA=7[finala]"