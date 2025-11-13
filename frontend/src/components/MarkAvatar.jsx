import React from 'react';

const MarkAvatar = () => {
  return (
    <img
      src="/mark-companion.png"
      alt="Mark - mascote AgroMark"
      className="w-24 h-24 pointer-events-none select-none drop-shadow-md" // Removido 'absolute' e ajustado o tamanho
    />
  );
};

export default MarkAvatar;
