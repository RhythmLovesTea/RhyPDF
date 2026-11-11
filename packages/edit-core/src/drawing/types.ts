/**
 * @rhypdf/edit-core
 * Task 11.2: Free-hand drawing types.
 */

import type { ColorRGBA, PathObject, Point } from '@rhypdf/pdf-model';

export type DrawingTool = 'pen' | 'marker' | 'eraser';

export interface DrawingPoint extends Point {
  pressure?: number; // 0.0 to 1.0 (defaults to 0.5)
}

export interface DrawingStrokeOptions {
  tool: DrawingTool;
  color?: ColorRGBA;
  lineWidth?: number;
  opacity?: number;
}

export interface DrawingStrokeObject extends PathObject {
  isDrawingStroke: true;
  tool: DrawingTool;
  rawPoints: DrawingPoint[];
  opacity?: number;
}
