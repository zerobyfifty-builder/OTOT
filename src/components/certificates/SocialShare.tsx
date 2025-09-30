import { Share2, Facebook, Twitter, Linkedin, Instagram, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface SocialShareProps {
  type: 'pledge' | 'tree';
  numTrees?: number;
  userName?: string;
}

export const SocialShare = ({ type, numTrees, userName }: SocialShareProps) => {
  const getMessage = () => {
    if (type === 'pledge') {
      return "I took the Responsible Traveler Pledge and committed to sustainable tourism practices in Kenya! 🌱 #OneTouristOneTree #SustainableTravel #Kenya";
    } else {
      return `I planted ${numTrees} ${numTrees === 1 ? 'tree' : 'trees'} in Kenya through One Tourist One Tree! 🌳 Join me in making tourism sustainable. #OneTouristOneTree #SustainableTravel #Kenya`;
    }
  };

  const shareUrl = window.location.origin;
  const message = getMessage();

  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const copyInstagramMessage = () => {
    navigator.clipboard.writeText(message);
    toast.success('Message copied! Paste it on Instagram with your certificate screenshot.');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  return (
    <Card className="border-primary/20 bg-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" />
          Share Your Impact
        </CardTitle>
        <CardDescription>
          Inspire others to take action for sustainable tourism
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">Share message:</p>
          <p className="text-sm font-medium">{message}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={shareOnFacebook}
          >
            <Facebook className="h-4 w-4" />
            Facebook
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={shareOnTwitter}
          >
            <Twitter className="h-4 w-4" />
            Twitter
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={shareOnLinkedIn}
          >
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={copyInstagramMessage}
          >
            <Instagram className="h-4 w-4" />
            Instagram
          </Button>

          <Button
            variant="outline"
            className="w-full gap-2 md:col-span-2"
            onClick={copyLink}
          >
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
