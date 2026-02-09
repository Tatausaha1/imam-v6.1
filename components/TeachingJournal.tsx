
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React from 'react';
import GenericView from './GenericView';

const TeachingJournal: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <GenericView 
      title="Jurnal Mengajar" 
      onBack={onBack} 
      description="Modul log harian guru sedang dalam proses optimalisasi database untuk kestabilan tinggi."
    />
  );
};

export default TeachingJournal;
