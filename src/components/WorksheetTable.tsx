import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface TableRow {
  label: string;
  value: string;
  category: 'assets' | 'liabilities' | 'equity';
}

interface WorksheetTableProps {
  data: TableRow[];
  onDataChange: (data: TableRow[]) => void;
}

export const WorksheetTable = ({ data, onDataChange }: WorksheetTableProps) => {
  const [autoCalculate, setAutoCalculate] = useState(false);

  const updateValue = (index: number, newValue: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], value: newValue };
    onDataChange(newData);
  };

  const assets = data.filter(row => row.category === 'assets');
  const liabilities = data.filter(row => row.category === 'liabilities');
  const equity = data.filter(row => row.category === 'equity');

  const calculateTotal = (rows: TableRow[]) => {
    if (!autoCalculate) return '';
    return rows
      .filter(row => !row.label.toLowerCase().includes('total'))
      .reduce((sum, row) => sum + (parseFloat(row.value) || 0), 0)
      .toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Extracted Worksheet</h2>
        <div className="flex items-center space-x-2">
          <Switch
            id="auto-calculate"
            checked={autoCalculate}
            onCheckedChange={setAutoCalculate}
          />
          <Label htmlFor="auto-calculate" className="cursor-pointer">
            Auto-calculate totals
          </Label>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Assets Section */}
        <Card className="p-6 space-y-4">
          <div className="pb-2 border-b-2 border-primary">
            <h3 className="text-xl font-bold text-primary">ASSETS</h3>
          </div>
          {assets.map((row, idx) => {
            const isTotal = row.label.toLowerCase().includes('total');
            const value = isTotal && autoCalculate ? calculateTotal(assets) : row.value;
            
            return (
              <div key={idx} className="space-y-1">
                <Label className="text-sm font-medium">{row.label}</Label>
                <Input
                  type="text"
                  value={value}
                  onChange={(e) => updateValue(data.indexOf(row), e.target.value)}
                  className={isTotal ? 'font-bold border-t-2 border-primary' : ''}
                  disabled={isTotal && autoCalculate}
                />
              </div>
            );
          })}
        </Card>

        {/* Liabilities and Equity Section */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="pb-2 border-b-2 border-destructive">
              <h3 className="text-xl font-bold text-destructive">LIABILITIES</h3>
            </div>
            {liabilities.map((row, idx) => (
              <div key={idx} className="space-y-1">
                <Label className="text-sm font-medium">{row.label}</Label>
                <Input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateValue(data.indexOf(row), e.target.value)}
                />
              </div>
            ))}
          </Card>

          <Card className="p-6 space-y-4">
            <div className="pb-2 border-b-2 border-accent">
              <h3 className="text-xl font-bold">OWNER'S EQUITY</h3>
            </div>
            {equity.map((row, idx) => {
              const isTotal = row.label.toLowerCase().includes('total');
              const value = isTotal && autoCalculate ? calculateTotal(equity) : row.value;
              
              return (
                <div key={idx} className="space-y-1">
                  <Label className="text-sm font-medium">{row.label}</Label>
                  <Input
                    type="text"
                    value={value}
                    onChange={(e) => updateValue(data.indexOf(row), e.target.value)}
                    className={isTotal ? 'font-bold border-t-2 border-foreground' : ''}
                    disabled={isTotal && autoCalculate}
                  />
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
};
