import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PlantingCostsReviewPanel } from '@/components/admin/PlantingCostsReviewPanel';
import { PlantingCostsConfigPanel } from '@/components/admin/PlantingCostsConfigPanel';
import { AddPlantingCostsSheet } from '@/components/admin/AddPlantingCostsSheet';

const PlantingCostsConfig: React.FC = () => {
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Planting Costs Configuration</h1>
          <p className="text-muted-foreground mt-1">Add new planting costs and configure pricing</p>
        </div>
        <Button onClick={() => setSheetOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Planting Costs
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <PlantingCostsReviewPanel
            onSelectSubmission={setSelectedSubmission}
            selectedId={selectedSubmission?.id}
          />
        </div>
        <div className="lg:col-span-3">
          <PlantingCostsConfigPanel
            submission={selectedSubmission}
            onClearSubmission={() => setSelectedSubmission(null)}
          />
        </div>
      </div>

      <AddPlantingCostsSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
};

export default PlantingCostsConfig;
