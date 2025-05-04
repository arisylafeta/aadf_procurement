'use client';

import React, { useState, useEffect, useRef, ChangeEvent, FormEvent, RefObject } from 'react';
import { formConfig } from '../../data/formConfig'; 
import { Field, Column, Section, StaffMember, FormData as PageFormData, SubmissionData } from '../../types/procurementForm'; 
import { submitProcurementApplication } from './actions'; 
import requirementsData from '../../data/requirements.json'; 
import { createClient } from '@/utils/supabase/client'; 
import { v4 as uuidv4 } from 'uuid'; 

const procurementId = requirementsData.metadata.id; 
const BUCKET_NAME = procurementId; 

const ProcurementForm: React.FC = () => {
  const [formData, setFormData] = useState<PageFormData>({});
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const fileInputRefs = useRef<Record<string, RefObject<HTMLInputElement | null>>>({});
  const staffFileInputRefs = useRef<Record<number, Record<string, RefObject<HTMLInputElement | null>>>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionStatus, setSubmissionStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    const initialFormData: PageFormData = {};
    const initialStaffMembers: StaffMember[] = [];

    formConfig.sections.forEach((section: Section) => {
      if (section.type === 'table') {
        const staffColumns = section.columns?.reduce((acc: { [key: string]: string | number | File | FileList | null }, col: Column) => {
          if (col.type === 'number') {
            acc[col.id] = 0;
          } else if (col.type === 'file') { 
            acc[col.id] = null; 
          } else { 
            acc[col.id] = '';
          } 
          return acc;
        }, {} as { [key: string]: string | number | File | FileList | null }); 
        for (let i = 0; i < (section.minRows || 1); i++) {
          initialStaffMembers.push({ id: Date.now() + i, staffIndex: i, ...staffColumns });
        }
      } else {
        section.fields?.forEach((field: Field) => {
          if (field.type === 'number') {
            initialFormData[field.id] = 0;
          } else if (field.type === 'file' || field.type === 'multi-file') { 
            initialFormData[field.id] = null; 
          } else { 
            initialFormData[field.id] = '';
          }
        });
        section.conditionalFields?.forEach((field: Field) => {
          if (field.type === 'number') {
            initialFormData[field.id] = 0;
          } else if (field.type === 'file' || field.type === 'multi-file') { 
            initialFormData[field.id] = null;
          } else { 
            initialFormData[field.id] = '';
          }
        });
      }
    });

    formConfig.sections.forEach((section: Section) => {
      section.fields?.forEach((field: Field) => {
        if (field.type === 'file' || field.type === 'multi-file') {
          const refKey = field.id;
          fileInputRefs.current[refKey] = React.createRef<HTMLInputElement | null>(); 
        }
      });
      if (section.columns) {
        initialStaffMembers.forEach((_staff, index) => {
          section.columns?.forEach((col: Column) => { 
            if (col.type === 'file') { 
              if (!staffFileInputRefs.current[index]) {
                staffFileInputRefs.current[index] = {};
              }
              staffFileInputRefs.current[index][col.id] = React.createRef<HTMLInputElement | null>();
            }
          });
        });
      }
    });

    setFormData(initialFormData);
    setStaffMembers(initialStaffMembers);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: PageFormData) => ({ 
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleStaffChange = (staffIndex: number,
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const staffId = name; // For staff, name attribute holds the field id

    setStaffMembers((prev: StaffMember[]) => {
      const newState = [...prev];
      const staffMember = newState[staffIndex]; // Corrected: use staffIndex

      if (staffMember) {
        // Check if the target is an input element and type is file
        if (e.target instanceof HTMLInputElement && type === 'file') {
            const files = e.target.files;
            if (files) {
                staffMember[staffId] = files; // Assign FileList
            }
        } else if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
            staffMember[staffId] = e.target.checked;
        } else {
            // Handle other input types (text, number, textarea, select)
            staffMember[staffId] = value;
        }
      }
      return newState;
    });
  };

  const handleAddStaffMember = () => {
    const newStaffIndex = staffMembers.length;
    const newStaffMember: StaffMember = { id: Date.now(), staffIndex: newStaffIndex }; 
    const staffSection = formConfig.sections.find((sec: Section) => sec.id === 'staffMembers');
    staffSection?.columns?.forEach((col: Column) => {
      if (col.type === 'number') {
        newStaffMember[col.id] = 0;
      } else if (col.type === 'file') { 
        newStaffMember[col.id] = null;
        if (!staffFileInputRefs.current[newStaffIndex]) {
          staffFileInputRefs.current[newStaffIndex] = {};
        }
        staffFileInputRefs.current[newStaffIndex][col.id] = React.createRef<HTMLInputElement | null>();
      } else { 
        newStaffMember[col.id] = '';
      } 
    });
    setStaffMembers(prev => [...prev, newStaffMember]);
  };

  const handleRemoveStaffMember = (indexToRemove: number) => {
    setStaffMembers(prev => prev.filter((staff) => staff.staffIndex !== indexToRemove)
                              .map((staff, newIndex) => ({ ...staff, staffIndex: newIndex }))); 
    delete staffFileInputRefs.current[indexToRemove];
    const maxIndex = staffMembers.length - 2;
    for (let i = indexToRemove; i <= maxIndex; i++) {
      if (staffFileInputRefs.current[i+1]) {
        staffFileInputRefs.current[i] = staffFileInputRefs.current[i+1];
      }
    }
    delete staffFileInputRefs.current[maxIndex + 1];
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, fieldId: string, fieldType: string) => {
    const { name, files } = e.target;
    if (files) {
      setFormData((prev: PageFormData) => ({
        ...prev,
        [name]: fieldType === 'multi-file' ? files : files[0], // Store FileList for multi-file, single File otherwise
      }));
    }
  };

  const uploadFile = async (file: File, filePath: string): Promise<string | null> => {
    const supabase = createClient(); 
    try {
      setSubmissionStatus({ message: `Uploading ${file.name}...`, type: 'info' });
      console.log(`Attempting to upload: ${filePath}`);
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false 
        });

      if (error) {
        console.error(`Supabase upload error for ${filePath}:`, error);
        if (error.message.includes('Duplicate')) { 
          console.warn(`File ${filePath} already exists. Retrieving public URL.`);
          const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
          return urlData?.publicUrl || null;
        }
        throw new Error(`Upload failed for ${file.name}: ${error.message}`);
      }

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
      console.log(`Successfully uploaded ${filePath}, URL: ${urlData?.publicUrl}`);
      setSubmissionStatus({ message: `Uploaded ${file.name}`, type: 'success' });
      return urlData?.publicUrl || null;
    } catch (err) {
      console.error('Upload file function error:', err);
      setSubmissionStatus({ message: `Failed to upload ${file.name}. ${err instanceof Error ? err.message : ''}`, type: 'error' });
      return null; 
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionStatus({ message: 'Starting submission...', type: 'info' });

    const submissionId = uuidv4(); 
    console.log(`Starting submission process for Procurement ID: ${procurementId}, Submission ID: ${submissionId}`);

    const processedData: SubmissionData = JSON.parse(JSON.stringify(formData)); 
    processedData.staffMembers = JSON.parse(JSON.stringify(staffMembers));
    processedData.procurementId = procurementId; 
    processedData.submissionId = submissionId; 

    const uploadPromises: Promise<void>[] = [];

    try {
      formConfig.sections.forEach(section => {
        if (section.type !== 'table') {
          const processField = async (field: Field) => {
            if (field.type === 'file' || field.type === 'multi-file') {
              const fileInput = fileInputRefs.current[field.id]?.current;
              if (fileInput?.files && fileInput.files.length > 0) {
                if (field.type === 'multi-file') {
                  const fileList = fileInput.files;
                  const fileUrls: string[] = [];
                  console.log(`Processing multi-file input for field ${field.id}. Files count: ${fileList.length}`);
                  for (let i = 0; i < fileList.length; i++) {
                    const file = fileList[i];
                    const filePath = `procurements/${procurementId}/${submissionId}/${field.id}_${file.name}`;
                    console.log(`Uploading file ${i + 1}/${fileList.length}: ${file.name}`);
                    const publicUrl = await uploadFile(file, filePath);
                    if (publicUrl) {
                      fileUrls.push(publicUrl);
                    } else {
                      console.error(`Failed to upload file ${file.name} for field ${field.id}`);
                      setSubmissionStatus({ message: `Error uploading ${file.name}. Submission failed.`, type: 'error' });
                      setIsSubmitting(false);
                      return; // Stop submission
                    }
                  }
                  processedData[field.id] = fileUrls; // Replace FileList with array of URLs
                } else { // Handle single file upload
                  const file = fileInput.files[0];
                  const filePath = `procurements/${procurementId}/${submissionId}/${field.id}_${file.name}`;
                  console.log(`Processing single file for field ${field.id}: ${file.name}`);
                  const publicUrl = await uploadFile(file, filePath);
                  if (publicUrl) {
                    processedData[field.id] = publicUrl; // Replace File with URL
                  } else {
                    console.error(`Failed to upload file for field ${field.id}`);
                    setSubmissionStatus({ message: `Error uploading ${file.name}. Submission failed.`, type: 'error' });
                    setIsSubmitting(false);
                    return; // Stop submission
                  }
                }
              } else {
                processedData[field.id] = null;
              }
            }
          };
          section.fields?.forEach(processField);
          section.conditionalFields?.forEach(processField);
        }
      });

      staffMembers.forEach((staff, index) => {
        const staffSection = formConfig.sections.find(sec => sec.id === 'staffMembers');
        staffSection?.columns?.forEach(col => {
          if (col.type === 'file') {
            const file = staff[col.id] as File | null; 
            if (file instanceof File && file.size > 0) {
              const filePath = `procurements/${procurementId}/${submissionId}/staff-${index}-${col.id}_${file.name}`;
              uploadPromises.push(
                uploadFile(file, filePath).then(url => {
                  if (url) {
                    if (processedData.staffMembers && processedData.staffMembers[index]) {
                      processedData.staffMembers[index][col.id] = url;
                    }
                  } else {
                    throw new Error(`Upload failed for staff ${index}, field ${col.id}, file ${file.name}`);
                  }
                })
              );
            } else {
              if (processedData.staffMembers && processedData.staffMembers[index]) {
                processedData.staffMembers[index][col.id] = null;
              }
            }
          }
        });
      });

      setSubmissionStatus({ message: `Uploading ${uploadPromises.length} files...`, type: 'info' });
      await Promise.all(uploadPromises);
      console.log('All file uploads completed.');
      setSubmissionStatus({ message: 'All files uploaded. Saving data...', type: 'info' });

      const finalPayload: SubmissionData = JSON.parse(JSON.stringify(processedData));

      console.log('Final Payload to Server Action:', finalPayload);

      const result = await submitProcurementApplication(finalPayload); 

      console.log('Server Action Result:', result);
      if (result.success) {
        setSubmissionStatus({ message: 'Submission successful!', type: 'success' });
      } else {
        setSubmissionStatus({ message: `Submission failed: ${result.error}`, type: 'error' });
      }

    } catch (error) {
      console.error('Submission Handler Error:', error);
      setSubmissionStatus({ 
        message: `Submission failed: ${error instanceof Error ? error.message : 'An unknown error occurred.'}`,
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: Field, index?: number, staffIndex?: number) => {
    const key = staffIndex !== undefined ? `staff-${staffIndex}-${field.id}` : field.id;
    const value = staffIndex !== undefined ? staffMembers[staffIndex]?.[field.id] : formData[field.id];
    const inputRef = staffIndex !== undefined ? staffFileInputRefs.current[staffIndex]?.[field.id] : fileInputRefs.current[field.id];
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { 
        if (staffIndex !== undefined) {
            handleStaffChange(staffIndex, e);
        } else {
            handleInputChange(e);
        }
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div key={key} className="mb-4">
            <label htmlFor={key} className="block text-sm font-medium text-gray-700">{field.label}{field.required ? ' *' : ''}</label>
            <input
              type={field.type}
              id={key}
              name={field.id} 
              value={String(value ?? '')} 
              onChange={handleChange}
              required={field.required}
              placeholder={field.placeholder}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isSubmitting}
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={key} className="mb-4">
            <label htmlFor={key} className="block text-sm font-medium text-gray-700">{field.label}{field.required ? ' *' : ''}</label>
            <textarea
              id={key}
              name={field.id} 
              value={String(value ?? '')} 
              onChange={handleChange}
              required={field.required}
              placeholder={field.placeholder}
              rows={field.rows || 3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isSubmitting}
            />
          </div>
        );
      case 'select':
        return (
          <div key={key} className="mb-4">
            <label htmlFor={key} className="block text-sm font-medium text-gray-700">{field.label}{field.required ? ' *' : ''}</label>
            <select
              id={key}
              name={field.id} 
              value={String(value ?? '')} 
              onChange={handleChange}
              required={field.required}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={isSubmitting}
            >
              <option value="">{field.placeholder || 'Select...'}</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        );
      case 'file':
      case 'multi-file': 
        return (
          <div key={key} className="mb-6 p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
            <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
            <input
              type="file"
              id={key}
              name={field.id} 
              onChange={(e) => handleFileChange(e, field.id, field.type)} // Pass field type
              accept={field.accept || '.pdf,.doc,.docx,.zip,.jpg,.png'}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" // Enhanced styling
              ref={inputRef as RefObject<HTMLInputElement>} 
              multiple={field.type === 'multi-file'} // Add multiple attribute conditionally
              required={field.required}
            />
            {field.maxSizeMB && <p className="text-xs text-gray-500 mt-1">Max file size: {field.maxSizeMB}MB. Accepted formats: {field.accept || 'various'}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-lg rounded-lg mt-10">
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">Procurement Application - {procurementId}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {formConfig.sections.map((section: Section) => (
          <div key={section.id}>
            <h2 className="text-lg font-medium text-gray-900 mb-4">{section.title}</h2>
            {section.description && <p className="text-sm text-gray-600 mb-4">{section.description}</p>}
            
            {section.type !== 'table' && section.fields?.map(field => renderField(field))}
            
            {section.conditionalFields?.map(field => {
              const conditionMet = field.condition ? formData[field.condition.fieldId] === field.condition.value : true;
              return conditionMet ? renderField(field) : null;
            })}

            {section.type === 'table' && section.id === 'staffMembers' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {section.columns?.map(col => (
                        <th key={col.id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col.label}{col.required ? ' *' : ''}</th>
                      ))}
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {staffMembers.map((staff, index) => (
                      <tr key={staff.id}>
                        {section.columns?.map(col => (
                          <td key={col.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {renderField(col as Field, index, staff.staffIndex)}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {staffMembers.length > (section.minRows || 1) && (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveStaffMember(staff.staffIndex)} 
                              className="text-red-600 hover:text-red-900"
                              disabled={isSubmitting}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button 
                  type="button" 
                  onClick={handleAddStaffMember} 
                  className="mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={isSubmitting}
                >
                  Add Staff Member
                </button>
              </div>
            )}
          </div>
        ))}

        {submissionStatus && (
          <div className={`p-4 rounded-md ${submissionStatus.type === 'success' ? 'bg-green-100 text-green-700' : submissionStatus.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            {submissionStatus.message}
          </div>
        )}

        <div className="flex justify-end mt-8">
          <button 
            type="submit" 
            className={`px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white ${isSubmitting ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProcurementForm;