'use client';

import React, { useState, useEffect, useRef, ChangeEvent, FormEvent, RefObject } from 'react';
import { formConfig } from '../../data/formConfig'; 
import { Field, Column, Section, StaffMember, FormData } from '../../types/procurementForm'; 

const ProcurementForm: React.FC = () => {
  // --- State Initialization (Dynamic) ---
  const [formData, setFormData] = useState<FormData>({});
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const fileInputRefs = useRef<Record<string, RefObject<HTMLInputElement | null>>>({});
  const staffFileInputRefs = useRef<Record<number, Record<string, RefObject<HTMLInputElement | null>>>>({});

  // Initialize State and Refs
  useEffect(() => {
    const initialFormData: FormData = {};
    const initialStaffMembers: StaffMember[] = [];

    formConfig.sections.forEach((section: Section) => {
      if (section.type === 'table') {
        // Add explicit type for accumulator 'acc' and ensure initial value is typed
        const staffColumns = section.columns?.reduce((acc: { [key: string]: string | number | File | FileList | null }, col: Column) => {
          // Use if/else if/else for clearer type handling
          if (col.type === 'number') {
            acc[col.id] = 0;
          } else if (col.type === 'file') { // ColumnType cannot be 'multi-file'
            acc[col.id] = null;
          } else { // Default to text or other types
            acc[col.id] = '';
          } 
          return acc;
        }, {} as { [key: string]: string | number | File | FileList | null }); // Ensure initial value type matches accumulator
        // Initialize staff members based on minRows
        for (let i = 0; i < (section.minRows || 1); i++) {
          initialStaffMembers.push({ id: i + 1, staffIndex: i, ...staffColumns });
        }
      } else {
        section.fields?.forEach((field: Field) => {
          // Ensure correct type handling for initialization
          if (field.type === 'number') {
            initialFormData[field.id] = 0;
          } else if (field.type === 'file' || field.type === 'multi-file') { // Group file types
            initialFormData[field.id] = null;
          } else { // Handle text and other types
            initialFormData[field.id] = '';
          }
        });
        section.conditionalFields?.forEach((field: Field) => {
           // Ensure correct type handling for initialization
          if (field.type === 'number') {
            initialFormData[field.id] = 0;
          } else if (field.type === 'file' || field.type === 'multi-file') { // Group file types
            initialFormData[field.id] = null;
          } else { // Handle text and other types
            initialFormData[field.id] = '';
          }
        });
      }
    });

    // Initialize file refs
    formConfig.sections.forEach((section: Section) => {
      section.fields?.forEach((field: Field) => {
        if (field.type === 'file' || field.type === 'multi-file') {
          const refKey = field.id;
          fileInputRefs.current[refKey] = React.createRef<HTMLInputElement | null>(); 
        }
      });
      if (section.columns) {
        // Initialize staff refs (assuming one initial staff member for ref setup)
        if (initialStaffMembers.length > 0) {
          section.columns.forEach((col: Column) => { 
            if (col.type === 'file') { // ColumnType cannot be 'multi-file'
              if (!staffFileInputRefs.current[0]) {
                staffFileInputRefs.current[0] = {};
              }
              staffFileInputRefs.current[0][col.id] = React.createRef<HTMLInputElement | null>();
            }
          });
        }
      }
    });

    setFormData(initialFormData);
    setStaffMembers(initialStaffMembers);
  }, []);

  // --- Event Handlers (Adjusted for Dynamic State) ---
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev: FormData) => ({ 
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleStaffChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, files } = e.target;

    setStaffMembers((prev: StaffMember[]) => { 
      const updatedStaff = [...prev];
      if (type === 'file' && files) {
        updatedStaff[index] = {
          ...updatedStaff[index],
          [name]: files.length === 1 ? files[0] : files, 
        };
      } else {
        updatedStaff[index] = {
          ...updatedStaff[index],
          [name]: type === 'number' ? parseFloat(value) || 0 : value,
        };
      }
      return updatedStaff;
    });
  };

  const triggerFileInput = (refKey: string) => {
    const ref = fileInputRefs.current[refKey];
    if (ref?.current) { 
      ref.current.click();
    }
  };

  const handleAddStaffMember = () => {
    const newStaffIndex = staffMembers.length;
    const newStaffMember: StaffMember = { id: Date.now(), staffIndex: newStaffIndex }; 
    const staffSection = formConfig.sections.find((sec: Section) => sec.id === 'staffMembers');
    staffSection?.columns?.forEach((col: Column) => {
      // Ensure correct type handling for initialization
      if (col.type === 'number') {
        newStaffMember[col.id] = 0;
      } else if (col.type === 'file') { // ColumnType cannot be 'multi-file'
        newStaffMember[col.id] = null;
      } else if (col.type === 'text') { // Explicitly handle text
        newStaffMember[col.id] = '';
      } else { // Handle any other types (future-proofing)
        newStaffMember[col.id] = ''; // Default to empty string
      }
      // Ensure refs are created for the new row, grouping file types
      if (col.type === 'file') { // ColumnType cannot be 'multi-file'
        const newIndex = staffMembers.length; // Use length before adding
        if (!staffFileInputRefs.current[newIndex]) {
          staffFileInputRefs.current[newIndex] = {};
        }
        staffFileInputRefs.current[newIndex][col.id] = React.createRef<HTMLInputElement | null>();
      }
    });
    setStaffMembers(prev => [...prev, newStaffMember]);
  };

  const handleRemoveStaffMember = (index: number) => {
    setStaffMembers(prev => prev.filter((_, i) => i !== index));
    // Optionally remove refs for the deleted row, though less critical
    delete staffFileInputRefs.current[index];
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Add validation logic based on 'required' flags in JSON
    console.log('Form Data:', formData);
    console.log('Staff Members:', staffMembers);
    alert('Form submitted! Check console for data.');
  };

  // --- Dynamic Rendering --- 
  const renderField = (field: Field, targetObject: FormData | StaffMember, changeHandler: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void, index?: number) => {
    const key = index !== undefined ? `${field.id}-${index}` : field.id;
    let rawValue: string | number | boolean | File | FileList | null = null; // Store the raw value

    if (targetObject && typeof (targetObject as StaffMember)?.staffIndex === 'number') {
      rawValue = (targetObject as StaffMember)[field.id];
    } else {
      rawValue = (targetObject as FormData)[field.id];
    }

    // Handle null for non-file inputs, default to empty string
    const value = (field.type !== 'file' && field.type !== 'multi-file' && rawValue === null) ? '' : rawValue;

    switch (field.type) {
      case 'text':
        return (
          <div> 
            <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              id={key}
              name={field.id}
              className="form-input"
              placeholder={field.placeholder}
              value={(value ?? '') as string} // Ensure defined value
              onChange={changeHandler}
              required={field.required}
            />
          </div>
        );
      case 'textarea':
        return (
          <div> 
            <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id={key}
              name={field.id}
              onChange={changeHandler}
              className="form-textarea"
              placeholder={field.placeholder}
              required={field.required}
              rows={field.rows || 3}
              value={(value ?? '') as string} // Ensure defined value
            />
          </div>
        );
      case 'number':
        return (
          <div> 
            <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <input
                type="number"
                id={key}
                name={field.id}
                className={`form-input ${field.currency ? 'pr-6' : ''}`}
                placeholder={field.placeholder}
                // Use value ?? '' or value ?? 0, ensuring it's never undefined/null
                // Using '' might be safer if backend expects string or number
                value={(value ?? '') as string | number} 
                onChange={changeHandler}
                required={field.required}
                min={field.min}
                step={field.step}
              />
              {field.currency && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">{field.currency}</span>
                </div>
              )}
            </div>
          </div>
        );
      case 'select':
        return (
          <div> 
            <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              name={field.id}
              id={key}
              value={(value ?? '') as string} // Ensure defined value
              onChange={changeHandler}
              required={field.required}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">{field.placeholder || 'Select an option'}</option>
              {field.options?.map((option: { value: string; label: string }) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        );
      case 'file':
      case 'multi-file':
        // Determine display name using rawValue
        let displayFileName = 'Upload File(s)';
        // Client-side only checks for File/FileList
        if (typeof window !== 'undefined') {
          if (rawValue instanceof File) {
            displayFileName = rawValue.name;
          } else if (rawValue instanceof FileList) {
            displayFileName = `${rawValue.length} file${rawValue.length > 1 ? 's' : ''} selected`;
          } else if (typeof rawValue === 'string' && rawValue) { // Handle potential initial string values if needed
            displayFileName = rawValue;
          }
        }

        return (
          <div className="flex flex-col"> 
            <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <div
              className="form-file-upload cursor-pointer border border-gray-300 rounded-md p-4 text-center hover:bg-gray-50"
              onClick={() => triggerFileInput(field.id)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto mb-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xs text-gray-500 truncate">{displayFileName}</p>
              {field.accept && <p className="text-xs text-gray-400 mt-1">Accepts: {field.accept}</p>}
              {field.maxSizeMB && <p className="text-xs text-gray-400 mt-1">Max size: {field.maxSizeMB}MB</p>}
            </div>
            <input
              type="file"
              id={key}
              name={field.id}
              ref={fileInputRefs.current[field.id]}
              className="hidden" // Keep hidden, triggered by the div
              onChange={changeHandler}
              required={field.required}
              multiple={field.type === 'multi-file'}
              accept={field.accept}
              // DO NOT set 'value' for file inputs - make them uncontrolled
            />
          </div>
        );
      default:
        return null;
    }
  };

  const renderSection = (section: Section) => {
    const gridClass = section.gridCols || 'md:grid-cols-2'; 

    if (section.type === 'table') {
      return (
        <div key={section.id} className="mb-8 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">{section.title}</h2>
          <div className="overflow-x-auto">
            <table className="staff-table">
              <thead>
                <tr>
                  {section.columns?.map((column: Column) => (
                    <th key={column.id}>{column.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffMembers.map((staffMember, index) => (
                  <tr key={staffMember.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {section.columns?.map((column: Column) => (
                      <td key={`${staffMember.id}-${column.id}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {/* Pass staffMember.staffIndex for unique key generation in renderField if needed */}
                        {renderField(column as unknown as Field, staffMember, (e) => handleStaffChange(index, e as ChangeEvent<HTMLInputElement>), index)}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        type="button"
                        className={`p-1 text-red-500 ${staffMembers.length <= (section.minRows || 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => handleRemoveStaffMember(index)}
                        disabled={staffMembers.length <= (section.minRows || 1)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAddStaffMember}
            >
              {section.addLabel || 'Add Row'}
            </button>
          </div>
        </div>
      );
    }

    // Standard rendering for other sections
    return (
      <div key={section.id} className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">{section.title}</h2>
        <div className={`grid grid-cols-1 gap-6 ${gridClass}`}>
          {section.fields?.map((field: Field) => (
            <React.Fragment key={field.id}> {/* Add unique key here */}
              {renderField(field, formData, handleInputChange)}
            </React.Fragment>
          ))}
        </div>
        {/* Render conditional fields if trigger is met */}
        {section.conditionalFields && (
          <div className={`mt-6 grid grid-cols-1 gap-6 ${gridClass}`}> {/* Add margin-top */} 
            {section.conditionalFields.map((field: Field) => (
              <React.Fragment key={field.id}> {/* Add unique key here */}
                {renderField(field, formData, handleInputChange)}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-10">{formConfig.formTitle}</h1>
        <form onSubmit={handleSubmit} className="space-y-8">
          {formConfig.sections.map((section: Section) => renderSection(section))} 

          <div className="flex justify-end pt-8">
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
            >
              {formConfig.submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProcurementForm;