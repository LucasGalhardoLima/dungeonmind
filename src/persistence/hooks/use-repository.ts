import { createContext, useContext } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { CampaignRepository } from '../repositories/campaign-repository';
import { CharacterRepository } from '../repositories/character-repository';
import { SessionRepository } from '../repositories/session-repository';
import { ExchangeRepository } from '../repositories/exchange-repository';
import { SceneImageRepository } from '../repositories/scene-image-repository';
import { NPCRepository } from '../repositories/npc-repository';
import { NotificationLogRepository } from '../repositories/notification-log-repository';

export interface Repositories {
  campaigns: CampaignRepository;
  characters: CharacterRepository;
  sessions: SessionRepository;
  exchanges: ExchangeRepository;
  sceneImages: SceneImageRepository;
  npcs: NPCRepository;
  notificationLogs: NotificationLogRepository;
}

export function createRepositories(db: SQLiteDatabase): Repositories {
  return {
    campaigns: new CampaignRepository(db),
    characters: new CharacterRepository(db),
    sessions: new SessionRepository(db),
    exchanges: new ExchangeRepository(db),
    sceneImages: new SceneImageRepository(db),
    npcs: new NPCRepository(db),
    notificationLogs: new NotificationLogRepository(db),
  };
}

export const RepositoryContext = createContext<Repositories | null>(null);

export function useRepository(): Repositories {
  const repos = useContext(RepositoryContext);
  if (!repos) {
    throw new Error('useRepository must be used within a RepositoryContext.Provider');
  }
  return repos;
}
