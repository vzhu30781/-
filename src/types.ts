export interface Character {
  id: string;
  name: string;
  originalBitfen: string; // The bitfen designated in prompt
  bitfen: string; // Current bitfen
  intro: string;
  background: string;
  personality: string;
  affection: number; // 0 to 100
  health: number; // 0 to 100
  fertility: number; // probability of child-bearing
  intelligence: number;
  pregnantProgress: number; // 0 to 10. (At 10, gives birth)
  isPregnant: boolean;
  relationshipHistory: string[];
  customTitle?: string; // Optional custom noble title (封号)
  avatar?: string; // Optional character profile portrait
  isColdPalace?: boolean; // True if cast into cold palace (冷宫)
  portraits?: {
    default?: string;
    summon?: string;
    chat?: string;
    gift?: string;
    promote?: string;
    [key: string]: string | undefined;
  };
}

export interface Child {
  id: string;
  name: string;
  consortId: string;
  consortName: string;
  age: number; // in years or months
  birthMonth: number;
  birthYear: number;
  talent: string;
  health: number;
  intelligence: number;
}

export interface PlayerStats {
  name: string;
  eraName: string;
  health: number; // 0 to 100
  treasury: number; // gold
  authority: number; // Imperial power 0-100
  prestige: number; // 0-100
  stability: number; // 0-100
  year: number; // Year of rule
  month: number; // 1-12
}

export interface StoryLog {
  id: string;
  title: string;
  content: string;
  type: 'court' | 'harem' | 'birth' | 'system' | 'backstory';
  year: number;
  month: number;
}

export interface Memorial {
  id: string;
  title: string;
  content: string;
  choices: {
    text: string;
    effect: string;
    statsChange: Partial<PlayerStats>;
    resultText: string;
  }[];
}
