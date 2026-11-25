/*
 * Software Name : GitHub Security Alerts
 * SPDX-FileCopyrightText: Copyright (c) Orange
 * SPDX-License-Identifier: MIT
 * 
 * This software is distributed under the MIT,
 * see the "LICENSE.txt" file for more details or https://opensource.org/license/mit
 * 
 * Software description: A modern desktop application that monitors security vulnerabilities across your GitHub repositories in real-time.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RepoInfo, OwnerInfo } from '../../../core/services';

export interface OwnerAccordion {
  owner: OwnerInfo;
  expanded: boolean;
  loading: boolean;
  loaded: boolean;
  repos: RepoInfo[];
}

@Component({
  selector: 'app-repos-panel',
  templateUrl: './repos-panel.component.html',
  styleUrls: ['./repos-panel.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class ReposPanelComponent {
  @Input() owners: OwnerAccordion[] = [];
  @Input() ownersLoading = false;
  @Input() searchQuery = '';

  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() toggleOwner = new EventEmitter<OwnerAccordion>();
  @Output() toggleRepo = new EventEmitter<RepoInfo>();
  @Output() selectAllForOwner = new EventEmitter<OwnerAccordion>();
  @Output() selectNoneForOwner = new EventEmitter<OwnerAccordion>();
  @Output() done = new EventEmitter<void>();

  get selectedCount(): number {
    return this.owners.reduce(
      (sum, o) => sum + o.repos.filter((r) => r.selected).length,
      0
    );
  }

  getSelectedCountForOwner(ownerAccordion: OwnerAccordion): number {
    return ownerAccordion.repos.filter((r) => r.selected).length;
  }

  getFilteredRepos(ownerAccordion: OwnerAccordion): RepoInfo[] {
    if (!this.searchQuery.trim()) {
      return ownerAccordion.repos;
    }
    const query = this.searchQuery.toLowerCase();
    return ownerAccordion.repos.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.owner.toLowerCase().includes(query)
    );
  }

  onSearchChange(value: string): void {
    this.searchQueryChange.emit(value);
  }

  onToggleOwner(ownerAccordion: OwnerAccordion): void {
    this.toggleOwner.emit(ownerAccordion);
  }

  onToggleRepo(repo: RepoInfo, event: Event): void {
    event.stopPropagation();
    this.toggleRepo.emit(repo);
  }

  onSelectAll(ownerAccordion: OwnerAccordion, event: Event): void {
    event.stopPropagation();
    this.selectAllForOwner.emit(ownerAccordion);
  }

  onSelectNone(ownerAccordion: OwnerAccordion, event: Event): void {
    event.stopPropagation();
    this.selectNoneForOwner.emit(ownerAccordion);
  }

  onDone(): void {
    this.done.emit();
  }
}
