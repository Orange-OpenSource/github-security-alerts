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

import { ApplicationRef, NgZone, provideZoneChangeDetection } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { TranslateModule } from '@ngx-translate/core';
import { AlertsResponse, RepoInfo, TauriService, UpdateService } from './core/services';
import { SharedModule } from './shared/shared.module';

describe('AppComponent', () => {
  let tauri: jasmine.SpyObj<TauriService>;
  let updateService: jasmine.SpyObj<UpdateService>;

  beforeEach(waitForAsync(() => {
    tauri = jasmine.createSpyObj<TauriService>('TauriService', [
      'getRefreshInterval',
      'getAuthStatus',
      'getToken',
    ]);
    tauri.getRefreshInterval.and.resolveTo(60);
    tauri.getAuthStatus.and.resolveTo({ authenticated: false, username: null });
    tauri.getToken.and.resolveTo(null);
    updateService = jasmine.createSpyObj<UpdateService>('UpdateService', [
      'startAutomaticUpdateCheck',
      'stopAutomaticUpdateCheck',
    ]);

    TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [
        { provide: TauriService, useValue: tauri },
        { provide: UpdateService, useValue: updateService },
      ],
      imports: [RouterTestingModule, SharedModule, TranslateModule.forRoot()],
      errorOnUnknownElements: true,
      errorOnUnknownProperties: true,
    }).compileComponents();
  }));

  it('should create the app', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    const initialized = new Promise<void>((resolve) => {
      updateService.startAutomaticUpdateCheck.and.callFake(() => resolve());
    });
    fixture.detectChanges();
    await initialized;

    expect(app).toBeTruthy();
    expect(tauri.getRefreshInterval).toHaveBeenCalled();
    expect(tauri.getAuthStatus).toHaveBeenCalled();
    expect(tauri.getToken).toHaveBeenCalled();
    expect(updateService.startAutomaticUpdateCheck).toHaveBeenCalledWith(60);
  });
});

describe('AppComponent async updates', () => {
  let tauri: jasmine.SpyObj<TauriService>;
  let updateService: jasmine.SpyObj<UpdateService>;

  beforeEach(async () => {
    tauri = jasmine.createSpyObj<TauriService>('TauriService', [
      'getGitHubSecurityAlerts',
      'updateTrayIcon',
      'getReposForOwner',
      'getRefreshInterval',
      'getAuthStatus',
      'getToken',
    ]);
    updateService = jasmine.createSpyObj<UpdateService>('UpdateService', [
      'startAutomaticUpdateCheck',
      'stopAutomaticUpdateCheck',
    ]);
    tauri.updateTrayIcon.and.resolveTo();
    tauri.getRefreshInterval.and.resolveTo(0);
    tauri.getAuthStatus.and.resolveTo({ authenticated: false, username: null });
    tauri.getToken.and.resolveTo(null);

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [SharedModule, TranslateModule.forRoot()],
      providers: [
        provideZoneChangeDetection(),
        { provide: TauriService, useValue: tauri },
        { provide: UpdateService, useValue: updateService },
      ],
      errorOnUnknownElements: true,
      errorOnUnknownProperties: true,
    }).compileComponents();
  });

  async function createApp() {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    fixture.componentInstance.authenticated = true;
    fixture.detectChanges();
    return fixture;
  }

  it('updates the displayed alerts after a refresh completes', async () => {
    let resolveAlerts!: (value: AlertsResponse) => void;
    tauri.getGitHubSecurityAlerts.and.returnValue(
      new Promise<AlertsResponse>((resolve) => (resolveAlerts = resolve))
    );
    const fixture = await createApp();
    const application = TestBed.inject(ApplicationRef);

    fixture.nativeElement.querySelector('button[title="Refresh"]').click();
    application.tick();
    expect(fixture.nativeElement.textContent).toContain('Loading alerts...');

    TestBed.inject(NgZone).runOutsideAngular(() => {
      resolveAlerts({
        total_alerts: 2,
        repos: [{ name: 'owner/repo', alerts: 2, dev_alerts: 0, dependabot_enabled: true }],
      });
    });
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Loading alerts...');
    expect(fixture.nativeElement.textContent).toContain('2 security alert(s) found');
  });

  it('displays an error and stops loading when a refresh fails', async () => {
    let rejectAlerts!: (reason: Error) => void;
    tauri.getGitHubSecurityAlerts.and.returnValue(
      new Promise<AlertsResponse>((_, reject) => (rejectAlerts = reject))
    );
    spyOn(console, 'error');
    const fixture = await createApp();
    const application = TestBed.inject(ApplicationRef);

    fixture.nativeElement.querySelector('button[title="Refresh"]').click();
    application.tick();
    expect(fixture.nativeElement.textContent).toContain('Loading alerts...');

    TestBed.inject(NgZone).runOutsideAngular(() => rejectAlerts(new Error('Request failed')));
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).not.toContain('Loading alerts...');
    expect(fixture.nativeElement.textContent).toContain('Failed to fetch alerts: Error: Request failed');
  });

  it('updates a repository accordion after its repositories load', async () => {
    let resolveRepos!: (value: RepoInfo[]) => void;
    tauri.getReposForOwner.and.returnValue(
      new Promise<RepoInfo[]>((resolve) => (resolveRepos = resolve))
    );
    const fixture = await createApp();
    const application = TestBed.inject(ApplicationRef);
    fixture.componentInstance.currentView = 'repos';
    fixture.componentInstance.owners = [{
      owner: { name: 'owner', is_user: true },
      expanded: false,
      loading: false,
      loaded: false,
      repos: [],
    }];
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.accordion-header').click();
    application.tick();
    expect(fixture.nativeElement.querySelector('.loading-spinner.small')).not.toBeNull();

    resolveRepos([{ full_name: 'owner/repo', name: 'repo', owner: 'owner', selected: false }]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.loading-spinner.small')).toBeNull();
    expect(fixture.nativeElement.querySelector('.repos-list').textContent).toContain('repo');
  });
});
