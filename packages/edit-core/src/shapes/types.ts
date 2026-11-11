/**
 * @rhypdf/edit-core
 * Task 11.1: Shape types and options.
 */

import type { ColorRGBA, PathObject } from '@rhypdf/pdf-model';

export type ShapeType =
  'rectangle' | 'roundedRectangle' | 'ellipse' | 'line' | 'arrow' | 'triangle' | 'star';

export interface ShapeOptions {
  fill?: boolean;
  fillColor?: ColorRGBA;
  stroke?: boolean;
  strokeColor?: ColorRGBA;
  lineWidth?: number;
  lineDash?: number[];
  opacity?: number;
  rotation?: number; // degrees
  cornerRadius?: number; // for rounded rectangles
  arrowHeadLength?: number;
  arrowHeadWidth?: number;
  starPoints?: number;
  innerRadiusRatio?: number;
}

export interface ShapeObject extends PathObject {
  shapeType: ShapeType;
  shapeOptions: ShapeOptions;
  rotation?: number;
  opacity?: number;
  isWhiteout?: boolean;
}
