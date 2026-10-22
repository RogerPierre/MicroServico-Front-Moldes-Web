export interface Measurements {
  waist: number;
  hip: number;
  length: number;
}

export interface RenderApiResponse {
  status: 'success' | 'error';
  data: {
    svg_content: string;
    resolved_geometry: Record<string, unknown>;
    ai_vectors: number[][];
    bounding_box: {
      min_x: number;
      max_x: number;
      min_y: number;
      max_y: number;
    };
    canonical_json: string;
  };
}
