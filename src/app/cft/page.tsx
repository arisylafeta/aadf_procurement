'use client';

import React, { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Building, Users, History, Sparkles, Save, FileText, Check } from 'lucide-react';

import selectedData from './selected_criteria.json';

// Define state types
interface MetadataState {
  title: string;
  id: string;
  supportingDocs: string;
}
interface CFTState {
  core: string;
  team: string;
  experience: string;
  additionalData: string;
}

interface SectionPercentage {
  value: number;
  id: string;
}

interface DuplicatedSection {
  id: string;
  content: string;
  percentage: number;
  originalId: string;
  sectionType: 'core' | 'team' | 'experience' | 'additionalData';
}

// Helper functions to format JSON data into strings
const formatRequirements = (reqs: any[]) => {
  return reqs.map(req => {
    let line = `- ${req.name}`;
    if (req.short_name) line += ` (${req.short_name})`;
    if (req.dropbox) line += ` [Dropbox]`;
    if (req.details) line += `\n    Details: ${req.details}`;
    return line;
  }).join('\n');
};

const formatExperts = (experts: any[]) => {
  return experts.map(exp => {
    let line = `- Role: ${exp.role}`;
    if (exp.required_license) line += ` | License: ${exp.required_license}`;
    if (exp.experience) line += ` | Experience: ${exp.experience}`;
    if (exp.education) line += ` | Education: ${exp.education}`;
    if (exp.requirements) line += ` | Requirements: ${exp.requirements}`;
    return line;
  }).join('\n');
};

const formatEvalCriteria = (criteria: any[]) => {
  return criteria.map(crit => `- ${crit.name} (${crit.weight})\n    Documentation: ${crit.documentation}`).join('\n');
}

// Initial CFT data derived from imported JSON
const initialCftData: CFTState = {
  core: `${selectedData.selected_sections.CORES.description}\nRequirements:\n${formatRequirements(selectedData.selected_sections.CORES.requirements)}`,
  team: `Required Experts:\n${formatExperts(selectedData.selected_sections.TEAMS['REQ EXPERTS'])}\n\nOptional Experts:\n${formatExperts(selectedData.selected_sections.TEAMS['OPT EXPERTS'])}`,
  experience: `Experience Requirements:\n${Object.entries(selectedData.selected_sections.EXP).map(([role, exp]) => `- ${role}: ${exp}`).join('\n')}`,
  additionalData: `Additional Items:\n- ${selectedData.selected_sections.ADDITIONALS.join('\n- ')}\n\nEvaluation Criteria:\n${selectedData.selected_sections.EVALUATION_CRITERIA.description}\n${formatEvalCriteria(selectedData.selected_sections.EVALUATION_CRITERIA.criteria)}`
};

const CFTPage: React.FC = () => {
  // State for metadata
  const [metadata, setMetadata] = useState<MetadataState>({
    title: '',
    id: '',
    supportingDocs: '',
  });

  // State for the three main sections - Initialized with data from JSON
  const [cftData, setCftData] = useState<CFTState>(initialCftData);
  
  // State for percentage scores
  const [percentageScores, setPercentageScores] = useState<SectionPercentage[]>([
    { id: 'core', value: 40 },
    { id: 'team', value: 25 },
    { id: 'experience', value: 25 },
    { id: 'additionalData', value: 10 },
  ]);
  
  // State for duplicated sections
  const [duplicatedSections, setDuplicatedSections] = useState<DuplicatedSection[]>([]);

  // State for generated outputs
  const [generatedOutputs, setGeneratedOutputs] = useState<{
    core: { markdown: string; json: string };
    team: { markdown: string; json: string };
    experience: { markdown: string; json: string };
    additionalData: { markdown: string; json: string };
    final: string;
  }>({
    core: { markdown: '', json: '' },
    team: { markdown: '', json: '' },
    experience: { markdown: '', json: '' },
    additionalData: { markdown: '', json: '' },
    final: '',
  });

  // State for save success message
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Handlers for input changes
  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => ({ ...prev, [name]: value }));
  };

  const handleCftDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>, section: keyof CFTState) => {
    setCftData(prev => ({ ...prev, [section]: e.target.value }));
  };

  // Generate handlers
  const handleGenerateCore = () => {
    // Get all core duplicated sections
    const coreDuplicates = duplicatedSections.filter(section => section.sectionType === 'core');
    
    // Create combined markdown
    let markdown = `## Core Criteria\n${cftData.core.split('\n').map(line => `* ${line}`).join('\n')}`;
    
    // Add duplicated sections to markdown
    coreDuplicates.forEach((duplicate, index) => {
      markdown += `\n\n## Core Criteria (Duplicate ${index + 1}) - ${duplicate.percentage}%\n${duplicate.content.split('\n').map(line => `* ${line}`).join('\n')}`;
    });
    
    // Create JSON with original and duplicates
    const coreData = {
      core: {
        original: {
          content: cftData.core.split('\n'),
          percentage: percentageScores.find(s => s.id === 'core')?.value || 0
        },
        duplicates: coreDuplicates.map(dup => ({
          content: dup.content.split('\n'),
          percentage: dup.percentage
        }))
      }
    };
    
    const json = JSON.stringify(coreData, null, 2);
    
    setGeneratedOutputs(prev => {
      // Prepare final JSON with all sections including duplicates
      const finalJson = {
        metadata,
        core: coreData.core,
        team: prev.team.json ? JSON.parse(prev.team.json).team : {
          original: {
            content: cftData.team.split('\n'),
            percentage: percentageScores.find(s => s.id === 'team')?.value || 0
          },
          duplicates: duplicatedSections
            .filter(section => section.sectionType === 'team')
            .map(dup => ({
              content: dup.content.split('\n'),
              percentage: dup.percentage
            }))
        },
        experience: prev.experience.json ? JSON.parse(prev.experience.json).experience : {
          original: {
            content: cftData.experience.split('\n'),
            percentage: percentageScores.find(s => s.id === 'experience')?.value || 0
          },
          duplicates: duplicatedSections
            .filter(section => section.sectionType === 'experience')
            .map(dup => ({
              content: dup.content.split('\n'),
              percentage: dup.percentage
            }))
        },
        additionalData: prev.additionalData.json ? JSON.parse(prev.additionalData.json).additionalData : {
          original: {
            content: cftData.additionalData.split('\n'),
            percentage: percentageScores.find(s => s.id === 'additionalData')?.value || 0
          },
          duplicates: duplicatedSections
            .filter(section => section.sectionType === 'additionalData')
            .map(dup => ({
              content: dup.content.split('\n'),
              percentage: dup.percentage
            }))
        }
      };
      
      return {
        ...prev,
        core: { markdown, json },
        final: JSON.stringify(finalJson, null, 2)
      };
    });
  };

  const handleGenerateTeam = () => {
    // Get all team duplicated sections
    const teamDuplicates = duplicatedSections.filter(section => section.sectionType === 'team');
    
    // Create combined markdown
    let markdown = `## Team Criteria\n${cftData.team.split('\n').map(line => `* ${line}`).join('\n')}`;
    
    // Add duplicated sections to markdown
    teamDuplicates.forEach((duplicate, index) => {
      markdown += `\n\n## Team Criteria (Duplicate ${index + 1}) - ${duplicate.percentage}%\n${duplicate.content.split('\n').map(line => `* ${line}`).join('\n')}`;
    });
    
    // Create JSON with original and duplicates
    const teamData = {
      team: {
        original: {
          content: cftData.team.split('\n'),
          percentage: percentageScores.find(s => s.id === 'team')?.value || 0
        },
        duplicates: teamDuplicates.map(dup => ({
          content: dup.content.split('\n'),
          percentage: dup.percentage
        }))
      }
    };
    
    const json = JSON.stringify(teamData, null, 2);
    
    setGeneratedOutputs(prev => {
      // Get the latest core data from previous state or create a new one
      const coreData = prev.core.json ? JSON.parse(prev.core.json).core : {
        original: {
          content: cftData.core.split('\n'),
          percentage: percentageScores.find(s => s.id === 'core')?.value || 0
        },
        duplicates: duplicatedSections
          .filter(section => section.sectionType === 'core')
          .map(dup => ({
            content: dup.content.split('\n'),
            percentage: dup.percentage
          }))
      };
      
      // Prepare final JSON with all sections including duplicates
      const finalJson = {
        metadata,
        core: coreData,
        team: teamData.team,
        experience: prev.experience.json ? JSON.parse(prev.experience.json).experience : {
          original: {
            content: cftData.experience.split('\n'),
            percentage: percentageScores.find(s => s.id === 'experience')?.value || 0
          },
          duplicates: duplicatedSections
            .filter(section => section.sectionType === 'experience')
            .map(dup => ({
              content: dup.content.split('\n'),
              percentage: dup.percentage
            }))
        },
        additionalData: prev.additionalData.json ? JSON.parse(prev.additionalData.json).additionalData : {
          original: {
            content: cftData.additionalData.split('\n'),
            percentage: percentageScores.find(s => s.id === 'additionalData')?.value || 0
          },
          duplicates: duplicatedSections
            .filter(section => section.sectionType === 'additionalData')
            .map(dup => ({
              content: dup.content.split('\n'),
              percentage: dup.percentage
            }))
        }
      };
      
      return {
        ...prev,
        team: { markdown, json },
        final: JSON.stringify(finalJson, null, 2)
      };
    });
  };

  const handleGenerateExperience = () => {
    // Get all experience duplicated sections
    const experienceDuplicates = duplicatedSections.filter(section => section.sectionType === 'experience');
    
    // Create combined markdown
    let markdown = `## Experience Criteria\n${cftData.experience.split('\n').map(line => `* ${line}`).join('\n')}`;
    
    // Add duplicated sections to markdown
    experienceDuplicates.forEach((duplicate, index) => {
      markdown += `\n\n## Experience Criteria (Duplicate ${index + 1}) - ${duplicate.percentage}%\n${duplicate.content.split('\n').map(line => `* ${line}`).join('\n')}`;
    });
    
    // Create JSON with original and duplicates
    const experienceData = {
      experience: {
        original: {
          content: cftData.experience.split('\n'),
          percentage: percentageScores.find(s => s.id === 'experience')?.value || 0
        },
        duplicates: experienceDuplicates.map(dup => ({
          content: dup.content.split('\n'),
          percentage: dup.percentage
        }))
      }
    };
    
    const json = JSON.stringify(experienceData, null, 2);
    
    setGeneratedOutputs(prev => {
      // Get the latest core and team data from previous state or create new ones
      const coreData = prev.core.json ? JSON.parse(prev.core.json).core : {
        original: {
          content: cftData.core.split('\n'),
          percentage: percentageScores.find(s => s.id === 'core')?.value || 0
        },
        duplicates: duplicatedSections
          .filter(section => section.sectionType === 'core')
          .map(dup => ({
            content: dup.content.split('\n'),
            percentage: dup.percentage
          }))
      };
      
      const teamData = prev.team.json ? JSON.parse(prev.team.json).team : {
        original: {
          content: cftData.team.split('\n'),
          percentage: percentageScores.find(s => s.id === 'team')?.value || 0
        },
        duplicates: duplicatedSections
          .filter(section => section.sectionType === 'team')
          .map(dup => ({
            content: dup.content.split('\n'),
            percentage: dup.percentage
          }))
      };
      
      // Prepare final JSON with all sections including duplicates
      const finalJson = {
        metadata,
        core: coreData,
        team: teamData,
        experience: experienceData.experience,
        additionalData: prev.additionalData.json ? JSON.parse(prev.additionalData.json).additionalData : {
          original: {
            content: cftData.additionalData.split('\n'),
            percentage: percentageScores.find(s => s.id === 'additionalData')?.value || 0
          },
          duplicates: duplicatedSections
            .filter(section => section.sectionType === 'additionalData')
            .map(dup => ({
              content: dup.content.split('\n'),
              percentage: dup.percentage
            }))
        }
      };
      
      return {
        ...prev,
        experience: { markdown, json },
        final: JSON.stringify(finalJson, null, 2)
      };
    });
  };
  
  const handleGenerateAdditionalData = () => {
    // Get all additional data duplicated sections
    const additionalDataDuplicates = duplicatedSections.filter(section => section.sectionType === 'additionalData');
    
    // Create combined markdown
    let markdown = `## Additional Data\n${cftData.additionalData.split('\n').map(line => `* ${line}`).join('\n')}`;
    
    // Add duplicated sections to markdown
    additionalDataDuplicates.forEach((duplicate, index) => {
      markdown += `\n\n## Additional Data (Duplicate ${index + 1}) - ${duplicate.percentage}%\n${duplicate.content.split('\n').map(line => `* ${line}`).join('\n')}`;
    });
    
    // Create JSON with original and duplicates
    const additionalDataObj = {
      additionalData: {
        original: {
          content: cftData.additionalData.split('\n'),
          percentage: percentageScores.find(s => s.id === 'additionalData')?.value || 0
        },
        duplicates: additionalDataDuplicates.map(dup => ({
          content: dup.content.split('\n'),
          percentage: dup.percentage
        }))
      }
    };
    
    const json = JSON.stringify(additionalDataObj, null, 2);
    
    setGeneratedOutputs(prev => {
      // Get the latest data from previous state or create new ones
      const coreData = prev.core.json ? JSON.parse(prev.core.json).core : {
        original: {
          content: cftData.core.split('\n'),
          percentage: percentageScores.find(s => s.id === 'core')?.value || 0
        },
        duplicates: duplicatedSections
          .filter(section => section.sectionType === 'core')
          .map(dup => ({
            content: dup.content.split('\n'),
            percentage: dup.percentage
          }))
      };
      
      const teamData = prev.team.json ? JSON.parse(prev.team.json).team : {
        original: {
          content: cftData.team.split('\n'),
          percentage: percentageScores.find(s => s.id === 'team')?.value || 0
        },
        duplicates: duplicatedSections
          .filter(section => section.sectionType === 'team')
          .map(dup => ({
            content: dup.content.split('\n'),
            percentage: dup.percentage
          }))
      };
      
      const experienceData = prev.experience.json ? JSON.parse(prev.experience.json).experience : {
        original: {
          content: cftData.experience.split('\n'),
          percentage: percentageScores.find(s => s.id === 'experience')?.value || 0
        },
        duplicates: duplicatedSections
          .filter(section => section.sectionType === 'experience')
          .map(dup => ({
            content: dup.content.split('\n'),
            percentage: dup.percentage
          }))
      };
      
      // Prepare final JSON with all sections including duplicates
      const finalJson = {
        metadata,
        core: coreData,
        team: teamData,
        experience: experienceData,
        additionalData: additionalDataObj.additionalData
      };
      
      return {
        ...prev,
        additionalData: { markdown, json },
        final: JSON.stringify(finalJson, null, 2)
      };
    });
  };

  // Handler for updating percentage scores
  const handlePercentageChange = (id: string, value: number) => {
    setPercentageScores(prev => {
      const newScores = prev.map(score => 
        score.id === id ? { ...score, value } : score
      );
      return newScores;
    });
  };

  // Handler for duplicating a section
  const handleDuplicateSection = (sectionId: string) => {
    const originalSection = sectionId.includes('-duplicate-') 
      ? duplicatedSections.find(s => s.id === sectionId)
      : null;
    
    const originalContent = originalSection 
      ? originalSection.content 
      : cftData[sectionId as keyof CFTState];
    
    const originalPercentage = originalSection 
      ? originalSection.percentage 
      : percentageScores.find(s => s.id === sectionId)?.value || 0;
    
    const baseId = originalSection ? originalSection.originalId : sectionId;
    const sectionType = originalSection ? originalSection.sectionType : sectionId as 'core' | 'team' | 'experience' | 'additionalData';
    const newId = `${baseId}-duplicate-${Date.now()}`;
    
    const newDuplicatedSection: DuplicatedSection = {
      id: newId,
      content: originalContent,
      percentage: originalPercentage,
      originalId: baseId,
      sectionType: sectionType
    };
    
    setDuplicatedSections(prev => [...prev, newDuplicatedSection]);
  };

  // Handler for updating duplicated section content
  const handleDuplicatedSectionChange = (id: string, content: string) => {
    setDuplicatedSections(prev => 
      prev.map(section => 
        section.id === id ? { ...section, content } : section
      )
    );
  };

  // Handler for updating duplicated section percentage
  const handleDuplicatedPercentageChange = (id: string, percentage: number) => {
    setDuplicatedSections(prev => 
      prev.map(section => 
        section.id === id ? { ...section, percentage } : section
      )
    );
  };

  // Handler for removing a duplicated section
  const handleRemoveDuplicatedSection = (id: string) => {
    setDuplicatedSections(prev => prev.filter(section => section.id !== id));
  };

  // Save handler
  const handleSave = () => {
    // Placeholder for actual save logic
    console.log('Saving to database:', {
      ...JSON.parse(generatedOutputs.final),
      percentageScores,
      duplicatedSections
    });
    setSaveSuccess(true);
    
    // Reset success message after 3 seconds
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 bg-gradient-to-br from-blue-50 via-white to-blue-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Call for Tenders Criteria Generator</h1>
      
      {/* Metadata Card */}
      <Card className="mb-8 border-blue-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white">
          <CardTitle className="text-xl text-blue-800">CFT Metadata</CardTitle>
          <CardDescription>Basic information about this Call for Tenders</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-blue-700">CFT Title</Label>
              <Input 
                id="title"
                name="title"
                placeholder="Enter the title of this Call for Tenders"
                value={metadata.title}
                onChange={handleMetadataChange}
                className="border-blue-200 focus:border-blue-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="id" className="text-blue-700">CFT ID</Label>
              <Input 
                id="id"
                name="id"
                placeholder="Enter a unique identifier for this CFT"
                value={metadata.id}
                onChange={handleMetadataChange}
                className="border-blue-200 focus:border-blue-400"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Main Accordion - All sections open by default */}
      <Accordion type="multiple" defaultValue={["core", "team", "experience", "additionalData"]} className="w-full mb-8">
        {/* Core Section */}
        <AccordionItem value="core" className="mb-4">
          <AccordionTrigger className="text-lg font-semibold hover:no-underline px-4 py-3 bg-gradient-to-r from-blue-100 to-white rounded-t-md border border-blue-200 text-blue-800">
            <div className="flex items-center space-x-3">
              <Building className="h-5 w-5 text-blue-600" />
              <span>Core Business & Compliance</span>
              <div className="ml-4 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {percentageScores.find(s => s.id === 'core')?.value || 0}%
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-6 bg-white rounded-b-md shadow-sm border border-t-0 border-blue-200">
            <div className="space-y-6">
              {/* Original Core Section */}
              <div className="flex items-center justify-between">
                <Label htmlFor="coreRequirements" className="text-blue-700">Core Requirements</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="corePercentage" className="text-blue-700 text-sm">Percentage:</Label>
                    <Input
                      id="corePercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={percentageScores.find(s => s.id === 'core')?.value || 0}
                      onChange={(e) => handlePercentageChange('core', parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-sm"
                    />
                  </div>
                  <Button 
                    onClick={() => handleDuplicateSection('core')} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    Duplicate
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Textarea 
                  id="coreRequirements"
                  value={cftData.core}
                  onChange={(e) => handleCftDataChange(e, 'core')}
                  className="min-h-[150px] border-blue-200 focus:border-blue-400 text-gray-600 placeholder:text-gray-400 placeholder:italic"
                  rows={6}
                />
              </div>
              
              {/* Duplicated Core Sections */}
              {duplicatedSections
                .filter(section => section.sectionType === 'core')
                .map((section, index) => (
                  <div key={section.id} className="mt-8 pt-6 border-t border-blue-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-blue-800">Duplicate Core {index + 1}</h3>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`${section.id}-percentage`} className="text-blue-700 text-sm">Percentage:</Label>
                          <Input
                            id={`${section.id}-percentage`}
                            type="number"
                            min="0"
                            max="100"
                            value={section.percentage}
                            onChange={(e) => handleDuplicatedPercentageChange(section.id, parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-sm"
                          />
                        </div>
                        <Button 
                          onClick={() => handleRemoveDuplicatedSection(section.id)} 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Textarea 
                        id={`${section.id}-content`}
                        value={section.content}
                        onChange={(e) => handleDuplicatedSectionChange(section.id, e.target.value)}
                        className="min-h-[150px] border-blue-200 focus:border-blue-400 text-gray-600"
                        rows={6}
                      />
                    </div>
                    
                    <div className="flex justify-end mt-4">
                      <Button 
                        onClick={() => handleDuplicateSection(section.id)} 
                        variant="outline" 
                        size="sm" 
                        className="text-blue-700 border-blue-200 hover:bg-blue-50"
                      >
                        Duplicate Again
                      </Button>
                    </div>
                  </div>
                ))
              }
              
              <div className="flex justify-end">
                <Button onClick={handleGenerateCore} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Sparkles className="h-4 w-4 mr-2" /> Generate Core Criteria
                </Button>
              </div>
              
              {generatedOutputs.core.markdown && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-blue-700">Markdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {generatedOutputs.core.markdown}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-blue-700">JSON</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {generatedOutputs.core.json}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Team Section */}
        <AccordionItem value="team" className="mb-4">
          <AccordionTrigger className="text-lg font-semibold hover:no-underline px-4 py-3 bg-gradient-to-r from-green-100 to-white rounded-t-md border border-green-200 text-green-800">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-green-600" />
              <span>Team Requirements</span>
              <div className="ml-4 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                {percentageScores.find(s => s.id === 'team')?.value || 0}%
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-6 bg-white rounded-b-md shadow-sm border border-t-0 border-green-200">
            <div className="space-y-6">
              {/* Original Team Section */}
              <div className="flex items-center justify-between">
                <Label htmlFor="teamRequirements" className="text-green-700">Team Requirements</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="teamPercentage" className="text-green-700 text-sm">Percentage:</Label>
                    <Input
                      id="teamPercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={percentageScores.find(s => s.id === 'team')?.value || 0}
                      onChange={(e) => handlePercentageChange('team', parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-sm"
                    />
                  </div>
                  <Button 
                    onClick={() => handleDuplicateSection('team')} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs border-green-200 text-green-700 hover:bg-green-50"
                  >
                    Duplicate
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Textarea 
                  id="teamRequirements"
                  value={cftData.team}
                  onChange={(e) => handleCftDataChange(e, 'team')}
                  className="min-h-[150px] border-green-200 focus:border-green-400 text-gray-600 placeholder:text-gray-400 placeholder:italic"
                  rows={6}
                />
              </div>
              
              {/* Duplicated Team Sections */}
              {duplicatedSections
                .filter(section => section.sectionType === 'team')
                .map((section, index) => (
                  <div key={section.id} className="mt-8 pt-6 border-t border-green-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-green-800">Duplicate Team {index + 1}</h3>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`${section.id}-percentage`} className="text-green-700 text-sm">Percentage:</Label>
                          <Input
                            id={`${section.id}-percentage`}
                            type="number"
                            min="0"
                            max="100"
                            value={section.percentage}
                            onChange={(e) => handleDuplicatedPercentageChange(section.id, parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-sm"
                          />
                        </div>
                        <Button 
                          onClick={() => handleRemoveDuplicatedSection(section.id)} 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Textarea 
                        id={`${section.id}-content`}
                        value={section.content}
                        onChange={(e) => handleDuplicatedSectionChange(section.id, e.target.value)}
                        className="min-h-[150px] border-green-200 focus:border-green-400 text-gray-600"
                        rows={6}
                      />
                    </div>
                    
                    <div className="flex justify-end mt-4">
                      <Button 
                        onClick={() => handleDuplicateSection(section.id)} 
                        variant="outline" 
                        size="sm" 
                        className="text-green-700 border-green-200 hover:bg-green-50"
                      >
                        Duplicate Again
                      </Button>
                    </div>
                  </div>
                ))
              }
              
              <div className="flex justify-end">
                <Button onClick={handleGenerateTeam} className="bg-green-600 hover:bg-green-700 text-white">
                  <Sparkles className="h-4 w-4 mr-2" /> Generate Team Criteria
                </Button>
              </div>
              
              {generatedOutputs.team.markdown && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-green-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-700">Markdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {generatedOutputs.team.markdown}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-green-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-700">JSON</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {generatedOutputs.team.json}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Experience Section */}
        <AccordionItem value="experience" className="mb-4">
          <AccordionTrigger className="text-lg font-semibold hover:no-underline px-4 py-3 bg-gradient-to-r from-purple-100 to-white rounded-t-md border border-purple-200 text-purple-800">
            <div className="flex items-center space-x-3">
              <History className="h-5 w-5 text-purple-600" />
              <span>Past Experience Requirements</span>
              <div className="ml-4 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                {percentageScores.find(s => s.id === 'experience')?.value || 0}%
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-6 bg-white rounded-b-md shadow-sm border border-t-0 border-purple-200">
            <div className="space-y-6">
              {/* Original Experience Section */}
              <div className="flex items-center justify-between">
                <Label htmlFor="experienceRequirements" className="text-purple-700">Experience Requirements</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="experiencePercentage" className="text-purple-700 text-sm">Percentage:</Label>
                    <Input
                      id="experiencePercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={percentageScores.find(s => s.id === 'experience')?.value || 0}
                      onChange={(e) => handlePercentageChange('experience', parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-sm"
                    />
                  </div>
                  <Button 
                    onClick={() => handleDuplicateSection('experience')} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                  >
                    Duplicate
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Textarea 
                  id="experienceRequirements"
                  value={cftData.experience}
                  onChange={(e) => handleCftDataChange(e, 'experience')}
                  className="min-h-[150px] border-purple-200 focus:border-purple-400 text-gray-600 placeholder:text-gray-400 placeholder:italic"
                  rows={6}
                />
              </div>
              
              {/* Duplicated Experience Sections */}
              {duplicatedSections
                .filter(section => section.sectionType === 'experience')
                .map((section, index) => (
                  <div key={section.id} className="mt-8 pt-6 border-t border-purple-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-purple-800">Duplicate Experience {index + 1}</h3>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`${section.id}-percentage`} className="text-purple-700 text-sm">Percentage:</Label>
                          <Input
                            id={`${section.id}-percentage`}
                            type="number"
                            min="0"
                            max="100"
                            value={section.percentage}
                            onChange={(e) => handleDuplicatedPercentageChange(section.id, parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-sm"
                          />
                        </div>
                        <Button 
                          onClick={() => handleRemoveDuplicatedSection(section.id)} 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Textarea 
                        id={`${section.id}-content`}
                        value={section.content}
                        onChange={(e) => handleDuplicatedSectionChange(section.id, e.target.value)}
                        className="min-h-[150px] border-purple-200 focus:border-purple-400 text-gray-600"
                        rows={6}
                      />
                    </div>
                    
                    <div className="flex justify-end mt-4">
                      <Button 
                        onClick={() => handleDuplicateSection(section.id)} 
                        variant="outline" 
                        size="sm" 
                        className="text-purple-700 border-purple-200 hover:bg-purple-50"
                      >
                        Duplicate Again
                      </Button>
                    </div>
                  </div>
                ))
              }
              
              <div className="flex justify-end">
                <Button onClick={handleGenerateExperience} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Sparkles className="h-4 w-4 mr-2" /> Generate Experience Criteria
                </Button>
              </div>
              
              {generatedOutputs.experience.markdown && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-purple-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-purple-700">Markdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {generatedOutputs.experience.markdown}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-purple-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-purple-700">JSON</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {generatedOutputs.experience.json}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Additional Data Section */}
        <AccordionItem value="additionalData" className="mb-4">
          <AccordionTrigger className="text-lg font-semibold hover:no-underline px-4 py-3 bg-gradient-to-r from-amber-100 to-white rounded-t-md border border-amber-200 text-amber-800">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-amber-600" />
              <span>Additional Data Requirements</span>
              <div className="ml-4 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                {percentageScores.find(s => s.id === 'additionalData')?.value || 0}%
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="p-6 bg-white rounded-b-md shadow-sm border border-t-0 border-amber-200">
            <div className="space-y-6">
              {/* Original Additional Data Section */}
              <div className="flex items-center justify-between">
                <Label htmlFor="additionalDataRequirements" className="text-amber-700">Additional Requirements</Label>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="additionalDataPercentage" className="text-amber-700 text-sm">Percentage:</Label>
                    <Input
                      id="additionalDataPercentage"
                      type="number"
                      min="0"
                      max="100"
                      value={percentageScores.find(s => s.id === 'additionalData')?.value || 0}
                      onChange={(e) => handlePercentageChange('additionalData', parseInt(e.target.value) || 0)}
                      className="w-16 h-8 text-sm"
                    />
                  </div>
                  <Button 
                    onClick={() => handleDuplicateSection('additionalData')} 
                    variant="outline" 
                    size="sm" 
                    className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    Duplicate
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Textarea 
                  id="additionalDataRequirements"
                  value={cftData.additionalData}
                  onChange={(e) => handleCftDataChange(e, 'additionalData')}
                  className="min-h-[150px] border-amber-200 focus:border-amber-400 text-gray-600 placeholder:text-gray-400 placeholder:italic"
                  rows={6}
                />
              </div>
              
              {/* Duplicated Additional Data Sections */}
              {duplicatedSections
                .filter(section => section.sectionType === 'additionalData')
                .map((section, index) => (
                  <div key={section.id} className="mt-8 pt-6 border-t border-amber-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-amber-800">Duplicate Additional Data {index + 1}</h3>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`${section.id}-percentage`} className="text-amber-700 text-sm">Percentage:</Label>
                          <Input
                            id={`${section.id}-percentage`}
                            type="number"
                            min="0"
                            max="100"
                            value={section.percentage}
                            onChange={(e) => handleDuplicatedPercentageChange(section.id, parseInt(e.target.value) || 0)}
                            className="w-16 h-8 text-sm"
                          />
                        </div>
                        <Button 
                          onClick={() => handleRemoveDuplicatedSection(section.id)} 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Textarea 
                        id={`${section.id}-content`}
                        value={section.content}
                        onChange={(e) => handleDuplicatedSectionChange(section.id, e.target.value)}
                        className="min-h-[150px] border-amber-200 focus:border-amber-400 text-gray-600"
                        rows={6}
                      />
                    </div>
                    
                    <div className="flex justify-end mt-4">
                      <Button 
                        onClick={() => handleDuplicateSection(section.id)} 
                        variant="outline" 
                        size="sm" 
                        className="text-amber-700 border-amber-200 hover:bg-amber-50"
                      >
                        Duplicate Again
                      </Button>
                    </div>
                  </div>
                ))
              }
              
              <div className="flex justify-end">
                <Button onClick={handleGenerateAdditionalData} className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Sparkles className="h-4 w-4 mr-2" /> Generate Additional Requirements
                </Button>
              </div>
              
              {generatedOutputs.additionalData.markdown && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-amber-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-amber-700">Markdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {generatedOutputs.additionalData.markdown}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-amber-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-amber-700">JSON</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 p-3 rounded-md text-sm font-mono whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {generatedOutputs.additionalData.json}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* No separate duplicated sections area */}

      {/* Final Compiled JSON and Save Button */}
      {generatedOutputs.final && (
        <Card className="border-gray-300 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-100 to-white">
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gray-700" />
              <span>Final Compiled JSON</span>
            </CardTitle>
            <CardDescription>Complete criteria for this Call for Tenders</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-sm font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {generatedOutputs.final}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white relative">
                {saveSuccess ? (
                  <>
                    <Check className="h-4 w-4 mr-2" /> Saved Successfully
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" /> Save to Database
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CFTPage;
