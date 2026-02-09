
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 */

import React from 'react';
import GenericView from './GenericView';

const ClassPromotion: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <GenericView 
      title="Kenaikan Kelas" 
      onBack={onBack} 
      description="Fitur migrasi data tahun ajaran sedang dikonfigurasi untuk mencegah duplikasi data."
    />
  );
};

export default ClassPromotion;
