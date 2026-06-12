export interface StyleDNA {
  visual: VisualStyle
  editing: EditingStyle
  text: TextStyle
  audio: AudioStyle
  story: StoryStyle
  confidence: number
}

export interface VisualStyle {
  colorGrade: string
  lutApproximation: number[][][]
  contrast: number
  saturation: number
  grain: number
}

export interface EditingStyle {
  avgCutDuration: number
  cutDistribution: 'exponential' | 'uniform' | 'burst'
  transitionStyle: 'zoom_flash' | 'glitch' | 'whip' | 'crossfade' | 'hard_cut'
  transitionParams: Record<string, number>
  zoomFrequency: number
  zoomIntensity: number
  beatSync: boolean
  beatSyncStrength: number
}

export interface TextStyle {
  font: string
  position: 'top' | 'center' | 'bottom' | 'lower_third'
  safeZone: number
  animation: 'kinetic_typewriter' | 'pop_in' | 'slide_up' | 'fade_in' | 'scale_in'
  animationParams: Record<string, number>
  style: {
    color: string
    stroke: string
    strokeWidth: number
    shadow: boolean
  }
  hooks: {
    fontSize: number
    duration: number
    animation: string
  }
}

export interface AudioStyle {
  musicEnergy: 'low' | 'medium' | 'high' | 'very_high'
  targetBPM: number
  musicRole: 'driving' | 'atmospheric' | 'percussive'
  sfxProfile: string[]
  sfxTiming: 'on_transition' | 'on_beat' | 'on_cut'
  voiceTreatment: 'preserve_original' | 'enhance' | 'normalize'
  ducking: {
    ratio: number
    attack: number
    release: number
  }
}

export interface StoryStyle {
  structure: ('hook' | 'build' | 'climax' | 'cta')[]
  sectionRatios: number[]
  pacingCurve: 'accelerating' | 'wave' | 'steady' | 'decelerating'
  hookStyle: 'text_overlay' | 'visual' | 'audio'
  ctaStyle: 'follow_for_more' | 'link_in_bio' | 'comment_below' | 'save_for_later'
}

export interface EditDecisionList {
  targetDuration: number
  aspectRatio: '9:16' | '1:1' | '4:5'
  musicTrack: string | 'auto_select'
  clips: ClipDecision[]
  captions: CaptionDecision[]
  sfx: SFXDecision[]
}

export interface ClipDecision {
  assetId: string
  sourceIn: number
  sourceOut: number
  timelineIn: number
  timelineOut: number
  role: 'hook' | 'build' | 'climax' | 'cta' | 'filler'
  transition?: string
  transitionParams?: Record<string, number>
  zoom?: { start: number; end: number; easing: string }
  pan?: { start: { x: number; y: number }; end: { x: number; y: number } }
  colorGrade?: string
  voiceSegment?: VoiceSegmentRef
}

export interface VoiceSegmentRef {
  assetId: string
  start: number
  end: number
}

export interface CaptionDecision {
  text: string
  start: number
  end: number
  style: 'hook' | 'body' | 'cta' | 'emphasis'
  position?: 'top' | 'center' | 'bottom'
}

export interface SFXDecision {
  type: string
  time: number
  volume: number
}

export interface AssetMetadata {
  id: string
  url: string
  type: 'video' | 'image' | 'audio'
  duration: number
  width: number
  height: number
  fps: number
  fileSize: number
  mimeType: string
  audioUrl?: string
  transcript?: string
  words?: WordTimestamp[]
  aiTags: string[]
  qualityScore: number
  scenes?: Scene[]
}

export interface WordTimestamp {
  word: string
  start: number
  end: number
  confidence: number
}

export interface Scene {
  start: number
  end: number
  score: number
  tags: string[]
}

export interface ReferenceReelAnalysis {
  url: string
  platform: string
  duration: number
  shots: ShotAnalysis[]
  audio: AudioAnalysis
  captions: CaptionAnalysis[]
  transitions: TransitionAnalysis[]
  colorGrade: ColorGradeAnalysis
  structure: StoryStructureAnalysis
}

export interface ShotAnalysis {
  start: number
  end: number
  duration: number
  type: 'wide' | 'medium' | 'closeup' | 'extreme_closeup' | 'pov' | 'drone'
  cameraMovement: 'static' | 'pan' | 'tilt' | 'zoom' | 'dolly' | 'handheld'
  dominantColors: string[]
  brightness: number
  contrast: number
}

export interface AudioAnalysis {
  bpm: number
  energy: number
  energyEnvelope: number[]
  beats: number[]
  downbeats: number[]
  onsets: number[]
  genre: string
  key: string
  loudness: number
}

export interface CaptionAnalysis {
  text: string
  start: number
  end: number
  position: string
  animation: string
  fontSize: number
  color: string
  style: string
}

export interface TransitionAnalysis {
  time: number
  type: string
  duration: number
  fromShot: number
  toShot: number
  params: Record<string, number>
}

export interface ColorGradeAnalysis {
  lutName: string
  contrast: number
  saturation: number
  temperature: number
  tint: number
  highlights: number
  shadows: number
  lift: number
  gamma: number
  gain: number
}

export interface StoryStructureAnalysis {
  hookEnd: number
  buildEnd: number
  climaxEnd: number
  sections: {
    name: string
    start: number
    end: number
    characteristics: string[]
  }[]
}