import { Download, RefreshCw, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface CampaignResultsProps {
  campaignId: string | null;
  results: Record<string, string[]>;
  campaignName: string;
  onNewCampaign: () => void;
}

export const CampaignResults = ({
  campaignId,
  results,
  campaignName,
  onNewCampaign,
}: CampaignResultsProps) => {
  const handleDownload = (imageUrl: string, formatName: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${campaignName}-${formatName}-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded');
  };

  const handleDownloadAll = () => {
    Object.entries(results).forEach(([format, urls]) => {
      urls.forEach((url, index) => {
        setTimeout(() => {
          handleDownload(url, format, index);
        }, index * 200); // Stagger downloads
      });
    });
    toast.success('Downloading all assets...');
  };

  const formatNames: Record<string, string> = {
    'instagram-post': 'Instagram Post',
    'instagram-story': 'Instagram Story',
    'instagram-reel': 'Instagram Reel Cover',
    'facebook-post': 'Facebook Post',
    'facebook-cover': 'Facebook Cover',
    'linkedin-post': 'LinkedIn Post',
    'linkedin-banner': 'LinkedIn Banner',
    'twitter-post': 'Twitter Post',
    'twitter-header': 'Twitter Header',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{campaignName}</CardTitle>
            <CardDescription>
              Campaign generated successfully
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadAll}>
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
            <Button variant="outline" onClick={onNewCampaign}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={Object.keys(results)[0]}>
          <TabsList className="grid w-full grid-cols-3">
            {Object.keys(results).slice(0, 3).map((format) => (
              <TabsTrigger key={format} value={format}>
                {formatNames[format] || format}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(results).map(([format, urls]) => (
            <TabsContent key={format} value={format} className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {urls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`${formatNames[format]} variation ${index + 1}`}
                      className="w-full rounded-lg border border-border"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(url, formatNames[format], index)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          // Regenerate this specific format
                          toast.info('Regeneration coming soon');
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    </div>
                    <Badge className="absolute top-2 right-2">
                      {index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
