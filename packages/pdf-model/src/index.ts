/**
 * @rhypdf/pdf-model
 * Pure TypeScript domain models, geometry, coordinate transforms, and page objects.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Matrix2D = [number, number, number, number, number, number]; // [a, b, c, d, e, f]

export type RotationAngle = 0 | 90 | 180 | 270;

export interface ColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface PageInfo {
  pageIndex: number;
  width: number;
  height: number;
  rotation: RotationAngle;
  cropBox?: Rect;
  mediaBox?: Rect;
}

export type PageObjectType = 'text' | 'image' | 'path' | 'form' | 'annotation';

export interface BasePageObject {
  id: string;
  type: PageObjectType;
  bounds: Rect; // in PDF points
  matrix: Matrix2D;
  zIndex: number;
  parentFormChain?: string[];
}

export interface CharBox {
  char: string;
  box: Rect;
}

export type TextRenderMode =
  | 'fill'
  | 'stroke'
  | 'fillThenStroke'
  | 'invisible'
  | 'fillClip'
  | 'strokeClip'
  | 'fillStrokeClip'
  | 'clip';

export interface EmbeddedFontInfo {
  isEmbedded: boolean;
  isSubset: boolean;
  subsetTag?: string;
  flags?: number;
  weight?: number;
  isItalic?: boolean;
  isBold?: boolean;
}

export interface TextRun extends BasePageObject {
  type: 'text';
  text: string;
  fontName: string;
  fontSize: number;
  fillColor: ColorRGBA;
  strokeColor?: ColorRGBA;
  renderMode?: TextRenderMode;
  charSpacing?: number;
  wordSpacing?: number;
  horizontalScale?: number;
  rotation?: number;
  isEmbeddedSubset: boolean;
  fontInfo?: EmbeddedFontInfo;
  charBoxes?: CharBox[];
}

export interface ImageObject extends BasePageObject {
  type: 'image';
  pixelWidth: number;
  pixelHeight: number;
  effectiveDpi: { x: number; y: number };
  format?: 'png' | 'jpeg' | 'raw';
  filters?: string[];
  colorSpace?: 'DeviceGray' | 'DeviceRGB' | 'DeviceCMYK' | 'DeviceLab' | 'Unknown';
  bitsPerPixel?: number;
  hasMask?: boolean;
  hasSoftMask?: boolean;
  previewBitmap?: ImageBitmap;
}

export interface PathSegment {
  type: 'moveTo' | 'lineTo' | 'bezierCurveTo' | 'closePath';
  points: Point[];
}

export interface PathObject extends BasePageObject {
  type: 'path';
  segments: PathSegment[];
  fillColor?: ColorRGBA;
  strokeColor?: ColorRGBA;
  lineWidth: number;
}

export interface FormObject extends BasePageObject {
  type: 'form';
  subObjects: PageObject[];
}

export interface AnnotationObject extends BasePageObject {
  type: 'annotation';
  subType: string;
  contents?: string;
}

export type PageObject = TextRun | ImageObject | PathObject | FormObject | AnnotationObject;

/**
 * CoordinateMapper
 * Converts coordinates between PDF points (origin bottom-left, Y up),
 * rendered page bitmap pixels (origin top-left, Y down), and
 * screen / CSS pixels (origin top-left, Y down).
 */
export class CoordinateMapper {
  constructor(
    public readonly pageWidthPt: number,
    public readonly pageHeightPt: number,
    public readonly rotation: RotationAngle = 0,
    public readonly scale: number = 1.0,
    public readonly dpr: number = 1.0
  ) {}

  /**
   * PDF point (x, y) to CSS viewport pixel (x, y)
   */
  pdfPointToCss(ptX: number, ptY: number): Point {
    const s = this.scale;
    switch (this.rotation) {
      case 90:
        return {
          x: ptY * s,
          y: ptX * s
        };
      case 180:
        return {
          x: (this.pageWidthPt - ptX) * s,
          y: ptY * s
        };
      case 270:
        return {
          x: (this.pageHeightPt - ptY) * s,
          y: (this.pageWidthPt - ptX) * s
        };
      case 0:
      default:
        return {
          x: ptX * s,
          y: (this.pageHeightPt - ptY) * s
        };
    }
  }

  /**
   * PDF Rect (left, bottom, right, top) to CSS BoundingBox (x, y, width, height)
   */
  pdfRectToCss(rect: Rect): BoundingBox {
    const p1 = this.pdfPointToCss(rect.left, rect.top);
    const p2 = this.pdfPointToCss(rect.right, rect.bottom);
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);
    return { x, y, width, height };
  }

  /**
   * CSS pixel (x, y) to PDF point (x, y)
   */
  cssPointToPdf(cssX: number, cssY: number): Point {
    const s = this.scale;
    const invS = 1 / s;
    switch (this.rotation) {
      case 90:
        return {
          x: cssY * invS,
          y: cssX * invS
        };
      case 180:
        return {
          x: this.pageWidthPt - cssX * invS,
          y: cssY * invS
        };
      case 270:
        return {
          x: this.pageWidthPt - cssY * invS,
          y: this.pageHeightPt - cssX * invS
        };
      case 0:
      default:
        return {
          x: cssX * invS,
          y: this.pageHeightPt - cssY * invS
        };
    }
  }

  /**
   * Viewport pixel dimensions
   */
  getCssSize(): Size {
    const isSideways = this.rotation === 90 || this.rotation === 270;
    const w = isSideways ? this.pageHeightPt : this.pageWidthPt;
    const h = isSideways ? this.pageWidthPt : this.pageHeightPt;
    return {
      width: Math.round(w * this.scale),
      height: Math.round(h * this.scale)
    };
  }

  /**
   * Canvas bitmap dimensions in physical device pixels
   */
  getBitmapSize(): Size {
    const css = this.getCssSize();
    return {
      width: Math.round(css.width * this.dpr),
      height: Math.round(css.height * this.dpr)
    };
  }
}
