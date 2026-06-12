import { z } from 'zod'

export const FilterGraphSchema = z.object({
  filters: z.array(z.object({
    name: z.string(),
    inputs: z.array(z.string()),
    outputs: z.array(z.string()),
    params: z.record(z.union([z.string(), z.number(), z.boolean()])),
  })),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
})

export type FilterGraph = z.infer<typeof FilterGraphSchema>

export class FFmpegFilterGraphBuilder {
  private filters: FilterGraph['filters'] = []
  private inputIndex = 0
  private outputIndex = 0
  private labelCounter = 0

  addInput(label?: string): string {
    const inputLabel = label || `[${this.inputIndex++}:v]`
    return inputLabel
  }

  addOutput(label?: string): string {
    const outputLabel = label || `[out${this.outputIndex++}]`
    return outputLabel
  }

  private newLabel(prefix = 'tmp'): string {
    return `[${prefix}${this.labelCounter++}]`
  }

  trim(input: string, start: number, end: number, output?: string): string {
    const out = output || this.newLabel('trim')
    this.filters.push({
      name: 'trim',
      inputs: [input],
      outputs: [out],
      params: { start, end, duration: end - start },
    })
    return out
  }

  setpts(input: string, expr: string, output?: string): string {
    const out = output || this.newLabel('setpts')
    this.filters.push({
      name: 'setpts',
      inputs: [input],
      outputs: [out],
      params: { expr },
    })
    return out
  }

  scale(input: string, width: number, height: number, output?: string): string {
    const out = output || this.newLabel('scale')
    this.filters.push({
      name: 'scale',
      inputs: [input],
      outputs: [out],
      params: { width, height, force_original_aspect_ratio: 'decrease' },
    })
    return out
  }

  crop(input: string, width: number, height: number, x: number, y: number, output?: string): string {
    const out = output || this.newLabel('crop')
    this.filters.push({
      name: 'crop',
      inputs: [input],
      outputs: [out],
      params: { width, height, x, y },
    })
    return out
  }

  pad(input: string, width: number, height: number, x: number, y: number, color = 'black', output?: string): string {
    const out = output || this.newLabel('pad')
    this.filters.push({
      name: 'pad',
      inputs: [input],
      outputs: [out],
      params: { width, height, x, y, color },
    })
    return out
  }

  overlay(base: string, overlay: string, x: string | number, y: string | number, output?: string): string {
    const out = output || this.newLabel('overlay')
    this.filters.push({
      name: 'overlay',
      inputs: [base, overlay],
      outputs: [out],
      params: { x, y },
    })
    return out
  }

  concat(inputs: string[], output?: string): string {
    const out = output || this.newLabel('concat')
    this.filters.push({
      name: 'concat',
      inputs,
      outputs: [out],
      params: { n: inputs.length, v: 1, a: 0 },
    })
    return out
  }

  concatAudio(inputs: string[], output?: string): string {
    const out = output || this.newLabel('aconcat')
    this.filters.push({
      name: 'concat',
      inputs,
      outputs: [out],
      params: { n: inputs.length, v: 0, a: 1 },
    })
    return out
  }

  xfade(
    input1: string,
    input2: string,
    transition: string,
    duration: number,
    offset: number,
    output?: string
  ): string {
    const out = output || this.newLabel('xfade')
    this.filters.push({
      name: 'xfade',
      inputs: [input1, input2],
      outputs: [out],
      params: { transition, duration, offset },
    })
    return out
  }

  zoompan(
    input: string,
    zoom: string,
    x: string,
    y: string,
    duration: number,
    fps: number,
    output?: string
  ): string {
    const out = output || this.newLabel('zoompan')
    this.filters.push({
      name: 'zoompan',
      inputs: [input],
      outputs: [out],
      params: { zoom, x, y, d: duration * fps, s: 'hd1080', fps },
    })
    return out
  }

  drawtext(
    input: string,
    text: string,
    x: string | number,
    y: string | number,
    fontsize: number,
    fontcolor: string,
    fontfile?: string,
    output?: string
  ): string {
    const out = output || this.newLabel('drawtext')
    this.filters.push({
      name: 'drawtext',
      inputs: [input],
      outputs: [out],
      params: { text, x, y, fontsize, fontcolor, fontfile, borderw: 3, bordercolor: 'black' },
    })
    return out
  }

  colorgrade(input: string, lut?: string, contrast = 1, saturation = 1, output?: string): string {
    const out = output || this.newLabel('colorgrade')
    const params: Record<string, number | string> = { contrast, saturation }
    if (lut) params.lut = lut
    this.filters.push({
      name: 'colorgrade',
      inputs: [input],
      outputs: [out],
      params,
    })
    return out
  }

  curves(input: string, preset: string, output?: string): string {
    const out = output || this.newLabel('curves')
    this.filters.push({
      name: 'curves',
      inputs: [input],
      outputs: [out],
      params: { preset },
    })
    return out
  }

  eq(input: string, brightness: number, contrast: number, saturation: number, output?: string): string {
    const out = output || this.newLabel('eq')
    this.filters.push({
      name: 'eq',
      inputs: [input],
      outputs: [out],
      params: { brightness, contrast, saturation },
    })
    return out
  }

  volume(input: string, volume: number, output?: string): string {
    const out = output || this.newLabel('volume')
    this.filters.push({
      name: 'volume',
      inputs: [input],
      outputs: [out],
      params: { volume },
    })
    return out
  }

  afade(input: string, type: 'in' | 'out', startTime: number, duration: number, output?: string): string {
    const out = output || this.newLabel('afade')
    this.filters.push({
      name: 'afade',
      inputs: [input],
      outputs: [out],
      params: { type, start_time: startTime, duration },
    })
    return out
  }

  acrossfade(input1: string, input2: string, duration: number, output?: string): string {
    const out = output || this.newLabel('acrossfade')
    this.filters.push({
      name: 'acrossfade',
      inputs: [input1, input2],
      outputs: [out],
      params: { duration },
    })
    return out
  }

  sidechain(
    music: string,
    voice: string,
    threshold: number,
    ratio: number,
    attack: number,
    release: number,
    output?: string
  ): string {
    const out = output || this.newLabel('sidechain')
    this.filters.push({
      name: 'sidechaincompress',
      inputs: [music, voice],
      outputs: [out],
      params: { threshold, ratio, attack, release },
    })
    return out
  }

  amix(inputs: string[], duration: 'first' | 'longest' | 'shortest' = 'longest', output?: string): string {
    const out = output || this.newLabel('amix')
    this.filters.push({
      name: 'amix',
      inputs,
      outputs: [out],
      params: { inputs: inputs.length, duration, dropout_transition: 3 },
    })
    return out
  }

  adelay(input: string, delays: string, output?: string): string {
    const out = output || this.newLabel('adelay')
    this.filters.push({
      name: 'adelay',
      inputs: [input],
      outputs: [out],
      params: { delays },
    })
    return out
  }

  atrim(input: string, start: number, end: number, output?: string): string {
    const out = output || this.newLabel('atrim')
    this.filters.push({
      name: 'atrim',
      inputs: [input],
      outputs: [out],
      params: { start, end },
    })
    return out
  }

  asetpts(input: string, expr: string, output?: string): string {
    const out = output || this.newLabel('asetpts')
    this.filters.push({
      name: 'asetpts',
      inputs: [input],
      outputs: [out],
      params: { expr },
    })
    return out
  }

  build(): FilterGraph {
    const allInputs = new Set<string>()
    const allOutputs = new Set<string>()

    for (const filter of this.filters) {
      for (const input of filter.inputs) allInputs.add(input)
      for (const output of filter.outputs) allOutputs.add(output)
    }

    return {
      filters: this.filters,
      inputs: Array.from(allInputs),
      outputs: Array.from(allOutputs),
    }
  }

  toPythonScript(graph: FilterGraph): string {
    let script = '# Auto-generated FFmpeg filtergraph\n'
    script += 'import subprocess\n\n'
    script += 'filter_complex = """\n'

    for (const filter of graph.filters) {
      const inputs = filter.inputs.join('')
      const outputs = filter.outputs.join('')
      const params = Object.entries(filter.params)
        .map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v}'` : v}`)
        .join(':')
      script += `${inputs}${filter.name}=${params}${outputs};\\n`
    }

    script += '"""\n\n'
    script += 'def build_cmd(inputs: list[str], outputs: list[str]) -> list[str]:\n'
    script += '    cmd = ["ffmpeg", "-y"]\n'
    script += '    for inp in inputs:\n'
    script += '        cmd.extend(["-i", inp])\n'
    script += '    cmd.extend(["-filter_complex", filter_complex])\n'
    script += '    for i, out in enumerate(outputs):\n'
    script += '        cmd.extend(["-map", f"[{out}]", out])\n'
    script += '    return cmd\n'

    return script
  }

  reset(): void {
    this.filters = []
    this.inputIndex = 0
    this.outputIndex = 0
    this.labelCounter = 0
  }
}

export function createBuilder(): FFmpegFilterGraphBuilder {
  return new FFmpegFilterGraphBuilder()
}