import React, { useState } from 'react';
import { PlantingCostsReviewPanel } from '@/components/admin/PlantingCostsReviewPanel';
import { PlantingCostsConfigPanel } from '@/components/admin/PlantingCostsConfigPanel';

const PlantingCostsConfig: React.FC = () => {
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Planting Costs Configuration</h1>
        <p className="text-muted-foreground mt-1">Review plantation cost submissions and configure pricing</p>
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
    </div>
  );
};

export default PlantingCostsConfig;
