import React, { useState, useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface Props {
  cardRef?: React.RefObject<HTMLDivElement>;
  csvData?: () => string;
  filename: string;
}

export const ExportButton: React.FC<Props> = ({ cardRef, csvData, filename }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    const date = new Date().toISOString().split('T')[0];

    if (csvData) {
      const blob = new Blob([csvData()], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OTOT-${filename}-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (cardRef?.current) {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `OTOT-${filename}-${date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }

    setTimeout(() => setExporting(false), 500);
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium border border-[#E5E7EB] dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-[#6B7280] dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
    >
      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {exporting ? 'Exporting…' : 'Export'}
    </button>
  );
};
