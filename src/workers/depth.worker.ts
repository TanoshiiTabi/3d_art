import { pipeline, RawImage } from "@huggingface/transformers";

let depthPipeline: Awaited<ReturnType<typeof pipeline>> | null = null;

self.onmessage = async (e: MessageEvent<{ imageDataUrl: string }>) => {
  try {
    self.postMessage({ type: "status", message: "Loading AI model…" });

    if (!depthPipeline) {
      depthPipeline = await pipeline(
        "depth-estimation",
        "onnx-community/depth-anything-v2-small",
        { device: "wasm" }
      );
    }

    self.postMessage({ type: "status", message: "Estimating depth…" });

    const image = await RawImage.fromURL(e.data.imageDataUrl);
    const result = await (depthPipeline as (img: RawImage) => Promise<{ predicted_depth: { data: Float32Array; dims: number[] } }>)(image);

    const { data, dims } = result.predicted_depth;
    const [h, w] = dims;

    // Normalise to [0, 1]
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }
    const range = max - min || 1;
    const normalised = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      normalised[i] = (data[i] - min) / range;
    }

    self.postMessage({ type: "done", depthMap: normalised, width: w, height: h }, { transfer: [normalised.buffer] });
  } catch (err) {
    self.postMessage({ type: "error", message: String(err) });
  }
};
