/** Section headings and fixed strings rendered by the built-in templates, per CV language. */
export const LANGUAGES = ["en", "pl"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LABELS: Record<Language, Record<string, string>> = {
  en: {
    resume: "Resume",
    summary: "Summary",
    profile: "Profile",
    highlights: "Highlights",
    atAGlance: "At a Glance",
    contact: "Contact",
    skills: "Skills",
    experience: "Experience",
    workExperience: "Work Experience",
    projects: "Projects",
    achievements: "Achievements",
    keyAchievements: "Key Achievements",
    speaking: "Speaking",
    education: "Education",
    languages: "Languages",
    continued: "(continued)",
    photoAlt: "Portrait of",
  },
  pl: {
    resume: "CV",
    summary: "Podsumowanie",
    profile: "Profil",
    highlights: "Najważniejsze liczby",
    atAGlance: "W skrócie",
    contact: "Kontakt",
    skills: "Umiejętności",
    experience: "Doświadczenie",
    workExperience: "Doświadczenie zawodowe",
    projects: "Projekty",
    achievements: "Osiągnięcia",
    keyAchievements: "Kluczowe osiągnięcia",
    speaking: "Wystąpienia",
    education: "Wykształcenie",
    languages: "Języki",
    continued: "(cd.)",
    photoAlt: "Zdjęcie:",
  },
};

export function labelsFor(language: unknown): Record<string, string> {
  return LABELS[(LANGUAGES as readonly unknown[]).includes(language) ? (language as Language) : "en"];
}
