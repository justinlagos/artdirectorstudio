import { useState } from 'react';
import { Settings2, Sparkles, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export const ArtieSettingsPanel = () => {
  const { preferences, update, isUpdating } = useUserPreferences();
  const [localEnabled, setLocalEnabled] = useState(
    preferences.experimentalFeatures?.proactiveArtie || false
  );

  const handleToggle = async (enabled: boolean) => {
    setLocalEnabled(enabled);
    
    update({
      experimentalFeatures: {
        ...preferences.experimentalFeatures,
        proactiveArtie: enabled,
      },
      artieProactiveMode: enabled ? 'enabled' : 'disabled',
    });

    toast.success(
      enabled
        ? 'Proactive Artie enabled! Artie will offer suggestions without being asked.'
        : 'Proactive Artie disabled. Artie will only respond when you ask.'
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle>Artie Settings</CardTitle>
        </div>
        <CardDescription>
          Configure Artie's behavior and proactive assistance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Proactive mode allows Artie to offer suggestions based on your workflow patterns.
            You can always dismiss suggestions or disable this feature.
          </AlertDescription>
        </Alert>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="proactive-artie" className="text-base font-semibold cursor-pointer">
                Proactive Suggestions
              </Label>
              <p className="text-sm text-muted-foreground">
                Artie will offer suggestions without being asked. Try for a week!
              </p>
            </div>
          </div>
          <Switch
            id="proactive-artie"
            checked={localEnabled}
            onCheckedChange={handleToggle}
            disabled={isUpdating}
          />
        </div>

        {localEnabled && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Proactive mode is active. Artie will suggest:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Clarifying questions when you upload briefs</li>
              <li>Next steps after generating images</li>
              <li>Workflow optimizations based on patterns</li>
              <li>Style consistency checks</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
