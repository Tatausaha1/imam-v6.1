
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React from 'react';
import GenericView from './GenericView';

const PointsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <GenericView 
      title="Disiplin & Poin" 
      onBack={onBack} 
      description="Database pelanggaran dan algoritma kredit poin otomatis sedang dalam proses sinkronisasi."
    />
  );
};

export default PointsView;
