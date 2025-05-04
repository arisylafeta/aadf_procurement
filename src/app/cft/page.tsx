'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Building, Users, History, Sparkles, Save, FileText, Check, DollarSign, Percent, Target } from 'lucide-react';

import hardcodedRequirements from '@/data/requirements.json';

interface MetadataState {
  title: string;
  id: string;
  description: string;
}

interface PriceState {
  weight: number | string;
  ceiling: number | string;
  normalized: boolean;
}

interface CFTState {
  core: string;
  team: string;
  experience: string;
}

const CFTPage: React.FC = () => {
  const [metadata, setMetadata] = useState<MetadataState>({
    title: '',
    id: '',
    description: '',
  });

  const [priceData, setPriceData] = useState<PriceState>({
    weight: '',
    ceiling: '',
    normalized: false,
  });

  const [cftData, setCftData] = useState<CFTState>({
    core: '',
    team: '',
    experience: '',
  });

  const [generatedOutputs, setGeneratedOutputs] = useState<{
    metadata: string;
    price: string;
    core: string;
    team: string;
    experience: string;
    final: string;
  }>({
    metadata: '',
    price: '',
    core: '',
    team: '',
    experience: '',
    final: '',
  });

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setPriceData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCftDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>, section: keyof CFTState) => {
    setCftData(prev => ({ ...prev, [section]: e.target.value }));
  };

  const handleGenerateMetadata = () => {
    const json = JSON.stringify(hardcodedRequirements.metadata, null, 2);
    setGeneratedOutputs(prev => ({ ...prev, metadata: json }));
  };

  const handleGeneratePrice = () => {
    const json = JSON.stringify(hardcodedRequirements.price, null, 2);
    setGeneratedOutputs(prev => ({ ...prev, price: json }));
  };

  const handleGenerateCore = () => {
    const json = JSON.stringify(hardcodedRequirements.core, null, 2);
    setGeneratedOutputs(prev => ({ ...prev, core: json }));
  };

  const handleGenerateTeam = () => {
    const json = JSON.stringify(hardcodedRequirements.team, null, 2);
    setGeneratedOutputs(prev => ({ ...prev, team: json }));
  };

  const handleGenerateExperience = () => {
    const json = JSON.stringify(hardcodedRequirements.experience, null, 2);
    setGeneratedOutputs(prev => ({ ...prev, experience: json }));
  };

  const handleGenerateAll = () => {
    try {
      const finalOutputString = JSON.stringify(hardcodedRequirements, null, 2);
      setGeneratedOutputs(prev => ({
        ...prev,
        metadata: JSON.stringify(hardcodedRequirements.metadata, null, 2),
        price: JSON.stringify(hardcodedRequirements.price, null, 2),
        core: JSON.stringify(hardcodedRequirements.core, null, 2),
        team: JSON.stringify(hardcodedRequirements.team, null, 2),
        experience: JSON.stringify(hardcodedRequirements.experience, null, 2),
        final: finalOutputString,
      }));
      setSaveSuccess(false);
    } catch (error) {
      console.error("Error generating final JSON:", error);
      setGeneratedOutputs(prev => ({ ...prev, final: "Error generating hardcoded JSON." }));
    }
  };

  const handleSaveConfig = async () => {
    if (!generatedOutputs.final) {
      alert('Please generate the final output first.');
      return;
    }

    console.log("Simulating save for demo. Data not sent.");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 5000);
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">CFT Requirements Configuration</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center"><FileText className="mr-2" /> CFT Metadata</CardTitle>
          <CardDescription>Define the general information for this CFT.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" value={metadata.title} onChange={handleMetadataChange} placeholder="e.g., Procurement Application Submission" />
          </div>
          <div>
            <Label htmlFor="id">ID</Label>
            <Input id="id" name="id" value={metadata.id} onChange={handleMetadataChange} placeholder="e.g., procurement-2025" />
          </div>
          <div>
            <Label htmlFor="description">Description / Supporting Docs Info</Label>
            <Textarea id="description" name="description" value={metadata.description} onChange={handleMetadataChange} placeholder="Enter a brief description or info about supporting documents." />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleGenerateMetadata}><Sparkles className="mr-2 h-4 w-4" /> Generate Metadata</Button>
          </div>
          {generatedOutputs.metadata && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <Label className="font-semibold">Generated Metadata JSON:</Label>
              <pre className="text-sm overflow-x-auto"><code>{generatedOutputs.metadata}</code></pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center"><DollarSign className="mr-2" /> Price Configuration</CardTitle>
          <CardDescription>Set the pricing criteria and weighting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price-weight">Weight (%)</Label>
              <Input id="price-weight" name="weight" type="number" value={priceData.weight} onChange={handlePriceChange} placeholder="e.g., 35 for 35%" min="0" max="100" step="any" />
            </div>
            <div>
              <Label htmlFor="price-ceiling">Ceiling Amount</Label>
              <Input id="price-ceiling" name="ceiling" type="number" value={priceData.ceiling} onChange={handlePriceChange} placeholder="e.g., 300000" min="0" step="any" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="price-normalized" name="normalized" checked={priceData.normalized} onCheckedChange={(checked) => setPriceData(prev => ({ ...prev, normalized: !!checked }))} disabled />
            <Label htmlFor="price-normalized" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Is Normalized?
            </Label>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleGeneratePrice}><Percent className="mr-2 h-4 w-4" /> Generate Price Data</Button>
          </div>
          {generatedOutputs.price && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <Label className="font-semibold">Generated Price JSON:</Label>
              <pre className="text-sm overflow-x-auto"><code>{generatedOutputs.price}</code></pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center"><Building className="mr-2" /> Core Business & Compliance</CardTitle>
          <CardDescription>Specify core business requirements.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea name="core" value={cftData.core} onChange={(e) => handleCftDataChange(e, 'core')} placeholder="Each business should provide their license, payroll documentation..." rows={8} className="mb-4" readOnly />
          <div className="flex justify-end">
            <Button onClick={handleGenerateCore}><Target className="mr-2 h-4 w-4" /> Generate Core Data</Button>
          </div>
          {generatedOutputs.core && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <Label className="font-semibold">Generated Core JSON:</Label>
              <pre className="text-sm overflow-x-auto"><code>{generatedOutputs.core}</code></pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2" /> Team & Qualifications</CardTitle>
          <CardDescription>Describe the required team structure and qualifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea name="team" value={cftData.team} onChange={(e) => handleCftDataChange(e, 'team')} placeholder="The team should consist of an Architect, Engineer, Project Manager..." rows={8} className="mb-4" readOnly />
          <div className="flex justify-end">
            <Button onClick={handleGenerateTeam}><Users className="mr-2 h-4 w-4" /> Generate Team Data</Button>
          </div>
          {generatedOutputs.team && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <Label className="font-semibold">Generated Team JSON:</Label>
              <pre className="text-sm overflow-x-auto"><code>{generatedOutputs.team}</code></pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center"><History className="mr-2" /> Experience</CardTitle>
          <CardDescription>Outline required company or project experience.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea name="experience" value={cftData.experience} onChange={(e) => handleCftDataChange(e, 'experience')} placeholder="The company should have at least 5 years of experience in..." rows={8} className="mb-4" readOnly />
          <div className="flex justify-end">
            <Button onClick={handleGenerateExperience}><History className="mr-2 h-4 w-4" /> Generate Experience Data</Button>
          </div>
          {generatedOutputs.experience && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <Label className="font-semibold">Generated Experience JSON:</Label>
              <pre className="text-sm overflow-x-auto"><code>{generatedOutputs.experience}</code></pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center"><Sparkles className="mr-2 text-primary" /> Final Generated Output</CardTitle>
          <CardDescription>Combine all sections into the final JSON structure (using hardcoded data from requirements.json).</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateAll} className="w-full mb-4">
            <Sparkles className="mr-2 h-4 w-4" /> Generate Final Output
          </Button>
          {generatedOutputs.final && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <Label className="font-semibold">Final JSON Output:</Label>
              <pre className="text-sm overflow-x-auto bg-background p-2 rounded"><code>{generatedOutputs.final}</code></pre>
            </div>
          )}
          <Button
            onClick={handleSaveConfig}
            disabled={!generatedOutputs.final}
            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {saveSuccess ? <><Check className="mr-2 h-4 w-4" /> Saved!</> : <><Save className="mr-2 h-4 w-4" /> Save Final Configuration</>}
          </Button>
        </CardContent>
      </Card>

    </div>
  );
};

export default CFTPage;
