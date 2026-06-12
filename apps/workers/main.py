import modal

app = modal.App("nexcut-workers")

style_dna_function = modal.Function.from_name("nexcut-style-dna", "extract_style_dna")
asset_intel_function = modal.Function.from_name("nexcut-asset-intel", "process_assets")
render_function = modal.Function.from_name("nexcut-render", "render_reel")