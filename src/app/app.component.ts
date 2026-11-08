import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CVData } from './core/models/cv-data.model';
import { CvDataService } from './core/services/cv-data.service';
import { CvViewerComponent } from './features/cv-viewer/cv-viewer.component';

type AppTab = 'resume' | 'source';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CvViewerComponent],
  template: `
    <div class="app-shell">
      <header class="app-header">
        <a class="brand" href="#" (click)="selectTab('resume'); $event.preventDefault()">
          <span class="brand-mark" aria-hidden="true">AS</span>
          <span class="brand-copy">
            <strong>Anne-Sophie HAMON</strong>
            <small>CCM · DÉVELOPPEMENT · DPO</small>
          </span>
        </a>

        <nav class="tabs" aria-label="Sections de l'application">
          <button type="button" [class.active]="activeTab() === 'resume'" [attr.aria-pressed]="activeTab() === 'resume'" (click)="selectTab('resume')">
            CV synthétique
          </button>
          <button type="button" [class.active]="activeTab() === 'source'" [attr.aria-pressed]="activeTab() === 'source'" (click)="selectTab('source')">
            Source JSON
          </button>
        </nav>

        @if (activeTab() === 'resume') {
          <a class="print-button" href="/api/cv.pdf" download="anne-sophie-hamon-cv.pdf">
            <span aria-hidden="true">⇩</span> Télécharger le PDF
          </a>
        } @else {
          <span class="header-spacer" aria-hidden="true"></span>
        }
      </header>

      <main class="main-content">
        @if (activeTab() === 'resume') {
          <section class="view-panel resume-panel" aria-label="CV synthétique">
            @if (loading()) {
              <p class="state-message" aria-live="polite">Chargement du CV…</p>
            } @else if (errorMessage()) {
              <div class="state-message error-message" role="alert">
                <p>{{ errorMessage() }}</p>
                <button class="retry-button" type="button" (click)="loadCv()">Réessayer</button>
              </div>
            } @else if (cvData(); as data) {
              <app-cv-viewer [data]="data"></app-cv-viewer>
            }
          </section>
        } @else {
          <section class="view-panel tool-panel source-panel">
            <div class="panel-heading">
              <div>
                <p class="eyebrow">ARCHITECTURE / 02</p>
                <h1>Source de données <span>CV</span></h1>
                <p>Le CV est alimenté par un JSON typé, séparé de son affichage.</p>
              </div>
              <button class="copy-button" type="button" (click)="copySource()">
                {{ copyStatus() || 'Copier le JSON' }}
              </button>
            </div>
            @if (cvData(); as data) {
              <pre class="source-code"><code>{{ formatSource(data) }}</code></pre>
            } @else if (errorMessage()) {
              <p class="state-message" role="alert">{{ errorMessage() }}</p>
            } @else {
              <p class="state-message" aria-live="polite">Chargement de la source…</p>
            }
          </section>
        }
      </main>

      <footer class="app-footer">
        <span>ANNE-SOPHIE HAMON <span class="footer-separator">/</span> REDON · NANTES · RENNES · VANNES</span>
        <span>PORTFOLIO INTERACTIF <span class="footer-separator">·</span> {{ activeTab() === 'source' ? 'SOURCE JSON' : 'CV' }}</span>
      </footer>
    </div>
  `,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly cvDataService = inject(CvDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeTab = signal<AppTab>('resume');
  readonly cvData = signal<CVData | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly copyStatus = signal('');

  ngOnInit(): void {
    this.loadCv();
  }

  selectTab(tab: AppTab): void {
    this.activeTab.set(tab);
    this.copyStatus.set('');
  }

  loadCv(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.cvDataService.getCVData()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.cvData.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Impossible de charger le CV. Vérifiez votre connexion puis réessayez.');
        }
      });
  }

  formatSource(data: CVData): string {
    return JSON.stringify(data, null, 2);
  }

  async copySource(): Promise<void> {
    const data = this.cvData();
    if (!data) {
      this.copyStatus.set('Source non disponible');
      return;
    }

    try {
      await navigator.clipboard.writeText(this.formatSource(data));
      this.copyStatus.set('JSON copié');
    } catch {
      this.copyStatus.set('Copie indisponible dans ce navigateur');
    }
  }

}
