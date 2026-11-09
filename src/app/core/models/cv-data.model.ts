export interface Identity {
  name: string;
  title: string;
  tagline: string;
  location: string;
  mobility: string;
}

export interface SkillCategory {
  category: string;
  ccmWeight: number;
  dpoWeight: number;
  items: string[];
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  period: string;
  location: string;
  ccmFocus: boolean;
  dpoFocus: boolean;
  ccmOrder: number;
  dpoOrder: number;
  ccmHighlights: string[];
  dpoHighlights: string[];
  techStack: string[];
}

export interface CVData {
  identity: Identity;
  summary: string;
  skills: SkillCategory[];
  targetEnvironments: {
    title: string;
    items: string[];
    note: string;
  };
  experiences: Experience[];
  languages: {
    name: string;
    level: string;
  }[];
  education: {
    title: string;
    school: string;
    year: string;
  }[];
  interests: string[];
}
