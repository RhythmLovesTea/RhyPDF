/**
 * @rhypdf/edit-core
 * Tasks 11.4 & 11.5: Hyperlink types and destinations.
 */

export type LinkType = 'url' | 'email' | 'phone' | 'page';

export interface UrlLinkDestination {
  type: 'url';
  url: string;
}

export interface EmailLinkDestination {
  type: 'email';
  email: string;
  subject?: string;
}

export interface PhoneLinkDestination {
  type: 'phone';
  phone: string;
}

export interface PageLinkDestination {
  type: 'page';
  pageIndex: number; // 0-based
}

export type LinkDestination =
  | UrlLinkDestination
  | EmailLinkDestination
  | PhoneLinkDestination
  | PageLinkDestination;

export interface ObjectLink {
  target: LinkDestination;
  tooltip?: string;
}

export interface WithLink {
  link?: ObjectLink;
}
