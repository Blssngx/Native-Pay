// src/components/ResponsiveIframe.tsx
import React from 'react';

interface ResponsiveIframeProps {
  link: string;
  title?: string;
}

const ResponsiveIframe: React.FC<ResponsiveIframeProps> = ({
  link,
  title = 'Responsive Iframe',
}) => {
  return (
    <div className="relative w-full pb-9/16">
      <iframe
        src="https://wallet.interledger-test.dev/grant-interactions?interactId=20c24ff5-7ba0-44a1-9a2c-5b008ab02206&nonce=D27B27FD4C079A28&clientName=team42-justin&clientUri=https%3A%2F%2Filp.interledger-test.dev%2Fteam42-justin"
        title={title}
        className="absolute top-0 left-0 w-full h-full border-0 shadow-lg rounded-md"
        allowFullScreen
      ></iframe>
    </div>
  );
};

export default ResponsiveIframe;