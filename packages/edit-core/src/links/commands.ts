/**
 * @rhypdf/edit-core
 * Tasks 11.4 & 11.5: Hyperlink commands (Set, Remove).
 */

import type { EditCommand } from '../types';
import type { ObjectLink } from './types';

export class SetObjectLinkCommand implements EditCommand {
  public readonly id = `cmd-set-link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name = 'Set hyperlink';
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 128;

  constructor(
    public readonly pageIndex: number,
    public readonly objectId: string,
    public readonly link: ObjectLink,
    public readonly prevLink: ObjectLink | undefined,
    private readonly updateFn: (
      pageIndex: number,
      objectId: string,
      link: ObjectLink | undefined
    ) => Promise<void> | void
  ) {}

  async apply(): Promise<void> {
    await this.updateFn(this.pageIndex, this.objectId, this.link);
  }

  async revert(): Promise<void> {
    await this.updateFn(this.pageIndex, this.objectId, this.prevLink);
  }
}

export class RemoveObjectLinkCommand implements EditCommand {
  public readonly id = `cmd-remove-link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name = 'Remove hyperlink';
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 128;

  constructor(
    public readonly pageIndex: number,
    public readonly objectId: string,
    public readonly prevLink: ObjectLink,
    private readonly updateFn: (
      pageIndex: number,
      objectId: string,
      link: ObjectLink | undefined
    ) => Promise<void> | void
  ) {}

  async apply(): Promise<void> {
    await this.updateFn(this.pageIndex, this.objectId, undefined);
  }

  async revert(): Promise<void> {
    await this.updateFn(this.pageIndex, this.objectId, this.prevLink);
  }
}
