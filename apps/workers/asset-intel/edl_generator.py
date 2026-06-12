import json
from typing import List, Dict, Any, Optional
from openai import OpenAI


class EDLGenerator:
    def __init__(self, openai_api_key: str):
        self.openai = OpenAI(api_key=openai_api_key)

    def generate(self, style_dna: dict, asset_info: dict, voice_segments: list) -> Dict[str, Any]:
        """Generate Edit Decision List using LLM + algorithmic rules."""
        scene_count = sum(len(a.get("scenes", [])) for a in asset_info.get("assets", []))
        total_duration = sum(a.get("duration", 0) for a in asset_info.get("assets", []))
        target_duration = min(60, max(15, style_dna.get("editing", {}).get("avg_cut_duration", 2) * 15))

        edl = self._llm_generate_edl(style_dna, asset_info, voice_segments, target_duration)

        if not edl or "clips" not in edl:
            edl = self._algorithmic_edl(style_dna, asset_info, voice_segments, target_duration)

        return edl

    def _llm_generate_edl(self, style_dna: dict, asset_info: dict,
                           voice_segments: list, target_duration: float) -> Optional[Dict]:
        try:
            response = self.openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": """You are a professional video editor. Generate a precise 
                    Edit Decision List (EDL) that matches the given style DNA. Output JSON with:
                    - clips: ordered array of {asset_id, source_in, source_out, timeline_in, timeline_out, role, transition, zoom}
                    - captions: array of {text, start, end, style}
                    - music_track: "auto_select"
                    - target_duration: number"""},
                    {"role": "user", "content": json.dumps({
                        "style_dna": style_dna,
                        "asset_info": asset_info,
                        "voice_segments": voice_segments,
                        "target_duration": target_duration,
                    })}
                ],
                response_format={"type": "json_object"},
                max_tokens=4000,
            )
            return json.loads(response.choices[0].message.content)
        except Exception:
            return None

    def _algorithmic_edl(self, style_dna: dict, asset_info: dict,
                          voice_segments: list, target_duration: float) -> Dict:
        clips = []
        current_time = 0
        cut_duration = style_dna.get("editing", {}).get("avg_cut_duration", 2.0)
        num_clips = max(1, int(target_duration / cut_duration))
        roles = ["hook", "build", "build", "climax", "climax", "cta"]
        voice_seg_map = {vs.get("asset_id"): vs for vs in voice_segments if vs.get("asset_id")}

        for i, asset in enumerate(asset_info.get("assets", [])):
            scenes = asset.get("scenes", [])
            duration = asset.get("duration", 0)
            if not scenes:
                scenes = [{"start": 0, "end": duration}]

            for j, scene in enumerate(scenes[:max(1, num_clips // max(1, len(asset_info.get("assets", []))))]):
                if current_time >= target_duration:
                    break

                role = roles[j % len(roles)] if j < len(roles) else "filler"
                scene_duration = min(scene.get("duration", cut_duration), cut_duration * 1.5)
                if current_time + scene_duration > target_duration:
                    scene_duration = target_duration - current_time

                clip = {
                    "asset_id": asset.get("url", f"asset_{i}"),
                    "source_in": scene.get("start", 0),
                    "source_out": scene.get("start", 0) + scene_duration,
                    "timeline_in": current_time,
                    "timeline_out": current_time + scene_duration,
                    "role": role,
                    "transition": style_dna.get("editing", {}).get("transition_style", "hard_cut"),
                    "zoom": {"start": 1.0, "end": 1.0 + style_dna.get("editing", {}).get("zoom_intensity", 0) * 0.1}
                }

                if role == "hook" and "hook" in voice_seg_map:
                    vs = voice_seg_map["hook"]
                    clip["voice_segment"] = {"asset_id": vs["asset_id"], "start": vs["start"], "end": vs["end"]}

                clips.append(clip)
                current_time += scene_duration

        captions = self._generate_captions(clips, style_dna, voice_segments)

        return {
            "target_duration": target_duration,
            "aspect_ratio": "9:16",
            "music_track": "auto_select",
            "clips": clips,
            "captions": captions,
            "sfx": [
                {"type": "bass_hit", "time": clips[i]["timeline_in"], "volume": 0.8}
                for i in range(len(clips)) if i % 3 == 0
            ],
        }

    def _generate_captions(self, clips: List[Dict], style_dna: Dict,
                            voice_segments: List[Dict]) -> List[Dict]:
        captions = []
        for i, clip in enumerate(clips):
            role = clip.get("role", "filler")
            if role == "hook":
                captions.append({
                    "text": "NEW VIDEO",
                    "start": clip["timeline_in"],
                    "end": clip["timeline_in"] + 1.5,
                    "style": "hook",
                })
            elif role == "cta":
                captions.append({
                    "text": "Follow for more",
                    "start": clip["timeline_in"],
                    "end": clip["timeline_out"],
                    "style": "cta",
                })

            vs = clip.get("voice_segment")
            if vs and voice_segments:
                for seg in voice_segments:
                    if seg.get("asset_id") == vs.get("asset_id"):
                        captions.append({
                            "text": seg.get("transcript", "")[:100],
                            "start": clip["timeline_in"],
                            "end": clip["timeline_out"],
                            "style": "body",
                        })
                        break

        return captions