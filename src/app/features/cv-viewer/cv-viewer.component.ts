import { Component, Input } from '@angular/core';
import { CVData, Experience, SkillCategory } from '../../core/models/cv-data.model';

type ResumeView = 'ccm' | 'dpo' | 'full';

@Component({
  selector: 'app-cv-viewer',
  standalone: true,
  template: `
    <article class="resume">
      <header class="profile-card">
        <div class="profile-main">
          <p class="target-label"><span></span> CIBLE : INGÉNIEURE CCM / RESTITUTION DOCUMENTAIRE</p>
          <h1>{{ data.identity.name }}</h1>
          <p class="profile-title">{{ data.identity.title }}</p>
          <p class="summary">{{ data.summary }}</p>
        </div>
        <div class="contact-list">
          <span class="contact-line">
            <svg class="contact-icon location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/>
              <circle cx="12" cy="10" r="2.5"/>
            </svg>
            {{ data.identity.location }}
          </span>
          <span class="contact-line">
            <svg class="contact-icon mobility-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m5 11 1.6-4.1A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.4L19 11l1.5 1.5V18h-3v-2H6.5v2h-3v-5.5L5 11Z"/>
              <path d="M6 11h12M7 13.5h.01M17 13.5h.01"/>
            </svg>
            {{ data.identity.mobility }}
          </span>
          @for (language of data.languages; track language.name) {
            <span class="contact-line"><span class="contact-icon">🌐</span>{{ language.name }} · {{ language.level }}</span>
          }
          <a class="contact-link" [href]="emailLink">
            <svg class="contact-icon email-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2"/>
              <path d="m3 7 9 6 9-6"/>
            </svg>
            <span class="contact-link-label">Me contacter</span>
          </a>
        </div>
      </header>

      <div class="resume-grid">
        <aside class="sidebar">
          <section class="resume-card skills-card">
            <h2><span class="section-icon">⌘</span> COMPÉTENCES</h2>
            <div class="view-switch" role="group" aria-label="Filtrer le CV par expertise">
              <button type="button" class="ccm-view" [class.active]="view === 'ccm'" [attr.aria-pressed]="view === 'ccm'" (click)="view = 'ccm'">CCM</button>
              <button type="button" class="dpo-view" [class.active]="view === 'dpo'" [attr.aria-pressed]="view === 'dpo'" (click)="view = 'dpo'">DPO</button>
              <button type="button" [class.active]="view === 'full'" [attr.aria-pressed]="view === 'full'" (click)="view = 'full'">TOUTES</button>
            </div>
            @for (category of visibleSkills; track category.category) {
              <div class="skill-group">
                <h3>{{ category.category }}</h3>
                <div class="skill-tags">
                  @for (skill of category.items; track skill) {
                    <span [class.highlight-ccm]="isCcmSkill(skill)" [class.highlight-dpo]="isDpoSkill(skill)">{{ skill }}</span>
                  }
                </div>
              </div>
              @if (category.category === 'Éditique & composition documentaire' && view !== 'dpo') {
                <section class="target-skills" aria-label="Environnements CCM visés">
                  <h3>{{ data.targetEnvironments.title }}</h3>
                  <div class="target-tags">
                    @for (item of data.targetEnvironments.items; track item) {
                      <span>{{ item }}</span>
                    }
                  </div>
                  <p>{{ data.targetEnvironments.note }}</p>
                  <div class="target-transition">
                    <h4>XSL-FO → CCM</h4>
                    <p>Logique de composition, données et règles métier transférables aux studios CCM modernes.</p>
                  </div>
                </section>
              }
            }
          </section>

          <section class="resume-card education-card">
            <h2><span class="section-icon education-icon">▣</span> FORMATION</h2>
            @for (item of data.education; track item.year + item.title) {
              <div class="education-item">
                <strong>{{ item.title }}</strong>
                <span>{{ item.school }} <i>{{ item.year }}</i></span>
              </div>
            }
          </section>

        </aside>

        <section class="resume-card experience-card">
          <div class="experience-heading">
            <h2><span class="section-icon">▤</span> PARCOURS & RÉALISATIONS</h2>
            <span class="years-label">2014 — AUJOURD'HUI</span>
          </div>
          <div class="timeline">
            @for (experience of visibleExperiences; track experience.id) {
              <article class="experience">
                <div class="experience-meta">
                  <span class="period">{{ experience.period }}</span>
                  <span class="company">{{ experience.company }} · {{ experience.location }}</span>
                </div>
                <h3>{{ experience.role }}</h3>
                <ul>
                  @for (highlight of visibleHighlights(experience); track highlight) {
                    <li>{{ highlight }}</li>
                  }
                </ul>
                <div class="experience-tags">
                  @for (tag of experience.techStack; track tag) {
                    <span>{{ tag }}</span>
                  }
                </div>
              </article>
            }
          </div>
        </section>
      </div>
    </article>
  `,
  styleUrl: './cv-viewer.component.css'
})
export class CvViewerComponent {
  @Input({ required: true }) data!: CVData;

  view: ResumeView = 'ccm';
  readonly emailLink = `mailto:${['as.hamon', 'outlook.com'].join('@')}`;

  get visibleSkills(): SkillCategory[] {
    return this.data.skills.filter((category) =>
      this.view === 'full'
      || (this.view === 'ccm' && category.ccmWeight >= 3)
      || (this.view === 'dpo' && category.dpoWeight >= 3)
    );
  }

  get visibleExperiences(): Experience[] {
    const experiences = this.data.experiences.filter((experience) =>
      this.view === 'full'
      || (this.view === 'ccm' && experience.ccmFocus)
      || (this.view === 'dpo' && experience.dpoFocus)
    );

    if (this.view === 'full') {
      return experiences;
    }

    const order = this.view === 'ccm' ? 'ccmOrder' : 'dpoOrder';
    return experiences.sort((a, b) => a[order] - b[order]);
  }

  visibleHighlights(experience: Experience): string[] {
    if (this.view === 'ccm') {
      return experience.ccmHighlights;
    }
    if (this.view === 'dpo') {
      return experience.dpoHighlights;
    }
    return [...experience.ccmHighlights, ...experience.dpoHighlights];
  }

  isCcmSkill(skill: string): boolean {
    return /XSL-FO|XML|XSLT|Java|JSON|PDF|Markdown|SQL|Rigueur|Esprit d’analyse|synthèse|adaptabilité|chaîne/i.test(skill);
  }

  isDpoSkill(skill: string): boolean {
    return /RGPD|DPO|ISO 27001|AIPD|Privacy|DPA|IA Act/i.test(skill);
  }
}
