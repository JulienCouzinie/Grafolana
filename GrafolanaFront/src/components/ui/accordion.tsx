'use client';

import React, { useState, useRef, ReactNode } from 'react';

interface AccordionItemProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function AccordionItem({ title, children, defaultOpen = false, className = '' }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  const toggleAccordion = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={className}>
      <button
        className="flex justify-between items-center w-full py-4 px-6 text-left font-medium focus:outline-none accordion-button"
        onClick={toggleAccordion}
        aria-expanded={isOpen}
      >
        <span className="accordion-title">{title}</span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? '' : 'transform -rotate-90'} accordion-arrow`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        ref={contentRef}
        className={`transition-all duration-200 ${isOpen ? 'max-h-[1000px] overflow-y-auto' : 'max-h-0 overflow-hidden'}`}
        aria-hidden={!isOpen}
      >
        <div className="p-6">{children}</div>
      </div>
      
      <style jsx>{`
        .accordion-button:hover .accordion-arrow {
          stroke: #9945FF; /* Solana purple */
        }
        
        /* Add style for title text to turn purple on hover */
        .accordion-button:hover .accordion-title {
          color: #9945FF; /* Solana purple */
        }
      `}</style>
    </div>
  );
}

interface AccordionProps {
  children: ReactNode;
  className?: string;
}

export function Accordion({ children, className = '' }: AccordionProps) {
  return <div className={className}>{children}</div>;
}