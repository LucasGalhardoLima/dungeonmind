import { useCallback, useState } from 'react';
import { useSessionStore } from '../../store/session-store';
import { useRepository } from '../../persistence/hooks/use-repository';
import { useCampaignStore } from '../../store/campaign-store';
import { generateScene } from '../scene-painter';
import { getCacheDir, ensureCacheDir } from '../image-cache';
import { generatePortrait } from '../../character/portrait-generator';
import type { ScenePrompt, PortraitPrompt } from '../../types/scene-prompt';
import type { SceneTrigger } from '../../types/entities';

interface UseSceneImageReturn {
  generateSceneImage(prompt: ScenePrompt, trigger: SceneTrigger): Promise<void>;
  generateCharacterPortrait(prompt: PortraitPrompt): Promise<string | null>;
  currentImagePath: string | null;
  isGenerating: boolean;
}

export function useSceneImage(): UseSceneImageReturn {
  const repos = useRepository();
  const currentSceneImagePath = useSessionStore((s) => s.currentSceneImagePath);
  const setCurrentSceneImagePath = useSessionStore((s) => s.setCurrentSceneImagePath);
  const selectedCampaign = useCampaignStore((s) => s.getSelectedCampaign());
  const activeSession = useSessionStore((s) => s.activeSession);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSceneImage = useCallback(
    async (prompt: ScenePrompt, trigger: SceneTrigger) => {
      if (!selectedCampaign || !activeSession) return;

      setIsGenerating(true);
      try {
        await ensureCacheDir();
        const cacheDir = getCacheDir();
        const imagePath = await generateScene(prompt, cacheDir);

        if (imagePath) {
          setCurrentSceneImagePath(imagePath);

          // Save to scene_image table
          repos.sceneImages.create({
            campaign_id: selectedCampaign.id,
            session_id: activeSession.id,
            image_path: imagePath,
            prompt: JSON.stringify(prompt),
            trigger,
          });
        }
        // If null, keep previous image visible (spec requirement)
      } finally {
        setIsGenerating(false);
      }
    },
    [selectedCampaign, activeSession, repos, setCurrentSceneImagePath],
  );

  const generateCharacterPortrait = useCallback(
    async (prompt: PortraitPrompt): Promise<string | null> => {
      return generatePortrait(prompt);
    },
    [],
  );

  return {
    generateSceneImage,
    generateCharacterPortrait,
    currentImagePath: currentSceneImagePath,
    isGenerating,
  };
}
