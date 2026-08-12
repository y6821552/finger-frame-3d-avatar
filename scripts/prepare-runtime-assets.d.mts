export interface RuntimeModelAsset {
  filename: string;
  url: string;
  sha256: string;
}

export interface PrepareRuntimeAssetsOptions {
  rootDir: string;
  wasmSourceDir: string;
  models?: RuntimeModelAsset[];
  wasmFiles?: string[];
  fetchImpl?: (url: string) => Promise<{
    ok: boolean;
    status?: number;
    arrayBuffer(): Promise<ArrayBuffer>;
  }>;
  log?: (message: string) => void;
}

export declare const MODELS: RuntimeModelAsset[];
export declare const WASM_FILES: string[];
export declare function prepareRuntimeAssets(
  options: PrepareRuntimeAssetsOptions,
): Promise<{ downloaded: number; copied: number }>;
