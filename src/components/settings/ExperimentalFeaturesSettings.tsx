import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { DEFAULT_USER_PREFERENCES } from '@/types/userPreferences';
import { toast } from 'sonner';
import { Sparkles, Keyboard, Layers, Wand2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export const ExperimentalFeaturesSettings = () => {
  const { preferences, update, isUpdating } = useUserPreferences();
  const [isResetting, setIsResetting] = useState(false);

  const experimentalFeatures = preferences.experimentalFeatures || DEFAULT_USER_PREFERENCES.experimentalFeatures;

  const handleToggleFeature = (feature: keyof typeof experimentalFeatures, enabled: boolean) => {
    update({
      experimentalFeatures: {
        ...experimentalFeatures,
        [feature]: enabled,
      },
    });

    toast.success(
      enabled 
        ? `${getFeatureName(feature)} enabled. Try it for a week!`
        : `${getFeatureName(feature)} disabled.`
    );
  };

  const handleResetToClassic = async () => {
    setIsResetting(true);
    try {
      update({
        workspaceMode: 'classic',
        artieProactiveMode: 'disabled',
        keyboardShortcuts: 'disabled',
        experimentalFeatures: DEFAULT_USER_PREFERENCES.experimentalFeatures,
      });
      toast.success('Reset to Classic Mode. All experimental features disabled.');
    } catch (error) {
      toast.error('Failed to reset preferences');
    } finally {
      setIsResetting(false);
    }
  };

  const getFeatureName = (feature: keyof typeof experimentalFeatures): string => {
    const names: Record<string, string> = {
      proactiveArtie: 'Proactive Artie',
      keyboardShortcuts: 'Keyboard Shortcuts',
      campaignBuilder: 'Campaign Builder',
    };
    return names[feature] || feature;
  };

  const getFeatureDescription = (feature: keyof typeof experimentalFeatures): string => {
    const descriptions: Record<string, string> = {
      proactiveArtie: 'Artie will offer suggestions without being asked. Get proactive help during your workflow.',
      keyboardShortcuts: 'Power user shortcuts for faster navigation. Press ? to see all shortcuts.',
      campaignBuilder: 'Generate coordinated assets for multiple formats in one operation.',
    };
    return descriptions[feature] || '';
  };

  const getFeatureIcon = (feature: keyof typeof experimentalFeatures) => {
    const icons: Record<string, typeof Sparkles> = {
      proactiveArtie: Sparkles,
      keyboardShortcuts: Keyboard,
      campaignBuilder: Wand2,
    };
    return icons[feature] || Sparkles;
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Experimental features are opt-in and may change. They're designed to enhance your workflow
          but can be disabled at any time. Try each feature for a week to see if it works for you.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {(['proactiveArtie', 'keyboardShortcuts', 'campaignBuilder'] as const).map((feature) => {
          const Icon = getFeatureIcon(feature);
          const enabled = experimentalFeatures[feature] || false;

          return (
            <Card key={feature} className="glass">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <Label htmlFor={feature} className="text-base font-semibold cursor-pointer">
                        {getFeatureName(feature)}
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getFeatureDescription(feature)}
                    </p>
                    {enabled && (
                      <p className="text-xs text-primary font-medium">
                        ✓ Try for a week to see if it works for you
                      </p>
                    )}
                  </div>
                  <Switch
                    id={feature}
                    checked={enabled}
                    onCheckedChange={(checked) => handleToggleFeature(feature, checked)}
                    disabled={isUpdating}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Reset to Classic Mode</CardTitle>
          <CardDescription>
            Disable all experimental features and return to the classic workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleResetToClassic}
            disabled={isResetting || isUpdating}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {isResetting ? 'Resetting...' : 'Reset to Classic Mode'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
