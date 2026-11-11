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

export interface BookmarkItem {
  id: string;
  title: string;
  pageIndex: number;
  color?: string;
  isBold?: boolean;
  isItalic?: boolean;
  children?: BookmarkItem[];
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
  close?: boolean;
}

export interface PathObject extends BasePageObject {
  type: 'path';
  segments: PathSegment[];
  fillColor?: ColorRGBA;
  strokeColor?: ColorRGBA;
  lineWidth: number;
  stroke?: boolean;
  fill?: boolean;
  fillMode?: 'none' | 'alternate' | 'winding';
  dashArray?: number[];
  dashPhase?: number;
}

export interface FormObject extends BasePageObject {
  type: 'form';
  subObjects: PageObject[];
}

export type AnnotationSubtype =
  | 'Highlight'
  | 'Underline'
  | 'StrikeOut'
  | 'Squiggly'
  | 'Text'
  | 'Stamp'
  | 'Signature'
  | 'Widget'
  | string;

export interface AnnotationComment {
  id: string;
  author: string;
  contents: string;
  createdAt: string;
  modifiedAt?: string;
}

export interface AnnotationObject extends BasePageObject {
  type: 'annotation';
  subType: AnnotationSubtype;
  contents?: string;
  quadPoints?: number[];
  color?: ColorRGBA;
  opacity?: number;
  author?: string;
  createdAt?: string;
  modifiedAt?: string;
  icon?: string;
  stampType?: string;
  customText?: string;
  customColor?: ColorRGBA;
  imageUri?: string;
  rotation?: number;
  signatureType?: 'draw' | 'type' | 'upload';
  signatureData?: string;
  signerName?: string;
  comments?: AnnotationComment[];
  isOpen?: boolean;
  // Widget / Form field properties
  fieldType?: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'list' | 'button' | 'signature';
  fieldName?: string;
  fieldValue?: string | boolean | string[];
  defaultValue?: string | boolean;
  readOnly?: boolean;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  tabOrder?: number;
}

export type PageObject = TextRun | ImageObject | PathObject | FormObject | AnnotationObject;

export interface CoordinateMapperOptions {
  cropBox?: Rect;
  userUnit?: number;
}

/**
 * CoordinateMapper
 * Converts coordinates between PDF points (origin bottom-left, Y up),
 * rendered page bitmap pixels (origin top-left, Y down), and
 * screen / CSS pixels (origin top-left, Y down).
 */
export class CoordinateMapper {
  public readonly cropBox: Rect;
  public readonly userUnit: number;
  public readonly effectiveWidthPt: number;
  public readonly effectiveHeightPt: number;

  constructor(
    public readonly pageWidthPt: number,
    public readonly pageHeightPt: number,
    public readonly rotation: RotationAngle = 0,
    public readonly scale: number = 1.0,
    public readonly dpr: number = 1.0,
    options?: CoordinateMapperOptions
  ) {
    this.cropBox = options?.cropBox ?? {
      left: 0,
      bottom: 0,
      right: pageWidthPt,
      top: pageHeightPt
    };
    this.userUnit = options?.userUnit ?? 1.0;
    this.effectiveWidthPt = (this.cropBox.right - this.cropBox.left) * this.userUnit;
    this.effectiveHeightPt = (this.cropBox.top - this.cropBox.bottom) * this.userUnit;
  }

  /**
   * PDF point (x, y) to CSS viewport pixel (x, y)
   */
  pdfPointToCss(ptX: number, ptY: number): Point {
    const s = this.scale;
    const u = this.userUnit;
    const relX = (ptX - this.cropBox.left) * u;
    const relY = (ptY - this.cropBox.bottom) * u;

    switch (this.rotation) {
      case 90:
        return {
          x: relY * s,
          y: relX * s
        };
      case 180:
        return {
          x: (this.effectiveWidthPt - relX) * s,
          y: relY * s
        };
      case 270:
        return {
          x: (this.effectiveHeightPt - relY) * s,
          y: (this.effectiveWidthPt - relX) * s
        };
      case 0:
      default:
        return {
          x: relX * s,
          y: (this.effectiveHeightPt - relY) * s
        };
    }
  }

  /**
   * CSS pixel (x, y) to PDF point (x, y)
   */
  cssPointToPdf(cssX: number, cssY: number): Point {
    const s = this.scale;
    const invS = 1 / s;
    const u = this.userUnit;
    const invU = 1 / u;

    let relX: number;
    let relY: number;

    switch (this.rotation) {
      case 90:
        relY = cssX * invS;
        relX = cssY * invS;
        break;
      case 180:
        relX = this.effectiveWidthPt - cssX * invS;
        relY = cssY * invS;
        break;
      case 270:
        relY = this.effectiveHeightPt - cssX * invS;
        relX = this.effectiveWidthPt - cssY * invS;
        break;
      case 0:
      default:
        relX = cssX * invS;
        relY = this.effectiveHeightPt - cssY * invS;
        break;
    }

    return {
      x: this.cropBox.left + relX * invU,
      y: this.cropBox.bottom + relY * invU
    };
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
   * CSS BoundingBox (x, y, width, height) to PDF Rect (left, bottom, right, top)
   */
  cssRectToPdf(box: BoundingBox): Rect {
    const p1 = this.cssPointToPdf(box.x, box.y);
    const p2 = this.cssPointToPdf(box.x + box.width, box.y + box.height);
    return {
      left: Math.min(p1.x, p2.x),
      right: Math.max(p1.x, p2.x),
      bottom: Math.min(p1.y, p2.y),
      top: Math.max(p1.y, p2.y)
    };
  }

  /**
   * PDF point (x, y) to Bitmap physical pixel (x, y)
   */
  pdfPointToBitmap(ptX: number, ptY: number): Point {
    const css = this.pdfPointToCss(ptX, ptY);
    return {
      x: css.x * this.dpr,
      y: css.y * this.dpr
    };
  }

  /**
   * Bitmap physical pixel (x, y) to PDF point (x, y)
   */
  bitmapPointToPdf(bmX: number, bmY: number): Point {
    return this.cssPointToPdf(bmX / this.dpr, bmY / this.dpr);
  }

  /**
   * PDF Rect to Bitmap BoundingBox in physical pixels
   */
  pdfRectToBitmap(rect: Rect): BoundingBox {
    const css = this.pdfRectToCss(rect);
    return {
      x: css.x * this.dpr,
      y: css.y * this.dpr,
      width: css.width * this.dpr,
      height: css.height * this.dpr
    };
  }

  /**
   * Bitmap BoundingBox to PDF Rect
   */
  bitmapRectToPdf(bmBox: BoundingBox): Rect {
    return this.cssRectToPdf({
      x: bmBox.x / this.dpr,
      y: bmBox.y / this.dpr,
      width: bmBox.width / this.dpr,
      height: bmBox.height / this.dpr
    });
  }

  /**
   * CSS pixel (x, y) to Bitmap pixel (x, y)
   */
  cssPointToBitmap(cssX: number, cssY: number): Point {
    return {
      x: cssX * this.dpr,
      y: cssY * this.dpr
    };
  }

  /**
   * Bitmap pixel (x, y) to CSS pixel (x, y)
   */
  bitmapPointToCss(bmX: number, bmY: number): Point {
    return {
      x: bmX / this.dpr,
      y: bmY / this.dpr
    };
  }

  /**
   * Viewport pixel dimensions
   */
  getCssSize(): Size {
    const isSideways = this.rotation === 90 || this.rotation === 270;
    const w = isSideways ? this.effectiveHeightPt : this.effectiveWidthPt;
    const h = isSideways ? this.effectiveWidthPt : this.effectiveHeightPt;
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
