import React from 'react';

export const BilibiliIcon = ({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
    <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.263 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.87.001 17.36V10.003c.035-1.511.555-2.765 1.56-3.76 1.004-.996 2.263-1.52 3.773-1.574h.854l-2.2-2.311c-.265-.249-.283-.604-.055-.845a.604.604 0 0 1 .862.037l2.84 2.969h8.722l2.84-2.969a.604.604 0 0 1 .862-.037c.228.241.21.596-.055.845l-2.2 2.311ZM6.666 11.111a1.667 1.667 0 1 0 0 3.333 1.667 1.667 0 0 0 0-3.333Zm10.667 0a1.667 1.667 0 1 0 0 3.333 1.667 1.667 0 0 0 0-3.333Z" />
  </svg>
);

export const GithubIcon = ({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-github-icon lucide-github ${className}`} {...props}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
);
