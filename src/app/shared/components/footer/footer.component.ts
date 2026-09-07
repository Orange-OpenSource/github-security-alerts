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

import { Component, Input } from '@angular/core';
import { AlertsResponse, TauriService } from '../../../core/services';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: false,
})
export class FooterComponent {
  @Input() alerts: AlertsResponse | null = null;
  @Input() authenticated = false;

  constructor(private tauriService: TauriService) {}

  getLastUpdate(): string {
    return new Date().toLocaleTimeString();
  }

  openGitHub(): void {
    const url = `https://github.com/Orange-OpenSource/github-security-alerts`;
    this.tauriService.openExternalLink(url);
  }
}
