import { create } from 'zustand';
import type { Campaign } from '../types/entities';
import type { Repositories } from '../persistence/hooks/use-repository';

interface CampaignState {
  campaigns: Campaign[];
  selectedCampaignId: string | null;
  isLoaded: boolean;

  hydrate(repos: Repositories, playerId: string): void;
  selectCampaign(id: string | null): void;
  addCampaign(campaign: Campaign): void;
  updateCampaign(id: string, updates: Partial<Campaign>): void;
  removeCampaign(id: string): void;
  getSelectedCampaign(): Campaign | undefined;
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  campaigns: [],
  selectedCampaignId: null,
  isLoaded: false,

  hydrate(repos: Repositories, playerId: string) {
    const campaigns = repos.campaigns.getActive(playerId);
    set({ campaigns, isLoaded: true });
  },

  selectCampaign(id: string | null) {
    set({ selectedCampaignId: id });
  },

  addCampaign(campaign: Campaign) {
    set((state) => ({ campaigns: [campaign, ...state.campaigns] }));
  },

  updateCampaign(id: string, updates: Partial<Campaign>) {
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  removeCampaign(id: string) {
    set((state) => ({
      campaigns: state.campaigns.filter((c) => c.id !== id),
      selectedCampaignId:
        state.selectedCampaignId === id ? null : state.selectedCampaignId,
    }));
  },

  getSelectedCampaign() {
    const { campaigns, selectedCampaignId } = get();
    return campaigns.find((c) => c.id === selectedCampaignId);
  },
}));
