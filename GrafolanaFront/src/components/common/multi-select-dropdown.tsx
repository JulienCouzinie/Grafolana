'use client'
import React, { useState, useRef, useEffect } from 'react';

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectDropdownProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [tempSelected, setTempSelected] = useState<string[]>(selectedValues);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset temp selections to the actual selected values when closing without OK
        setTempSelected([...selectedValues]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedValues]);

  // Reset tempSelected when selectedValues change externally
  useEffect(() => {
    setTempSelected([...selectedValues]);
  }, [selectedValues]);

  // Toggle checkbox selection
  const handleCheckboxChange = (value: string) => {
    setTempSelected(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value) 
        : [...prev, value]
    );
  };

  // Apply selections
  const handleApply = () => {
    onChange(tempSelected);
    setIsOpen(false);
  };

  // Cancel and reset
  const handleCancel = () => {
    setTempSelected([...selectedValues]);
    setIsOpen(false);
  };

  // Clear all selections
  const handleClear = () => {
    setTempSelected([]);
  };

  // Display placeholder or selected items summary
  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const selectedOption = options.find(opt => opt.value === selectedValues[0]);
      return selectedOption ? selectedOption.label : placeholder;
    }
    return `${selectedValues.length} types selected`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="w-full p-2 bg-gray-800 text-white rounded border border-gray-700 text-left flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{getDisplayText()}</span>
        <span className="ml-2">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded shadow-lg">
          <div className="max-h-160 overflow-y-auto p-2">
            {options.map(option => (
              <div key={option.value} className="flex items-center p-2 hover:bg-gray-700">
                <input
                  type="checkbox"
                  id={`option-${option.value}`}
                  checked={tempSelected.includes(option.value)}
                  onChange={() => handleCheckboxChange(option.value)}
                  className="mr-2 h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`option-${option.value}`} className="text-white cursor-pointer flex-1">
                  {option.label}
                </label>
              </div>
            ))}
          </div>
          
          <div className="p-2 border-t border-gray-700 flex justify-between">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Clear
            </button>
            <div>
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded mr-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};