import json
from typing import List, Dict, Any, Optional
from openai import OpenAI


class EDLGenerator:
    def __init__(self, openai_api_key: str):
        self.openai = OpenAI(api_key=openai_api_key)

    def generate(self, style_dna: dict, asset_info: dict, voice_segments: list,
                 variant: str = 'balanced', music_mood: str = 'auto') -> Dict[str, Any]:
        """Generate Edit Decision List using LLM + algorithmic rules."""
        assets = asset_info.get("assets", [])
        total_duration = sum(a.get("duration", 0) for a in assets)
        cut_duration = style_dna.get("editing", {}).get("avg_cut_duration", 1.2)

        # Quality-weighted target duration
        target_duration = min(60, max(15, cut_duration * 15))

        # Apply variant pacing override
        variant_pacing = {
            'fast': {'cut_duration': 0.6, 'zoom_frequency': 0.6, 'beat_sync': 1.0},
            'balanced': {'cut_duration': 1.2, 'zoom_frequency': 0.4, 'beat_sync': 0.8},
            'cinematic': {'cut_duration': 2.5, 'zoom_frequency': 0.2, 'beat_sync': 0.5},
        }.get(variant, {})
        for k, v in variant_pacing.items():
            if k == 'cut_duration':
                target_duration = min(60, max(15, v * 15))

        edl = self._llm_generate_edl(style_dna, asset_info, voice_segments, target_duration, variant, music_mood)

        if not edl or "clips" not in edl:
            edl = self._algorithmic_edl(style_dna, asset_info, voice_segments, target_duration, variant)

        return edl

    def _llm_generate_edl(self, style_dna: dict, asset_info: dict,
                           voice_segments: list, target_duration: float,
                           variant: str, music_mood: str) -> Optional[Dict]:
        try:
            response = self.openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": f"""You are a professional video editor. Generate a precise 
                    Edit Decision List (EDL) that matches the given style DNA. 
                    Variant: {variant} (fast=quick cuts, balanced=mix, cinematic=slow dramatic)
                    Music mood: {music_mood}
                    Output JSON with:
                    - clips: ordered array of {{asset_id, source_in, source_out, timeline_in, timeline_out, role, transition, zoom}}
                    - captions: array of {{text, start, end, style}}
                    - music_track: "auto_select"
                    - target_duration: number
                    - voice_segments_used: array of {{asset_id, start, end, role}}
                    Select the HIGHEST QUALITY clips based on quality_score.
                    Place voice segments at appropriate story positions (hook/build/climax/cta)."""},
                    {"role": "user", "content": json.dumps({
                        "style_dna": style_dna,
                        "asset_info": asset_info,
                        "voice_segments": voice_segments,
                        "target_duration": target_duration,
                        "variant": variant,
                        "music_mood": music_mood,
                    })}
                ],
                response_format={"type": "json_object"},
                max_tokens=4000,
            )
            return json.loads(response.choices[0].message.content)
        except Exception:
            return None

    def _algorithmic_edl(self, style_dna: dict, asset_info: dict,
                          voice_segments: list, target_duration: float,
                          variant: str = 'balanced') -> Dict:
        clips = []
        current_time = 0

        assets = asset_info.get("assets", [])
        if not assets:
            return {"target_duration": target_duration, "aspect_ratio": "9:16",
                    "clips": [], "captions": [], "sfx": []}

        # Sort assets by quality score (highest first) to prioritize best footage
        scored_assets = []
        for asset in assets:
            score = asset.get("quality_score", 0.5)
            scored_assets.append((score, asset))
        scored_assets.sort(key=lambda x: x[0], reverse=True)

        # Apply variant pacing
        pacing_map = {
            'fast': {'cut_duration': 0.6, 'zoom_frequency': 0.6, 'beat_sync': 1.0, 'num_clips_factor': 1.5},
            'balanced': {'cut_duration': 1.2, 'zoom_frequency': 0.4, 'beat_sync': 0.8, 'num_clips_factor': 1.0},
            'cinematic': {'cut_duration': 2.5, 'zoom_frequency': 0.2, 'beat_sync': 0.5, 'num_clips_factor': 0.6},
        }
        pacing = pacing_map.get(variant, pacing_map['balanced'])

        cut_duration = style_dna.get("editing", {}).get("avg_cut_duration", pacing['cut_duration'])
        cut_duration = pacing['cut_duration']  # override with variant
        num_clips = max(3, int(target_duration / cut_duration) + 2)

        roles = ["hook", "build", "build", "climax", "climax", "cta"]

        # Map voice segments by asset for easy lookup
        voice_by_asset: Dict[str, List[Dict]] = {}
        for vs in voice_segments:
            aid = vs.get("asset_id")
            if aid:
                voice_by_asset.setdefault(aid, []).append(vs)

        clip_index = 0
        for score, asset in scored_assets:
            scenes = asset.get("scenes", [])
            duration = asset.get("duration", 0)
            if not scenes:
                scenes = [{"start": 0, "end": duration, "score": 1.0}]
            if duration <= 0:
                continue

            # Sort scenes by score (highest first)
            scenes_sorted = sorted(scenes, key=lambda s: s.get("score", 1.0), reverse=True)

            for scene in scenes_sorted[:2]:  # Take top 2 scenes per asset
                if current_time >= target_duration or clip_index >= num_clips:
                    break

                role = roles[clip_index % len(roles)] if clip_index < len(roles) else "filler"
                scene_duration = min(scene.get("duration", cut_duration), cut_duration * 1.2)

                if current_time + scene_duration > target_duration:
                    scene_duration = target_duration - current_time
                if scene_duration < 0.3:
                    continue

                asset_id = asset.get("url", f"asset_{clip_index}")

                clip = {
                    "asset_id": asset_id,
                    "source_in": scene.get("start", 0),
                    "source_out": scene.get("start", 0) + scene_duration,
                    "timeline_in": current_time,
                    "timeline_out": current_time + scene_duration,
                    "role": role,
                    "transition": style_dna.get("editing", {}).get("transition_style", "hard_cut"),
                    "zoom": {
                        "start": 1.0,
                        "end": 1.0 + style_dna.get("editing", {}).get("zoom_intensity", 1.2) * 0.1 * pacing['zoom_frequency']
                    }
                }

                # Attach voice segments to matching clips
                if asset_id in voice_by_asset and role in ['hook', 'climax', 'cta']:
                    for vs in voice_by_asset[asset_id]:
                        clip["voice_segment"] = {
                            "asset_id": vs.get("asset_id", asset_id),
                            "start": vs.get("start", 0),
                            "end": vs.get("end", min(duration, vs.get("start", 0) + scene_duration)),
                        }
                        break

                clips.append(clip)
                current_time += scene_duration
                clip_index += 1

        # If we still have room, add more clips from best assets
        if current_time < target_duration and clips:
            last_clip = clips[-1]
            remaining = target_duration - current_time
            clips.append({
                "asset_id": last_clip.get("asset_id", ""),
                "source_in": last_clip.get("source_out", 0),
                "source_out": last_clip.get("source_out", 0) + remaining,
                "timeline_in": current_time,
                "timeline_out": target_duration,
                "role": "cta",
                "transition": "crossfade",
                "zoom": {"start": 1.0, "end": 1.05},
            })

        captions = self._generate_captions(clips, style_dna, voice_segments)

        sfx_interval = 2 if variant == 'fast' else 3 if variant == 'balanced' else 4
        sfx = [
            {"type": "bass_hit", "time": clips[i]["timeline_in"], "volume": 0.8}
            for i in range(len(clips)) if i % sfx_interval == 0
        ]

        return {
            "target_duration": target_duration,
            "aspect_ratio": "9:16",
            "music_track": "auto_select",
            "music_mood": music_mood or "auto",
            "clips": clips,
            "captions": captions,
            "sfx": sfx,
        }

    def _generate_captions(self, clips: List[Dict], style_dna: Dict,
                            voice_segments: List[Dict]) -> List[Dict]:
        captions = []
        hook_texts = ["ATTENTION", "WATCH THIS", "HOLD UP", "YOU NEED TO SEE THIS",
                       "STOP SCROLLING", "HERE'S WHY", "BIG UPDATE", "TRANSFORMATION"]
        cta_texts = ["Follow for more", "Save this", "Share with a friend",
                      "Comment below", "Double tap if you agree"]

        hook_idx = 0
        cta_idx = 0

        for i, clip in enumerate(clips):
            role = clip.get("role", "filler")
            mid = (clip["timeline_in"] + clip["timeline_out"]) / 2

            if role == "hook":
                captions.append({
                    "text": hook_texts[hook_idx % len(hook_texts)],
                    "start": clip["timeline_in"],
                    "end": clip["timeline_in"] + 1.5,
                    "style": "hook",
                    "position": "center",
                })
                hook_idx += 1
            elif role == "cta":
                captions.append({
                    "text": cta_texts[cta_idx % len(cta_texts)],
                    "start": clip["timeline_in"],
                    "end": clip["timeline_out"],
                    "style": "cta",
                    "position": "bottom",
                })
                cta_idx += 1

            vs = clip.get("voice_segment")
            if vs:
                for seg in voice_segments:
                    if seg.get("asset_id") == vs.get("asset_id"):
                        transcript = seg.get("transcript", "")
                        if transcript and len(transcript) > 5:
                            captions.append({
                                "text": transcript[:80],
                                "start": clip["timeline_in"],
                                "end": clip["timeline_out"],
                                "style": "body",
                                "position": "center",
                            })
                        break

        return captions